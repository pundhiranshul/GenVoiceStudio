const fs = require('fs');
let sfx = fs.readFileSync('src/app/sfx/page.tsx', 'utf8');

// Add addLog function
sfx = sfx.replace(
  'const pollStatus = async () => {',
  `const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, \`[\${time}] \${msg}\`]);
  };

  const pollStatus = async () => {`
);

// Update pollStatus to use addLog
sfx = sfx.replace(
  'const res = await fetch(url.toString());',
  'addLog("Polling status...");\n      const res = await fetch(url.toString());'
);

sfx = sfx.replace(
  'if (data.log) {\n        setLogs(data.log.split(\'\\\\n\'));\n      }',
  ''
);

sfx = sfx.replace(
  'setStatus("downloading");',
  'addLog("Complete! Fetching audio...");\n        setStatus("downloading");'
);

sfx = sfx.replace(
  'setStatus("complete");',
  'addLog("Audio ready.");\n          setStatus("complete");'
);

sfx = sfx.replace(
  'setStatus("error");\n        setErrorMsg(err.message);',
  'addLog(`ERROR: ${err.message}`);\n        setStatus("error");\n        setErrorMsg(err.message);'
);

sfx = sfx.replace(
  'kernelRef.current = data.kernel;\n      setStatus("generating");',
  'addLog(`Kernel: ${data.kernel}`);\n      kernelRef.current = data.kernel;\n      setStatus("generating");'
);

sfx = sfx.replace(
  'setLogs([]);',
  'setLogs([]); addLog("Initializing...");'
);

// Add window.isGenerating
sfx = sfx.replace(
  'window.addEventListener(\'beforeunload\', handleBeforeUnload);',
  'window.addEventListener(\'beforeunload\', handleBeforeUnload);\n    (window as any).isGenerating = (status !== "idle" && status !== "complete" && status !== "error");'
);

fs.writeFileSync('src/app/sfx/page.tsx', sfx);

let page = fs.readFileSync('src/app/page.tsx', 'utf8');
page = page.replace(
  'window.addEventListener(\'beforeunload\', handleBeforeUnload);',
  'window.addEventListener(\'beforeunload\', handleBeforeUnload);\n    (window as any).isGenerating = (status !== "idle" && status !== "complete" && status !== "error");'
);
fs.writeFileSync('src/app/page.tsx', page);

