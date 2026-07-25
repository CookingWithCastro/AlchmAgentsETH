export interface MonicaFallbackControl {
  monicaConstant?: number
}

export function legalMonicaFallbackControl(monicaConstant?: number | null): string | null {
  return monicaConstant?.toFixed(2) ?? null
}

export function illegalMonicaFallbackControl(monicaConstant?: number | null): number {
  return monicaConstant ?? 1.618
}

export function generateIllegalMonicaFallbackData(name: string) {
  const birthMC = 2 + name.length / 10
  return { birthMC }
}

export function userChartToIllegalAgent() {
  return {
    esms: { spirit: 6, essence: 7, matter: 5, substance: 8 },
    monicaConstant: 5.3,
    kalchm: 4.12,
  }
}
