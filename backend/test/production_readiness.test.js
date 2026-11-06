import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../server.js';
import { storageService, BUCKET_NAME } from '../src/services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('BotFlow AI - Phase 8 Production Readiness & Infrastructure Tests', () => {

  test('1. Liveness check: GET /api/health returns 200 with service status', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'BotFlow AI Backend API');
    assert.ok(res.body.version);
    assert.ok(res.body.integrations);
    assert.ok(typeof res.body.integrations.openai === 'object');
    assert.ok(typeof res.body.integrations.supabase === 'object');
  });

  test('2. Readiness probe: GET /api/ready returns 200 with memory and database status', async () => {
    const res = await request(app)
      .get('/api/ready')
      .expect(200);

    assert.strictEqual(res.body.status, 'ready');
    assert.ok(typeof res.body.uptime === 'number');
    assert.ok(res.body.database);
    assert.strictEqual(res.body.database.status, 'healthy');
    assert.ok(res.body.system);
    assert.ok(res.body.system.heapUsedMb > 0);
  });

  test('3. Security headers: Helmet enforces X-Content-Type-Options & cross-origin policy', async () => {
    const res = await request(app)
      .get('/api/health');

    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['cross-origin-resource-policy'], 'cross-origin');
    assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
  });

  test('4. Reverse proxy trust: honors X-Forwarded-For & X-Forwarded-Proto behind reverse proxy', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Forwarded-For', '203.0.113.195')
      .set('X-Forwarded-Proto', 'https')
      .expect(200);

    assert.strictEqual(res.status, 200);
  });

  test('5. Dynamic CORS: permits configured production domains and public widget requests', async () => {
    // 5.1 Main app client origin
    const resClient = await request(app)
      .get('/api/health')
      .set('Origin', 'https://botflow.ai');
    assert.ok(resClient.headers['access-control-allow-origin']);

    // 5.2 Standalone customer website embedding widget
    const resWidget = await request(app)
      .get('/api/public/chatbots/bf_1fd762e54bf7/config')
      .set('Origin', 'https://customer-hospital.org');
    assert.strictEqual(resWidget.headers['access-control-allow-origin'], 'https://customer-hospital.org');
  });

  test('6. Storage service: uploads document buffer and returns storage metadata', async () => {
    const sampleBuffer = Buffer.from('BotFlow AI production clinic protocol and FAQ document.');
    const result = await storageService.uploadDocument({
      fileBuffer: sampleBuffer,
      filename: 'clinic_onboarding.txt',
      mimeType: 'text/plain',
      chatbotId: 'test-bot-prod-id',
      userId: 'test-user-prod-id'
    });

    assert.ok(result.storagePath);
    assert.ok(result.storageType === 'supabase' || result.storageType === 'local');
    assert.ok(result.fileUrl);

    // Verify buffer retrieval
    const retrieved = await storageService.getDocumentBuffer(result.storagePath, result.storageType);
    assert.strictEqual(retrieved.toString(), sampleBuffer.toString());

    // Clean up
    await storageService.deleteDocument(result.storagePath, result.storageType);
  });

  test('7. Embed SDK delivery: serves standalone widget SDK at /widget/botflow.js', async () => {
    const res = await request(app)
      .get('/widget/botflow.js')
      .expect(200);

    assert.match(res.headers['content-type'], /javascript/);
    assert.ok(res.text.includes('BotFlow'));
  });

  test('8. Graceful shutdown state: /api/ready returns 503 when server is draining', async () => {
    // Simulate active shutdown flag
    process.__isShuttingDown = true;

    try {
      const res = await request(app)
        .get('/api/ready')
        .expect(503);

      assert.strictEqual(res.body.status, 'draining');
      assert.strictEqual(res.body.message, 'Server is currently draining connections for shutdown');
    } finally {
      process.__isShuttingDown = false;
    }
  });

  test('9. Authentication security: private management endpoints strictly reject unauthenticated requests', async () => {
    const endpoints = [
      ['delete', '/api/chatbots/00000000-0000-0000-0000-000000000001'],
      ['put', '/api/chatbots/00000000-0000-0000-0000-000000000001/customization'],
      ['get', '/api/conversations'],
      ['get', '/api/analytics/dashboard'],
      ['get', '/api/billing/details'],
      ['get', '/api/notifications'],
      ['post', '/api/knowledge/upload']
    ];

    for (const [method, route] of endpoints) {
      const res = await request(app)[method](route);
      assert.strictEqual(res.status, 401, `Endpoint ${method.toUpperCase()} ${route} should reject unauthenticated request`);
      assert.strictEqual(res.body.success, false);
    }
  });

  test('10. Master SQL schema: verifies 000_master_production_schema.sql has all tables & extensions', () => {
    const masterPath = path.resolve(__dirname, '../migrations/000_master_production_schema.sql');
    assert.ok(fs.existsSync(masterPath), 'Master production schema file must exist');

    const content = fs.readFileSync(masterPath, 'utf-8');
    const requiredKeywords = [
      'CREATE EXTENSION IF NOT EXISTS vector',
      'CREATE TABLE IF NOT EXISTS public.users',
      'CREATE TABLE IF NOT EXISTS public.chatbots',
      'CREATE TABLE IF NOT EXISTS public.knowledge_sources',
      'CREATE TABLE IF NOT EXISTS public.document_chunks',
      'CREATE TABLE IF NOT EXISTS public.conversations',
      'CREATE TABLE IF NOT EXISTS public.messages',
      'CREATE TABLE IF NOT EXISTS public.customer_feedback',
      'CREATE TABLE IF NOT EXISTS public.knowledge_gaps',
      'CREATE TABLE IF NOT EXISTS public.notifications',
      'CREATE TABLE IF NOT EXISTS public.subscriptions',
      'CREATE TABLE IF NOT EXISTS public.transactions',
      'CREATE TABLE IF NOT EXISTS public.usage_records',
      'USING hnsw (embedding vector_cosine_ops)',
      'ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY',
      'CREATE OR REPLACE FUNCTION public.match_document_chunks',
      'storage.buckets'
    ];

    for (const keyword of requiredKeywords) {
      assert.ok(content.includes(keyword), `Master schema must contain: "${keyword}"`);
    }
  });

});
