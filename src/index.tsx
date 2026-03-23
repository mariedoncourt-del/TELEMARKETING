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
      
      /* =========================================
         MAF FORMATION - PREMIUM IMMERSIVE UI
         Inspired by Apple Human Interface Guidelines
         Orange Identity: #E8642C
         ========================================= */

      /* ====== BODY & COSMIC BACKGROUND ====== */
      body {
        background: #0c0c10;
        min-height: 100vh;
        overflow-x: hidden;
        color: #e4e4e7;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Animated mesh gradient background - creates depth */
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background: 
          radial-gradient(ellipse 80% 60% at 10% 20%, rgba(232, 100, 44, 0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 90% 80%, rgba(99, 102, 241, 0.07) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 50% 100%, rgba(232, 100, 44, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
        animation: cosmicDrift 30s ease-in-out infinite alternate;
      }
      body::after {
        content: '';
        position: fixed;
        inset: 0;
        background: 
          radial-gradient(circle 600px at 20% 30%, rgba(232, 100, 44, 0.05) 0%, transparent 100%),
          radial-gradient(circle 400px at 80% 70%, rgba(99, 102, 241, 0.04) 0%, transparent 100%);
        pointer-events: none;
        z-index: 0;
        animation: cosmicDrift 25s ease-in-out infinite alternate-reverse;
      }
      @keyframes cosmicDrift {
        0% { transform: translate(0, 0) rotate(0deg) scale(1); }
        33% { transform: translate(-1.5%, 1%) rotate(0.5deg) scale(1.02); }
        66% { transform: translate(1%, -1.5%) rotate(-0.3deg) scale(1.01); }
        100% { transform: translate(-2%, -1%) rotate(0.2deg) scale(1.03); }
      }
      
      /* Subtle noise texture overlay for premium feel */
      #app { 
        position: relative; 
        z-index: 1; 
      }

      /* ====== GLASSMORPHISM SYSTEM ====== */
      .glass {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(60px) saturate(180%);
        -webkit-backdrop-filter: blur(60px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .glass-light {
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(40px) saturate(160%);
        -webkit-backdrop-filter: blur(40px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .glass-card {
        background: rgba(255, 255, 255, 0.035);
        backdrop-filter: blur(24px) saturate(150%);
        -webkit-backdrop-filter: blur(24px) saturate(150%);
        border: 1px solid rgba(255, 255, 255, 0.06);
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .glass-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(232, 100, 44, 0.15);
        transform: translateY(-3px);
        box-shadow: 
          0 24px 48px rgba(0, 0, 0, 0.25),
          0 0 0 1px rgba(232, 100, 44, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }
      
      .glass-card-static {
        background: rgba(255, 255, 255, 0.035);
        backdrop-filter: blur(24px) saturate(150%);
        -webkit-backdrop-filter: blur(24px) saturate(150%);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .glass-input {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #f4f4f5;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        border-radius: 0.75rem;
      }
      .glass-input:focus {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(232, 100, 44, 0.6);
        box-shadow: 
          0 0 0 3px rgba(232, 100, 44, 0.12),
          0 0 20px rgba(232, 100, 44, 0.08),
          inset 0 0 0 1px rgba(232, 100, 44, 0.1);
        outline: none;
      }
      .glass-input::placeholder { color: rgba(255, 255, 255, 0.25); }

      /* ====== ANIMATION LIBRARY ====== */
      .fade-in { animation: fadeIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
      @keyframes fadeIn { 
        from { opacity: 0; transform: translateY(16px); } 
        to { opacity: 1; transform: translateY(0); } 
      }
      .slide-up { animation: slideUp 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
      @keyframes slideUp { 
        from { opacity: 0; transform: translateY(32px) scale(0.97); } 
        to { opacity: 1; transform: translateY(0) scale(1); } 
      }
      .scale-in { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes scaleIn { 
        from { opacity: 0; transform: scale(0.85); } 
        to { opacity: 1; transform: scale(1); } 
      }
      
      /* Staggered animation for children */
      .stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
      .stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
      .stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
      .stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
      .stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
      .stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
      .stagger-children > * { animation-fill-mode: both; }

      /* Premium glow pulse */
      .glow-pulse { animation: glowPulse 4s ease-in-out infinite; }
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(232, 100, 44, 0.2), 0 0 60px rgba(232, 100, 44, 0.05); }
        50% { box-shadow: 0 0 40px rgba(232, 100, 44, 0.35), 0 0 100px rgba(232, 100, 44, 0.1); }
      }
      
      .float { animation: float 7s ease-in-out infinite; }
      @keyframes float { 
        0%, 100% { transform: translateY(0) rotate(0deg); } 
        33% { transform: translateY(-8px) rotate(1deg); } 
        66% { transform: translateY(-4px) rotate(-0.5deg); }
      }
      
      .shimmer {
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
        background-size: 200% 100%;
        animation: shimmer 4s ease-in-out infinite;
      }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

      /* ====== MICRO-INTERACTIONS ====== */
      .pulse-dot { animation: pulseDot 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      @keyframes pulseDot { 
        0%, 100% { opacity: 1; transform: scale(1); } 
        50% { opacity: 0.4; transform: scale(1.3); } 
      }
      .timer-urgent { animation: urgentPulse 1s infinite; }
      @keyframes urgentPulse { 
        0%, 100% { opacity: 1; color: #ef4444; } 
        50% { opacity: 0.3; color: #fca5a5; } 
      }
      
      /* Ripple effect on buttons */
      .ripple {
        position: relative;
        overflow: hidden;
      }
      .ripple::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.15) 0%, transparent 60%);
        opacity: 0;
        transition: opacity 0.4s;
      }
      .ripple:hover::after { opacity: 1; }

      /* Number counter animation */
      .count-up {
        animation: countReveal 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
      }
      @keyframes countReveal {
        from { opacity: 0; transform: translateY(12px) scale(0.9); filter: blur(4px); }
        to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      }

      /* ====== BUTTON SYSTEM ====== */
      .btn-primary {
        background: linear-gradient(135deg, #e8642c 0%, #d4501e 50%, #e8642c 100%);
        background-size: 200% auto;
        color: white;
        font-weight: 600;
        padding: 0.625rem 1.25rem;
        border-radius: 0.875rem;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        border: none;
        position: relative;
        overflow: hidden;
        letter-spacing: -0.01em;
      }
      .btn-primary::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .btn-primary:hover {
        background-position: right center;
        transform: translateY(-2px);
        box-shadow: 
          0 12px 32px rgba(232, 100, 44, 0.4),
          0 0 0 1px rgba(232, 100, 44, 0.2),
          0 0 80px rgba(232, 100, 44, 0.12);
      }
      .btn-primary:hover::before { opacity: 1; }
      .btn-primary:active { transform: translateY(0) scale(0.98); }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        color: #a1a1aa;
        font-weight: 500;
        padding: 0.5rem 1rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .btn-secondary:hover { 
        background: rgba(255, 255, 255, 0.1); 
        color: #f4f4f5; 
        border-color: rgba(255,255,255,0.15);
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      .btn-danger { 
        background: linear-gradient(135deg, #ef4444, #dc2626); 
        color: white; font-weight: 600; padding: 0.5rem 1rem; 
        border-radius: 0.75rem; transition: all 0.3s; border: none; 
      }
      .btn-danger:hover { 
        box-shadow: 0 12px 32px rgba(239, 68, 68, 0.35); 
        transform: translateY(-2px); 
      }
      .btn-success { 
        background: linear-gradient(135deg, #10b981, #059669); 
        color: white; font-weight: 600; padding: 0.5rem 1rem; 
        border-radius: 0.75rem; transition: all 0.3s; border: none; 
      }
      .btn-success:hover { 
        box-shadow: 0 12px 32px rgba(16, 185, 129, 0.35); 
        transform: translateY(-2px); 
      }
      .btn-warning { 
        background: linear-gradient(135deg, #f59e0b, #d97706); 
        color: white; font-weight: 600; padding: 0.5rem 1rem; 
        border-radius: 0.75rem; transition: all 0.3s; border: none; 
      }
      .btn-warning:hover { 
        box-shadow: 0 12px 32px rgba(245, 158, 11, 0.35); 
        transform: translateY(-2px); 
      }

      /* ====== BADGE SYSTEM ====== */
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.65rem;
        border-radius: 9999px;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      /* ====== STAT CARDS - Premium Interactive ====== */
      .stat-card {
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, var(--accent, rgba(232,100,44,0.6)), transparent);
        opacity: 0;
        transition: opacity 0.4s;
        border-radius: 3px 3px 0 0;
      }
      .stat-card::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 50% 0%, var(--accent, rgba(232,100,44,0.08)) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.4s;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover::after { opacity: 1; }
      .stat-card:hover { 
        transform: translateY(-6px) scale(1.02); 
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      /* ====== MODAL ====== */
      .modal-overlay {
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(16px) saturate(120%);
        -webkit-backdrop-filter: blur(16px) saturate(120%);
      }

      /* ====== CUSTOM SCROLLBAR ====== */
      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { 
        background: rgba(232, 100, 44, 0.2); 
        border-radius: 5px; 
      }
      ::-webkit-scrollbar-thumb:hover { 
        background: rgba(232, 100, 44, 0.4); 
      }

      /* ====== TABLE STYLES - Premium ====== */
      .dark-table { border-collapse: separate; border-spacing: 0; }
      .dark-table thead th {
        color: rgba(255,255,255,0.35);
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        position: sticky;
        top: 0;
        background: rgba(12, 12, 16, 0.8);
        backdrop-filter: blur(12px);
      }
      .dark-table tbody tr {
        transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .dark-table tbody tr:hover {
        background: rgba(232, 100, 44, 0.04);
      }
      .dark-table tbody td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid rgba(255,255,255,0.025);
        color: rgba(255,255,255,0.65);
        font-size: 0.8rem;
      }

      /* ====== CONFETTI CELEBRATION ====== */
      .confetti-container {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
      }
      .confetti {
        position: absolute;
        opacity: 0;
        animation: confettiFall 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      }
      @keyframes confettiFall {
        0% { opacity: 1; transform: translateY(-120vh) rotate(0deg) scale(1); }
        70% { opacity: 0.8; }
        100% { opacity: 0; transform: translateY(110vh) rotate(1080deg) scale(0.5); }
      }

      /* ====== SUCCESS GLOW ====== */
      .success-glow {
        animation: successGlow 2.5s ease-out;
      }
      @keyframes successGlow {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
        30% { box-shadow: 0 0 60px 30px rgba(16, 185, 129, 0.25); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }

      /* ====== PROGRESS BAR ====== */
      .progress-bar-glow {
        position: relative;
        overflow: hidden;
      }
      .progress-bar-glow::after {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 50%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        animation: progressSweep 3s ease-in-out infinite;
      }
      @keyframes progressSweep {
        0% { left: -50%; }
        100% { left: 150%; }
      }

      /* ====== TYPOGRAPHY ====== */
      .text-gradient {
        background: linear-gradient(135deg, #e8642c 0%, #f97316 40%, #fb923c 60%, #e8642c 100%);
        background-size: 300% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gradientFlow 6s ease infinite;
      }
      @keyframes gradientFlow { 
        0% { background-position: 0% center; } 
        50% { background-position: 100% center; }
        100% { background-position: 0% center; } 
      }

      .text-glow {
        text-shadow: 0 0 40px rgba(232, 100, 44, 0.3), 0 0 80px rgba(232, 100, 44, 0.1);
      }

      /* ====== ACTION BUTTONS (Operator view) ====== */
      .action-btn {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 1rem;
        padding: 1rem 1.25rem;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        position: relative;
        overflow: hidden;
      }
      .action-btn::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 3px;
        background: var(--btn-color, rgba(255,255,255,0.1));
        border-radius: 0 3px 3px 0;
        opacity: 0;
        transition: opacity 0.3s, width 0.3s;
      }
      .action-btn:hover {
        transform: translateX(6px);
        border-color: var(--btn-color, rgba(255,255,255,0.15));
        background: var(--btn-bg, rgba(255,255,255,0.04));
        box-shadow: 
          0 0 40px var(--btn-glow, rgba(255,255,255,0.03)),
          inset 0 0 40px var(--btn-glow, rgba(255,255,255,0.01));
      }
      .action-btn:hover::before { opacity: 1; width: 4px; }

      /* ====== FORM ELEMENTS ====== */
      select, input[type="number"] {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        color: #f4f4f5;
        border-radius: 0.75rem;
        transition: all 0.3s;
      }
      select:focus, input[type="number"]:focus {
        outline: none;
        border-color: rgba(232, 100, 44, 0.5);
        box-shadow: 0 0 0 3px rgba(232, 100, 44, 0.1);
      }
      select option { background: #18181b; color: #f4f4f5; }
      textarea {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        color: #f4f4f5;
        border-radius: 0.75rem;
        transition: all 0.3s;
      }
      textarea:focus {
        outline: none;
        border-color: rgba(232, 100, 44, 0.5);
        box-shadow: 0 0 0 3px rgba(232, 100, 44, 0.1);
      }
      textarea::placeholder { color: rgba(255,255,255,0.25); }
      input[type="datetime-local"], input[type="text"], input[type="tel"], input[type="email"], input[type="password"] {
        color-scheme: dark;
      }
      
      /* ====== SEPARATOR ====== */
      .divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
      }
      
      /* ====== LIVE INDICATOR ====== */
      .live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        position: relative;
      }
      .live-dot::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        border: 1px solid rgba(16, 185, 129, 0.4);
        animation: livePing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
      @keyframes livePing {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      
      /* ====== HOVER LIFT for interactive elements ====== */
      .hover-lift {
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .hover-lift:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      /* ====== PARTICLE DOTS (decorative) ====== */
      .particle-field {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }
      .particle {
        position: absolute;
        width: 2px;
        height: 2px;
        background: rgba(232, 100, 44, 0.3);
        border-radius: 50%;
        animation: particleFloat 15s linear infinite;
      }
      @keyframes particleFloat {
        0% { transform: translateY(100%) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100%) translateX(100px); opacity: 0; }
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
