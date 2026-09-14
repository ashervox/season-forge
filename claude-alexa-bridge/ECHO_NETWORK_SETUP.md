# Echo Device Network Configuration Guide

This guide walks you through configuring your Alexa Echo device to route requests to the Claude bridge.

## Prerequisites

- Bridge server running (from main SETUP_GUIDE.md)
- Echo device on same network
- Admin/root access to your network router (for some options)

## Method 1: Using Echo Device Network Settings (Easiest)

### iOS / Android Alexa App

1. Open the **Alexa app**
2. Go to **Devices** → Select your Echo device
3. Tap the **device name** at the top
4. Scroll down to **Network**
5. Tap **Network Settings** / **Proxy**
6. Select **Proxy**: Manual
7. **Proxy Server**: Enter your computer's IP address (e.g., `192.168.1.100`)
8. **Port**: `3000` or `8080` (depending on your setup)
9. **Username/Password**: Leave blank
10. Tap **Save**

### On the Echo Device (Gen 3+)

**Echo Dot / Echo Show / Echo Spot:**
1. Swipe down from top (or tap the 3-bar menu)
2. **Settings** → **Network**
3. Select your WiFi network
4. **Advanced Settings** → **Proxy Settings**
5. Enter server IP and port
6. Confirm

**Echo (cylinder shape):**
1. Say: "Alexa, go to Settings"
2. Navigate to **Device Settings** → **Network** → **Proxy Settings**
3. Configure manual proxy

## Method 2: Router-Level Proxy (Advanced)

Intercept ALL traffic from Echo to AWS through your network gateway.

### Requirements
- Access to router admin panel
- Router with proxy/firewall rules support

### Steps

1. **Access Router**:
   - Usually at `192.168.1.1` or `192.168.0.1`
   - Login with admin credentials

2. **Enable Proxy/Firewall Rules**:
   - Look for: **Firewall** → **Port Forwarding** / **Proxy Rules**
   - Find your Echo device's IP address
   - Add rule:
     ```
     Source: Echo IP (e.g., 192.168.1.50)
     Destination: Bridge Server IP:3000
     Protocol: TCP
     ```

3. **Alternatively, use iptables (Linux)**:
   ```bash
   # On your bridge server (running Linux)
   sudo iptables -t nat -A PREROUTING \
     -p tcp \
     -s 192.168.1.50 \
     -d api.alexa.amazon.com \
     -j REDIRECT --to-port 3000
   ```

## Method 3: DNS Hijacking (Most Transparent)

Override Alexa's DNS resolution to point to your bridge.

### Option A: Router DNS Settings

1. Access your router
2. **Settings** → **DNS**
3. Set as Primary DNS: Bridge server IP (e.g., `192.168.1.100`)
4. Keep secondary DNS as usual (e.g., `8.8.8.8`)

### Option B: Local DNS Server (dnsmasq on Linux/Mac)

```bash
# Install dnsmasq
brew install dnsmasq  # macOS
sudo apt install dnsmasq  # Linux

# Create config
echo "address=/api.alexa.amazon.com/192.168.1.100" | \
  sudo tee -a /usr/local/etc/dnsmasq.conf

# Start service
sudo brew services start dnsmasq  # macOS
sudo systemctl restart dnsmasq  # Linux

# Point Echo to this DNS in router or device settings
```

### Option C: Pi-hole (All-in-one)

Pi-hole is a DNS-level blocker that can also redirect traffic.

```bash
# On a Raspberry Pi
curl -sSL https://install.pi-hole.net | bash

# Add local DNS record in Pi-hole dashboard:
# Domain: api.alexa.amazon.com
# IP: 192.168.1.100 (your bridge server)
```

## Method 4: HTTPS Interception with mitmproxy

For capturing and decrypting HTTPS traffic:

```bash
# Start mitmproxy
mitmproxy --mode reverse:http://localhost:3000@8080

# Configure Echo to use proxy (Method 1)
# Proxy Server: 192.168.1.100
# Port: 8080
```

**Install CA Certificate on Echo:**

1. On your computer, generate cert:
   ```bash
   mitmproxy-ca -q -d ~/.mitmproxy
   ```

2. Copy cert to Echo (if possible, or skip if mitmproxy is transparent)

## Finding Your Computer's Local IP

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1
# Or from System Settings → Network → WiFi → Advanced
```

**Linux:**
```bash
hostname -I
# or: ip addr show
```

**Windows:**
```powershell
ipconfig
# Look for IPv4 Address under your connection
```

## Verifying the Connection

### Test 1: From Echo
Say: **"Switch to Claude"**
Expected: Device acknowledges mode switch

### Test 2: From Your Computer
```bash
# Check if traffic reaches bridge
curl http://localhost:3000/health
# Should return: {"status":"ok","mode":"claude"}

# Monitor incoming connections
sudo lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### Test 3: Check Bridge Logs
```bash
# If running npm start, you should see incoming requests:
# POST /request ...
# GET /health ...
```

## Troubleshooting

### Echo can't find proxy
- Verify IP address is correct
- Verify port is open (firewall)
- Restart Echo device (unplug 10 seconds)
- Check bridge server is running

### Bridge receives requests but no response
- Check API key in .env is valid
- Check internet connectivity
- Look for errors in bridge logs
- Enable DEBUG mode: `DEBUG=true npm start`

### HTTPS/TLS errors
- This is expected unless you configure mitmproxy properly
- Simple solution: Bridge only handles HTTP routes
- Advanced solution: See mitmproxy HTTPS setup above

### Echo reverts to Amazon services
- Some Echo models don't fully respect proxy settings
- Try DNS method instead
- Consider using older Echo models (Gen 1-2) which are more configurable

### Echo keeps asking for proxy password
- Some devices require authentication
- Solution: Set up HTTP Basic Auth on bridge:
  ```javascript
  // In server.js, add middleware:
  const auth = require('basic-auth');
  app.use((req, res, next) => {
    const credentials = auth(req);
    if (!credentials || credentials.pass !== 'alexa') {
      return res.status(401).send('Unauthorized');
    }
    next();
  });
  ```

## Network Diagram

```
Echo Device
    |
    | WiFi (proxy configured)
    |
    v
[Your Computer / Bridge Server:3000]
    |
    | HTTPS/TLS (optional)
    |
    v
[Anthropic Claude API]
    |
    | Response
    |
    v
Echo Device
```

## Security Considerations

⚠️ **IMPORTANT**:
- Bridge runs on your local network, accessible to any device
- Consider:
  - Firewall rules (only allow Echo)
  - Basic HTTP Auth (see troubleshooting)
  - HTTPS with self-signed cert
  - IP whitelist
  - Rate limiting
- Never expose to the internet without proper auth
- Rotate API keys regularly

## Next Steps

1. ✅ Start bridge server
2. ✅ Configure Echo proxy settings
3. ✅ Test with voice command
4. ✅ Monitor logs for incoming requests
5. ⭐ (Optional) Add HTTPS interception
6. ⭐ (Optional) Deploy to always-on device

## Support

If you encounter issues:
1. Check bridge logs: `tail -f nohup.out`
2. Test bridge directly: `curl http://localhost:3000/health`
3. Enable debug mode: `DEBUG=true npm start`
4. Check router proxy/firewall rules
5. Try different configuration method
