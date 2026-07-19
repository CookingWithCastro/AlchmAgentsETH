from typing import Dict, Any, Optional
import math
from datetime import datetime

PLANET_ALCHM_PERIODS = {
    'Pluto': 247.94,
    'Neptune': 164.79,
    'Uranus': 84.01,
    'Saturn': 29.46,
    'Jupiter': 11.86,
    'Mars': 1.88,
    'Sun': 1.0,
    'Venus': 0.615,
    'Mercury': 0.241,
    'Moon': 0.075,
    'Ascendant': 0.003,
}

PERIOD_LOG_MIN = math.log10(0.003)
PERIOD_LOG_MAX = math.log10(247.94)

def normalize_alchm_weight(period_years: float) -> float:
    return (
        (math.log10(max(period_years, 1e-9)) - PERIOD_LOG_MIN) /
        (PERIOD_LOG_MAX - PERIOD_LOG_MIN)
    )

PLANET_WEIGHTS = {
    'Sun': 333000,
    'Moon': 0.0123,
    'Mercury': 0.055,
    'Venus': 0.815,
    'Mars': 0.107,
    'Jupiter': 317.8,
    'Saturn': 95.2,
    'Uranus': 14.5,
    'Neptune': 17.1,
    'Pluto': 0.0022,
}

MASS_LOG_MIN = math.log10(0.0022)
MASS_LOG_MAX = math.log10(333000)

def normalize_planet_weight(rel_mass: float) -> float:
    return (
        (math.log10(max(rel_mass, 1e-9)) - MASS_LOG_MIN) /
        (MASS_LOG_MAX - MASS_LOG_MIN)
    )

PLANETARY_SECTARIAN_ELEMENTS = {
    'Sun':     {'diurnal': 'Fire',  'nocturnal': 'Fire'},
    'Moon':    {'diurnal': 'Water', 'nocturnal': 'Water'},
    'Mercury': {'diurnal': 'Air',   'nocturnal': 'Earth'},
    'Venus':   {'diurnal': 'Water', 'nocturnal': 'Earth'},
    'Mars':    {'diurnal': 'Fire',  'nocturnal': 'Water'},
    'Jupiter': {'diurnal': 'Air',   'nocturnal': 'Fire'},
    'Saturn':  {'diurnal': 'Air',   'nocturnal': 'Earth'},
    'Uranus':  {'diurnal': 'Water', 'nocturnal': 'Air'},
    'Neptune': {'diurnal': 'Water', 'nocturnal': 'Water'},
    'Pluto':   {'diurnal': 'Earth', 'nocturnal': 'Water'},
}

def ensure_planetary_positions_dict(positions: Any) -> Dict[str, Dict[str, Any]]:
    res = {}
    if not positions:
        return res
    for planet, val in positions.items():
        if isinstance(val, str):
            res[planet] = {"sign": val, "degree": 0, "minute": 0, "exactLongitude": 0.0}
        elif isinstance(val, dict):
            res[planet] = {
                "sign": val.get("sign", "Aries"),
                "degree": val.get("degree", 0),
                "minute": val.get("minute", 0),
                "exactLongitude": val.get("exactLongitude", 0.0)
            }
    return res

def is_sect_diurnal(dt: datetime) -> bool:
    return 6 <= dt.hour < 18

def get_zodiac_element(sign: str) -> str:
    sign_lower = sign.lower()
    element_map = {
        "aries": "Fire",
        "taurus": "Earth",
        "gemini": "Air",
        "cancer": "Water",
        "leo": "Fire",
        "virgo": "Earth",
        "libra": "Air",
        "scorpio": "Water",
        "sagittarius": "Fire",
        "capricorn": "Earth",
        "aquarius": "Air",
        "pisces": "Water",
    }
    return element_map.get(sign_lower, "Air")

def get_planetary_sect_element(planet: str, diurnal: bool) -> str:
    entry = PLANETARY_SECTARIAN_ELEMENTS.get(planet)
    if not entry:
        return "Air"
    return entry["diurnal"] if diurnal else entry["nocturnal"]

