#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function makeRequest(text) {
  try {
    const response = await axios.post(`${API_URL}/request`, { text }, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to bridge server. Is it running? (npm start)');
    }
    throw error;
  }
}

async function getMode() {
  try {
    const response = await axios.get(`${API_URL}/mode`);
    return response.data.mode;
  } catch (error) {
    return 'unknown';
  }
}

async function interact() {
  console.log('Claude-Alexa Bridge Test Client');
  console.log('================================');
  console.log('Commands:');
  console.log('  "switch to claude" - Activate Claude mode');
  console.log('  "switch to alexa"  - Activate Alexa mode');
  console.log('  "clear"            - Clear conversation history');
  console.log('  "exit" or Ctrl+C   - Quit');
  console.log('');

  const askQuestion = () => {
    const mode = getMode().then(m => {
      rl.question(`[${m.toUpperCase()}] You: `, async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log('Goodbye!');
          rl.close();
          return;
        }

        if (input.toLowerCase() === 'clear') {
          try {
            await axios.post(`${API_URL}/clear`);
            console.log('Conversation history cleared.\n');
          } catch (error) {
            console.error('Error clearing history:', error.message);
          }
          askQuestion();
          return;
        }

        try {
          const result = await makeRequest(input);

          if (result.modeSwitch) {
            console.log(`\n✓ ${result.response}`);
          } else if (result.passthrough) {
            console.log(`\nℹ ${result.response}`);
          } else {
            console.log(`\nClaude: ${result.response}`);
          }
          console.log('');

          askQuestion();
        } catch (error) {
          console.error(`\nError: ${error.message}\n`);
          askQuestion();
        }
      });
    });
  };

  askQuestion();
}

// Check server connectivity
axios.get(`${API_URL}/health`)
  .then(() => interact())
  .catch((error) => {
    console.error('Error: Cannot connect to Claude-Alexa Bridge server.');
    console.error('Make sure it is running with: npm start\n');
    process.exit(1);
  });
