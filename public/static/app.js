// =============================================
// MAF Formation - Telemarketing SPA
// LIGHT WARM PREMIUM UI v4.0
// Fond clair, orange MAF, blanc, gris chaud
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

// ---- Router ----
function navigate(hash) { window.location.hash = hash; }

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
  const token = localStorage.getItem('maf_token');
  const userData = localStorage.getItem('maf_user');
  if (token && userData) { currentUser = JSON.parse(userData); handleRoute(); }
  else navigate('#login');
});

function handleRoute() {
  const hash = window.location.hash || '#login';
  clearTimers();
  if (!currentUser && hash !== '#login') { navigate('#login'); return; }
  const routes = {
    '#login': renderLogin, '#operator': renderOperator, '#dashboard': renderDashboard,
    '#prospects': renderProspectsList, '#rdv': renderRDVList, '#admin': renderAdmin,
  };
  (routes[hash] || routes['#login'])();
}

function clearTimers() {
  if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
}

// =============================================
// PAGE: LOGIN
// =============================================
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-bg flex items-center justify-center p-4">
      <div class="login-card p-10 w-full max-w-md slide-up">
        <div class="text-center mb-10">
          <div class="login-icon-circle mx-auto mb-6 icon-breathe">
            <i class="fas fa-headset"></i>
          </div>
          <h1 class="text-2xl font-extrabold tracking-tight" style="color:#333333;">MAF Formation</h1>
          <p class="mt-2 text-sm font-medium" style="color:#888888;">Plateforme Telemarketing</p>
        </div>

        <form id="loginForm" class="space-y-5">
          <div>
            <label class="block text-xs font-bold mb-2 uppercase tracking-wider" style="color:#888888;">Email</label>
            <div class="relative">
              <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-sm" style="color:#E8642C;"></i>
              <input type="email" id="loginEmail" placeholder="votre@email.fr" required
                class="w-full pl-11 pr-4 py-3.5 glass-input text-sm" style="border-radius:10px;">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold mb-2 uppercase tracking-wider" style="color:#888888;">Mot de passe</label>
            <div class="relative">
              <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-sm" style="color:#E8642C;"></i>
              <input type="password" id="loginPassword" placeholder="Mot de passe" required
                class="w-full pl-11 pr-4 py-3.5 glass-input text-sm" style="border-radius:10px;">
            </div>
          </div>
          <div id="loginError" class="hidden rounded-xl p-3.5 text-sm bg-red-50 border border-red-200 text-red-600 font-medium"></div>
          <button type="submit" class="w-full btn-primary py-4 text-sm rounded-xl mt-2 flex items-center justify-center">
            Connexion<i class="fas fa-arrow-right ml-3"></i>
          </button>
        </form>

        <div class="mt-8 text-center">
          <div class="divider"></div>
          <p class="text-xs mt-4 font-mono" style="color:#BBBBBB;">admin@maf-formation.fr / admin</p>
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
// NAVBAR
// =============================================
function getNavbar(active = '') {
  const isAdmin = currentUser?.role === 'admin';
  const isSupervisor = currentUser?.role === 'supervisor';
  const isOperator = currentUser?.role === 'operator';
  const links = [];
  if (isOperator || isAdmin || isSupervisor) links.push({ hash: '#operator', icon: 'fa-phone', label: 'Appels', active: active === 'operator' });
  if (isAdmin || isSupervisor) {
    links.push({ hash: '#dashboard', icon: 'fa-chart-bar', label: 'Dashboard', active: active === 'dashboard' });
    links.push({ hash: '#prospects', icon: 'fa-users', label: 'Prospects', active: active === 'prospects' });
  }
  links.push({ hash: '#rdv', icon: 'fa-calendar-check', label: 'RDV', active: active === 'rdv' });
  if (isAdmin) links.push({ hash: '#admin', icon: 'fa-cog', label: 'Admin', active: active === 'admin' });

  return `
    <nav class="nav-bar sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: var(--maf-peach);">
              <i class="fas fa-headset text-sm" style="color: var(--maf-orange);"></i>
            </div>
            <span class="font-extrabold text-sm tracking-tight" style="color: var(--text-dark);">MAF Formation</span>
          </div>
          <div class="flex items-center space-x-1 bg-gray-50 rounded-xl p-1" style="border: 1px solid #EEEEEE;">
            ${links.map(l => `
              <a href="${l.hash}" class="nav-link ${l.active ? 'active' : ''}">
                <i class="fas ${l.icon} mr-2 text-[11px]"></i>${l.label}
              </a>
            `).join('')}
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-xs font-bold" style="color: var(--text-dark);">${currentUser?.prenom} ${currentUser?.nom}</p>
              <p class="text-[11px] font-semibold" style="color: var(--maf-orange);">${getRoleLabel(currentUser?.role)}</p>
            </div>
            <button onclick="logout()" class="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50" style="color:#CCCCCC;" title="Deconnexion">
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
// PAGE: OPERATEUR
// =============================================
function renderOperator() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('operator')}
    <div class="max-w-5xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="section-title"><span class="text-gradient">Poste d'appel</span></h1>
          <p class="section-subtitle">File d'attente commune</p>
        </div>
        <div id="myStatsBar" class="flex items-center space-x-2"></div>
      </div>
      <div id="operatorContent">
        <div class="text-center py-24 slide-up">
          <div class="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8" style="background: var(--maf-peach);">
            <i class="fas fa-phone-volume text-4xl float" style="color: var(--maf-orange);"></i>
          </div>
          <h2 class="text-xl font-extrabold mb-2" style="color: var(--text-dark);">Pret a appeler</h2>
          <p class="mb-8 text-sm" style="color: var(--text-light);">Cliquez pour obtenir le prochain prospect</p>
          <button onclick="fetchNextProspect()" class="btn-primary text-sm px-10 py-4 rounded-xl">
            <i class="fas fa-bolt mr-2"></i>Prochain prospect
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
        <span class="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500"><i class="fas fa-phone mr-1 text-gray-300"></i>${s.total_appels || 0}</span>
        <span class="bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg text-xs font-bold text-green-600"><i class="fas fa-calendar-check mr-1"></i>${s.nb_rdv || 0}</span>
        <span class="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600"><i class="fas fa-redo mr-1"></i>${s.nb_ar || 0}</span>
        <span class="bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500"><i class="fas fa-phone-slash mr-1"></i>${s.nb_nrp || 0}</span>
      </div>
    `;
  } catch (e) { console.error(e); }
}

