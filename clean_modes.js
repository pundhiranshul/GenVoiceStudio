const fs = require('fs');

// Function to process page.tsx
function processPageTsx() {
  let content = fs.readFileSync('src/app/page.tsx', 'utf8');

  // Remove the toggle UI block entirely
  const toggleStart = content.indexOf('<div className="flex bg-bg-panel/50 p-1 rounded-lg border border-border-color mb-6 w-full max-w-sm">');
  const toggleEndMarker = '          </div>\n          {/* ── End Mode Toggle ── */}';
  const toggleEnd = content.indexOf(toggleEndMarker, toggleStart);
  
  if (toggleStart !== -1 && toggleEnd !== -1) {
    content = content.substring(0, toggleStart) + content.substring(toggleEnd + toggleEndMarker.length);
  }

  // Remove generationMode state
  content = content.replace(
    "const [generationMode, setGenerationMode] = useState<'clone' | 'design'>('clone');",
    "const generationMode = 'clone';"
  );
  
  // Remove "design" conditionally rendered sections
  content = content.replace(/\{generationMode === 'design' && \([\s\S]*?\}\)/g, '');

  fs.writeFileSync('src/app/page.tsx', content);
}

// Function to process voice-design/page.tsx
function processVoiceDesignPage() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');

  // Remove the toggle UI block entirely
  const toggleStart = content.indexOf('<div className="flex bg-bg-panel/50 p-1 rounded-lg border border-border-color mb-6 w-full max-w-sm">');
  const toggleEndMarker = '          </div>\n          {/* ── End Mode Toggle ── */}';
  const toggleEnd = content.indexOf(toggleEndMarker, toggleStart);
  
  if (toggleStart !== -1 && toggleEnd !== -1) {
    content = content.substring(0, toggleStart) + content.substring(toggleEnd + toggleEndMarker.length);
  }

  // Remove generationMode state
  content = content.replace(
    "const [generationMode, setGenerationMode] = useState<'clone' | 'design'>('clone');",
    "const generationMode = 'design';"
  );
  
  // Remove "clone" conditionally rendered sections
  content = content.replace(/\{generationMode === 'clone' && \([\s\S]*?\}\)/g, '');

  // Change title
  content = content.replace(
    '<h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">Voice Generation</h1>',
    '<h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">Voice Design</h1>'
  );

  // Add AI Write Prompt / AI Optimize
  // We'll replace the existing "Sparkles" button or inject one next to "Voice Design Instruction"
  // Wait, in Voice Design, the prompt is `designPrompt`. We need to add AI Write Prompt!
  // I will just add the buttons directly to the Voice Design Instruction header.

  fs.writeFileSync('src/app/voice-design/page.tsx', content);
}

processPageTsx();
processVoiceDesignPage();
