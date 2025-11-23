# Backend

This is the backend of the project for the LAN multiplayer WebSockets server.

## Startup Instructions

To start the backend server, run the following commands from this directory (`backend`):

```bash
npm install
npm start
```

This is what you should see after running `npm start`:

![Screenshot of a terminal after running the provided command(s)](../assets/images/backend_start.png)

NOTE: Leave this running in a separate terminal than the frontend.

## Connecting Across Devices On Same Network

### Server Setup (Hosting Device)

The server now defaults to binding on `0.0.0.0` (all network interfaces), which allows connections from other devices on your LAN.

**Important:** To accept connections from other devices:
- The server should bind to `0.0.0.0` (default) or your LAN IP address
- **NOT** `localhost` or `127.0.0.1` (these only accept same-machine connections)

You can override the host/port by creating a `.env` file in the `backend` root:

```text
# Bind to all interfaces (recommended for LAN play)
# Defaults are already set to HOST=0.0.0.0 and PORT=51337
# Only create .env if you need to override these defaults

# Example: Override to bind to a specific LAN IP
# HOST=192.168.1.105
# PORT=51337

# Note: Default port is 51337. Change PORT in .env if you want a different port.
```

### Client Setup (Joining Device)

On the device joining the game:
1. Find the hosting device's LAN IP address (e.g., `192.168.1.105`)
2. In the "Join Game" form, enter:
   - **Host:** The hosting device's LAN IP (e.g., `192.168.1.105`)
   - **Port:** The port the server is running on (default: `51337`, or the value set in `.env`)

### Finding Your LAN IP Address

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter (usually Wi-Fi or Ethernet)
```

**Mac/Linux:**
```bash
# For Wi-Fi
ipconfig getifaddr en0

# For Ethernet
ipconfig getifaddr en1

# Or use:
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Firewall Configuration

Make sure your firewall allows incoming connections on the server port:
- **Windows:** Windows Defender Firewall → Allow an app → Node.js
- **Mac:** System Settings → Network → Firewall → Allow incoming connections for Node/Terminal
- **Linux:** Configure `ufw` or `iptables` to allow the port

### Troubleshooting

- **Connection refused:** Server may be binding to `localhost` instead of `0.0.0.0`
- **Can't reach host:** Check that both devices are on the same Wi-Fi network (not guest network)
- **Firewall blocking:** Ensure the port is open in your firewall settings
