const fs = require('fs');

// Update page.tsx
let page = fs.readFileSync('src/app/page.tsx', 'utf8');

// Replace audios useState
page = page.replace(
  'const [audios, setAudios] = useState<{name: string, data: string}[]>([]);',
  `const [audios, setAudios] = useState<{name: string, data: string}[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("voice_audios");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  useEffect(() => { sessionStorage.setItem("voice_audios", JSON.stringify(audios)); }, [audios]);`
);

// Replace logs useState
page = page.replace(
  'const [logs, setLogs] = useState<string[]>([]);',
  `const [logs, setLogs] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("voice_logs");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  useEffect(() => { sessionStorage.setItem("voice_logs", JSON.stringify(logs)); }, [logs]);`
);

fs.writeFileSync('src/app/page.tsx', page);

// Update sfx/page.tsx
let sfx = fs.readFileSync('src/app/sfx/page.tsx', 'utf8');

// Update audioUrl
sfx = sfx.replace(
  'const [audioUrl, setAudioUrl] = useState<string | null>(null);',
  `const [audioUrl, setAudioUrl] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("sfx_audioUrl") || null;
    }
    return null;
  });
  useEffect(() => { if (audioUrl) sessionStorage.setItem("sfx_audioUrl", audioUrl); else sessionStorage.removeItem("sfx_audioUrl"); }, [audioUrl]);`
);

// Update logs
sfx = sfx.replace(
  'const [logs, setLogs] = useState<string[]>([]);',
  `const [logs, setLogs] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("sfx_logs");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  useEffect(() => { sessionStorage.setItem("sfx_logs", JSON.stringify(logs)); }, [logs]);`
);

// Fix logging format in sfx/page.tsx
sfx = sfx.replace(
  'addLog("Polling status...");\n      const res = await fetch(url.toString());',
  'const res = await fetch(url.toString());'
);

sfx = sfx.replace(
  'const data = await res.json();',
  'const data = await res.json();\n      const info = data.chunksTotal > 0 ? ` (${data.chunksCurrent}/${data.chunksTotal})` : "";\n      addLog(`${(data.status || "unknown").toUpperCase()}${info}`);'
);

fs.writeFileSync('src/app/sfx/page.tsx', sfx);

