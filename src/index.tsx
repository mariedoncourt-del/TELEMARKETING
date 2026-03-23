import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables } from './types';
import { auth, authMiddleware } from './routes/auth';
import { prospects } from './routes/prospects';
import { appels } from './routes/appels';
import { rdv } from './routes/rdv';
import { dashboard } from './routes/dashboard';
import { users } from './routes/users';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS
app.use('/api/*', cors());

// Routes publiques (pas de JWT)
app.route('/api/auth', auth);

// Middleware JWT pour toutes les routes /api/* sauf /api/auth/*
app.use('/api/prospects/*', authMiddleware);
app.use('/api/appels/*', authMiddleware);
app.use('/api/rdv/*', authMiddleware);
app.use('/api/dashboard/*', authMiddleware);
app.use('/api/users/*', authMiddleware);

// Routes protégées
app.route('/api/prospects', prospects);
app.route('/api/appels', appels);
app.route('/api/rdv', rdv);
app.route('/api/dashboard', dashboard);
app.route('/api/users', users);

// Route health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'MAF Telemarketing' });
});

// Servir l'application SPA
app.get('/', (c) => {
  return c.html(getMainHTML());
});

// Catch-all pour SPA routing
app.get('*', (c) => {
  const path = c.req.path;
  // Ne pas intercepter les fichiers statiques
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
                50: '#fff4f0',
                100: '#ffe6dc',
                200: '#ffcab3',
                300: '#ffa480',
                400: '#f47650',
                500: '#e8642c',
                600: '#d4501e',
                700: '#b03c16',
                800: '#8e3218',
                900: '#742c18',
                950: '#3f130a',
              },
              surface: {
                50: '#fafafa',
                100: '#f0f0f2',
                200: '#e2e2e6',
                300: '#c7c7ce',
                400: '#9e9eab',
                500: '#78788a',
                600: '#5c5c6e',
                700: '#48485a',
                800: '#2c2c38',
                900: '#1c1c24',
                950: '#111116',
              }
            },
            fontFamily: {
              sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
              mono: ['JetBrains Mono', 'monospace'],
            }
          }
        }
      }
    </script>
    <style>
      *, *::before, *::after { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }
      
      /* =====================================================
         MAF FORMATION - WARM LIGHT PREMIUM UI v5.0
         Identite visuelle : BLANC + GRIS CHAUD + ORANGE MAF
         Palette : #FFFFFF / #F5F5F5 / #EEEEEE / #E8642C
         Effet Apple : lumineux, aere, joyeux, premium
         ===================================================== */

      /* ====== ROOT VARIABLES ====== */
      :root {
        --maf-orange: #E8642C;
        --maf-orange-light: #F06525;
        --maf-orange-glow: rgba(232,100,44,0.15);
        --maf-peach: #FDEAE3;
        --maf-peach-light: #FFF4F0;
        --bg-primary: #F5F5F5;
        --bg-white: #FFFFFF;
        --bg-card: #FFFFFF;
        --text-dark: #111111;
        --text-medium: #222222;
        --text-light: #444444;
        --text-muted: #666666;
        --border-light: #E8E8E8;
        --border-medium: #DDDDDD;
        --shadow-soft: 0 2px 12px rgba(0,0,0,0.06);
        --shadow-medium: 0 8px 30px rgba(0,0,0,0.08);
        --shadow-hover: 0 12px 40px rgba(232,100,44,0.12), 0 4px 12px rgba(0,0,0,0.06);
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --radius-xl: 20px;
      }

      /* ====== BODY - FOND BLANC/GRIS LUMINEUX ====== */
      body {
        background: var(--bg-primary);
        min-height: 100vh;
        overflow-x: hidden;
        color: var(--text-dark);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      /* Lueur orange tres subtile en haut a gauche - style Apple */
      body::before {
        content: '';
        position: fixed;
        top: -20%; left: -10%;
        width: 60%; height: 60%;
        background: radial-gradient(ellipse, rgba(232,100,44,0.06) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
      }
      /* Lueur peche en bas a droite */
      body::after {
        content: '';
        position: fixed;
        bottom: -20%; right: -10%;
        width: 50%; height: 50%;
        background: radial-gradient(ellipse, rgba(251,146,60,0.04) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
      }
      #app { position: relative; z-index: 1; }

      /* ====== CARTES BLANCHES - Apple Card Style ====== */
      .glass {
        background: var(--bg-white);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-soft);
      }
      .glass-light {
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.6);
      }
      .glass-card {
        background: var(--bg-white);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        box-shadow: var(--shadow-soft);
      }
      .glass-card:hover {
        border-color: rgba(232,100,44,0.25);
        transform: translateY(-3px);
        box-shadow: var(--shadow-hover);
      }
      .glass-card-static {
        background: var(--bg-white);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-soft);
      }

      /* ====== INPUTS - Propres et lumineux ====== */
      .glass-input {
        background: #F8F8F8;
        border: 1.5px solid var(--border-medium);
        color: var(--text-dark);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
      }
      .glass-input:focus {
        background: var(--bg-white);
        border-color: var(--maf-orange);
        box-shadow: 0 0 0 3px var(--maf-orange-glow);
        outline: none;
      }
      .glass-input::placeholder { color: #999999; }

      /* ====== ANIMATIONS - Fluides Apple-like ====== */
      .fade-in { animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      .slide-up { animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      .scale-in { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      
      .stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
      .stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
      .stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
      .stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
      .stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
      .stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
      .stagger-children > * { animation-fill-mode: both; }

      .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 6px 24px rgba(232,100,44,0.2); }
        50% { box-shadow: 0 10px 48px rgba(232,100,44,0.35); }
      }
      .float { animation: float 6s ease-in-out infinite; }
      @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

      .count-up { animation: countReveal 0.6s ease-out both; }
      @keyframes countReveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      /* Rotation douce pour l'icone login */
      .icon-breathe { animation: iconBreathe 4s ease-in-out infinite; }
      @keyframes iconBreathe {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.05) rotate(2deg); }
        75% { transform: scale(1.05) rotate(-2deg); }
      }

      /* ====== PULSE & URGENCE ====== */
      .pulse-dot { animation: pulseDot 2s infinite; }
      @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      .timer-urgent { animation: urgentPulse 1s infinite; color: #dc2626; }
      @keyframes urgentPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

      /* ====== BOUTONS - Orange MAF vibrant ====== */
      .btn-primary {
        background: linear-gradient(135deg, #E8642C 0%, #F06525 50%, #E8642C 100%);
        background-size: 200% auto;
        color: white;
        font-weight: 600;
        padding: 0.625rem 1.5rem;
        border-radius: var(--radius-sm);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        box-shadow: 0 4px 14px rgba(232,100,44,0.3);
        cursor: pointer;
        letter-spacing: 0.01em;
      }
      .btn-primary:hover {
        background-position: right center;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(232,100,44,0.4);
      }
      .btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(232,100,44,0.3); }

      .btn-secondary {
        background: var(--bg-white);
        color: var(--text-medium);
        font-weight: 500;
        padding: 0.5rem 1.25rem;
        border-radius: var(--radius-sm);
        border: 1.5px solid var(--border-medium);
        transition: all 0.25s ease;
        cursor: pointer;
      }
      .btn-secondary:hover { background: #F0F0F0; color: var(--text-dark); border-color: #CCCCCC; transform: translateY(-1px); }

      .btn-danger { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; font-weight: 600; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); border: none; transition: all 0.25s; box-shadow: 0 4px 14px rgba(239,68,68,0.25); cursor: pointer; }
      .btn-danger:hover { box-shadow: 0 8px 25px rgba(239,68,68,0.35); transform: translateY(-2px); }
      .btn-success { background: linear-gradient(135deg, #10B981, #059669); color: white; font-weight: 600; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); border: none; transition: all 0.25s; box-shadow: 0 4px 14px rgba(16,185,129,0.25); cursor: pointer; }
      .btn-success:hover { box-shadow: 0 8px 25px rgba(16,185,129,0.35); transform: translateY(-2px); }
      .btn-warning { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; font-weight: 600; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); border: none; transition: all 0.25s; box-shadow: 0 4px 14px rgba(245,158,11,0.25); cursor: pointer; }
      .btn-warning:hover { box-shadow: 0 8px 25px rgba(245,158,11,0.35); transform: translateY(-2px); }

      /* ====== BADGES ====== */
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.7rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      /* ====== STAT CARDS - Effet elevation ====== */
      .stat-card {
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: var(--accent, var(--maf-orange));
        border-radius: 3px 3px 0 0;
        opacity: 0;
        transition: opacity 0.35s;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }

      /* ====== MODAL - Backdrop flou lumineux ====== */
      .modal-overlay {
        background: rgba(0,0,0,0.25);
        backdrop-filter: blur(12px) saturate(120%);
        -webkit-backdrop-filter: blur(12px) saturate(120%);
      }

      /* ====== SCROLLBAR - Orange subtil ====== */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #D5D5D5; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #E8642C; }

      /* ====== TABLE - Claire et aeree ====== */
      .dark-table { border-collapse: separate; border-spacing: 0; width: 100%; }
      .dark-table thead th {
        color: #444444;
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.875rem 1rem;
        border-bottom: 2px solid #EEEEEE;
        background: #FAFAFA;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .dark-table tbody tr { transition: all 0.2s ease; }
      .dark-table tbody tr:hover { background: var(--maf-peach-light); }
      .dark-table tbody td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid #F0F0F0;
        color: #1A1A1A;
        font-size: 0.82rem;
      }

      /* ====== CONFETTI ====== */
      .confetti-container { position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden; }
      .confetti { position: absolute; opacity: 0; animation: confettiFall 3.5s ease-in forwards; }
      @keyframes confettiFall { 
        0% { opacity: 1; transform: translateY(-100vh) rotate(0deg) scale(1); } 
        50% { opacity: 1; }
        100% { opacity: 0; transform: translateY(100vh) rotate(720deg) scale(0.5); } 
      }

      .success-glow { animation: successGlow 2.5s ease-out; }
      @keyframes successGlow { 
        0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 
        40% { box-shadow: 0 0 50px 20px rgba(16,185,129,0.15); } 
        100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } 
      }

      /* ====== PROGRESS BAR ====== */
      .progress-bar-glow { position: relative; overflow: hidden; border-radius: 999px; }
      .progress-bar-glow::after {
        content: '';
        position: absolute;
        top: 0; left: -50%;
        width: 50%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
        animation: progressSweep 2s ease-in-out infinite;
      }
      @keyframes progressSweep { 0% { left: -50%; } 100% { left: 150%; } }

      /* ====== TYPOGRAPHY ====== */
      .text-gradient {
        background: linear-gradient(135deg, #E8642C, #F59E0B);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* ====== ACTION BUTTONS - pour resultats appel ====== */
      .action-btn {
        background: var(--bg-white);
        border: 1.5px solid var(--border-light);
        border-radius: var(--radius-md);
        padding: 1rem 1.125rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }
      .action-btn:hover {
        transform: translateX(6px);
        border-color: var(--btn-color, var(--border-medium));
        background: var(--btn-bg, var(--maf-peach-light));
        box-shadow: 0 6px 20px var(--btn-glow, rgba(0,0,0,0.05));
      }

      /* ====== FORM ELEMENTS ====== */
      select, input[type="number"] {
        background: #F8F8F8;
        border: 1.5px solid var(--border-medium);
        color: var(--text-dark);
        border-radius: var(--radius-sm);
        transition: all 0.25s;
      }
      select:focus, input[type="number"]:focus {
        outline: none;
        border-color: var(--maf-orange);
        box-shadow: 0 0 0 3px var(--maf-orange-glow);
        background: var(--bg-white);
      }
      select option { background: var(--bg-white); color: var(--text-dark); }
      textarea {
        background: #F8F8F8;
        border: 1.5px solid var(--border-medium);
        color: var(--text-dark);
        border-radius: var(--radius-sm);
        transition: all 0.25s;
      }
      textarea:focus {
        outline: none;
        border-color: var(--maf-orange);
        box-shadow: 0 0 0 3px var(--maf-orange-glow);
        background: var(--bg-white);
      }
      textarea::placeholder { color: #999999; }
      input[type="datetime-local"], input[type="text"], input[type="tel"], input[type="email"], input[type="password"] {
        color-scheme: light;
      }

      /* ====== DIVERS ====== */
      .divider { height: 1px; background: linear-gradient(90deg, transparent, #E0E0E0, transparent); margin: 0.5rem 0; }
      
      .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; position: relative; display: inline-block; }
      .live-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(16,185,129,0.25); animation: livePing 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      @keyframes livePing { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
      
      .hover-lift { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
      
      .particle-field { display: none; }

      /* ====== LOGIN PAGE SPECIFIC ====== */
      .login-bg {
        background: linear-gradient(160deg, #F5F5F5 0%, #FDEAE3 40%, #FFF4F0 60%, #F5F5F5 100%);
        min-height: 100vh;
      }
      .login-card {
        background: var(--bg-white);
        border-radius: var(--radius-xl);
        box-shadow: 0 25px 80px rgba(232,100,44,0.08), 0 8px 32px rgba(0,0,0,0.06);
        border: 1px solid rgba(232,100,44,0.06);
      }
      .login-icon-circle {
        width: 80px; height: 80px;
        border-radius: 50%;
        background: var(--maf-peach);
        display: flex; align-items: center; justify-content: center;
      }
      .login-icon-circle i { color: var(--maf-orange); font-size: 2rem; }

      /* ====== NAVBAR - Clean white Apple-style ====== */
      .nav-bar {
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 1px solid rgba(0,0,0,0.06);
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .nav-link {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        font-weight: 600;
        transition: all 0.25s ease;
        color: var(--text-muted);
        text-decoration: none;
        display: flex;
        align-items: center;
      }
      .nav-link:hover { color: var(--text-medium); background: #F5F5F5; }
      .nav-link.active { color: var(--maf-orange); background: var(--maf-peach-light); }

      /* ====== SECTION HEADERS ====== */
      .section-title { 
        font-size: 1.375rem; 
        font-weight: 800; 
        color: var(--text-dark);
        letter-spacing: -0.02em;
      }
      .section-subtitle { 
        font-size: 0.85rem; 
        color: var(--text-light); 
        margin-top: 0.25rem;
        font-weight: 400;
      }
    </style>
</head>
<body>
    <div id="app"></div>
    <script src="/static/app.js"></script>
</body>
</html>`;
}

export default app;
