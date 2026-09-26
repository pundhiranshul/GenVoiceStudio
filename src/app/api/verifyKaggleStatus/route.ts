import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { kaggleUsername, kaggleKey, ref } = await req.json();

    if (!kaggleUsername || !kaggleKey || !ref) {
      return NextResponse.json({ error: 'Username, API Key, and ref are required' }, { status: 400 });
    }

    const cleanToken = kaggleKey.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${kaggleUsername.trim()}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    const parts = ref.split('/');
    const kernelUserName = parts[0];
    const kernelSlug = parts[1] || 'genvoice-verify';

    const statusPayload = JSON.stringify({ userName: kernelUserName, kernelSlug });
    const statusRes = await fetch('https://api.kaggle.com/v1/kernels.KernelsApiService/GetKernelSessionStatus', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: statusPayload
    });
    
    if (!statusRes.ok) {
      const errText = await statusRes.text();
      if (statusRes.status === 404 || statusRes.status === 403) {
        return NextResponse.json({ status: 'running' }); // Let frontend keep polling
      }
      return NextResponse.json({ error: `Failed to fetch status: ${statusRes.status} ${errText}` }, { status: statusRes.status });
    }
    
    const statusData = await statusRes.json();
    
    const currentStatus = typeof statusData?.status === 'string'
      ? statusData.status.toLowerCase()
      : 'queued';

    if (currentStatus === 'queued' || currentStatus === 'running' || currentStatus === 'starting' || currentStatus === 'preparing') {
      return NextResponse.json({ status: 'running' });
    }

    if (currentStatus === 'cancel') {
      return NextResponse.json({ status: 'error', error: 'Verification was cancelled.' });
    }

    // Attempt to fetch logs regardless if complete or error, because Kaggle might output why it failed in the logs.
    let logFile = '';
    try {
      const outputPayload = JSON.stringify({ userName: kernelUserName, kernelSlug });
      const outRes = await fetch('https://api.kaggle.com/v1/kernels.KernelsApiService/ListKernelSessionOutput', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: outputPayload
      });

      if (outRes.ok) {
        const outData = await outRes.json();
        logFile = outData.log || '';
      }
    } catch (e) {
      // ignore log fetch errors, we will fallback to failureMessage
    }

    // Parse log for FINAL_RESULT
    if (logFile) {
      const match = logFile.match(/FINAL_RESULT:\s*(\{.*\})/);
      if (match) {
        try {
          const results = JSON.parse(match[1]);
          return NextResponse.json({ status: 'complete', results });
        } catch (e) {
          // ignore parse error, fallback below
        }
      }
    }

    // If we didn't find FINAL_RESULT, we consider it an error.
    const failureMsg = statusData.failureMessage || 'Verification kernel did not output expected results. It might have crashed.';
    return NextResponse.json({ status: 'error', error: failureMsg });

  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message || 'An unexpected error occurred' });
  }
}
