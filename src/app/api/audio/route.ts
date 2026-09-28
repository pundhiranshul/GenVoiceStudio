// Node.js runtime: supports ReadableStream piping with no Vercel payload size limit
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const slug     = searchParams.get('slug');
  const file     = searchParams.get('file');
  const key      = searchParams.get('key');

  if (!username || !slug || !file || !key) {
    return new Response(JSON.stringify({ error: 'Missing required params: username, slug, file, key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanUsername = username.trim();
  const cleanKey = key.trim();
  const authHeader = 
    cleanKey.length === 32 && /^[0-9a-f]+$/i.test(cleanKey)
      ? 'Basic ' + Buffer.from(`${cleanUsername}:${cleanKey}`).toString('base64')
      : 'Bearer ' + cleanKey;

  // 1. Fetch the temporary Google Cloud Storage download URL for the requested file
  let listData: any;
  try {
    const listPayload = JSON.stringify({ userName: cleanUsername, kernelSlug: slug });
    const listRes = await fetch('https://api.kaggle.com/v1/kernels.KernelsApiService/ListKernelSessionOutput', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: listPayload
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      return new Response(JSON.stringify({ error: `List API failed (${listRes.status})`, detail: errText }), { status: listRes.status, headers: { 'Content-Type': 'application/json' } });
    }

    listData = await listRes.json();
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Failed to query Kaggle session output: ${err.message}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const allFiles = listData.files || listData.outputFiles || [];
  const targetFile = allFiles.find((f: any) => {
    const name = (f.fileName || f.name || '').toLowerCase();
    return name === file.toLowerCase();
  });

  if (!targetFile) {
    return new Response(JSON.stringify({ error: 'File not found in current interactive session output.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const fileUrl = targetFile.url || targetFile.downloadUrl;
  if (!fileUrl) {
    return new Response(JSON.stringify({ error: 'Kaggle did not provide a download URL for the requested file.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // 2. Stream the actual file bytes from the provided GCS URL
  let kaggleRes: Response;
  try {
    kaggleRes = await fetch(fileUrl);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Failed to stream from GCS: ${err.message}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  if (!kaggleRes.ok) {
    return new Response(JSON.stringify({ error: `GCS returned ${kaggleRes.status}` }), { status: kaggleRes.status, headers: { 'Content-Type': 'application/json' } });
  }

  // Pipe the ReadableStream straight to the browser – Vercel never buffers the whole file!
  return new Response(kaggleRes.body, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'inline',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
