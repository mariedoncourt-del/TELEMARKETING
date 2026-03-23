// =============================================
// MAF Formation - Telemarketing SPA
// PREMIUM IMMERSIVE UI v3.0
// "Effet Wahou" - Apple-inspired Design
// =============================================

const API = axios.create({ baseURL: '/api' });
let currentUser = null;
let lockTimer = null;
let lockEndTime = null;
let refreshInterval = null;

// ---- Intercepteur Axios pour JWT ----
API.interceptors.request.use(config => {
  const token = localStorage.getItem('maf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && window.location.hash !== '#login') {
      logout();
    }
    return Promise.reject(err);
  }
);

// ---- Router simple base sur le hash ----
function navigate(hash) {
  window.location.hash = hash;
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
  const token = localStorage.getItem('maf_token');
  const userData = localStorage.getItem('maf_user');
  if (token && userData) {
    currentUser = JSON.parse(userData);
    handleRoute();
  } else {
    navigate('#login');
  }
});

function handleRoute() {
  const hash = window.location.hash || '#login';
  clearTimers();

  if (!currentUser && hash !== '#login') {
    navigate('#login');
    return;
  }

  const routes = {
    '#login': renderLogin,
    '#operator': renderOperator,
    '#dashboard': renderDashboard,
    '#prospects': renderProspectsList,
    '#rdv': renderRDVList,
    '#admin': renderAdmin,
  };

  const renderer = routes[hash] || routes['#login'];
  renderer();
}

function clearTimers() {
  if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
}

// =============================================
// PAGE: LOGIN - Ultra Premium Immersive
// =============================================
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden">
      <!-- Orbes de lumiere animes -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute w-[600px] h-[600px] rounded-full blur-[120px] float" 
          style="top: 10%; left: 5%; background: radial-gradient(circle, rgba(232,100,44,0.15), transparent 70%); animation-delay: 0s;"></div>
        <div class="absolute w-[500px] h-[500px] rounded-full blur-[100px] float" 
          style="bottom: 10%; right: 5%; background: radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%); animation-delay: -4s;"></div>
        <div class="absolute w-[400px] h-[400px] rounded-full blur-[80px] float" 
          style="top: 50%; left: 50%; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%); animation-delay: -7s;"></div>
      </div>

      <!-- Particules decoratives -->
      <div class="particle-field">
        ${Array.from({length: 12}, (_, i) => `
          <div class="particle" style="left:${Math.random()*100}%; animation-delay:${Math.random()*15}s; animation-duration:${12+Math.random()*8}s;"></div>
        `).join('')}
      </div>

      <!-- Carte Login Glassmorphism -->
      <div class="glass rounded-[2rem] p-12 w-full max-w-[420px] slide-up relative" 
        style="box-shadow: 0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06);">
        
        <!-- Logo avec glow premium -->
        <div class="text-center mb-12">
          <div class="relative inline-block">
            <div class="w-[88px] h-[88px] rounded-[1.75rem] flex items-center justify-center mx-auto mb-7 glow-pulse relative"
              style="background: linear-gradient(145deg, #e8642c, #d4501e);">
              <i class="fas fa-headset text-white text-[2.2rem]"></i>
              <div class="absolute inset-0 rounded-[1.75rem]" style="background: linear-gradient(145deg, rgba(255,255,255,0.25) 0%, transparent 50%);"></div>
            </div>
            <!-- Halo de lumiere sous le logo -->
            <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full blur-xl" 
              style="background: rgba(232,100,44,0.25);"></div>
          </div>
          <h1 class="text-[1.75rem] font-extrabold text-white tracking-tight" style="letter-spacing: -0.03em;">MAF Formation</h1>
          <p class="text-white/30 mt-2 text-sm font-light tracking-widest uppercase">Plateforme Telemarketing</p>
        </div>

        <form id="loginForm" class="space-y-5">
          <div>
            <label class="block text-[11px] font-semibold text-white/40 mb-2.5 uppercase tracking-[0.15em]">Email</label>
            <div class="relative group">
              <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm transition-colors group-focus-within:text-maf-400"></i>
              <input type="email" id="loginEmail" placeholder="votre@email.fr" required
                class="w-full pl-12 pr-4 py-4 glass-input rounded-xl text-sm font-medium">
            </div>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-white/40 mb-2.5 uppercase tracking-[0.15em]">Mot de passe</label>
            <div class="relative group">
              <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm transition-colors group-focus-within:text-maf-400"></i>
              <input type="password" id="loginPassword" placeholder="••••••••" required
                class="w-full pl-12 pr-4 py-4 glass-input rounded-xl text-sm font-medium">
            </div>
          </div>
          <div id="loginError" class="hidden rounded-xl p-3.5 text-sm" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #fca5a5;"></div>
          <button type="submit" class="w-full btn-primary py-4.5 text-[15px] rounded-xl mt-3 tracking-tight" style="padding-top: 1.1rem; padding-bottom: 1.1rem;">
            <i class="fas fa-arrow-right mr-2.5"></i>Connexion
          </button>
        </form>

        <div class="mt-10 text-center">
          <div class="divider"></div>
          <p class="text-white/15 text-[11px] mt-5 font-mono">admin@maf-formation.fr / admin</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('maf_token', data.token);
      localStorage.setItem('maf_user', JSON.stringify(data.user));
      currentUser = data.user;

      if (currentUser.role === 'admin') navigate('#admin');
      else if (currentUser.role === 'supervisor') navigate('#dashboard');
      else navigate('#operator');
    } catch (err) {
      errorDiv.textContent = err.response?.data?.error || 'Erreur de connexion';
      errorDiv.classList.remove('hidden');
      errorDiv.classList.add('scale-in');
    }
  });
}

function logout() {
  localStorage.removeItem('maf_token');
  localStorage.removeItem('maf_user');
  currentUser = null;
  clearTimers();
  navigate('#login');
}

// =============================================
// COMPOSANT: Navigation Premium
// =============================================
function getNavbar(active = '') {
  const isAdmin = currentUser?.role === 'admin';
  const isSupervisor = currentUser?.role === 'supervisor';
  const isOperator = currentUser?.role === 'operator';

  const links = [];
  if (isOperator || isAdmin || isSupervisor) {
    links.push({ hash: '#operator', icon: 'fa-phone', label: 'Appels', active: active === 'operator' });
  }
  if (isAdmin || isSupervisor) {
    links.push({ hash: '#dashboard', icon: 'fa-chart-bar', label: 'Dashboard', active: active === 'dashboard' });
    links.push({ hash: '#prospects', icon: 'fa-users', label: 'Prospects', active: active === 'prospects' });
  }
  links.push({ hash: '#rdv', icon: 'fa-calendar-check', label: 'RDV', active: active === 'rdv' });
  if (isAdmin) {
    links.push({ hash: '#admin', icon: 'fa-cog', label: 'Admin', active: active === 'admin' });
  }

  return `
    <nav class="glass sticky top-0 z-50" style="border-top: none; border-left: none; border-right: none; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex justify-between items-center h-[60px]">
          <!-- Logo -->
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center relative" style="background: linear-gradient(145deg, #e8642c, #d4501e);">
              <i class="fas fa-headset text-white text-[13px]"></i>
              <div class="absolute inset-0 rounded-xl" style="background: linear-gradient(145deg, rgba(255,255,255,0.2) 0%, transparent 50%);"></div>
            </div>
            <div>
              <span class="font-bold text-white/90 text-sm tracking-tight block leading-none">MAF Formation</span>
              <span class="text-[9px] text-white/20 font-medium tracking-wider uppercase">Telemarketing</span>
            </div>
          </div>
          
          <!-- Navigation Links -->
          <div class="flex items-center space-x-0.5 p-1 rounded-2xl" style="background: rgba(255,255,255,0.02);">
            ${links.map(l => `
              <a href="${l.hash}" class="flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300
                ${l.active 
                  ? 'text-white bg-white/8 shadow-sm' 
                  : 'text-white/35 hover:text-white/60 hover:bg-white/4'}"
                style="${l.active ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);' : ''}">
                <i class="fas ${l.icon} mr-2 text-[10px] ${l.active ? 'text-maf-400' : ''}"></i>${l.label}
              </a>
            `).join('')}
          </div>
          
          <!-- User Info -->
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-xs font-semibold text-white/70 leading-none">${currentUser?.prenom} ${currentUser?.nom}</p>
              <p class="text-[10px] text-maf-400/60 font-medium mt-0.5">${getRoleLabel(currentUser?.role)}</p>
            </div>
            <button onclick="logout()" class="w-9 h-9 rounded-xl flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300" title="Deconnexion">
              <i class="fas fa-sign-out-alt text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  `;
}

