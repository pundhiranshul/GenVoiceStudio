'use client';

import { useState, useEffect } from 'react';
import { getHistory, HistoryItem, deleteHistoryItem, clearHistory, getHistoryEnabled, setHistoryEnabled } from '@/lib/history';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Trash2, Mic, Wand2, AudioLines, Settings, Library } from 'lucide-react';

export default function LibraryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const history = await getHistory();
    setItems(history);
    const isEnabled = await getHistoryEnabled();
    setEnabled(isEnabled);
    setLoading(false);
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnabled(e.target.checked);
    setHistoryEnabled(e.target.checked);
  };

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id);
    setItems(items.filter(i => i.id !== id));
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear your entire local library? This cannot be undone.")) {
      await clearHistory();
      setItems([]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'voice': return <Mic size={16} />;
      case 'design': return <Wand2 size={16} />;
      case 'sfx': return <AudioLines size={16} />;
      default: return <Mic size={16} />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'voice': return 'Voice Clone';
      case 'design': return 'Voice Design';
      case 'sfx': return 'Sound Effect';
      default: return 'Generation';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-base flex flex-col items-center">
      <div className="w-full max-w-4xl p-6 md:p-12 pb-24 md:pb-12 pt-20 md:pt-12 space-y-8 animate-in fade-in duration-500 relative">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-bg/10 flex items-center justify-center border border-accent-bg/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <Settings size={20} className="text-text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">Local Library</h1>
              <p className="text-text-secondary text-sm md:text-base max-w-xl leading-relaxed mt-1">
                All your generated audio and metadata is stored locally on your device in the browser's secure IndexedDB storage. It never touches our cloud.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 border border-border-color rounded-xl bg-bg-panel/50 mt-2">
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary">Save Generations to Library</h3>
              <p className="text-xs text-text-secondary">Automatically save new Voice Clones, Voice Designs, and Sound Effects to this local history.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={handleToggle} className="sr-only peer" />
              <div className="w-11 h-6 bg-border-color peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bg"></div>
            </label>
          </div>

          <div className="flex items-center gap-4 p-4 border border-border-color rounded-xl bg-bg-panel/50 mt-2">
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary">Show Library in Custom Voices</h3>
              <p className="text-xs text-text-secondary">Automatically populate the Custom Voices dropdown with voices generated and saved in this library.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={typeof window !== "undefined" ? localStorage.getItem('populateFromLibrary') !== 'false' : true} 
                onChange={(e) => {
                  localStorage.setItem('populateFromLibrary', String(e.target.checked));
                  // force re-render
                  setEnabled(enabled);
                }} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-border-color peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bg"></div>
            </label>
          </div>
        </header>

        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <h2 className="text-lg font-semibold text-text-primary">Your History</h2>
          {items.length > 0 && (
            <button 
              onClick={handleClear}
              className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-text-secondary text-center py-12">Loading local library...</div>
        ) : items.length === 0 ? (
          <div className="text-text-muted text-center py-20 flex flex-col items-center gap-3">
            <Library size={48} className="opacity-20" />
            <p>Your library is empty.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.id} className="p-5 border border-border-color rounded-2xl bg-bg-panel/50 space-y-4 shadow-sm hover:border-border-color/80 transition-colors relative group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-bg-base border border-border-color rounded-md text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                      {getIcon(item.type)}
                      {getLabel(item.type)}
                    </span>
                    <span className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete from Library"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {item.name && (
                  <div className="text-sm font-semibold text-text-primary mb-1">
                    {item.name}
                  </div>
                )}
                {item.prompt && (
                  <div className="text-sm font-medium text-text-primary">
                    <span className="text-xs text-text-muted uppercase tracking-wider block mb-1">Prompt</span>
                    {item.prompt}
                  </div>
                )}
                
                {item.text && (
                  <div className="text-sm text-text-secondary italic border-l-2 border-border-color pl-3">
                    {item.text}
                  </div>
                )}

                <div className="pt-2">
                  <AudioPlayer 
                    src={URL.createObjectURL(item.audioBlob)} 
                    name={`genvoice_${item.type}_${item.id}.wav`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
