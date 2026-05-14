# TRON A2A Node.js Demo

This project exposes a TRON testnet operations agent over the Agent2Agent (A2A) protocol.

The agent can:

- return wallet or address balances
- prepare a TRX transfer proposal
- broadcast an explicitly approved TRX transfer
- verify a transaction by hash
- stream task status and structured artifacts

## Protocol Note

The A2A docs at `https://a2a-protocol.org/latest/` describe the latest protocol line. The stable JavaScript SDK currently published as `@a2a-js/sdk@0.3.13` implements A2A `v0.3.0`; this demo uses that stable package for a working Node.js implementation. The package also publishes a `next` alpha for the newer line.

## Setup

```bash
npm install
cp .env.example .env
```

Add a funded TRON testnet private key to `.env` only if you want to broadcast transactions. Balance checks and transfer proposals work without broadcasting.

## Run

Start the A2A agent:

```bash
npm run server
```

Inspect the Agent Card:

```bash
curl http://localhost:4000/.well-known/agent-card.json
```

Send a message through the A2A client:

```bash
npm run client -- "balance"
npm run client -- "prepare transfer 1 TRX to TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
npm run client -- "verify <transaction_id>"
```

Broadcasting requires `TRON_PRIVATE_KEY` and an explicit broadcast request:

```bash
npm run client -- "broadcast 1 TRX to TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Streaming example:

```bash
npm run client:stream -- "prepare transfer 1 TRX to TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

## A2A Endpoints

- Agent Card: `GET /.well-known/agent-card.json`
- JSON-RPC: `/a2a/jsonrpc`
- HTTP+JSON REST: `/a2a/rest`

## Structured Message Format

The agent also accepts `data` parts from other agents:

```json
{
  "action": "prepare_trx_transfer",
  "to": "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "amountTrx": "1"
}
```

Supported actions:

- `get_tron_balance`
- `prepare_trx_transfer`
- `broadcast_trx_transfer`
- `verify_transaction`

## Safety

Use testnet only. Keep `TRON_PRIVATE_KEY` server-side. The demo never broadcasts unless the incoming request asks for `broadcast_trx_transfer` or the natural-language prompt starts with `broadcast`.
