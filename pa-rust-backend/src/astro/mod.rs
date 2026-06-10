//! Astrological / alchemical math, ported from `backend/utils.py` and the
//! ephemeris helpers in `backend/main.py`. No external ephemeris is used — the
//! source backend relies on a deterministic mean-motion model plus the
//! alchemical engine, and this port reproduces it exactly.

pub mod alchemy;
pub mod aspects;
pub mod consciousness;
pub mod constants;
pub mod kinetics;
pub mod positions;
