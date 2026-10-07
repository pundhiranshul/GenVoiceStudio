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
            'import os, sys, subprocess, shutil, zipfile, time, concurrent.futures\n',
            'from pathlib import Path\n',
            'pack_matches = list(Path("/kaggle/input").rglob("offline_packages.pack"))\n',
            'if pack_matches:\n',
            '    DATASET_ROOT = pack_matches[0].parent\n',
            '    print(f"Found actual root at: {DATASET_ROOT}")\n',
            'else:\n',
            '    raise FileNotFoundError("Could not find offline_packages.pack in /kaggle/input. Verify dataset is mounted.")\n\n',
            'PACK_FILE = DATASET_ROOT / "offline_packages.pack"\n',
            'WEIGHTS_DIR = DATASET_ROOT / "breeze-tts-2"\n',
            'REPO_DIR = DATASET_ROOT / "breeze-tts"\n\n',
            '# 1. The Pack Hack (Instant Import Injection)\n',
            'extract_dir = "/kaggle/working/offline_packages"\n',
            'if PACK_FILE.exists() and not os.path.exists(extract_dir):\n',
            '    print("Extracting offline packages to local SSD...")\n',
            '    with zipfile.ZipFile(PACK_FILE, "r") as z:\n',
            '        z.extractall(extract_dir)\n\n',

            '# Add to sys.path\n',
            'sys.path.insert(0, str(REPO_DIR))\n',
            'if os.path.exists(extract_dir):\n',
            '    sys.path.insert(0, extract_dir)\n\n',

            '# Uninstall Kaggle\'s pre-installed flash_attn and properly downgrade transformers\n',
            '# We use attn_implementation="sdpa" so flash_attn is not needed at all\n',
            'subprocess.run([sys.executable, "-m", "pip", "uninstall", "flash-attn", "-y", "-q"], check=False)\n',
            'subprocess.run(["sudo", "apt-get", "update", "-y", "-q"], check=False)\n',
            'subprocess.run(["sudo", "apt-get", "install", "sox", "libsox-fmt-all", "-y", "-q"], check=False)\n',
            'import shutil, site\n',
            'for site_dir in site.getsitepackages():\n',
            '    tf_dir = os.path.join(site_dir, "transformers")\n',
            '    if os.path.exists(tf_dir): shutil.rmtree(tf_dir, ignore_errors=True)\n',
            'subprocess.run([sys.executable, "-m", "pip", "install", "transformers==4.44.2", "tokenizers==0.19.1", "--force-reinstall", "-q"], check=False)\n',
            'subprocess.run([sys.executable, "-m", "pip", "install", "sox", "onnxruntime", "-q"], check=False)\n\n',
            '# 2. 16-Thread RAM Page Cache Sniper\n',
            'print(f"Warming RAM page cache for {WEIGHTS_DIR}...")\n',
            'start_time = time.time()\n',
            'def read_file_to_dev_null(filepath):\n',
            '    try:\n',
            '        with open(filepath, "rb") as f:\n',
            '            while f.read(8192 * 1024):\n',
            '                pass\n',
            '    except:\n',
            '        pass\n',
            'if WEIGHTS_DIR.exists():\n',
            '    files_to_read = []\n',
            '    for root, _, files in os.walk(WEIGHTS_DIR):\n',
            '        for file in files:\n',
            '            files_to_read.append(os.path.join(root, file))\n',
            '    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:\n',
            '        executor.map(read_file_to_dev_null, files_to_read)\n',
            'print(f"Cache warming completed in {time.time() - start_time:.2f} seconds.")\n',
            'os.environ["CUDA_VISIBLE_DEVICES"] = "0,1"\n',
            'print("Codebase mounted, patched, and dependencies installed.")\n',
          ];
          break;
        }
      }
    }

    // Inject a model-weight check cell: use dataset if safetensors present, else download
    const modelCheckCell = {
      cell_type: 'code',
      execution_count: null,
      metadata: { trusted: true },
      outputs: [],
      source: [
        `import pathlib\n`,
        `MODEL_DIR = WEIGHTS_DIR\n`,
        'print(f"Using model: {MODEL_DIR}")\n',
      ]
    };

    // Insert the new cell directly after the setup cell (index 2)
    notebook.cells.splice(3, 0, modelCheckCell);

    // Inject text and optional reference audio / instructions into the appropriate cells
    let found = false;
    for (const cell of notebook.cells) {
      if (cell.cell_type === 'code' && cell.source) {
        const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);

        // Single-shot generation cell
        if (src.includes('paragraph = (') && src.includes('infer.py')) {
          const subprocessArgs: string[] = [
            `    "python", "infer.py", MODEL_DIR,\n`,
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
          let pythonReqVars = `req = {"id": f"chunk-{i}", "text": sentence, "speaker": "S0"}\n`;
          if (referenceAudio) {
            pythonReqVars += `    req["ref_audio_path"] = "/kaggle/working/reference.wav"\n`;
            pythonReqVars += `    req["ref_text"] = reference_text\n`;
          }
          if (instructions && instructions.trim() !== '') {
            pythonReqVars += `    req["instruction"] = ${JSON.stringify(instructions)}\n`;
          }
          const cfgScale = 1.0;

          cell.source = [
            `import re, torch, os, concurrent.futures\n`,
            `import soundfile as sf\n`,
            `from breeze_infer.runtime import load_runtime, update_generation_config_for_breeze\n`,
            `from models.fast_streaming import FastStreamingConfig, FastBreezeStreamingRuntime\n`,
            `from breeze_infer.templates import get_template, prepare_inputs, select_template_name\n\n`,
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
            `print(f"{len(sentences)} chunks:")\n\n`,
            `print("Loading models onto GPU 0 & GPU 1 in BF16...")\n`,
            `cfg = FastStreamingConfig(max_new_tokens=1500, max_seq_len=2048, repetition_penalty=1.1)\n`,
            `\ntorch.cuda.set_device(0)\n`,
            `tok_0, mdl_0, atok_0 = load_runtime(MODEL_DIR, device="cuda:0", attn_implementation="sdpa")\n`,
            `update_generation_config_for_breeze(mdl_0)\n`,
            `rt_0 = FastBreezeStreamingRuntime(mdl_0, atok_0, cfg, tokenizer=tok_0)\n`,
            `\nif len(sentences) > 1:\n`,
            `    torch.cuda.set_device(1)\n`,
            `    tok_1, mdl_1, atok_1 = load_runtime(MODEL_DIR, device="cuda:1", attn_implementation="sdpa")\n`,
            `    update_generation_config_for_breeze(mdl_1)\n`,
            `    rt_1 = FastBreezeStreamingRuntime(mdl_1, atok_1, cfg, tokenizer=tok_1)\n`,
            `\ndef generate_chunk(i, sentence):\n`,
            `    gpu_id = i % 2 if len(sentences) > 1 else 0\n`,
            `    device = f"cuda:{gpu_id}"\n`,
            `    torch.cuda.set_device(gpu_id)\n`,
            `    rt = rt_0 if gpu_id == 0 else rt_1\n`,
            `    tok = tok_0 if gpu_id == 0 else tok_1\n`,
            `    atok = atok_0 if gpu_id == 0 else atok_1\n`,
            `    mdl = mdl_0 if gpu_id == 0 else mdl_1\n`,
            `    \n`,
            `    print(f"Generating chunk {i+1}/{len(sentences)} on {device}...")\n`,
            `    ${pythonReqVars}`,
            `    template_name = select_template_name(req)\n`,
            `    inputs = prepare_inputs(tok, atok, mdl, [req], get_template(template_name), guidance_scale=${cfgScale}, guidance_scale_ref=None, guidance_scale_ins=None)\n`,
            `    \n`,
            `    out_path = f"/kaggle/working/breeze_chunk_{i}.wav"\n`,
            `    with sf.SoundFile(out_path, mode="w", samplerate=rt.sample_rate, channels=1, subtype="PCM_16") as f:\n`,
            `        for chunk in rt.iter_audio_chunks(inputs, request_id=f"chunk-{i}", seed=42):\n`,
            `            f.write(chunk.audio)\n`,
            `    return out_path\n\n`,
            `with concurrent.futures.ThreadPoolExecutor(max_workers=2 if len(sentences) > 1 else 1) as executor:\n`,
            `    futures = [executor.submit(generate_chunk, i, s) for i, s in enumerate(sentences)]\n`,
            `    concurrent.futures.wait(futures)\n`,
            `    for f in futures:\n`,
            `        if f.exception() is not None:\n`,
            `            print(f"THREAD EXCEPTION: {f.exception()}")\n\n`,
            `def crossfade(a, b, sr, fade_ms=80):\n`,
            `    fade_len = min(int(sr * fade_ms / 1000), a.shape[1], b.shape[1])\n`,
            `    fade_out = torch.linspace(1, 0, fade_len)\n`,
            `    fade_in = torch.linspace(0, 1, fade_len)\n`,
            `    a, b = a.clone(), b.clone()\n`,
            `    a[:, -fade_len:] *= fade_out\n`,
            `    b[:, :fade_len] *= fade_in\n`,
            `    overlap = a[:, -fade_len:] + b[:, :fade_len]\n`,
            `    return torch.cat([a[:, :-fade_len], overlap, b[:, fade_len:]], dim=1)\n\n`,
            `wavs = []\n`,
            `for i in range(len(sentences)):\n`,
            `    out_path = f"/kaggle/working/breeze_chunk_{i}.wav"\n`,
            `    data, sr = sf.read(out_path)\n`,
            `    wav = torch.from_numpy(data).float()\n`,
            `    if wav.dim() == 1: wav = wav.unsqueeze(0)\n`,
            `    else: wav = wav.T\n`,
            `    wavs.append(wav)\n\n`,
            `if len(wavs) > 0:\n`,
            `    full_wav = wavs[0]\n`,
            `    for w in wavs[1:]:\n`,
            `        full_wav = crossfade(full_wav, w, sr)\n`,
            `    final_path = "/kaggle/working/breeze_paragraph_chunked.wav"\n`,
            `    sf.write(final_path, full_wav.numpy().T, sr)\n`,
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
      datasetDataSources: ['daijizaiten/breeze-tts-offline-core-v2'],
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
