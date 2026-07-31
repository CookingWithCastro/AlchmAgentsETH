from solana_metadata import build_solana_agent_metadata


def test_persona_pda_matches_anchor_client_vector():
    assert build_solana_agent_metadata("plato") == {
        "program_id": "5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD",
        "persona_pda": "G1rx8rLAfcu9S4izC3o4Y9mLwdEoXKT8EWTn5HyxpAqE",
        "cluster": "devnet",
    }
