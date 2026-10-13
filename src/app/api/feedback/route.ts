import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const TMP_FEEDBACK_FILE = '/tmp/feedback.json';

// Helper to safely append to local JSON file with read-only serverless fallback
function saveFeedbackRecord(record: any) {
  let targetFile = FEEDBACK_FILE;
  let targetDir = DATA_DIR;

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch {
    // If project root is read-only (e.g. serverless container)
    targetFile = TMP_FEEDBACK_FILE;
  }

  try {
    let existing: any[] = [];
    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }
    }
    existing.push(record);

    fs.writeFileSync(targetFile, JSON.stringify(existing, null, 2), {
      encoding: 'utf8',
      mode: 0o600, // Private permissions: read/write only by owner
    });
    return true;
  } catch (err: any) {
    // Fallback to /tmp in read-only environments
    if (targetFile !== TMP_FEEDBACK_FILE) {
      try {
        let existing: any[] = [];
        if (fs.existsSync(TMP_FEEDBACK_FILE)) {
          try {
            existing = JSON.parse(fs.readFileSync(TMP_FEEDBACK_FILE, 'utf8'));
          } catch {}
        }
        existing.push(record);
        fs.writeFileSync(TMP_FEEDBACK_FILE, JSON.stringify(existing, null, 2), {
          encoding: 'utf8',
          mode: 0o600,
        });
        return true;
      } catch {}
    }
    console.error('Failed to write feedback to file:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Sanitize and structure feedback record
    const cleanRecord = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      purpose: String(data.purpose || '').trim().slice(0, 150),
      purposeId: String(data.purposeId || '').trim().slice(0, 80),
      trigger: String(data.trigger || 'manual').trim().slice(0, 50),
      timestamp: data.timestamp || new Date().toISOString(),
      username: String(data.username || 'anonymous').trim().slice(0, 100),
    };

    // 1. Log to console (visible in Vercel Runtime Logs / Terminal)
    console.log('[User Feedback]:', cleanRecord);

    // 2. Safely persist to local server file (data/feedback.json)
    saveFeedbackRecord(cleanRecord);

    return NextResponse.json({ success: true, recordedAt: cleanRecord.timestamp });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to record feedback' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const adminSecret = (process.env.ADMIN_SECRET || process.env.APP_PASSWORD || 'secret').trim();

  // Accept secret, password, or pass query params, or header tokens
  const rawKey =
    req.nextUrl.searchParams.get('secret') ||
    req.nextUrl.searchParams.get('password') ||
    req.nextUrl.searchParams.get('pass') ||
    req.headers.get('x-admin-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  const providedKey = rawKey ? decodeURIComponent(rawKey).trim() : '';

  // If unauthorized, return funny punchy message
  if (!providedKey || providedKey !== adminSecret) {
    return NextResponse.json(
      {
        message: "You are lost. Call your parents.",
      },
      { status: 401 }
    );
  }

  // Return private feedback list to the authorized admin
  try {
    const targetFile = fs.existsSync(FEEDBACK_FILE) ? FEEDBACK_FILE : TMP_FEEDBACK_FILE;
    if (fs.existsSync(targetFile)) {
      const raw = fs.readFileSync(targetFile, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return NextResponse.json({
          total: data.length,
          feedbacks: data,
          message: data.length === 0 ? 'No user feedback recorded yet.' : undefined,
        });
      }
    }
    return NextResponse.json({
      total: 0,
      feedbacks: [],
      message: 'No user feedback recorded yet.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to read feedback: ' + err.message }, { status: 500 });
  }
}
