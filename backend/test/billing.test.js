process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import request from 'supertest';
import app from '../server.js';
import { env } from '../src/config/env.js';

test('BotFlow AI - Phase 6 Subscription Management & Payment Integration Tests', async (t) => {
  let freeUser = null;
  let freeUserToken = null;
  let proUser = null;
  let proUserToken = null;
  let testOrderId = null;

  // Setup: Register two test accounts
  await t.test('0. Setup: Register accounts for billing tests', async () => {
    // 1. User on Free Starter
    const freeRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `founder_free_${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Arjun Verma',
        businessName: 'Verma Digital'
      });

    assert.equal(freeRes.status, 201);
    freeUser = freeRes.body.data.user;
    freeUserToken = freeRes.body.data.token;
    assert.equal(freeUser.plan_tier, 'free');

    // 2. User to upgrade to Pro
    const proRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `founder_pro_${Date.now()}@clinicops.com`,
        password: 'Password123!',
        fullName: 'Devika Nair',
        businessName: 'ClinicOps Health'
      });

    assert.equal(proRes.status, 201);
    proUser = proRes.body.data.user;
    proUserToken = proRes.body.data.token;
  });

  // Test 1: Free plan registration and default limits
  await t.test('1. Free plan default limits and billing details', async () => {
    const res = await request(app)
      .get('/api/billing/details')
      .set('Authorization', `Bearer ${freeUserToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.planTier, 'free');
    assert.equal(res.body.data.limits.chatbots, 1);
    assert.equal(res.body.data.limits.documents, 3);
    assert.equal(res.body.data.limits.messagesPerMonth, 100);
    assert.equal(res.body.data.usage.chatbots.used, 0);
  });

  // Test 2: Pro subscription order checkout
  await t.test('2. Create Razorpay checkout order for Pro plan', async () => {
    const res = await request(app)
      .post('/api/billing/create-order')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({
        planCode: 'pro',
        billingCycle: 'monthly'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.orderId);
    assert.equal(res.body.data.amount, 99900); // ₹999 in paise (999 * 100)
    assert.equal(res.body.data.currency, 'INR');
    assert.equal(res.body.data.planCode, 'pro');
    testOrderId = res.body.data.orderId;
  });

  // Test 3: Payment signature verification and plan upgrade
  await t.test('3. Verify valid payment signature and activate Pro plan', async () => {
    const paymentId = `pay_${Date.now()}`;
    const secret = env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_key';
    const text = `${testOrderId}|${paymentId}`;
    const validSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    const res = await request(app)
      .post('/api/billing/verify-payment')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({
        orderId: testOrderId,
        paymentId,
        signature: validSignature
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.planCode, 'pro');
    assert.equal(res.body.data.subscription.status, 'active');
    assert.ok(res.body.data.invoice.invoice_number);

    // Verify billing details updated to Pro
    const detailsRes = await request(app)
      .get('/api/billing/details')
      .set('Authorization', `Bearer ${proUserToken}`);

    assert.equal(detailsRes.status, 200);
    assert.equal(detailsRes.body.data.planTier, 'pro');
    assert.equal(detailsRes.body.data.limits.chatbots, 5);
    assert.equal(detailsRes.body.data.limits.documents, 25);
    assert.equal(detailsRes.body.data.limits.messagesPerMonth, 5000);
  });

  // Test 4: Rejection of invalid payment signature
  await t.test('4. Reject invalid or forged payment signature', async () => {
    // Create new order
    const orderRes = await request(app)
      .post('/api/billing/create-order')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({ planCode: 'business', billingCycle: 'monthly' });

    assert.equal(orderRes.status, 201);
    const forgedOrderId = orderRes.body.data.orderId;

    const res = await request(app)
      .post('/api/billing/verify-payment')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({
        orderId: forgedOrderId,
        paymentId: 'pay_hacker_fake_123',
        signature: 'invalid_forged_signature_hash_00000000000000'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /signature/i);
  });

  // Test 5: Duplicate webhook prevention via idempotency
  await t.test('5. Prevent duplicate webhook processing using idempotency', async () => {
    const eventId = `evt_test_${Date.now()}`;
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'botflow_webhook_secret_local';
    const payload = {
      id: eventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_test_1',
            order_id: testOrderId,
            amount: 99900,
            status: 'captured'
          }
        }
      }
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    // First webhook call: processed
    const firstRes = await request(app)
      .post('/api/billing/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.equal(firstRes.status, 200);
    assert.equal(firstRes.body.success, true);

    // Second webhook call with same event ID: idempotent duplicate
    const secondRes = await request(app)
      .post('/api/billing/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.equal(secondRes.status, 200);
    assert.equal(secondRes.body.data.duplicate, true);
  });

  // Test 6: Failed payment event handling
  await t.test('6. Record payment failure in transaction records', async () => {
    // Create new order to simulate failure
    const orderRes = await request(app)
      .post('/api/billing/create-order')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({ planCode: 'business', billingCycle: 'monthly' });

    const failedOrderId = orderRes.body.data.orderId;
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'botflow_webhook_secret_local';

    const failPayload = {
      id: `evt_fail_${Date.now()}`,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: failedOrderId,
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Card declined by issuing bank'
          }
        }
      }
    };

    const rawBody = JSON.stringify(failPayload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const res = await request(app)
      .post('/api/billing/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(failPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // Test 7: Subscription renewal period extension
  await t.test('7. Extend subscription period on renewal webhook', async () => {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'botflow_webhook_secret_local';
    const renewalPayload = {
      id: `evt_renew_${Date.now()}`,
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: 'sub_rzp_mock_123',
            notes: {
              userId: proUser.id,
              planCode: 'pro',
              billingCycle: 'monthly'
            }
          }
        }
      }
    };

    const rawBody = JSON.stringify(renewalPayload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const res = await request(app)
      .post('/api/billing/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(renewalPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // Test 8: Subscription cancellation
  await t.test('8. Cancel subscription at period end', async () => {
    const res = await request(app)
      .post('/api/billing/cancel-subscription')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subscription.cancel_at_period_end, true);

    // Verify cancellation flag is reflected in details
    const detailsRes = await request(app)
      .get('/api/billing/details')
      .set('Authorization', `Bearer ${proUserToken}`);

    assert.equal(detailsRes.status, 200);
    assert.equal(detailsRes.body.data.subscription.cancelAtPeriodEnd, true);
  });

  // Test 9: Server-side quota enforcement on Free plan
  await t.test('9. Server-side quota enforcement (block 2nd bot on free plan)', async () => {
    // 1st bot for free user: allowed (limit is 1)
    const firstBotRes = await request(app)
      .post('/api/chatbots')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({
        name: 'First Allowed Free Bot',
        domain: 'example.com',
        mode: 'general'
      });

    assert.equal(firstBotRes.status, 201);

    // 2nd bot for free user: blocked with 403 PLAN_LIMIT_EXCEEDED
    const secondBotRes = await request(app)
      .post('/api/chatbots')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .send({
        name: 'Second Blocked Bot',
        domain: 'example.com',
        mode: 'general'
      });

    assert.equal(secondBotRes.status, 403);
    assert.equal(secondBotRes.body.success, false);
    assert.match(secondBotRes.body.error, /plan limit exceeded/i);

    // Meanwhile, Pro user (limit 5) can create additional chatbots
    const proBotRes = await request(app)
      .post('/api/chatbots')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({
        name: 'Pro User Second Bot',
        domain: 'clinicops.com',
        mode: 'general'
      });

    assert.equal(proBotRes.status, 201);
  });

  // Test 10: Rejection of unauthorized requests without token
  await t.test('10. Reject unauthorized billing access without valid token', async () => {
    const res = await request(app)
      .get('/api/billing/details');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);

    const orderRes = await request(app)
      .post('/api/billing/create-order')
      .send({ planCode: 'pro' });

    assert.equal(orderRes.status, 401);
  });
});
