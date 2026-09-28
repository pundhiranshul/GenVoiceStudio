"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Download, Terminal, X, Key, Wand2, AudioLines } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";

type Status = "idle" | "pushing" | "generating" | "downloading" | "complete" | "error";

export default function SFXStudio() {
  const [prompt, setPrompt] = useState(() => typeof window !== "undefined" ? sessionStorage.getItem("sfx_prompt") || "" : "");
  useEffect(() => { sessionStorage.setItem("sfx_prompt", prompt); }, [prompt]);
  const [status, setStatus] = useState<Status>("idle");
  const [audioUrl, setAudioUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [kaggleUsername, setKaggleUsername] = useState("");
  const [kaggleKey, setKaggleKey] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [showStopModal, setShowStopModal] = useState(false);
  const isStoppedRef = useRef(false);

  const [chunksCurrent, setChunksCurrent] = useState(0);
  const [chunksTotal, setChunksTotal] = useState(0);
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState("");
  
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeTopic, setWriteTopic] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState("");

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
  
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== 'idle' && status !== 'complete' && status !== 'error') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    (window as any).isGenerating = (status !== "idle" && status !== "complete" && status !== "error");
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    setOptimizeError("");
    try {
      const payload: any = {
        text: prompt,
        instruction: "Optimize this prompt for Stable Audio Open 1.0 sound effect generation. Enhance it by adding descriptive words about the acoustic environment, tone, and texture. Keep it under 2 sentences.",
        aiModel: "google/gemini-3.7-flash"
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
      
      setPrompt(data.optimizedText);
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
        instruction: "You are an expert sound designer. Write a highly detailed, cinematic prompt for Stable Audio Open 1.0 based on the user's premise. Describe the acoustic environment, tone, and texture. Just output the prompt itself, nothing else. Keep it under 2 sentences.",
        aiModel: "google/gemini-3.7-flash"
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
      
      setPrompt(data.optimizedText);
      setShowWriteModal(false);
      setWriteTopic("");
    } catch (err: any) {
      setWriteError(err.message);
    } finally {
      setIsWriting(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!hasCredentials) {
      setShowAuth(true);
      return;
    }

    setStatus("pushing");
    setErrorMsg("");
    setAudioUrl("");
    setLogs([]); addLog("Initializing...");
    setChunksCurrent(0);
    setChunksTotal(0);
    isStoppedRef.current = false;
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

      addLog(`Kernel: ${data.kernel}`);
      kernelRef.current = data.kernel;
      setStatus("generating");
      pollStatus();

    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const pollStatus = async () => {
    if (isStoppedRef.current) return;
    if (!kernelRef.current) return;
    
    try {
      const url = new URL('/api/status', window.location.origin);
      url.searchParams.append('kernel', kernelRef.current);
      url.searchParams.append('kaggleUsername', kaggleUsername);
      url.searchParams.append('kaggleKey', kaggleKey);

      addLog("Polling status...");
      const res = await fetch(url.toString());
      const data = await res.json();
      
      
      
      if (data.chunksTotal > 0) {
        setChunksCurrent(data.chunksCurrent);
        setChunksTotal(data.chunksTotal);
      }

      if (data.status === 'complete') {
        addLog("Complete! Fetching audio...");
        setStatus("downloading");
        if (data.audios && data.audios.length > 0) {
          setAudioUrl(data.audios[0].data);
          addLog("Audio ready.");
          setStatus("complete");
        } else {
          throw new Error("No audio returned from Kaggle.");
        }
      } else if (data.status === 'error' || data.error) {
        throw new Error(data.error || "Generation failed on Kaggle.");
      } else {
        if (!isStoppedRef.current) {
          setTimeout(pollStatus, 8000);
        }
      }
    } catch (err: any) {
      if (!isStoppedRef.current) {
        addLog(`ERROR: ${err.message}`);
        setStatus("error");
        setErrorMsg(err.message);
      }
    }
  };

  const stopRun = () => {
    setShowStopModal(true);
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
    <div className="flex flex-col h-[100dvh] md:h-screen bg-bg-base text-text-primary selection:bg-accent-bg/20 selection:text-text-primary animate-in fade-in duration-700">
      
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="h-16 px-6 flex items-center justify-end border-b border-border-color shrink-0 relative z-50">
        <div className="flex items-center gap-4 z-10">
          <button
            onClick={() => {
              setHasCredentials(false);
              setShowAuth(true);
            }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            aria-label="Change Credentials"
          >
            <Key size={14} />
            <span className="hidden sm:inline">Auth</span>
          </button>
        </div>
      </header>

      {/* ── Main Canvas ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 md:overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto p-6 md:p-10 space-y-8">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <AudioLines className="text-accent-bg" size={28} />
              Sound Effects Generation
            </h1>
            <p className="text-text-secondary leading-relaxed">
              Generate high-quality cinematic sound effects using Stable Audio Open 1.0, powered by zero-cost Kaggle GPUs.
            </p>
          </div>

          {/* Auth Section */}
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
            
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border-color/50">
              {optimizeError && <p className="text-xs text-red-500">{optimizeError}</p>}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* Left Controls (AI Optimize/Write) */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => { setShowWriteModal(true); setWriteError(""); }}
                    disabled={status !== "idle" && status !== "complete" && status !== "error"}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-base border border-border-color rounded-xl text-sm font-medium text-text-primary hover:bg-bg-hover transition-all disabled:opacity-50 outline-none w-full sm:w-auto"
                  >
                    <Sparkles size={16} className="text-accent-bg" />
                    AI Write Prompt
                  </button>
                  <button
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing || !prompt.trim() || (status !== "idle" && status !== "complete" && status !== "error")}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-base border border-border-color rounded-xl text-sm font-medium text-text-primary hover:bg-bg-hover transition-all disabled:opacity-50 outline-none w-full sm:w-auto"
                  >
                    {isOptimizing ? <Loader2 size={16} className="animate-spin text-accent-bg" /> : <Wand2 size={16} className="text-accent-bg" />}
                    AI Optimize
                  </button>
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wider hidden sm:block">
                    {prompt.length} chars
                  </div>
                </div>
                
                {/* Right Controls (Generate / Stop) */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {(status === "pushing" || status === "generating" || status === "downloading") && (
                    <button
                      onClick={stopRun}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2.5 rounded-xl font-semibold hover:bg-red-500/20 transition-all outline-none"
                    >
                      <X size={16} /> Stop
                    </button>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || (status !== "idle" && status !== "complete" && status !== "error")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-text-primary text-bg-base px-6 py-2.5 rounded-xl font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 outline-none"
                  >
                    {(status === "idle" || status === "complete" || status === "error") && <><Sparkles size={16} /> Generate SFX</>}
                    {(status === "pushing" || status === "generating" || status === "downloading") && <><Loader2 size={16} className="animate-spin" /> {status === "pushing" ? "Starting GPU..." : "Generating..."}</>}
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              {status === "generating" && chunksTotal > 0 && (
                <div className="w-full flex flex-col gap-1.5 mt-2 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center text-xs font-medium text-text-secondary px-1">
                    <span className="flex items-center gap-2 text-accent-text bg-accent-bg/10 px-2 py-0.5 rounded-md">
                      <Loader2 size={12} className="animate-spin" /> Inference (Step {chunksCurrent}/{chunksTotal})
                    </span>
                    <span>{Math.round((chunksCurrent / chunksTotal) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-bg-base border border-border-color rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-accent-bg/5" />
                    <div 
                      className="h-full bg-accent-bg rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--accent-bg),0.5)]"
                      style={{ width: `${(chunksCurrent / chunksTotal) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {status === "error" && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm animate-in fade-in">
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
                    name="SFX_Output.wav"
                  />
                </div>
                <a
                  href={audioUrl}
                  download={`sfx_${prompt.substring(0, 15).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`}
                  className="flex items-center justify-center gap-2 px-4 py-3 sm:py-0 h-12 w-full sm:w-auto shrink-0 bg-bg-base border border-border-color rounded-xl hover:bg-bg-hover hover:text-text-primary transition-colors outline-none font-medium text-sm"
                >
                  <Download size={16} />
                  Download
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer & Dev Logs ─────────────────────────────────────── */}
      <footer className="h-8 flex items-center justify-between px-6 border-t border-border-color bg-bg-base shrink-0 relative z-20">
        <span className="text-[10px] text-text-muted">
          Built by <a href="https://github.com/pundhiranshul" target="_blank" rel="noreferrer" className="text-text-secondary hover:text-text-primary transition-colors underline decoration-white/20 underline-offset-2">Anshul Pundhir</a>
        </span>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color rounded"
        >
          <Terminal size={12} />
          {showLogs ? "Hide Dev Logs" : "Show Dev Logs"}
        </button>
      </footer>

      {/* Floating Logs Drawer (Dev Only) */}
      {showLogs && (
        <div className="fixed bottom-8 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[300px] bg-bg-panel border border-border-color rounded-t-xl rounded-bl-xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-8 fade-in duration-200">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 font-mono text-[10px]">
            {logs.length === 0
              ? <span className="text-text-muted">Waiting for logs...</span>
              : logs.map((log, i) => (
                <div key={i} className="leading-relaxed text-text-secondary break-words">
                  <span className="text-text-muted">{log.slice(0, 11)}</span>{log.slice(11)}
                </div>
              ))}
            <div ref={logsEndRef}/>
          </div>
        </div>
      )}

      {/* Stop Run Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-bg-panel border border-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-red-500/10">
              <div className="flex items-center gap-2 text-red-500 font-medium">
                <X size={18} /> Stop Generation
              </div>
              <button 
                onClick={() => setShowStopModal(false)}
                className="text-text-muted hover:text-text-primary transition-colors outline-none"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 text-sm text-text-secondary leading-relaxed space-y-4">
              <p>
                Programmatic stopping is not supported by Kaggle. To stop generation, please open Kaggle, look in the <strong className="text-text-primary">bottom left corner</strong> and click <strong className="text-text-primary">View Active Events</strong>.
              </p>
              <p>
                You will see <strong className="text-text-primary">genvoice-sfx-generator</strong> running. Click the three dots and select <strong className="text-text-primary">Stop Session</strong>.
              </p>
              <p>
                Once stopped, the studio will detect the cancellation automatically.
              </p>
            </div>
            
            <div className="p-4 border-t border-border-subtle bg-bg-input flex justify-end gap-3">
              <button 
                onClick={() => setShowStopModal(false)}
                className="px-4 py-2 rounded-lg bg-bg-panel text-text-primary font-medium hover:bg-bg-hover border border-border-color transition-colors"
              >
                Close
              </button>
              <a 
                href="https://www.kaggle.com"
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowStopModal(false)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Open Kaggle
              </a>
            </div>
          </div>
        </div>
      )}

      {/* AI Write Prompt Modal */}
      {showWriteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-bg-panel w-full max-w-lg rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Sparkles size={20} className="text-accent-bg" /> AI Write Prompt
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Vaguely describe your idea and the AI will augment it into a highly detailed cinematic prompt for Stable Audio.
              </p>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">Topic / Premise</label>
                <textarea
                  value={writeTopic}
                  onChange={e => setWriteTopic(e.target.value)}
                  placeholder="e.g. magical fairy dust in a quiet forest..."
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

    </div>
  );
}
