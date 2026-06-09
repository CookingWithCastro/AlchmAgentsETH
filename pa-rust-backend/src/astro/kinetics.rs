//! Kinetic field model. Port of `utils.py:determine_aspect_phase` and
//! `calculate_kinetics`.

use super::alchemy::{
    AggregateTotals, AlchemizeResult, PositionInput, aggregate_alchemical_properties, alchemize,
    get_planetary_modifiers,
};
use chrono::NaiveDateTime;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElementVec {
    pub fire: f64,
    pub water: f64,
    pub earth: f64,
    pub air: f64,
}

impl ElementVec {
    fn zero() -> Self {
        ElementVec {
            fire: 0.0,
            water: 0.0,
            earth: 0.0,
            air: 0.0,
        }
    }
    fn get(&self, e: &str) -> f64 {
        match e {
            "Fire" => self.fire,
            "Water" => self.water,
            "Earth" => self.earth,
            "Air" => self.air,
            _ => 0.0,
        }
    }
    fn set(&mut self, e: &str, v: f64) {
        match e {
            "Fire" => self.fire = v,
            "Water" => self.water = v,
            "Earth" => self.earth = v,
            "Air" => self.air = v,
            _ => {}
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AspectPhase {
    #[serde(rename = "type")]
    pub phase_type: String,
    pub description: String,
    #[serde(rename = "velocityBoost", skip_serializing_if = "Option::is_none")]
    pub velocity_boost: Option<f64>,
    #[serde(rename = "powerBoost", skip_serializing_if = "Option::is_none")]
    pub power_boost: Option<f64>,
}

/// Port of `determine_aspect_phase`.
pub fn determine_aspect_phase(
    current: &AlchemizeResult,
    previous: Option<&AlchemizeResult>,
) -> Option<AspectPhase> {
    let previous = previous?;
    let c = &current.thermodynamic_properties;
    let p = &previous.thermodynamic_properties;
    let current_power = c.heat - c.entropy * c.reactivity;
    let previous_power = p.heat - p.entropy * p.reactivity;
    let power_change = current_power - previous_power;

    if power_change.abs() < 0.01 {
        Some(AspectPhase {
            phase_type: "exact".to_string(),
            description: "Peak energy - maximum transformation potential".to_string(),
            velocity_boost: None,
            power_boost: Some(0.25),
        })
    } else if power_change > 0.0 {
        Some(AspectPhase {
            phase_type: "applying".to_string(),
            description: "Building energy - enhanced creativity".to_string(),
            velocity_boost: Some(0.15),
            power_boost: Some(0.25),
        })
    } else {
        Some(AspectPhase {
            phase_type: "separating".to_string(),
            description: "Releasing energy - stabilization and integration".to_string(),
            velocity_boost: None,
            power_boost: None,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KineticsResult {
    pub velocity: ElementVec,
    pub momentum: ElementVec,
    pub charge: f64,
    pub potential_difference: f64,
    pub current_flow: f64,
    pub power: f64,
    pub inertia: f64,
    pub force: ElementVec,
    pub force_magnitude: f64,
    pub force_classification: String,
    pub aspect_phase: Option<AspectPhase>,
    pub thermal_direction: String,
}

/// Port of `utils.py:calculate_kinetics`.
pub fn calculate_kinetics(
    current: &[(String, PositionInput)],
    previous: Option<&[(String, PositionInput)]>,
    time_interval: f64,
    current_planet: &str,
    previous_momentum: Option<&ElementVec>,
    dt: NaiveDateTime,
) -> KineticsResult {
    let current_thermo = alchemize(current, previous, dt);
    let previous_thermo = previous.map(|p| alchemize(p, None, dt));

    let current_heat = current_thermo.thermodynamic_properties.heat;
    let previous_heat = previous_thermo
        .as_ref()
        .map(|t| t.thermodynamic_properties.heat)
        .unwrap_or(current_heat);
    let reactivity = current_thermo.thermodynamic_properties.reactivity;
    let gregs_energy = current_thermo.thermodynamic_properties.gregs_energy;
    let monica = current_thermo.monica;

    let current_totals = aggregate_alchemical_properties(current);
    let previous_totals = match previous {
        Some(p) => aggregate_alchemical_properties(p),
        None => AggregateTotals {
            spirit: 0.0,
            essence: 0.0,
            matter: 0.0,
            substance: 0.0,
            fire: 0.0,
            water: 0.0,
            air: 0.0,
            earth: 0.0,
        },
    };

    let modifiers = get_planetary_modifiers(current_planet);

    let charge = current_totals.matter + current_totals.substance;
    let previous_charge = previous_totals.matter + previous_totals.substance;

    let mut velocity = ElementVec::zero();
    for el in ["Fire", "Water", "Earth", "Air"] {
        let c_val = current_totals.element(el);
        let p_val = previous_totals.element(el);
        let v = if time_interval > 0.0 {
            ((c_val - p_val) / time_interval) * modifiers.velocity
        } else {
            0.0
        };
        velocity.set(el, v);
    }

    let inertia = (current_totals.matter + current_totals.earth + current_totals.substance / 2.0)
        .max(1.0)
        * modifiers.inertia;

    let mut momentum = ElementVec::zero();
    for el in ["Fire", "Water", "Earth", "Air"] {
        momentum.set(el, inertia * velocity.get(el));
    }

    let potential_difference = if charge > 0.0 {
        gregs_energy / charge
    } else {
        0.0
    };

    let charge_velocity = if time_interval > 0.0 {
        (charge - previous_charge) / time_interval
    } else {
        0.0
    };
    let current_flow = reactivity * charge_velocity * modifiers.current;

    let mut force = ElementVec::zero();
    let mut force_magnitude = 0.0;
    for el in ["Fire", "Water", "Earth", "Air"] {
        let curr_mom = momentum.get(el);
        let prev_mom = previous_momentum.map(|m| m.get(el)).unwrap_or(0.0);
        let kinetic_force = if time_interval > 0.0 {
            (curr_mom - prev_mom) / time_interval
        } else {
            0.0
        };
        let electromagnetic_force = charge * (potential_difference + velocity.get(el) * monica);
        let f = ((kinetic_force + electromagnetic_force) / 2.0) * modifiers.force;
        force.set(el, f);
        force_magnitude += f.powi(2);
    }
    force_magnitude = force_magnitude.sqrt();

    let power = current_flow * potential_difference * (1.0 + force_magnitude / 10.0);

    let force_classification = if force_magnitude > 5.0 {
        "accelerating"
    } else if force_magnitude < -5.0 {
        "decelerating"
    } else {
        "balanced"
    }
    .to_string();

    let aspect_phase = determine_aspect_phase(&current_thermo, previous_thermo.as_ref());

    let heat_rate = if time_interval > 0.0 {
        (current_heat - previous_heat) / time_interval
    } else {
        0.0
    };
    let thermal_direction = if heat_rate > 0.001 {
        "heating"
    } else if heat_rate < -0.001 {
        "cooling"
    } else {
        "stable"
    }
    .to_string();

    KineticsResult {
        velocity,
        momentum,
        charge,
        potential_difference,
        current_flow,
        power,
        inertia,
        force,
        force_magnitude,
        force_classification,
        aspect_phase,
        thermal_direction,
    }
}