def get_planetary_dignity(planet: str, sign: str) -> int:
    dignity_map = {
        "Sun": {
            "leo": 1,
            "aries": 2,
            "aquarius": -1,
            "libra": -2,
        },
        "Moon": {
            "cancer": 1,
            "taurus": 2,
            "capricorn": -1,
            "scorpio": -2,
        },
        "Mercury": {
            "gemini": 1,
            "virgo": 3,
            "sagittarius": 1,
            "pisces": -3,
        },
        "Venus": {
            "libra": 1,
            "taurus": 1,
            "pisces": 2,
            "aries": -1,
            "scorpio": -1,
            "virgo": -2,
        },
        "Mars": {
            "aries": 1,
            "scorpio": 1,
            "capricorn": 2,
            "taurus": -1,
            "libra": -1,
            "cancer": -2,
        },
        "Jupiter": {
            "pisces": 1,
            "sagittarius": 1,
            "cancer": 2,
            "gemini": -1,
            "virgo": -1,
            "capricorn": -2,
        },
        "Saturn": {
            "aquarius": 1,
            "capricorn": 1,
            "libra": 2,
            "cancer": -1,
            "leo": -1,
            "aries": -2,
        },
        "Uranus": {
            "aquarius": 1,
            "scorpio": 2,
            "taurus": -3,
        },
        "Neptune": {
            "pisces": 1,
            "cancer": 2,
            "virgo": -1,
            "capricorn": -2,
        },
        "Pluto": {
            "scorpio": 1,
            "leo": 2,
            "taurus": -1,
            "aquarius": -2,
        },
    }
    planet_map = dignity_map.get(planet)
    if not planet_map:
        return 0
    return planet_map.get(sign.lower(), 0)

