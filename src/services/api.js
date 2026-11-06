/**
 * Resolves the backend API base URL with production environment safety.
 * Prioritizes VITE_API_URL, then same-origin /api if deployed on HTTPS,
 * and falls back to local development server on localhost:5001.
 */
function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5001/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Returns backend host root (without trailing /api) for widget SDK script delivery
 */
export function getBackendBaseUrl() {
  if (import.meta.env.VITE_WIDGET_URL) {
    return import.meta.env.VITE_WIDGET_URL.replace(/\/widget\/botflow\.js$/, '').replace(/\/+$/, '');
  }
  return API_BASE_URL.replace(/\/api$/, '');
}

/**
 * Token storage helpers
 */
export function getAuthToken() {
  try {
    return localStorage.getItem('botflow_auth_token') || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem('botflow_auth_token', token);
    } else {
      localStorage.removeItem('botflow_auth_token');
    }
  } catch (err) {
    console.error('Failed to update local token storage:', err);
  }
}

/**
 * Builds request headers including Authorization if token is available
 */
function buildHeaders(customHeaders = {}, tokenOverride = null) {
  const token = tokenOverride || getAuthToken();
  const headers = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Checks the operational health of the BotFlow backend server
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { online: true, data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/* =========================================================================
 * AUTHENTICATION & MULTI-TENANT USER ACCOUNT API
 * ========================================================================= */

export async function authRegister({ email, password, fullName, businessName }) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, businessName })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to create user account');
  }
  return json.data;
}

export async function authLogin({ email, password }) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Invalid email or password');
  }
  return json.data;
}

export async function authLogout(token = null) {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
    });
  } finally {
    setAuthToken(null);
  }
  return true;
}

export async function authGetMe(token = null) {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Session expired or invalid');
  }
  return json.data;
}

export async function authUpdateProfile({ fullName, businessName }, token = null) {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ fullName, businessName })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update profile');
  }
  return json.data;
}

export async function authChangePassword(newPassword, token = null) {
  const res = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'PUT',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ newPassword })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to change password');
  }
  return json.data;
}

export async function authForgotPassword(email) {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to send reset email');
  }
  return json.data;
}

export async function authDeleteAccount(token = null) {
  const res = await fetch(`${API_BASE_URL}/auth/account`, {
    method: 'DELETE',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to delete account');
  }
  setAuthToken(null);
  return json.data;
}

/* =========================================================================
 * CHAT & CHATBOTS API
 * ========================================================================= */

/**
 * Sends a chat message to the real AI backend
 */
export async function sendChatMessage({
  message,
  chatbotId = null,
  sessionId = null,
  history = []
}) {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      message,
      chatbotId,
      sessionId,
      history: history.map((m) => ({
        sender: m.sender,
        content: m.text || m.content
      }))
    })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Server responded with status ${res.status}`);
  }

  return json.data;
}

/**
 * Retrieves chatbots (scoped to authenticated user if logged in)
 */
export async function getChatbots(token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve chatbots');
  }

  return json.data;
}

/**
 * Creates a new chatbot on the backend (associated with the user tenant)
 */
export async function createChatbot(botData, token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify(botData)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to create chatbot');
  }

  return json.data;
}

/**
 * Deletes a chatbot securely
 */
export async function deleteChatbot(chatbotId, token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots/${chatbotId}`, {
    method: 'DELETE',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to delete chatbot');
  }

  return json.data;
}

/**
 * Retrieves conversation history for a given chatbot
 */
export async function getConversations(chatbotId, token = null) {
  const res = await fetch(`${API_BASE_URL}/conversations/${chatbotId}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve conversations');
  }

  return json.data;
}

/* =========================================================================
 * DOCUMENT KNOWLEDGE BASE & RAG SYSTEM API
 * ========================================================================= */

/**
 * Uploads a document (PDF, DOCX, CSV, TXT) to the backend knowledge base
 */
export async function uploadDocumentFile(chatbotId, file, token = null) {
  const formData = new FormData();
  formData.append('chatbotId', chatbotId);
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/knowledge/upload`, {
    method: 'POST',
    headers: buildHeaders({}, token),
    body: formData
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to upload document');
  }

  return json.data;
}

/**
 * Submits a website URL to be scraped and indexed
 */
export async function addWebsiteUrl(chatbotId, url, token = null) {
  const res = await fetch(`${API_BASE_URL}/knowledge/url`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ chatbotId, url })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to add website URL');
  }

  return json.data;
}

