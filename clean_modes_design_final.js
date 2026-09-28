const fs = require('fs');

function setupVoiceDesign() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');

  // Hardcode design logic
  content = content.replace(/generationMode === 'clone'/g, 'false');
  content = content.replace(/generationMode === 'design'/g, 'true');
  content = content.replace(/generationMode !== 'design'/g, 'false');
  content = content.replace(/generationMode !== 'clone'/g, 'true');
  content = content.replace(/generationMode === "clone"/g, 'false');
  content = content.replace(/generationMode === "design"/g, 'true');

  // Remove setGenerationMode usages
  content = content.replace(/onClick=\{\(\) => setGenerationMode\('clone'\)\}/g, '');
  content = content.replace(/onClick=\{\(\) => setGenerationMode\('design'\)\}/g, '');

  // Fix TS error using @ts-ignore safely
  content = content.replace(/if \(v\?.data\.startsWith\("\/"\)\) \{/g, '// @ts-ignore\n          if (v?.data?.startsWith("/")) {');
  content = content.replace(/const r = await fetch\(v\?\.data\);/g, '// @ts-ignore\n            const r = await fetch(v?.data);');
  content = content.replace(/referenceAudio = v\?\.data;/g, '// @ts-ignore\n            referenceAudio = v?.data;');
  content = content.replace(/referenceText = v\.transcript;/g, '// @ts-ignore\n          referenceText = v.transcript;');

  // Add states
  const stateInsertPoint = 'const [guidanceScale, setGuidanceScale] = useState(2);';
  content = content.replace(
    stateInsertPoint,
    `${stateInsertPoint}
  const [isOptimizingDesign, setIsOptimizingDesign] = useState(false);
  const [optimizeDesignError, setOptimizeDesignError] = useState("");
  const [showWriteDesignModal, setShowWriteDesignModal] = useState(false);
  const [writeDesignTopic, setWriteDesignTopic] = useState("");
  const [isWritingDesign, setIsWritingDesign] = useState(false);
  const [writeDesignError, setWriteDesignError] = useState("");`
  );

  // Add functions
  const functionsInsertPoint = 'const toggleTheme = () => {';
  const functionsCode = `
  const handleOptimizeDesignPrompt = async () => {
    if (!designPrompt.trim()) return;
    setIsOptimizingDesign(true);
    setOptimizeDesignError("");
    try {
      const payload: any = {
        text: designPrompt,
        instruction: "Optimize this prompt for Voice Design. Enhance it by adding descriptive words about the age, gender, accent, tone, and character. Keep it under 2 sentences.",
        aiModel: typeof AVAILABLE_AI_MODELS !== 'undefined' ? AVAILABLE_AI_MODELS[0] : 'openai/gpt-4o'
      };
      const pass = localStorage.getItem('appPassword');
      if (pass) {
        payload.password = pass;
      } else {
        payload.username = kaggleUsername;
        payload.key = kaggleKey;
      }
      const mKey = localStorage.getItem('modelProxyKey');
      const mExp = localStorage.getItem('modelProxyExpiresAt');
      if (mKey && mExp) {
        payload.modelProxyKey = mKey;
        payload.modelProxyExpiresAt = mExp;
      }
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to optimize prompt");
      if (data.modelProxyKey && data.modelProxyExpiresAt) {
        localStorage.setItem('modelProxyKey', data.modelProxyKey);
        localStorage.setItem('modelProxyExpiresAt', data.modelProxyExpiresAt);
      }
      setDesignPrompt(data.optimizedText);
    } catch (err: any) {
      setOptimizeDesignError(err.message);
    } finally {
      setIsOptimizingDesign(false);
    }
  };

  const handleWriteDesignPrompt = async () => {
    if (!writeDesignTopic.trim()) return;
    setIsWritingDesign(true);
    setWriteDesignError("");
    try {
      const payload: any = {
        text: writeDesignTopic,
        instruction: "You are an expert voice actor casting director. Write a highly detailed Voice Design instruction prompt based on the user's premise. Describe the age, gender, accent, tone, and character. Just output the prompt itself, nothing else. Keep it under 2 sentences.",
        aiModel: typeof AVAILABLE_AI_MODELS !== 'undefined' ? AVAILABLE_AI_MODELS[0] : 'openai/gpt-4o'
      };
      const pass = localStorage.getItem('appPassword');
      if (pass) {
        payload.password = pass;
      } else {
        payload.username = kaggleUsername;
        payload.key = kaggleKey;
      }
      const mKey = localStorage.getItem('modelProxyKey');
      const mExp = localStorage.getItem('modelProxyExpiresAt');
      if (mKey && mExp) {
        payload.modelProxyKey = mKey;
        payload.modelProxyExpiresAt = mExp;
      }
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to write prompt");
      if (data.modelProxyKey && data.modelProxyExpiresAt) {
        localStorage.setItem('modelProxyKey', data.modelProxyKey);
        localStorage.setItem('modelProxyExpiresAt', data.modelProxyExpiresAt);
      }
      setDesignPrompt(data.optimizedText);
      setShowWriteDesignModal(false);
    } catch (err: any) {
      setWriteDesignError(err.message);
    } finally {
      setIsWritingDesign(false);
    }
  };
`;
  content = content.replace(functionsInsertPoint, functionsCode + '\n  ' + functionsInsertPoint);

  // Add AI buttons to Voice Design Instruction
  const headerTarget = '<label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">\n                {true ? \'Voice Design Instruction\' : \'Performance Instructions\'}\n              </label>';
  const buttonsHtml = `<div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
                  Voice Design Instruction
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowWriteDesignModal(true); setWriteDesignError(""); }}
                    disabled={status !== "idle" && status !== "complete" && status !== "error"}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={12} className="text-accent-bg" /> AI Write
                  </button>
                  <button
                    onClick={handleOptimizeDesignPrompt}
                    disabled={isOptimizingDesign || !designPrompt.trim() || (status !== "idle" && status !== "complete" && status !== "error")}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    {isOptimizingDesign ? <Loader2 size={12} className="animate-spin text-accent-bg" /> : <Wand2 size={12} className="text-accent-bg" />}
                    AI Optimize
                  </button>
                </div>
              </div>
              {optimizeDesignError && <p className="text-xs text-red-500">{optimizeDesignError}</p>}
`;
  content = content.replace(headerTarget, buttonsHtml);

  // Add Write Prompt Modal
  const modalHtml = `
      {/* AI Write Prompt Modal */}
      {showWriteDesignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-bg-panel w-full max-w-lg rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Sparkles size={20} className="text-accent-bg" /> AI Write Prompt
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Vaguely describe your character and the AI will augment it into a highly detailed Voice Design prompt.
              </p>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">Topic / Premise</label>
                <textarea
                  value={writeDesignTopic}
                  onChange={e => setWriteDesignTopic(e.target.value)}
                  placeholder="e.g. A grumpy old wizard..."
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-text-muted resize-none transition-colors"
                  rows={3}
                />
              </div>
            </div>

            {writeDesignError && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
                  <div className="break-words w-full flex flex-col gap-2">
                    <span>{writeDesignError}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border-subtle bg-bg-base flex gap-3">
              <button
                onClick={() => setShowWriteDesignModal(false)}
                disabled={isWritingDesign}
                className="flex-1 px-4 py-2.5 bg-bg-input text-text-primary text-sm font-medium rounded-xl text-center transition-colors hover:bg-bg-hover disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Cancel
              </button>
              <button
                onClick={handleWriteDesignPrompt}
                disabled={!writeDesignTopic.trim() || isWritingDesign}
                className="flex-1 px-4 py-2.5 bg-accent-bg text-accent-text text-sm font-medium rounded-xl text-center transition-colors hover:bg-accent-bg/90 disabled:opacity-50 flex justify-center items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                {isWritingDesign ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Writing...
                  </>
                ) : "Generate Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
  `;
  const endDiv = '    </div>\n  );\n}';
  content = content.replace(endDiv, modalHtml + endDiv);

  // Add Loader2 import if missing
  if (!content.includes('Loader2')) {
    content = content.replace('import { Play, Square, Settings, Upload, Check, ChevronDown, Wand2, Sparkles, AlertCircle } from "lucide-react";', 'import { Play, Square, Settings, Upload, Check, ChevronDown, Wand2, Sparkles, AlertCircle, Loader2 } from "lucide-react";');
  }

  // Change title
  content = content.replace('<h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">Voice Generation</h1>', '<h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">Voice Design</h1>');

  fs.writeFileSync('src/app/voice-design/page.tsx', content);
}

setupVoiceDesign();
