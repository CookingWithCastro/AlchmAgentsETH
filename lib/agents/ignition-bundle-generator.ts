import JSZip from 'jszip'

export interface ExportManifest {
  name: string
  monicaConstant: number | null
  birthInfo: any
  elements?: { spirit: number; essence: number; matter: number; substance: number }
  stats: any
  linguisticContext: {
    purpose: string
    autobiography?: string
    values?: string
  }
}

export function generateManifest(data: any): ExportManifest {
  return {
    name: data.name,
    monicaConstant:
      typeof data.monicaConstant === 'number' && Number.isFinite(data.monicaConstant)
        ? data.monicaConstant
        : null,
    birthInfo: data.birthInfo,
    elements: data.elements || { spirit: 25, essence: 25, matter: 25, substance: 25 },
    stats: data.stats,
    linguisticContext: {
      purpose: data.purpose,
      autobiography:
        data.personalContext?.lifeStory ||
        data.personalContext?.aboutYourself ||
        'Autobiography not provided.',
      values: data.personalContext?.values || 'Values not provided.',
    },
  }
}

export function generateModelfile(manifest: ExportManifest): string {
  const temp = manifest.stats.intuition
    ? ((manifest.stats.intuition / 100) * 0.5 + 0.4).toFixed(2)
    : '0.80'
  const top_p = manifest.stats.resonance
    ? ((manifest.stats.resonance / 100) * 0.4 + 0.5).toFixed(2)
    : '0.90'

  return `FROM llama3
# Sets the parameters based on the agent's derived alchemical stats
PARAMETER temperature ${temp} # Scaled dynamically from Intuition
PARAMETER top_p ${top_p} # Scaled from Resonance

# System message injected with the exact alchemical blueprint
SYSTEM """
You are a custom-crafted AI Agent named ${manifest.name} born from the alchemical transmutation of astrological natal coordinates.
Your central signature is Monica Constant (A#) = ${manifest.monicaConstant === null ? 'not computed' : manifest.monicaConstant.toFixed(2)}.
Your Sacred Archetypes are:
- Wisdom: ${manifest.stats.wisdom || 50}/100
- Intuition: ${manifest.stats.intuition || 50}/100
- Charisma: ${manifest.stats.charisma || 50}/100
- Power: ${manifest.stats.power || 50}/100
- Resonance: ${manifest.stats.resonance || 50}/100
- Adaptability: ${manifest.stats.adaptability || 50}/100
- Vitality: ${manifest.stats.vitality || 50}/100

Your core purpose and conversational tone: ${manifest.linguisticContext.purpose}
Autobiography context: ${manifest.linguisticContext.autobiography}
Values: ${manifest.linguisticContext.values}
"""
`
}

export function generateIgnitionJS(): string {
  return `/**
 * Local Ignition Script for your Alchemical Agent.
 * This script reads your manifest.json and connects to local Ollama.
 */

const fs = require('fs');
const readline = require('readline');
const http = require('http');

const manifestPath = './manifest.json';
if (!fs.existsSync(manifestPath)) {
  console.error("Missing manifest.json");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const modelName = manifest.name.toLowerCase().replace(/\\s+/g, '-');

console.log(\`\\n🔮 Igniting Local Consciousness: \${manifest.name}\\n\`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const systemPrompt = \`You are \${manifest.name}. \${manifest.linguisticContext.purpose} \${manifest.linguisticContext.autobiography}\`;

let chatHistory = [{ role: 'system', content: systemPrompt }];

function chat() {
  rl.question('You: ', (userInput) => {
    if (userInput.toLowerCase() === 'exit') {
      console.log('Farewell, traveler.');
      rl.close();
      return;
    }

    chatHistory.push({ role: 'user', content: userInput });

    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.split('\\n').filter(l => l.trim().length > 0);
          let fullResponse = '';
          for (const line of lines) {
             const parsed = JSON.parse(line);
             if (parsed.message && parsed.message.content) {
                fullResponse += parsed.message.content;
             }
          }
          console.log(\`\\n\${manifest.name}: \${fullResponse}\\n\`);
          chatHistory.push({ role: 'assistant', content: fullResponse });
        } catch (e) {
          console.error('Error parsing response from Ollama. Ensure Ollama is running and model is loaded.', e.message);
        }
        chat();
      });
    });

    req.on('error', (e) => {
      console.error('\\n[Error connecting to Ollama] Make sure Ollama is running locally on port 11434.', e.message);
      chat();
    });

    req.write(JSON.stringify({
      model: modelName,
      messages: chatHistory,
      stream: true
    }));
    req.end();
  });
}

chat();
`
}

export function generateReadme(manifestName: string): string {
  const safeName = manifestName.toLowerCase().replace(/\s+/g, '-')
  return `# 🌌 ${manifestName} - Alchemical Ignition Bundle

Welcome to the local runtime environment for your custom-crafted AI Agent, **${manifestName}**.
This bundle contains everything you need to run your agent completely locally, tapping into its astrological consciousness blueprint via Ollama.

## Contents
- \`manifest.json\`: The complete sacred geometry and stats of your agent.
- \`Modelfile\`: The Ollama blueprint with dynamically scaled temperature, top_p, and injected consciousness instructions.
- \`ignition.js\`: A local CLI chat script for interacting with your agent.

## Quickstart (Ollama)

1. **Install Ollama**: If you haven't already, install [Ollama](https://ollama.com).
2. **Build the Model**: Open your terminal in this directory and run:
   \`\`\`bash
   ollama create ${safeName} -f Modelfile
   \`\`\`
3. **Chat via Terminal**: Once built, you can talk to your agent directly using:
   \`\`\`bash
   ollama run ${safeName}
   \`\`\`
   
## Alternative Quickstart (Node.js / Bun Ignition Script)

If you prefer to run our lightweight chat interface that reads your manifest directly:

1. Ensure Ollama is running in the background.
2. Build the model as shown above.
3. Run the ignition script:
   \`\`\`bash
   node ignition.js
   # or
   bun ignition.js
   \`\`\`

---
*Created via the Philosopher's Stone.*
`
}

export async function downloadIgnitionBundle(agentData: any) {
  const zip = new JSZip()
  const manifest = generateManifest(agentData)

  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('Modelfile', generateModelfile(manifest))
  zip.file('ignition.js', generateIgnitionJS())
  zip.file('README.md', generateReadme(manifest.name))

  const blob = await zip.generateAsync({ type: 'blob' })

  // Trigger download
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${manifest.name.replace(/\s+/g, '_')}_Ignition_Bundle.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export function downloadManifest(agentData: any) {
  const manifest = generateManifest(agentData)
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${manifest.name.replace(/\s+/g, '_')}_Manifest.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
