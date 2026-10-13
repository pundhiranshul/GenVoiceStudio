export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderUnauthorizedHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unauthorized • Feedback</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #121013;
      color: #EDEDED;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1A181C;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 32px 28px;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #EDEDED;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    p {
      color: #71717A;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .input-row {
      display: flex;
      gap: 8px;
    }
    input {
      flex: 1;
      background: #242226;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      color: #EDEDED;
      outline: none;
    }
    input:focus {
      border-color: rgba(255, 255, 255, 0.25);
    }
    button {
      background: #EAE5DB;
      color: #111111;
      border: none;
      border-radius: 8px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: #FFFFFF;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Damn boy, are you lost or something? Call your parents.</h1>
    <p>Enter the admin password to view feedback.</p>
    <div class="input-row">
      <input type="password" id="secretInput" placeholder="Password..." autocomplete="off" />
      <button onclick="unlock()">Unlock</button>
    </div>
  </div>

  <script>
    function unlock() {
      const val = document.getElementById('secretInput').value.trim();
      if (!val) return;
      const url = new URL(window.location.href);
      url.searchParams.set('secret', val);
      window.location.href = url.toString();
    }
    document.getElementById('secretInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlock();
    });
  </script>
</body>
</html>`;
}

export function renderDashboardHtml(feedbacks: any[], secret: string): string {
  const count = feedbacks.length;
  const safeFeedbacksJson = JSON.stringify(feedbacks).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Feedback • GenVoice Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #121013;
      color: #EDEDED;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .container {
      max-width: 860px;
      width: 100%;
      margin: 0 auto;
      padding: 40px 24px 60px;
      flex: 1;
    }

    /* Platform Style Header (Matches /library) */
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .icon-box {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(234, 229, 219, 0.08);
      border: 1px solid rgba(234, 229, 219, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #EDEDED;
      flex-shrink: 0;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #EDEDED;
    }
    .subtitle {
      font-size: 13px;
      color: #71717A;
      margin-top: 2px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      background: #1A181C;
      color: #A1A1AA;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.15s;
    }
    .btn:hover {
      color: #EDEDED;
      background: #242226;
      border-color: rgba(255, 255, 255, 0.15);
    }

    /* Filter & Search Bar */
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .search-input {
      flex: 1;
      min-width: 220px;
      background: #1A181C;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      color: #EDEDED;
      outline: none;
    }
    .search-input:focus {
      border-color: rgba(255, 255, 255, 0.2);
    }
    .pill {
      font-size: 12px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 8px;
      background: #1A181C;
      color: #71717A;
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
    }
    .pill:hover, .pill.active {
      color: #EDEDED;
      background: #242226;
      border-color: rgba(255, 255, 255, 0.18);
    }

    /* Feedback Cards List (Matches /library item styling) */
    .feedback-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .feedback-item {
      background: rgba(26, 24, 28, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      transition: border-color 0.15s;
    }
    .feedback-item:hover {
      border-color: rgba(255, 255, 255, 0.14);
      background: rgba(26, 24, 28, 0.9);
    }
    .item-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .purpose-badge {
      padding: 3px 8px;
      border-radius: 6px;
      background: #121013;
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11px;
      font-weight: 600;
      color: #EDEDED;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .trigger-badge {
      font-size: 11px;
      color: #71717A;
      text-transform: capitalize;
    }
    .item-details {
      min-width: 0;
    }
    .item-purpose {
      font-size: 14px;
      font-weight: 600;
      color: #EDEDED;
    }
    .item-meta {
      font-size: 12px;
      color: #71717A;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .user-name {
      color: #A1A1AA;
    }
    .item-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .item-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #52525B;
    }

    /* Clean Empty State (Matches /library empty) */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #71717A;
    }
    .empty-state svg {
      opacity: 0.2;
      margin: 0 auto 12px;
      display: block;
    }
    .empty-state p {
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <div class="header-left">
        <div class="icon-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div>
          <h1>User Feedback</h1>
          <div class="subtitle">${count} ${count === 1 ? 'response' : 'responses'} recorded</div>
        </div>
      </div>

      <div class="header-actions">
        <button class="btn" onclick="window.location.reload()">Refresh</button>
        <button class="btn" onclick="downloadJson()">Export JSON</button>
        <a href="?secret=${encodeURIComponent(secret)}&format=json" class="btn">Raw JSON</a>
      </div>
    </header>

    <!-- Simple Filter Bar -->
    <div class="filter-bar">
      <input type="text" id="searchInput" class="search-input" placeholder="Search feedback..." oninput="filterFeedbacks()" />
      <button class="pill active" onclick="setTriggerFilter('all', this)">All</button>
      <button class="pill" onclick="setTriggerFilter('generation', this)">Generation</button>
      <button class="pill" onclick="setTriggerFilter('exit', this)">Exit Intent</button>
      <button class="pill" onclick="setTriggerFilter('manual', this)">Manual</button>
    </div>

    <!-- Feedback List / Empty State -->
    <div id="feedbackContainer">
      ${
        count === 0
          ? `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>No feedback recorded yet.</p>
      </div>
      `
          : `
      <div class="feedback-list" id="feedbackList"></div>
      `
      }
    </div>
  </div>

  <script>
    const feedbacks = ${safeFeedbacksJson};
    let currentTrigger = 'all';

    function formatTime(isoStr) {
      if (!isoStr) return '';
      try {
        const d = new Date(isoStr);
        return d.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return isoStr;
      }
    }

    function renderList(items) {
      const listEl = document.getElementById('feedbackList');
      if (!listEl) return;

      if (items.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>No feedback matches your filter.</p></div>';
        return;
      }

      listEl.innerHTML = items.map(fb => {
        const trigger = (fb.trigger || 'manual').toLowerCase();
        const purpose = fb.purpose || 'General';
        const user = fb.username ? ('@' + fb.username) : 'Anonymous';
        const time = formatTime(fb.timestamp);
        const id = fb.id || '';

        return \`
          <div class="feedback-item">
            <div class="item-left">
              <div class="item-details">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span class="purpose-badge">\${escapeHtml(purpose)}</span>
                  <span class="trigger-badge">\${trigger}</span>
                </div>
                <div class="item-meta">
                  <span class="user-name">\${escapeHtml(user)}</span>
                  <span>•</span>
                  <span>\${time}</span>
                </div>
              </div>
            </div>

            <div class="item-right">
              <span class="item-id">\${id}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function filterFeedbacks() {
      const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
      const filtered = feedbacks.filter(fb => {
        const matchesTrigger = (currentTrigger === 'all') || ((fb.trigger || '').toLowerCase() === currentTrigger);
        if (!matchesTrigger) return false;
        if (!q) return true;

        const purpose = (fb.purpose || '').toLowerCase();
        const user = (fb.username || '').toLowerCase();
        const id = (fb.id || '').toLowerCase();
        return purpose.includes(q) || user.includes(q) || id.includes(q);
      });
      renderList(filtered);
    }

    function setTriggerFilter(trig, btn) {
      currentTrigger = trig;
      document.querySelectorAll('.pill').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      filterFeedbacks();
    }

    function downloadJson() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(feedbacks, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", "feedback.json");
      document.body.appendChild(dl);
      dl.click();
      dl.remove();
    }

    if (feedbacks.length > 0) {
      renderList(feedbacks);
    }
  </script>
</body>
</html>`;
}
