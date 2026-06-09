//! Aspect geometry. Port of `utils.py:calculate_aspects` and
//! `calculate_aspect_efficiency`.

use super::alchemy::PositionInput;
use super::constants::{ASPECT_DEFINITIONS, SIGNS_LOWER};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Aspect {
    pub planet1: String,
    pub planet2: String,
    #[serde(rename = "type")]
    pub aspect_type: String,
    pub orb: f64,
    pub strength: f64,
}

/// Sign + degree → absolute ecliptic longitude. Unknown signs map to 0.0,
/// mirroring `get_longitude`.
fn get_longitude(pos: &PositionInput) -> f64 {
    let sign_lower = pos.sign.to_lowercase();
    match SIGNS_LOWER.iter().position(|s| *s == sign_lower) {
        Some(idx) => idx as f64 * 30.0 + pos.degree,
        None => 0.0,
    }
}

/// Port of `calculate_aspects`. Emits every aspect whose orb is within tolerance,
/// in `(planet pair) × (aspect definition)` order.
pub fn calculate_aspects(positions: &[(String, PositionInput)]) -> Vec<Aspect> {
    let mut aspects = Vec::new();
    for i in 0..positions.len() {
        for j in (i + 1)..positions.len() {
            let (p1, pos1) = &positions[i];
            let (p2, pos2) = &positions[j];
            let long1 = get_longitude(pos1);
            let long2 = get_longitude(pos2);

            let mut diff = (long1 - long2).abs();
            if diff > 180.0 {
                diff = 360.0 - diff;
            }

            for (name, max_orb, angle) in ASPECT_DEFINITIONS {
                let orb = (diff - angle).abs();
                if orb <= max_orb {
                    aspects.push(Aspect {
                        planet1: p1.clone(),
                        planet2: p2.clone(),
                        aspect_type: name.to_string(),
                        orb,
                        strength: 1.0 - orb / max_orb,
                    });
                }
            }
        }
    }
    aspects
}

/// Port of `calculate_aspect_efficiency`: fraction of harmonious aspects, or 0.5
/// when there are none.
pub fn calculate_aspect_efficiency(positions: &[(String, PositionInput)]) -> f64 {
    let aspects = calculate_aspects(positions);
    if aspects.is_empty() {
        return 0.5;
    }
    let harmonious = ["trine", "sextile", "conjunction"];
    let count = aspects
        .iter()
        .filter(|a| harmonious.contains(&a.aspect_type.as_str()))
        .count();
    count as f64 / aspects.len() as f64
}
