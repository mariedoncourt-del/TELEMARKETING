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
    <title>MAF Formation - Télémarketing</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              maf: {
                50: '#eff6ff',
                100: '#dbeafe',
                200: '#bfdbfe',
                300: '#93c5fd',
                400: '#60a5fa',
                500: '#2563eb',
                600: '#1d4ed8',
                700: '#1e40af',
                800: '#1e3a8a',
                900: '#172554',
              }
            }
          }
        }
      }
    </script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; }
      .fade-in { animation: fadeIn 0.3s ease-in; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .pulse-dot { animation: pulse 2s infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
      .stat-card { transition: all 0.2s ease; }
      .btn-primary { @apply bg-maf-600 hover:bg-maf-700 text-white font-medium py-2 px-4 rounded-lg transition-colors; }
      .btn-danger { @apply bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors; }
      .btn-success { @apply bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors; }
      .btn-warning { @apply bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-colors; }
      .btn-secondary { @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors; }
      .modal-overlay { background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
      .badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
      .timer-urgent { animation: blink 1s infinite; }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div id="app"></div>
    <script src="/static/app.js"></script>
</body>
</html>`;
}

export default app;
