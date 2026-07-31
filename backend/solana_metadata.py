"""Deterministic AAE Solana PersonaCommitment PDA metadata.

This stays dependency-free so A2A discovery does not require the Python Solana
SDK. The derivation mirrors PublicKey.findProgramAddressSync in web3.js.
"""

from hashlib import sha256

AAE_SOLANA_PROGRAM_ID = "5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD"
_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_PDA_MARKER = b"ProgramDerivedAddress"
_FIELD = 2**255 - 19
_D = (-121665 * pow(121666, _FIELD - 2, _FIELD)) % _FIELD


def _b58decode(value: str) -> bytes:
    number = 0
    for char in value:
        number = number * 58 + _ALPHABET.index(char)
    payload = number.to_bytes((number.bit_length() + 7) // 8, "big") if number else b""
    return b"\0" * (len(value) - len(value.lstrip("1"))) + payload


def _b58encode(value: bytes) -> str:
    number = int.from_bytes(value, "big")
    encoded = ""
    while number:
        number, remainder = divmod(number, 58)
        encoded = _ALPHABET[remainder] + encoded
    return "1" * (len(value) - len(value.lstrip(b"\0"))) + (encoded or "")


def _is_ed25519_point(value: bytes) -> bool:
    if len(value) != 32:
        return False
    y = int.from_bytes(value, "little") & ((1 << 255) - 1)
    if y >= _FIELD:
        return False
    y_squared = y * y % _FIELD
    denominator = (_D * y_squared + 1) % _FIELD
    if denominator == 0:
        return False
    x_squared = (y_squared - 1) * pow(denominator, _FIELD - 2, _FIELD) % _FIELD
    return pow(x_squared, (_FIELD - 1) // 2, _FIELD) in (0, 1)


def _persona_pda(agent_id: str) -> str:
    program = _b58decode(AAE_SOLANA_PROGRAM_ID)
    agent_hash = sha256(agent_id.strip().encode("utf-8")).digest()
    for bump in range(255, -1, -1):
        candidate = sha256(
            b"persona_commitment" + agent_hash + bytes([bump]) + program + _PDA_MARKER
        ).digest()
        if not _is_ed25519_point(candidate):
            return _b58encode(candidate)
    raise ValueError("unable to derive PersonaCommitment PDA")


def build_solana_agent_metadata(agent_id: str) -> dict[str, str]:
    if not agent_id.strip():
        raise ValueError("agent_id is required")
    return {
        "program_id": AAE_SOLANA_PROGRAM_ID,
        "persona_pda": _persona_pda(agent_id),
        "cluster": "devnet",
    }
