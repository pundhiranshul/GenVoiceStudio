// Node.js runtime: supports ReadableStream piping with no Vercel payload size limit
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const slug     = searchParams.get('slug');   // e.g. "genvoice-sfx-generator"
  const file     = searchParams.get('file');   // e.g. "sfx_output.wav"
  const key      = searchParams.get('key');    // user's Kaggle API key

  if (!username || !slug || !file || !key) {
    return new Response(JSON.stringify({ error: 'Missing required params: username, slug, file, key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const kaggleUrl = `https://www.kaggle.com/api/v1/kernels/output/${username}/${slug}?file=${encodeURIComponent(file)}`;
  const authHeader = 'Basic ' + btoa(`${username}:${key}`);

  let kaggleRes: Response;
  try {
    kaggleRes = await fetch(kaggleUrl, {
      headers: { Authorization: authHeader },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Failed to reach Kaggle: ${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!kaggleRes.ok) {
    const body = await kaggleRes.text();
    return new Response(
      JSON.stringify({ error: `Kaggle returned ${kaggleRes.status}`, detail: body.substring(0, 300) }),
      { status: kaggleRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Pipe the ReadableStream straight to the browser – Vercel never buffers the whole file
  return new Response(kaggleRes.body, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'inline',
      // Allow audio player to seek by accepting range requests forwarded from the browser
      'Accept-Ranges': 'bytes',
      // Cache for 1 hour – the file is immutable once the kernel finishes
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
