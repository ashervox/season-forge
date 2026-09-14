# Claude-Alexa Bridge

A software proxy that intercepts your Alexa Echo device and routes requests to Claude instead. Switch between Claude and Alexa modes with voice commands.

## Architecture

```
Echo Device → Local Proxy Server → Claude API
    ↓
  Response back to device
```

The proxy runs locally on your network:
1. Intercepts Alexa requests (via DNS/HTTPS proxy or mitmproxy)
2. Converts voice to text (using device audio or speech-to-text API)
3. Sends requests to Claude API
4. Converts Claude's text response back to speech
5. Returns response to Echo device

## Components

- **Proxy Server** (`server.js`) - Intercepts requests and routes to Claude
- **Voice Handler** - Processes audio input/output
- **Claude API Client** - Handles communication with Claude
- **Mode Switcher** - Allows voice-based switching between Claude/Alexa modes

## Setup

### Requirements
- Node.js 18+
- Anthropic API key
- Local network access to your Echo device
- mitmproxy (optional, for HTTPS interception)

### Installation

```bash
cd claude-alexa-bridge
npm install
cp .env.example .env
# Edit .env with your Anthropic API key
npm start
```

### Configuration

1. Set your Anthropic API key in `.env`
2. Configure your Echo device to use the proxy (set network proxy to this server's IP)
3. Say "Switch to Claude" to activate Claude mode

## Voice Commands

- **"Switch to Claude"** - Activate Claude mode
- **"Switch to Alexa"** - Return to normal Alexa mode
- **Normal voice requests** - Routed based on active mode

## Development Status

- [ ] Proxy server skeleton
- [ ] Claude API integration
- [ ] Voice processing (STT/TTS)
- [ ] Mode switching logic
- [ ] Testing with real Echo device
- [ ] Network configuration guide

## Security Notes

- Run on a private network only
- Never expose to the internet
- Keep API keys secure in environment variables
- Use HTTPS interception carefully

## License

MIT
