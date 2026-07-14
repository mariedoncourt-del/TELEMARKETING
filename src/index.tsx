import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables } from './types';
import { auth, authMiddleware } from './routes/auth';
import { prospects } from './routes/prospects';
import { appels } from './routes/appels';
import { rdv } from './routes/rdv';
import { dashboard } from './routes/dashboard';
import { users } from './routes/users';
import { performance } from './routes/performance';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('/api/*', cors());

// Routes publiques
app.route('/api/auth', auth);

// Routes protégées JWT
app.use('/api/prospects/*', authMiddleware);
app.use('/api/appels/*', authMiddleware);
app.use('/api/rdv/*', authMiddleware);
app.use('/api/dashboard/*', authMiddleware);
app.use('/api/users/*', authMiddleware);
app.use('/api/performance/*', authMiddleware);

app.route('/api/prospects', prospects);
app.route('/api/appels', appels);
app.route('/api/rdv', rdv);
app.route('/api/dashboard', dashboard);
app.route('/api/users', users);
app.route('/api/performance', performance);

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'MAF Telemarketing' });
});

app.get('/', (c) => c.html(getMainHTML()));

app.get('*', (c) => {
  const path = c.req.path;
  if (path.startsWith('/api/') || path.startsWith('/static/') || path.includes('.')) {
    return c.notFound();
  }
  return c.html(getMainHTML());
});