async function fetchNextProspect() {
  const content = document.getElementById('operatorContent');
  content.innerHTML = `<div class="text-center py-24"><div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background:var(--maf-peach);"><i class="fas fa-spinner fa-spin text-xl" style="color:var(--maf-orange);"></i></div><p class="text-sm" style="color:var(--text-light);">Recherche...</p></div>`;
  try {
    const { data } = await API.get('/prospects/next');
    if (!data.prospect) {
      content.innerHTML = `
        <div class="text-center py-24 slide-up">
          <div class="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6" style="background:#ECFDF5;"><i class="fas fa-check-circle text-green-500 text-4xl"></i></div>
          <h2 class="text-xl font-extrabold mb-2" style="color:var(--text-dark);">File d'attente vide</h2>
          <p class="mb-8 text-sm" style="color:var(--text-light);">${data.message || 'Tous les prospects sont traites.'}</p>
          <button onclick="fetchNextProspect()" class="btn-secondary px-6 py-3 rounded-xl"><i class="fas fa-sync mr-2"></i>Verifier</button>
        </div>`;
      return;
    }
    renderCallCard(data.prospect, data.historique || [], data.locked_until);
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || 'Erreur serveur';
    content.innerHTML = `
      <div class="text-center py-24 slide-up">
        <div class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5" style="background:#FFFBEB;"><i class="fas fa-exclamation-triangle text-amber-500 text-2xl"></i></div>
        <p class="font-semibold mb-2" style="color:var(--text-medium);">${msg}</p>
        <button onclick="fetchNextProspect()" class="btn-primary mt-6 px-8 py-3 rounded-xl"><i class="fas fa-redo mr-2"></i>Reessayer</button>
      </div>`;
  }
}

