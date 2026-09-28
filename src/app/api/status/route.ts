import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(req: Request) {
  console.log('[STATUS API] Handler entered');
  try {
    const { searchParams } = new URL(req.url);
    const kernel = searchParams.get('kernel');
    const runId = searchParams.get('runId');

    if (!kernel) {
      return NextResponse.json({ error: 'No kernel provided' }, { status: 400 });
    }

    const reqKaggleUsername = searchParams.get('kaggleUsername');
    const reqKaggleKey = searchParams.get('kaggleKey');

    let username = reqKaggleUsername ? reqKaggleUsername.trim() : null;
    let token = reqKaggleKey ? reqKaggleKey.trim() : null;

    if (!username || !token) {
      username = process.env.KAGGLE_USERNAME || null;
      token = process.env.KAGGLE_TOKEN || process.env.KAGGLE_KEY || null;
    }

    if (!username || !token) {
      return NextResponse.json({ error: 'Kaggle credentials not provided or configured.' }, { status: 500 });
    }

    const cleanUsername = username.trim();
    const cleanToken = token.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    const parts = kernel.split('/');
    const slug = parts[parts.length - 1];

    console.log(`[STATUS API] Fetching status for ${cleanUsername}/${slug}`);

    // 1. Get kernel status
    let statusData: any = null;
    try {
      const statusPayload = JSON.stringify({ userName: cleanUsername, kernelSlug: slug });
      const statusRes = await fetch('https://api.kaggle.com/v1/kernels.KernelsApiService/GetKernelSessionStatus', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: statusPayload,
        signal: AbortSignal.timeout(20000)
      });
      const statusText = await statusRes.text();
      console.log(`[STATUS API] Kaggle status HTTP ${statusRes.status}, body length: ${statusText.length}`);
      
      // If Kaggle itself is having a transient issue, keep polling instead of aborting the generation
      if (statusRes.status === 502 || statusRes.status === 503 || statusRes.status === 504) {
        console.warn(`[STATUS API] Transient HTTP ${statusRes.status} from Kaggle — returning running to keep polling`);
        return NextResponse.json({ status: 'running', chunksCurrent: 0, chunksTotal: 0, newAudios: [] });
      }

      try {
        statusData = JSON.parse(statusText);
      } catch (parseErr) {
        console.error('[STATUS API] Failed to parse status JSON:', statusText.substring(0, 200));
        return NextResponse.json({
          error: `Kaggle returned non-JSON. HTTP ${statusRes.status}. Body: ${statusText.substring(0, 200)}`
        }, { status: 502 });
      }
      if (!statusRes.ok) {
        console.error('[STATUS API] Kaggle status not ok:', statusData);
        return NextResponse.json({
          error: `Kaggle status API error ${statusRes.status}: ${JSON.stringify(statusData)}`
        }, { status: 502 });
      }
    } catch (fetchErr: any) {
      const isTransient = fetchErr?.name === 'TimeoutError' || fetchErr?.name === 'AbortError' || fetchErr?.code === 'UND_ERR_CONNECT_TIMEOUT';
      if (isTransient) {
        console.warn('[STATUS API] Transient timeout reaching Kaggle status API — returning running to keep polling:', fetchErr.message);
        return NextResponse.json({ status: 'running', chunksCurrent: 0, chunksTotal: 0, newAudios: [] });
      }
      console.error('[STATUS API] Fetch to Kaggle status API failed:', fetchErr);
      return NextResponse.json({ error: `Failed to reach Kaggle: ${fetchErr.message}` }, { status: 502 });
    }

    const currentStatus = typeof statusData?.status === 'string'
      ? statusData.status.toLowerCase()
      : 'queued';

    console.log(`[STATUS API] currentStatus = "${currentStatus}"`);

    // 2. If complete, fetch output files
    if (currentStatus === 'complete') {
      let allFiles: any[] = [];
      let pageToken = '';
      let outputData: any = {};
      let logData = '';
      let loopCount = 0;

      do {
        loopCount++;
        if (loopCount > 20) {
          console.warn('[STATUS API] Too many pages, breaking loop.');
          break;
        }
        try {
          const outputPayload = JSON.stringify({ userName: cleanUsername, kernelSlug: slug, pageSize: 500, pageToken });
          const outputRes = await fetch('https://api.kaggle.com/v1/kernels.KernelsApiService/ListKernelSessionOutput', {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: outputPayload,
            signal: AbortSignal.timeout(10000)
          });
          const outputText = await outputRes.text();
          try {
            outputData = JSON.parse(outputText);
          } catch (e) {
            console.error('[STATUS API] Failed to parse output JSON:', outputText.substring(0, 200));
            return NextResponse.json({
              error: `Kaggle output non-JSON. HTTP ${outputRes.status}. Body: ${outputText.substring(0, 200)}`
            }, { status: 502 });
          }
          const pageFiles = outputData.files || outputData.outputFiles || [];
          allFiles = allFiles.concat(pageFiles);
          if (outputData.log) logData = outputData.log;
          const nextToken = outputData.nextPageToken || '';
          if (nextToken === pageToken) { console.warn('[STATUS API] Same nextPageToken, breaking.'); break; }
          pageToken = nextToken;
        } catch (outputFetchErr: any) {
          console.error('[STATUS API] Failed to fetch output:', outputFetchErr);
          return NextResponse.json({ error: `Failed to fetch Kaggle output: ${outputFetchErr.message}` }, { status: 502 });
        }
      } while (pageToken);

      if (runId && logData && !logData.includes(`RUN_ID: ${runId}`)) {
        console.log(`[STATUS API] runId ${runId} not found in log, treating as still running.`);
        return NextResponse.json({ status: 'running', chunksCurrent: 0, chunksTotal: 0 });
      }

      const wavFiles = allFiles.filter((f: any) => {
        const name = (f.fileName || f.name || '').toLowerCase();
        return name.endsWith('.wav');
      });

      console.log(`[STATUS API] Found ${wavFiles.length} wav files in output`);

      const audios: { name: string; data: string }[] = [];
      if (wavFiles.length > 0) {
        try {
          await Promise.all(wavFiles.map(async (f: any) => {
            const fileUrl = f.url || f.downloadUrl;
            if (fileUrl) {
              const audioRes = await fetch(fileUrl, { signal: AbortSignal.timeout(15000) });
              const arrayBuffer = await audioRes.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              audios.push({ name: f.fileName || f.name, data: `data:audio/wav;base64,${base64}` });
            }
          }));
        } catch (dlErr: any) {
          console.error('[STATUS API] Failed to download audio:', dlErr);
          return NextResponse.json({ error: `Failed to download audio files: ${dlErr.message}` }, { status: 500 });
        }
      }

      if (audios.length > 0) {
        audios.sort((a, b) => {
          if (a.name.includes('reference')) return -1;
          if (b.name.includes('reference')) return 1;
          if (a.name.includes('single')) return -1;
          if (b.name.includes('single')) return 1;
          if (a.name.includes('chunked')) return -1;
          if (b.name.includes('chunked')) return 1;
          return a.name.localeCompare(b.name);
        });
        console.log(`[STATUS API] Returning complete with ${audios.length} audios`);
        return NextResponse.json({ status: 'complete', audios, log: logData });
      } else {
        console.warn('[STATUS API] Complete but no wav files found');
        return NextResponse.json({
          error: 'No audio files found in Kaggle output',
          log: logData,
          files: allFiles.map((f: any) => f.fileName || f.name)
        }, { status: 500 });
      }
    }

    // 3. Not complete — return status with best-effort partial log info
    let chunksCurrent = 0;
    let chunksTotal = 0;
    let cellsCurrent = 0;
    let cellsTotal = 0;
    let partialLog = '';
    const newAudios: { name: string; data: string }[] = [];

    try {
      const logRes = await fetch('https://api.kaggle.com/v1/kernels.KernelsApiService/ListKernelSessionOutput', {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: cleanUsername, kernelSlug: slug, pageSize: 500 }),
        signal: AbortSignal.timeout(5000)
      });
      const logText = await logRes.text();
      let logData: any = {};
      try { logData = JSON.parse(logText); } catch (_) { /* ignore non-JSON */ }
      
      // DEBUG: write raw response to disk for inspection
      try {
        const fs = require('fs');
        fs.writeFileSync('/home/ubuntu/genVoice/kaggle_debug.json', JSON.stringify(logData, null, 2));
      } catch(e) {}

      partialLog = logData.log || '';
      
      const chunkMatches = [...partialLog.matchAll(/Generating (\d+)\/(\d+)/g)];
      if (chunkMatches.length > 0) {
        const last = chunkMatches[chunkMatches.length - 1];
        chunksCurrent = parseInt(last[1], 10);
        chunksTotal = parseInt(last[2], 10);
      }

      const cellMatches = [...partialLog.matchAll(/CELL_PROGRESS: (\d+)\/(\d+)/g)];
      if (cellMatches.length > 0) {
        const last = cellMatches[cellMatches.length - 1];
        cellsCurrent = parseInt(last[1], 10);
        cellsTotal = parseInt(last[2], 10);
        console.log(`[STATUS API] Parsed cell progress: ${cellsCurrent}/${cellsTotal}`);
      } else {
        console.log(`[STATUS API] No CELL_PROGRESS found in log of length ${partialLog.length}. Snippet: ${partialLog.slice(-200).replace(/\n/g, '\\n')}`);
      }



      const existingAudiosStr = searchParams.get('existingAudios') || '';
      const existingAudios = existingAudiosStr ? existingAudiosStr.split(',') : [];
      const pageFiles: any[] = logData.files || logData.outputFiles || [];
      const partialWavs = pageFiles.filter((f: any) => {
        const name = (f.fileName || f.name || '').toLowerCase();
        return name.endsWith('.wav') && !existingAudios.includes(name);
      });

      if (partialWavs.length > 0) {
        await Promise.all(partialWavs.map(async (f: any) => {
          const fileUrl = f.url || f.downloadUrl;
          if (fileUrl) {
            const audioRes = await fetch(fileUrl, { signal: AbortSignal.timeout(8000) });
            const arrayBuffer = await audioRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            newAudios.push({ name: f.fileName || f.name, data: `data:audio/wav;base64,${base64}` });
          }
        }));
      }
    } catch (partialErr: any) {
      console.warn('[STATUS API] Partial log fetch failed (non-fatal):', partialErr?.message);
    }

    console.log(`[STATUS API] Returning status=${currentStatus}, cells=${cellsCurrent}/${cellsTotal}, chunks=${chunksCurrent}/${chunksTotal}`);
    return NextResponse.json({ status: currentStatus, chunksCurrent, chunksTotal, cellsCurrent, cellsTotal, newAudios, log: partialLog });

  } catch (topLevelErr: any) {
    console.error('[STATUS API] Unhandled top-level error:', topLevelErr);
    return NextResponse.json({ error: `Internal error: ${topLevelErr?.message ?? String(topLevelErr)}` }, { status: 500 });
  }
}
