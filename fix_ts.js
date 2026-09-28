const fs = require('fs');

function fixPage() {
  let content = fs.readFileSync('src/app/page.tsx', 'utf8');
  content = content.replace(/onClick=\{\(\) => setGenerationMode\('clone'\)\}/g, '');
  content = content.replace(/onClick=\{\(\) => setGenerationMode\('design'\)\}/g, '');
  fs.writeFileSync('src/app/page.tsx', content);
}

function fixVoiceDesign() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');
  content = content.replace(/onClick=\{\(\) => setGenerationMode\('clone'\)\}/g, '');
  content = content.replace(/onClick=\{\(\) => setGenerationMode\('design'\)\}/g, '');
  
  // Fix 'v' is possibly undefined
  // `const v = PRESET_VOICES.find(x => x.id === selectedVoice);`
  // `payload.voice_name = v.name;` -> `payload.voice_name = v?.name;`
  content = content.replace(/v\.name/g, 'v?.name');
  content = content.replace(/v\.data/g, 'v?.data');

  // Also wait, I need to add AI Write Prompt and AI Optimize!
  // It's probably easier to just replace the header of Voice Design instruction box.
  
  fs.writeFileSync('src/app/voice-design/page.tsx', content);
}

fixPage();
fixVoiceDesign();
