import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { kaggleUsername, kaggleKey, ref } = await req.json();

    if (!kaggleUsername || !kaggleKey || !ref) {
      return NextResponse.json({ error: 'Username, API Key, and ref are required' }, { status: 400 });
    }

    const cleanUsername = kaggleUsername.trim();
    const cleanToken = kaggleKey.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    const statusRes = await fetch(`https://www.kaggle.com/api/v1/kernels/status?kernelRef=${ref}`, {
      headers: { 'Authorization': authHeader }
    });
    
    if (!statusRes.ok) {
      const errText = await statusRes.text();
      // Kaggle sometimes takes a moment to register the kernel, returning 404 initially.
      if (statusRes.status === 404 || statusRes.status === 403) {
        return NextResponse.json({ status: 'running' }); // Let frontend keep polling instead of instantly failing
      }
      return NextResponse.json({ error: `Failed to fetch status: ${statusRes.status} ${errText}` }, { status: statusRes.status });
    }
    
    const statusData = await statusRes.json();
    const status = statusData.status; // "queued", "running", "complete", "error", "cancel"

    if (status === 'queued' || status === 'running') {
      return NextResponse.json({ status: 'running' });
    }

    if (status === 'cancel') {
      return NextResponse.json({ status: 'error', error: 'Verification was cancelled.' });
    }

    // It's complete or error. Let's fetch output.
    const outRes = await fetch(`https://www.kaggle.com/api/v1/kernels/output?kernelRef=${ref}`, {
      headers: { 'Authorization': authHeader }
    });

    if (!outRes.ok) {
      const outText = await outRes.text();
      return NextResponse.json({ status: 'error', error: `Verification kernel failed to produce output logs: ${outRes.status} ${outText}` });
    }

    const outData = await outRes.json();
    const logFile = outData.log;
    
    if (!logFile) {
      return NextResponse.json({ status: 'error', error: 'No logs found for verification kernel.' });
    }

    // parse log for FINAL_RESULT
    const match = logFile.match(/FINAL_RESULT:\s*(\{.*\})/);
    if (match) {
      try {
        const results = JSON.parse(match[1]);
        return NextResponse.json({ status: 'complete', results });
      } catch (e) {
        return NextResponse.json({ status: 'error', error: 'Failed to parse verification results.' });
      }
    }

    return NextResponse.json({ status: 'error', error: 'Verification kernel did not output expected results. It might have crashed.' });

  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message || 'An unexpected error occurred' });
  }
}
