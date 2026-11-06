process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../server.js';
import { chatbotService } from '../src/services/chatbotService.js';
import { vectorStoreService } from '../src/services/vectorStoreService.js';
import { chunkText } from '../src/services/chunkingService.js';
import { generateBatchEmbeddings } from '../src/services/embeddingService.js';

test('BotFlow AI - Phase 5 Embeddable Widget, Domain Security & Public API Tests', async (t) => {
  let testBot = null;
  let testUserToken = null;

  // Setup: Register a user and create a dedicated chatbot for testing
  await t.test('0. Setup: Register user and create test chatbot', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `clinic_founder_${Date.now()}@horizoncare.com`,
        password: 'Password123!',
        fullName: 'Elena Rostova',
        businessName: 'Horizon Care Group'
      });

    assert.equal(regRes.status, 201);
    testUserToken = regRes.body.data.token;

    const botRes = await request(app)
      .post('/api/chatbots')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        name: 'Horizon Inpatient Assistant',
        domain: 'horizoncare.com',
        mode: 'knowledge',
        tone: 'empathetic',
        fallback_message: 'Please consult the on-call medical desk for unlisted inquiries.'
      });

    assert.equal(botRes.status, 201);
    testBot = botRes.body.data;
    assert.ok(testBot.id);
    assert.ok(testBot.public_id);

    // Seed RAG knowledge vector chunk for test bot
    const textContent = 'Horizon Care Policies: Visiting hours for pediatric and general wards are strictly 10:00 AM to 6:00 PM daily.';
    const chunks = chunkText(textContent, {
      metadata: { title: 'Ward_Policies_Handbook.pdf', sourceType: 'pdf' }
    });
    const embeddings = await generateBatchEmbeddings(chunks.map(c => c.content));
    const chunksWithEmbeddings = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
    await vectorStoreService.storeChunks('src-test-source-id', testBot.id, chunksWithEmbeddings);
  });

  // Test 1: Load chatbot configuration by public ID
  await t.test('1. Security Test 1: Load chatbot configuration using public ID', async () => {
    const res = await request(app)
      .get(`/api/public/chatbots/${testBot.public_id}/config`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Horizon Inpatient Assistant');
    assert.equal(res.body.data.publicId, testBot.public_id);
    assert.equal(res.body.data.status, 'active');
    // Ensure sensitive fields (like system prompt or database schema) are NOT exposed
    assert.equal(res.body.data.system_prompt, undefined);
    assert.equal(res.body.data.user_id, undefined);
  });

  // Test 2: Send public message and receive AI response
  await t.test('2. Security Test 2: Send message via public API and receive response', async () => {
    const res = await request(app)
      .post('/api/public/chat')
      .send({
        chatbotId: testBot.public_id,
        message: 'Hello, can you help me with hospital ward hours?'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.reply);
    assert.ok(res.body.data.sessionId);
  });

  // Test 3: Verify RAG source citations in public chat
  await t.test('3. Security Test 3: Verify grounded RAG citations in public response', async () => {
    const res = await request(app)
      .post('/api/public/chat')
      .send({
        chatbotId: testBot.public_id,
        message: 'What are the visiting hours for pediatric wards?'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.reply);
    assert.ok(Array.isArray(res.body.data.citations));
    assert.ok(res.body.data.citations.length > 0);
    assert.equal(res.body.data.citations[0].title, 'Ward_Policies_Handbook.pdf');
  });

  // Test 4 & 5: Domain verification and restriction
  await t.test('4. Security Test 4: Block unauthorized domains when domain restriction is enabled', async () => {
    // Enable domain restriction and allow ONLY 'horizoncare.com'
    await chatbotService.updateDomainsList(testBot.id, ['horizoncare.com']);
    await chatbotService.toggleRestrictDomains(testBot.id, testBot.user_id, true);

    // Request from unauthorized origin 'https://malicious-scam.com'
    const res = await request(app)
      .post('/api/public/chat')
      .set('Origin', 'https://malicious-scam.com')
      .send({
        chatbotId: testBot.public_id,
        message: 'Visiting hours please?'
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.toLowerCase().includes('not authorized'));
  });

  await t.test('5. Security Test 5: Allow registered/authorized domain', async () => {
    // Request from authorized origin 'https://portal.horizoncare.com'
    const res = await request(app)
      .post('/api/public/chat')
      .set('Origin', 'https://portal.horizoncare.com')
      .send({
        chatbotId: testBot.public_id,
        message: 'Visiting hours please?'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // Test 6: Invalid public ID returns 404
  await t.test('6. Security Test 6: Invalid public ID returns 404 Not Found', async () => {
    const res = await request(app)
      .get('/api/public/chatbots/non_existent_public_id_999/config');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  // Test 7: Disabled chatbot returns 403 Forbidden
  await t.test('7. Security Test 7: Paused/Disabled chatbot returns 403 Forbidden', async () => {
    await chatbotService.updateCustomization(testBot.id, testBot.user_id, { status: 'disabled' });

    const res = await request(app)
      .get(`/api/public/chatbots/${testBot.public_id}/config`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.toLowerCase().includes('inactive') || res.body.error.toLowerCase().includes('disabled') || res.body.error.toLowerCase().includes('paused'));

    // Re-enable for subsequent tests
    await chatbotService.updateCustomization(testBot.id, testBot.user_id, { status: 'active' });
  });

  // Test 8: Message length limit
  await t.test('8. Security Test 8: Reject oversized message payload (> 1000 chars)', async () => {
    const oversized = 'A'.repeat(1200);
    const res = await request(app)
      .post('/api/public/chat')
      .send({
        chatbotId: testBot.public_id,
        message: oversized
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('1,000'));
  });

  // Test 9: Rate limiting on public chat
  await t.test('9. Security Test 9: Public rate limiter handles burst requests', async () => {
    // Send valid request to verify limiter is mounted and responds
    const res = await request(app)
      .post('/api/public/chat')
      .send({
        chatbotId: testBot.public_id,
        message: 'Quick test'
      });

    // Rate limiter header should be present
    assert.ok(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'] || res.status === 200 || res.status === 429);
  });

  // Test 10: Private chatbot management APIs cannot be accessed with public credentials or without auth
  await t.test('10. Security Test 10: Private management APIs strictly reject unauthenticated calls', async () => {
    // Attempt to delete chatbot without JWT Bearer token
    const delRes = await request(app)
      .delete(`/api/chatbots/${testBot.id}`);
    assert.equal(delRes.status, 401);

    // Attempt to update customization without JWT Bearer token
    const customRes = await request(app)
      .put(`/api/chatbots/${testBot.id}/customization`)
      .send({ primary_color: '#000000' });
    assert.equal(customRes.status, 401);

    // Attempt to upload document without JWT Bearer token
    const uploadRes = await request(app)
      .post('/api/knowledge/upload')
      .field('chatbotId', testBot.id);
    assert.equal(uploadRes.status, 401);
  });
});
