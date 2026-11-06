/**
 * BotFlow AI - Universal Embeddable Chatbot Widget SDK
 * Lightweight, zero-dependency, Shadow-DOM isolated conversational assistant
 * Supports Vanilla HTML, React, Next.js, WordPress, and Shopify
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.__BotFlowWidgetLoaded) return;
  window.__BotFlowWidgetLoaded = true;

  // Find calling script tag to extract default configuration attributes
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && (scripts[i].src.includes('botflow.js') || scripts[i].getAttribute('data-chatbot-id') || scripts[i].getAttribute('data-bot-id'))) {
        return scripts[i];
      }
    }
    return null;
  })();

  const scriptBotId = currentScript?.getAttribute('data-chatbot-id') || currentScript?.getAttribute('data-bot-id') || '';
  
  // Determine API Base URL
  let scriptApiUrl = currentScript?.getAttribute('data-api-url') || '';
  if (!scriptApiUrl) {
    if (currentScript?.src) {
      try {
        const parsed = new URL(currentScript.src);
        scriptApiUrl = `${parsed.protocol}//${parsed.host}`;
      } catch (e) {
        scriptApiUrl = 'http://localhost:5001';
      }
    } else {
      scriptApiUrl = 'http://localhost:5001';
    }
  }
  // Remove trailing slashes
  scriptApiUrl = scriptApiUrl.replace(/\/+$/, '');

  // Default state configuration
  let config = {
    chatbotId: scriptBotId,
    apiUrl: scriptApiUrl,
    name: 'AI Support Assistant',
    primaryColor: currentScript?.getAttribute('data-primary-color') || '#7c3aed',
    position: currentScript?.getAttribute('data-position') || 'bottom-right', // 'bottom-right' | 'bottom-left'
    theme: currentScript?.getAttribute('data-theme') || 'light', // 'light' | 'dark'
    welcomeMessage: 'Hello! 👋 How can I help you today?',
    fallbackMessage: 'I am sorry, but I do not have enough information to answer that question.',
    launcherIcon: 'message',
    businessLogo: '',
    status: 'active'
  };

  let isOpen = false;
  let isSending = false;
  let messages = [];
  let sessionId = getOrCreateSessionId(config.chatbotId);

  // DOM Elements inside Shadow Root
  let shadowRoot = null;
  let launcherBtn = null;
  let chatWindow = null;
  let messagesList = null;
  let textareaInput = null;
  let sendBtn = null;
  let typingIndicator = null;
  let unreadBadge = null;

  function getOrCreateSessionId(botId) {
    const key = `botflow_session_${botId || 'default'}`;
    try {
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = 'bf_sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        sessionStorage.setItem(key, id);
      }
      return id;
    } catch {
      return 'bf_sess_' + Math.random().toString(36).substring(2, 12);
    }
  }

  function getSavedHistory(botId) {
    const key = `botflow_history_${botId || 'default'}`;
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function saveHistory(botId, msgs) {
    const key = `botflow_history_${botId || 'default'}`;
    try {
      sessionStorage.setItem(key, JSON.stringify(msgs.slice(-20))); // keep last 20
    } catch {}
  }

  // Icons (Clean Inline SVGs)
  const ICONS = {
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`,
    bot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`
  };

  /**
   * Initializes the widget and creates the Shadow DOM container
   */
  async function init(userOptions = {}) {
    Object.assign(config, userOptions);

    if (!config.chatbotId) {
      console.warn('[BotFlow AI] Missing chatbot identifier. Provide data-chatbot-id attribute or call BotFlow("init", { chatbotId: "..." })');
      return;
    }

    // Create host element
    let host = document.getElementById('botflow-widget-root');
    if (!host) {
      host = document.createElement('div');
      host.id = 'botflow-widget-root';
      document.body.appendChild(host);
    }

    // Attach Shadow DOM for complete CSS isolation
    if (!shadowRoot) {
      shadowRoot = host.attachShadow({ mode: 'open' });
    }

    // Fetch dynamic configuration from backend
    try {
      const res = await fetch(`${config.apiUrl}/api/public/chatbots/${config.chatbotId}/config?sessionId=${sessionId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          Object.assign(config, {
            name: json.data.name || config.name,
            primaryColor: json.data.primaryColor || config.primaryColor,
            position: json.data.position || config.position,
            theme: json.data.theme || config.theme,
            windowSize: json.data.windowSize || 'standard',
            launcherIcon: json.data.launcherIcon || config.launcherIcon,
            welcomeMessage: json.data.welcomeMessage || config.welcomeMessage,
            fallbackMessage: json.data.fallbackMessage || config.fallbackMessage,
            businessLogo: json.data.businessLogo || '',
            status: json.data.status || 'active'
          });
        }
      } else if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        console.warn('[BotFlow AI] Chatbot access restricted:', json.error || 'Domain not authorized');
      }
    } catch (err) {
      console.warn('[BotFlow AI] Could not reach configuration API, using fallback options:', err.message);
    }

    // Restore conversation history if present in session
    const saved = getSavedHistory(config.chatbotId);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      messages = saved;
    } else {
      messages = [
        {
          id: 'welcome',
          sender: 'bot',
          text: config.welcomeMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: []
        }
      ];
    }

    render();
  }

  /**
   * Builds and renders the widget HTML & CSS inside the Shadow Root
   */
  function render() {
    const isDark = config.theme === 'dark';
    const isLeft = config.position === 'bottom-left';
    const width = config.windowSize === 'compact' ? '340px' : config.windowSize === 'large' ? '420px' : '380px';
    const height = config.windowSize === 'compact' ? '500px' : config.windowSize === 'large' ? '640px' : '580px';

    const styles = `
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      .bf-container {
        position: fixed;
        bottom: 24px;
        ${isLeft ? 'left: 24px;' : 'right: 24px;'}
        z-index: 2147483647;
        pointer-events: none;
      }

      /* Floating Launcher */
      .bf-launcher {
        pointer-events: auto;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${config.primaryColor};
        color: #ffffff;
        border: none;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
        outline: none;
        position: relative;
      }

      .bf-launcher:hover {
        transform: scale(1.08);
        box-shadow: 0 14px 30px -5px rgba(0, 0, 0, 0.3);
      }

      .bf-launcher svg {
        width: 28px;
        height: 28px;
        transition: transform 0.2s ease;
      }

      .bf-badge {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 14px;
        height: 14px;
        background: #10b981;
        border: 2px solid #ffffff;
        border-radius: 50%;
      }

      /* Chat Window */
      .bf-window {
        pointer-events: auto;
        position: absolute;
        bottom: 76px;
        ${isLeft ? 'left: 0;' : 'right: 0;'}
        width: ${width};
        height: ${height};
        max-height: calc(100vh - 120px);
        max-width: calc(100vw - 32px);
        background: ${isDark ? '#0f172a' : '#ffffff'};
        color: ${isDark ? '#f1f5f9' : '#0f172a'};
        border-radius: 24px;
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transform-origin: ${isLeft ? 'bottom left' : 'bottom right'};
        transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        visibility: hidden;
      }

      .bf-window.bf-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        visibility: visible;
      }

      /* Window Header */
      .bf-header {
        background: ${config.primaryColor};
        color: #ffffff;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .bf-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .bf-avatar {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        overflow: hidden;
      }

      .bf-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .bf-header-title {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.2;
      }

      .bf-header-status {
        font-size: 11px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
      }

      .bf-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        display: inline-block;
      }

      .bf-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .bf-header-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.85);
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }

      .bf-header-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      .bf-header-btn svg {
        width: 18px;
        height: 18px;
      }

      /* Message Body */
      .bf-body {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: ${isDark ? '#0b1120' : '#f8fafc'};
      }

      .bf-message {
        display: flex;
        flex-direction: column;
        max-width: 82%;
        animation: bf-fade 0.2s ease-out;
      }

      @keyframes bf-fade {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .bf-msg-user {
        align-self: flex-end;
        align-items: flex-end;
      }

      .bf-msg-bot {
        align-self: flex-start;
        align-items: flex-start;
      }

      .bf-bubble {
        padding: 11px 15px;
        border-radius: 18px;
        font-size: 13.5px;
        line-height: 1.45;
        word-break: break-word;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .bf-msg-user .bf-bubble {
        background: ${config.primaryColor};
        color: #ffffff;
        border-bottom-right-radius: 4px;
      }

      .bf-msg-bot .bf-bubble {
        background: ${isDark ? '#1e293b' : '#ffffff'};
        color: ${isDark ? '#f8fafc' : '#1e293b'};
        border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
        border-bottom-left-radius: 4px;
      }

      .bf-time {
        font-size: 10px;
        color: ${isDark ? '#64748b' : '#94a3b8'};
        margin-top: 4px;
        padding: 0 4px;
      }

      /* Grounded Citations Pill */
      .bf-citations {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .bf-citation-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 8px;
        background: ${isDark ? '#1e293b' : '#f1f5f9'};
        color: ${isDark ? '#a78bfa' : '#6d28d9'};
        border: 1px solid ${isDark ? '#3730a3' : '#ddd6fe'};
        cursor: pointer;
        text-decoration: none;
        transition: transform 0.15s, background 0.15s;
      }

      .bf-citation-pill:hover {
        transform: translateY(-1px);
        background: ${isDark ? '#312e81' : '#ede9fe'};
      }

      .bf-citation-pill svg {
        width: 12px;
        height: 12px;
      }

      /* Typing Indicator */
      .bf-typing {
        display: none;
        align-self: flex-start;
        align-items: center;
        gap: 4px;
        padding: 10px 14px;
        background: ${isDark ? '#1e293b' : '#ffffff'};
        border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        width: fit-content;
      }

      .bf-typing.bf-active {
        display: flex;
      }

      .bf-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${config.primaryColor};
        animation: bf-bounce 1.4s infinite ease-in-out both;
      }

      .bf-dot:nth-child(1) { animation-delay: -0.32s; }
      .bf-dot:nth-child(2) { animation-delay: -0.16s; }

      @keyframes bf-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1.0); }
      }

      /* Input Footer */
      .bf-footer {
        padding: 12px 14px;
        background: ${isDark ? '#0f172a' : '#ffffff'};
        border-top: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'};
      }

      .bf-input-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: ${isDark ? '#1e293b' : '#f8fafc'};
        border: 1px solid ${isDark ? '#334155' : '#cbd5e1'};
        border-radius: 16px;
        padding: 6px 10px;
        transition: border 0.15s, box-shadow 0.15s;
      }

      .bf-input-row:focus-within {
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 2px ${config.primaryColor}30;
      }

      .bf-textarea {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        resize: none;
        max-height: 100px;
        min-height: 22px;
        font-size: 13px;
        line-height: 1.4;
        color: ${isDark ? '#f8fafc' : '#0f172a'};
      }

      .bf-textarea::placeholder {
        color: ${isDark ? '#64748b' : '#94a3b8'};
      }

      .bf-send-btn {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        background: ${config.primaryColor};
        color: #ffffff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.15s, transform 0.1s;
      }

      .bf-send-btn:hover {
        opacity: 0.9;
        transform: scale(1.04);
      }

      .bf-send-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }

      .bf-send-btn svg {
        width: 15px;
        height: 15px;
      }

      .bf-branding {
        text-align: center;
        margin-top: 6px;
        font-size: 10px;
        color: ${isDark ? '#64748b' : '#94a3b8'};
      }

      .bf-branding a {
        color: ${config.primaryColor};
        text-decoration: none;
        font-weight: 600;
      }

      /* Mobile Full Screen / Responsive Sheet */
      @media (max-width: 480px) {
        .bf-container {
          bottom: 16px;
          ${isLeft ? 'left: 16px;' : 'right: 16px;'}
        }
        .bf-window {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100vw !important;
          height: 100vh !important;
          max-height: 100vh !important;
          max-width: 100vw !important;
          border-radius: 0;
          border: none;
        }
      }
    `;

    shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="bf-container">
        <!-- Chat Window -->
        <div class="bf-window" id="bf-window">
          <!-- Header -->
          <div class="bf-header">
            <div class="bf-header-left">
              <div class="bf-avatar">
                ${config.businessLogo ? `<img src="${config.businessLogo}" alt="${config.name}">` : config.name.charAt(0)}
              </div>
              <div>
                <div class="bf-header-title">${config.name}</div>
                <div class="bf-header-status">
                  <span class="bf-status-dot"></span>
                  <span>Online • AI Assistant</span>
                </div>
              </div>
            </div>
            <div class="bf-header-actions">
              <button class="bf-header-btn" id="bf-clear-btn" title="Clear conversation">
                ${ICONS.trash}
              </button>
              <button class="bf-header-btn" id="bf-minimize-btn" title="Minimize">
                ${ICONS.minimize}
              </button>
              <button class="bf-header-btn" id="bf-close-btn" title="Close">
                ${ICONS.close}
              </button>
            </div>
          </div>

          <!-- Messages Body -->
          <div class="bf-body" id="bf-messages"></div>

          <!-- Typing Indicator -->
          <div class="bf-typing" id="bf-typing">
            <span class="bf-dot"></span>
            <span class="bf-dot"></span>
            <span class="bf-dot"></span>
          </div>

          <!-- Footer / Input -->
          <div class="bf-footer">
            <div class="bf-input-row">
              <textarea
                class="bf-textarea"
                id="bf-textarea"
                rows="1"
                placeholder="Type your question..."
              ></textarea>
              <button class="bf-send-btn" id="bf-send-btn" title="Send message">
                ${ICONS.send}
              </button>
            </div>
            <div class="bf-branding">
              Powered by <a href="https://botflow.ai" target="_blank" rel="noopener">BotFlow.ai</a>
            </div>
          </div>
        </div>

        <!-- Floating Launcher -->
        <button class="bf-launcher" id="bf-launcher" title="Chat with AI assistant">
          <span class="bf-icon" id="bf-launcher-icon">
            ${ICONS[config.launcherIcon] || ICONS.message}
          </span>
          <span class="bf-badge" id="bf-badge"></span>
        </button>
      </div>
    `;

    // Cache elements
    launcherBtn = shadowRoot.getElementById('bf-launcher');
    chatWindow = shadowRoot.getElementById('bf-window');
    messagesList = shadowRoot.getElementById('bf-messages');
    textareaInput = shadowRoot.getElementById('bf-textarea');
    sendBtn = shadowRoot.getElementById('bf-send-btn');
    typingIndicator = shadowRoot.getElementById('bf-typing');
    unreadBadge = shadowRoot.getElementById('bf-badge');

    // Attach event listeners
    launcherBtn.addEventListener('click', toggle);
    shadowRoot.getElementById('bf-close-btn').addEventListener('click', close);
    shadowRoot.getElementById('bf-minimize-btn').addEventListener('click', close);
    shadowRoot.getElementById('bf-clear-btn').addEventListener('click', clearMessages);
    sendBtn.addEventListener('click', handleSend);

    textareaInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    renderMessages();
  }

  function renderMessages() {
    if (!messagesList) return;
    messagesList.innerHTML = '';

    messages.forEach((msg) => {
      const isBot = msg.sender === 'bot';
      const el = document.createElement('div');
      el.className = `bf-message ${isBot ? 'bf-msg-bot' : 'bf-msg-user'}`;

      let citationsHtml = '';
      if (isBot && msg.citations && msg.citations.length > 0) {
        citationsHtml = `<div class="bf-citations">` +
          msg.citations.map(c => `
            <span class="bf-citation-pill" title="${c.snippet ? c.snippet.replace(/"/g, '&quot;') : 'Verified RAG Knowledge'}">
              ${ICONS.fileText}
              <span>${c.title}</span>
            </span>
          `).join('') +
        `</div>`;
      }

      el.innerHTML = `
        <div class="bf-bubble">${escapeHtml(msg.text)}${citationsHtml}</div>
        <div class="bf-time">${msg.time}</div>
      `;
      messagesList.appendChild(el);
    });

    scrollToBottom();
  }

  function scrollToBottom() {
    if (messagesList) {
      setTimeout(() => {
        messagesList.scrollTop = messagesList.scrollHeight;
      }, 30);
    }
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function open() {
    isOpen = true;
    chatWindow?.classList.add('bf-open');
    if (unreadBadge) unreadBadge.style.display = 'none';
    if (launcherBtn) {
      launcherBtn.innerHTML = ICONS.close;
    }
    textareaInput?.focus();
    scrollToBottom();
  }

  function close() {
    isOpen = false;
    chatWindow?.classList.remove('bf-open');
    if (launcherBtn) {
      launcherBtn.innerHTML = (ICONS[config.launcherIcon] || ICONS.message);
    }
  }

  function clearMessages() {
    if (confirm('Clear this chat conversation?')) {
      messages = [
        {
          id: 'welcome',
          sender: 'bot',
          text: config.welcomeMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: []
        }
      ];
      saveHistory(config.chatbotId, messages);
      renderMessages();
    }
  }

  async function handleSend() {
    const text = textareaInput?.value.trim();
    if (!text || isSending) return;

    // Reset textarea
    textareaInput.value = '';
    isSending = true;
    if (sendBtn) sendBtn.disabled = true;

    // Add user message
    const userMsg = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages.push(userMsg);
    renderMessages();

    // Show typing animation
    typingIndicator?.classList.add('bf-active');
    scrollToBottom();

    try {
      const res = await fetch(`${config.apiUrl}/api/public/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          chatbotId: config.chatbotId,
          message: text,
          sessionId,
          history: messages.map(m => ({ sender: m.sender, content: m.text }))
        })
      });

      const json = await res.json();
      typingIndicator?.classList.remove('bf-active');

      if (res.ok && json.success) {
        const botReply = json.data?.reply || config.fallbackMessage;
        const citations = json.data?.citations || [];

        messages.push({
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: botReply,
          citations,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        messages.push({
          id: 'err_' + Date.now(),
          sender: 'bot',
          text: json.error || config.fallbackMessage,
          citations: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err) {
      typingIndicator?.classList.remove('bf-active');
      messages.push({
        id: 'err_' + Date.now(),
        sender: 'bot',
        text: 'Unable to reach the assistant service. Please check your network connection.',
        citations: [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      saveHistory(config.chatbotId, messages);
      renderMessages();
      textareaInput?.focus();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Global programmatic API
  window.BotFlow = function(action, param) {
    if (action === 'init') {
      init(param || {});
    } else if (action === 'open') {
      open();
    } else if (action === 'close') {
      close();
    } else if (action === 'toggle') {
      toggle();
    }
  };

  // Auto-initialize if script has data-chatbot-id
  if (scriptBotId) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init({ chatbotId: scriptBotId }));
    } else {
      init({ chatbotId: scriptBotId });
    }
  }
})();
