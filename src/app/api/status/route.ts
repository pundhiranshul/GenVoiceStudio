import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Maps Kaggle's kernel run statuses to our simple three-state model
function mapKaggleStatus(kaggleStatus: string): 'running' | 'done' | 'failed' {
  const s = (kaggleStatus || '').toLowerCase();
  if (s === 'complete') return 'done';
  if (s === 'error' || s === 'cancel' || s === 'cancel_requested' || s === 'cancel_acknowledged') return 'failed';
  return 'running'; // queued, running, etc.
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kernel   = searchParams.get('kernel');   // "username/slug"
    const username = searchParams.get('username');
    const key      = searchParams.get('key');

    if (!kernel || !username || !key) {
      return NextResponse.json({ error: 'Missing required params: kernel, username, key' }, { status: 400 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${username}:${key}`).toString('base64');

    // Check the kernel's latest run status
    const statusRes = await fetch(
      `https://www.kaggle.com/api/v1/kernels/${encodeURIComponent(kernel)}`,
      { headers: { Authorization: authHeader } }
    );

    if (!statusRes.ok) {
      const body = await statusRes.text();
      return NextResponse.json(
        { error: `Kaggle status check failed (${statusRes.status})`, detail: body.substring(0, 300) },
        { status: statusRes.status }
      );
    }

    const kernelData = await statusRes.json();
    // Kaggle returns currentRunningVersion.status or lastRunningVersion.status
    const rawStatus: string =
      kernelData?.currentRunningVersion?.status ||
      kernelData?.lastRunningVersion?.status ||
      kernelData?.status ||
      'queued';

    const status = mapKaggleStatus(rawStatus);

    return NextResponse.json({ status, rawStatus });
  } catch (err: any) {
    console.error('[STATUS API] Error:', err);
    return NextResponse.json({ error: `Internal error: ${err.message}` }, { status: 500 });
  }
}