function renderCallCard(prospect, historique, lockedUntil) {
  lockEndTime = new Date(lockedUntil);
  const content = document.getElementById('operatorContent');
  const statusBadge = {
    'NOUVEAU': '<span class="badge bg-blue-50 text-blue-600 border border-blue-100"><i class="fas fa-star mr-1 text-[8px]"></i>Nouveau</span>',
    'AR': '<span class="badge bg-amber-50 text-amber-600 border border-amber-100"><i class="fas fa-redo mr-1 text-[8px]"></i>A rappeler</span>',
  }[prospect.statut] || '';
  const nrpBadge = prospect.compteur_nrp > 0
    ? `<span class="badge bg-red-50 text-red-500 border border-red-100"><i class="fas fa-phone-slash mr-1 text-[8px]"></i>${prospect.compteur_nrp}/5 NRP</span>` : '';

  content.innerHTML = `
    <div class="slide-up">
      <div class="rounded-xl p-4 mb-5 flex justify-between items-center" style="background:var(--maf-peach-light);border:1.5px solid rgba(232,100,44,0.15);">
        <div class="flex items-center"><div class="live-dot mr-3"></div><span class="text-xs font-bold" style="color:var(--text-medium);">Prospect verrouille pour vous</span></div>
        <div id="lockTimer" class="text-sm font-mono font-bold text-maf-600"></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 space-y-4">
          <div class="glass-card rounded-xl p-6">
            <div class="flex justify-between items-start mb-5">
              <div>
                <h2 class="text-lg font-extrabold" style="color:var(--text-dark);">${prospect.nom_entreprise}</h2>
                <p class="text-sm mt-0.5" style="color:var(--text-light);">${prospect.nom_dirigeant || 'Contact non renseigne'}</p>
              </div>
              <div class="flex space-x-2">${statusBadge} ${nrpBadge}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-3"><i class="fas fa-phone text-maf-500 text-xs"></i></div><a href="tel:${prospect.telephone}" class="text-maf-600 font-bold text-base hover:text-maf-700">${prospect.telephone}</a></div>
              <div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3"><i class="fas fa-map-marker-alt text-gray-300 text-xs"></i></div><span class="text-gray-500">${prospect.ville || 'Non renseigne'} ${prospect.code_postal || ''}</span></div>
              ${prospect.email ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3"><i class="fas fa-envelope text-gray-300 text-xs"></i></div><span class="text-gray-500">${prospect.email}</span></div>` : ''}
              ${prospect.code_ape ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3"><i class="fas fa-industry text-gray-300 text-xs"></i></div><span class="text-gray-500">APE: ${prospect.code_ape}</span></div>` : ''}
              ${prospect.opco ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-3"><i class="fas fa-building text-maf-400 text-xs"></i></div><span class="text-gray-700 font-semibold">OPCO: ${prospect.opco}</span></div>` : ''}
              ${prospect.budget_identifie ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mr-3"><i class="fas fa-euro-sign text-green-400 text-xs"></i></div><span class="text-gray-500">Budget: ${prospect.budget_identifie}&euro;</span></div>` : ''}
            </div>
            ${prospect.notes ? `<div class="mt-5 p-3.5 rounded-lg text-xs text-amber-700 bg-amber-50 border border-amber-100"><i class="fas fa-sticky-note text-amber-400 mr-2"></i>${prospect.notes}</div>` : ''}
            ${prospect.date_rappel ? `<div class="mt-3 p-3.5 rounded-lg text-xs text-amber-700 bg-amber-50 border border-amber-100"><i class="fas fa-clock text-amber-400 mr-2"></i>Rappel prevu: ${formatDate(prospect.date_rappel)}</div>` : ''}
          </div>
          <div class="glass-card rounded-xl p-5">
            <h3 class="font-semibold text-gray-500 text-sm mb-3"><i class="fas fa-history mr-2 text-gray-300"></i>Historique (${historique.length})</h3>
            ${historique.length === 0 ? '<p class="text-gray-300 text-xs italic">Premier appel</p>'
              : `<div class="space-y-1.5 max-h-48 overflow-y-auto">${historique.map(h => `
                  <div class="flex items-start text-xs border-l-2 ${getResultBorderColor(h.statut_resultat)} pl-3 py-1.5 hover:bg-gray-50 rounded-r transition-colors">
                    <span class="font-bold w-10 text-gray-600">${h.statut_resultat}</span>
                    <span class="text-gray-300 w-32 font-mono text-[11px]">${formatDate(h.created_at)}</span>
                    <span class="text-gray-500 flex-1">${h.commentaire || '-'}</span>
                    <span class="text-gray-300 text-[10px]">${h.operateur_prenom} ${h.operateur_nom}</span>
                  </div>`).join('')}</div>`}
          </div>
        </div>
        <div class="space-y-4">
          <div class="glass-card rounded-xl p-5">
            <h3 class="font-semibold text-gray-500 text-sm mb-4"><i class="fas fa-clipboard-check mr-2 text-gray-300"></i>Resultat</h3>
            <div class="space-y-2.5">
              <button onclick="showResultForm('NRP', ${prospect.id})" class="action-btn" style="--btn-color:#fca5a5;--btn-bg:#fef2f2;--btn-glow:rgba(239,68,68,0.06);">
                <span class="flex items-center"><i class="fas fa-phone-slash text-red-400 mr-3"></i><span class="font-semibold text-gray-600 text-sm">NRP</span></span>
                <span class="text-[10px] text-gray-300">Ne repond pas</span>
              </button>
              <button onclick="showResultForm('AR', ${prospect.id})" class="action-btn" style="--btn-color:#fcd34d;--btn-bg:#fffbeb;--btn-glow:rgba(245,158,11,0.06);">
                <span class="flex items-center"><i class="fas fa-redo text-amber-400 mr-3"></i><span class="font-semibold text-gray-600 text-sm">AR</span></span>
                <span class="text-[10px] text-gray-300">A rappeler</span>
              </button>
              <button onclick="showResultForm('RDV', ${prospect.id})" class="action-btn" style="--btn-color:#6ee7b7;--btn-bg:#ecfdf5;--btn-glow:rgba(16,185,129,0.06);">
                <span class="flex items-center"><i class="fas fa-calendar-check text-green-500 mr-3"></i><span class="font-semibold text-gray-600 text-sm">RDV</span></span>
                <span class="text-[10px] text-gray-300">Rendez-vous !</span>
              </button>
              <button onclick="showResultForm('FIN', ${prospect.id})" class="action-btn" style="--btn-color:#d1d5db;--btn-bg:#f9fafb;--btn-glow:rgba(0,0,0,0.02);">
                <span class="flex items-center"><i class="fas fa-ban text-gray-300 mr-3"></i><span class="font-semibold text-gray-400 text-sm">FIN</span></span>
                <span class="text-[10px] text-gray-300">Cloturer</span>
              </button>
            </div>
          </div>
          <div id="resultForm" class="hidden"></div>
          <button onclick="releaseProspect(${prospect.id})" class="w-full btn-secondary py-2.5 text-xs rounded-lg font-semibold">
            <i class="fas fa-forward mr-2"></i>Passer
          </button>
        </div>
      </div>
    </div>`;
  startLockTimer();
}

function startLockTimer() {
  const timerEl = document.getElementById('lockTimer');
  if (!timerEl) return;
  lockTimer = setInterval(() => {
    const diff = lockEndTime - new Date();
    if (diff <= 0) { timerEl.innerHTML = '<span class="timer-urgent font-semibold">Verrou expire</span>'; clearInterval(lockTimer); return; }
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
    NRP: `<div class="glass-card rounded-xl p-5 scale-in border-red-100"><h4 class="font-bold text-red-600 text-sm mb-3"><i class="fas fa-phone-slash mr-2"></i>NRP</h4><textarea id="nrpComment" placeholder="Commentaire..." rows="2" class="w-full p-3 rounded-lg text-xs mb-3"></textarea><button onclick="submitResult('NRP', ${prospectId})" class="w-full btn-danger py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer</button></div>`,
    AR: `<div class="glass-card rounded-xl p-5 scale-in border-amber-100"><h4 class="font-bold text-amber-600 text-sm mb-3"><i class="fas fa-redo mr-2"></i>A rappeler</h4><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Date *</label><input type="datetime-local" id="arDate" required class="w-full glass-input p-3 rounded-lg text-xs mb-3" value="${getDefaultRappelDate()}"><textarea id="arComment" placeholder="Raison..." rows="2" class="w-full p-3 rounded-lg text-xs mb-3"></textarea><button onclick="submitResult('AR', ${prospectId})" class="w-full btn-warning py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer AR</button></div>`,
    RDV: `<div class="glass-card rounded-xl p-5 scale-in border-green-100"><h4 class="font-bold text-green-600 text-sm mb-3"><i class="fas fa-calendar-check mr-2"></i>Rendez-vous</h4>
      <div class="space-y-2.5">
        <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Date et heure *</label><input type="datetime-local" id="rdvDate" required class="w-full glass-input p-3 rounded-lg text-xs"></div>
        <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Type</label><select id="rdvType" class="w-full p-3 rounded-lg text-xs"><option value="presentiel">Presentiel</option><option value="distance">A distance</option><option value="telephone">Telephone</option></select></div>
        <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Lieu</label><input type="text" id="rdvLieu" placeholder="Adresse ou lien..." class="w-full glass-input p-3 rounded-lg text-xs"></div>
        <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Formation</label><textarea id="rdvFormation" placeholder="Formation souhaitee..." rows="2" class="w-full p-3 rounded-lg text-xs"></textarea></div>
        <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Notes</label><textarea id="rdvComments" placeholder="Notes..." rows="2" class="w-full p-3 rounded-lg text-xs"></textarea></div>
      </div>
      <button onclick="submitResult('RDV', ${prospectId})" class="w-full btn-success py-2.5 rounded-lg text-sm mt-3"><i class="fas fa-check mr-2"></i>Confirmer RDV</button></div>`,
    FIN: `<div class="glass-card rounded-xl p-5 scale-in"><h4 class="font-bold text-gray-500 text-sm mb-3"><i class="fas fa-ban mr-2"></i>Cloturer</h4><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Motif *</label><select id="finMotif" class="w-full p-3 rounded-lg text-xs mb-3"><option value="PAS_INTERESSE">Pas interesse</option><option value="HORS_CIBLE">Hors cible</option><option value="FAUX_NUMERO">Faux numero</option><option value="DOUBLON">Doublon</option><option value="AUTRE">Autre</option></select><textarea id="finComment" placeholder="Commentaire..." rows="2" class="w-full p-3 rounded-lg text-xs mb-3"></textarea><button onclick="submitResult('FIN', ${prospectId})" class="w-full btn-secondary py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer</button></div>`
  };
  formDiv.innerHTML = forms[type];
}

function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#e8642c','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random()*100+'%'; c.style.animationDelay = Math.random()*2+'s';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.borderRadius = Math.random()>0.5?'50%':'2px';
    c.style.width = (Math.random()*8+4)+'px'; c.style.height = (Math.random()*8+4)+'px';
    container.appendChild(c);
  }
  setTimeout(() => container.remove(), 4000);
}

