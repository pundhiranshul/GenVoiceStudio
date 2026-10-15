import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { renderDashboardHtml, renderUnauthorizedHtml } from './renderDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const type = String(data.type || data.category || (data.trigger === 'bug' ? 'bug' : 'feedback')).trim().toLowerCase().slice(0, 50);
    const category = String(data.category || (type === 'bug' ? 'Report Bug' : type === 'suggestion' ? 'Suggestion' : 'Others')).trim().slice(0, 50);
    const message = String(data.message || data.report || data.suggestion || data.details || '').trim().slice(0, 5000);
    const email = String(data.email || '').trim().slice(0, 150);
    const page = String(data.page || '').trim().slice(0, 200);

    const cleanRecord = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: type || 'feedback',
      category: category,
      message: message,
      email: email,
      page: page,
      purpose: String(data.purpose || (message ? `${category}: ${message.slice(0, 60)}` : category)).trim().slice(0, 150),
      purposeId: String(data.purposeId || type || '').trim().slice(0, 80),
      trigger: String(data.trigger || (type === 'bug' ? 'bug' : 'manual')).trim().slice(0, 50),
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
  // Dedicated FEED_PASSWORD for feedback access (separated from APP_PASSWORD)
  const feedbackSecret = (
    process.env.FEED_PASSWORD ||
    process.env.feed_password ||
    process.env.FEEDBACK_PASSWORD ||
    process.env.feedback_password ||
    process.env.FEED_SECRET ||
    process.env.FEEDPASSWORD ||
    (process.env.NODE_ENV === 'development' ? 'secret' : '')
  ).trim();

  // Accept secret, password, or pass query params, or header tokens
  const rawKey =
    req.nextUrl.searchParams.get('secret') ||
    req.nextUrl.searchParams.get('password') ||
    req.nextUrl.searchParams.get('pass') ||
    req.headers.get('x-admin-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  const providedKey = rawKey ? decodeURIComponent(rawKey).trim() : '';
  const isAuthorized = Boolean(feedbackSecret && providedKey && providedKey === feedbackSecret);

  // Determine whether request is from a browser viewing the page
  const format = req.nextUrl.searchParams.get('format');
  const accept = req.headers.get('accept') || '';
  const isBrowserHtml = (accept.includes('text/html') || format === 'html') && format !== 'json';

  // If unauthorized or FEED_PASSWORD not matched, return punchy message with no-cache headers
  if (!isAuthorized) {
    if (isBrowserHtml) {
      return new NextResponse(renderUnauthorizedHtml(), {
        status: 401,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
    }

    return NextResponse.json(
      {
        message: "Damn boy, are you lost or something? Call your parents.",
      },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  // Return private feedback list to the authorized admin
  try {
    let feedbacks: any[] = [];
    const targetFile = fs.existsSync(FEEDBACK_FILE) ? FEEDBACK_FILE : TMP_FEEDBACK_FILE;
    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) feedbacks = parsed;
      } catch {
        feedbacks = [];
      }
    }

    // If viewed in browser, serve the beautified GenVoice Studio telemetry dashboard
    if (isBrowserHtml) {
      return new NextResponse(renderDashboardHtml(feedbacks, providedKey), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
    }

    // Default JSON format for automated tooling / curl
    return NextResponse.json(
      {
        total: feedbacks.length,
        feedbacks,
        message: feedbacks.length === 0 ? 'No user feedback recorded yet.' : undefined,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    if (isBrowserHtml) {
      return new NextResponse(
        `<div style="background:#121013;color:#f87171;padding:40px;font-family:sans-serif"><h3>Failed to read feedback telemetry</h3><p>${err.message}</p></div>`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    return NextResponse.json(
      { error: 'Failed to read feedback: ' + err.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