function getRoleLabel(role) {
  return { admin: 'Administrateur', supervisor: 'Superviseur', operator: 'Teleoperateur' }[role] || role;
}

// =============================================
// PAGE: OPERATEUR - Poste d'appel Premium
// =============================================
function renderOperator() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('operator')}
    <div class="max-w-5xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-[1.6rem] font-extrabold text-white tracking-tight" style="letter-spacing: -0.03em;">
            <span class="text-gradient">Poste d'appel</span>
          </h1>
          <p class="text-white/25 text-sm mt-1.5 font-medium">File d'attente commune</p>
        </div>
        <div id="myStatsBar" class="flex items-center space-x-2"></div>
      </div>
      <div id="operatorContent">
        <div class="text-center py-28 slide-up">
          <div class="relative inline-block mb-10">
            <div class="w-32 h-32 rounded-[2rem] flex items-center justify-center mx-auto glow-pulse"
              style="background: linear-gradient(145deg, rgba(232,100,44,0.15), rgba(232,100,44,0.04));">
              <i class="fas fa-phone-volume text-maf-400 text-5xl float"></i>
            </div>
            <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full blur-lg" 
              style="background: rgba(232,100,44,0.2);"></div>
          </div>
          <h2 class="text-2xl font-bold text-white mb-3 tracking-tight">Pret a appeler</h2>
          <p class="text-white/30 mb-10 text-sm max-w-sm mx-auto leading-relaxed">Cliquez pour obtenir le prochain prospect de la file d'attente</p>
          <button onclick="fetchNextProspect()" class="btn-primary text-base px-12 py-5 rounded-2xl tracking-tight">
            <i class="fas fa-bolt mr-2.5"></i>Prochain prospect
          </button>
        </div>
      </div>
    </div>
  `;
  loadMyStats();
}

async function loadMyStats() {
  try {
    const { data } = await API.get('/dashboard/my-stats');
    const s = data.today;
    document.getElementById('myStatsBar').innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="glass-card-static px-3.5 py-2 rounded-xl text-xs font-semibold text-white/50"><i class="fas fa-phone mr-1.5 text-white/30"></i>${s.total_appels || 0}</span>
        <span class="px-3.5 py-2 rounded-xl text-xs font-bold" style="background:rgba(16,185,129,0.08);color:#6ee7b7;border:1px solid rgba(16,185,129,0.1);"><i class="fas fa-calendar-check mr-1.5"></i>${s.nb_rdv || 0}</span>
        <span class="px-3.5 py-2 rounded-xl text-xs font-bold" style="background:rgba(245,158,11,0.08);color:#fcd34d;border:1px solid rgba(245,158,11,0.1);"><i class="fas fa-redo mr-1.5"></i>${s.nb_ar || 0}</span>
        <span class="px-3.5 py-2 rounded-xl text-xs font-bold" style="background:rgba(239,68,68,0.08);color:#fca5a5;border:1px solid rgba(239,68,68,0.1);"><i class="fas fa-phone-slash mr-1.5"></i>${s.nb_nrp || 0}</span>
      </div>
    `;
  } catch (e) { console.error(e); }
}

async function fetchNextProspect() {
  const content = document.getElementById('operatorContent');
  content.innerHTML = `
    <div class="text-center py-28">
      <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style="background:rgba(232,100,44,0.06);">
        <i class="fas fa-spinner fa-spin text-maf-400 text-2xl"></i>
      </div>
      <p class="text-white/30 text-sm font-medium">Recherche du prochain prospect...</p>
    </div>
  `;

  try {
    const { data } = await API.get('/prospects/next');
    if (!data.prospect) {
      content.innerHTML = `
        <div class="text-center py-28 slide-up">
          <div class="w-32 h-32 rounded-[2rem] flex items-center justify-center mx-auto mb-8" style="background:rgba(16,185,129,0.06);">
            <i class="fas fa-check-circle text-emerald-400 text-5xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-white mb-3 tracking-tight">File d'attente vide</h2>
          <p class="text-white/30 mb-10 text-sm">${data.message || 'Tous les prospects sont traites.'}</p>
          <button onclick="fetchNextProspect()" class="btn-secondary px-8 py-3.5 rounded-xl text-sm">
            <i class="fas fa-sync mr-2"></i>Verifier a nouveau
          </button>
        </div>
      `;
      return;
    }
    renderCallCard(data.prospect, data.historique || [], data.locked_until);
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || 'Erreur serveur';
    content.innerHTML = `
      <div class="text-center py-28 slide-up">
        <div class="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6" style="background:rgba(245,158,11,0.06);">
          <i class="fas fa-exclamation-triangle text-amber-400 text-3xl"></i>
        </div>
        <p class="text-white/60 font-semibold mb-2">${msg}</p>
        <button onclick="fetchNextProspect()" class="btn-primary mt-8 px-8 py-3.5 rounded-xl">
          <i class="fas fa-redo mr-2"></i>Reessayer
        </button>
      </div>
    `;
  }
}