/**
 * Retrieves all knowledge sources and chunk statistics for a chatbot
 */
export async function getChatbotKnowledge(chatbotId, token = null) {
  const res = await fetch(`${API_BASE_URL}/knowledge/${chatbotId}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve knowledge sources');
  }

  return json.data;
}

/**
 * Deletes a knowledge source and all its vector embeddings
 */
export async function deleteKnowledgeSource(sourceId, token = null) {
  const res = await fetch(`${API_BASE_URL}/knowledge/source/${sourceId}`, {
    method: 'DELETE',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to delete knowledge source');
  }

  return json.data;
}

/**
 * Triggers reindexing for a knowledge source
 */
export async function reindexKnowledgeSource(sourceId, token = null) {
  const res = await fetch(`${API_BASE_URL}/knowledge/source/${sourceId}/reindex`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to reindex knowledge source');
  }

  return json.data;
}

/* =========================================================================
 * PHASE 5: WIDGET CUSTOMIZATION, DOMAINS & ANALYTICS API
 * ========================================================================= */

/**
 * Updates widget appearance settings
 */
export async function updateChatbotCustomization(chatbotId, settings, token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots/${chatbotId}/customization`, {
    method: 'PUT',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify(settings)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update chatbot customization');
  }

  return json.data;
}

/**
 * Adds an allowed domain for widget embedding
 */
export async function addChatbotDomain(chatbotId, domain, token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots/${chatbotId}/domains`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ domain })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to add allowed domain');
  }

  return json.data;
}

/**
 * Removes an allowed domain
 */
export async function removeChatbotDomain(chatbotId, domain, token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots/${chatbotId}/domains/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to remove allowed domain');
  }

  return json.data;
}

/**
 * Toggles strict domain restriction
 */
export async function toggleChatbotDomainRestriction(chatbotId, restrict, token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots/${chatbotId}/domains/restrict`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ restrict })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to toggle domain restriction');
  }

  return json.data;
}

/**
 * Retrieves widget session & question analytics
 */
export async function getChatbotAnalytics(chatbotId, token = null) {
  const res = await fetch(`${API_BASE_URL}/chatbots/${chatbotId}/analytics`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve chatbot analytics');
  }

  return json.data;
}

/* =========================================================================
 * PHASE 6: BILLING, SUBSCRIPTIONS & RAZORPAY PAYMENT API
 * ========================================================================= */

/**
 * Loads Razorpay official Checkout SDK script dynamically
 */
export function loadRazorpayCheckoutScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load live Razorpay checkout.js; falling back to sandbox modal');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Retrieves all active subscription plans
 */
export async function fetchBillingPlans() {
  const res = await fetch(`${API_BASE_URL}/billing/plans`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve subscription plans');
  }

  return json.data;
}

/**
 * Retrieves current user's plan, usage quotas, renewal date, and invoices
 */
export async function fetchBillingDetails(token = null) {
  const res = await fetch(`${API_BASE_URL}/billing/details`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve billing details');
  }

  return json.data;
}

/**
 * Creates a Razorpay checkout order for plan upgrade
 */
export async function createBillingOrder({ planCode, billingCycle = 'monthly' }, token = null) {
  const res = await fetch(`${API_BASE_URL}/billing/create-order`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ planCode, billingCycle })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to create subscription order');
  }

  return json.data;
}

/**
 * Verifies Razorpay payment signature and activates plan
 */
export async function verifyBillingPayment({ orderId, paymentId, signature }, token = null) {
  const res = await fetch(`${API_BASE_URL}/billing/verify-payment`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ orderId, paymentId, signature })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Payment signature verification failed');
  }

  return json.data;
}

/**
 * Schedules subscription cancellation at current period end
 */
export async function cancelSubscription(token = null) {
  const res = await fetch(`${API_BASE_URL}/billing/cancel-subscription`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to cancel subscription');
  }

  return json.data;
}

/* =========================================================================
 * PHASE 7: ADVANCED ANALYTICS, CONVERSATION INBOX & NOTIFICATIONS API
 * ========================================================================= */

/**
 * Retrieves analytics dashboard metrics with time-series chart data
 */
