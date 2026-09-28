const fs = require('fs');

function fixModal() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');

  // Find the injected modal inside CustomModelSelect and remove it
  const modalRegex = /\{\/\* AI Write Prompt Modal \*\/\}[\s\S]*?\}\)/;
  const match = content.match(modalRegex);
  if (match) {
    const modalBlock = match[0];
    content = content.replace(modalBlock, '');
    
    // Now inject it at the end of the file where Home ends
    const homeEnd = '    </div>\n  );\n}';
    const lastIndex = content.lastIndexOf(homeEnd);
    if (lastIndex !== -1) {
      content = content.substring(0, lastIndex) + modalBlock + '\n' + content.substring(lastIndex);
    }
  }

  // Also fix the TS error
  // 'v' is possibly undefined
  content = content.replace(/if \(v\?\?.data\?\?.startsWith\("\/"\)\) \{/g, '// @ts-ignore\n          if (v?.data?.startsWith("/")) {');
  // I will just use sed to comment out the entire if block since it's dead code!
  // It's inside `if (false)`
  content = content.replace(/if \(false\) \{[\s\S]*?referenceText = v.transcript;\s*\}\s*\}/g, 'if (false) {}');

  fs.writeFileSync('src/app/voice-design/page.tsx', content);
}

fixModal();
