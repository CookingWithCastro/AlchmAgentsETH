use sha2::{Digest, Sha256};
use sha3::Keccak256;
use unicode_normalization::UnicodeNormalization;

pub const ESMS_DECIMALS: u8 = 4;
pub const MAX_LEDGER_ATOMS: u64 = 999_999_999_999;
pub const PERSONA_DOMAIN: &[u8] = b"AAE_PERSONA_V1";
pub const EPOCH_DOMAIN: &[u8] = b"AAE_EPOCH_V1";

pub fn ledger_units_to_atoms(value: &str) -> Option<u64> {
    let (whole, fraction) = match value.split_once('.') {
        Some((_whole, "")) => return None,
        Some((whole, fraction)) => (whole, fraction),
        None => (value, ""),
    };
    if whole.is_empty()
        || whole.len() > 8
        || fraction.len() > ESMS_DECIMALS as usize
        || !whole.bytes().all(|byte| byte.is_ascii_digit())
        || !fraction.bytes().all(|byte| byte.is_ascii_digit())
    {
        return None;
    }

    let whole = whole.parse::<u64>().ok()?;
    let fraction = if fraction.is_empty() {
        0
    } else {
        let parsed = fraction.parse::<u64>().ok()?;
        parsed.checked_mul(10_u64.pow(ESMS_DECIMALS as u32 - fraction.len() as u32))?
    };
    let atoms = whole
        .checked_mul(10_u64.pow(ESMS_DECIMALS as u32))?
        .checked_add(fraction)?;
    (atoms <= MAX_LEDGER_ATOMS).then_some(atoms)
}

pub fn target_persona_hash(agent_id: &str, values: &[f64]) -> Option<[u8; 32]> {
    if values.len() != 64 || values.iter().any(|value| !value.is_finite()) {
        return None;
    }

    let normalized_agent_id: String = agent_id.nfc().collect();
    let agent_key = Sha256::digest(normalized_agent_id.as_bytes());
    let mut hasher = Sha256::new();
    hasher.update(PERSONA_DOMAIN);
    hasher.update(agent_key);
    for value in values {
        let canonical_value = if *value == 0.0 { 0.0 } else { *value };
        hasher.update(canonical_value.to_le_bytes());
    }
    Some(hasher.finalize().into())
}

pub fn epoch_context_hash(canonical_json: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(EPOCH_DOMAIN);
    hasher.update(canonical_json);
    hasher.finalize().into()
}

pub fn openzeppelin_star_leaf(star_id: u32) -> [u8; 32] {
    let mut abi_word = [0_u8; 32];
    abi_word[28..].copy_from_slice(&star_id.to_be_bytes());
    let inner = Keccak256::digest(abi_word);
    Keccak256::digest(inner).into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scales_ledger_units_to_esms_atoms() {
        assert_eq!(ledger_units_to_atoms("100.0000"), Some(1_000_000));
        assert_eq!(ledger_units_to_atoms("0.0001"), Some(1));
        assert_eq!(
            ledger_units_to_atoms("99999999.9999"),
            Some(MAX_LEDGER_ATOMS)
        );
        assert_eq!(ledger_units_to_atoms("1."), None);
        assert_eq!(ledger_units_to_atoms("1.00000"), None);
        assert_eq!(ledger_units_to_atoms("-1.0000"), None);
    }

    #[test]
    fn hashes_canonical_persona_and_epoch_vectors() {
        let mut persona = [0_f64; 64];
        for (index, value) in persona.iter_mut().enumerate().skip(1) {
            *value = (index as f64 - 32.0) / 8.0;
        }

        assert_eq!(
            hex(&target_persona_hash("gregory-castro", &persona).unwrap()),
            "f1b08a3175901956e3a1e9949a017bc326a66530bfb7a937e3c316a4c8643e9c"
        );
        assert_eq!(
            hex(&epoch_context_hash(
                br#"{"domicile":"Sun","epoch":42,"retrogrades":["Mercury"],"transits":{"Moon":123.456}}"#
            )),
            "b6ad9d09d6e12f32c5c42826d9ab8f96be8d98e5a93fd047b38576ce81e1b7b0"
        );
    }

    #[test]
    fn hashes_openzeppelin_uint32_leaf() {
        assert_eq!(
            hex(&openzeppelin_star_leaf(677)),
            "3faa6d4015e2c725ac8e804470bee904ec1855a333dafaf3fbf6e06fdf3e94a2"
        );
    }

    fn hex(bytes: &[u8]) -> String {
        bytes.iter().map(|byte| format!("{byte:02x}")).collect()
    }
}
