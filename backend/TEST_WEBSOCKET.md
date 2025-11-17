# Testing Cross-Device WebSocket Connectivity

This guide helps you verify that WebSocket connections work between devices on your network before debugging your game server.

## Step 1: Test with Simple WebSocket Server

### On Windows (Host Machine):

1. **Start the test server:**
   ```bash
   cd backend
   node test-websocket-server.js
   ```
   
   You should see:
   ```
   [Test WS Server] Starting on ws://0.0.0.0:51338
   [Test WS Server] Connect from another device using: ws://<this-machine-ip>:51338
   [Test WS Server] Server ready. Waiting for connections...
   ```

2. **Note your Windows machine's IP address:**
   - Run `ipconfig` and find your IPv4 address (e.g., `192.168.40.214`)

### On Mac (Client):

1. **Open browser console** (F12 or Cmd+Option+I)

2. **Run this JavaScript in the console:**
   ```javascript
   const ws = new WebSocket('ws://192.168.40.214:51338');
   
   ws.onopen = () => {
     console.log('✅ Test WebSocket connected!');
     ws.send(JSON.stringify({ test: 'hello from Mac' }));
   };
   
   ws.onmessage = (event) => {
     console.log('📨 Received:', event.data);
   };
   
   ws.onerror = (error) => {
     console.error('❌ Test WebSocket error:', error);
   };
   
   ws.onclose = (event) => {
     console.log('🔌 Test WebSocket closed:', event.code, event.reason);
   };
   ```

### Expected Results:

**If WebSocket works cross-device:**
- Mac console: `✅ Test WebSocket connected!`
- Mac console: `📨 Received: {"type":"welcome",...}`
- Windows console: `[Test WS Server] ✅ Client connected from 192.168.40.x:xxxxx`
- Windows console: `[Test WS Server] Received message from...`

**If WebSocket doesn't work:**
- Mac console: `❌ Test WebSocket error:` or connection fails
- Windows console: No connection logs

## Step 2: Test Your Game Server

### On Windows:

1. **Start your game server:**
   ```bash
   cd backend
   npm start
   ```

2. **Watch the console** - you should see:
   ```
   WebSocket server is running on ws://0.0.0.0:51337
   ```

### On Mac:

1. **Open your game in the browser**

2. **Open browser console** (F12 or Cmd+Option+I)

3. **Go to Join Game page and enter:**
   - Host: `192.168.40.214` (your Windows IP)
   - Port: `51337`
   - Click "Join Game"

4. **Watch both consoles:**

   **Mac console should show:**
   ```
   [WebSocket] Host raw: "192.168.40.214" Port raw: 51337
   [WebSocket] Creating WebSocket connection to ws://192.168.40.214:51337
   ```

   **Windows console should show:**
   ```
   [Backend] Client connected from 192.168.40.x:xxxxx
   [Backend] onClientConnect called for 192.168.40.x:xxxxx, readyState: 1
   [Backend] Added client ... to clients set. Total clients: 1
   [Backend] Sending welcome message to ...
   [Backend] Finished setting up client ...
   ```

## What to Look For:

### ✅ Good Signs:
- Windows shows `[Backend] Client connected from...`
- Windows shows `[Backend] onClientConnect called...`
- Windows shows `[Backend] Sending welcome message...`
- Mac receives the welcome message

### ❌ Problem Signs:
- **Windows shows NO connection logs** → Connection never reaches server (network/firewall issue)
- **Windows shows connection but immediate close** → Server is closing the connection (check close logs)
- **Windows shows error during setup** → Check error logs for details
- **Mac shows 1006 immediately** → Connection closed abnormally (check Windows logs for why)

## Common Issues:

1. **No connection logs on Windows:**
   - Check firewall allows port 51337
   - Verify server is binding to `0.0.0.0` not `localhost`
   - Check both devices are on same network

2. **Connection closes immediately:**
   - Check Windows console for close reason
   - Look for errors in `[Backend] WebSocket error from...`
   - Check if `readyState` is OPEN when trying to send

3. **1006 error code:**
   - Usually means connection closed without proper close frame
   - Check Windows logs to see if server received the connection
   - Check if there are any errors during connection setup

