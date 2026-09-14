require('dotenv').config();
const express = require('express');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

let currentMode = process.env.DEFAULT_MODE || 'claude';
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.text());

// Store conversation history for context
const conversationHistory = [];
const MAX_HISTORY = 10;

// Utility: Check if text contains mode switch commands
function checkModeSwitch(text) {
  const claudeKeywords = ['switch to claude', 'use claude', 'activate claude', 'enable claude'];
  const alexaKeywords = ['switch to alexa', 'use alexa', 'activate alexa', 'enable alexa'];

  const lowerText = text.toLowerCase();
  if (claudeKeywords.some(kw => lowerText.includes(kw))) {
    return 'claude';
  }
  if (alexaKeywords.some(kw => lowerText.includes(kw))) {
    return 'alexa';
  }
  return null;
}

// Utility: Trim conversation history to keep memory manageable
function trimHistory() {
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: currentMode, timestamp: new Date().toISOString() });
});

// Get current mode
app.get('/mode', (req, res) => {
  res.json({ mode: currentMode });
});

// Set mode
app.post('/mode/:mode', (req, res) => {
  const { mode } = req.params;
  if (['claude', 'alexa'].includes(mode)) {
    currentMode = mode;
    res.json({ success: true, mode: currentMode });
  } else {
    res.status(400).json({ error: 'Invalid mode. Use "claude" or "alexa".' });
  }
});

// Main request handler - processes voice/text input
app.post('/request', async (req, res) => {
  try {
    const userInput = typeof req.body === 'string' ? req.body : req.body.text || '';

    if (!userInput) {
      return res.status(400).json({ error: 'No input provided' });
    }

    // Check for mode switches
    const newMode = checkModeSwitch(userInput);
    if (newMode) {
      currentMode = newMode;
      const modeMessage = `Switched to ${newMode.toUpperCase()} mode.`;
      return res.json({
        response: modeMessage,
        mode: currentMode,
        modeSwitch: true,
      });
    }

    // If in Alexa mode, return a passthrough message
    if (currentMode === 'alexa') {
      return res.json({
        response: 'Alexa mode is active. Routing to Amazon servers.',
        mode: 'alexa',
        passthrough: true,
      });
    }

    // Claude mode: process with Claude API
    if (currentMode === 'claude') {
      // Add user message to history
      conversationHistory.push({
        role: 'user',
        content: userInput,
      });

      trimHistory();

      const response = await client.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        system: process.env.SYSTEM_PROMPT || 'You are Claude, an AI assistant. Keep responses concise for voice output.',
        messages: conversationHistory,
      });

      const assistantMessage = response.content[0].text;

      // Add to history
      conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      trimHistory();

      res.json({
        response: assistantMessage,
        mode: 'claude',
        stopReason: response.stop_reason,
      });
    }
  } catch (error) {
    console.error('Error processing request:', error.message);
    res.status(500).json({
      error: 'Failed to process request',
      details: process.env.DEBUG ? error.message : undefined,
    });
  }
});

// Clear conversation history
app.post('/clear', (req, res) => {
  conversationHistory.length = 0;
  res.json({ success: true, message: 'Conversation history cleared' });
});

// Get conversation history (for debugging)
app.get('/history', (req, res) => {
  if (process.env.DEBUG !== 'true') {
    return res.status(403).json({ error: 'History access disabled in production' });
  }
  res.json({ history: conversationHistory });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.DEBUG ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Claude-Alexa Bridge running on http://localhost:${PORT}`);
  console.log(`Current mode: ${currentMode}`);
  console.log(`Debug mode: ${process.env.DEBUG === 'true' ? 'ON' : 'OFF'}`);
});
