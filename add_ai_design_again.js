const fs = require('fs');

function addAIFeaturesToVoiceDesign() {
  let content = fs.readFileSync('src/app/voice-design/page.tsx', 'utf8');

  // Fix syntax error at line 274: `} catch (e) {` without `try`
  // Actually, wait, let me just replace the syntax error manually.
  content = content.replace(
    `      setUploadError("");
      setShowUpload(true);
    } catch (e) {
      console.error("Failed to save voice:", e);
    }
  };`,
    `      setUploadError("");
      setShowUpload(true);
  };`
  );

  // 1. Add states
  const stateInsertPoint = 'const [designPrompt, setDesignPrompt] = useState("");';
  if (!content.includes('const [isOptimizing, setIsOptimizing]')) {
    content = content.replace(
      stateInsertPoint,
      `${stateInsertPoint}
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState("");
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeTopic, setWriteTopic] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState("");`
    );
  }

  // 2. Add handleOptimizePrompt and handleWritePrompt
  const functionsInsertPoint = 'const toggleTheme = () => {';
  const functionsCode = `
  const handleOptimizePrompt = async () => {
    if (!designPrompt.trim()) return;
    setIsOptimizing(true);
    setOptimizeError("");
    try {
      const payload: any = {
        text: designPrompt,
        instruction: "Optimize this prompt for Voice Design. Enhance it by adding descriptive words about the age, gender, accent, tone, and character. Keep it under 2 sentences.",
        aiModel: AVAILABLE_AI_MODELS[0]
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
      setOptimizeError(err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleWritePrompt = async () => {
    if (!writeTopic.trim()) return;
    setIsWriting(true);
    setWriteError("");
    try {
      const payload: any = {
        text: writeTopic,
        instruction: "You are an expert voice actor casting director. Write a highly detailed Voice Design instruction prompt based on the user's premise. Describe the age, gender, accent, tone, and character. Just output the prompt itself, nothing else. Keep it under 2 sentences.",
        aiModel: AVAILABLE_AI_MODELS[0]
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
      setShowWriteModal(false);
    } catch (err: any) {
      setWriteError(err.message);
    } finally {
      setIsWriting(false);
    }
  };
`;

  if (!content.includes('const handleOptimizePrompt = async () => {')) {
    content = content.replace(functionsInsertPoint, functionsCode + '\n  ' + functionsInsertPoint);
  }

  // 4. Add Write Prompt Modal
  const modalHtml = `
      {/* AI Write Prompt Modal */}
      {showWriteModal && (
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
                  value={writeTopic}
                  onChange={e => setWriteTopic(e.target.value)}
                  placeholder="e.g. A grumpy old wizard..."
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-text-muted resize-none transition-colors"
                  rows={3}
                />
              </div>
            </div>

            {writeError && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
                  <div className="break-words w-full flex flex-col gap-2">
                    <span>{writeError}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border-subtle bg-bg-base flex gap-3">
              <button
                onClick={() => setShowWriteModal(false)}
                disabled={isWriting}
                className="flex-1 px-4 py-2.5 bg-bg-input text-text-primary text-sm font-medium rounded-xl text-center transition-colors hover:bg-bg-hover disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Cancel
              </button>
              <button
                onClick={handleWritePrompt}
                disabled={!writeTopic.trim() || isWriting}
                className="flex-1 px-4 py-2.5 bg-accent-bg text-accent-text text-sm font-medium rounded-xl text-center transition-colors hover:bg-accent-bg/90 disabled:opacity-50 flex justify-center items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                {isWriting ? (
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
  
  if (!content.includes('AI Write Prompt Modal')) {
    const endDiv = '    </div>\n  );\n}';
    content = content.replace(endDiv, modalHtml + endDiv);
  }

  fs.writeFileSync('src/app/voice-design/page.tsx', content);
}

addAIFeaturesToVoiceDesign();