function getMainHTML(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MAF Formation - Plateforme Telemarketing</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            maf: {
              50: '#fff4f0', 100: '#ffe6dc', 200: '#ffcab3', 300: '#ffa480',
              400: '#f47650', 500: '#e8642c', 600: '#d4501e', 700: '#b03c16',
              800: '#8e3218', 900: '#742c18', 950: '#3f130a'
            }
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          }
        }
      }
    }
  </script>
  <style>
    *, *::before, *::after { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }
    :root {
      --maf-orange:#E8642C; --maf-orange-light:#F06525; --maf-orange-glow:rgba(232,100,44,0.15);
      --maf-peach:#FDEAE3; --maf-peach-light:#FFF4F0; --bg-primary:#F5F5F5; --bg-white:#FFFFFF;
      --text-dark:#111111; --text-medium:#222222; --text-light:#444444; --text-muted:#666666;
      --border-light:#E8E8E8; --border-medium:#DDDDDD; --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:20px;
      --shadow-soft:0 2px 12px rgba(0,0,0,0.06); --shadow-hover:0 12px 40px rgba(232,100,44,0.12), 0 4px 12px rgba(0,0,0,0.06);
    }
    body { background: var(--bg-primary); min-height:100vh; overflow-x:hidden; color:var(--text-dark); -webkit-font-smoothing:antialiased; }
    body::before { content:''; position:fixed; top:-20%; left:-10%; width:60%; height:60%; background:radial-gradient(ellipse, rgba(232,100,44,0.06) 0%, transparent 70%); pointer-events:none; z-index:0; }
    body::after { content:''; position:fixed; bottom:-20%; right:-10%; width:50%; height:50%; background:radial-gradient(ellipse, rgba(251,146,60,0.04) 0%, transparent 70%); pointer-events:none; z-index:0; }
    #app { position:relative; z-index:1; }
    .glass, .glass-card, .glass-card-static { background:var(--bg-white); border:1px solid var(--border-light); border-radius:var(--radius-lg); box-shadow:var(--shadow-soft); }
    .glass-card { transition:all .25s ease; }
    .glass-card:hover { border-color:rgba(232,100,44,.25); box-shadow:var(--shadow-hover); }
    .glass-input, textarea, select, input[type="number"], input[type="datetime-local"], input[type="text"], input[type="tel"], input[type="email"], input[type="password"] { background:#F8F8F8; border:1.5px solid var(--border-medium); color:var(--text-dark); border-radius:var(--radius-sm); }
    .glass-input:focus, textarea:focus, select:focus, input:focus { outline:none; border-color:var(--maf-orange); box-shadow:0 0 0 3px var(--maf-orange-glow); background:white; }
    .btn-primary { background:linear-gradient(135deg,#E8642C,#F06525,#E8642C); color:white; font-weight:600; padding:.625rem 1.5rem; border-radius:var(--radius-sm); border:none; box-shadow:0 4px 14px rgba(232,100,44,.3); cursor:pointer; }
    .btn-secondary { background:white; color:var(--text-medium); font-weight:500; padding:.5rem 1.25rem; border-radius:var(--radius-sm); border:1.5px solid var(--border-medium); cursor:pointer; }
    .btn-danger { background:linear-gradient(135deg,#EF4444,#DC2626); color:white; font-weight:600; padding:.5rem 1.25rem; border-radius:var(--radius-sm); border:none; cursor:pointer; }
    .btn-success { background:linear-gradient(135deg,#10B981,#059669); color:white; font-weight:600; padding:.5rem 1.25rem; border-radius:var(--radius-sm); border:none; cursor:pointer; }
    .btn-warning { background:linear-gradient(135deg,#F59E0B,#D97706); color:white; font-weight:600; padding:.5rem 1.25rem; border-radius:var(--radius-sm); border:none; cursor:pointer; }
    .badge { display:inline-flex; align-items:center; padding:.25rem .7rem; border-radius:9999px; font-size:.7rem; font-weight:600; white-space:nowrap; }
    .action-btn { background:white; border:1.5px solid var(--border-light); border-radius:var(--radius-md); padding:1rem 1.125rem; cursor:pointer; transition:all .25s ease; display:flex; align-items:center; justify-content:space-between; width:100%; }
    .action-btn:hover { transform:translateX(6px); border-color:var(--btn-color,var(--border-medium)); background:var(--btn-bg,var(--maf-peach-light)); }
    .dark-table { border-collapse:separate; border-spacing:0; width:100%; }
    .dark-table thead th { color:#444; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:.875rem 1rem; border-bottom:2px solid #EEE; background:#FAFAFA; }
    .dark-table tbody td { padding:.875rem 1rem; border-bottom:1px solid #F0F0F0; color:#1A1A1A; font-size:.82rem; }
    .dark-table tbody tr:hover { background:var(--maf-peach-light); }
    .fade-in { animation:fadeIn .45s ease; } @keyframes fadeIn { from{opacity:0; transform:translateY(12px)} to{opacity:1; transform:translateY(0)} }
    .slide-up { animation:slideUp .45s ease; } @keyframes slideUp { from{opacity:0; transform:translateY(18px)} to{opacity:1; transform:translateY(0)} }
    .scale-in { animation:scaleIn .3s ease; } @keyframes scaleIn { from{opacity:0; transform:scale(.96)} to{opacity:1; transform:scale(1)} }
    .text-gradient { background:linear-gradient(135deg,#E8642C,#F59E0B); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .section-title { font-size:1.375rem; font-weight:800; color:var(--text-dark); letter-spacing:-.02em; }
    .section-subtitle { font-size:.85rem; color:var(--text-light); margin-top:.25rem; }
    .nav-bar { background:rgba(255,255,255,.88); backdrop-filter:blur(20px); border-bottom:1px solid rgba(0,0,0,.06); box-shadow:0 1px 3px rgba(0,0,0,.04); }
    .nav-link { padding:.5rem 1rem; border-radius:var(--radius-sm); font-size:.8rem; font-weight:600; color:var(--text-muted); text-decoration:none; display:flex; align-items:center; }
    .nav-link:hover { color:var(--text-medium); background:#F5F5F5; } .nav-link.active { color:var(--maf-orange); background:var(--maf-peach-light); }
    .live-dot { width:8px; height:8px; border-radius:50%; background:#10B981; display:inline-block; }
    .timer-urgent { animation:urgentPulse 1s infinite; color:#dc2626; } @keyframes urgentPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .gauge-ring { transform:rotate(-90deg); } .gauge-ring circle { fill:none; stroke-linecap:round; transition:stroke-dashoffset 1s ease; } .gauge-bg{stroke:#EEE} .gauge-fill{stroke:var(--maf-orange)} .gauge-fill.gauge-green{stroke:#10B981} .gauge-fill.gauge-amber{stroke:#F59E0B}
    .leaderboard-rank { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:.75rem; flex-shrink:0; }
    .rank-gold{background:linear-gradient(135deg,#FDE68A,#F59E0B); color:#92400E}.rank-silver{background:linear-gradient(135deg,#E5E7EB,#9CA3AF); color:#374151}.rank-bronze{background:linear-gradient(135deg,#FED7AA,#EA580C); color:#7C2D12}.rank-default{background:#F3F4F6;color:#6B7280}
    .toast-container{position:fixed; top:1rem; right:1rem; z-index:9998; display:flex; flex-direction:column; gap:.5rem; pointer-events:none}.toast{pointer-events:auto; background:white; border:1.5px solid #A7F3D0; border-radius:12px; padding:1rem 1.25rem; box-shadow:0 12px 40px rgba(16,185,129,.15),0 4px 12px rgba(0,0,0,.06); max-width:360px; display:flex; align-items:center; gap:.75rem}
    .confetti-container{position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden}.confetti{position:absolute; opacity:0; animation:confettiFall 3.5s ease-in forwards}@keyframes confettiFall{0%{opacity:1; transform:translateY(-100vh) rotate(0) scale(1)}100%{opacity:0; transform:translateY(100vh) rotate(720deg) scale(.5)}}
    .login-bg{background:linear-gradient(160deg,#F5F5F5 0%,#FDEAE3 40%,#FFF4F0 60%,#F5F5F5 100%); min-height:100vh}.login-card{background:white; border-radius:20px; box-shadow:0 25px 80px rgba(232,100,44,.08),0 8px 32px rgba(0,0,0,.06)}.login-icon-circle{width:80px;height:80px;border-radius:50%;background:var(--maf-peach);display:flex;align-items:center;justify-content:center}.login-icon-circle i{color:var(--maf-orange);font-size:2rem}
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="/static/app.js"></script>
  <script src="/static/performance.js"></script>
</body>
</html>`;
}

export default app;
