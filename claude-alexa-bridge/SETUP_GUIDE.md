# Claude-Alexa Bridge Setup Guide

## Step 1: Prerequisites

- **Node.js** (v18+) installed on your machine
- **Anthropic API Key** from https://console.anthropic.com
- **Alexa Echo device** on the same network
- A machine that can run 24/7 (or at least while testing)

## Step 2: Install and Configure

```bash
# Clone/navigate to the project
cd claude-alexa-bridge

# Install dependencies
npm install

# Copy and edit environment file
cp .env.example .env

# Edit .env with your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Step 3: Start the Bridge Server

```bash
npm start
```

You should see:
```
Claude-Alexa Bridge running on http://localhost:3000
Current mode: claude
```

## Step 4: Network Configuration (Choose One)

### Option A: mitmproxy (Recommended for Full HTTPS Interception)

This allows the bridge to intercept ALL Alexa traffic, including HTTPS requests.

```bash
# Install mitmproxy (macOS)
brew install mitmproxy

# Or download from: https://mitmproxy.org/

# Start mitmproxy
mitmproxy --mode reverse:http://localhost:3000@8080

# Configure your Echo device to use proxy:
# Settings → Network → Proxy: Manual
# Proxy IP: [Your computer's local IP]
# Port: 8080
```

### Option B: Simple HTTP Proxy (Testing Only)

Only works for non-HTTPS requests:

```bash
# Configure Echo device to use HTTP proxy
# Proxy IP: [Your computer's local IP]
# Port: 3000
```

### Option C: DNS Hijacking (Advanced)

Redirect Alexa's API requests to your local server:

1. Set up a local DNS server (dnsmasq, Pi-hole, etc.)
2. Add DNS records to point Alexa endpoints to your server's IP
3. Configure Echo to use your DNS

## Step 5: Finding Your Computer's IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```
ipconfig
```

Look for your local IP (usually `192.168.x.x` or `10.x.x.x`)

## Step 6: Test the Bridge

### Via curl (from your computer):

```bash
# Test basic connectivity
curl http://localhost:3000/health

# Test Claude request
curl -X POST http://localhost:3000/request \
  -H "Content-Type: application/json" \
  -d '{"text": "What is 2 + 2?"}'

# Test mode switching
curl -X POST http://localhost:3000/request \
  -H "Content-Type: application/json" \
  -d '{"text": "Switch to Claude"}'

# Check current mode
curl http://localhost:3000/mode
```

### From your Echo device:

Say any request like:
- "Switch to Claude"
- "What's the weather?" (will use Claude)
- "Tell me a joke"

## Step 7: Troubleshooting

### Bridge won't start
- Check Node.js version: `node --version` (need v18+)
- Check API key is valid in .env
- Check port 3000 isn't in use: `lsof -i :3000`

### Echo won't connect to proxy
- Verify computer and Echo are on same network
- Check firewall allows port 3000/8080
- Verify proxy IP is correct (use actual IP, not localhost)
- Restart Echo device: unplug 10 seconds, plug back in

### Claude not responding
- Check API key in .env is correct
- Verify API key has credit/quota
- Check internet connection
- Enable DEBUG mode: `DEBUG=true npm start`

### Audio not working
- This implementation handles text input/output
- For voice, you'll need STT (speech-to-text) API
- Consider adding Whisper API or native device speech recognition

## Step 8: Production Deployment (Optional)

For 24/7 operation without your dev machine:

### Option 1: Raspberry Pi
```bash
# SSH into Pi
ssh pi@raspberrypi.local

# Clone repo and follow steps 2-3
git clone <repo>
cd claude-alexa-bridge
npm install
npm start
```

### Option 2: Docker
```bash
# Build container
docker build -t claude-alexa-bridge .

# Run
docker run -e ANTHROPIC_API_KEY=sk-ant-xxx -p 3000:3000 claude-alexa-bridge
```

### Option 3: Cloud Server
Not recommended due to Alexa regional restrictions and latency, but possible with:
- AWS EC2
- DigitalOcean
- Linode

## Advanced: Voice Processing

To add actual voice input/output (not just text):

1. **Capture device audio**: Use recorder.js or similar
2. **Speech-to-Text**: Send to Whisper API or use built-in Alexa STT
3. **Process with Claude**: Send text to `/request` endpoint
4. **Text-to-Speech**: Use node-speaker, google-tts, or AWS Polly
5. **Send back to device**: Stream audio response

## Security Warnings

⚠️ **IMPORTANT**:
- Only run on private networks you control
- Never expose this to the internet without authentication
- Keep your API key secret—never commit it to git
- Use HTTPS in production
- Consider rate limiting
- Add authentication if exposing beyond trusted network

## Next Steps

- [ ] Verify Claude mode works with text input
- [ ] Set up mitmproxy for HTTPS interception
- [ ] Configure Echo device proxy settings
- [ ] Test actual voice requests
- [ ] Implement proper STT/TTS if voice needed
- [ ] Add conversation history persistence
- [ ] Deploy to always-on server (Pi/Docker/Cloud)