def alchemize(
    planetary_positions: Dict[str, Any],
    historical_positions: Optional[Dict[str, Any]] = None,
    dt: Optional[datetime] = None
) -> Dict[str, Any]:
    if dt is None:
        dt = datetime.utcnow()
        
    current_pos = ensure_planetary_positions_dict(planetary_positions)
    hist_pos = ensure_planetary_positions_dict(historical_positions) if historical_positions else None
        
    totals = {
        "Spirit": 0.0,
        "Essence": 0.0,
        "Matter": 0.0,
        "Substance": 0.0,
        "Fire": 0.0,
        "Water": 0.0,
        "Air": 0.0,
        "Earth": 0.0,
    }
    
    planetary_alchemy = {
        "Sun": {"Spirit": 1, "Essence": 0, "Matter": 0, "Substance": 0},
        "Moon": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Mercury": {"Spirit": 1, "Essence": 0, "Matter": 0, "Substance": 1},
        "Venus": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Mars": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Jupiter": {"Spirit": 1, "Essence": 1, "Matter": 0, "Substance": 0},
        "Saturn": {"Spirit": 1, "Essence": 0, "Matter": 1, "Substance": 0},
        "Uranus": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Neptune": {"Spirit": 0, "Essence": 1, "Matter": 0, "Substance": 1},
        "Pluto": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Ascendant": {"Spirit": 1, "Essence": 1, "Matter": 1, "Substance": 1},
    }
    
    diurnal = is_sect_diurnal(dt)
    planetary_momentum = {}
    
    SIGN_WEIGHT = 0.6
    SECT_WEIGHT = 0.4
    
    for planet, position in current_pos.items():
        sign = position.get("sign", "Aries")
        period = PLANET_ALCHM_PERIODS.get(planet, 1.0)
        alchm_weight = 1.0 if planet == "Ascendant" else normalize_alchm_weight(period)
        
        alchemy = planetary_alchemy.get(planet)
        if alchemy:
            dignity = get_planetary_dignity(planet, sign)
            dignity_multiplier = max(0.5, 1.0 + dignity * 0.15)
            totals["Spirit"] += alchemy["Spirit"] * dignity_multiplier * alchm_weight
            totals["Essence"] += alchemy["Essence"] * dignity_multiplier * alchm_weight
            totals["Matter"] += alchemy["Matter"] * dignity_multiplier * alchm_weight
            totals["Substance"] += alchemy["Substance"] * dignity_multiplier * alchm_weight
            
        sign_element = get_zodiac_element(sign)
        sect_element = get_planetary_sect_element(planet, diurnal)
        
        if sign_element == "Fire": totals["Fire"] += SIGN_WEIGHT
        elif sign_element == "Water": totals["Water"] += SIGN_WEIGHT
        elif sign_element == "Air": totals["Air"] += SIGN_WEIGHT
        elif sign_element == "Earth": totals["Earth"] += SIGN_WEIGHT
        
        if sect_element == "Fire": totals["Fire"] += SECT_WEIGHT
        elif sect_element == "Water": totals["Water"] += SECT_WEIGHT
        elif sect_element == "Air": totals["Air"] += SECT_WEIGHT
        elif sect_element == "Earth": totals["Earth"] += SECT_WEIGHT
        
        # Momentum
        if hist_pos and planet in hist_pos:
            h_pos = hist_pos[planet]
            curr_long = position.get("exactLongitude")
            if curr_long is None:
                curr_long = float(position.get("degree", 0)) + float(position.get("minute", 0)) / 60.0
            hist_long = h_pos.get("exactLongitude")
            if hist_long is None:
                hist_long = float(h_pos.get("degree", 0)) + float(h_pos.get("minute", 0)) / 60.0
                
            delta = curr_long - hist_long
            if delta > 180:
                delta -= 360
            elif delta < -180:
                delta += 360
                
            planetary_momentum[planet] = delta * alchm_weight
        else:
            planetary_momentum[planet] = 0.0
            
    Spirit = totals["Spirit"]
    Essence = totals["Essence"]
    Matter = totals["Matter"]
    Substance = totals["Substance"]
    Fire = totals["Fire"]
    Water = totals["Water"]
    Air = totals["Air"]
    Earth = totals["Earth"]
    
    # Heat
    heat_num = Spirit ** 2 + Fire ** 2
    heat_den = (Substance + Essence + Matter + Water + Air + Earth) ** 2
    heat = heat_num / (heat_den or 1.0)
    
    # Entropy
    entropy_num = Spirit ** 2 + Substance ** 2 + Fire ** 2 + Air ** 2
    entropy_den = (Essence + Matter + Earth + Water) ** 2
    entropy = entropy_num / (entropy_den or 1.0)
    
    # Reactivity
    reactivity_num = Spirit ** 2 + Substance ** 2 + Essence ** 2 + Fire ** 2 + Air ** 2 + Water ** 2
    reactivity = (reactivity_num / (Matter or 1.0)) + Earth ** 2
    
    # Greg's Energy
    gregs_energy = heat - entropy * reactivity
    
    # Kalchm
    def safe_pow_x_x(x: float) -> float:
        if x <= 0.0:
            return 1.0
        return x ** x
        
    kalchm_num = safe_pow_x_x(Spirit) * safe_pow_x_x(Essence)
    kalchm_den = safe_pow_x_x(Matter) * safe_pow_x_x(Substance)
    kalchm = kalchm_num / (kalchm_den or 1.0)
    
    # Monica
    monica = 1.0
    if kalchm > 0 and math.isfinite(kalchm):
        lnk = math.log(kalchm)
        if lnk != 0.0 and reactivity != 0.0:
            monica = -gregs_energy / (reactivity * lnk)
            
    total_elements = Fire + Water + Air + Earth
    elemental_properties = {
        "Fire": Fire / max(1.0, total_elements),
        "Water": Water / max(1.0, total_elements),
        "Earth": Earth / max(1.0, total_elements),
        "Air": Air / max(1.0, total_elements),
    }
    
    elements_map = {"Fire": Fire, "Water": Water, "Air": Air, "Earth": Earth}
    dominant_element = max(elements_map, key=elements_map.get)
    
    sum_totals = Spirit + Essence + Matter + Substance + Fire + Water + Air + Earth
    score = min(1.0, max(0.0, sum_totals / 20.0))
    
    sun_sign = current_pos.get("Sun", {}).get("sign", "")
    
    return {
        "elementalProperties": elemental_properties,
        "thermodynamicProperties": {
            "heat": heat,
            "entropy": entropy,
            "reactivity": reactivity,
            "gregsEnergy": gregs_energy,
        },
        "esms": {"Spirit": Spirit, "Essence": Essence, "Matter": Matter, "Substance": Substance},
        "planetaryMomentum": planetary_momentum,
        "kalchm": kalchm,
        "monica": monica,
        "score": score,
        "normalized": True,
        "confidence": 0.8,
        "metadata": {
            "source": "alchemize",
            "dominantElement": dominant_element,
            "dominantModality": "Cardinal",
            "sunSign": sun_sign,
            "chartRuler": get_zodiac_element(sun_sign),
            "isDiurnal": diurnal,
        },
    }

