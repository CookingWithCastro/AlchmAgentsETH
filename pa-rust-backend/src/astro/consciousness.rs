//! Consciousness scalars. Port of `utils.py:calculate_monica_constant` and
//! `get_consciousness_level`.

/// Golden ratio φ, as written in `utils.py`.
pub const PHI: f64 = 1.618033988749;

/// Port of `calculate_monica_constant`: `(spirit*φ + essence) / (matter + substance + 1)`.
pub fn calculate_monica_constant(spirit: f64, essence: f64, matter: f64, substance: f64) -> f64 {
    (spirit * PHI + essence) / (matter + substance + 1.0)
}

/// Port of `get_consciousness_level`.
pub fn get_consciousness_level(monica_constant: f64) -> &'static str {
    if monica_constant >= 6.0 {
        "Transcendent"
    } else if monica_constant >= 5.5 {
        "Illuminated"
    } else if monica_constant >= 4.5 {
        "Advanced"
    } else if monica_constant >= 3.5 {
        "Elevated"
    } else if monica_constant >= 2.5 {
        "Active"
    } else if monica_constant >= 1.5 {
        "Awakening"
    } else {
        "Dormant"
    }
}
