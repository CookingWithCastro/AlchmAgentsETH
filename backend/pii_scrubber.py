"""
PII Scrubber Utility (NY SHIELD Act & GDPR Compliance)
Redacts email addresses and rounds exact birth coordinates before submitting prompts to LLMs.
"""

import re

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
COORD_KEY_REGEX = re.compile(r'("?(?:lat|latitude|lon|longitude)"?\s*:\s*)(-?\d+\.\d{2,})', re.IGNORECASE)
COORD_TEXT_REGEX = re.compile(r'(\b(?:Lat|Latitude|Lon|Longitude)\s*[:=]\s*)(-?\d+\.\d{2,})', re.IGNORECASE)

def scrub_pii_from_prompt(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""

    # 1. Redact email addresses
    scrubbed = EMAIL_REGEX.sub("[REDACTED_EMAIL]", text)

    # 2. Round high-precision coordinates to 1 decimal place
    def _round_match(match):
        prefix = match.group(1)
        val = float(match.group(2))
        return f"{prefix}{val:.1f}"

    scrubbed = COORD_KEY_REGEX.sub(_round_match, scrubbed)
    scrubbed = COORD_TEXT_REGEX.sub(_round_match, scrubbed)

    return scrubbed
