import { NextResponse } from 'next/server';
import { encryptPayload } from '@/lib/crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    if (!payload.username || !payload.slug || !payload.file || !payload.key) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const token = encryptPayload(payload);
    
    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json({ error: `Failed to sign URL: ${error.message}` }, { status: 500 });
  }
}
