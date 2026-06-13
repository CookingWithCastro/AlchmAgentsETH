# A2A server + x402 payments

Exposes each Alchm agent as a discoverable, **payable** [A2A](https://a2a-protocol.org)
agent, wrapping the in-process `/api/chat` orchestration (persona + RAG + provider
fallback). Built on `a2a-sdk` 1.x.

## Endpoints (per agent)

|            | URL                                                                            |
| ---------- | ------------------------------------------------------------------------------ |
| Agent card | `GET  {A2A_PUBLIC_URL}/a2a/<agentId>/.well-known/agent-card.json`              |
| JSON-RPC   | `POST {A2A_PUBLIC_URL}/a2a/<agentId>/` (`message/send` + `message/stream` SSE) |

One `chat` skill per agent. Cards advertise the standard x402 payment extension
(`https://github.com/google-a2a/a2a-x402/v0.1`). `enable_v0_3_compat=True` keeps the
endpoint usable by A2A v0.3 clients.

## Files

- `a2a_server.py` — `register_a2a_routes(app, run_chat, agents)`; per-agent card + executor.
- `x402_middleware.py` — `add_x402_gate(app)`; self-contained HTTP-402 gate on `/a2a/`.
- `main.py` (tail) — wires both, builds the agent list, injects the in-process chat fn.

## Run

Requires **Python ≥ 3.10** (the Railway Dockerfile uses `python:3.11-slim`; the SDK
won't install on 3.9).

```bash
cd backend && pip install -r requirements.txt      # pulls a2a-sdk[fastapi]
uvicorn main:app --reload --port 8000
# → "[a2a] mounted 6 agent(s) at /a2a/<agentId>/.well-known/agent-card.json"
```

Discover + (free, dev-mode) call:

```bash
curl http://localhost:8000/a2a/plato/.well-known/agent-card.json
curl -X POST http://localhost:8000/a2a/plato/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"message/send",
       "params":{"message":{"role":"user","parts":[{"text":"What is the Good?"}]}}}'
```

If `a2a-sdk` isn't installed, the backend still boots — A2A is skipped with a log line.

## Verify locally (uv — Python 3.11; a2a-sdk needs ≥3.10)

System Python may be 3.9; use `uv` to get 3.11 without touching it. `smoke_test_a2a.py`
verifies the A2A layer (card GET, `message/send`, incremental `message/stream`) without
booting the full backend:

```bash
uv venv --python 3.11 .venv && source .venv/bin/activate
uv pip install 'a2a-sdk[fastapi]' httpx     # isolated; or `-r backend/requirements.txt` for the full server
cd backend && PYTHONPATH=. python smoke_test_a2a.py
# → card status 200; message/stream → "SSE data events: 7 (artifact-update events: 4)"
```

Verified against **a2a-sdk 1.1.0**: streaming emits an initial Task, then one
`TaskArtifactUpdateEvent` per token chunk (append), then completion — so
`message/stream` clients get true incremental output.

## Payments (x402)

- **Chain: Base Sepolia** (testnet USDC). x402 does **not** support Circle Arc — ERC-8004
  agent _registration_ happens on Arc, but x402 _payments_ are on Base Sepolia. Separate chains.
- **Enforcement is opt-in:** set `X402_PAY_TO` to a wallet you control to require payment.
  Unset → dev pass-through (calls are free), so you can demo A2A without a wallet.
- Facilitator `https://x402.org/facilitator` (testnet, no API key) does the EIP-3009
  verification + on-chain settlement; the middleware only orchestrates the 402 → verify →
  serve → settle flow and returns the receipt in `X-PAYMENT-RESPONSE`.

| env                    | default                | purpose                                        |
| ---------------------- | ---------------------- | ---------------------------------------------- |
| `A2A_ENABLED`          | `true`                 | mount the A2A server                           |
| `A2A_AGENT_IDS`        | flagship set           | which agentIds to expose                       |
| `A2A_PUBLIC_URL`       | backend URL            | base for card URLs + ENS `agent-endpoint[a2a]` |
| `X402_PAY_TO`          | _(unset)_              | receiving wallet — **set to enforce payment**  |
| `X402_NETWORK`         | `base-sepolia`         | x402 network                                   |
| `X402_FACILITATOR_URL` | `x402.org/facilitator` | verify/settle facilitator                      |
| `X402_PRICE_ATOMIC`    | `10000`                | price per message ($0.01 USDC, 6dp)            |

## Discovery chain (how it all connects)

`plato.alchmagents.eth` → ENS `agent-endpoint[a2a]` (set by `scripts/register-all-agents-ens.ts`
from `A2A_PUBLIC_URL`) → `{base}/a2a/plato/.well-known/agent-card.json` → `message/send`
(x402-paid) → persona-driven reply.
