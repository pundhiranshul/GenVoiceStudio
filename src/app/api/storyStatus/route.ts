import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, key, kernel } = await req.json();

    if (!username || !key || !kernel) {
      return NextResponse.json({ error: 'Missing credentials or kernel' }, { status: 400 });
    }

    let authHeader = '';
    if (key.length === 32 && /^[0-9a-f]+$/i.test(key)) {
      authHeader = 'Basic ' + Buffer.from(`${username}:${key}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + key;
    }

    const logsRes = await fetch(`https://www.kaggle.com/api/v1/kernels/output/${kernel}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!logsRes.ok) {
      return NextResponse.json({ status: "running" }); // Assume not ready
    }

    const logData = await logsRes.json();
    
    // Check if the kernel has failed or completed
    if (logData.status === "error") {
      return NextResponse.json({ status: "error", error: "Kaggle session failed" });
    }
    
    // Check the log for STORY_START and STORY_END
    const fullLog = logData.log || "";
    const startIdx = fullLog.indexOf("---STORY_START---");
    const endIdx = fullLog.indexOf("---STORY_END---");

    if (startIdx !== -1 && endIdx !== -1) {
      // Extract the story
      const story = fullLog.substring(startIdx + 17, endIdx).trim();
      return NextResponse.json({ status: "complete", story });
    }

    if (logData.status === "complete") {
      // Completed but no story found?
      return NextResponse.json({ status: "error", error: "Story not found in logs." });
    }

    return NextResponse.json({ status: logData.status || "running" });

  } catch (error: any) {
    console.error("Story Status Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
