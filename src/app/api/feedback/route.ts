import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Log feedback for telemetry / analysis
    console.log('[User Feedback]:', {
      purpose: data.purpose,
      trigger: data.trigger,
      timestamp: data.timestamp || new Date().toISOString(),
      username: data.username || 'anonymous'
    });

    return NextResponse.json({ success: true, recordedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record feedback' }, { status: 400 });
  }
}