def alchemize_detailed(
    planetary_positions: Dict[str, Any],
    historical_positions: Optional[Dict[str, Any]] = None,
    dt: Optional[datetime] = None
) -> Dict[str, Any]:
    res = alchemize(planetary_positions, historical_positions, dt)
    
    current_pos = ensure_planetary_positions_dict(planetary_positions)
    diurnal = is_sect_diurnal(dt or datetime.utcnow())
    per_planet = {}
    
    planetary_alchemy = {
        "Sun": {"Spirit": 1, "Essence": 0, "Matter": 0, "Substance": 0},
        "Moon": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Mercury": {"Spirit": 1, "Essence": 0, "Matter": 0, "Substance": 1},
        "Venus": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Mars": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Jupiter": {"Spirit": 1, "Essence": 1, "Matter": 0, "Substance": 0},
        "Saturn": {"Spirit": 1, "Essence": 0, "Matter": 1, "Substance": 0},
        "Uranus": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Neptune": {"Spirit": 0, "Essence": 1, "Matter": 0, "Substance": 1},
        "Pluto": {"Spirit": 0, "Essence": 1, "Matter": 1, "Substance": 0},
        "Ascendant": {"Spirit": 1, "Essence": 1, "Matter": 1, "Substance": 1},
    }
    
    SIGN_WEIGHT = 0.6
    SECT_WEIGHT = 0.4
    
    for planet, position in current_pos.items():
        sign = position.get("sign", "Aries")
        period = PLANET_ALCHM_PERIODS.get(planet, 1.0)
        alchm_weight = 1.0 if planet == "Ascendant" else normalize_alchm_weight(period)
        
        alchemy = planetary_alchemy.get(planet)
        dignity = get_planetary_dignity(planet, sign)
        dignity_multiplier = max(0.5, 1.0 + dignity * 0.15) if alchemy else 1.0
        
        planet_esms = {"Spirit": 0.0, "Essence": 0.0, "Matter": 0.0, "Substance": 0.0}
        if alchemy:
            planet_esms["Spirit"] = alchemy["Spirit"] * dignity_multiplier * alchm_weight
            planet_esms["Essence"] = alchemy["Essence"] * dignity_multiplier * alchm_weight
            planet_esms["Matter"] = alchemy["Matter"] * dignity_multiplier * alchm_weight
            planet_esms["Substance"] = alchemy["Substance"] * dignity_multiplier * alchm_weight
            
        sign_element = get_zodiac_element(sign)
        sect_element = get_planetary_sect_element(planet, diurnal)
        
        planet_elements = {"Fire": 0.0, "Water": 0.0, "Earth": 0.0, "Air": 0.0}
        planet_elements[sign_element] += SIGN_WEIGHT
        planet_elements[sect_element] += SECT_WEIGHT
        
        per_planet[planet] = {
            "esms": planet_esms,
            "elements": planet_elements,
            "sign": sign,
            "signElement": sign_element,
            "sectElement": sect_element,
            "alchmWeight": alchm_weight,
            "dignityMultiplier": dignity_multiplier
        }
        
    res["perPlanet"] = per_planet
    return res

def calculate_aspects(positions: Dict[str, Any]) -> Dict[str, Any]:
    pos_dict = ensure_planetary_positions_dict(positions)
    signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
    
    def get_longitude(pos: Dict[str, Any]) -> float:
        if not pos or "sign" not in pos:
            return 0.0
        sign_str = str(pos["sign"]).lower()
        if sign_str not in signs:
            return 0.0
        return signs.index(sign_str) * 30.0 + float(pos.get("degree", 0))

    aspect_definitions = {
        "conjunction": {"maxOrb": 8, "angle": 0},
        "opposition": {"maxOrb": 8, "angle": 180},
        "trine": {"maxOrb": 8, "angle": 120},
        "square": {"maxOrb": 7, "angle": 90},
        "sextile": {"maxOrb": 4, "angle": 60},
        "quincunx": {"maxOrb": 3, "angle": 150},
        "inconjunct": {"maxOrb": 3, "angle": 150},
        "semi-sextile": {"maxOrb": 3, "angle": 30},
        "semisquare": {"maxOrb": 2, "angle": 45},
        "sesquisquare": {"maxOrb": 2, "angle": 135},
        "quintile": {"maxOrb": 2, "angle": 72},
        "biquintile": {"maxOrb": 2, "angle": 144},
    }

    aspects = []
    planets = list(pos_dict.keys())
    for i in range(len(planets)):
        for j in range(i + 1, len(planets)):
            p1 = planets[i]
            p2 = planets[j]
            pos1 = pos_dict[p1]
            pos2 = pos_dict[p2]
            
            long1 = get_longitude(pos1)
            long2 = get_longitude(pos2)
            
            diff = abs(long1 - long2)
            if diff > 180:
                diff = 360 - diff
                
            for aspect_type, defn in aspect_definitions.items():
                ideal_angle = defn["angle"]
                orb = abs(diff - ideal_angle)
                if orb <= defn["maxOrb"]:
                    strength = 1.0 - orb / defn["maxOrb"]
                    aspects.append({
                        "planet1": p1,
                        "planet2": p2,
                        "type": aspect_type,
                        "orb": orb,
                        "strength": strength
                    })
    return {"aspects": aspects}

def calculate_aspect_efficiency(positions: Dict[str, Any]) -> float:
    try:
        res = calculate_aspects(positions)
        aspects = res.get("aspects", [])
        if not aspects:
            return 0.5
        harmonious_types = {"trine", "sextile", "conjunction"}
        harmonious_count = sum(1 for a in aspects if a["type"] in harmonious_types)
        return harmonious_count / len(aspects)
    except Exception:
        return 0.5

