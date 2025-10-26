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

Ensure that the 2 devices are able to communicate across the network and there are no firewall restrictions.
Through my testing, I've noted that you MUST set the IP address to something other than `localhost`. Naturally, the IP address you should likely choose is your local one (i.e. 192.168.1.105)

Note that to set the port and host without touching the source code, you can create a `.env` file in the `backend` root structured like below:

```text
HOST=192.168.1.105
PORT=51337
```
