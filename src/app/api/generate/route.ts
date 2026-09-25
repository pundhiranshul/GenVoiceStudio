import { NextResponse } from 'next/server';
import notebookTemplate from './notebook.json';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { password, kaggleUsername, kaggleKey, text, referenceAudio, referenceText, runId, instructions, guidanceScale } = body;

    if (text) {
      text = text
        .replace(/\(laughs\)/gi, '(laugh)')
        .replace(/\(sighs\)/gi, '(sigh)')
        .replace(/\(coughs\)/gi, '(cough)');
        
      text = text.replace(/\([^)]+\)/g, (match: string) => {
        const lowerMatch = match.toLowerCase();
        if (['(laugh)', '(sigh)', '(cough)', '(clears throat)'].includes(lowerMatch)) {
          return lowerMatch;
        }
        console.warn(`[GENERATE API] Stripped unsupported tag: ${match}`);
        return ''; // Strip unsupported tags
      });
      text = text.replace(/ +/g, ' ').trim();
    }

    let username = kaggleUsername ? kaggleUsername.trim() : null;
    let token = kaggleKey ? kaggleKey.trim() : null;
    let slug = 'genvoice-api';

    if (username && token) {
      // Using custom credentials; bypass App Password check
    } else {
      // Using shared credentials
      if (password !== (process.env.APP_PASSWORD || 'secret')) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      username = process.env.KAGGLE_USERNAME || null;
      token = process.env.KAGGLE_TOKEN || process.env.KAGGLE_KEY || null;
      slug = process.env.KAGGLE_KERNEL_SLUG || 'genvoice-api';
    }

    if (!username || !token) {
      return NextResponse.json({ error: 'Kaggle credentials not provided or not configured on server.' }, { status: 500 });
    }

    // Modify notebook
    const notebook = JSON.parse(JSON.stringify(notebookTemplate));
    if (notebook.cells) {
      notebook.cells.forEach((cell: any) => {
        if (cell.cell_type === 'code') {
          cell.outputs = [];
          cell.execution_count = null;
        }
      });
    }
    let found = false;
    let runIdInjected = false;
    for (const cell of notebook.cells) {
      if (cell.cell_type === 'code' && cell.source && !runIdInjected && runId) {
        const printStmt = `print("RUN_ID: ${runId}")\n`;
        if (Array.isArray(cell.source)) {
          cell.source.unshift(printStmt);
        } else {
          cell.source = printStmt + cell.source;
        }
        runIdInjected = true;
      }
      if (cell.cell_type === 'code' && cell.source) {
        const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
        if (src.includes('paragraph = (') && src.includes('infer.py')) {
          let subprocessArgs = [
            `    "python", "infer.py", "../breeze-tts-2",\n`
          ];

          if (referenceAudio) {
            subprocessArgs.push(
              `    "--ref-audio", "/kaggle/working/reference.wav",\n`,
              `    "--ref-text", reference_text,\n`
            );
          }

          subprocessArgs.push(
            `    "--text", paragraph,\n`
          );

          if (instructions && instructions.trim() !== "") {
            subprocessArgs.push(
              `    "--instruction", ${JSON.stringify(instructions)},\n`,
              // Voice Design and Direction recommend CFG 4.0; standard cloning recommends 1.0.
              `    "--cfg-scale", "${guidanceScale || 4}",\n`
            );
          }

          subprocessArgs.push(
            `    "--output", "/kaggle/working/breeze_paragraph_single.wav"\n`
          );

          cell.source = [
            `paragraph = ${JSON.stringify(text)}\n\n`,
            "import subprocess\n",
            "result = subprocess.run([\n",
            ...subprocessArgs,
            "], capture_output=True, text=True, cwd=\"/kaggle/working/breeze-tts\")\n",
            "print(result.stdout[-2000:])\n",
            "print(result.stderr[-2000:])\n"
          ];
          found = true;
        }

        // Replace the reference audio cell if custom reference provided
        if (referenceAudio && referenceText && src.includes('load_dataset') && src.includes('librispeech_asr_dummy')) {
          // referenceAudio is expected to be base64 string without data URI scheme, or we strip it
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
            `    # Fallback if invalid\n`,
            `    with open("/kaggle/working/reference.wav", "wb") as f:\n`,
            `        f.write(audio_data)\n`,
            `\n`,
            `reference_text = ${JSON.stringify(referenceText)}\n`,
            `print(f"Transcript: {reference_text}")\n`
          ];
        }
        // Inject instructions into the chunked generation cell if present
        if (src.includes('breeze_paragraph_chunked.wav') && src.includes('subprocess.run')) {
          let chunkArgs = `        "python", "infer.py", "../breeze-tts-2",\n`;
          if (referenceAudio) {
            chunkArgs += `        "--ref-audio", "/kaggle/working/reference.wav",\n        "--ref-text", reference_text,\n`;
          }
          chunkArgs += `        "--text", sentence,\n`;

          if (instructions && instructions.trim() !== "") {
            // Voice Design and Direction recommend CFG 4.0; standard cloning recommends 1.0.
            chunkArgs += `        "--instruction", ${JSON.stringify(instructions)},\n        "--cfg-scale", "${guidanceScale || 4}",\n`;
          }
          chunkArgs += `        "--output", out_path\n    ], capture_output=True`;

          // The original static cell has these exact args we want to replace
          const originalArgs = `        "python", "infer.py", "../breeze-tts-2",\\n        "--ref-audio", "/kaggle/working/reference.wav",\\n        "--ref-text", reference_text,\\n        "--text", sentence,\\n        "--output", out_path\\n    ], capture_output=True`;

          if (Array.isArray(cell.source)) {
            cell.source = cell.source.map((line: string) => line.replace(originalArgs, chunkArgs.replace(/\n/g, '\\n')));
          } else {
            cell.source = [src.replace(originalArgs.replace(/\\n/g, '\n'), chunkArgs)];
          }
        }
      }
    }

    if (!found) {
      return NextResponse.json({ error: 'Target cell not found in notebook template' }, { status: 500 });
    }

    // If the text is long (>600 chars), skip single-shot generation to avoid GPU OOM.
    // The chunking step handles long text safely by generating sentence-by-sentence.
    // If text is short (<= 600 chars), skip the chunking step since single-shot is faster.
    const charCount = text.length;
    const isLong = charCount > 600;

    if (isLong) {
      // Drop the single-shot cell — replace it with a skip notice
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'code' && cell.source) {
          const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
          if (src.includes('breeze_paragraph_single.wav') && src.includes('subprocess')) {
            cell.source = [
              `import subprocess\n`,
              `paragraph = ${JSON.stringify(text)}\n`,
              `print("Single-shot skipped for long text (${charCount} chars > 600 char limit). Running chunked generation instead.")\n`
            ];
          }
          // Also skip the playback cell that tries to display the (non-existent) single-shot wav
          if (src.includes('breeze_paragraph_single.wav') && src.includes('display(Audio')) {
            cell.source = [`print("Playback cell skipped (single-shot was not generated).")\n`];
          }
        }
      }
    } else {
      // Drop the chunking step — it's slow and unnecessary for short text
      notebook.cells = notebook.cells.filter((cell: any) => {
        const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
        return !src.includes('sentence-chunked with crossfade') && !src.includes('breeze_paragraph_chunked.wav');
      });
    }

    const payload = {
      slug: `${username}/${slug}`,
      newTitle: slug,
      text: JSON.stringify(notebook),
      language: "python",
      kernelType: "notebook",
      isPrivate: true,
      enableGpu: true,
      enableInternet: true,
      datasetDataSources: [],
      competitionDataSources: [],
      kernelDataSources: [],
      modelDataSources: [],
      categoryIds: []
    };

    const cleanUsername = username.trim();
    const cleanToken = token.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    const payloadString = JSON.stringify(payload);

    // Explicitly check size to fail loudly before Kaggle API does
    const payloadSizeBytes = Buffer.byteLength(payloadString, 'utf8');
    if (payloadSizeBytes > 1000000) {
      return NextResponse.json({ error: `Payload exceeds Kaggle's 1MB limit. Current size: ${(payloadSizeBytes / 1024 / 1024).toFixed(2)} MB.` }, { status: 400 });
    }

    const kaggleRes = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: payloadString
    });

    const kaggleData = await kaggleRes.text();
    if (!kaggleRes.ok) {
      return NextResponse.json({ error: `Kaggle API Error: ${kaggleData}` }, { status: kaggleRes.status });
    }

    let actualKernelRef = `${username}/${slug}`;
    try {
      console.log(`[DEBUG] Raw Kaggle Push Response: ${kaggleData}`);
      const parsedData = JSON.parse(kaggleData);

      if (parsedData.hasError) {
        return NextResponse.json({ error: `Kaggle Push Error: ${parsedData.error}` }, { status: 400 });
      }

      if (parsedData.ref) {
        // Kaggle sometimes returns ref as "/code/username/slug", we just want "username/slug"
        actualKernelRef = parsedData.ref.replace(/^\/code\//, '');
      } else if (parsedData.url) {
        const urlObj = new URL(parsedData.url);
        // e.g. https://www.kaggle.com/daijizaiten/genvoice-api
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          actualKernelRef = `${pathParts[pathParts.length - 2]}/${pathParts[pathParts.length - 1]}`;
        }
      }
    } catch (e) {
      console.error(`[DEBUG] Error parsing Kaggle response:`, e);
      // ignore JSON parse error and fallback to hardcoded slug
    }

    // Split into sentences if chunked mode, same logic as Python notebook
    const chunks = isLong
      ? text.trim().split(/(?<=[.!?…])\s+/).filter((s: string) => s.trim().length > 0)
      : [];

    console.log(`[DEBUG] Final actualKernelRef: ${actualKernelRef}`);
    return NextResponse.json({ status: 'queued', kernel: actualKernelRef, rawResponse: kaggleData, charCount, isLong, chunks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
