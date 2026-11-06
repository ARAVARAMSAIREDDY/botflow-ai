process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../server.js';
import { conversationService } from '../src/services/conversationService.js';
import { feedbackService } from '../src/services/feedbackService.js';
import { knowledgeGapService } from '../src/services/knowledgeGapService.js';
import { notificationService } from '../src/services/notificationService.js';

test('BotFlow AI - Phase 7 Advanced Analytics & Conversation Management Tests', async (t) => {
  let user1 = null;
  let user1Token = null;
  let user1Bot = null;

  let user2 = null;
  let user2Token = null;
  let user2Bot = null;

  let testConvId = null;

  // Setup: Register two isolated business tenants
  await t.test('0. Setup: Register accounts and seed chatbots', async () => {
    // 1. User 1: Dr. Miller (Apex Clinic)
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: `dr_miller_${Date.now()}@apexclinic.com`,
        password: 'Password123!',
        fullName: 'Dr. Gregory Miller',
        businessName: 'Apex Medical Center'
      });
    assert.equal(res1.status, 201);
    user1 = res1.body.data.user;
    user1Token = res1.body.data.token;

    // Create User 1 Bot
    const botRes1 = await request(app)
      .post('/api/chatbots')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Apex Clinic Triage',
        domain: 'apexclinic.com',
        mode: 'knowledge'
      });
    assert.equal(botRes1.status, 201);
    user1Bot = botRes1.body.data;

    // 2. User 2: Dean Evans (Riverdale Academy)
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: `dean_evans_${Date.now()}@riverdale.edu`,
        password: 'Password123!',
        fullName: 'Dean Evans',
        businessName: 'Riverdale Academy'
      });
    assert.equal(res2.status, 201);
    user2 = res2.body.data.user;
    user2Token = res2.body.data.token;

    // Create User 2 Bot
    const botRes2 = await request(app)
      .post('/api/chatbots')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        name: 'Riverdale Admissions Bot',
        domain: 'riverdale.edu',
        mode: 'general'
      });
    assert.equal(botRes2.status, 201);
    user2Bot = botRes2.body.data;
  });

  // Test 1: Seed conversations and test Analytics accuracy
  await t.test('1. Analytics accuracy (calculates total visitors, conversations, messages, resolution rate)', async () => {
    // Seed 2 conversations for User 1 Bot
    const conv1 = await conversationService.getOrCreateConversation(user1Bot.id, 'sess_visitor_001', 'Sarah Jenkins');
    testConvId = conv1.id;
    await conversationService.addMessage(conv1.id, 'user', 'What are your emergency room operating hours?');
    await conversationService.addMessage(conv1.id, 'bot', 'Our emergency room is open 24/7 every day.', {}, 450);

    const conv2 = await conversationService.getOrCreateConversation(user1Bot.id, 'sess_visitor_002', 'Mark Davis');
    await conversationService.addMessage(conv2.id, 'user', 'Do you take Anthem Blue Cross insurance?');
    await conversationService.addMessage(conv2.id, 'bot', 'Yes, we accept Anthem Blue Cross and most major PPO plans.', {}, 520);
    await conversationService.updateConversationStatus(conv2.id, 'resolved');

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ period: 'weekly' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.summary.totalConversations >= 2);
    assert.ok(res.body.data.summary.totalMessages >= 4);
    assert.ok(res.body.data.summary.totalVisitors >= 2);
    assert.ok(res.body.data.summary.avgResponseTimeMs > 0);
    assert.ok(Array.isArray(res.body.data.activityTimeSeries));
  });

  // Test 2: Date filters (daily, weekly, monthly, custom ranges)
  await t.test('2. Date filters (daily, weekly, monthly, and custom range)', async () => {
    // Daily
    const dailyRes = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ period: 'daily' });
    assert.equal(dailyRes.status, 200);
    assert.equal(dailyRes.body.data.period, 'daily');

    // Monthly
    const monthlyRes = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ period: 'monthly' });
    assert.equal(monthlyRes.status, 200);
    assert.equal(monthlyRes.body.data.period, 'monthly');

    // Custom date range
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    const customRes = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ startDate: pastDate, endDate: futureDate });
    assert.equal(customRes.status, 200);
    assert.ok(customRes.body.data.startDate);
    assert.ok(customRes.body.data.endDate);
  });

  // Test 3: Conversation search
  await t.test('3. Conversation search (search by visitor name or message content)', async () => {
    // Search by visitor name
    const searchRes = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ search: 'Jenkins' });

    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.success, true);
    assert.ok(searchRes.body.data.conversations.length >= 1);
    assert.match(searchRes.body.data.conversations[0].user_identifier, /Jenkins/i);

    // Search by message content
    const msgSearchRes = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${user1Token}`)
      .query({ search: 'Blue Cross' });

    assert.equal(msgSearchRes.status, 200);
    assert.ok(msgSearchRes.body.data.conversations.length >= 1);
  });

  // Test 4: Conversation status updates
  await t.test('4. Conversation status updates (active -> handed_over -> resolved -> closed)', async () => {
    // Mark as resolved
    const res1 = await request(app)
      .patch(`/api/conversations/${testConvId}/status`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'resolved' });

    assert.equal(res1.status, 200);
    assert.equal(res1.body.data.status, 'resolved');
    assert.ok(res1.body.data.resolved_at);

    // Reopen as active
    const res2 = await request(app)
      .patch(`/api/conversations/${testConvId}/status`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'active' });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.status, 'active');

    // Close conversation
    const res3 = await request(app)
      .patch(`/api/conversations/${testConvId}/status`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'closed' });

    assert.equal(res3.status, 200);
    assert.equal(res3.body.data.status, 'closed');
    assert.ok(res3.body.data.closed_at);
  });

  // Test 5: CSV exports
  await t.test('5. CSV exports (conversations, analytics, feedback, knowledge gaps)', async () => {
    // 1. Export conversations
    const convCsv = await request(app)
      .get('/api/export/conversations')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(convCsv.status, 200);
    assert.match(convCsv.headers['content-type'], /text\/csv/);
    assert.match(convCsv.text, /Conversation ID/);
    assert.match(convCsv.text, /Apex Clinic Triage/);

    // 2. Export analytics
    const analyticsCsv = await request(app)
      .get('/api/export/analytics')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(analyticsCsv.status, 200);
    assert.match(analyticsCsv.text, /Conversations/);

    // 3. Export feedback
    const feedbackCsv = await request(app)
      .get('/api/export/feedback')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(feedbackCsv.status, 200);
    assert.match(feedbackCsv.text, /Feedback ID/);

    // 4. Export knowledge gaps
    const gapsCsv = await request(app)
      .get('/api/export/knowledge-gaps')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(gapsCsv.status, 200);
    assert.match(gapsCsv.text, /Gap ID/);
  });

  // Test 6: Human handoff
  await t.test('6. Human handoff (visitor requests human support -> status updated to handed_over + notification)', async () => {
    const handoffConv = await conversationService.getOrCreateConversation(user1Bot.id, 'sess_need_human_01', 'Alex Mercer');

    const res = await request(app)
      .post(`/api/conversations/${handoffConv.id}/handoff`)
      .send({ userIdentifier: 'Alex Mercer' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'handed_over');

    // Verify notification was generated for User 1
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(notifRes.status, 200);
    assert.ok(notifRes.body.data.unreadCount >= 1);
    const handoffNotif = notifRes.body.data.notifications.find(n => n.type === 'handoff_request');
    assert.ok(handoffNotif);
    assert.match(handoffNotif.title, /Human Support Request/i);

    // Mark notification as read
    const markRes = await request(app)
      .patch(`/api/notifications/${handoffNotif.id}/read`)
      .set('Authorization', `Bearer ${user1Token}`);
    assert.equal(markRes.status, 200);
  });

  // Test 7: Agent responses
  await t.test('7. Agent responses (agent sends message -> recorded with sender: agent)', async () => {
    const res = await request(app)
      .post(`/api/conversations/${testConvId}/agent-reply`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        agentName: 'Nurse Jackie',
        message: 'Hello Sarah, this is Nurse Jackie from triage. How can I help you today?'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.sender, 'agent');
    assert.equal(res.body.data.metadata.agentName, 'Nurse Jackie');

    // Verify transcript reflects agent message
    const transcriptRes = await request(app)
      .get(`/api/conversations/${testConvId}/transcript`)
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(transcriptRes.status, 200);
    const msgs = transcriptRes.body.data.messages;
    const agentMsg = msgs.find(m => m.sender === 'agent');
    assert.ok(agentMsg);
    assert.match(agentMsg.content, /Nurse Jackie/);
  });

  // Test 8: Customer feedback
  await t.test('8. Customer feedback (submit rating + comment, calculate avg rating and list)', async () => {
    const res = await request(app)
      .post(`/api/conversations/${testConvId}/feedback`)
      .send({
        rating: 5,
        thumbsUp: true,
        comment: 'Super fast answer and very clear instructions!',
        userIdentifier: 'Sarah Jenkins'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rating, 5);

    // Verify feedback shows in analytics
    const feedbackListRes = await request(app)
      .get('/api/analytics/feedback')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(feedbackListRes.status, 200);
    assert.ok(feedbackListRes.body.data.totalCount >= 1);
    const item = feedbackListRes.body.data.feedback[0];
    assert.equal(item.rating, 5);
    assert.match(item.comment, /Super fast answer/);
  });

  // Test 9: Knowledge gap tracking
  await t.test('9. Knowledge gap tracking (recording unanswered question, frequency aggregation)', async () => {
    // Record gap for User 1 Bot
    await knowledgeGapService.recordKnowledgeGap({
      chatbotId: user1Bot.id,
      question: 'What are the visiting hours for the neonatal ICU?'
    });

    // Record same gap again to test frequency increment
    await knowledgeGapService.recordKnowledgeGap({
      chatbotId: user1Bot.id,
      question: 'What are the visiting hours for the neonatal ICU?'
    });

    const gapsRes = await request(app)
      .get('/api/analytics/knowledge-gaps')
      .set('Authorization', `Bearer ${user1Token}`);

    assert.equal(gapsRes.status, 200);
    assert.ok(gapsRes.body.data.totalCount >= 1);
    const gap = gapsRes.body.data.gaps.find(g => g.question.includes('neonatal ICU'));
    assert.ok(gap);
    assert.equal(gap.frequency, 2);
    assert.ok(gap.suggested_topic);

    // Update status to addressed
    const updateRes = await request(app)
      .patch(`/api/analytics/knowledge-gaps/${gap.id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ status: 'addressed' });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.status, 'addressed');
  });

  // Test 10: Strict Tenant Isolation
  await t.test('10. Tenant isolation (User 2 strictly cannot see or export User 1 conversations, feedback, or analytics)', async () => {
    // User 2 cannot access User 1's conversation transcript
    const transRes = await request(app)
      .get(`/api/conversations/${testConvId}/transcript`)
      .set('Authorization', `Bearer ${user2Token}`);

    assert.equal(transRes.status, 403);
    assert.equal(transRes.body.success, false);

    // User 2 cannot send agent reply to User 1's conversation
    const replyRes = await request(app)
      .post(`/api/conversations/${testConvId}/agent-reply`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ message: 'Unauthorized intrusion' });

    assert.equal(replyRes.status, 403);

    // User 2 cannot update User 1's conversation status
    const statusRes = await request(app)
      .patch(`/api/conversations/${testConvId}/status`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ status: 'closed' });

    assert.equal(statusRes.status, 403);

    // User 2's conversation list does NOT include User 1's conversations
    const listRes = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${user2Token}`);

    assert.equal(listRes.status, 200);
    const convIds = listRes.body.data.conversations.map(c => c.id);
    assert.ok(!convIds.includes(testConvId));

    // User 2 cannot export User 1's chatbot data
    const exportRes = await request(app)
      .get('/api/export/conversations')
      .set('Authorization', `Bearer ${user2Token}`)
      .query({ chatbotId: user1Bot.id });

    assert.equal(exportRes.status, 403);
  });
});
