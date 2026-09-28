const fs = require('fs');

function fixFiles() {
  const files = ['src/app/page.tsx', 'src/app/voice-design/page.tsx'];
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove the remaining setGenerationMode buttons manually
    content = content.replace(/<button[^>]*onClick=\{\(\) => setGenerationMode\('clone'\)\}[^>]*>[\s\S]*?<\/button>/g, '');
    content = content.replace(/<button[^>]*onClick=\{\(\) => setGenerationMode\('design'\)\}[^>]*>[\s\S]*?<\/button>/g, '');
    content = content.replace(/setGenerationMode\('.*?'\)/g, ''); // catch any stragglers
    
    // Fix v?.data
    content = content.replace(/const res = await fetch\(v\?\.data\);/g, 'const res = await fetch(v?.data || "");');
    content = content.replace(/payload\.audio_url = v\?\.data;/g, 'payload.audio_url = v?.data || "";');
    content = content.replace(/payload\.voice_name = v\?\.name;/g, 'payload.voice_name = v?.name || "";');
    
    fs.writeFileSync(file, content);
  }
}

fixFiles();