async function submitResult(type, prospectId) {
  const payload = { prospect_id: prospectId, statut_resultat: type };
  switch (type) {
    case 'NRP': payload.commentaire = document.getElementById('nrpComment')?.value; break;
    case 'AR':
      payload.date_rappel = document.getElementById('arDate')?.value;
      payload.commentaire = document.getElementById('arComment')?.value;
      if (!payload.date_rappel) { alert('Date obligatoire'); return; } break;
    case 'RDV':
      payload.rdv_date = document.getElementById('rdvDate')?.value;
      payload.rdv_type = document.getElementById('rdvType')?.value;
      payload.rdv_lieu = document.getElementById('rdvLieu')?.value;
      payload.rdv_formation = document.getElementById('rdvFormation')?.value;
      payload.rdv_commentaires = document.getElementById('rdvComments')?.value;
      payload.commentaire = `RDV pris: ${payload.rdv_formation || 'Formation a preciser'}`;
      if (!payload.rdv_date) { alert('Date obligatoire'); return; } break;
    case 'FIN':
      payload.motif_fin = document.getElementById('finMotif')?.value;
      payload.commentaire = document.getElementById('finComment')?.value; break;
  }
  try {
    await API.post('/appels', payload);
    const content = document.getElementById('operatorContent');
    if (type === 'RDV') showConfetti();
    const cfgMap = {
      NRP: { icon: 'fa-phone-slash', msg: 'NRP enregistre', bgc: '#FEF2F2', icc: '#EF4444' },
      AR: { icon: 'fa-redo', msg: 'Rappel programme', bgc: '#FFFBEB', icc: '#F59E0B' },
      RDV: { icon: 'fa-trophy', msg: 'RDV enregistre !', bgc: '#ECFDF5', icc: '#10B981' },
      FIN: { icon: 'fa-ban', msg: 'Prospect cloture', bgc: '#F9FAFB', icc: '#9CA3AF' },
    };
    const cfg = cfgMap[type];
    content.innerHTML = `
      <div class="text-center py-16 slide-up">
        <div class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${type==='RDV'?'success-glow':''}" style="background:${cfg.bgc};"><i class="fas ${cfg.icon} text-3xl" style="color:${cfg.icc};"></i></div>
        <h2 class="text-xl font-extrabold mb-2" style="color:var(--text-dark);">${cfg.msg}</h2>
        ${type === 'RDV' ? '<p class="text-sm mb-6 font-bold" style="color:#10B981;">Excellent travail !</p>' : '<div class="mb-6"></div>'}
        <button onclick="fetchNextProspect()" class="btn-primary px-10 py-4 rounded-xl"><i class="fas fa-bolt mr-2"></i>Prochain prospect</button>
      </div>`;
    loadMyStats();
  } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
}

async function releaseProspect(prospectId) {
  try { await API.post(`/prospects/${prospectId}/release`); fetchNextProspect(); }
  catch (e) { alert('Erreur'); }
}

// =============================================
// PAGE: DASHBOARD
// =============================================
function renderDashboard() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('dashboard')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="section-title"><span class="text-gradient">Dashboard</span></h1>
          <p class="section-subtitle">Vue d'ensemble en temps reel</p>
        </div>
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2"><div class="live-dot"></div><span id="lastRefresh" class="text-[10px] font-mono" style="color:var(--text-muted);"></span></div>
          <button onclick="loadDashboard()" class="btn-secondary text-xs py-2.5 px-5 rounded-lg"><i class="fas fa-sync mr-1.5"></i>Actualiser</button>
        </div>
      </div>
      <div id="dashboardContent"><div class="text-center py-16"><i class="fas fa-spinner fa-spin text-maf-500 text-xl"></i></div></div>
    </div>`;
  loadDashboard();
  refreshInterval = setInterval(loadDashboard, 30000);
}

async function loadDashboard() {
  try {
    const { data } = await API.get('/dashboard/stats');
    const g = data.global; const ops = data.operators || [];
    document.getElementById('lastRefresh').textContent = new Date().toLocaleTimeString('fr-FR');
    const progress = g.total > 0 ? Math.round(((g.rdv_pris||0)+(g.clotures||0))/g.total*100) : 0;

    document.getElementById('dashboardContent').innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 stagger-children">
        ${[
          {val:g.nouveaux||0, label:'Nouveaux', icon:'fa-star', color:'#3b82f6', bg:'#eff6ff'},
          {val:g.a_rappeler||0, label:'A rappeler', icon:'fa-redo', color:'#f59e0b', bg:'#fffbeb'},
          {val:g.ar_en_retard||0, label:'AR retard', icon:'fa-exclamation-triangle', color:'#ef4444', bg:'#fef2f2', urgent:(g.ar_en_retard||0)>0},
          {val:g.rdv_pris||0, label:'RDV pris', icon:'fa-calendar-check', color:'#10b981', bg:'#ecfdf5'},
          {val:g.en_cours||0, label:'En cours', icon:'fa-lock', color:'#e8642c', bg:'#fff4f0'},
          {val:g.clotures||0, label:'Clotures', icon:'fa-ban', color:'#9ca3af', bg:'#f9fafb'},
        ].map(s => `
          <div class="stat-card glass-card rounded-xl p-5 text-center count-up ${s.urgent?'glow-pulse':''}" style="--accent:${s.color};">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style="background:${s.bg};"><i class="fas ${s.icon} text-sm" style="color:${s.color};"></i></div>
            <div class="text-2xl font-extrabold mb-1" style="color:${s.color};">${s.val}</div>
            <div class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">${s.label}</div>
          </div>`).join('')}
      </div>

      <div class="glass-card rounded-xl p-6 mb-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-bold text-gray-500">Progression globale</h3>
          <span class="text-sm font-mono font-bold text-maf-600">${progress}%</span>
        </div>
        <div class="w-full h-2.5 rounded-full bg-gray-100">
          <div class="h-2.5 rounded-full progress-bar-glow transition-all duration-1000" style="width:${progress}%;background:linear-gradient(90deg,#e8642c,#f97316,#10b981);"></div>
        </div>
        <div class="flex justify-between text-[10px] text-gray-300 mt-2 font-mono"><span>${g.total||0} prospects</span><span>${(g.rdv_pris||0)+(g.clotures||0)} traites</span></div>
      </div>

      <div class="glass-card rounded-xl p-6 mb-6 overflow-hidden">
        <h3 class="text-sm font-bold text-gray-500 mb-4"><i class="fas fa-users mr-2 text-gray-300"></i>Performance operateurs</h3>
        ${ops.length===0?'<p class="text-gray-300 text-xs italic">Aucun operateur actif</p>':`
          <div class="overflow-x-auto"><table class="w-full dark-table"><thead><tr>
            <th class="text-left">Operateur</th><th class="text-center">Appels</th><th class="text-center">RDV</th><th class="text-center">AR</th><th class="text-center">NRP</th><th class="text-center">FIN</th><th class="text-center">Tx conv.</th><th class="text-center">Statut</th>
          </tr></thead><tbody>
            ${ops.map(op => {
              const taux = op.total_appels>0?((op.nb_rdv/op.total_appels)*100).toFixed(1):'0.0';
              return `<tr>
                <td class="font-semibold text-gray-700">${op.prenom} ${op.nom}</td>
                <td class="text-center font-bold text-gray-800">${op.total_appels||0}</td>
                <td class="text-center"><span class="badge bg-green-50 text-green-600 border border-green-100">${op.nb_rdv||0}</span></td>
                <td class="text-center text-amber-500">${op.nb_ar||0}</td>
                <td class="text-center text-red-400">${op.nb_nrp||0}</td>
                <td class="text-center text-gray-300">${op.nb_fin||0}</td>
                <td class="text-center font-mono font-bold ${parseFloat(taux)>=10?'text-green-600':'text-gray-400'}">${taux}%</td>
                <td class="text-center">${op.prospect_en_cours?'<div class="live-dot mx-auto"></div>':'<span class="text-gray-200">-</span>'}</td>
              </tr>`;}).join('')}
          </tbody></table></div>`}
      </div>

      <div class="glass-card rounded-xl p-6">
        <h3 class="text-sm font-bold text-gray-500 mb-4"><i class="fas fa-calendar mr-2 text-gray-300"></i>RDV a venir</h3>
        ${(data.upcomingRdv||[]).length===0?'<p class="text-gray-300 text-xs italic">Aucun RDV</p>':`
          <div class="space-y-2.5">${data.upcomingRdv.map(r => `
            <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50/50 border border-gray-100 hover-lift">
              <div><span class="font-semibold text-gray-700 text-sm">${r.nom_entreprise}</span><span class="text-gray-300 text-xs ml-2">${r.ville||''}</span></div>
              <div class="flex items-center space-x-3 text-xs">
                <span class="badge ${r.type_rdv==='presentiel'?'bg-blue-50 text-blue-600 border border-blue-100':'bg-purple-50 text-purple-600 border border-purple-100'}">${r.type_rdv}</span>
                <span class="font-mono font-bold text-maf-600">${formatDate(r.date_rdv)}</span>
                <span class="text-gray-300">${r.pris_par_prenom}</span>
              </div>
            </div>`).join('')}</div>`}
      </div>`;
  } catch (err) {
    document.getElementById('dashboardContent').innerHTML = `<div class="text-center py-16 text-red-500"><i class="fas fa-exclamation-triangle text-2xl mb-3"></i><p class="text-sm">Erreur: ${err.response?.data?.error||err.message}</p></div>`;
  }
}

