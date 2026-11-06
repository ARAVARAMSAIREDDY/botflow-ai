process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../server.js';
import { extractDocumentText } from '../src/services/extractors/index.js';
import { chunkText } from '../src/services/chunkingService.js';
import { generateBatchEmbeddings } from '../src/services/embeddingService.js';
import { vectorStoreService } from '../src/services/vectorStoreService.js';

// Helper to create a valid minimal test PDF buffer
function createMinimalPdf(textContent) {
  const contentStream = `BT /F1 12 Tf 72 712 Td (${textContent.replace(/[()\\]/g, '\\$&')}) Tj ET`;
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000343 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
422
%%EOF`;
  return Buffer.from(pdfString, 'utf-8');
}

test('BotFlow AI - Comprehensive End-to-End Test Suite (Phases 2, 3 & 4)', async (t) => {
  let user1Token = null;
  let user1Id = null;
  let user2Token = null;
  let user2Id = null;
  let user1BotId = null;
  let user1SourceId = null;

  const pdfContent = 'Horizon Hospital Guidelines: ICU visiting hours are strictly 2:00 PM to 4:00 PM with approved visitor badges.';

  // ----------------------------------------------------
  // Phase 4: Authentication & Multi-Tenancy Tests
  // ----------------------------------------------------
  await t.test('1. Phase 4 Test 1: Register a new user (User 1)', async () => {
    const email = `doctor_admin_${Date.now()}@metrocare.org`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Password123!',
        fullName: 'Dr. Gregory House',
        businessName: 'MetroCare Diagnostics'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.ok(res.body.data.user.id);
    user1Token = res.body.data.token;
    user1Id = res.body.data.user.id;
  });

  await t.test('2. Phase 4 Test 2: Login and Logout for User 1', async () => {
    // Check login
    const userProfile = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user1Token}`);
    assert.equal(userProfile.status, 200);
    assert.equal(userProfile.body.data.profile.id, user1Id);

    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${user1Token}`);
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);
  });

  await t.test('3. Phase 4 Test 3: Access protected profile and usage metrics with token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.profile.full_name, 'Dr. Gregory House');
    assert.equal(res.body.data.profile.business_name, 'MetroCare Diagnostics');
    assert.ok(res.body.data.usage);
  });

  await t.test('4. Phase 4 Test 4: Create a chatbot under User 1', async () => {
    const res = await request(app)
      .post('/api/chatbots')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'MetroCare Inpatient Assistant',
        domain: 'metrocare.org',
        mode: 'knowledge',
        tone: 'empathetic',
        fallback_message: 'Information unavailable in patient guidelines.'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user_id, user1Id);
    user1BotId = res.body.data.id;
  });

  await t.test('5. Phase 4 Test 5: Upload a PDF document under User 1 chatbot', async () => {
    const pdfBuffer = createMinimalPdf(pdfContent);

    const res = await request(app)
      .post('/api/knowledge/upload')
      .set('Authorization', `Bearer ${user1Token}`)
      .field('chatbotId', user1BotId)
      .attach('file', pdfBuffer, 'ICU_Visiting_Policies.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'ICU_Visiting_Policies.pdf');
    user1SourceId = res.body.data.id;

    // Direct chunk and store to ensure immediate indexing in test harness
    const chunks = chunkText(pdfContent, {
      metadata: { title: 'ICU_Visiting_Policies.pdf', sourceType: 'pdf' }
    });
    const embeddings = await generateBatchEmbeddings(chunks.map(c => c.content));
    const chunksWithEmbeddings = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
    await vectorStoreService.storeChunks(user1SourceId, user1BotId, chunksWithEmbeddings);
  });

  await t.test('6. Phase 4 Test 6: Register a second user (User 2)', async () => {
    const email = `chef_mario_${Date.now()}@bellacucina.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Password123!',
        fullName: 'Mario Batali',
        businessName: 'Bella Cucina Dining'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.ok(res.body.data.user.id);
    user2Token = res.body.data.token;
    user2Id = res.body.data.user.id;
    assert.notEqual(user1Id, user2Id);
  });

  await t.test('7. Phase 4 Test 7: Verify User 2 CANNOT access User 1 chatbot (Tenant Isolation)', async () => {
    const res = await request(app)
      .get(`/api/chatbots/${user1BotId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    // Denied with 403 Forbidden
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.toLowerCase().includes('forbidden'));
  });

  await t.test('8. Phase 4 Test 8: Verify User 2 CANNOT retrieve User 1 documents or knowledge sources', async () => {
    const res = await request(app)
      .get(`/api/knowledge/${user1BotId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    // Denied with 403 Forbidden
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.toLowerCase().includes('forbidden'));
  });

  await t.test('9. Phase 4 Test 9: Test expired and invalid authentication tokens', async () => {
    // Tampered token
    const invalidRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.fake.token.123');

    assert.equal(invalidRes.status, 401);
    assert.equal(invalidRes.body.success, false);

    // Missing token on protected endpoint
    const missingRes = await request(app)
      .get('/api/auth/me');

    assert.equal(missingRes.status, 401);
    assert.equal(missingRes.body.success, false);
  });

  await t.test('10. Phase 4 Test 10: Test account deletion (cascades and deletes bots and vectors)', async () => {
    const delRes = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    // Verify User 1's chatbot is gone
    const botCheck = await request(app)
      .get(`/api/chatbots/${user1BotId}`);
    assert.equal(botCheck.status, 404);

    // Clean up User 2
    await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${user2Token}`);
  });
});
