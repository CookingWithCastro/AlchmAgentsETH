"""
Self-contained x402 (HTTP 402 "Payment Required") gate for the A2A endpoints.

Gates POST /a2a/<agentId>/ behind a USDC micropayment, following the x402 spec:
  • no/!valid X-PAYMENT header  → 402 with { x402Version, accepts: [PaymentRequirements], error }
  • valid X-PAYMENT             → POST {facilitator}/verify ; on success serve the
                                  response, then POST {facilitator}/settle and return
                                  the receipt in the X-PAYMENT-RESPONSE header.

We talk to a public x402 facilitator (default https://x402.org/facilitator — testnet,
no API key) so this file does the HTTP orchestration only; the facilitator does the
EIP-3009 signature verification + on-chain settlement. No `x402` pip package needed
(its Python SDK currently ships two incompatible in-tree APIs), so this avoids the
dependency conflict while staying spec-compliant.

x402 settles on **Base Sepolia** via the public facilitator, OR **self-settles on
Circle Arc** (X402_SELF_SETTLE=true) via arc_facilitator.py — no external facilitator
needed. (Arc isn't covered by the public/Coinbase x402 facilitators, hence self-settle.)

Config (env): X402_PAY_TO (required to ENFORCE — unset = pass-through dev mode),
  X402_NETWORK (base-sepolia), X402_ASSET (Base Sepolia USDC), X402_PRICE_ATOMIC
  (10000 = $0.01, 6dp), X402_FACILITATOR_URL, X402_MAX_TIMEOUT_SECONDS,
  X402_GATE_PREFIX (/a2a/).
"""

import asyncio
import base64
import json
import os
from typing import Any, Dict

import httpx
from starlette.responses import JSONResponse

import arc_facilitator  # local self-settle (Arc) — no external facilitator needed

X402_VERSION = 1

# Base Sepolia USDC (6 decimals) — the x402 testnet asset.
_DEFAULT_ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
_DEFAULT_FACILITATOR = "https://x402.org/facilitator"


def _cfg() -> Dict[str, Any]:
    return {
        "pay_to": os.getenv("X402_PAY_TO"),
        "network": os.getenv("X402_NETWORK", "base-sepolia"),
        "asset": os.getenv("X402_ASSET", _DEFAULT_ASSET),
        "price_atomic": os.getenv("X402_PRICE_ATOMIC", "10000"),  # $0.01 USDC
        "facilitator": os.getenv("X402_FACILITATOR_URL", _DEFAULT_FACILITATOR).rstrip("/"),
        "max_timeout": int(os.getenv("X402_MAX_TIMEOUT_SECONDS", "1200")),
        "prefix": os.getenv("X402_GATE_PREFIX", "/a2a/"),
    }


def _payment_requirements(cfg: Dict[str, Any], resource: str, agent_id: str) -> Dict[str, Any]:
    return {
        "scheme": "exact",
        "network": cfg["network"],
        "maxAmountRequired": str(cfg["price_atomic"]),
        "resource": resource,
        "description": f"Chat with Alchm agent {agent_id} (one A2A message)",
        "mimeType": "application/json",
        "payTo": cfg["pay_to"],
        "maxTimeoutSeconds": cfg["max_timeout"],
        "asset": cfg["asset"],
        "extra": {"name": "USDC", "version": "2"},
    }


def _agent_id_from_path(path: str, prefix: str) -> str:
    rest = path[len(prefix):] if path.startswith(prefix) else path
    return rest.split("/", 1)[0] or "unknown"


async def _facilitator_post(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        return res.json()


def add_x402_gate(app) -> None:
    """Attach the x402 gate as HTTP middleware on `app`. Call before serving."""

    @app.middleware("http")
    async def x402_gate(request, call_next):
        cfg = _cfg()
        path = request.url.path
        gated = request.method == "POST" and path.startswith(cfg["prefix"])
        # Not a gated A2A call, or no receiving wallet configured → pass through.
        if not gated or not cfg["pay_to"]:
            return await call_next(request)

        agent_id = _agent_id_from_path(path, cfg["prefix"])
        requirements = _payment_requirements(cfg, str(request.url), agent_id)

        header = request.headers.get("x-payment") or request.headers.get("payment-signature")
        if not header:
            return JSONResponse(
                status_code=402,
                content={"x402Version": X402_VERSION, "accepts": [requirements], "error": "X-PAYMENT header required"},
            )

        try:
            payment_payload = json.loads(base64.b64decode(header))
        except Exception:
            return JSONResponse(
                status_code=402,
                content={"x402Version": X402_VERSION, "accepts": [requirements], "error": "Malformed X-PAYMENT header"},
            )

        body = {"x402Version": X402_VERSION, "paymentPayload": payment_payload, "paymentRequirements": requirements}

        # 1) Verify the signed payment authorization (off-chain) before serving.
        #    Self-settle mode (Arc): verify locally; else delegate to the facilitator.
        try:
            if arc_facilitator.is_self_settle_enabled():
                verify = await asyncio.to_thread(arc_facilitator.verify, payment_payload, requirements)
            else:
                verify = await _facilitator_post(f"{cfg['facilitator']}/verify", body)
        except Exception as exc:
            return JSONResponse(status_code=402, content={"x402Version": X402_VERSION, "accepts": [requirements], "error": f"verify failed: {exc}"})
        if not verify.get("isValid"):
            reason = verify.get("invalidReason") or "payment not valid"
            return JSONResponse(status_code=402, content={"x402Version": X402_VERSION, "accepts": [requirements], "error": reason})

        # 2) Serve the actual A2A response.
        response = await call_next(request)

        # 3) Settle on-chain (best-effort) and attach the receipt header.
        try:
            if arc_facilitator.is_self_settle_enabled():
                settle = await asyncio.to_thread(arc_facilitator.settle, payment_payload, requirements)
            else:
                settle = await _facilitator_post(f"{cfg['facilitator']}/settle", body)
            response.headers["X-PAYMENT-RESPONSE"] = base64.b64encode(json.dumps(settle).encode()).decode()
        except Exception as exc:  # noqa: BLE001 — payment verified; settlement retry is operational
            print(f"[x402] settle failed for {agent_id}: {exc}", flush=True)
        return response
