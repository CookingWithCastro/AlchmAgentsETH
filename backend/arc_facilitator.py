"""
LocalArcFacilitator — self-settle x402 payments on Circle's Arc, with NO external
facilitator. Makes single-chain Arc truly chain-agnostic: the public x402.org and
Coinbase CDP facilitators don't support Arc; rather than depend on Circle's hosted
(Gateway-batching) facilitator, this verifies + settles the EIP-3009 authorization
ourselves against the Arc USDC contract.

Flow (x402 "exact" scheme):
  verify():  recover the signer from the EIP-712 TransferWithAuthorization signature,
             then check signer == from, to == payTo, value >= required, time window,
             and nonce-unused. (No on-chain call — fast, off-chain.)
  settle():  submit transferWithAuthorization(from,to,value,validAfter,validBefore,
             nonce,v,r,s) to Arc USDC (0x3600…) via Arc RPC, signed by an OPERATOR
             key whose wallet holds Arc USDC (= gas). The value moves client→payTo;
             the operator is a pure relayer/sponsor.

Requires: web3 (pulls eth-account). Lazy-imported so the backend boots without it.
Env: ARC_TESTNET_RPC_URL, X402_ASSET (Arc USDC), ARC_OPERATOR_PRIVATE_KEY.

⚠️ Verify on first run: the EIP-712 domain (name/version) MUST match Arc USDC's
actual domain — we read it from the PaymentRequirements `extra` ({name, version})
the server advertised; if Circle's USDC uses "USD Coin"/"2", set extra accordingly.
"""

import os
from typing import Any, Dict, Tuple

# transferWithAuthorization (EIP-3009) — the v,r,s overload.
USDC_EIP3009_ABI = [
    {
        "name": "transferWithAuthorization",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "validAfter", "type": "uint256"},
            {"name": "validBefore", "type": "uint256"},
            {"name": "nonce", "type": "bytes32"},
            {"name": "v", "type": "uint8"},
            {"name": "r", "type": "bytes32"},
            {"name": "s", "type": "bytes32"},
        ],
        "outputs": [],
    }
]

# Track spent nonces in-process (swap for a DB/Redis set in production).
_SPENT_NONCES: set[str] = set()


def is_self_settle_enabled() -> bool:
    """Self-settle mode: explicit flag, or facilitator pointed at the local sentinel."""
    if os.getenv("X402_SELF_SETTLE", "").lower() == "true":
        return True
    return os.getenv("X402_FACILITATOR_URL", "").lower() in ("local", "self", "arc")


def _chain_id() -> int:
    net = os.getenv("X402_NETWORK", "eip155:5042002")
    if net.startswith("eip155:"):
        return int(net.split(":", 1)[1])
    return int(os.getenv("ARC_TESTNET_CHAIN_ID", "5042002"))


