import { Info, X } from "lucide-react";
import React from "react";

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-bg-panel border border-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-text-primary" />
            <h3 className="font-semibold text-text-primary tracking-tight">System Architecture</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
            <p>
              GenVoice Studio utilizes a robust, zero-cost, serverless architecture by leveraging HuggingFace inference integrated with Kaggle's free GPU compute.
            </p>
            <div className="space-y-4">
              <h4 className="font-semibold text-text-primary">1. Model Hosting (Kaggle Datasets)</h4>
              <p>
                To bypass slow internet downloads and HuggingFace API authentication, the multi-gigabyte Stable Audio Open and Breeze TTS models are hosted as static Kaggle Datasets. When a generation is requested, the Kaggle kernel mounts the dataset directly to the local filesystem (e.g. <code>/kaggle/input/</code>), resulting in instantaneous access to the model weights.
              </p>
              
              <h4 className="font-semibold text-text-primary">2. Execution Engine (Kaggle API)</h4>
              <p>
                The Next.js backend generates an ephemeral Python script containing the specific prompt and configuration. This script is pushed to the user's Kaggle account via the REST API using a "Script" kernel. The script forces `local_files_only=True` to ensure strict offline execution and sets `torch_dtype=torch.float16` to halve VRAM usage, preventing Out Of Memory (OOM) errors on Kaggle's T4 GPUs.
              </p>

              <h4 className="font-semibold text-text-primary">3. Asynchronous Polling</h4>
              <p>
                Since Kaggle kernels execute asynchronously, the GenVoice frontend enters a polling loop with the <code>/api/status</code> endpoint. Once the generation script completes and writes the `.wav` file to disk, the backend extracts the raw binary, converts it into a Base64 data URI, and delivers it back to the client for instant playback.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border-subtle flex justify-end bg-bg-panel/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-bg-input text-text-primary border border-border-color hover:bg-bg-hover font-medium rounded-lg transition-colors text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