def aggregate_alchemical_properties(planetary_positions: Dict[str, Any]) -> Dict[str, float]:
    totals = {
        'Spirit': 0.0,
        'Essence': 0.0,
        'Matter': 0.0,
        'Substance': 0.0,
        'Fire': 0.0,
        'Water': 0.0,
        'Air': 0.0,
        'Earth': 0.0,
    }
    
    base_alchemy = {
        'Sun': {'Spirit': 1.0, 'Essence': 0.0, 'Matter': 0.0, 'Substance': 0.0},
        'Moon': {'Spirit': 0.0, 'Essence': 1.0, 'Matter': 1.0, 'Substance': 0.0},
        'Mercury': {'Spirit': 1.0, 'Essence': 0.0, 'Matter': 0.0, 'Substance': 1.0},
        'Venus': {'Spirit': 0.0, 'Essence': 1.0, 'Matter': 1.0, 'Substance': 0.0},
        'Mars': {'Spirit': 0.0, 'Essence': 1.0, 'Matter': 1.0, 'Substance': 0.0},
        'Jupiter': {'Spirit': 1.0, 'Essence': 1.0, 'Matter': 0.0, 'Substance': 0.0},
        'Saturn': {'Spirit': 1.0, 'Essence': 0.0, 'Matter': 1.0, 'Substance': 0.0},
        'Uranus': {'Spirit': 0.0, 'Essence': 1.0, 'Matter': 1.0, 'Substance': 0.0},
        'Neptune': {'Spirit': 0.0, 'Essence': 1.0, 'Matter': 0.0, 'Substance': 1.0},
        'Pluto': {'Spirit': 0.0, 'Essence': 1.0, 'Matter': 1.0, 'Substance': 0.0},
    }
    
    pos_dict = ensure_planetary_positions_dict(planetary_positions)
    for planet, val in pos_dict.items():
        sign = val.get("sign", "Aries")
        if planet not in base_alchemy:
            continue
        alchemy = base_alchemy[planet]
        
        rel_mass = PLANET_WEIGHTS.get(planet, 1.0)
        w = normalize_planet_weight(rel_mass)
        
        totals['Spirit'] += alchemy['Spirit'] * w
        totals['Essence'] += alchemy['Essence'] * w
        totals['Matter'] += alchemy['Matter'] * w
        totals['Substance'] += alchemy['Substance'] * w
        
        sign_element = get_zodiac_element(sign)
        if sign_element in totals:
            totals[sign_element] += w
            
    return totals

def get_planetary_modifiers(planet: str) -> Dict[str, float]:
    rel_mass = PLANET_WEIGHTS.get(planet, 1.0)
    w = normalize_planet_weight(rel_mass)
    return {
        "velocity": 1.0 + w * 0.15,
        "inertia": 1.0 + w * 0.20,
        "current": 1.0 + w * 0.15,
        "force": 1.0 + w * 0.25,
    }

