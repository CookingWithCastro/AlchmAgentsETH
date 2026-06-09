//! The alchemical engine. Port of the `alchemize`, `alchemize_detailed`,
//! `aggregate_alchemical_properties`, and `get_planetary_modifiers` functions
//! from `backend/utils.py`, with byte-for-byte attention to the numeric model.

use super::constants::*;
use super::positions::PlanetPosition;
use chrono::{NaiveDateTime, Timelike};
use indexmap::IndexMap;
use serde::Serialize;
use serde_json::Value;

/// A normalized planetary position entering the alchemical math, mirroring the
/// dict shape produced by `ensure_planetary_positions_dict`. `exact_longitude`
/// always carries a value (default 0.0), exactly like the Python helper — which
/// is why the degree/minute momentum fallback is effectively dead code there too.
#[derive(Debug, Clone)]
pub struct PositionInput {
    pub sign: String,
    pub degree: f64,
    pub minute: f64,
    pub exact_longitude: f64,
}

/// Port of `ensure_planetary_positions_dict` for an arbitrary JSON object.
/// String values become `{sign, degree:0, minute:0, exactLongitude:0.0}`.
pub fn ensure_from_value(value: &Value) -> Vec<(String, PositionInput)> {
    let mut out = Vec::new();
    let Some(obj) = value.as_object() else {
        return out;
    };
    for (planet, val) in obj {
        if let Some(s) = val.as_str() {
            out.push((
                planet.clone(),
                PositionInput {
                    sign: s.to_string(),
                    degree: 0.0,
                    minute: 0.0,
                    exact_longitude: 0.0,
                },
            ));
        } else if let Some(v) = val.as_object() {
            let num = |k: &str| v.get(k).and_then(Value::as_f64);
            out.push((
                planet.clone(),
                PositionInput {
                    sign: v
                        .get("sign")
                        .and_then(Value::as_str)
                        .unwrap_or("Aries")
                        .to_string(),
                    degree: num("degree").unwrap_or(0.0),
                    minute: num("minute").unwrap_or(0.0),
                    exact_longitude: num("exactLongitude").unwrap_or(0.0),
                },
            ));
        }
    }
    out
}

/// Convert generated positions into alchemical inputs without a JSON round-trip.
pub fn ensure_from_positions(
    map: &IndexMap<String, PlanetPosition>,
) -> Vec<(String, PositionInput)> {
    map.iter()
        .map(|(planet, p)| {
            (
                planet.clone(),
                PositionInput {
                    sign: p.sign.clone(),
                    degree: p.degree as f64,
                    minute: p.minute as f64,
                    exact_longitude: p.exact_longitude,
                },
            )
        })
        .collect()
}

/// Port of `normalize_alchm_weight`.
pub fn normalize_alchm_weight(period_years: f64) -> f64 {
    let (min, max) = period_log_bounds();
    (period_years.max(1e-9).log10() - min) / (max - min)
}

/// Port of `normalize_planet_weight`.
pub fn normalize_planet_weight(rel_mass: f64) -> f64 {
    let (min, max) = mass_log_bounds();
    (rel_mass.max(1e-9).log10() - min) / (max - min)
}

/// Port of `is_sect_diurnal`: 6 <= hour < 18.
pub fn is_sect_diurnal(dt: NaiveDateTime) -> bool {
    (6..18).contains(&dt.hour())
}

