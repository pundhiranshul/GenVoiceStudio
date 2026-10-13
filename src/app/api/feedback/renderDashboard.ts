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
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>401 • GenVoice Telemetry</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #121013;
      --bg-panel: #1A181C;
      --bg-card: #201E23;
      --bg-input: #26242A;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(255, 255, 255, 0.16);
      --text-primary: #EDEDED;
      --text-secondary: #A1A1AA;
      --text-muted: #71717A;
      --accent-warm: #EAE5DB;
      --accent-rose: #F43F5E;
      --accent-purple: #A855F7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow-x: hidden;
    }
    .mesh-glow {
      position: fixed;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(244, 63, 94, 0.08) 0%, rgba(168, 85, 247, 0.04) 50%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 0;
    }
    .card {
      position: relative;
      z-index: 1;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 40px 36px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(244, 63, 94, 0.12);
      color: #FB7185;
      border: 1px solid rgba(244, 63, 94, 0.25);
      margin-bottom: 20px;
    }
    .icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: #FB7185;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      margin-bottom: 12px;
    }
    p {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .unlock-box {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .unlock-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: block;
    }
    .input-row {
      display: flex;
      gap: 8px;
    }
    input {
      flex: 1;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--text-primary);
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
    }
    button.unlock-btn {
      background: var(--accent-warm);
      color: #121013;
      border: none;
      border-radius: 10px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    button.unlock-btn:hover {
      background: #FFFFFF;
      transform: translateY(-1px);
    }
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      font-size: 13px;
      text-decoration: none;
      transition: color 0.2s;
    }
    .back-btn:hover {
      color: var(--text-primary);
    }
  </style>
