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
            'import shutil, sys, re, subprocess\n',
            'shutil.copytree("/kaggle/input/genvoice-voice-generation/breeze-tts", "/kaggle/working/breeze-tts")\n',
            'sys.path.append("/kaggle/working/breeze-tts")\n',
            'print("Installing qwen-audio-tokenizer...")\n',
            'subprocess.run([sys.executable, "-m", "pip", "install", "qwen-audio-tokenizer", "-q"], check=True)\n',
            '# Patch out the removed transformers.modeling_utils.no_init_weights import\n',
            'breeze_path = "/kaggle/working/breeze-tts/models/breeze.py"\n',
            'with open(breeze_path) as _f: _lines = _f.readlines()\n',
            '# Separate __future__ imports (must stay at top) from everything else\n',
            '_future = [l for l in _lines if re.match(r"^from __future__ import", l)]\n',
            '_rest   = [l for l in _lines if not re.match(r"^from __future__ import", l)]\n',
            '_rest_src = "".join(_rest)\n',
            '# Replace the deprecated import with an indentation-preserving pass\n',
            '_rest_src = re.sub(r"^([ \\t]*)from transformers\\.modeling_utils import no_init_weights.*$", r"\\1pass", _rest_src, flags=re.MULTILINE)\n',
            '_header = "import contextlib\\n@contextlib.contextmanager\\ndef no_init_weights(*a, **kw):\\n    yield\\n\\n"\n',
            '# Write: future imports → our header → patched rest\n',
            'with open(breeze_path, "w") as _f: _f.write("".join(_future) + _header + _rest_src)\n',
            'print("Codebase mounted and patched.")\n',
          ];
          break;
        }
      }
    }

    // Inject a model-weight check cell: use dataset if safetensors present, else download
    const MODEL_DATASET_PATH = '/kaggle/input/genvoice-voice-generation/breeze-tts-2';
    const MODEL_DOWNLOAD_PATH = '/kaggle/working/breeze-tts-2';
    const modelCheckCell = {
      cell_type: 'code',
      execution_count: null,
      metadata: { trusted: true },
      outputs: [],
      source: [
        'import glob, os\n',
        `_ds_path = "${MODEL_DATASET_PATH}"\n`,
        `_dl_path = "${MODEL_DOWNLOAD_PATH}"\n`,
        '_has_weights = len(glob.glob(os.path.join(_ds_path, "*.safetensors"))) > 0 or len(glob.glob(os.path.join(_ds_path, "*.bin"))) > 0\n',
        'if _has_weights:\n',
        '    MODEL_DIR = _ds_path\n',
        '    print(f"Model weights found in dataset: {MODEL_DIR}")\n',
        'else:\n',
        '    print("Model weights not in dataset — downloading from HuggingFace...")\n',
        '    from huggingface_hub import snapshot_download\n',
        `    MODEL_DIR = snapshot_download(repo_id="BreezeBlue/Breeze-TTS-2", local_dir="${MODEL_DOWNLOAD_PATH}")\n`,
        '    print(f"Downloaded to: {MODEL_DIR}")\n',
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
            '], capture_output=True, text=True, cwd="/kaggle/working/breeze-tts")\n',
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
          let inferArgs = `"python", "infer.py", MODEL_DIR`;
          if (referenceAudio) {
            inferArgs += `, "--ref-audio", "/kaggle/working/reference.wav", "--ref-text", reference_text`;
          }
          inferArgs += `, "--text", sentence, "--output", out_path`;
          if (instructions && instructions.trim() !== '') {
            inferArgs += `, "--instruction", ${JSON.stringify(instructions)}, "--cfg-scale", "${guidanceScale || 4}"`;
          }

          cell.source = [
            `import re, torch, subprocess, os, concurrent.futures\n`,
            `import soundfile as sf\n`,
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
            `def generate_chunk(i, sentence):\n`,
            `    gpu_id = i % 2\n`,
            `    env = os.environ.copy()\n`,
            `    env["CUDA_VISIBLE_DEVICES"] = str(gpu_id)\n`,
            `    out_path = f"/kaggle/working/breeze_chunk_{i}.wav"\n`,
            `    print(f"Generating {i+1}/{len(sentences)} on GPU {gpu_id}...")\n`,
            `    try:\n`,
            `        result = subprocess.run([${inferArgs}], capture_output=True, text=True, cwd="/kaggle/working/breeze-tts", env=env)\n`,
            `        if result.returncode != 0:\n`,
            `            print(f"ERROR on chunk {i}:", result.stderr[-1000:])\n`,
            `            print(f"STDOUT on chunk {i}:", result.stdout[-1000:])\n`,
            `    except Exception as e:\n`,
            `        print(f"EXCEPTION on chunk {i}: {e}")\n`,
            `\n`,
            `with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:\n`,
            `    futures = [executor.submit(generate_chunk, i, s) for i, s in enumerate(sentences)]\n`,
            `    concurrent.futures.wait(futures)\n`,
            `    for f in futures:\n`,
            `        if f.exception() is not None:\n`,
            `            print(f"THREAD EXCEPTION: {f.exception()}")\n`,
            `\n`,
            `def crossfade(a, b, sr, fade_ms=80):\n`,
            `    fade_len = min(int(sr * fade_ms / 1000), a.shape[1], b.shape[1])\n`,
            `    fade_out = torch.linspace(1, 0, fade_len)\n`,
            `    fade_in = torch.linspace(0, 1, fade_len)\n`,
            `    a, b = a.clone(), b.clone()\n`,
            `    a[:, -fade_len:] *= fade_out\n`,
            `    b[:, :fade_len] *= fade_in\n`,
            `    overlap = a[:, -fade_len:] + b[:, :fade_len]\n`,
            `    return torch.cat([a[:, :-fade_len], overlap, b[:, fade_len:]], dim=1)\n`,
            `\n`,
            `wavs = []\n`,
            `for i in range(len(sentences)):\n`,
            `    out_path = f"/kaggle/working/breeze_chunk_{i}.wav"\n`,
            `    data, sr = sf.read(out_path)\n`,
            `    wav = torch.from_numpy(data).float()\n`,
            `    if wav.dim() == 1: wav = wav.unsqueeze(0)\n`,
            `    else: wav = wav.T\n`,
            `    wavs.append(wav)\n`,
            `\n`,
            `full_wav = wavs[0]\n`,
            `for w in wavs[1:]:\n`,
            `    full_wav = crossfade(full_wav, w, sr)\n`,
            `\n`,
            `final_path = "/kaggle/working/breeze_paragraph_chunked.wav"\n`,
            `sf.write(final_path, full_wav.numpy().T, sr)\n`,
            `print(f"Saved to {final_path}")\n`,
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

    const needsChunking = finalChunks.length > 1;

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
      datasetDataSources: ['daijizaiten/genvoice-voice-generation'],
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
