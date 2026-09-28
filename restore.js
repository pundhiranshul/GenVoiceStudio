const fs = require('fs');

let page = fs.readFileSync('src/app/page.tsx', 'utf8');
page = page.replace(
  'const [text, setText] = useState("");',
  'const [text, setText] = useState(() => typeof window !== "undefined" ? sessionStorage.getItem("voice_text") || "" : "");\n  useEffect(() => { sessionStorage.setItem("voice_text", text); }, [text]);'
);
fs.writeFileSync('src/app/page.tsx', page);

let sfx = fs.readFileSync('src/app/sfx/page.tsx', 'utf8');
sfx = sfx.replace(
  'const [prompt, setPrompt] = useState("");',
  'const [prompt, setPrompt] = useState(() => typeof window !== "undefined" ? sessionStorage.getItem("sfx_prompt") || "" : "");\n  useEffect(() => { sessionStorage.setItem("sfx_prompt", prompt); }, [prompt]);'
);
fs.writeFileSync('src/app/sfx/page.tsx', sfx);
