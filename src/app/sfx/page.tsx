"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Download, Terminal, X, Key, Wand2, AudioLines, Shield, Info, Check, Sun, Moon } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { CustomModelSelect, AVAILABLE_AI_MODELS } from "@/components/CustomModelSelect";
type Status = "idle" | "pushing" | "generating" | "downloading" | "complete" | "error";


const GenVoiceLogo = ({ size = 24, className = "", animate = false }) => {
  const delays = ["0s", "0.15s", "0.3s", "0.15s", "0s"];
  const eqClasses = ["animate-eq-1", "animate-eq-2", "animate-eq-5", "animate-eq-3", "animate-eq-4"];
  const bars = [
    { x: 22,  y: 75,  h: 50,  opacity: 0.55 },
    { x: 56,  y: 55,  h: 90,  opacity: 0.80 },
    { x: 90,  y: 35,  h: 130, opacity: 1    },
    { x: 124, y: 55,  h: 90,  opacity: 0.80 },
    { x: 158, y: 75,  h: 50,  opacity: 0.55 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`gvl-bg-${size}`} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#232326"/>
          <stop offset="100%" stopColor="#0A0A0B"/>
        </radialGradient>
        <linearGradient id={`gvl-bar-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor="#C9C9CE"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="200" rx="44" fill={`url(#gvl-bg-${size})`}/>
      <rect x="1" y="1" width="198" height="198" rx="43" fill="none" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="2"/>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x} y={b.y} width="20" height={b.h} rx="10"
          fill={`url(#gvl-bar-${size})`}
          opacity={b.opacity}
          className={animate ? eqClasses[i] : ""}
          style={animate ? { animationDelay: delays[i], transformOrigin: `${b.x + 10}px ${b.y + b.h / 2}px` } : {}}
        />
      ))}
    </svg>
  );
};


