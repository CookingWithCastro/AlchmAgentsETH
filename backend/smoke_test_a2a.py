"""A2A smoke test — verifies a2a_server.py against the installed a2a-sdk without
booting the full backend (card GET, message/send, incremental message/stream).

Run in a Python 3.11 venv (a2a-sdk needs >=3.10):
    uv venv --python 3.11 .venv && source .venv/bin/activate
    uv pip install 'a2a-sdk[fastapi]' httpx
    cd backend && PYTHONPATH=. python smoke_test_a2a.py
"""
import os

os.environ.setdefault("A2A_PUBLIC_URL", "http://testserver")

from fastapi import FastAPI
from fastapi.testclient import TestClient

import a2a_server


async def fake_run_chat(agent_id: str, message: str) -> str:
    return f"[{agent_id}] echo: {message}"


async def fake_stream(agent_id: str, message: str):
    for tok in ["Hello ", "from ", agent_id, "! "]:
        yield tok


app = FastAPI()
n = a2a_server.register_a2a_routes(
    app,
    fake_run_chat,
    [{"id": "plato", "name": "Plato", "description": "Test agent"}],
    run_chat_stream=fake_stream,
)
print(f"registered agents: {n}")

client = TestClient(app)

print("\n=== GET agent card ===")
r = client.get("/a2a/plato/.well-known/agent-card.json")
print("status:", r.status_code)
if r.status_code == 200:
    card = r.json()
    print("  name:", card.get("name"))
    print("  skills:", [s.get("id") for s in card.get("skills", [])])
    print("  streaming:", card.get("capabilities", {}).get("streaming"))
    print("  extensions:", [e.get("uri") for e in card.get("capabilities", {}).get("extensions", [])])
    print("  interfaces:", card.get("supportedInterfaces") or card.get("supported_interfaces"))
else:
    print("  body:", r.text[:400])

print("\n=== POST message/send ===")
body = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/send",
    "params": {
        "message": {
            "role": "user",
            "parts": [{"kind": "text", "text": "what is justice?"}],
            "messageId": "m1",
            "kind": "message",
        }
    },
}
r2 = client.post("/a2a/plato/", json=body)
print("status:", r2.status_code)
print("  body:", str(r2.json())[:500])

print("\n=== POST message/stream (SSE — true incremental streaming) ===")
stream_body = {**body, "id": 2, "method": "message/stream"}
events = 0
artifact_events = 0
with client.stream("POST", "/a2a/plato/", json=stream_body) as r3:
    print("status:", r3.status_code, "content-type:", r3.headers.get("content-type"))
    for line in r3.iter_lines():
        s = line if isinstance(line, str) else (line.decode() if line else "")
        if s.startswith("data:"):
            events += 1
            if "artifact" in s.lower():
                artifact_events += 1
print(f"  SSE data events: {events}  (artifact-update events: {artifact_events})")
