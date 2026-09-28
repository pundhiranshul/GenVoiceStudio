const fs = require('fs');

function cleanPageTsx() {
  let content = fs.readFileSync('src/app/page.tsx', 'utf8');

  // Hardcode clone logic
  content = content.replace(/generationMode === 'clone'/g, 'true');
  content = content.replace(/generationMode === 'design'/g, 'false');
  content = content.replace(/generationMode !== 'design'/g, 'true');
  content = content.replace(/generationMode !== 'clone'/g, 'false');
  content = content.replace(/generationMode === "clone"/g, 'true');
  content = content.replace(/generationMode === "design"/g, 'false');

  fs.writeFileSync('src/app/page.tsx', content);
}

function cleanVoiceDesignPage() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');

  // Hardcode design logic
  content = content.replace(/generationMode === 'clone'/g, 'false');
  content = content.replace(/generationMode === 'design'/g, 'true');
  content = content.replace(/generationMode !== 'design'/g, 'false');
  content = content.replace(/generationMode !== 'clone'/g, 'true');
  content = content.replace(/generationMode === "clone"/g, 'false');
  content = content.replace(/generationMode === "design"/g, 'true');

  fs.writeFileSync('src/app/voice-design/page.tsx', content);
}

cleanPageTsx();
cleanVoiceDesignPage();
