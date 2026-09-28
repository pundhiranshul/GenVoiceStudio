const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Add import
content = content.replace(
  'import { GenVoiceLogo } from "@/components/GenVoiceLogo";',
  'import { GenVoiceLogo } from "@/components/GenVoiceLogo";\nimport { CustomModelSelect, AVAILABLE_AI_MODELS } from "@/components/CustomModelSelect";'
);

// 2. Remove AVAILABLE_AI_MODELS and CustomModelSelect definitions
const modelsStart = content.indexOf('const AVAILABLE_AI_MODELS = [');
const selectEnd = content.indexOf('// ── Main Page Component ───────────────────────────────────────────');
if (modelsStart !== -1 && selectEnd !== -1) {
  content = content.substring(0, modelsStart) + content.substring(selectEnd);
}

// 3. Update width of the header dropdown
content = content.replace(
  'className="w-[140px]"',
  'className="w-[180px]"'
);

fs.writeFileSync('src/app/page.tsx', content);
