const fs = require('fs')

// 1. app/philosophers-stone/PhilosophersStoneComponent.tsx
let path1 = 'app/philosophers-stone/PhilosophersStoneComponent.tsx'
let code1 = fs.readFileSync(path1, 'utf8')

code1 = code1.replace(/const AgentCreationWizard = lazy/g, 'const _AgentCreationWizard = lazy')
code1 = code1.replace(
  /\{\/\* @ts-ignore \*\/\}\n                  <DynamicAgentCreationWizard/g,
  '<DynamicAgentCreationWizard'
)

// Replace the entire DynamicAgentCreationWizard block up to onComplete to fix onChartsLoaded
const wizardRegex =
  /<DynamicAgentCreationWizard[\s\S]*?onChartsLoaded=\{[\s\S]*?\}\s*=>\s*\{[\s\S]*?\}\}\n\s*onComplete/g
code1 = code1.replace(
  wizardRegex,
  `<DynamicAgentCreationWizard
                    onChartsLoaded={(params: any) => {
                      const {
                        birthChart: wizardBirthChart,
                        momentChart: wizardMomentChart,
                        additionalCharts: wizardAdditionalCharts,
                        mode,
                      } = params;
                      setBirthChart(wizardBirthChart)
                      setMomentChart(wizardMomentChart)
                      setAdditionalCharts(wizardAdditionalCharts ?? [])
                      setCreationMode(mode)
                    }}
                    onComplete`
)

fs.writeFileSync(path1, code1)

// 2. components/time-laboratory/zodiac-wheel-interactive.tsx
let path2 = 'components/time-laboratory/zodiac-wheel-interactive.tsx'
let code2 = fs.readFileSync(path2, 'utf8')

code2 = code2.replace(/  degree,\n  angle,/g, '  _degree,\n  angle,')
code2 = code2.replace(/  highlightElements = \[\],/g, '  _highlightElements = [],')

fs.writeFileSync(path2, code2)
