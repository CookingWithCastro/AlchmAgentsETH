/**
 * Control fixture for scripts/resolveThermoCallers.ts.
 *
 * This deliberately has no call expressions. The table reference proves that
 * the resolver distinguishes a live function value from an unreferenced
 * declaration.
 */
export function kalchmValueReferenceControl(): number {
  return 1
}

export const THERMO_VALUE_REFERENCE_CONTROL = { kalchmValueReferenceControl }
