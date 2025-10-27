# Middleware message envelope

This package holds shared types and schemas used by the frontend and backend. It now includes a small, versioned envelope to differentiate WebSocket messages.

## Startup Instructions

```bash
npm install
```

## Envelope shape

- key: message discriminator (one of `GameMessageKeys`)
- v: protocol version (currently `1`)
- payload: typed body specific to the key
- ts: optional epoch ms timestamp
- requestId: optional correlation id (uuid)
- lobbyId: optional lobby routing id

```ts
// Type
export interface GameMessage<P = unknown, K extends GameMessageKeyType = GameMessageKeyType> {
  key: K;
  v: 1;
  payload: P;
  ts?: number;
  requestId?: string;
  lobbyId?: string;
}
```

## Keys

Available message keys live in `middleware/enums/GameMessageKey.ts` as a const tuple union:

```ts
export const GameMessageKeys = [
  'JOIN',
  'DISCONNECT',
  'MOVE',
  'JOIN_POKER'
] as const;
export type GameMessageKeyType = typeof GameMessageKeys[number];
```

## Schemas

Use Zod to validate at boundaries. Helpers are provided:

```ts
import { createGameMessageSchema, MoveGameMessageSchema } from '~middleware/models';

// Strongly-typed envelope for MOVE
MoveGameMessageSchema.parse({
  key: 'MOVE',
  v: 1,
  payload: { user: { name: 'Alice', balance: 1000, dateCreated: new Date(), dateUpdated: new Date() }, x: 10, y: 20 },
});

// Generic builder for custom keys
const MySchema = createGameMessageSchema('JOIN_POKER', JoinPokerMessageSchema);
```

## Backwards compatibility

- Server and client accept both the new envelope format and legacy raw `MovementMessage` payloads.
- All outgoing broadcasts are enveloped.

## Examples

Client send movement

```ts
const envelope = { key: 'MOVE', v: 1, payload: { user, x, y }, ts: Date.now() };
ws.send(JSON.stringify(envelope));
```

Server broadcast

```ts
const payload = { key: 'MOVE', v: 1, payload: movement, ts: Date.now() };
client.send(JSON.stringify(payload));
```

## Extending

1. Add a new key to `GameMessageKeys`.
2. Define a payload schema under `middleware/models`.
3. Optionally export a typed schema via `createGameMessageSchema('NEW_KEY', YourPayloadSchema)`.
4. Handle the key in server and client switch statements.
