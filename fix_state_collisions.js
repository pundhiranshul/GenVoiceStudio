const fs = require('fs');

function fixStateCollisions() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');

  // We have duplicate state definitions and function names. Let's fix the ones we inserted.
  content = content.replace(/const \[isOptimizing, setIsOptimizing\] = useState\(false\);/, 'const [isOptimizingDesign, setIsOptimizingDesign] = useState(false);');
  content = content.replace(/const \[optimizeError, setOptimizeError\] = useState\(""\);/, 'const [optimizeDesignError, setOptimizeDesignError] = useState("");');
  content = content.replace(/const \[showWriteModal, setShowWriteModal\] = useState\(false\);/, 'const [showWriteDesignModal, setShowWriteDesignModal] = useState(false);');
  content = content.replace(/const \[writeTopic, setWriteTopic\] = useState\(""\);/, 'const [writeDesignTopic, setWriteDesignTopic] = useState("");');
  content = content.replace(/const \[isWriting, setIsWriting\] = useState\(false\);/, 'const [isWritingDesign, setIsWritingDesign] = useState(false);');
  content = content.replace(/const \[writeError, setWriteError\] = useState\(""\);/, 'const [writeDesignError, setWriteDesignError] = useState("");');

  content = content.replace(/const handleOptimizePrompt = async \(\) => \{/g, 'const handleOptimizeDesignPrompt = async () => {');
  content = content.replace(/const handleWritePrompt = async \(\) => \{/g, 'const handleWriteDesignPrompt = async () => {');

  content = content.replace(/setIsOptimizing\(/g, 'setIsOptimizingDesign(');
  content = content.replace(/setOptimizeError\(/g, 'setOptimizeDesignError(');
  content = content.replace(/setShowWriteModal\(/g, 'setShowWriteDesignModal(');
  content = content.replace(/setWriteTopic\(/g, 'setWriteDesignTopic(');
  content = content.replace(/setIsWriting\(/g, 'setIsWritingDesign(');
  content = content.replace(/setWriteError\(/g, 'setWriteDesignError(');

  // But we replaced ALL instances in the file which will break the original ones too!
  // It's safer to recreate the file and run a clean script.
}

fixStateCollisions();