def determine_aspect_phase(current_thermo: Dict[str, Any], previous_thermo: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not previous_thermo:
        return None
        
    c_heat = current_thermo["thermodynamicProperties"]["heat"]
    c_entropy = current_thermo["thermodynamicProperties"]["entropy"]
    c_reactivity = current_thermo["thermodynamicProperties"]["reactivity"]
    
    p_heat = previous_thermo["thermodynamicProperties"]["heat"]
    p_entropy = previous_thermo["thermodynamicProperties"]["entropy"]
    p_reactivity = previous_thermo["thermodynamicProperties"]["reactivity"]
    
    current_power = c_heat - c_entropy * c_reactivity
    previous_power = p_heat - p_entropy * p_reactivity
    
    power_change = current_power - previous_power
    
    if abs(power_change) < 0.01:
        return {
            "type": "exact",
            "description": "Peak energy - maximum transformation potential",
            "powerBoost": 0.25,
        }
    elif power_change > 0:
        return {
            "type": "applying",
            "description": "Building energy - enhanced creativity",
            "velocityBoost": 0.15,
            "powerBoost": 0.25,
        }
    else:
        return {
            "type": "separating",
            "description": "Releasing energy - stabilization and integration",
        }

def calculate_kinetics(
    current_planetary_positions: Dict[str, Any],
    previous_planetary_positions: Optional[Dict[str, Any]] = None,
    time_interval: float = 3600.0,
    current_planet: str = "Sun",
    previous_metrics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    current_pos_dict = ensure_planetary_positions_dict(current_planetary_positions)
    previous_pos_dict = ensure_planetary_positions_dict(previous_planetary_positions) if previous_planetary_positions else None
    
    current_thermo = alchemize(current_pos_dict, historical_positions=previous_pos_dict)
    previous_thermo = alchemize(previous_pos_dict) if previous_pos_dict else None
    
    current_heat = current_thermo["thermodynamicProperties"]["heat"]
    previous_heat = previous_thermo["thermodynamicProperties"]["heat"] if previous_thermo else current_heat
    reactivity = current_thermo["thermodynamicProperties"]["reactivity"]
    gregs_energy = current_thermo["thermodynamicProperties"]["gregsEnergy"]
    monica = current_thermo["monica"]
    
    current_totals = aggregate_alchemical_properties(current_planetary_positions)
    
    if previous_planetary_positions:
        previous_totals = aggregate_alchemical_properties(previous_planetary_positions)
    else:
        previous_totals = {
            'Spirit': 0.0, 'Essence': 0.0, 'Matter': 0.0, 'Substance': 0.0,
            'Fire': 0.0, 'Water': 0.0, 'Air': 0.0, 'Earth': 0.0
        }
        
    modifiers = get_planetary_modifiers(current_planet)
    
    charge = current_totals['Matter'] + current_totals['Substance']
    previous_charge = previous_totals['Matter'] + previous_totals['Substance']
    
    velocity = {'Fire': 0.0, 'Water': 0.0, 'Earth': 0.0, 'Air': 0.0}
    for element in velocity:
        c_val = current_totals.get(element, 0.0)
        p_val = previous_totals.get(element, 0.0)
        velocity[element] = (
            ((c_val - p_val) / time_interval) * modifiers["velocity"]
            if time_interval > 0 else 0.0
        )
        
    inertia = max(
        1.0,
        current_totals['Matter'] + current_totals['Earth'] + current_totals['Substance'] / 2.0
    ) * modifiers["inertia"]
    
    momentum = {'Fire': 0.0, 'Water': 0.0, 'Earth': 0.0, 'Air': 0.0}
    for element in momentum:
        momentum[element] = inertia * velocity[element]
        
    potential_difference = gregs_energy / charge if charge > 0 else 0.0
    
    charge_velocity = (charge - previous_charge) / time_interval if time_interval > 0 else 0.0
    current_flow = reactivity * charge_velocity * modifiers["current"]
    
    force = {'Fire': 0.0, 'Water': 0.0, 'Earth': 0.0, 'Air': 0.0}
    force_magnitude = 0.0
    
    for element in force:
        curr_mom = momentum[element]
        prev_mom = previous_metrics.get("momentum", {}).get(element, 0.0) if previous_metrics else 0.0
        
        kinetic_force = (curr_mom - prev_mom) / time_interval if time_interval > 0 else 0.0
        electromagnetic_force = charge * (potential_difference + velocity[element] * monica)
        
        force[element] = ((kinetic_force + electromagnetic_force) / 2.0) * modifiers["force"]
        force_magnitude += force[element] ** 2
        
    force_magnitude = math.sqrt(force_magnitude)
    
    power = current_flow * potential_difference * (1.0 + force_magnitude / 10.0)
    
    if force_magnitude > 5.0:
        force_classification = "accelerating"
    elif force_magnitude < -5.0:
        force_classification = "decelerating"
    else:
        force_classification = "balanced"
        
    aspect_phase = determine_aspect_phase(current_thermo, previous_thermo)
    
    heat_rate = (current_heat - previous_heat) / time_interval if time_interval > 0 else 0.0
    if heat_rate > 0.001:
        thermal_direction = "heating"
    elif heat_rate < -0.001:
        thermal_direction = "cooling"
    else:
        thermal_direction = "stable"
        
    return {
        "velocity": velocity,
        "momentum": momentum,
        "charge": charge,
        "potentialDifference": potential_difference,
        "currentFlow": current_flow,
        "power": power,
        "inertia": inertia,
        "force": force,
        "forceMagnitude": force_magnitude,
        "forceClassification": force_classification,
        "aspectPhase": aspect_phase,
        "thermalDirection": thermal_direction,
    }

from typing import Dict, Any


def calculate_monica_constant(spirit: float, essence: float, matter: float, substance: float) -> float:
    """
    Reverse engineered Monica Constant: MC = φ * (1 + E/T) * (1 + C/10)
    Wait, the TS code says: (spirit * phi + essence) / (matter + substance + 1)
    Let's stick to the TS implementation for consistency.
    """
    phi = 1.618033988749 # Golden ratio
    return (spirit * phi + essence) / (matter + substance + 1)

def get_consciousness_level(monica_constant: float) -> str:
    if monica_constant >= 6.0: return 'Transcendent'
    if monica_constant >= 5.5: return 'Illuminated'
    if monica_constant >= 4.5: return 'Advanced'
    if monica_constant >= 3.5: return 'Elevated'
    if monica_constant >= 2.5: return 'Active'
    if monica_constant >= 1.5: return 'Awakening'
    return 'Dormant'

def determine_historical_era(birth_year: int, agent_id: str) -> dict:
    agent_id_lower = agent_id.lower()
    
    # Handle Monica specially
    if agent_id_lower == 'monica-001':
        return {
            'era': 'monica_special',
            'culture': 'Consciousness Crafter',
            'geography': 'Interdimensional',
            'deathYear': None
        }

    # Determine era based on birth year
    if birth_year < 500:
        era = 'ancient'
        geography = 'Mediterranean/Classical World'
    elif birth_year < 1500:
        era = 'medieval'
        geography = 'Medieval Europe'
    elif birth_year < 1650:
        era = 'renaissance'
        geography = 'Renaissance Europe'
    elif birth_year < 1800:
        era = 'enlightenment'
        geography = 'Enlightenment Europe/Americas'
    else:
        era = 'modern_pre1950'
        geography = 'Modern World'
        
    return {
        'era': era,
        'culture': determine_culture(agent_id_lower, birth_year),
        'geography': geography,
        'deathYear': None # Placeholder
    }

def determine_culture(agent_id: str, birth_year: int) -> str:
    if 'shakespeare' in agent_id or 'chaucer' in agent_id: return 'English'
    if any(name in agent_id for name in ['leonardo', 'dante', 'michelangelo']):
        return 'Italian Renaissance'
    if any(name in agent_id for name in ['descartes', 'voltaire']):
        return 'French'
    if any(name in agent_id for name in ['kant', 'einstein']):
        return 'German'
    if any(name in agent_id for name in ['aristotle', 'plato', 'homer']):
        return 'Ancient Greek'
    if any(name in agent_id for name in ['caesar', 'cicero']):
        return 'Ancient Roman'
    if any(name in agent_id for name in ['dickens', 'austen']):
        return 'Victorian British'
    if any(name in agent_id for name in ['twain', 'dickinson']):
        return 'American'

    if birth_year < 500: return 'Classical'
    if birth_year < 1500: return 'Medieval European'
    if birth_year < 1650: return 'Renaissance European'
    if birth_year < 1800: return 'Enlightenment European'
    return 'Modern International'

def detect_rune_context(alchm_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if not alchm_data or "Alchemy Effects" not in alchm_data:
            return {"active": False, "reason": "no_alchemical_data"}

        effects = alchm_data["Alchemy Effects"]
        spirit = effects.get("Total Spirit", 0)
        essence = effects.get("Total Essence", 0)
        matter = effects.get("Total Matter", 0)
        substance = effects.get("Total Substance", 0)

        elements = {"spirit": spirit, "essence": essence, "matter": matter, "substance": substance}
        dominant = max(elements, key=elements.get)

        rune_mapping = {
            "spirit": {"rune": "Fehu", "meaning": "wealth_creation", "power": "manifestation"},
            "essence": {"rune": "Laguz", "meaning": "flow_intuition", "power": "emotional_healing"},
            "matter": {"rune": "Uruz", "meaning": "strength_grounding", "power": "physical_manifestation"},
            "substance": {"rune": "Dagaz", "meaning": "transformation", "power": "breakthrough_catalyst"},
        }

        active_rune = rune_mapping.get(dominant)

        return {
            "active": True,
            "dominantElement": dominant,
            "elementalValue": elements[dominant],
            "activeRune": active_rune,
            "runeStrength": min(elements[dominant] / 10, 1),
        }
    except Exception:
        return {"active": False, "reason": "detection_error"}

_SIGN_ELEMENTS = {
    "aries": "fire", "leo": "fire", "sagittarius": "fire",
    "taurus": "earth", "virgo": "earth", "capricorn": "earth",
    "gemini": "air", "libra": "air", "aquarius": "air",
    "cancer": "water", "scorpio": "water", "pisces": "water",
}
_COMPLEMENTARY_ELEMENT = {"fire": "air", "air": "fire", "earth": "water", "water": "earth"}

def calculate_enhanced_moment_score(agent_id: str, current_planets: Dict[str, Any], alchm_data: Dict[str, Any], monica_constant: float, agent: Any = None) -> Dict[str, Any]:
    """6-component moment score, derived entirely from real data:
    the agent's stored Sacred quantities (spirit/essence/matter/substance),
    kalchm + monica constants, its dominant element vs the CURRENT sky's
    elemental distribution, and the moment's alchemical totals."""
    if monica_constant is None:
        monica_constant = 0.5

    # Per-agent kinetic profile from stored Sacred quantities: the volatile
    # quantities (spirit/essence) drive velocity; the receptive ones
    # (essence/substance) drive aspect sensitivity.
    spirit = float(getattr(agent, "spiritScore", None) or 0)
    essence = float(getattr(agent, "essenceScore", None) or 0)
    matter = float(getattr(agent, "matterScore", None) or 0)
    substance = float(getattr(agent, "substanceScore", None) or 0)
    total_esms = spirit + essence + matter + substance
    if total_esms > 0:
        consciousness_velocity = (spirit + essence) / total_esms
        aspect_sensitivity_ratio = (essence + substance) / total_esms
    else:
        consciousness_velocity = 0.5
        aspect_sensitivity_ratio = 0.5
    velocity_signature = (
        "surging" if consciousness_velocity > 0.6
        else "steady" if consciousness_velocity >= 0.4
        else "grounded"
    )

    # Planetary alignment: how much of the current sky sits in signs of the
    # agent's dominant element (half credit for the complementary element).
    dominant = str(getattr(agent, "dominantElement", None) or "").lower()
    same = complementary = counted = 0
    for body in (current_planets or {}).values():
        if not isinstance(body, dict):
            continue
        element = _SIGN_ELEMENTS.get(str(body.get("sign", "")).lower())
        if not element:
            continue
        counted += 1
        if element == dominant:
            same += 1
        elif _COMPLEMENTARY_ELEMENT.get(element) == dominant:
            complementary += 1
    if counted and dominant:
        alignment_pct = 100.0 * (same + 0.5 * complementary) / counted
    else:
        alignment_pct = 50.0  # neutral when the sky or the element is unknown

    kalchm = getattr(agent, "kalchmConstant", None)
    consciousness_pct = max(0.0, min(100.0, float(kalchm) * 100)) if kalchm is not None else 50.0

    planetary_alignment = 0.25 * alignment_pct
    kinetic_velocity = 0.20 * (consciousness_velocity * 100)
    aspect_sensitivity = 0.15 * (aspect_sensitivity_ratio * 100)
    consciousness_score = 0.20 * consciousness_pct
    mc_bonus = 0.10 * (monica_constant * 100)

    effects = alchm_data.get("Alchemy Effects", {})
    total_elements = sum([effects.get("Total Spirit", 0), effects.get("Total Essence", 0), effects.get("Total Matter", 0), effects.get("Total Substance", 0)])
    elemental_resonance = 0.10 * min(100, (total_elements * 20))

    diversity_bonus = 5

    score = planetary_alignment + kinetic_velocity + aspect_sensitivity + consciousness_score + mc_bonus + elemental_resonance + diversity_bonus
    score = max(0, min(100, score))

    return {
        "agentId": agent_id,
        "score": score,
        "components": {
            "planetary": planetary_alignment,
            "kinetic": kinetic_velocity,
            "aspect": aspect_sensitivity,
            "consciousness": consciousness_score,
            "monicaConstant": mc_bonus,
            "elemental": elemental_resonance
        },
        "description": "Highly Resonant" if score > 80 else "Resonant" if score > 60 else "Building Momentum",
        "velocity_signature": velocity_signature
    }

def calculate_moment_synergy(natal_chart: Dict[str, Any], current_planets: Dict[str, Any]) -> Dict[str, Any]:
    # Simplified synergy calculation based on signs

    # Real version would use longitudes and aspects
    harmonic_count = 0
    challenging_count = 0
    
    # Simple elemental matching
    element_map = {
        "aries": "fire", "leo": "fire", "sagittarius": "fire",
        "taurus": "earth", "virgo": "earth", "capricorn": "earth",
        "gemini": "air", "libra": "air", "aquarius": "air",
        "cancer": "water", "scorpio": "water", "pisces": "water"
    }
    
    # Just compare Sun and Moon for now
    for body in ["Sun", "Moon"]:
        if body in natal_chart and body in current_planets:
            natal_sign = natal_chart[body].get("sign", "").lower()
            current_sign = current_planets[body].get("sign", "").lower()
            
            if natal_sign == current_sign:
                harmonic_count += 2
            elif element_map.get(natal_sign) == element_map.get(current_sign):
                harmonic_count += 1
            else:
                challenging_count += 1
                
    score = 50 + (harmonic_count * 10) - (challenging_count * 5)
    score = max(0, min(100, score))
    
    return {
        "score": score,
        "description": "Harmonious" if score > 70 else "Challenging" if score < 40 else "Neutral",
        "harmonicCount": harmonic_count,
        "challengingCount": challenging_count
    }