export default function SFXStudio() {
  const [prompt, setPrompt] = useState(() => typeof window !== "undefined" ? localStorage.getItem("sfx_prompt") || "" : "");
  useEffect(() => { localStorage.setItem("sfx_prompt", prompt); }, [prompt]);
  const [status, setStatus] = useState<Status>("idle");
  const [audioUrl, setAudioUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [aiModel, setAiModel] = useState("google/gemini-3.7-flash");

  const [kaggleUsername, setKaggleUsername] = useState("");
  const [kaggleKey, setKaggleKey] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [canCancelAuth, setCanCancelAuth] = useState(false);
  const [authMode, setAuthMode]   = useState<'byok' | 'admin'>('byok');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyScreen, setVerifyScreen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'pending' | 'internet' | 'gpu' | 'success' | 'error'>('pending');
  const [verifyError, setVerifyError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("sfx_logs");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  useEffect(() => { sessionStorage.setItem("sfx_logs", JSON.stringify(logs)); }, [logs]);
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
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem('kaggleUsername');
    const storedKey = localStorage.getItem('kaggleKey');
    const storedPass = localStorage.getItem('appPassword');
    
    if (storedUsername) setKaggleUsername(storedUsername);
    if (storedKey) setKaggleKey(storedKey);

    if ((storedUsername && storedKey) || storedPass) {
      setHasCredentials(true);
    } else {
    }
    
    setIsDark(document.documentElement.classList.contains('dark'));
    
    const storedAiModel = localStorage.getItem('aiModel');
    if (storedAiModel && AVAILABLE_AI_MODELS.includes(storedAiModel)) setAiModel(storedAiModel);
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
        aiModel: aiModel
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
      const info = data.chunksTotal > 0 ? ` (${data.chunksCurrent}/${data.chunksTotal})` : "";
      addLog(`${(data.status || "unknown").toUpperCase()}${info}`);
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
        aiModel: aiModel
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
        body: JSON.stringify({ prompt, kaggleUsername, kaggleKey })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addLog(`Kernel: ${data.kernel}`);
      kernelRef.current = data.kernel;
      localStorage.setItem('sfx_kernel', data.kernel);
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
      url.searchParams.append('kernel',   kernelRef.current);
      url.searchParams.append('username', kaggleUsername);
      url.searchParams.append('key',      kaggleKey);

      const res  = await fetch(url.toString());
      const data = await res.json();

      if (data.status) {
        addLog(`Polling status: ${(data.rawStatus || data.status || 'unknown').toUpperCase()}`);
      }

      if (data.status === 'done') {
        addLog('Complete! Building audio URL...');
        setStatus('downloading');
        // Build the edge-streaming URL – no bytes pass through Vercel
        const signRes = await fetch('/api/sign-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: kaggleUsername,
            slug: kernelRef.current.split('/')[1] || kernelRef.current,
            file: 'sfx_output.wav',
            key: kaggleKey
          })
        });
        const { token } = await signRes.json();
        const audioStreamUrl = `/api/audio?token=${token}&t=${Date.now()}`;
        setAudioUrl(audioStreamUrl);
        addLog('Audio ready.');
        setStatus('complete');
        localStorage.removeItem('sfx_kernel');
      } else if (data.status === 'failed' || data.error) {
        throw new Error(data.error || 'Generation failed.');
      } else {
        if (!isStoppedRef.current) {
          setTimeout(pollStatus, 8000);
        }
      }
    } catch (err: any) {
      if (!isStoppedRef.current) {
        addLog(`ERROR: ${err.message}`);
        setStatus('error');
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
    }
  };

  if (!hasCredentials) {
    if (verifyScreen) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base text-text-primary p-6 animate-in fade-in duration-500 overflow-y-auto">
          <div className="max-w-xl w-full bg-bg-panel border border-border-color rounded-3xl p-8 sm:p-10 shadow-xl my-auto flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 mb-4">
              <GenVoiceLogo size={48} animate={verifyStatus === 'pending' || verifyStatus === 'internet' || verifyStatus === 'gpu'} />
              <h1 className="text-xl font-semibold tracking-tight mt-2">Verifying Kaggle Environment</h1>
              <p className="text-sm text-text-muted text-center leading-relaxed">This takes about 30-60 seconds as a test kernel is provisioned.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-bg-input rounded-xl border border-border-color">
                <span className="font-medium text-sm text-text-primary">Outbound Internet Access</span>
                {verifyStatus === 'pending' || verifyStatus === 'internet' ? (
                  <Loader2 size={16} className="animate-spin text-text-muted" />
                ) : verifyStatus === 'gpu' || verifyStatus === 'success' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <X size={16} className="text-red-500" />
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-bg-input rounded-xl border border-border-color">
                <span className="font-medium text-sm text-text-primary">GPU Allocation (Quota & T4)</span>
                {verifyStatus === 'pending' || verifyStatus === 'internet' ? (
                   <Loader2 size={16} className="animate-spin text-text-muted" />
                ) : verifyStatus === 'gpu' ? (
                  <Loader2 size={16} className="animate-spin text-text-muted" />
                ) : verifyStatus === 'success' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <X size={16} className="text-red-500" />
                )}
              </div>
            </div>

            {verifyStatus === 'error' && (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                  <strong className="font-semibold">Verification Failed: </strong>
                  {verifyError}
                </div>

                <div className="p-5 bg-accent-bg/5 border border-accent-bg/10 rounded-xl text-sm text-text-secondary">
                  <p className="font-medium text-text-primary mb-3 text-base">How to fix this:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Go to <a href="https://www.kaggle.com/settings" target="_blank" rel="noreferrer" className="text-accent-bg hover:underline font-medium">kaggle.com/settings</a></li>
                    <li>Find <strong>"Phone verify"</strong> under Phone verification and complete the steps to unlock internet access.</li>
                    <li>Make sure you haven't exceeded your weekly 30-hour free GPU quota.</li>
                  </ol>
                </div>

                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => {
                      setVerifyScreen(false);
                      setIsVerifying(false);
                    }}
                    className="flex-1 bg-bg-input text-text-primary font-medium py-3.5 rounded-xl hover:bg-bg-hover transition-all shadow-sm flex items-center justify-center gap-2 border border-border-color"
                  >
                    Go Back
                  </button>
                  <button 
                    onClick={async () => {
                      // Just re-trigger the same onClick flow from the start button
                      setVerifyStatus('pending');
                      setVerifyError("");
                      
                      try {
                        const startRes = await fetch('/api/verifyKaggleStart', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ kaggleUsername, kaggleKey })
                        });
                        const startData = await startRes.json();
                        
                        if (!startRes.ok) {
                          throw new Error(startData.error || "Failed to start verification process.");
                        }
                        
                        setVerifyStatus('internet');
                        const ref = startData.ref;
                        
                        let polling = true;
                        let attempts = 0;
                        while (polling) {
                          attempts++;
                          if (attempts > 30) {
                            polling = false;
                            setVerifyStatus('error');
                            setVerifyError("Verification timed out after 2 minutes.");
                            break;
                          }
                          const statusRes = await fetch('/api/verifyKaggleStatus', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ kaggleUsername, kaggleKey, ref })
                          });
                          
                          const statusData = await statusRes.json();
                          
                          if (statusData.status === 'running') {
                            await new Promise(r => setTimeout(r, 4000));
                          } else if (statusData.status === 'complete') {
                            polling = false;
                            const results = statusData.results;
                            if (results.internet) {
                              setVerifyStatus('gpu');
                            }
                            
                            if (results.internet && results.gpu) {
                              setVerifyStatus('success');
                              setTimeout(() => {
                                setVerifyScreen(false);
                                setIsVerifying(false);
                                localStorage.setItem('kaggleUsername', kaggleUsername);
                                localStorage.setItem('kaggleKey', kaggleKey);
                                localStorage.removeItem('appPassword');
                                setPassword('');
                                setHasCredentials(true);
                                setStatus("idle");
                                setMessage("");
                              }, 1000);
                            } else {
                              setVerifyStatus('error');
                              setVerifyError(results.error || "Verification failed. Internet or GPU not available.");
                            }
                          } else {
                            polling = false;
                            setVerifyStatus('error');
                            setVerifyError(statusData.error || "Failed to complete verification.");
                          }
                        }
                      } catch (e: any) {
                        setVerifyStatus('error');
                        setVerifyError(e.message);
                      }
                    }}
                    className="flex-1 bg-accent-bg text-accent-text font-medium py-3.5 rounded-xl hover:bg-accent-bg/90 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Retry Verification
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base text-text-primary p-6 animate-in fade-in duration-500 overflow-y-auto">
        <div className={`max-w-xl w-full bg-bg-panel border border-border-color rounded-3xl p-8 sm:p-10 shadow-xl my-auto ${status === 'error' ? 'animate-shake' : ''} relative`}>
          
          {canCancelAuth && !verifyScreen && (
            <button
              onClick={() => {
                setKaggleUsername(localStorage.getItem('kaggleUsername') || '');
                setKaggleKey(localStorage.getItem('kaggleKey') || '');
                setPassword(localStorage.getItem('appPassword') || '');
                setHasCredentials(true);
              }}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}

          <div className="flex flex-col items-center gap-3 mb-8">
            <GenVoiceLogo size={48} />
            <h1 className="text-2xl font-semibold tracking-tight mt-2">Welcome to GenVoice</h1>
            <p className="text-sm text-text-muted text-center leading-relaxed">Choose how you want to authenticate to run your inferences.</p>
          </div>

          <div className="flex bg-bg-input p-1 rounded-lg border border-border-color mb-8">
            <button 
              onClick={() => setAuthMode('byok')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring-color ${authMode === 'byok' ? 'bg-bg-panel text-text-primary shadow-sm border border-border-color' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}
            >
              Your Own Kaggle
            </button>
            <button 
              onClick={() => setAuthMode('admin')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring-color ${authMode === 'admin' ? 'bg-bg-panel text-text-primary shadow-sm border border-border-color' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}
            >
              Admin Access
            </button>
          </div>

          {authMode === 'byok' ? (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-accent-bg/5 border border-accent-bg/10 rounded-xl flex items-start gap-3 text-xs text-text-secondary leading-relaxed mb-2">
                <Info size={16} className="text-accent-bg shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-text-primary">How to get your credentials:</span>
                  <ol className="list-decimal pl-3.5 space-y-1 text-text-muted">
                    <li>Create an account at <a href="https://www.kaggle.com" target="_blank" rel="noreferrer" className="text-accent-bg underline underline-offset-2 hover:opacity-80">kaggle.com</a></li>
                    <li><strong>Important:</strong> You must verify your phone number. This is required by Kaggle to allow internet access (to download the AI models) and to use their free GPUs. Go to <a href="https://www.kaggle.com/settings" target="_blank" rel="noreferrer" className="text-accent-bg underline underline-offset-2 hover:opacity-80">kaggle.com/settings</a>, find <strong>"Phone verify"</strong> under Phone verification, and follow the steps.</li>
                    <li>On the same settings page, your username is listed under <strong>"Your username"</strong>.</li>
                    <li>Then go to <a href="https://www.kaggle.com/settings/api" target="_blank" rel="noreferrer" className="text-accent-bg underline underline-offset-2 hover:opacity-80">kaggle.com/settings/api</a>.</li>
                    <li>Click <strong>"Create New Token"</strong>, enter <strong>"GenVoice"</strong> as the Token Name, click <strong>Generate</strong>, and copy the API Key.</li>
                  </ol>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Kaggle Username"
                  value={kaggleUsername}
                  onChange={e => setKaggleUsername(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-color focus-visible:ring-2 focus-visible:ring-ring-color transition-all shadow-sm"
                />
                <input
                  type="password"
                  placeholder="Kaggle API Key"
                  value={kaggleKey}
                  onChange={e => setKaggleKey(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-color focus-visible:ring-2 focus-visible:ring-ring-color transition-all shadow-sm"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-bg-hover border border-border-color rounded-xl flex items-start gap-3 text-xs text-text-secondary leading-relaxed mb-2">
                <Shield size={16} className="text-text-muted shrink-0 mt-0.5" />
                <span>Access the shared hosted instance. This requires the master App Password.</span>
              </div>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="App Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-color focus-visible:ring-2 focus-visible:ring-ring-color transition-all shadow-sm"
                />
              </div>
            </div>
          )}

          <button
            disabled={isVerifying}
            onClick={async () => {
              if (authMode === 'byok' && kaggleUsername && kaggleKey) {
                setIsVerifying(true);
                setVerifyScreen(true);
                setVerifyStatus('pending');
                setVerifyError("");
                
                try {
                  const startRes = await fetch('/api/verifyKaggleStart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kaggleUsername, kaggleKey })
                  });
                  const startData = await startRes.json();
                  
                  if (!startRes.ok) {
                    throw new Error(startData.error || "Failed to start verification process.");
                  }
                  
                  setVerifyStatus('internet');
                  const ref = startData.ref;
                  
                  // Start polling
                  let polling = true;
                  let attempts = 0;
                  while (polling) {
                    attempts++;
                    if (attempts > 30) {
                      polling = false;
                      setVerifyStatus('error');
                      setVerifyError("Verification timed out after 2 minutes.");
                      break;
                    }
                    const statusRes = await fetch('/api/verifyKaggleStatus', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kaggleUsername, kaggleKey, ref })
                    });
                    
                    const statusData = await statusRes.json();
                    
                    if (statusData.status === 'running') {
                      await new Promise(r => setTimeout(r, 4000));
                    } else if (statusData.status === 'complete') {
                      polling = false;
                      const results = statusData.results;
                      if (results.internet) {
                        setVerifyStatus('gpu');
                      }
                      
                      if (results.internet && results.gpu) {
                        setVerifyStatus('success');
                        setTimeout(() => {
                          setVerifyScreen(false);
                          setIsVerifying(false);
                          localStorage.setItem('kaggleUsername', kaggleUsername);
                          localStorage.setItem('kaggleKey', kaggleKey);
                          localStorage.removeItem('appPassword');
                          setPassword('');
                          setHasCredentials(true);
                          setStatus("idle");
                          setMessage("");
                        }, 1000);
                      } else {
                        setVerifyStatus('error');
                        setVerifyError(results.error || "Verification failed. Internet or GPU not available.");
                      }
                    } else {
                      polling = false;
                      setVerifyStatus('error');
                      setVerifyError(statusData.error || "Failed to complete verification.");
                    }
                  }
                } catch (e: any) {
                  setVerifyStatus('error');
                  setVerifyError(e.message);
                }
              } else if (authMode === 'admin' && password) {
                setIsVerifying(true);
                try {
                  const res = await fetch('/api/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                  });
                  if (!res.ok) {
                    throw new Error("Invalid admin password");
                  }
                  localStorage.setItem('appPassword', password);
                  localStorage.removeItem('kaggleUsername');
                  localStorage.removeItem('kaggleKey');
                  setKaggleUsername('');
                  setKaggleKey('');
                  setHasCredentials(true);
                  setStatus("idle");
                  setMessage("");
                } catch (e: any) {
                  setMessage(e.message);
                  setStatus("error");
                  setTimeout(() => setStatus("idle"), 3000);
                } finally {
                  setIsVerifying(false);
                }
              } else {
                setMessage("Please fill in all required fields.");
                setStatus("error");
                setTimeout(() => setStatus("idle"), 3000);
              }
            }}
            className="w-full mt-8 bg-accent-bg text-accent-text font-medium py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : null}
            {isVerifying ? "Verifying..." : "Enter Studio"}
          </button>
          
          {status === 'error' && <p className="text-red-400 text-xs text-center mt-4 animate-in fade-in">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-bg-base text-text-primary selection:bg-accent-bg/20 selection:text-text-primary">
      
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="h-16 px-6 flex items-center justify-end border-b border-border-color shrink-0 relative z-50">
        <div className="flex items-center gap-4 z-10">

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border-color bg-bg-panel/50">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">AI Model:</span>
            <CustomModelSelect
              value={aiModel}
              onChange={(val) => {
                setAiModel(val);
                localStorage.setItem('aiModel', val);
              }}
              options={AVAILABLE_AI_MODELS}
              className="w-[180px]"
            />
          </div>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={() => {
              setHasCredentials(false);
              setCanCancelAuth(true);
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
        <div className="w-full max-w-3xl mx-auto px-6 py-10 space-y-8">
          
          {/* Description Card */}
          <div className="p-4 bg-accent-bg/5 border border-accent-bg/10 rounded-2xl flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
            <AudioLines size={16} className="text-accent-bg shrink-0 mt-0.5" />
            <span>
              <strong>Sound Effects Generation</strong> creates high-quality cinematic sound effects using Stable Audio Open 1.0, powered by zero-cost Kaggle GPUs. Describe an acoustic environment, tone, or texture.
            </span>
          </div>

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
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-base border border-border-color rounded-xl text-sm font-medium text-text-primary hover:bg-bg-hover transition-all disabled:opacity-50 outline-none w-full sm:w-auto whitespace-nowrap"
                  >
                    <Sparkles size={16} className="text-accent-bg" />
                    AI Write Prompt
                  </button>
                  <button
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing || !prompt.trim() || (status !== "idle" && status !== "complete" && status !== "error")}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-base border border-border-color rounded-xl text-sm font-medium text-text-primary hover:bg-bg-hover transition-all disabled:opacity-50 outline-none w-full sm:w-auto whitespace-nowrap"
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
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2.5 rounded-xl font-semibold hover:bg-red-500/20 transition-all outline-none whitespace-nowrap"
                    >
                      <X size={16} /> Stop
                    </button>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || (status !== "idle" && status !== "complete" && status !== "error")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-text-primary text-bg-base px-6 py-2.5 rounded-xl font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 outline-none whitespace-nowrap"
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