// =============================================
// PAGE: PROSPECTS
// =============================================
function renderProspectsList() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('prospects')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-6">
        <div><h1 class="section-title"><span class="text-gradient">Prospects</span></h1><p class="section-subtitle">Base de donnees</p></div>
        <button onclick="showAddProspectModal()" class="btn-primary rounded-lg text-sm py-2.5 px-5"><i class="fas fa-plus mr-2"></i>Ajouter</button>
      </div>
      <div class="glass-card-static rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div class="flex items-center space-x-2">
          <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Statut</label>
          <select id="filterStatut" onchange="loadProspects()" class="px-3 py-2 rounded-lg text-xs"><option value="">Tous</option><option value="NOUVEAU">Nouveau</option><option value="AR">A rappeler</option><option value="RDV">RDV</option><option value="FIN">Cloture</option></select>
        </div>
        <div class="flex-1 min-w-[200px]"><div class="relative"><i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i><input type="text" id="filterSearch" placeholder="Rechercher..." onkeyup="debounce(loadProspects, 300)()" class="w-full glass-input pl-10 pr-4 py-2.5 rounded-lg text-xs"></div></div>
      </div>
      <div id="prospectsTable"><div class="text-center py-12"><i class="fas fa-spinner fa-spin text-maf-500"></i></div></div>
    </div>
    <div id="modal" class="hidden"></div>`;
  loadProspects();
}

async function loadProspects() {
  const statut = document.getElementById('filterStatut')?.value||'';
  const search = document.getElementById('filterSearch')?.value||'';
  try {
    const page = parseInt(document.getElementById('filterPage')?.value||'1');
    const limit = 50;
    const { data } = await API.get('/prospects', { params: { statut, search, limit, page } });
    const list = data.prospects||[];
    document.getElementById('prospectsTable').innerHTML = `
      <div class="glass-card-static rounded-xl overflow-hidden">
        <table class="w-full dark-table"><thead><tr>
          <th class="text-center w-12">#</th><th class="text-left">Entreprise</th><th class="text-left">Contact</th><th class="text-left">Telephone</th><th class="text-left">Ville</th><th class="text-left">OPCO</th><th class="text-center">Statut</th><th class="text-center">NRP</th><th class="text-center">Lock</th>
        </tr></thead><tbody>
          ${list.map((p,idx)=>`
            <tr class="cursor-pointer" onclick="showProspectDetail(${p.id})">
              <td class="text-center font-mono text-gray-300 text-[10px]">${(page-1)*limit+idx+1}</td>
              <td class="font-semibold text-gray-700">${p.nom_entreprise}</td>
              <td class="text-gray-400">${p.nom_dirigeant||'-'}</td>
              <td class="font-mono text-gray-500 text-[12px]">${p.telephone}</td>
              <td class="text-gray-400">${p.ville||'-'}</td>
              <td><span class="badge bg-orange-50 text-maf-600 border border-orange-100">${p.opco||'-'}</span></td>
              <td class="text-center">${getStatusBadge(p.statut)}</td>
              <td class="text-center">${p.compteur_nrp>0?`<span class="font-bold text-xs text-red-500">${p.compteur_nrp}</span>`:'<span class="text-gray-200">-</span>'}</td>
              <td class="text-center">${p.locked_by?'<i class="fas fa-lock text-maf-400 text-[9px]"></i>':'<span class="text-gray-200">-</span>'}</td>
            </tr>`).join('')}
        </tbody></table>
        <div class="px-5 py-3.5 flex justify-between items-center border-t border-gray-100">
          <span class="text-[11px] text-gray-400"><strong class="text-gray-600">${data.pagination?.total||0}</strong> prospects</span>
          <div class="flex items-center space-x-2">
            ${page>1?`<button onclick="changePage(${page-1})" class="btn-secondary text-[10px] py-1 px-2.5 rounded-lg"><i class="fas fa-chevron-left"></i></button>`:''}
            <span class="text-[10px] text-gray-400"><input type="number" id="filterPage" value="${page}" min="1" max="${data.pagination?.pages||1}" onchange="loadProspects()" class="w-10 text-center text-[10px] rounded py-0.5 mx-1"> / ${data.pagination?.pages||1}</span>
            ${page<(data.pagination?.pages||1)?`<button onclick="changePage(${page+1})" class="btn-secondary text-[10px] py-1 px-2.5 rounded-lg"><i class="fas fa-chevron-right"></i></button>`:''}
          </div>
        </div>
      </div>`;
  } catch (err) { document.getElementById('prospectsTable').innerHTML = `<p class="text-red-500 text-sm">Erreur: ${err.message}</p>`; }
}

async function showProspectDetail(id) {
  try {
    const { data } = await API.get(`/prospects/${id}`);
    const p = data.prospect; const appels = data.appels||[]; const rdvs = data.rdv||[];
    document.getElementById('modal').innerHTML = `
      <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scale-in" onclick="event.stopPropagation()" style="box-shadow:0 20px 60px rgba(0,0,0,0.15);">
          <div class="p-7">
            <div class="flex justify-between items-start mb-6">
              <div><h2 class="text-lg font-bold text-gray-800">${p.nom_entreprise}</h2><p class="text-gray-400 text-sm mt-0.5">${p.nom_dirigeant||''} - ${p.ville||''}</p></div>
              <button onclick="document.getElementById('modal').classList.add('hidden')" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-all"><i class="fas fa-times"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-3 text-xs mb-6">
              <div class="text-gray-600"><strong class="text-gray-400">Tel:</strong> <span class="font-mono">${p.telephone}</span></div>
              <div class="text-gray-600"><strong class="text-gray-400">Email:</strong> ${p.email||'-'}</div>
              <div class="text-gray-600"><strong class="text-gray-400">APE:</strong> ${p.code_ape||'-'}</div>
              <div class="text-gray-600"><strong class="text-gray-400">OPCO:</strong> ${p.opco||'-'}</div>
              <div><strong class="text-gray-400">Statut:</strong> ${getStatusBadge(p.statut)}</div>
              <div class="text-gray-600"><strong class="text-gray-400">Budget:</strong> ${p.budget_identifie?p.budget_identifie+'&euro;':'-'}</div>
            </div>
            ${p.notes?`<div class="rounded-lg p-3.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 mb-5"><i class="fas fa-sticky-note text-amber-400 mr-2"></i>${p.notes}</div>`:''}
            <div class="divider mb-5"></div>
            <h3 class="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">Historique (${appels.length})</h3>
            <div class="space-y-1 mb-5 max-h-40 overflow-y-auto">
              ${appels.map(a=>`<div class="text-xs border-l-2 ${getResultBorderColor(a.statut_resultat)} pl-3 py-1.5 hover:bg-gray-50 rounded-r"><span class="font-bold text-gray-600">${a.statut_resultat}</span><span class="text-gray-300 ml-2 font-mono text-[11px]">${formatDate(a.created_at)}</span><span class="text-gray-500 ml-2">${a.commentaire||'-'}</span><span class="text-gray-300 text-[10px] ml-2">(${a.operateur_prenom})</span></div>`).join('')||'<p class="text-gray-300 text-xs italic">Aucun appel</p>'}
            </div>
            ${rdvs.length>0?`<h3 class="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">RDV (${rdvs.length})</h3><div class="space-y-2">${rdvs.map(r=>`<div class="rounded-lg p-3 text-xs bg-green-50 border border-green-100"><strong class="text-green-600 font-mono">${formatDate(r.date_rdv)}</strong> <span class="text-gray-400">- ${r.type_rdv}</span>${r.formation_souhaitee?`<br><span class="text-gray-500">${r.formation_souhaitee}</span>`:''}</div>`).join('')}</div>`:''}
          </div>
        </div>
      </div>`;
    document.getElementById('modal').classList.remove('hidden');
  } catch (err) { alert('Erreur: '+(err.response?.data?.error||err.message)); }
}

function showAddProspectModal() {
  document.getElementById('modal').innerHTML = `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="bg-white rounded-2xl max-w-lg w-full scale-in" onclick="event.stopPropagation()" style="box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div class="p-7">
          <div class="flex justify-between items-center mb-6"><h2 class="text-lg font-bold text-gray-800"><i class="fas fa-plus-circle text-maf-500 mr-2"></i>Ajouter</h2><button onclick="document.getElementById('modal').classList.add('hidden')" class="text-gray-300 hover:text-gray-600"><i class="fas fa-times"></i></button></div>
          <form id="addProspectForm" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Entreprise *</label><input type="text" id="pNom" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Contact</label><input type="text" id="pContact" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Telephone *</label><input type="tel" id="pTel" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Email</label><input type="email" id="pEmail" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Ville</label><input type="text" id="pVille" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">CP</label><input type="text" id="pCP" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">APE</label><input type="text" id="pAPE" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">OPCO</label><select id="pOPCO" class="w-full p-2.5 rounded-lg text-xs"><option value="">-</option><option value="AGEFICE">AGEFICE</option><option value="FAFCEA">FAFCEA</option><option value="AKTO">AKTO</option><option value="ATLAS">ATLAS</option><option value="OPCO_EP">OPCO EP</option></select></div>
            </div>
            <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Notes</label><textarea id="pNotes" rows="2" class="w-full p-2.5 rounded-lg text-xs"></textarea></div>
            <button type="submit" class="w-full btn-primary py-3 rounded-lg mt-2"><i class="fas fa-plus mr-2"></i>Ajouter</button>
          </form>
        </div>
      </div>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('addProspectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/prospects', { nom_entreprise:document.getElementById('pNom').value, nom_dirigeant:document.getElementById('pContact').value, telephone:document.getElementById('pTel').value, email:document.getElementById('pEmail').value, ville:document.getElementById('pVille').value, code_postal:document.getElementById('pCP').value, code_ape:document.getElementById('pAPE').value, opco:document.getElementById('pOPCO').value, notes:document.getElementById('pNotes').value });
      document.getElementById('modal').classList.add('hidden'); loadProspects();
    } catch (err) { alert(err.response?.data?.error||'Erreur'); }
  });
}

