const fs = require('fs');
const path = require('path');

const STITCH_DIR = path.join(__dirname, '../design/stitch-exports');
const OUT_DIR = path.join(__dirname, '../app/(sandbox)/stitch');
const COMPONENTS_OUT_DIR = path.join(__dirname, '../components/stitch');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(COMPONENTS_OUT_DIR)) fs.mkdirSync(COMPONENTS_OUT_DIR, { recursive: true });

const toCamelCase = (str) => {
  return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
};

const convertStyle = (styleStr) => {
  const rules = styleStr.split(';').filter(Boolean);
  const obj = {};
  rules.forEach(rule => {
    const [key, value] = rule.split(':').map(s => s.trim());
    if (key && value) {
      let cleanValue = value.replace(/'/g, '"');
      obj[toCamelCase(key)] = cleanValue;
    }
  });
  return JSON.stringify(obj);
};

const processHtml = (html) => {
  let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return '';
  let content = bodyMatch[1];
  
  // Remove script and style tags entirely
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Basic react conversions
  content = content.replace(/class=/g, 'className=');
  content = content.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  
  // Handle style attributes
  content = content.replace(/style="([^"]*)"/g, (match, styleStr) => {
    return 'style={' + convertStyle(styleStr) + '}';
  });
  
  // Close unclosed tags
  const selfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'];
  selfClosing.forEach(tag => {
    const regex = new RegExp('<' + tag + '([^>]*?)(?<!/)>', 'g');
    content = content.replace(regex, '<' + tag + '$1 />');
  });

  // Handle some common reserved words
  content = content.replace(/for=/g, 'htmlFor=');
  content = content.replace(/tabindex=/g, 'tabIndex=');
  content = content.replace(/autocomplete=/g, 'autoComplete=');
  content = content.replace(/clip-rule=/g, 'clipRule=');
  content = content.replace(/fill-rule=/g, 'fillRule=');
  content = content.replace(/stroke-width=/g, 'strokeWidth=');
  content = content.replace(/stroke-linecap=/g, 'strokeLinecap=');
  content = content.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
  content = content.replace(/stroke-dasharray=/g, 'strokeDasharray=');
  content = content.replace(/stroke-dashoffset=/g, 'strokeDashoffset=');
  content = content.replace(/viewbox=/gi, 'viewBox=');
  content = content.replace(/feturbulence/gi, 'feTurbulence');
  content = content.replace(/fedisplacementmap/gi, 'feDisplacementMap');
  content = content.replace(/basefrequency=/gi, 'baseFrequency=');
  content = content.replace(/numoctaves=/gi, 'numOctaves=');
  content = content.replace(/xchannelselector=/gi, 'xChannelSelector=');
  content = content.replace(/ychannelselector=/gi, 'yChannelSelector=');
  
  // Fix boolean attributes
  content = content.replace(/disabled=""/g, 'disabled');
  
  return content;
};

const dirs = fs.readdirSync(STITCH_DIR).filter(d => fs.statSync(path.join(STITCH_DIR, d)).isDirectory());

let links = [];

dirs.forEach(dir => {
  const codePath = path.join(STITCH_DIR, dir, 'code.html');
  if (fs.existsSync(codePath)) {
    const html = fs.readFileSync(codePath, 'utf8');
    const jsxContent = processHtml(html);
    
    const componentName = dir.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const componentCode = 'export default function ' + componentName + '() {\n  return (\n    <div className="stitch-export bg-background min-h-screen text-zinc-100">\n      ' + jsxContent + '\n    </div>\n  );\n}\n';
    
    fs.writeFileSync(path.join(COMPONENTS_OUT_DIR, dir + '.tsx'), componentCode);
    
    const pageDir = path.join(OUT_DIR, dir);
    if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });
    
    const pageCode = 'import ' + componentName + ' from "@/components/stitch/' + dir + '";\n\nexport default function Page() {\n  return <' + componentName + ' />;\n}\n';
    fs.writeFileSync(path.join(pageDir, 'page.tsx'), pageCode);
    
    links.push({ name: dir, componentName });
  }
});

const indexCode = 'import Link from "next/link";\n\nexport default function StitchIndex() {\n  return (\n    <div className="p-8 text-zinc-100 bg-background min-h-screen">\n      <h1 className="text-2xl font-bold mb-4">Stitch UI Exports</h1>\n      <ul className="space-y-2">\n        ' + links.map(l => '<li><Link href="/stitch/' + l.name + '" className="text-alchemical-spirit hover:underline">' + l.componentName + '</Link></li>').join('\n        ') + '\n      </ul>\n    </div>\n  );\n}\n';
fs.writeFileSync(path.join(OUT_DIR, 'page.tsx'), indexCode);

console.log('Conversion complete!');