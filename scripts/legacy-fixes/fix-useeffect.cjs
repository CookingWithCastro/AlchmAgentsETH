const fs = require('fs')

const tscOutput = `components/admin/performance-dashboard.tsx:119:13 - error TS7030: Not all code paths return a value.
components/agents/agent-dashboard.tsx:163:13 - error TS7030: Not all code paths return a value.
components/charts/chart-transform-visualization.tsx:345:13 - error TS7030: Not all code paths return a value.
components/charts/kinetics-chart-pane.tsx:108:13 - error TS7030: Not all code paths return a value.
components/dashboards/alchemical-consciousness-dashboard.tsx:46:13 - error TS7030: Not all code paths return a value.
components/dashboards/PerformanceDashboard.tsx:80:13 - error TS7030: Not all code paths return a value.
components/misc/moment-based-recommendations.tsx:474:13 - error TS7030: Not all code paths return a value.
components/misc/power-hour-notification.tsx:28:13 - error TS7030: Not all code paths return a value.
components/misc/realtime-rune-display.tsx:124:13 - error TS7030: Not all code paths return a value.
components/misc/temporal-oracle.tsx:144:13 - error TS7030: Not all code paths return a value.
components/rag/rag-monitor.tsx:33:13 - error TS7030: Not all code paths return a value.`

const lines = tscOutput.split('\n')

for (const line of lines) {
  const match = line.match(/^([^:]+):(\d+):/)
  if (match) {
    const file = match[1]
    const lineNum = parseInt(match[2], 10)

    let content = fs.readFileSync(file, 'utf8')
    const contentLines = content.split('\n')

    // The useEffect starts at lineNum. We need to find the matching closing brace.
    let braceCount = 0
    let foundStart = false
    let endLineNum = -1

    for (let i = lineNum - 1; i < contentLines.length; i++) {
      const lineStr = contentLines[i]
      if (lineStr.includes('{')) {
        braceCount += (lineStr.match(/\{/g) || []).length
        foundStart = true
      }
      if (lineStr.includes('}')) {
        braceCount -= (lineStr.match(/\}/g) || []).length
      }

      if (foundStart && braceCount === 0) {
        endLineNum = i
        break
      }
    }

    if (endLineNum !== -1) {
      // Insert `return undefined;` before the closing brace line
      const indent = contentLines[endLineNum].match(/^\s*/)[0] + '  '
      contentLines.splice(endLineNum, 0, indent + 'return undefined;')
      fs.writeFileSync(file, contentLines.join('\n'))
      console.log(`Fixed ${file}`)
    }
  }
}