export async function fetchAnalyticsDashboard({ chatbotId = null, period = 'weekly', startDate = null, endDate = null } = {}, token = null) {
  const params = new URLSearchParams();
  if (chatbotId) params.append('chatbotId', chatbotId);
  if (period) params.append('period', period);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`${API_BASE_URL}/analytics/dashboard?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve analytics dashboard');
  }
  return json.data;
}

/**
 * Retrieves knowledge gaps (unanswered inquiries)
 */
export async function fetchKnowledgeGaps({ chatbotId = null, status = 'all', page = 1, limit = 50 } = {}, token = null) {
  const params = new URLSearchParams({
    status,
    page: String(page),
    limit: String(limit)
  });
  if (chatbotId) params.append('chatbotId', chatbotId);

  const res = await fetch(`${API_BASE_URL}/analytics/knowledge-gaps?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve knowledge gaps');
  }
  return json.data;
}

/**
 * Updates status of a knowledge gap
 */
export async function updateKnowledgeGapStatus(id, status, token = null) {
  const res = await fetch(`${API_BASE_URL}/analytics/knowledge-gaps/${id}`, {
    method: 'PATCH',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ status })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update knowledge gap');
  }
  return json.data;
}

/**
 * Retrieves customer feedback ratings and reviews
 */
export async function fetchCustomerFeedback({ chatbotId = null, page = 1, limit = 50, minRating = null, maxRating = null } = {}, token = null) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (chatbotId) params.append('chatbotId', chatbotId);
  if (minRating !== null) params.append('minRating', String(minRating));
  if (maxRating !== null) params.append('maxRating', String(maxRating));

  const res = await fetch(`${API_BASE_URL}/analytics/feedback?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve customer feedback');
  }
  return json.data;
}

/**
 * Lists conversations with search, status filters, and pagination
 */
export async function fetchConversationsList({ chatbotId = null, status = 'all', search = '', startDate = null, endDate = null, page = 1, limit = 20 } = {}, token = null) {
  const params = new URLSearchParams({
    status,
    page: String(page),
    limit: String(limit)
  });
  if (chatbotId) params.append('chatbotId', chatbotId);
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`${API_BASE_URL}/conversations?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve conversation list');
  }
  return json.data;
}

/**
 * Retrieves full conversation transcript
 */
export async function fetchConversationTranscript(conversationId, token = null) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/transcript`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve transcript');
  }
  return json.data;
}

/**
 * Updates status of a conversation (e.g. resolved, closed, active)
 */
export async function updateConversationStatus(conversationId, status, token = null) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/status`, {
    method: 'PATCH',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ status })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update conversation status');
  }
  return json.data;
}

/**
 * Sends a human agent response into a conversation
 */
export async function sendAgentReply(conversationId, { message, agentName = 'Support Agent' }, token = null) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/agent-reply`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ message, agentName })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to dispatch agent response');
  }
  return json.data;
}

/**
 * Visitor requests human support handoff
 */
export async function requestHumanHandoff(conversationId, userIdentifier = 'Website Visitor') {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/handoff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIdentifier })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to request human support');
  }
  return json.data;
}

/**
 * Visitor submits feedback on conversation
 */
export async function submitConversationFeedback(conversationId, { rating, comment = '', thumbsUp = null, userIdentifier = 'Website Visitor' }) {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment, thumbsUp, userIdentifier })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to submit feedback');
  }
  return json.data;
}

/**
 * Retrieves in-dashboard notifications
 */
export async function fetchNotifications({ unreadOnly = false, page = 1, limit = 50 } = {}, token = null) {
  const params = new URLSearchParams({
    unreadOnly: String(unreadOnly),
    page: String(page),
    limit: String(limit)
  });

  const res = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve notifications');
  }
  return json.data;
}

/**
 * Marks a notification as read
 */
export async function markNotificationRead(id, token = null) {
  const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to mark notification read');
  }
  return json.data;
}

/**
 * Marks all notifications as read
 */
export async function markAllNotificationsRead(token = null) {
  const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }, token)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to mark all notifications read');
  }
  return json.data;
}

/**
 * Helper to download CSV exports directly
 */
export async function downloadExportCsv(type, params = {}, token = null) {
  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== null && val !== undefined && val !== '') {
      query.append(key, val);
    }
  }

  const url = `${API_BASE_URL}/export/${type}?${query.toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders({}, token)
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'Failed to download CSV export');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `botflow_${type}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
  return true;
}

/**
 * Polls messages for public widget active session
 */
export async function fetchPublicMessages(publicId, sessionId) {
  const res = await fetch(`${API_BASE_URL}/public/chatbots/${publicId}/messages?sessionId=${encodeURIComponent(sessionId)}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve messages');
  }
  return json.data;
}


