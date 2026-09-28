const fs = require('fs');

function fixAIFeaturesLocation() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');

  // 1. Remove the incorrectly placed states and functions
  const stateStart = '  const [isOptimizing, setIsOptimizing] = useState(false);';
  const functionEnd = 'setIsWriting(false);\n    }\n  };\n';
  
  const badBlockStart = content.indexOf(stateStart);
  if (badBlockStart !== -1) {
    const badBlockEnd = content.indexOf(functionEnd) + functionEnd.length;
    const badBlock = content.substring(badBlockStart, badBlockEnd);
    content = content.replace(badBlock, '');
    
    // Now insert them into `export default function Home() {` right after `const [isStitching, setIsStitching] = useState(false);`
    const insertTarget = 'const [isStitching, setIsStitching] = useState(false);';
    content = content.replace(insertTarget, insertTarget + '\n' + badBlock);
  }

  // 2. Remove the incorrectly placed modal
  const modalStart = '{/* AI Write Prompt Modal */}';
  const modalIndex = content.indexOf(modalStart);
  if (modalIndex !== -1 && modalIndex < content.indexOf('export default function Home()')) {
    // The modal was injected before Home(). We need to extract it and move it.
    const modalEndStr = '  );\n}'; // wait, it was injected before the `</div>\n  );\n}` of CustomModelSelect
    // Let's just find the modal using regex and delete it.
    const modalRegex = /\{\/\* AI Write Prompt Modal \*\/\}[\s\S]*?\}\)/;
    const match = content.match(modalRegex);
    if (match) {
      const modalBlock = match[0];
      content = content.replace(modalBlock, '');
      
      // Inject it at the end of Home
      const homeEnd = '    </div>\n  );\n}';
      const homeEndIndex = content.lastIndexOf(homeEnd);
      if (homeEndIndex !== -1) {
        content = content.substring(0, homeEndIndex) + modalBlock + '\n' + content.substring(homeEndIndex);
      }
    }
  }

  // 3. Fix "Cannot find name Loader2"
  if (!content.includes('Loader2')) {
    content = content.replace('import { Play, Square, Settings, Upload, Check, ChevronDown, Wand2, Sparkles, AlertCircle } from "lucide-react";', 'import { Play, Square, Settings, Upload, Check, ChevronDown, Wand2, Sparkles, AlertCircle, Loader2 } from "lucide-react";');
  }

  fs.writeFileSync('src/app/voice-design/page.tsx', content);
}

fixAIFeaturesLocation();
