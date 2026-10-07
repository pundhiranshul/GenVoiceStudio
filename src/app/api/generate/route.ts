import { NextResponse } from 'next/server';
import notebookTemplate from './notebook.json';
import { sanitizeText } from '@/utils/sanitizeText';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { password, kaggleUsername, kaggleKey, text, referenceAudio, referenceText, instructions, guidanceScale } = body;

    if (text) {
      text = sanitizeText(text);
    }

    let username = kaggleUsername ? kaggleUsername.trim() : null;
    let token    = kaggleKey      ? kaggleKey.trim()      : null;
    let slug     = 'genvoice-api';

    if (username && token) {
      // Using custom credentials; bypass App Password check
    } else {
      if (password !== (process.env.APP_PASSWORD || 'secret')) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      username = process.env.KAGGLE_USERNAME || null;
      token    = process.env.KAGGLE_TOKEN || process.env.KAGGLE_KEY || null;
      slug     = process.env.KAGGLE_KERNEL_SLUG || 'genvoice-api';
    }

    if (!username || !token) {
      return NextResponse.json(
        { error: 'Kaggle credentials not provided or not configured on server.' },
        { status: 500 }
      );
    }

    // Clone the notebook template (clear previous outputs)
    const notebook = JSON.parse(JSON.stringify(notebookTemplate));
    if (notebook.cells) {
      notebook.cells.forEach((cell: any) => {
        if (cell.cell_type === 'code') {
          cell.outputs = [];
          cell.execution_count = null;
        }
      });
    }

    // Replace the setup cell with a clean, properly-structured source
    // This is done in TypeScript to avoid nested JSON/Python escaping nightmares
    for (const cell of notebook.cells) {
      if (cell.cell_type === 'code' && cell.source) {
        const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
        if (src.includes('copytree') && src.includes('breeze-tts')) {
          cell.source = [
            'import os, sys, subprocess, concurrent.futures\n',
            'from pathlib import Path\n',
            'os.environ["CUDA_LAUNCH_BLOCKING"] = "1"\n',
            'REPO_DIR = Path("/kaggle/working/breeze-tts")\n',
            'MODEL_DIR = Path("/kaggle/working/breeze-tts-2")\n\n',
            'def install_dependencies():\n',
            '    print("Cloning repository and installing dependencies...")\n',
            '    if not REPO_DIR.exists():\n',
            '        subprocess.run(["git", "clone", "https://github.com/breezeblue-ai/breeze-tts.git", str(REPO_DIR)], check=True)\n',
            '    subprocess.run(["sudo", "apt-get", "update", "-y", "-q"], check=False)\n',
            '    subprocess.run(["sudo", "apt-get", "install", "sox", "libsox-fmt-all", "-y", "-q"], check=False)\n',
            '    subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(REPO_DIR / "requirements.txt"), "sox", "onnxruntime", "-q"], check=False)\n',
            '    subprocess.run([sys.executable, "-m", "pip", "uninstall", "torchvision", "torchtext", "-y", "-q"], check=False)\n',
            '    print("Dependencies installed.")\n\n',
            'def download_model():\n',
            '    if not MODEL_DIR.exists() or not list(MODEL_DIR.glob("*.safetensors")):\n',
            '        print("Downloading Breeze TTS 2 checkpoint from Hugging Face...")\n',
            '        from huggingface_hub import snapshot_download\n',
            '        hf_token = None\n',
            '        try:\n',
            '            from kaggle_secrets import UserSecretsClient\n',
            '            hf_token = UserSecretsClient().get_secret("HF_TOKEN")\n',
            '        except:\n',
            '            pass\n',
            '        snapshot_download(repo_id="BreezeBlue/Breeze-TTS-2", local_dir=str(MODEL_DIR), token=hf_token)\n',
            '        print("Checkpoint downloaded.")\n\n',
            'with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:\n',
            '    futures = [executor.submit(install_dependencies), executor.submit(download_model)]\n',
            '    concurrent.futures.wait(futures)\n\n',
            'sys.path.insert(0, str(REPO_DIR))\n',
            'print(f"Setup complete. Using model: {MODEL_DIR}")\n',
          ];
          break;
        }
      }
    }

    // Inject text and optional reference audio / instructions into the appropriate cells
    let found = false;
    for (const cell of notebook.cells) {
      if (cell.cell_type === 'code' && cell.source) {
        const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);

        // Single-shot generation cell
        if (src.includes('paragraph = (') && src.includes('infer.py')) {
          const subprocessArgs: string[] = [
            `    "python", "infer.py", str(MODEL_DIR),\n`,
          ];
          if (referenceAudio) {
            subprocessArgs.push(
              `    "--ref-audio", "/kaggle/working/reference.wav",\n`,
              `    "--ref-text", reference_text,\n`
            );
          }
          subprocessArgs.push(`    "--text", paragraph,\n`);
          if (instructions && instructions.trim() !== '') {
            subprocessArgs.push(
              `    "--instruction", ${JSON.stringify(instructions)},\n`,
              `    "--cfg-scale", "${guidanceScale || 4}",\n`
            );
          }
          subprocessArgs.push(`    "--output", "/kaggle/working/breeze_paragraph_single.wav"\n`);

          cell.source = [
            `paragraph = ${JSON.stringify(text)}\n\n`,
            'import subprocess\n',
            'result = subprocess.run([\n',
            ...subprocessArgs,
            '], capture_output=True, text=True, cwd=str(REPO_DIR))\n',
            'print(result.stdout[-2000:])\n',
            'print(result.stderr[-2000:])\n',
          ];
          found = true;
        }

        // Replace the reference audio cell if a custom reference was provided
        if (referenceAudio && referenceText && src.includes('load_dataset') && src.includes('librispeech_asr_dummy')) {
          const b64Data = referenceAudio.includes(',') ? referenceAudio.split(',')[1] : referenceAudio;
          cell.source = [
            `import base64\n`,
            `import io\n`,
            `import soundfile as sf\n`,
            `\n`,
            `audio_b64 = ${JSON.stringify(b64Data)}\n`,
            `audio_data = base64.b64decode(audio_b64)\n`,
            `\n`,
            `try:\n`,
            `    data, sr = sf.read(io.BytesIO(audio_data))\n`,
            `    sf.write("/kaggle/working/reference.wav", data, sr)\n`,
            `    print("Custom reference clip decoded and saved.")\n`,
            `except Exception as e:\n`,
            `    print(f"Error decoding custom audio: {e}")\n`,
            `    with open("/kaggle/working/reference.wav", "wb") as f:\n`,
            `        f.write(audio_data)\n`,
            `\n`,
            `reference_text = ${JSON.stringify(referenceText)}\n`,
            `print(f"Transcript: {reference_text}")\n`,
          ];
        }

        // Inject instructions into the chunked generation cell
        if (src.includes('breeze_paragraph_chunked.wav') && src.includes('subprocess.run')) {
          let pythonReqVars = `        "id": f"chunk-{i}",\n        "text": sentence,\n        "speaker": "S0",\n`;
          if (referenceAudio) {
            pythonReqVars += `        "ref_audio_path": "/kaggle/working/reference.wav",\n`;
            pythonReqVars += `        "ref_text": reference_text,\n`;
          }
          let pythonCfgScale = "1.0";
          if (instructions && instructions.trim() !== '') {
            pythonReqVars += `        "instruction": ${JSON.stringify(instructions)},\n`;
            pythonCfgScale = `${guidanceScale || 4.0}`;
          }

          cell.source = [
            `import re, torch, os, time\n`,
            `import soundfile as sf\n`,
            `from pathlib import Path\n`,
            `\n`,
            `raw_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\\s+|\\n+', paragraph.strip()) if s.strip()]\n`,
            `sentences = []\n`,
            `current_chunk = ""\n`,
            `for s in raw_sentences:\n`,
            `    if len(current_chunk) + len(s) < 200:\n`,
            `        current_chunk += (" " if current_chunk else "") + s\n`,
            `    else:\n`,
            `        if current_chunk: sentences.append(current_chunk)\n`,
            `        current_chunk = s\n`,
            `if current_chunk: sentences.append(current_chunk)\n\n`,
            `print(f"{len(sentences)} chunks:")\n`,
            `for s in sentences:\n`,
            `    print(" -", s)\n\n`,
            `def crossfade(a, b, sr, fade_ms=80):\n`,
            `    fade_len = min(int(sr * fade_ms / 1000), a.shape[1], b.shape[1])\n`,
            `    fade_out = torch.linspace(1, 0, fade_len)\n`,
            `    fade_in = torch.linspace(0, 1, fade_len)\n`,
            `    a, b = a.clone(), b.clone()\n`,
            `    a[:, -fade_len:] *= fade_out\n`,
            `    b[:, :fade_len] *= fade_in\n`,
            `    overlap = a[:, -fade_len:] + b[:, :fade_len]\n`,
            `    return torch.cat([a[:, :-fade_len], overlap, b[:, fade_len:]], dim=1)\n\n`,
            `print("Loading runtime into memory (this happens only once!)...")\n`,
            `load_start = time.time()\n`,
            `from breeze_infer.runtime import load_runtime, resolve_device, set_all_seeds, update_generation_config_for_breeze\n`,
            `from breeze_infer.templates import get_template, prepare_inputs, select_template_name\n`,
            `from models.fast_streaming import FastBreezeStreamingRuntime, FastStreamingConfig\n`,
            `\n`,
            `tokenizer, model, audio_tokenizer = load_runtime(\n`,
            `    MODEL_DIR,\n`,
            `    device="cuda:0",\n`,
            `    attn_implementation="eager"\n`,
            `)\n`,
            `update_generation_config_for_breeze(model)\n`,
            `\n`,
            `config = FastStreamingConfig(\n`,
            `    max_new_tokens=1500,\n`,
            `    max_seq_len=2048,\n`,
            `    fast_all=None,\n`,
            `    fast_text_encoder=False,\n`,
            `    fast_backbone_prefill=False,\n`,
            `    fast_backbone_decode=False,\n`,
            `    fast_depth_decoder=False,\n`,
            `    fast_codec=False,\n`,
            `    repetition_penalty=1.1,\n`,
            `)\n`,
            `runtime = FastBreezeStreamingRuntime(model, audio_tokenizer, config, tokenizer=tokenizer)\n`,
            `print(f"Runtime loaded in {time.time() - load_start:.1f}s.")\n\n`,
            `wavs = []\n`,
            `for i, sentence in enumerate(sentences):\n`,
            `    print(f"Generating {i+1}/{len(sentences)}...")\n`,
            `    request = {\n`,
            pythonReqVars,
            `    }\n`,
            `    template_name = select_template_name(request)\n`,
            `    set_all_seeds(42)\n`,
            `    inputs = prepare_inputs(\n`,
            `        tokenizer, audio_tokenizer, model, [request],\n`,
            `        get_template(template_name), guidance_scale=${pythonCfgScale},\n`,
            `        guidance_scale_ref=None, guidance_scale_ins=None\n`,
            `    )\n`,
            `    \n`,
            `    chunk_wavs = []\n`,
            `    for audio_chunk in runtime.iter_audio_chunks(inputs, request_id=request["id"], seed=42):\n`,
            `        chunk_wavs.append(torch.from_numpy(audio_chunk.audio).float())\n`,
            `    \n`,
            `    if chunk_wavs:\n`,
            `        final_chunk_wav = torch.cat(chunk_wavs, dim=0)\n`,
            `        if final_chunk_wav.dim() == 1:\n`,
            `            final_chunk_wav = final_chunk_wav.unsqueeze(0)\n`,
            `        else:\n`,
            `            final_chunk_wav = final_chunk_wav.T\n`,
            `        wavs.append(final_chunk_wav)\n`,
            `        sf.write(f"/kaggle/working/breeze_chunk_{i}.wav", final_chunk_wav.numpy().T, runtime.sample_rate)\n\n`,
            `if len(wavs) > 0:\n`,
            `    full_wav = wavs[0]\n`,
            `    for w in wavs[1:]:\n`,
            `        full_wav = crossfade(full_wav, w, runtime.sample_rate)\n\n`,
            `    final_path = "/kaggle/working/breeze_paragraph_chunked.wav"\n`,
            `    sf.write(final_path, full_wav.numpy().T, runtime.sample_rate)\n`,
            `    print(f"Saved to {final_path}")\n`,
            `import sys; sys.exit(0)\n`,
          ];
        }
      }
    }

    if (!found) {
      return NextResponse.json({ error: 'Target cell not found in notebook template' }, { status: 500 });
    }

    const charCount = text.length;

    // Determine chunking to inform the frontend how many files to expect
    const rawSentences = text.split(/(?<=[.!?])\s+|\n+/).filter((s: string) => s.trim().length > 0);
    const finalChunks: string[] = [];
    let currentChunk = '';
    for (const s of rawSentences) {
      if (currentChunk.length + s.length < 200) {
        currentChunk += (currentChunk ? ' ' : '') + s;
      } else {
        if (currentChunk) finalChunks.push(currentChunk);
        currentChunk = s;
      }
    }
    if (currentChunk) finalChunks.push(currentChunk);

    const needsChunking = true; // Always use concurrent chunked generation for dual T4 support

    if (needsChunking) {
      // Drop the single-shot cell — replace it with a skip notice
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'code' && cell.source) {
          const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
          if (src.includes('breeze_paragraph_single.wav') && src.includes('subprocess')) {
            cell.source = [
              `import subprocess\n`,
              `paragraph = ${JSON.stringify(text)}\n`,
              `print("Single-shot skipped — running chunked generation instead.")\n`,
            ];
          }
          if (src.includes('Skipping IPython display')) {
            cell.source = [`print("Playback cell skipped (single-shot was not generated).")\n`];
          }
        }
      }
    } else {
      // Drop the chunking step — unnecessary for short text
      notebook.cells = notebook.cells.filter((cell: any) => {
        const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
        return !src.includes('sentence-chunked with crossfade') && !src.includes('breeze_paragraph_chunked.wav');
      });
    }

    // Inject cell progress trackers
    const codeCells = notebook.cells.filter((c: any) => c.cell_type === 'code');
    const totalCodeCells = codeCells.length;
    codeCells.forEach((cell: any, index: number) => {
      const printStmt = `\nimport sys\nprint("CELL_PROGRESS: ${index + 1}/${totalCodeCells}", file=sys.stderr, flush=True)\n`;
      if (Array.isArray(cell.source)) {
        cell.source.push(printStmt);
      } else {
        cell.source += printStmt;
      }
    });

    const payload = {
      slug:       `${username}/${slug}`,
      newTitle:   slug,
      text:       JSON.stringify(notebook),
      language:   'python',
      kernelType: 'notebook',
      isPrivate:  true,
      enableGpu:  true,
      enableInternet: true,
      datasetDataSources: [],
      competitionDataSources: [],
      kernelDataSources: [],
      modelDataSources: [],
      categoryIds: [],
    };

    const cleanUsername = username.trim();
    const cleanToken    = token.trim();
    const authHeader =
      cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)
        ? 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64')
        : 'Bearer ' + cleanToken;

    const payloadString = JSON.stringify(payload);

    // Explicitly check size to fail loudly before Kaggle API does
    const payloadSizeBytes = Buffer.byteLength(payloadString, 'utf8');
    if (payloadSizeBytes > 1_000_000) {
      return NextResponse.json(
        { error: `Payload exceeds Kaggle's 1MB limit. Current size: ${(payloadSizeBytes / 1024 / 1024).toFixed(2)} MB.` },
        { status: 400 }
      );
    }

    const kaggleRes = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: payloadString,
    });

    const kaggleData = await kaggleRes.text();
    if (!kaggleRes.ok) {
      return NextResponse.json({ error: `Kaggle API Error: ${kaggleData}` }, { status: kaggleRes.status });
    }

    let actualKernelRef = `${username}/${slug}`;
    try {
      const parsed = JSON.parse(kaggleData);
      if (parsed.hasError) {
        return NextResponse.json({ error: `Kaggle Push Error: ${parsed.error}` }, { status: 400 });
      }
      if (parsed.ref) {
        actualKernelRef = parsed.ref.replace(/^\/code\//, '');
      } else if (parsed.url) {
        const urlObj   = new URL(parsed.url);
        const parts    = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          actualKernelRef = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        }
      }
    } catch (e) {
      console.error('[GENERATE] Error parsing Kaggle response:', e);
    }

    const chunks = needsChunking ? finalChunks : [];

    return NextResponse.json({
      status:     'queued',
      kernel:     actualKernelRef,
      rawResponse: kaggleData,
      charCount,
      isLong:     needsChunking,
      chunks,
      cellsTotal: totalCodeCells,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