// =============================================
// PAGE: RDV
// =============================================
function renderRDVList() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('rdv')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="mb-6"><h1 class="section-title"><span class="text-gradient">Rendez-vous</span></h1><p class="section-subtitle">Tous les RDV planifies</p></div>
      <div id="rdvContent"><div class="text-center py-12"><i class="fas fa-spinner fa-spin text-maf-500"></i></div></div>
    </div>`;
  loadRDV();
}

async function loadRDV() {
  try {
    const { data } = await API.get('/rdv');
    const list = data.rdv||[];
    document.getElementById('rdvContent').innerHTML = list.length===0
      ? '<div class="text-center py-20 text-gray-300"><div class="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-gray-50"><i class="fas fa-calendar text-2xl text-gray-200"></i></div><p class="text-sm">Aucun RDV</p></div>'
      : `<div class="grid gap-3 stagger-children">${list.map(r=>`
          <div class="glass-card rounded-xl p-5">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold text-gray-800 text-sm">${r.nom_entreprise}</h3>
                <p class="text-gray-400 text-xs mt-1">${r.nom_dirigeant||''} - ${r.ville||''}</p>
                <p class="text-xs mt-2"><i class="fas fa-phone text-gray-200 mr-1.5"></i><span class="text-gray-500 font-mono">${r.telephone}</span></p>
                ${r.formation_souhaitee?`<p class="text-xs mt-1"><i class="fas fa-graduation-cap text-maf-400 mr-1.5"></i><span class="text-gray-600">${r.formation_souhaitee}</span></p>`:''}
                ${r.commentaires?`<p class="text-xs text-gray-300 mt-1 italic">${r.commentaires}</p>`:''}
              </div>
              <div class="text-right">
                <div class="text-sm font-bold font-mono text-maf-600">${formatDate(r.date_rdv)}</div>
                <span class="badge mt-2 inline-flex ${r.type_rdv==='presentiel'?'bg-blue-50 text-blue-600 border border-blue-100':'bg-purple-50 text-purple-600 border border-purple-100'}"><i class="fas ${r.type_rdv==='presentiel'?'fa-building':r.type_rdv==='distance'?'fa-video':'fa-phone'} mr-1"></i>${r.type_rdv}</span>
                ${r.lieu?`<p class="text-[10px] text-gray-300 mt-1">${r.lieu}</p>`:''}
                <div class="mt-2"><span class="badge" style="${getStatutRDVStyle(r.statut)}">${r.statut}</span></div>
                <p class="text-[10px] text-gray-300 mt-1">Par ${r.pris_par_prenom} ${r.pris_par_nom}</p>
              </div>
            </div>
          </div>`).join('')}</div>`;
  } catch (err) { document.getElementById('rdvContent').innerHTML = `<p class="text-red-500 text-sm">Erreur: ${err.message}</p>`; }
}

// =============================================
// PAGE: ADMIN
// =============================================
function renderAdmin() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('admin')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="mb-6"><h1 class="section-title"><span class="text-gradient">Administration</span></h1><p class="section-subtitle">Gestion de la plateforme</p></div>
      <div class="flex space-x-1 mb-6 p-1 rounded-xl w-fit bg-gray-50 border border-gray-100">
        <button onclick="switchAdminTab('users')" id="tabUsers" class="px-5 py-2 rounded-lg text-xs font-semibold transition-all bg-white text-gray-700 shadow-sm"><i class="fas fa-users mr-1.5 text-maf-500"></i>Utilisateurs</button>
        <button onclick="switchAdminTab('import')" id="tabImport" class="px-5 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-600 transition-all"><i class="fas fa-file-import mr-1.5"></i>Import CSV</button>
      </div>
      <div id="adminContent"></div>
    </div>
    <div id="modal" class="hidden"></div>`;
  switchAdminTab('users');
}

