import { env, isGeminiConfigured } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const geminiService = {
  isConfigured() {
    return isGeminiConfigured();
  },

  /**
   * Generates conversational AI response using Google Gemini API
   */
  async generateResponse({ systemPrompt, history = [], message, temperature = 0.3 }) {
    if (!isGeminiConfigured()) {
      throw new Error('Google Gemini API key is not configured.');
    }

    const model = env.GEMINI_MODEL || 'gemini-3.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    // Format conversation history into Gemini contents format
    const contents = [];

    // Prior history (up to last 10 turns)
    const recentHistory = history.slice(-10);
    for (const h of recentHistory) {
      const text = h.content || h.text || '';
      if (!text.trim()) continue;
      const isBot = h.sender === 'bot' || h.role === 'model' || h.role === 'assistant';
      contents.push({
        role: isBot ? 'model' : 'user',
        parts: [{ text }]
      });
    }

    // Current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: Math.min(Math.max(temperature, 0), 1)
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but no response was generated.';
      const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

      return {
        reply,
        model,
        tokensUsed,
        apiUsed: 'google-gemini'
      };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Google Gemini API request timed out after 15 seconds.');
      }
      logger.error('Gemini API invocation error:', err.message);
      throw err;
    }
  }
};