def _auth_fields(payment_payload: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    """Extract the EIP-3009 authorization + signature from an x402 payment payload."""
    inner = payment_payload.get("payload", payment_payload)
    auth = inner.get("authorization") or inner.get("auth") or {}
    signature = inner.get("signature") or payment_payload.get("signature")
    return auth, signature


def verify(payment_payload: Dict[str, Any], requirements: Dict[str, Any]) -> Dict[str, Any]:
    """Off-chain verify: recover signer from the EIP-712 sig + validate the terms.
    Returns {isValid, invalidReason, payer}."""
    try:
        from eth_account import Account
        from eth_account.messages import encode_typed_data
    except Exception as exc:  # noqa: BLE001
        return {"isValid": False, "invalidReason": f"web3/eth-account not installed: {exc}"}

    auth, signature = _auth_fields(payment_payload)
    if not signature or not auth.get("from"):
        return {"isValid": False, "invalidReason": "missing signature/authorization"}

    extra = requirements.get("extra") or {}
    nonce = auth["nonce"]
    typed = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "TransferWithAuthorization": [
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "value", "type": "uint256"},
                {"name": "validAfter", "type": "uint256"},
                {"name": "validBefore", "type": "uint256"},
                {"name": "nonce", "type": "bytes32"},
            ],
        },
        "domain": {
            "name": extra.get("name", "USDC"),
            "version": extra.get("version", "2"),
            "chainId": _chain_id(),
            "verifyingContract": requirements["asset"],
        },
        "primaryType": "TransferWithAuthorization",
        "message": {
            "from": auth["from"],
            "to": auth["to"],
            "value": int(auth["value"]),
            "validAfter": int(auth.get("validAfter", 0)),
            "validBefore": int(auth.get("validBefore", 0)),
            "nonce": nonce if isinstance(nonce, (bytes, bytearray)) else bytes.fromhex(str(nonce).removeprefix("0x")),
        },
    }
    try:
        recovered = Account.recover_message(encode_typed_data(full_message=typed), signature=signature)
    except Exception as exc:  # noqa: BLE001
        return {"isValid": False, "invalidReason": f"signature recover failed: {exc}"}

    if recovered.lower() != str(auth["from"]).lower():
        return {"isValid": False, "invalidReason": "signer != from"}
    if str(auth["to"]).lower() != str(requirements["payTo"]).lower():
        return {"isValid": False, "invalidReason": "wrong payTo"}
    if int(auth["value"]) < int(requirements["maxAmountRequired"]):
        return {"isValid": False, "invalidReason": "underpaid"}
    if str(nonce) in _SPENT_NONCES:
        return {"isValid": False, "invalidReason": "nonce already used"}

    return {"isValid": True, "payer": recovered}


def settle(payment_payload: Dict[str, Any], requirements: Dict[str, Any]) -> Dict[str, Any]:
    """On-chain settle: submit transferWithAuthorization to Arc USDC via the operator key.
    Returns {success, transaction, network, payer}."""
    try:
        from web3 import Web3
        from eth_account import Account
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "errorReason": f"web3 not installed: {exc}"}

    operator_key = os.getenv("ARC_OPERATOR_PRIVATE_KEY")
    if not operator_key:
        return {"success": False, "errorReason": "ARC_OPERATOR_PRIVATE_KEY not set"}

    auth, signature = _auth_fields(payment_payload)
    asset = Web3.to_checksum_address(requirements["asset"])
    rpc = os.getenv("ARC_TESTNET_RPC_URL", "https://rpc.testnet.arc.io")
    w3 = Web3(Web3.HTTPProvider(rpc))
    acct = Account.from_key(operator_key)
    usdc = w3.eth.contract(address=asset, abi=USDC_EIP3009_ABI)

    sig = bytes.fromhex(str(signature).removeprefix("0x"))
    r, s, v = sig[:32], sig[32:64], sig[64]
    nonce32 = auth["nonce"] if isinstance(auth["nonce"], (bytes, bytearray)) else bytes.fromhex(str(auth["nonce"]).removeprefix("0x"))

    try:
        tx = usdc.functions.transferWithAuthorization(
            Web3.to_checksum_address(auth["from"]),
            Web3.to_checksum_address(auth["to"]),
            int(auth["value"]),
            int(auth.get("validAfter", 0)),
            int(auth.get("validBefore", 0)),
            nonce32,
            v,
            r,
            s,
        ).build_transaction(
            {
                "from": acct.address,
                "nonce": w3.eth.get_transaction_count(acct.address),
                "chainId": _chain_id(),
                "gas": int(os.getenv("ARC_SETTLE_GAS", "150000")),
                "gasPrice": w3.eth.gas_price,
            }
        )
        signed = acct.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        _SPENT_NONCES.add(str(auth["nonce"]))
        return {
            "success": True,
            "transaction": tx_hash.hex(),
            "network": os.getenv("X402_NETWORK", "eip155:5042002"),
            "payer": auth["from"],
        }
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "errorReason": f"settle tx failed: {exc}"}