function switchAdminTab(tab) {
  document.querySelectorAll('[id^="tab"]').forEach(el => { el.style.background='transparent'; el.className=el.className.replace('bg-white text-gray-700 shadow-sm','text-gray-400'); });
  const a = document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`);
  if (a) { a.style.background='#fff'; a.className=a.className.replace('text-gray-400','bg-white text-gray-700 shadow-sm'); }
  if (tab==='users') loadUsers(); else renderImportCSV();
}

async function loadUsers() {
  try {
    const { data } = await API.get('/users');
    document.getElementById('adminContent').innerHTML = `
      <div class="glass-card-static rounded-xl overflow-hidden">
        <div class="px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-500">Utilisateurs (${data.users.length})</h3>
          <button onclick="showAddUserModal()" class="btn-primary text-xs py-2 px-4 rounded-lg"><i class="fas fa-user-plus mr-1.5"></i>Ajouter</button>
        </div>
        <table class="w-full dark-table"><thead><tr><th class="text-left">Nom</th><th class="text-left">Email</th><th class="text-center">Role</th><th class="text-center">Statut</th><th class="text-center">Actions</th></tr></thead><tbody>
          ${data.users.map(u=>`<tr>
            <td class="font-semibold text-gray-700">${u.prenom} ${u.nom}</td>
            <td class="text-gray-400 font-mono text-[12px]">${u.email}</td>
            <td class="text-center"><span class="badge" style="${getRoleBadgeStyle(u.role)}">${getRoleLabel(u.role)}</span></td>
            <td class="text-center">${u.actif?'<span class="flex items-center justify-center space-x-1.5"><span class="live-dot" style="width:5px;height:5px;"></span><span class="text-green-600 text-[11px] font-semibold">Actif</span></span>':'<span class="text-red-400 text-[11px] font-semibold">Inactif</span>'}</td>
            <td class="text-center">${u.id!==currentUser.id?`<button onclick="toggleUserActive(${u.id}, ${u.actif})" class="text-xs font-semibold ${u.actif?'text-red-400 hover:text-red-600':'text-green-500 hover:text-green-700'}"><i class="fas ${u.actif?'fa-user-slash':'fa-user-check'} mr-1"></i>${u.actif?'Desact.':'Activer'}</button>`:'<span class="text-gray-200 text-[10px]">Vous</span>'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>`;
  } catch (err) { document.getElementById('adminContent').innerHTML = `<p class="text-red-500 text-sm">Erreur: ${err.message}</p>`; }
}

function showAddUserModal() {
  document.getElementById('modal').innerHTML = `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="bg-white rounded-2xl max-w-md w-full scale-in" onclick="event.stopPropagation()" style="box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div class="p-7">
          <h2 class="text-lg font-bold text-gray-800 mb-6"><i class="fas fa-user-plus text-maf-500 mr-2"></i>Nouvel utilisateur</h2>
          <form id="addUserForm" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Prenom *</label><input type="text" id="uPrenom" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Nom *</label><input type="text" id="uNom" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
            </div>
            <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Email *</label><input type="email" id="uEmail" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
            <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Mot de passe *</label><input type="password" id="uPassword" required minlength="6" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
            <div><label class="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Role</label><select id="uRole" class="w-full p-2.5 rounded-lg text-xs"><option value="operator">Teleoperateur</option><option value="supervisor">Superviseur</option><option value="admin">Administrateur</option></select></div>
            <button type="submit" class="w-full btn-primary py-3 rounded-lg mt-2"><i class="fas fa-plus mr-2"></i>Creer</button>
          </form>
        </div>
      </div>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await API.post('/users', { prenom:document.getElementById('uPrenom').value, nom:document.getElementById('uNom').value, email:document.getElementById('uEmail').value, password:document.getElementById('uPassword').value, role:document.getElementById('uRole').value });
      document.getElementById('modal').classList.add('hidden'); loadUsers();
    } catch (err) { alert(err.response?.data?.error||'Erreur'); }
  });
}

async function toggleUserActive(userId, currentActive) {
  if (!confirm(currentActive?'Desactiver ?':'Reactiver ?')) return;
  try { if (currentActive) await API.delete(`/users/${userId}`); else await API.put(`/users/${userId}`, { actif: true }); loadUsers(); }
  catch (err) { alert(err.response?.data?.error||'Erreur'); }
}

function renderImportCSV() {
  document.getElementById('adminContent').innerHTML = `
    <div class="glass-card rounded-xl p-7">
      <h3 class="text-sm font-bold text-gray-500 mb-5"><i class="fas fa-file-import text-maf-500 mr-2"></i>Import CSV</h3>
      <div class="rounded-lg p-4 mb-5 text-xs bg-gray-50 border border-gray-100">
        <p class="font-semibold text-gray-500 mb-2">Format (separateur: ;)</p>
        <code class="text-[11px] p-2.5 rounded-lg block font-mono bg-white border border-gray-100 text-maf-600">nom_entreprise;nom_dirigeant;telephone;email;ville;code_postal;code_ape;opco;notes</code>
      </div>
      <textarea id="csvData" rows="8" placeholder="Collez vos donnees CSV ici..." class="w-full p-4 rounded-lg text-xs font-mono mb-4"></textarea>
      <button onclick="importCSV()" class="btn-primary rounded-lg"><i class="fas fa-upload mr-2"></i>Importer</button>
      <div id="importResult" class="mt-4 hidden"></div>
    </div>`;
}

async function importCSV() {
  const raw = document.getElementById('csvData').value.trim();
  if (!raw) { alert('Collez des donnees'); return; }
  const prospects = raw.split('\n').filter(l=>l.trim()).map(line => { const c=line.split(';').map(x=>x.trim()); return {nom_entreprise:c[0],nom_dirigeant:c[1],telephone:c[2],email:c[3],ville:c[4],code_postal:c[5],code_ape:c[6],opco:c[7],notes:c[8]}; });
  try {
    const { data } = await API.post('/prospects/import', { prospects });
    const r = document.getElementById('importResult'); r.classList.remove('hidden');
    r.innerHTML = `<div class="rounded-lg p-4 bg-green-50 border border-green-100 scale-in"><p class="font-semibold text-green-600 text-xs"><i class="fas fa-check-circle mr-2"></i>${data.imported} importes sur ${data.total}</p>${data.errors?.length?`<div class="mt-2 text-[10px] text-red-400">${data.errors.join('<br>')}</div>`:''}</div>`;
  } catch (err) { alert(err.response?.data?.error||'Erreur'); }
}

function changePage(p) { const i=document.getElementById('filterPage'); if(i) i.value=p; loadProspects(); }

// =============================================
// UTILITAIRES
// =============================================
function formatDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return d; } }

function getStatusBadge(s) {
  return {
    NOUVEAU: '<span class="badge bg-blue-50 text-blue-600 border border-blue-100">Nouveau</span>',
    AR: '<span class="badge bg-amber-50 text-amber-600 border border-amber-100">AR</span>',
    RDV: '<span class="badge bg-green-50 text-green-600 border border-green-100">RDV</span>',
    FIN: '<span class="badge bg-gray-50 text-gray-500 border border-gray-200">Cloture</span>',
  }[s] || s;
}
function getResultBorderColor(s) { return {NRP:'border-red-300',AR:'border-amber-300',RDV:'border-green-300',FIN:'border-gray-200'}[s]||'border-gray-100'; }
function getStatutRDVStyle(s) {
  return {PLANIFIE:'background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;',CONFIRME:'background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;',REALISE:'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;',ANNULE:'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;',REPORTE:'background:#fffbeb;color:#d97706;border:1px solid #fde68a;'}[s]||'background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb;';
}
function getStatutRDVColor(s) { return getStatutRDVStyle(s); }
function getRoleBadgeStyle(r) {
  return {admin:'background:#fff4f0;color:#e8642c;border:1px solid #ffd4c2;',supervisor:'background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;',operator:'background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;'}[r]||'background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb;';
}
function getRoleBadgeColor(r) { return ''; }
function getDefaultRappelDate() { const d=new Date(); d.setHours(d.getHours()+2); return d.toISOString().slice(0,16); }
function closeModal(e) { if(e.target===e.currentTarget) document.getElementById('modal').classList.add('hidden'); }
let debounceTimer;
function debounce(fn, delay) { return function() { clearTimeout(debounceTimer); debounceTimer=setTimeout(fn, delay); }; }

// Exposer globalement
window.fetchNextProspect = fetchNextProspect; window.showResultForm = showResultForm;
window.submitResult = submitResult; window.releaseProspect = releaseProspect;
window.loadDashboard = loadDashboard; window.showProspectDetail = showProspectDetail;
window.showAddProspectModal = showAddProspectModal; window.closeModal = closeModal;
window.loadProspects = loadProspects; window.changePage = changePage;
window.switchAdminTab = switchAdminTab; window.showAddUserModal = showAddUserModal;
window.toggleUserActive = toggleUserActive; window.importCSV = importCSV;
window.logout = logout; window.debounce = debounce; window.loadRDV = loadRDV;