function renderCallCard(prospect, historique, lockedUntil) {
  lockEndTime = new Date(lockedUntil);
  const content = document.getElementById('operatorContent');

  const statusBadge = {
    'NOUVEAU': '<span class="badge" style="background:rgba(59,130,246,0.12);color:#93c5fd;border:1px solid rgba(59,130,246,0.15);"><i class="fas fa-star mr-1 text-[8px]"></i>Nouveau</span>',
    'AR': '<span class="badge" style="background:rgba(245,158,11,0.12);color:#fcd34d;border:1px solid rgba(245,158,11,0.15);"><i class="fas fa-redo mr-1 text-[8px]"></i>A rappeler</span>',
  }[prospect.statut] || '';

  const nrpBadge = prospect.compteur_nrp > 0
    ? `<span class="badge" style="background:rgba(239,68,68,0.1);color:#fca5a5;border:1px solid rgba(239,68,68,0.12);"><i class="fas fa-phone-slash mr-1 text-[8px]"></i>${prospect.compteur_nrp}/5 NRP</span>`
    : '';

  content.innerHTML = `
    <div class="slide-up">
      <!-- Timer de verrouillage -->
      <div class="glass-card-static rounded-2xl p-4 mb-6 flex justify-between items-center" style="border-color: rgba(232,100,44,0.15);">
        <div class="flex items-center">
          <div class="live-dot mr-3.5"></div>
          <span class="text-xs font-semibold text-white/40">Prospect verrouille pour vous</span>
        </div>
        <div id="lockTimer" class="text-sm font-mono font-bold text-maf-400"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Colonne gauche: Infos prospect -->
        <div class="lg:col-span-2 space-y-5">
          <!-- Fiche entreprise -->
          <div class="glass-card rounded-2xl p-7">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h2 class="text-xl font-extrabold text-white tracking-tight" style="letter-spacing: -0.02em;">${prospect.nom_entreprise}</h2>
                <p class="text-white/35 text-sm mt-1 font-medium">${prospect.nom_dirigeant || 'Contact non renseigne'}</p>
              </div>
              <div class="flex space-x-2">${statusBadge} ${nrpBadge}</div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex items-center group">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:rgba(232,100,44,0.08);">
                  <i class="fas fa-phone text-maf-400 text-xs"></i>
                </div>
                <a href="tel:${prospect.telephone}" class="text-maf-300 font-bold text-lg hover:text-maf-200 transition-colors tracking-tight">${prospect.telephone}</a>
              </div>
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:rgba(255,255,255,0.03);">
                  <i class="fas fa-map-marker-alt text-white/20 text-xs"></i>
                </div>
                <span class="text-white/50 font-medium">${prospect.ville || 'Non renseigne'} ${prospect.code_postal || ''}</span>
              </div>
              ${prospect.email ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:rgba(255,255,255,0.03);"><i class="fas fa-envelope text-white/20 text-xs"></i></div><span class="text-white/50">${prospect.email}</span></div>` : ''}
              ${prospect.code_ape ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:rgba(255,255,255,0.03);"><i class="fas fa-industry text-white/20 text-xs"></i></div><span class="text-white/50">APE: ${prospect.code_ape}</span></div>` : ''}
              ${prospect.opco ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:rgba(232,100,44,0.05);"><i class="fas fa-building text-maf-400/40 text-xs"></i></div><span class="text-white/60 font-semibold">OPCO: ${prospect.opco}</span></div>` : ''}
              ${prospect.budget_identifie ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:rgba(16,185,129,0.05);"><i class="fas fa-euro-sign text-emerald-400/40 text-xs"></i></div><span class="text-white/50">Budget: ${prospect.budget_identifie}&euro;</span></div>` : ''}
            </div>
            ${prospect.notes ? `<div class="mt-6 p-4 rounded-xl text-xs text-yellow-200/70 leading-relaxed" style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.1);"><i class="fas fa-sticky-note text-yellow-400/40 mr-2"></i>${prospect.notes}</div>` : ''}
            ${prospect.date_rappel ? `<div class="mt-3 p-4 rounded-xl text-xs text-amber-200/70" style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.1);"><i class="fas fa-clock text-amber-400/40 mr-2"></i>Rappel prevu: ${formatDate(prospect.date_rappel)}</div>` : ''}
          </div>

          <!-- Historique des appels -->
          <div class="glass-card rounded-2xl p-6">
            <h3 class="font-semibold text-white/50 text-sm mb-4"><i class="fas fa-history mr-2 text-white/20"></i>Historique <span class="text-white/20">(${historique.length})</span></h3>
            ${historique.length === 0
              ? '<p class="text-white/15 text-xs italic">Premier appel pour ce prospect</p>'
              : `<div class="space-y-2 max-h-48 overflow-y-auto pr-1">${historique.map(h => `
                  <div class="flex items-start text-xs border-l-2 ${getResultBorderColor(h.statut_resultat)} pl-3.5 py-2 hover:bg-white/[0.02] rounded-r-lg transition-colors">
                    <span class="font-bold w-10 text-white/60">${h.statut_resultat}</span>
                    <span class="text-white/25 w-32 font-mono text-[11px]">${formatDate(h.created_at)}</span>
                    <span class="text-white/45 flex-1">${h.commentaire || '-'}</span>
                    <span class="text-white/15 text-[10px] font-medium">${h.operateur_prenom} ${h.operateur_nom}</span>
                  </div>
                `).join('')}</div>`
            }
          </div>
        </div>

        <!-- Colonne droite: Actions -->
        <div class="space-y-4">
          <div class="glass-card rounded-2xl p-6">
            <h3 class="font-semibold text-white/50 text-sm mb-5"><i class="fas fa-clipboard-check mr-2 text-white/20"></i>Resultat de l'appel</h3>
            <div class="space-y-3">
              <button onclick="showResultForm('NRP', ${prospect.id})" class="action-btn" style="--btn-color:rgba(239,68,68,0.4);--btn-bg:rgba(239,68,68,0.04);--btn-glow:rgba(239,68,68,0.06);">
                <span class="flex items-center"><i class="fas fa-phone-slash text-red-400 mr-3 text-sm"></i><span class="font-semibold text-white/65 text-sm">NRP</span></span>
                <span class="text-[10px] text-white/20 font-medium">Ne repond pas</span>
              </button>
              <button onclick="showResultForm('AR', ${prospect.id})" class="action-btn" style="--btn-color:rgba(245,158,11,0.4);--btn-bg:rgba(245,158,11,0.04);--btn-glow:rgba(245,158,11,0.06);">
                <span class="flex items-center"><i class="fas fa-redo text-amber-400 mr-3 text-sm"></i><span class="font-semibold text-white/65 text-sm">AR</span></span>
                <span class="text-[10px] text-white/20 font-medium">A rappeler</span>
              </button>
              <button onclick="showResultForm('RDV', ${prospect.id})" class="action-btn" style="--btn-color:rgba(16,185,129,0.4);--btn-bg:rgba(16,185,129,0.04);--btn-glow:rgba(16,185,129,0.06);">
                <span class="flex items-center"><i class="fas fa-calendar-check text-emerald-400 mr-3 text-sm"></i><span class="font-semibold text-white/65 text-sm">RDV</span></span>
                <span class="text-[10px] text-white/20 font-medium">Rendez-vous !</span>
              </button>
              <button onclick="showResultForm('FIN', ${prospect.id})" class="action-btn" style="--btn-color:rgba(161,161,170,0.2);--btn-bg:rgba(161,161,170,0.02);--btn-glow:rgba(161,161,170,0.03);">
                <span class="flex items-center"><i class="fas fa-ban text-white/25 mr-3 text-sm"></i><span class="font-semibold text-white/40 text-sm">FIN</span></span>
                <span class="text-[10px] text-white/15 font-medium">Cloturer</span>
              </button>
            </div>
          </div>

          <div id="resultForm" class="hidden"></div>

          <button onclick="releaseProspect(${prospect.id})" class="w-full btn-secondary py-3 text-xs rounded-xl font-semibold">
            <i class="fas fa-forward mr-2"></i>Passer ce prospect
          </button>
        </div>
      </div>
    </div>
  `;
  startLockTimer();
}

function startLockTimer() {
  const timerEl = document.getElementById('lockTimer');
  if (!timerEl) return;

  lockTimer = setInterval(() => {
    const now = new Date();
    const diff = lockEndTime - now;
    if (diff <= 0) {
      timerEl.innerHTML = '<span class="timer-urgent font-semibold">Verrou expire</span>';
      clearInterval(lockTimer);
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (diff < 120000) timerEl.classList.add('timer-urgent');
  }, 1000);
}

function showResultForm(type, prospectId) {
  const formDiv = document.getElementById('resultForm');
  formDiv.classList.remove('hidden');

  const forms = {
    NRP: `
      <div class="glass-card rounded-2xl p-5 scale-in" style="border-color:rgba(239,68,68,0.12);">
        <h4 class="font-bold text-red-300 text-sm mb-3"><i class="fas fa-phone-slash mr-2"></i>NRP</h4>
        <textarea id="nrpComment" placeholder="Commentaire optionnel..." rows="2" class="w-full p-3 rounded-xl text-xs mb-3"></textarea>
        <button onclick="submitResult('NRP', ${prospectId})" class="w-full btn-danger py-3 rounded-xl text-sm font-semibold">
          <i class="fas fa-check mr-2"></i>Confirmer
        </button>
      </div>
    `,
    AR: `
      <div class="glass-card rounded-2xl p-5 scale-in" style="border-color:rgba(245,158,11,0.12);">
        <h4 class="font-bold text-amber-300 text-sm mb-3"><i class="fas fa-redo mr-2"></i>A rappeler</h4>
        <label class="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Date de rappel *</label>
        <input type="datetime-local" id="arDate" required class="w-full glass-input p-3 rounded-xl text-xs mb-3" value="${getDefaultRappelDate()}">
        <textarea id="arComment" placeholder="Raison du rappel..." rows="2" class="w-full p-3 rounded-xl text-xs mb-3"></textarea>
        <button onclick="submitResult('AR', ${prospectId})" class="w-full btn-warning py-3 rounded-xl text-sm font-semibold">
          <i class="fas fa-check mr-2"></i>Confirmer AR
        </button>
      </div>
    `,
    RDV: `
      <div class="glass-card rounded-2xl p-5 scale-in" style="border-color:rgba(16,185,129,0.12);">
        <h4 class="font-bold text-emerald-300 text-sm mb-4"><i class="fas fa-calendar-check mr-2"></i>Rendez-vous</h4>
        <div class="space-y-3">
          <div>
            <label class="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Date et heure *</label>
            <input type="datetime-local" id="rdvDate" required class="w-full glass-input p-3 rounded-xl text-xs">
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Type de RDV</label>
            <select id="rdvType" class="w-full p-3 rounded-xl text-xs">
              <option value="presentiel">Presentiel</option>
              <option value="distance">A distance</option>
              <option value="telephone">Telephone</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Lieu</label>
            <input type="text" id="rdvLieu" placeholder="Adresse ou lien visio..." class="w-full glass-input p-3 rounded-xl text-xs">
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Formation souhaitee</label>
            <textarea id="rdvFormation" placeholder="Decrivez la formation..." rows="2" class="w-full p-3 rounded-xl text-xs"></textarea>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Commentaires</label>
            <textarea id="rdvComments" placeholder="Notes..." rows="2" class="w-full p-3 rounded-xl text-xs"></textarea>
          </div>
        </div>
        <button onclick="submitResult('RDV', ${prospectId})" class="w-full btn-success py-3 rounded-xl text-sm font-semibold mt-4">
          <i class="fas fa-check mr-2"></i>Confirmer RDV
        </button>
      </div>
    `,
    FIN: `
      <div class="glass-card rounded-2xl p-5 scale-in" style="border-color:rgba(161,161,170,0.08);">
        <h4 class="font-bold text-white/45 text-sm mb-3"><i class="fas fa-ban mr-2"></i>Cloturer</h4>
        <label class="block text-[10px] font-semibold text-white/35 mb-1.5 uppercase tracking-wider">Motif *</label>
        <select id="finMotif" class="w-full p-3 rounded-xl text-xs mb-3">
          <option value="PAS_INTERESSE">Pas interesse</option>
          <option value="HORS_CIBLE">Hors cible</option>
          <option value="FAUX_NUMERO">Faux numero</option>
          <option value="DOUBLON">Doublon</option>
          <option value="AUTRE">Autre</option>
        </select>
        <textarea id="finComment" placeholder="Commentaire..." rows="2" class="w-full p-3 rounded-xl text-xs mb-3"></textarea>
        <button onclick="submitResult('FIN', ${prospectId})" class="w-full btn-secondary py-3 rounded-xl text-sm font-semibold" style="background:rgba(255,255,255,0.06);">
          <i class="fas fa-check mr-2"></i>Confirmer
        </button>
      </div>
    `
  };

  formDiv.innerHTML = forms[type];
}

function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#e8642c','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];
  for (let i = 0; i < 60; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.animationDelay = Math.random() * 2.5 + 's';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
    confetti.style.width = (Math.random() * 10 + 4) + 'px';
    confetti.style.height = (Math.random() * 10 + 4) + 'px';
    container.appendChild(confetti);
  }
  setTimeout(() => container.remove(), 4500);
}

async function submitResult(type, prospectId) {
  const payload = { prospect_id: prospectId, statut_resultat: type };

  switch (type) {
    case 'NRP':
      payload.commentaire = document.getElementById('nrpComment')?.value;
      break;
    case 'AR':
      payload.date_rappel = document.getElementById('arDate')?.value;
      payload.commentaire = document.getElementById('arComment')?.value;
      if (!payload.date_rappel) { alert('Date de rappel obligatoire'); return; }
      break;
    case 'RDV':
      payload.rdv_date = document.getElementById('rdvDate')?.value;
      payload.rdv_type = document.getElementById('rdvType')?.value;
      payload.rdv_lieu = document.getElementById('rdvLieu')?.value;
      payload.rdv_formation = document.getElementById('rdvFormation')?.value;
      payload.rdv_commentaires = document.getElementById('rdvComments')?.value;
      payload.commentaire = `RDV pris: ${payload.rdv_formation || 'Formation a preciser'}`;
      if (!payload.rdv_date) { alert('Date de RDV obligatoire'); return; }
      break;
    case 'FIN':
      payload.motif_fin = document.getElementById('finMotif')?.value;
      payload.commentaire = document.getElementById('finComment')?.value;
      break;
  }

  try {
    await API.post('/appels', payload);
    const content = document.getElementById('operatorContent');

    if (type === 'RDV') showConfetti();

    const config = {
      NRP: { icon: 'fa-phone-slash', msg: 'NRP enregistre', color: 'rgba(239,68,68,0.06)', iconColor: 'text-red-400' },
      AR: { icon: 'fa-redo', msg: 'Rappel programme', color: 'rgba(245,158,11,0.06)', iconColor: 'text-amber-400' },
      RDV: { icon: 'fa-trophy', msg: 'RDV enregistre !', color: 'rgba(16,185,129,0.08)', iconColor: 'text-emerald-400' },
      FIN: { icon: 'fa-ban', msg: 'Prospect cloture', color: 'rgba(161,161,170,0.06)', iconColor: 'text-white/35' },
    }[type];

    content.innerHTML = `
      <div class="text-center py-20 slide-up">
        <div class="w-28 h-28 rounded-[2rem] flex items-center justify-center mx-auto mb-8 ${type === 'RDV' ? 'success-glow' : ''}"
          style="background:${config.color};">
          <i class="fas ${config.icon} ${config.iconColor} text-4xl"></i>
        </div>
        <h2 class="text-2xl font-extrabold text-white mb-3 tracking-tight">${config.msg}</h2>
        ${type === 'RDV' ? '<p class="text-emerald-400/50 text-sm mb-8 font-semibold">Excellent travail !</p>' : '<div class="mb-8"></div>'}
        <button onclick="fetchNextProspect()" class="btn-primary mt-2 px-12 py-5 text-base rounded-2xl tracking-tight">
          <i class="fas fa-bolt mr-2.5"></i>Prochain prospect
        </button>
      </div>
    `;
    loadMyStats();
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
  }
}

async function releaseProspect(prospectId) {
  try {
    await API.post(`/prospects/${prospectId}/release`);
    fetchNextProspect();
  } catch (e) {
    alert('Erreur lors de la liberation du prospect');
  }
}

// =============================================
// PAGE: DASHBOARD SUPERVISEUR
// =============================================
function renderDashboard() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('dashboard')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-[1.6rem] font-extrabold text-white tracking-tight" style="letter-spacing: -0.03em;"><span class="text-gradient">Dashboard</span></h1>
          <p class="text-white/25 text-sm mt-1.5 font-medium">Vue d'ensemble en temps reel</p>
        </div>
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2">
            <div class="live-dot"></div>
            <span id="lastRefresh" class="text-[10px] text-white/20 font-mono"></span>
          </div>
          <button onclick="loadDashboard()" class="btn-secondary text-xs py-2.5 px-5 rounded-xl font-semibold">
            <i class="fas fa-sync mr-1.5"></i>Actualiser
          </button>
        </div>
      </div>
      <div id="dashboardContent">
        <div class="text-center py-20"><i class="fas fa-spinner fa-spin text-maf-400 text-2xl"></i></div>
      </div>
    </div>
  `;
  loadDashboard();
  refreshInterval = setInterval(loadDashboard, 30000);
}

async function loadDashboard() {
  try {
    const { data } = await API.get('/dashboard/stats');
    const g = data.global;
    const ops = data.operators || [];

    document.getElementById('lastRefresh').textContent = `${new Date().toLocaleTimeString('fr-FR')}`;

    const progress = g.total > 0 ? Math.round(((g.rdv_pris || 0) + (g.clotures || 0)) / g.total * 100) : 0;

    document.getElementById('dashboardContent').innerHTML = `
      <!-- Stats globales -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 stagger-children">
        ${[
          { val: g.nouveaux || 0, label: 'Nouveaux', icon: 'fa-star', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { val: g.a_rappeler || 0, label: 'A rappeler', icon: 'fa-redo', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { val: g.ar_en_retard || 0, label: 'AR retard', icon: 'fa-exclamation-triangle', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', urgent: (g.ar_en_retard || 0) > 0 },
          { val: g.rdv_pris || 0, label: 'RDV pris', icon: 'fa-calendar-check', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { val: g.en_cours || 0, label: 'En cours', icon: 'fa-lock', color: '#e8642c', bg: 'rgba(232,100,44,0.08)' },
          { val: g.clotures || 0, label: 'Clotures', icon: 'fa-ban', color: '#71717a', bg: 'rgba(113,113,122,0.08)' },
        ].map(s => `
          <div class="stat-card glass-card rounded-2xl p-5 text-center count-up ${s.urgent ? 'glow-pulse' : ''}" style="--accent:${s.color}50;">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style="background:${s.bg};">
              <i class="fas ${s.icon} text-sm" style="color:${s.color};"></i>
            </div>
            <div class="text-[1.75rem] font-black mb-1.5 ${s.urgent ? 'timer-urgent' : ''}" style="color:${s.color};letter-spacing:-0.04em;">${s.val}</div>
            <div class="text-[10px] text-white/25 uppercase tracking-widest font-semibold">${s.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Progression -->
      <div class="glass-card rounded-2xl p-7 mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-bold text-white/45">Progression globale</h3>
          <span class="text-sm font-mono font-extrabold text-maf-400">${progress}%</span>
        </div>
        <div class="w-full h-2.5 rounded-full" style="background:rgba(255,255,255,0.04);">
          <div class="h-2.5 rounded-full progress-bar-glow transition-all duration-1000" 
            style="width:${progress}%;background:linear-gradient(90deg,#e8642c,#f97316,#10b981);"></div>
        </div>
        <div class="flex justify-between text-[10px] text-white/15 mt-3 font-mono">
          <span>${g.total || 0} prospects</span>
          <span>${(g.rdv_pris || 0) + (g.clotures || 0)} traites</span>
        </div>
      </div>

      <!-- Performance par operateur -->
      <div class="glass-card rounded-2xl p-7 mb-8 overflow-hidden">
        <h3 class="text-sm font-bold text-white/45 mb-6"><i class="fas fa-users mr-2 text-white/15"></i>Performance des operateurs</h3>
        ${ops.length === 0 ? '<p class="text-white/15 text-xs italic">Aucun operateur actif</p>' : `
          <div class="overflow-x-auto">
            <table class="w-full dark-table">
              <thead>
                <tr>
                  <th class="text-left">Operateur</th>
                  <th class="text-center">Appels</th>
                  <th class="text-center">RDV</th>
                  <th class="text-center">AR</th>
                  <th class="text-center">NRP</th>
                  <th class="text-center">FIN</th>
                  <th class="text-center">Tx conv.</th>
                  <th class="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                ${ops.map(op => {
                  const taux = op.total_appels > 0 ? ((op.nb_rdv / op.total_appels) * 100).toFixed(1) : '0.0';
                  return `
                    <tr>
                      <td class="font-semibold text-white/70">${op.prenom} ${op.nom}</td>
                      <td class="text-center font-extrabold text-white/80">${op.total_appels || 0}</td>
                      <td class="text-center"><span class="badge" style="background:rgba(16,185,129,0.12);color:#6ee7b7;border:1px solid rgba(16,185,129,0.1);">${op.nb_rdv || 0}</span></td>
                      <td class="text-center" style="color:#fcd34d80;">${op.nb_ar || 0}</td>
                      <td class="text-center" style="color:#fca5a580;">${op.nb_nrp || 0}</td>
                      <td class="text-center text-white/25">${op.nb_fin || 0}</td>
                      <td class="text-center font-mono font-bold ${parseFloat(taux) >= 10 ? 'text-emerald-400' : 'text-white/35'}">${taux}%</td>
                      <td class="text-center">${op.prospect_en_cours ? '<div class="live-dot mx-auto"></div>' : '<span class="text-white/10">-</span>'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- RDV a venir -->
      <div class="glass-card rounded-2xl p-7">
        <h3 class="text-sm font-bold text-white/45 mb-6"><i class="fas fa-calendar mr-2 text-white/15"></i>RDV a venir</h3>
        ${(data.upcomingRdv || []).length === 0 ? '<p class="text-white/15 text-xs italic">Aucun RDV planifie</p>' : `
          <div class="space-y-3 stagger-children">
            ${data.upcomingRdv.map(r => `
              <div class="flex items-center justify-between p-4 rounded-xl hover-lift" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">
                <div>
                  <span class="font-semibold text-white/70 text-sm">${r.nom_entreprise}</span>
                  <span class="text-white/20 text-xs ml-2">${r.ville || ''}</span>
                </div>
                <div class="flex items-center space-x-3 text-xs">
                  <span class="badge" style="background:${r.type_rdv === 'presentiel' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)'};color:${r.type_rdv === 'presentiel' ? '#93c5fd' : '#c4b5fd'};border:1px solid ${r.type_rdv === 'presentiel' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)'};">
                    ${r.type_rdv}
                  </span>
                  <span class="font-mono font-bold text-maf-400 text-xs">${formatDate(r.date_rdv)}</span>
                  <span class="text-white/15 font-medium">${r.pris_par_prenom}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  } catch (err) {
    document.getElementById('dashboardContent').innerHTML = `
      <div class="text-center py-20 text-red-400">
        <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
        <p class="text-sm font-medium">Erreur: ${err.response?.data?.error || err.message}</p>
      </div>
    `;
  }
}

// =============================================
// PAGE: LISTE DES PROSPECTS
// =============================================
function renderProspectsList() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('prospects')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-[1.6rem] font-extrabold text-white tracking-tight" style="letter-spacing: -0.03em;"><span class="text-gradient">Prospects</span></h1>
          <p class="text-white/25 text-sm mt-1.5 font-medium">Base de donnees complete</p>
        </div>
        <button onclick="showAddProspectModal()" class="btn-primary rounded-xl text-sm py-2.5 px-5">
          <i class="fas fa-plus mr-2"></i>Ajouter
        </button>
      </div>
      <!-- Filtres -->
      <div class="glass-card-static rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-center">
        <div class="flex items-center space-x-2.5">
          <label class="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Statut</label>
          <select id="filterStatut" onchange="loadProspects()" class="px-4 py-2.5 rounded-xl text-xs font-medium">
            <option value="">Tous</option>
            <option value="NOUVEAU">Nouveau</option>
            <option value="AR">A rappeler</option>
            <option value="RDV">RDV</option>
            <option value="FIN">Cloture</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <div class="relative group">
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/15 text-xs transition-colors group-focus-within:text-maf-400/60"></i>
            <input type="text" id="filterSearch" placeholder="Rechercher entreprise, contact, ville..." 
              onkeyup="debounce(loadProspects, 300)()" class="w-full glass-input pl-11 pr-4 py-2.5 rounded-xl text-xs">
          </div>
        </div>
      </div>
      <div id="prospectsTable">
        <div class="text-center py-16"><i class="fas fa-spinner fa-spin text-maf-400 text-xl"></i></div>
      </div>
    </div>
    <div id="modal" class="hidden"></div>
  `;
  loadProspects();
}

async function loadProspects() {
  const statut = document.getElementById('filterStatut')?.value || '';
  const search = document.getElementById('filterSearch')?.value || '';

  try {
    const page = parseInt(document.getElementById('filterPage')?.value || '1');
    const limit = 50;
    const { data } = await API.get('/prospects', { params: { statut, search, limit, page } });
    const list = data.prospects || [];

    document.getElementById('prospectsTable').innerHTML = `
      <div class="glass-card-static rounded-2xl overflow-hidden">
        <table class="w-full dark-table">
          <thead>
            <tr>
              <th class="text-center w-12">#</th>
              <th class="text-left">Entreprise</th>
              <th class="text-left">Contact</th>
              <th class="text-left">Telephone</th>
              <th class="text-left">Ville</th>
              <th class="text-left">OPCO</th>
              <th class="text-center">Statut</th>
              <th class="text-center">NRP</th>
              <th class="text-center">Lock</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((p, idx) => `
              <tr class="cursor-pointer" onclick="showProspectDetail(${p.id})">
                <td class="text-center font-mono text-white/15 text-[10px]">${(page - 1) * limit + idx + 1}</td>
                <td class="font-semibold text-white/75">${p.nom_entreprise}</td>
                <td class="text-white/35 font-medium">${p.nom_dirigeant || '-'}</td>
                <td class="font-mono text-white/45 text-[12px]">${p.telephone}</td>
                <td class="text-white/35">${p.ville || '-'}</td>
                <td><span class="badge" style="background:rgba(232,100,44,0.06);color:rgba(232,100,44,0.6);border:1px solid rgba(232,100,44,0.08);">${p.opco || '-'}</span></td>
                <td class="text-center">${getStatusBadge(p.statut)}</td>
                <td class="text-center">${p.compteur_nrp > 0 ? `<span class="font-bold text-xs" style="color:#fca5a5;">${p.compteur_nrp}</span>` : '<span class="text-white/8">-</span>'}</td>
                <td class="text-center">${p.locked_by ? '<span class="text-maf-400"><i class="fas fa-lock text-[9px]"></i></span>' : '<span class="text-white/8">-</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="px-6 py-4 flex justify-between items-center" style="border-top:1px solid rgba(255,255,255,0.03);">
          <span class="text-[11px] text-white/20"><strong class="text-white/35 font-bold">${data.pagination?.total || 0}</strong> prospects — ${(page - 1) * limit + 1} a ${Math.min(page * limit, data.pagination?.total || 0)}</span>
          <div class="flex items-center space-x-2">
            ${page > 1 ? `<button onclick="changePage(${page - 1})" class="btn-secondary text-[10px] py-1.5 px-3 rounded-lg"><i class="fas fa-chevron-left"></i></button>` : ''}
            <span class="text-[10px] text-white/25 font-mono">
              <input type="number" id="filterPage" value="${page}" min="1" max="${data.pagination?.pages || 1}" onchange="loadProspects()" class="w-10 text-center text-[10px] rounded-lg py-1 mx-1"> / ${data.pagination?.pages || 1}
            </span>
            ${page < (data.pagination?.pages || 1) ? `<button onclick="changePage(${page + 1})" class="btn-secondary text-[10px] py-1.5 px-3 rounded-lg"><i class="fas fa-chevron-right"></i></button>` : ''}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('prospectsTable').innerHTML = `<p class="text-red-400 text-sm font-medium">Erreur: ${err.message}</p>`;
  }
}

async function showProspectDetail(id) {
  try {
    const { data } = await API.get(`/prospects/${id}`);
    const p = data.prospect;
    const appels = data.appels || [];
    const rdvs = data.rdv || [];

    document.getElementById('modal').innerHTML = `
      <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
        <div class="glass rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto scale-in" onclick="event.stopPropagation()" style="background:rgba(20,20,24,0.95);box-shadow:0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);">
          <div class="p-8">
            <div class="flex justify-between items-start mb-7">
              <div>
                <h2 class="text-xl font-extrabold text-white tracking-tight" style="letter-spacing: -0.02em;">${p.nom_entreprise}</h2>
                <p class="text-white/35 text-sm font-medium mt-1">${p.nom_dirigeant || ''} - ${p.ville || ''}</p>
              </div>
              <button onclick="document.getElementById('modal').classList.add('hidden')" class="w-9 h-9 rounded-xl flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3 text-xs mb-7">
              <div class="text-white/45"><strong class="text-white/25 font-semibold">Tel:</strong> <span class="font-mono">${p.telephone}</span></div>
              <div class="text-white/45"><strong class="text-white/25 font-semibold">Email:</strong> ${p.email || '-'}</div>
              <div class="text-white/45"><strong class="text-white/25 font-semibold">APE:</strong> ${p.code_ape || '-'}</div>
              <div class="text-white/45"><strong class="text-white/25 font-semibold">OPCO:</strong> ${p.opco || '-'}</div>
              <div><strong class="text-white/25 font-semibold">Statut:</strong> ${getStatusBadge(p.statut)}</div>
              <div class="text-white/45"><strong class="text-white/25 font-semibold">Budget:</strong> ${p.budget_identifie ? p.budget_identifie + '&euro;' : '-'}</div>
            </div>
            ${p.notes ? `<div class="rounded-xl p-4 text-xs text-yellow-200/50 mb-6 leading-relaxed" style="background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.08);"><i class="fas fa-sticky-note text-yellow-400/30 mr-2"></i>${p.notes}</div>` : ''}
            
            <div class="divider mb-6"></div>
            
            <h3 class="text-[11px] font-bold text-white/35 mb-4 uppercase tracking-widest">Historique (${appels.length})</h3>
            <div class="space-y-1 mb-6 max-h-40 overflow-y-auto pr-1">
              ${appels.map(a => `
                <div class="text-xs border-l-2 ${getResultBorderColor(a.statut_resultat)} pl-3.5 py-2 hover:bg-white/[0.02] rounded-r-lg transition-colors">
                  <span class="font-bold text-white/55">${a.statut_resultat}</span>
                  <span class="text-white/20 ml-2 font-mono text-[11px]">${formatDate(a.created_at)}</span>
                  <span class="text-white/35 ml-2">${a.commentaire || '-'}</span>
                  <span class="text-white/12 text-[10px] ml-2 font-medium">(${a.operateur_prenom})</span>
                </div>
              `).join('') || '<p class="text-white/10 text-xs italic">Aucun appel</p>'}
            </div>

            ${rdvs.length > 0 ? `
              <h3 class="text-[11px] font-bold text-white/35 mb-4 uppercase tracking-widest">RDV (${rdvs.length})</h3>
              <div class="space-y-2">
                ${rdvs.map(r => `
                  <div class="rounded-xl p-4 text-xs" style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.08);">
                    <strong class="text-emerald-300/60 font-mono">${formatDate(r.date_rdv)}</strong> <span class="text-white/25"> - ${r.type_rdv}</span>
                    ${r.formation_souhaitee ? `<br><span class="text-white/35 mt-1 inline-block">${r.formation_souhaitee}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    document.getElementById('modal').classList.remove('hidden');
  } catch (err) {
    alert('Erreur: ' + (err.response?.data?.error || err.message));
  }
}

function showAddProspectModal() {
  document.getElementById('modal').innerHTML = `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="glass rounded-[2rem] max-w-lg w-full scale-in" onclick="event.stopPropagation()" style="background:rgba(20,20,24,0.95);box-shadow:0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);">
        <div class="p-8">
          <div class="flex justify-between items-center mb-7">
            <h2 class="text-lg font-extrabold text-white tracking-tight"><i class="fas fa-plus-circle text-maf-400 mr-2"></i>Ajouter un prospect</h2>
            <button onclick="document.getElementById('modal').classList.add('hidden')" class="text-white/25 hover:text-white/60 transition-colors"><i class="fas fa-times"></i></button>
          </div>
          <form id="addProspectForm" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Entreprise *</label>
                <input type="text" id="pNom" required class="w-full glass-input p-3 rounded-xl text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Contact</label>
                <input type="text" id="pContact" class="w-full glass-input p-3 rounded-xl text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Telephone *</label>
                <input type="tel" id="pTel" required class="w-full glass-input p-3 rounded-xl text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Email</label>
                <input type="email" id="pEmail" class="w-full glass-input p-3 rounded-xl text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Ville</label>
                <input type="text" id="pVille" class="w-full glass-input p-3 rounded-xl text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Code Postal</label>
                <input type="text" id="pCP" class="w-full glass-input p-3 rounded-xl text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Code APE</label>
                <input type="text" id="pAPE" class="w-full glass-input p-3 rounded-xl text-xs">
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">OPCO</label>
                <select id="pOPCO" class="w-full p-3 rounded-xl text-xs">
                  <option value="">Non determine</option>
                  <option value="AGEFICE">AGEFICE</option>
                  <option value="FAFCEA">FAFCEA</option>
                  <option value="AKTO">AKTO</option>
                  <option value="ATLAS">ATLAS</option>
                  <option value="OPCO_EP">OPCO EP</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea id="pNotes" rows="2" class="w-full p-3 rounded-xl text-xs"></textarea>
            </div>
            <button type="submit" class="w-full btn-primary py-3.5 rounded-xl mt-3 font-semibold">
              <i class="fas fa-plus mr-2"></i>Ajouter
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal').classList.remove('hidden');

  document.getElementById('addProspectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/prospects', {
        nom_entreprise: document.getElementById('pNom').value,
        nom_dirigeant: document.getElementById('pContact').value,
        telephone: document.getElementById('pTel').value,
        email: document.getElementById('pEmail').value,
        ville: document.getElementById('pVille').value,
        code_postal: document.getElementById('pCP').value,
        code_ape: document.getElementById('pAPE').value,
        opco: document.getElementById('pOPCO').value,
        notes: document.getElementById('pNotes').value,
      });
      document.getElementById('modal').classList.add('hidden');
      loadProspects();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  });
}

// =============================================
// PAGE: LISTE DES RDV
// =============================================
function renderRDVList() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('rdv')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="mb-8">
        <h1 class="text-[1.6rem] font-extrabold text-white tracking-tight" style="letter-spacing: -0.03em;"><span class="text-gradient">Rendez-vous</span></h1>
        <p class="text-white/25 text-sm mt-1.5 font-medium">Tous les RDV planifies</p>
      </div>
      <div id="rdvContent">
        <div class="text-center py-16"><i class="fas fa-spinner fa-spin text-maf-400 text-xl"></i></div>
      </div>
    </div>
  `;
  loadRDV();
}

async function loadRDV() {
  try {
    const { data } = await API.get('/rdv');
    const list = data.rdv || [];

    document.getElementById('rdvContent').innerHTML = list.length === 0
      ? `<div class="text-center py-24 text-white/15">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style="background:rgba(255,255,255,0.02);">
            <i class="fas fa-calendar text-3xl text-white/10"></i>
          </div>
          <p class="text-sm font-medium">Aucun RDV planifie</p>
        </div>`
      : `
        <div class="grid gap-4 stagger-children">
          ${list.map(r => `
            <div class="glass-card rounded-2xl p-6">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold text-white/85 text-[15px] tracking-tight">${r.nom_entreprise}</h3>
                  <p class="text-white/25 text-xs mt-1.5 font-medium">${r.nom_dirigeant || ''} - ${r.ville || ''}</p>
                  <p class="text-xs mt-3"><i class="fas fa-phone text-white/10 mr-2"></i><span class="text-white/35 font-mono">${r.telephone}</span></p>
                  ${r.formation_souhaitee ? `<p class="text-xs mt-1.5"><i class="fas fa-graduation-cap text-maf-400/40 mr-2"></i><span class="text-white/45">${r.formation_souhaitee}</span></p>` : ''}
                  ${r.commentaires ? `<p class="text-xs text-white/20 mt-1.5 italic">${r.commentaires}</p>` : ''}
                </div>
                <div class="text-right">
                  <div class="text-[15px] font-extrabold font-mono text-maf-400 tracking-tight">${formatDate(r.date_rdv)}</div>
                  <span class="badge mt-2.5 inline-flex" style="background:${r.type_rdv === 'presentiel' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)'};color:${r.type_rdv === 'presentiel' ? '#93c5fd' : '#c4b5fd'};border:1px solid ${r.type_rdv === 'presentiel' ? 'rgba(59,130,246,0.08)' : 'rgba(139,92,246,0.08)'};">
                    <i class="fas ${r.type_rdv === 'presentiel' ? 'fa-building' : r.type_rdv === 'distance' ? 'fa-video' : 'fa-phone'} mr-1.5"></i>${r.type_rdv}
                  </span>
                  ${r.lieu ? `<p class="text-[10px] text-white/15 mt-2 font-medium">${r.lieu}</p>` : ''}
                  <div class="mt-2.5"><span class="badge" style="${getStatutRDVStyle(r.statut)}">${r.statut}</span></div>
                  <p class="text-[10px] text-white/12 mt-2 font-medium">Par ${r.pris_par_prenom} ${r.pris_par_nom}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
  } catch (err) {
    document.getElementById('rdvContent').innerHTML = `<p class="text-red-400 text-sm font-medium">Erreur: ${err.message}</p>`;
  }
}

// =============================================
// PAGE: ADMINISTRATION
// =============================================
function renderAdmin() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('admin')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="mb-8">
        <h1 class="text-[1.6rem] font-extrabold text-white tracking-tight" style="letter-spacing: -0.03em;"><span class="text-gradient">Administration</span></h1>
        <p class="text-white/25 text-sm mt-1.5 font-medium">Gestion de la plateforme</p>
      </div>
      
      <!-- Tabs -->
      <div class="flex space-x-1 mb-8 p-1.5 rounded-2xl w-fit" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">
        <button onclick="switchAdminTab('users')" id="tabUsers" class="px-6 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300" style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);">
          <i class="fas fa-users mr-2 text-maf-400/60"></i>Utilisateurs
        </button>
        <button onclick="switchAdminTab('import')" id="tabImport" class="px-6 py-2.5 rounded-xl text-xs font-semibold text-white/25 hover:text-white/45 transition-all duration-300">
          <i class="fas fa-file-import mr-2"></i>Import CSV
        </button>
      </div>
      
      <div id="adminContent"></div>
    </div>
    <div id="modal" class="hidden"></div>
  `;
  switchAdminTab('users');
}

function switchAdminTab(tab) {
  document.querySelectorAll('[id^="tab"]').forEach(el => {
    el.style.background = 'transparent';
    el.style.color = 'rgba(255,255,255,0.25)';
  });
  const activeTab = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  if (activeTab) {
    activeTab.style.background = 'rgba(255,255,255,0.06)';
    activeTab.style.color = 'rgba(255,255,255,0.7)';
  }

  if (tab === 'users') loadUsers();
  else if (tab === 'import') renderImportCSV();
}

async function loadUsers() {
  try {
    const { data } = await API.get('/users');
    document.getElementById('adminContent').innerHTML = `
      <div class="glass-card-static rounded-2xl overflow-hidden">
        <div class="px-7 py-5 flex justify-between items-center" style="border-bottom:1px solid rgba(255,255,255,0.04);">
          <h3 class="text-sm font-bold text-white/45">Utilisateurs <span class="text-white/20">(${data.users.length})</span></h3>
          <button onclick="showAddUserModal()" class="btn-primary text-xs py-2.5 px-5 rounded-xl font-semibold">
            <i class="fas fa-user-plus mr-2"></i>Ajouter
          </button>
        </div>
        <table class="w-full dark-table">
          <thead>
            <tr>
              <th class="text-left">Nom</th>
              <th class="text-left">Email</th>
              <th class="text-center">Role</th>
              <th class="text-center">Statut</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.users.map(u => `
              <tr>
                <td class="font-semibold text-white/65">${u.prenom} ${u.nom}</td>
                <td class="text-white/35 font-mono text-[12px]">${u.email}</td>
                <td class="text-center"><span class="badge" style="${getRoleBadgeStyle(u.role)}">${getRoleLabel(u.role)}</span></td>
                <td class="text-center">${u.actif ? '<div class="flex items-center justify-center space-x-1.5"><div class="live-dot" style="width:5px;height:5px;"></div><span class="text-emerald-400/70 text-[11px] font-semibold">Actif</span></div>' : '<span class="text-red-400/50 text-[11px] font-semibold">Inactif</span>'}</td>
                <td class="text-center">
                  ${u.id !== currentUser.id ? `
                    <button onclick="toggleUserActive(${u.id}, ${u.actif})" class="text-xs transition-all font-semibold ${u.actif ? 'text-red-400/50 hover:text-red-400' : 'text-emerald-400/50 hover:text-emerald-400'}">
                      <i class="fas ${u.actif ? 'fa-user-slash' : 'fa-user-check'} mr-1"></i>${u.actif ? 'Desact.' : 'Activer'}
                    </button>
                  ` : '<span class="text-white/10 text-[10px] font-medium">Vous</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    document.getElementById('adminContent').innerHTML = `<p class="text-red-400 text-sm font-medium">Erreur: ${err.message}</p>`;
  }
}

function showAddUserModal() {
  document.getElementById('modal').innerHTML = `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="glass rounded-[2rem] max-w-md w-full scale-in" onclick="event.stopPropagation()" style="background:rgba(20,20,24,0.95);box-shadow:0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);">
        <div class="p-8">
          <h2 class="text-lg font-extrabold text-white mb-7 tracking-tight"><i class="fas fa-user-plus text-maf-400 mr-2"></i>Nouvel utilisateur</h2>
          <form id="addUserForm" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Prenom *</label><input type="text" id="uPrenom" required class="w-full glass-input p-3 rounded-xl text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Nom *</label><input type="text" id="uNom" required class="w-full glass-input p-3 rounded-xl text-xs"></div>
            </div>
            <div><label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Email *</label><input type="email" id="uEmail" required class="w-full glass-input p-3 rounded-xl text-xs"></div>
            <div><label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Mot de passe *</label><input type="password" id="uPassword" required minlength="6" class="w-full glass-input p-3 rounded-xl text-xs"></div>
            <div><label class="block text-[10px] font-semibold text-white/25 mb-1.5 uppercase tracking-wider">Role</label>
              <select id="uRole" class="w-full p-3 rounded-xl text-xs">
                <option value="operator">Teleoperateur</option>
                <option value="supervisor">Superviseur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <button type="submit" class="w-full btn-primary py-3.5 rounded-xl mt-3 font-semibold"><i class="fas fa-plus mr-2"></i>Creer</button>
          </form>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal').classList.remove('hidden');

  document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/users', {
        prenom: document.getElementById('uPrenom').value,
        nom: document.getElementById('uNom').value,
        email: document.getElementById('uEmail').value,
        password: document.getElementById('uPassword').value,
        role: document.getElementById('uRole').value,
      });
      document.getElementById('modal').classList.add('hidden');
      loadUsers();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  });
}

async function toggleUserActive(userId, currentActive) {
  if (!confirm(currentActive ? 'Desactiver cet utilisateur ?' : 'Reactiver cet utilisateur ?')) return;
  try {
    if (currentActive) await API.delete(`/users/${userId}`);
    else await API.put(`/users/${userId}`, { actif: true });
    loadUsers();
  } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
}

function renderImportCSV() {
  document.getElementById('adminContent').innerHTML = `
    <div class="glass-card rounded-2xl p-8">
      <h3 class="text-sm font-bold text-white/45 mb-6"><i class="fas fa-file-import text-maf-400 mr-2"></i>Import CSV</h3>
      <div class="rounded-xl p-5 mb-6 text-xs" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);">
        <p class="font-semibold text-white/35 mb-2">Format (separateur: ;)</p>
        <code class="text-[11px] p-3 rounded-lg block font-mono leading-relaxed" style="background:rgba(255,255,255,0.03);color:rgba(232,100,44,0.6);">nom_entreprise;nom_dirigeant;telephone;email;ville;code_postal;code_ape;opco;notes</code>
      </div>
      <textarea id="csvData" rows="8" placeholder="Collez vos donnees CSV ici..." class="w-full p-4 rounded-xl text-xs font-mono mb-5"></textarea>
      <button onclick="importCSV()" class="btn-primary rounded-xl font-semibold"><i class="fas fa-upload mr-2"></i>Importer</button>
      <div id="importResult" class="mt-5 hidden"></div>
    </div>
  `;
}

async function importCSV() {
  const raw = document.getElementById('csvData').value.trim();
  if (!raw) { alert('Collez des donnees CSV'); return; }

  const lines = raw.split('\n').filter(l => l.trim());
  const prospects = lines.map(line => {
    const cols = line.split(';').map(c => c.trim());
    return {
      nom_entreprise: cols[0], nom_dirigeant: cols[1], telephone: cols[2],
      email: cols[3], ville: cols[4], code_postal: cols[5],
      code_ape: cols[6], opco: cols[7], notes: cols[8]
    };
  });

  try {
    const { data } = await API.post('/prospects/import', { prospects });
    const resultDiv = document.getElementById('importResult');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `
      <div class="rounded-xl p-5 scale-in" style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.12);">
        <p class="font-semibold text-emerald-300 text-xs"><i class="fas fa-check-circle mr-2"></i>${data.imported} importes sur ${data.total}</p>
        ${data.errors?.length ? `<div class="mt-3 text-[10px] text-red-300/50 leading-relaxed">${data.errors.join('<br>')}</div>` : ''}
      </div>
    `;
  } catch (err) { alert(err.response?.data?.error || 'Erreur d\'import'); }
}

function changePage(newPage) {
  const pageInput = document.getElementById('filterPage');
  if (pageInput) pageInput.value = newPage;
  loadProspects();
}

// =============================================
// UTILITAIRES
// =============================================
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function getStatusBadge(statut) {
  const map = {
    NOUVEAU: '<span class="badge" style="background:rgba(59,130,246,0.1);color:#93c5fd;border:1px solid rgba(59,130,246,0.1);">Nouveau</span>',
    AR: '<span class="badge" style="background:rgba(245,158,11,0.1);color:#fcd34d;border:1px solid rgba(245,158,11,0.1);">AR</span>',
    RDV: '<span class="badge" style="background:rgba(16,185,129,0.1);color:#6ee7b7;border:1px solid rgba(16,185,129,0.1);">RDV</span>',
    FIN: '<span class="badge" style="background:rgba(113,113,122,0.1);color:#a1a1aa;border:1px solid rgba(113,113,122,0.08);">Cloture</span>',
  };
  return map[statut] || statut;
}

function getResultBorderColor(statut) {
  return { NRP: 'border-red-500/30', AR: 'border-amber-500/30', RDV: 'border-emerald-500/30', FIN: 'border-white/8' }[statut] || 'border-white/5';
}

function getStatutRDVStyle(statut) {
  return {
    PLANIFIE: 'background:rgba(59,130,246,0.1);color:#93c5fd;border:1px solid rgba(59,130,246,0.08);',
    CONFIRME: 'background:rgba(16,185,129,0.1);color:#6ee7b7;border:1px solid rgba(16,185,129,0.08);',
    REALISE: 'background:rgba(34,197,94,0.1);color:#86efac;border:1px solid rgba(34,197,94,0.08);',
    ANNULE: 'background:rgba(239,68,68,0.1);color:#fca5a5;border:1px solid rgba(239,68,68,0.08);',
    REPORTE: 'background:rgba(245,158,11,0.1);color:#fcd34d;border:1px solid rgba(245,158,11,0.08);',
  }[statut] || 'background:rgba(113,113,122,0.1);color:#a1a1aa;border:1px solid rgba(113,113,122,0.08);';
}

function getStatutRDVColor(statut) {
  return getStatutRDVStyle(statut);
}

function getRoleBadgeStyle(role) {
  return {
    admin: 'background:rgba(232,100,44,0.1);color:#fca5a5;border:1px solid rgba(232,100,44,0.1);',
    supervisor: 'background:rgba(139,92,246,0.1);color:#c4b5fd;border:1px solid rgba(139,92,246,0.08);',
    operator: 'background:rgba(59,130,246,0.1);color:#93c5fd;border:1px solid rgba(59,130,246,0.08);',
  }[role] || 'background:rgba(113,113,122,0.1);color:#a1a1aa;border:1px solid rgba(113,113,122,0.08);';
}

function getRoleBadgeColor(role) { return ''; }

function getDefaultRappelDate() {
  const d = new Date();
  d.setHours(d.getHours() + 2);
  return d.toISOString().slice(0, 16);
}

function closeModal(event) {
  if (event.target === event.currentTarget) {
    document.getElementById('modal').classList.add('hidden');
  }
}

let debounceTimer;
function debounce(fn, delay) {
  return function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  };
}

// Exposer les fonctions globalement
window.fetchNextProspect = fetchNextProspect;
window.showResultForm = showResultForm;
window.submitResult = submitResult;
window.releaseProspect = releaseProspect;
window.loadDashboard = loadDashboard;
window.showProspectDetail = showProspectDetail;
window.showAddProspectModal = showAddProspectModal;
window.closeModal = closeModal;
window.loadProspects = loadProspects;
window.changePage = changePage;
window.switchAdminTab = switchAdminTab;
window.showAddUserModal = showAddUserModal;
window.toggleUserActive = toggleUserActive;
window.importCSV = importCSV;
window.logout = logout;
window.debounce = debounce;
window.loadRDV = loadRDV;