fn sect_element(planet: &str, diurnal: bool) -> &'static str {
    match planetary_sect_elements(planet) {
        Some((d, n)) => {
            if diurnal {
                d
            } else {
                n
            }
        }
        None => "Air",
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct Esms {
    pub spirit: f64,
    pub essence: f64,
    pub matter: f64,
    pub substance: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElementalProperties {
    pub fire: f64,
    pub water: f64,
    pub earth: f64,
    pub air: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermodynamicProperties {
    pub heat: f64,
    pub entropy: f64,
    pub reactivity: f64,
    pub gregs_energy: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemizeMetadata {
    pub source: String,
    pub dominant_element: String,
    pub dominant_modality: String,
    pub sun_sign: String,
    pub chart_ruler: String,
    pub is_diurnal: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PerPlanet {
    pub esms: Esms,
    pub elements: ElementalProperties,
    pub sign: String,
    pub sign_element: String,
    pub sect_element: String,
    pub alchm_weight: f64,
    pub dignity_multiplier: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemizeResult {
    pub elemental_properties: ElementalProperties,
    pub thermodynamic_properties: ThermodynamicProperties,
    pub esms: Esms,
    pub planetary_momentum: IndexMap<String, f64>,
    pub kalchm: f64,
    pub monica: f64,
    pub score: f64,
    pub normalized: bool,
    pub confidence: f64,
    pub metadata: AlchemizeMetadata,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub per_planet: Option<IndexMap<String, PerPlanet>>,
}

const SIGN_WEIGHT: f64 = 0.6;
const SECT_WEIGHT: f64 = 0.4;

fn safe_pow_x_x(x: f64) -> f64 {
    if x <= 0.0 { 1.0 } else { x.powf(x) }
}

/// Add `amount` to the element accumulator named by `element`.
fn add_element(
    element: &str,
    amount: f64,
    fire: &mut f64,
    water: &mut f64,
    air: &mut f64,
    earth: &mut f64,
) {
    match element {
        "Fire" => *fire += amount,
        "Water" => *water += amount,
        "Air" => *air += amount,
        "Earth" => *earth += amount,
        _ => {}
    }
}

/// Port of `utils.py:alchemize`. `current` and `historical` are ordered slices
/// produced by `ensure_from_*`.
pub fn alchemize(
    current: &[(String, PositionInput)],
    historical: Option<&[(String, PositionInput)]>,
    dt: NaiveDateTime,
) -> AlchemizeResult {
    let (mut spirit, mut essence, mut matter, mut substance) = (0.0, 0.0, 0.0, 0.0);
    let (mut fire, mut water, mut air, mut earth) = (0.0, 0.0, 0.0, 0.0);

    let diurnal = is_sect_diurnal(dt);
    let mut momentum: IndexMap<String, f64> = IndexMap::new();

    for (planet, position) in current {
        let sign = &position.sign;
        let period = planet_alchm_period(planet);
        let alchm_weight = if planet == "Ascendant" {
            1.0
        } else {
            normalize_alchm_weight(period)
        };

        if let Some(a) = planetary_alchemy(planet) {
            let dignity = planetary_dignity(planet, sign);
            let dignity_multiplier = (1.0 + dignity as f64 * 0.15).max(0.5);
            spirit += a[0] * dignity_multiplier * alchm_weight;
            essence += a[1] * dignity_multiplier * alchm_weight;
            matter += a[2] * dignity_multiplier * alchm_weight;
            substance += a[3] * dignity_multiplier * alchm_weight;
        }

        let sign_el = zodiac_element(sign);
        let sect_el = sect_element(planet, diurnal);
        add_element(
            sign_el,
            SIGN_WEIGHT,
            &mut fire,
            &mut water,
            &mut air,
            &mut earth,
        );
        add_element(
            sect_el,
            SECT_WEIGHT,
            &mut fire,
            &mut water,
            &mut air,
            &mut earth,
        );

        // Momentum vs. historical position (delta wrapped to [-180, 180]).
        let hist_entry = historical.and_then(|h| h.iter().find(|(p, _)| p == planet));
        if let Some((_, h_pos)) = hist_entry {
            let curr_long = position.exact_longitude;
            let hist_long = h_pos.exact_longitude;
            let mut delta = curr_long - hist_long;
            if delta > 180.0 {
                delta -= 360.0;
            } else if delta < -180.0 {
                delta += 360.0;
            }
            momentum.insert(planet.clone(), delta * alchm_weight);
        } else {
            momentum.insert(planet.clone(), 0.0);
        }
    }

    // Thermodynamics — `den or 1.0` becomes "use 1.0 when den == 0".
    let or1 = |x: f64| if x == 0.0 { 1.0 } else { x };

    let heat_num = spirit.powi(2) + fire.powi(2);
    let heat_den = (substance + essence + matter + water + air + earth).powi(2);
    let heat = heat_num / or1(heat_den);

    let entropy_num = spirit.powi(2) + substance.powi(2) + fire.powi(2) + air.powi(2);
    let entropy_den = (essence + matter + earth + water).powi(2);
    let entropy = entropy_num / or1(entropy_den);

    let reactivity_num = spirit.powi(2)
        + substance.powi(2)
        + essence.powi(2)
        + fire.powi(2)
        + air.powi(2)
        + water.powi(2);
    let reactivity = (reactivity_num / or1(matter)) + earth.powi(2);

    let gregs_energy = heat - entropy * reactivity;

    let kalchm_num = safe_pow_x_x(spirit) * safe_pow_x_x(essence);
    let kalchm_den = safe_pow_x_x(matter) * safe_pow_x_x(substance);
    let kalchm = kalchm_num / or1(kalchm_den);

    let mut monica = 1.0;
    if kalchm > 0.0 && kalchm.is_finite() {
        let lnk = kalchm.ln();
        if lnk != 0.0 && reactivity != 0.0 {
            monica = -gregs_energy / (reactivity * lnk);
        }
    }

    let total_elements = fire + water + air + earth;
    let denom = 1.0_f64.max(total_elements);
    let elemental_properties = ElementalProperties {
        fire: fire / denom,
        water: water / denom,
        earth: earth / denom,
        air: air / denom,
    };

    // Dominant element: max by value, ties broken by Fire, Water, Air, Earth order.
    let dominant_element = {
        let candidates = [
            ("Fire", fire),
            ("Water", water),
            ("Air", air),
            ("Earth", earth),
        ];
        let mut best = candidates[0];
        for &c in &candidates[1..] {
            if c.1 > best.1 {
                best = c;
            }
        }
        best.0.to_string()
    };

    let sum_totals = spirit + essence + matter + substance + fire + water + air + earth;
    let score = (sum_totals / 20.0).clamp(0.0, 1.0);

    let sun_sign = current
        .iter()
        .find(|(p, _)| p == "Sun")
        .map(|(_, p)| p.sign.clone())
        .unwrap_or_default();
    let chart_ruler = zodiac_element(&sun_sign).to_string();

    AlchemizeResult {
        elemental_properties,
        thermodynamic_properties: ThermodynamicProperties {
            heat,
            entropy,
            reactivity,
            gregs_energy,
        },
        esms: Esms {
            spirit,
            essence,
            matter,
            substance,
        },
        planetary_momentum: momentum,
        kalchm,
        monica,
        score,
        normalized: true,
        confidence: 0.8,
        metadata: AlchemizeMetadata {
            source: "alchemize".to_string(),
            dominant_element,
            dominant_modality: "Cardinal".to_string(),
            sun_sign,
            chart_ruler,
            is_diurnal: diurnal,
        },
        per_planet: None,
    }
}

/// Port of `utils.py:alchemize_detailed`: `alchemize` plus a per-planet breakdown.
pub fn alchemize_detailed(
    current: &[(String, PositionInput)],
    historical: Option<&[(String, PositionInput)]>,
    dt: NaiveDateTime,
) -> AlchemizeResult {
    let mut res = alchemize(current, historical, dt);
    let diurnal = is_sect_diurnal(dt);

    let mut per_planet: IndexMap<String, PerPlanet> = IndexMap::new();
    for (planet, position) in current {
        let sign = &position.sign;
        let period = planet_alchm_period(planet);
        let alchm_weight = if planet == "Ascendant" {
            1.0
        } else {
            normalize_alchm_weight(period)
        };

        let alchemy = planetary_alchemy(planet);
        let dignity = planetary_dignity(planet, sign);
        let dignity_multiplier = if alchemy.is_some() {
            (1.0 + dignity as f64 * 0.15).max(0.5)
        } else {
            1.0
        };

        let mut esms = Esms {
            spirit: 0.0,
            essence: 0.0,
            matter: 0.0,
            substance: 0.0,
        };
        if let Some(a) = alchemy {
            esms.spirit = a[0] * dignity_multiplier * alchm_weight;
            esms.essence = a[1] * dignity_multiplier * alchm_weight;
            esms.matter = a[2] * dignity_multiplier * alchm_weight;
            esms.substance = a[3] * dignity_multiplier * alchm_weight;
        }

        let sign_el = zodiac_element(sign);
        let sect_el = sect_element(planet, diurnal);
        let mut elements = ElementalProperties {
            fire: 0.0,
            water: 0.0,
            earth: 0.0,
            air: 0.0,
        };
        add_element(
            sign_el,
            SIGN_WEIGHT,
            &mut elements.fire,
            &mut elements.water,
            &mut elements.air,
            &mut elements.earth,
        );
        add_element(
            sect_el,
            SECT_WEIGHT,
            &mut elements.fire,
            &mut elements.water,
            &mut elements.air,
            &mut elements.earth,
        );

        per_planet.insert(
            planet.clone(),
            PerPlanet {
                esms,
                elements,
                sign: sign.clone(),
                sign_element: sign_el.to_string(),
                sect_element: sect_el.to_string(),
                alchm_weight,
                dignity_multiplier,
            },
        );
    }

    res.per_planet = Some(per_planet);
    res
}

/// Totals produced by `aggregate_alchemical_properties`. Element lookups are by name.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct AggregateTotals {
    pub spirit: f64,
    pub essence: f64,
    pub matter: f64,
    pub substance: f64,
    pub fire: f64,
    pub water: f64,
    pub air: f64,
    pub earth: f64,
}

impl AggregateTotals {
    fn add_element(&mut self, element: &str, amount: f64) {
        match element {
            "Fire" => self.fire += amount,
            "Water" => self.water += amount,
            "Air" => self.air += amount,
            "Earth" => self.earth += amount,
            _ => {}
        }
    }
    pub fn element(&self, element: &str) -> f64 {
        match element {
            "Fire" => self.fire,
            "Water" => self.water,
            "Air" => self.air,
            "Earth" => self.earth,
            _ => 0.0,
        }
    }
}

/// Port of `aggregate_alchemical_properties`. Skips the Ascendant (absent from
/// the Python `base_alchemy` table).
pub fn aggregate_alchemical_properties(current: &[(String, PositionInput)]) -> AggregateTotals {
    let mut t = AggregateTotals {
        spirit: 0.0,
        essence: 0.0,
        matter: 0.0,
        substance: 0.0,
        fire: 0.0,
        water: 0.0,
        air: 0.0,
        earth: 0.0,
    };
    for (planet, position) in current {
        if planet == "Ascendant" {
            continue;
        }
        let Some(a) = planetary_alchemy(planet) else {
            continue;
        };
        let w = normalize_planet_weight(planet_weight(planet));
        t.spirit += a[0] * w;
        t.essence += a[1] * w;
        t.matter += a[2] * w;
        t.substance += a[3] * w;
        let sign_el = zodiac_element(&position.sign);
        t.add_element(sign_el, w);
    }
    t
}

/// Port of `get_planetary_modifiers`.
#[derive(Debug, Clone, Copy)]
pub struct PlanetaryModifiers {
    pub velocity: f64,
    pub inertia: f64,
    pub current: f64,
    pub force: f64,
}

pub fn get_planetary_modifiers(planet: &str) -> PlanetaryModifiers {
    let w = normalize_planet_weight(planet_weight(planet));
    PlanetaryModifiers {
        velocity: 1.0 + w * 0.15,
        inertia: 1.0 + w * 0.20,
        current: 1.0 + w * 0.15,
        force: 1.0 + w * 0.25,
    }
}
