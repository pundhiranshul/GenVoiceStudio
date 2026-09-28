"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Play, Download, Square, Check, Key } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";

type Status = "idle" | "pushing" | "generating" | "downloading" | "complete" | "error";

export default function SFXStudio() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [audioUrl, setAudioUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [kaggleUsername, setKaggleUsername] = useState("");
  const [kaggleKey, setKaggleKey] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  const kernelRef = useRef<string | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('kaggleUsername');
    const storedKey = localStorage.getItem('kaggleKey');
    const storedPass = localStorage.getItem('appPassword');
    
    if (storedUsername) setKaggleUsername(storedUsername);
    if (storedKey) setKaggleKey(storedKey);

    if ((storedUsername && storedKey) || storedPass) {
      setHasCredentials(true);
    } else {
      setShowAuth(true);
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!hasCredentials) {
      setShowAuth(true);
      return;
    }

    setStatus("pushing");
    setErrorMsg("");
    setAudioUrl("");
    kernelRef.current = null;

    try {
      const res = await fetch('/api/sfx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          kaggleUsername,
          kaggleKey
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      kernelRef.current = data.kernel;
      setStatus("generating");
      pollStatus();

    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  const pollStatus = async () => {
    if (!kernelRef.current) return;
    
    try {
      const url = new URL('/api/status', window.location.origin);
      url.searchParams.append('kernel', kernelRef.current);
      url.searchParams.append('kaggleUsername', kaggleUsername);
      url.searchParams.append('kaggleKey', kaggleKey);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.status === 'complete') {
        setStatus("downloading");
        if (data.audios && data.audios.length > 0) {
          // Assume the first audio is the SFX output
          setAudioUrl(data.audios[0].data);
          setStatus("complete");
        } else {
          throw new Error("No audio returned from Kaggle.");
        }
      } else if (data.status === 'error' || data.error) {
        throw new Error(data.error || "Generation failed on Kaggle.");
      } else {
        // Still running
        setTimeout(pollStatus, 8000);
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  const saveAuth = () => {
    if (kaggleUsername && kaggleKey) {
      localStorage.setItem('kaggleUsername', kaggleUsername);
      localStorage.setItem('kaggleKey', kaggleKey);
      setHasCredentials(true);
      setShowAuth(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base text-text-primary selection:bg-accent-bg/20 selection:text-text-primary animate-in fade-in duration-700 p-6 md:p-12 overflow-y-auto">
      
      <div className="max-w-3xl w-full mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Sparkles className="text-accent-bg" size={28} />
            SFX Studio
          </h1>
          <p className="text-text-secondary">Generate high-quality cinematic sound effects using Stable Audio Open 1.0, powered by your free Kaggle GPU.</p>
        </div>

        {/* Auth Section (if needed) */}
        {showAuth && !hasCredentials && (
          <div className="bg-bg-panel border border-border-color rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Key size={18} className="text-accent-bg" /> Kaggle Authentication
            </h3>
            <p className="text-sm text-text-secondary">SFX Generation requires a Kaggle account to run inference for free.</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Kaggle Username"
                className="w-full bg-bg-base border border-border-color rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ring-color outline-none"
                value={kaggleUsername}
                onChange={(e) => setKaggleUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Kaggle API Key"
                className="w-full bg-bg-base border border-border-color rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-ring-color outline-none"
                value={kaggleKey}
                onChange={(e) => setKaggleKey(e.target.value)}
              />
              <button
                onClick={saveAuth}
                className="w-full bg-text-primary text-bg-base font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Save Credentials
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-bg-panel border border-border-color rounded-2xl p-4 shadow-sm focus-within:ring-2 ring-ring-color transition-all">
          <textarea
            className="w-full h-32 bg-transparent resize-none outline-none text-lg leading-relaxed placeholder:text-text-muted"
            placeholder="Describe the sound effect... e.g. 'Cinematic explosion with sub-bass rumble'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={status !== "idle" && status !== "complete" && status !== "error"}
          />
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-color/50">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
              {prompt.length} chars
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || (status !== "idle" && status !== "complete" && status !== "error")}
              className="flex items-center gap-2 bg-text-primary text-bg-base px-6 py-2.5 rounded-xl font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 outline-none"
            >
              {status === "pushing" && <><Loader2 size={16} className="animate-spin" /> Pushing to Kaggle...</>}
              {status === "generating" && <><Loader2 size={16} className="animate-spin" /> Starting GPU & Generating...</>}
              {status === "downloading" && <><Loader2 size={16} className="animate-spin" /> Downloading Audio...</>}
              {(status === "idle" || status === "complete" || status === "error") && <><Sparkles size={16} /> Generate SFX</>}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {status === "error" && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {/* Result Area */}
        {status === "complete" && audioUrl && (
          <div className="bg-bg-panel border border-border-color rounded-2xl p-6 shadow-sm animate-in zoom-in-95 duration-500">
            <h3 className="font-semibold text-sm text-text-muted uppercase tracking-wider mb-4">Generated Sound Effect</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <AudioPlayer
                  src={audioUrl}
                  title="SFX Output"
                  onPlay={() => {}}
                  autoPlay={true}
                />
              </div>
              <a
                href={audioUrl}
                download={\`sfx_\${prompt.substring(0, 15).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav\`}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-0 h-12 w-full sm:w-auto shrink-0 bg-bg-base border border-border-color rounded-xl hover:bg-bg-hover hover:text-text-primary transition-colors outline-none font-medium text-sm"
              >
                <Download size={16} />
                Download
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