</head>
<body>
  <div class="mesh-glow"></div>
  <div class="card">
    <div class="icon-wrap">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>
    <div class="badge">401 • RESTRICTED ACCESS</div>
    <h1>Damn boy, are you lost or something? Call your parents.</h1>
    <p>You have stumbled into the private GenVoice feedback & telemetry stream. Access requires administrative clearance.</p>

    <div class="unlock-box">
      <label class="unlock-label" for="secretInput">Have the Admin Password?</label>
      <div class="input-row">
        <input type="password" id="secretInput" placeholder="Enter password..." autocomplete="off" />
        <button class="unlock-btn" onclick="unlock()">Unlock →</button>
      </div>
    </div>

    <a href="/" class="back-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Back to GenVoice Studio
    </a>
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
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Feedback Telemetry • GenVoice Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #121013;
      --bg-panel: #1A181C;
      --bg-card: #201E23;
      --bg-card-hover: #26242B;
      --bg-input: #242226;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(255, 255, 255, 0.16);
      --text-primary: #EDEDED;
      --text-secondary: #A1A1AA;
      --text-muted: #71717A;
      --accent-warm: #EAE5DB;
      --accent-emerald: #10B981;
      --accent-purple: #A855F7;
      --accent-blue: #38BDF8;
      --accent-amber: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .mesh-glow {
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.04) 0%, rgba(236, 72, 153, 0.02) 40%, transparent 70%);
      top: -200px;
      right: -200px;
      pointer-events: none;
      z-index: 0;
    }
    .container {
      position: relative;
      z-index: 1;
      max-width: 1100px;
      width: 100%;
      margin: 0 auto;
      padding: 32px 24px 60px;
      flex: 1;
    }

    /* Navbar Header */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 32px;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2));
      border: 1px solid rgba(168, 85, 247, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #E9D5FF;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
    }
    .title-col h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tag-telemetry {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }
    .title-col p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .actions-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-secondary {
      background: var(--bg-panel);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }
    .btn-secondary:hover {
      color: var(--text-primary);
      background: var(--bg-card);
      border-color: var(--border-hover);
    }
    .btn-primary {
      background: var(--accent-warm);
      color: #121013;
      border: none;
      font-weight: 600;
    }
    .btn-primary:hover {
      background: #FFFFFF;
      transform: translateY(-1px);
    }

    /* Metric Stat Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 20px;
      transition: border-color 0.2s;
    }
    .stat-card:hover {
      border-color: var(--border-hover);
    }
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }
    .stat-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
      display: inline-block;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* Toolbar: Filters and Search */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      flex: 1;
      min-width: 260px;
      max-width: 420px;
    }
    .search-box input {
      width: 100%;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 10px 14px 10px 38px;
      font-size: 13px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s;
    }
    .search-box input:focus {
      border-color: rgba(255, 255, 255, 0.25);
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }
    .filter-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .filter-pill {
      font-size: 12px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 8px;
      background: var(--bg-panel);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-pill:hover, .filter-pill.active {
      color: #FFFFFF;
      background: var(--bg-card);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Feedback Cards List */
    .feedback-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .feedback-item {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      transition: all 0.2s;
    }
    .feedback-item:hover {
      background: var(--bg-card);
      border-color: var(--border-hover);
      transform: translateY(-1px);
    }
    .fb-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }
    .fb-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--text-secondary);
    }
    .fb-details {
      min-width: 0;
    }
    .fb-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .fb-purpose {
      font-size: 15px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .badge-trigger {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      text-transform: capitalize;
    }
    .badge-trigger.generation {
      color: #FCD34D;
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.25);
    }
    .badge-trigger.exit {
      color: #F87171;
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.25);
    }
    .badge-trigger.manual {
      color: #60A5FA;
      background: rgba(59, 130, 246, 0.12);
      border-color: rgba(59, 130, 246, 0.25);
    }
    .fb-meta {
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .fb-user {
      color: var(--text-secondary);
      font-weight: 500;
    }
    .fb-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .fb-time {
      font-size: 12px;
      color: var(--text-muted);
      text-align: right;
    }
    .fb-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s;
    }
    .fb-id:hover {
      color: var(--text-primary);
      border-color: var(--border-hover);
    }

    /* Empty State */
    .empty-state {
      background: var(--bg-panel);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      padding: 60px 24px;
      text-align: center;
      margin-top: 10px;
    }
    .empty-radar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(168, 85, 247, 0.08);
      border: 1px solid rgba(168, 85, 247, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: #C084FC;
      position: relative;
    }
    .empty-radar::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 1px solid rgba(168, 85, 247, 0.4);
      animation: ripple 2.5s infinite ease-out;
    }
    @keyframes ripple {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 8px;
    }
    .empty-state p {
      font-size: 14px;
      color: var(--text-secondary);
      max-width: 440px;
      margin: 0 auto 24px;
      line-height: 1.5;
    }

    /* Footer */
    footer {
      border-top: 1px solid var(--border-subtle);
      padding-top: 24px;
      margin-top: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 12px;
    }
    .footer-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-link {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer-link:hover {
      color: #FFFFFF;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--bg-card);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      display: none;
      z-index: 100;
      animation: slideUp 0.25s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="mesh-glow"></div>

  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand-wrap">
        <div class="logo-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5v14M7 5v14M2 9v6M22 9v6"></path>
          </svg>
        </div>
        <div class="title-col">
          <h1>
            GenVoice Studio
            <span class="tag-telemetry">Telemetry</span>
          </h1>
          <p>Protected user feedback records & purpose insights</p>
        </div>
      </div>

      <div class="actions-wrap">
        <button class="btn btn-secondary" onclick="window.location.reload()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh
        </button>

        <button class="btn btn-secondary" onclick="downloadJson()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export JSON
        </button>

        <a href="?secret=${encodeURIComponent(secret)}&format=json" class="btn btn-secondary">
          Raw JSON
        </a>

        <a href="/" class="btn btn-primary">
          Back to Studio →
        </a>
      </div>
    </header>

    <!-- Metrics Grid -->
    <div class="metrics-grid">
      <div class="stat-card">
        <div class="stat-label">
          <span>Total Records</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <div class="stat-value" id="totalCount">${count}</div>
        <div class="stat-sub">User responses recorded</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">
          <span>Telemetry Stream</span>
          <span class="pulse-dot"></span>
        </div>
        <div class="stat-value" style="font-size: 20px; line-height: 1.4; color: #34D399;">Active & Listening</div>
        <div class="stat-sub">Logging live from Studio & Vercel</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">
          <span>Storage Vault</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <div class="stat-value" style="font-size: 16px; font-family: 'JetBrains Mono', monospace; font-weight: 500; color: #EAE5DB;">data/feedback.json</div>
        <div class="stat-sub">Protected private filesystem storage</div>
      </div>
    </div>

    <!-- Toolbar: Search & Filters -->
    <div class="toolbar">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="searchInput" placeholder="Search by purpose, user, or trigger..." oninput="filterFeedbacks()" />
      </div>

      <div class="filter-pills">
        <button class="filter-pill active" onclick="setTriggerFilter('all', this)">All (${count})</button>
        <button class="filter-pill" onclick="setTriggerFilter('generation', this)">Generation</button>
        <button class="filter-pill" onclick="setTriggerFilter('exit', this)">Exit Intent</button>
        <button class="filter-pill" onclick="setTriggerFilter('manual', this)">Manual</button>
      </div>
    </div>

    <!-- Feedbacks Container -->
    <div id="feedbackContainer">
      ${
        count === 0
          ? `
      <div class="empty-state">
        <div class="empty-radar">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h3>No user feedback recorded yet</h3>
        <p>When users select their creation purpose in the modal (after voice generation or when exiting), their feedback will stream into this dashboard automatically.</p>
        <button class="btn btn-secondary" onclick="sendTestFeedback()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Send Test Record
        </button>
      </div>
      `
          : `
      <div class="feedback-list" id="feedbackList"></div>
      `
      }
    </div>

    <!-- Footer -->
    <footer>
      <div class="footer-left">
        <span class="pulse-dot"></span>
        <span>Secured via admin key</span>
        <span>•</span>
        <span>GenVoice Studio Telemetry v1.0</span>
      </div>
      <div>
        <a href="/" class="footer-link">GenVoice Studio Homepage →</a>
      </div>
    </footer>
  </div>

  <div class="toast" id="toast">Copied to clipboard</div>

  <script>
    const feedbacks = ${safeFeedbacksJson};
    let currentTrigger = 'all';

    function getPurposeIcon(purposeId) {
      // Return subtle SVG icon based on purpose
      return \`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>\`;
    }

    function formatTime(isoStr) {
      if (!isoStr) return 'Just now';
      try {
        const d = new Date(isoStr);
        return d.toLocaleDateString(undefined, {
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
        listEl.innerHTML = \`
          <div class="empty-state" style="padding: 40px 20px;">
            <p style="margin: 0; color: var(--text-muted);">No records match your filter criteria.</p>
          </div>
        \`;
        return;
      }

      listEl.innerHTML = items.map(fb => {
        const trigger = (fb.trigger || 'manual').toLowerCase();
        const purpose = fb.purpose || 'General';
        const user = fb.username ? ('@' + fb.username) : 'Anonymous';
        const time = formatTime(fb.timestamp);
        const id = fb.id || 'fb_unknown';

        return \`
          <div class="feedback-item">
            <div class="fb-left">
              <div class="fb-icon">
                \${getPurposeIcon(fb.purposeId)}
              </div>
              <div class="fb-details">
                <div class="fb-title-row">
                  <span class="fb-purpose">\${escapeHtml(purpose)}</span>
                  <span class="badge-trigger \${trigger}">\${trigger}</span>
                </div>
                <div class="fb-meta">
                  <span class="fb-user">\${escapeHtml(user)}</span>
                  <span>•</span>
                  <span>\${time}</span>
                </div>
              </div>
            </div>

            <div class="fb-right">
              <span class="fb-id" title="Click to copy ID" onclick="copyText('\${id}')">#\${id}</span>
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
        const trig = (fb.trigger || '').toLowerCase();
        const id = (fb.id || '').toLowerCase();
        return purpose.includes(q) || user.includes(q) || trig.includes(q) || id.includes(q);
      });
      renderList(filtered);
    }

    function setTriggerFilter(trig, btn) {
      currentTrigger = trig;
      document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      filterFeedbacks();
    }

    function copyText(txt) {
      navigator.clipboard.writeText(txt).then(() => {
        showToast('Copied ID: ' + txt);
      }).catch(() => {
        showToast('ID: ' + txt);
      });
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2200);
    }

    function downloadJson() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(feedbacks, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", "genvoice_feedback_" + Date.now() + ".json");
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
    }

    async function sendTestFeedback() {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purpose: 'Audiobooks & Narration',
            purposeId: 'audiobooks',
            trigger: 'manual',
            username: 'test_admin'
          })
        });
        if (res.ok) {
          showToast('Test record sent! Reloading...');
          setTimeout(() => { window.location.reload(); }, 600);
        } else {
          alert('Failed to send test record');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    // Initial render
    if (feedbacks.length > 0) {
      renderList(feedbacks);
    }
  </script>
</body>
</html>`;
}
