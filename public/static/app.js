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
          <p class="mt-2 text-sm font-medium" style="color:#333333;">Plateforme Telemarketing</p>
        </div>

        <form id="loginForm" class="space-y-5">
          <div>
            <label class="block text-xs font-bold mb-2 uppercase tracking-wider" style="color:#333333;">Email</label>
            <div class="relative">
              <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-sm" style="color:#E8642C;"></i>
              <input type="email" id="loginEmail" placeholder="votre@email.fr" required
                class="w-full pl-11 pr-4 py-3.5 glass-input text-sm" style="border-radius:10px;">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold mb-2 uppercase tracking-wider" style="color:#333333;">Mot de passe</label>
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
          <p class="text-xs mt-4 font-mono" style="color:#666666;">admin@maf-formation.fr / admin</p>
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
            <button onclick="logout()" class="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50" style="color:#666666;" title="Deconnexion">
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
        <span class="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-900"><i class="fas fa-phone mr-1 text-gray-700"></i>${s.total_appels || 0}</span>
        <span class="bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg text-xs font-bold text-green-600"><i class="fas fa-calendar-check mr-1"></i>${s.nb_rdv || 0}</span>
        <span class="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600"><i class="fas fa-redo mr-1"></i>${s.nb_ar || 0}</span>
        <span class="bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500"><i class="fas fa-phone-slash mr-1"></i>${s.nb_nrp || 0}</span>
      </div>
    `;
  } catch (e) { console.error(e); }
}

async function fetchNextProspect() {
  const content = document.getElementById('operatorContent');
  content.innerHTML = `<div class="text-center py-24"><div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background:var(--maf-peach);"><i class="fas fa-spinner fa-spin text-xl" style="color:var(--maf-orange);"></i></div><p class="text-sm" style="color:var(--text-dark);">Recherche...</p></div>`;
  try {
    const { data } = await API.get('/prospects/next');
    if (!data.prospect) {
      content.innerHTML = `
        <div class="text-center py-24 slide-up">
          <div class="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6" style="background:#ECFDF5;"><i class="fas fa-check-circle text-green-500 text-4xl"></i></div>
          <h2 class="text-xl font-extrabold mb-2" style="color:var(--text-dark);">File d'attente vide</h2>
          <p class="mb-8 text-sm" style="color:var(--text-dark);">${data.message || 'Tous les prospects sont traites.'}</p>
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
        <p class="font-semibold mb-2" style="color:var(--text-dark);">${msg}</p>
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
        <div class="flex items-center"><div class="live-dot mr-3"></div><span class="text-xs font-bold" style="color:var(--text-dark);">Prospect verrouille pour vous</span></div>
        <div id="lockTimer" class="text-sm font-mono font-bold text-maf-600"></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 space-y-4">
          <div class="glass-card rounded-xl p-6">
            <div class="flex justify-between items-start mb-5">
              <div>
                <h2 class="text-lg font-extrabold" style="color:var(--text-dark);">${prospect.nom_entreprise}</h2>
                <p class="text-sm mt-0.5" style="color:var(--text-dark);">${prospect.nom_dirigeant || 'Contact non renseigne'}</p>
              </div>
              <div class="flex space-x-2">${statusBadge} ${nrpBadge}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-3"><i class="fas fa-phone text-maf-500 text-xs"></i></div><a href="tel:${prospect.telephone}" class="text-maf-600 font-bold text-base hover:text-maf-700">${prospect.telephone}</a></div>
              <div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3"><i class="fas fa-map-marker-alt text-gray-700 text-xs"></i></div><span class="text-gray-900">${prospect.ville || 'Non renseigne'} ${prospect.code_postal || ''}</span></div>
              ${prospect.email ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3"><i class="fas fa-envelope text-gray-700 text-xs"></i></div><span class="text-gray-900">${prospect.email}</span></div>` : ''}
              ${prospect.code_ape ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3"><i class="fas fa-industry text-gray-700 text-xs"></i></div><span class="text-gray-900">APE: ${prospect.code_ape}</span></div>` : ''}
              ${prospect.opco ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mr-3"><i class="fas fa-building text-maf-400 text-xs"></i></div><span class="text-gray-700 font-semibold">OPCO: ${prospect.opco}</span></div>` : ''}
              ${prospect.budget_identifie ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mr-3"><i class="fas fa-euro-sign text-green-400 text-xs"></i></div><span class="text-gray-900">Budget: ${prospect.budget_identifie}&euro;</span></div>` : ''}
            </div>
            ${prospect.notes ? `<div class="mt-5 p-3.5 rounded-lg text-xs text-amber-700 bg-amber-50 border border-amber-100"><i class="fas fa-sticky-note text-amber-400 mr-2"></i>${prospect.notes}</div>` : ''}
            ${prospect.date_rappel ? `<div class="mt-3 p-3.5 rounded-lg text-xs text-amber-700 bg-amber-50 border border-amber-100"><i class="fas fa-clock text-amber-400 mr-2"></i>Rappel prevu: ${formatDate(prospect.date_rappel)}</div>` : ''}
          </div>
          <div class="glass-card rounded-xl p-5">
            <h3 class="font-semibold text-gray-900 text-sm mb-3"><i class="fas fa-history mr-2 text-gray-700"></i>Historique (${historique.length})</h3>
            ${historique.length === 0 ? '<p class="text-gray-700 text-xs italic">Premier appel</p>'
              : `<div class="space-y-1.5 max-h-48 overflow-y-auto">${historique.map(h => `
                  <div class="flex items-start text-xs border-l-2 ${getResultBorderColor(h.statut_resultat)} pl-3 py-1.5 hover:bg-gray-50 rounded-r transition-colors">
                    <span class="font-bold w-10 text-gray-600">${h.statut_resultat}</span>
                    <span class="text-gray-700 w-32 font-mono text-[11px]">${formatDate(h.created_at)}</span>
                    <span class="text-gray-900 flex-1">${h.commentaire || '-'}</span>
                    <span class="text-gray-700 text-[10px]">${h.operateur_prenom} ${h.operateur_nom}</span>
                  </div>`).join('')}</div>`}
          </div>
        </div>
        <div class="space-y-4">
          <div class="glass-card rounded-xl p-5">
            <h3 class="font-semibold text-gray-900 text-sm mb-4"><i class="fas fa-clipboard-check mr-2 text-gray-700"></i>Resultat</h3>
            <div class="space-y-2.5">
              <button onclick="showResultForm('NRP', ${prospect.id})" class="action-btn" style="--btn-color:#fca5a5;--btn-bg:#fef2f2;--btn-glow:rgba(239,68,68,0.06);">
                <span class="flex items-center"><i class="fas fa-phone-slash text-red-400 mr-3"></i><span class="font-semibold text-gray-600 text-sm">NRP</span></span>
                <span class="text-[10px] text-gray-700">Ne repond pas</span>
              </button>
              <button onclick="showResultForm('AR', ${prospect.id})" class="action-btn" style="--btn-color:#fcd34d;--btn-bg:#fffbeb;--btn-glow:rgba(245,158,11,0.06);">
                <span class="flex items-center"><i class="fas fa-redo text-amber-400 mr-3"></i><span class="font-semibold text-gray-600 text-sm">AR</span></span>
                <span class="text-[10px] text-gray-700">A rappeler</span>
              </button>
              <button onclick="showResultForm('RDV', ${prospect.id})" class="action-btn" style="--btn-color:#6ee7b7;--btn-bg:#ecfdf5;--btn-glow:rgba(16,185,129,0.06);">
                <span class="flex items-center"><i class="fas fa-calendar-check text-green-500 mr-3"></i><span class="font-semibold text-gray-600 text-sm">RDV</span></span>
                <span class="text-[10px] text-gray-700">Rendez-vous !</span>
              </button>
              <button onclick="showResultForm('FIN', ${prospect.id})" class="action-btn" style="--btn-color:#d1d5db;--btn-bg:#f9fafb;--btn-glow:rgba(0,0,0,0.02);">
                <span class="flex items-center"><i class="fas fa-ban text-gray-700 mr-3"></i><span class="font-semibold text-gray-800 text-sm">FIN</span></span>
                <span class="text-[10px] text-gray-700">Cloturer</span>
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
  const dateAppelField = `<label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Date de l'appel *</label><input type="datetime-local" id="callDate" class="w-full glass-input p-3 rounded-lg text-xs mb-3" value="${getCurrentDateTime()}">`;
  const forms = {
    NRP: `<div class="glass-card rounded-xl p-5 scale-in border-red-100"><h4 class="font-bold text-red-600 text-sm mb-3"><i class="fas fa-phone-slash mr-2"></i>NRP</h4>${dateAppelField}<textarea id="nrpComment" placeholder="Commentaire..." rows="2" class="w-full p-3 rounded-lg text-xs mb-3"></textarea><button onclick="submitResult('NRP', ${prospectId})" class="w-full btn-danger py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer</button></div>`,
    AR: `<div class="glass-card rounded-xl p-5 scale-in border-amber-100"><h4 class="font-bold text-amber-600 text-sm mb-3"><i class="fas fa-redo mr-2"></i>A rappeler</h4>${dateAppelField}<label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Date de rappel *</label><input type="datetime-local" id="arDate" required class="w-full glass-input p-3 rounded-lg text-xs mb-3" value="${getDefaultRappelDate()}"><textarea id="arComment" placeholder="Raison..." rows="2" class="w-full p-3 rounded-lg text-xs mb-3"></textarea><button onclick="submitResult('AR', ${prospectId})" class="w-full btn-warning py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer AR</button></div>`,
    RDV: `<div class="glass-card rounded-xl p-5 scale-in border-green-100"><h4 class="font-bold text-green-600 text-sm mb-3"><i class="fas fa-calendar-check mr-2"></i>Rendez-vous</h4>
      <div class="space-y-2.5">
        ${dateAppelField.replace('mb-3','mb-1')}
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Date et heure du RDV *</label><input type="datetime-local" id="rdvDate" required class="w-full glass-input p-3 rounded-lg text-xs"></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Type</label><select id="rdvType" class="w-full p-3 rounded-lg text-xs"><option value="presentiel">Presentiel</option><option value="distance">A distance</option><option value="telephone">Telephone</option></select></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Lieu</label><input type="text" id="rdvLieu" placeholder="Adresse ou lien..." class="w-full glass-input p-3 rounded-lg text-xs"></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Formation</label><textarea id="rdvFormation" placeholder="Formation souhaitee..." rows="2" class="w-full p-3 rounded-lg text-xs"></textarea></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Notes</label><textarea id="rdvComments" placeholder="Notes..." rows="2" class="w-full p-3 rounded-lg text-xs"></textarea></div>
      </div>
      <button onclick="submitResult('RDV', ${prospectId})" class="w-full btn-success py-2.5 rounded-lg text-sm mt-3"><i class="fas fa-check mr-2"></i>Confirmer RDV</button></div>`,
    FIN: `<div class="glass-card rounded-xl p-5 scale-in"><h4 class="font-bold text-sm mb-3" style="color:#333333;"><i class="fas fa-ban mr-2"></i>Cloturer</h4>${dateAppelField}<label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Motif *</label><select id="finMotif" class="w-full p-3 rounded-lg text-xs mb-3"><option value="PAS_INTERESSE">Pas interesse</option><option value="HORS_CIBLE">Hors cible</option><option value="FAUX_NUMERO">Faux numero</option><option value="DOUBLON">Doublon</option><option value="AUTRE">Autre</option></select><textarea id="finComment" placeholder="Commentaire..." rows="2" class="w-full p-3 rounded-lg text-xs mb-3"></textarea><button onclick="submitResult('FIN', ${prospectId})" class="w-full btn-secondary py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer</button></div>`
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
  payload.date_appel = document.getElementById('callDate')?.value || null;
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
          <div class="flex items-center space-x-2"><div class="live-dot"></div><span id="lastRefresh" class="text-[10px] font-mono" style="color:#333333;"></span></div>
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
            <div class="text-[10px] text-gray-800 uppercase tracking-wider font-semibold">${s.label}</div>
          </div>`).join('')}
      </div>

      <div class="glass-card rounded-xl p-6 mb-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-bold text-gray-900">Progression globale</h3>
          <span class="text-sm font-mono font-bold text-maf-600">${progress}%</span>
        </div>
        <div class="w-full h-2.5 rounded-full bg-gray-100">
          <div class="h-2.5 rounded-full progress-bar-glow transition-all duration-1000" style="width:${progress}%;background:linear-gradient(90deg,#e8642c,#f97316,#10b981);"></div>
        </div>
        <div class="flex justify-between text-[10px] text-gray-700 mt-2 font-mono"><span>${g.total||0} prospects</span><span>${(g.rdv_pris||0)+(g.clotures||0)} traites</span></div>
      </div>

      <div class="glass-card rounded-xl p-6 mb-6 overflow-hidden">
        <h3 class="text-sm font-bold text-gray-900 mb-4"><i class="fas fa-users mr-2 text-gray-700"></i>Performance operateurs</h3>
        ${ops.length===0?'<p class="text-gray-700 text-xs italic">Aucun operateur actif</p>':`
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
                <td class="text-center text-gray-700">${op.nb_fin||0}</td>
                <td class="text-center font-mono font-bold ${parseFloat(taux)>=10?'text-green-600':'text-gray-800'}">${taux}%</td>
                <td class="text-center">${op.prospect_en_cours?'<div class="live-dot mx-auto"></div>':'<span class="text-gray-600">-</span>'}</td>
              </tr>`;}).join('')}
          </tbody></table></div>`}
      </div>

      <div class="glass-card rounded-xl p-6">
        <h3 class="text-sm font-bold text-gray-900 mb-4"><i class="fas fa-calendar mr-2 text-gray-700"></i>RDV a venir</h3>
        ${(data.upcomingRdv||[]).length===0?'<p class="text-gray-700 text-xs italic">Aucun RDV</p>':`
          <div class="space-y-2.5">${data.upcomingRdv.map(r => `
            <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50/50 border border-gray-100 hover-lift">
              <div><span class="font-semibold text-gray-700 text-sm">${r.nom_entreprise}</span><span class="text-gray-700 text-xs ml-2">${r.ville||''}</span></div>
              <div class="flex items-center space-x-3 text-xs">
                <span class="badge ${r.type_rdv==='presentiel'?'bg-blue-50 text-blue-600 border border-blue-100':'bg-purple-50 text-purple-600 border border-purple-100'}">${r.type_rdv}</span>
                <span class="font-mono font-bold text-maf-600">${formatDate(r.date_rdv)}</span>
                <span class="text-gray-700">${r.pris_par_prenom}</span>
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
          <label class="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">Statut</label>
          <select id="filterStatut" onchange="loadProspects()" class="px-3 py-2 rounded-lg text-xs"><option value="">Tous</option><option value="NOUVEAU">Nouveau</option><option value="AR">A rappeler</option><option value="RDV">RDV</option><option value="FIN">Cloture</option></select>
        </div>
        <div class="flex-1 min-w-[200px]"><div class="relative"><i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-700 text-xs"></i><input type="text" id="filterSearch" placeholder="Rechercher..." onkeyup="debounce(loadProspects, 300)()" class="w-full glass-input pl-10 pr-4 py-2.5 rounded-lg text-xs"></div></div>
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
              <td class="text-center font-mono text-gray-700 text-[10px]">${(page-1)*limit+idx+1}</td>
              <td class="font-semibold text-gray-700">${p.nom_entreprise}</td>
              <td class="text-gray-800">${p.nom_dirigeant||'-'}</td>
              <td class="font-mono text-gray-900 text-[12px]">${p.telephone}</td>
              <td class="text-gray-800">${p.ville||'-'}</td>
              <td><span class="badge bg-orange-50 text-maf-600 border border-orange-100">${p.opco||'-'}</span></td>
              <td class="text-center">${getStatusBadge(p.statut)}</td>
              <td class="text-center">${p.compteur_nrp>0?`<span class="font-bold text-xs text-red-500">${p.compteur_nrp}</span>`:'<span class="text-gray-600">-</span>'}</td>
              <td class="text-center">${p.locked_by?'<i class="fas fa-lock text-maf-400 text-[9px]"></i>':'<span class="text-gray-600">-</span>'}</td>
            </tr>`).join('')}
        </tbody></table>
        <div class="px-5 py-3.5 flex justify-between items-center border-t border-gray-100">
          <span class="text-[11px] text-gray-800"><strong class="text-gray-600">${data.pagination?.total||0}</strong> prospects</span>
          <div class="flex items-center space-x-2">
            ${page>1?`<button onclick="changePage(${page-1})" class="btn-secondary text-[10px] py-1 px-2.5 rounded-lg"><i class="fas fa-chevron-left"></i></button>`:''}
            <span class="text-[10px] text-gray-800"><input type="number" id="filterPage" value="${page}" min="1" max="${data.pagination?.pages||1}" onchange="loadProspects()" class="w-10 text-center text-[10px] rounded py-0.5 mx-1"> / ${data.pagination?.pages||1}</span>
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
    const nrpBadge = p.compteur_nrp > 0 ? `<span class="badge bg-red-50 text-red-500 border border-red-100 ml-2"><i class="fas fa-phone-slash mr-1 text-[8px]"></i>${p.compteur_nrp}/5 NRP</span>` : '';

    document.getElementById('modal').innerHTML = `
      <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
        <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto scale-in" onclick="event.stopPropagation()" style="box-shadow:0 25px 80px rgba(0,0,0,0.15);">
          
          <!-- Header avec nom + statut + bouton fermer -->
          <div class="p-6 pb-4 border-b" style="border-color:#F0F0F0;">
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center">
                  <h2 class="text-xl font-extrabold" style="color:var(--text-dark);">${p.nom_entreprise}</h2>
                  <span class="ml-3">${getStatusBadge(p.statut)}</span>
                  ${nrpBadge}
                </div>
                <p class="text-sm mt-1" style="color:var(--text-dark);">${p.nom_dirigeant||'Contact non renseigne'} — ${p.ville||''} ${p.code_postal||''}</p>
              </div>
              <button onclick="document.getElementById('modal').classList.add('hidden')" class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all" style="color:#666666;"><i class="fas fa-times text-sm"></i></button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-0">
            
            <!-- COLONNE GAUCHE : Infos + Historique -->
            <div class="lg:col-span-2 p-6 pr-4">
              <!-- Infos prospect -->
              <div class="grid grid-cols-2 gap-3 text-sm mb-5">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:var(--maf-peach);"><i class="fas fa-phone text-xs" style="color:var(--maf-orange);"></i></div>
                  <a href="tel:${p.telephone}" class="font-bold text-base hover:underline" style="color:var(--maf-orange);">${p.telephone}</a>
                </div>
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:#F5F5F5;"><i class="fas fa-envelope text-xs" style="color:#666666;"></i></div>
                  <span style="color:var(--text-dark);">${p.email||'-'}</span>
                </div>
                ${p.code_ape ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:#F5F5F5;"><i class="fas fa-industry text-xs" style="color:#666666;"></i></div><span style="color:var(--text-dark);">APE: ${p.code_ape}</span></div>` : ''}
                ${p.opco ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:var(--maf-peach);"><i class="fas fa-building text-xs" style="color:var(--maf-orange);"></i></div><span class="font-semibold" style="color:var(--text-dark);">OPCO: ${p.opco}</span></div>` : ''}
                ${p.budget_identifie ? `<div class="flex items-center"><div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style="background:#ECFDF5;"><i class="fas fa-euro-sign text-xs" style="color:#10B981;"></i></div><span style="color:var(--text-dark);">Budget: ${p.budget_identifie}&euro;</span></div>` : ''}
              </div>

              ${p.notes ? `<div class="rounded-xl p-3.5 text-xs mb-5" style="background:#FFFBEB;border:1.5px solid #FDE68A;color:#92400E;"><i class="fas fa-sticky-note mr-2" style="color:#F59E0B;"></i>${p.notes}</div>` : ''}
              ${p.date_rappel ? `<div class="rounded-xl p-3.5 text-xs mb-5" style="background:var(--maf-peach-light);border:1.5px solid rgba(232,100,44,0.15);color:#92400E;"><i class="fas fa-clock mr-2" style="color:var(--maf-orange);"></i>Rappel prevu: ${formatDate(p.date_rappel)}</div>` : ''}

              <!-- Historique -->
              <div class="divider mb-4"></div>
              <h3 class="text-[11px] font-bold mb-3 uppercase tracking-wider" style="color:#333333;">Historique des appels (${appels.length})</h3>
              <div class="space-y-1.5 mb-5 max-h-44 overflow-y-auto">
                ${appels.map(a=>`<div class="text-xs border-l-2 ${getResultBorderColor(a.statut_resultat)} pl-3 py-2 hover:bg-gray-50 rounded-r transition-colors"><span class="font-bold" style="color:var(--text-dark);">${a.statut_resultat}</span><span class="ml-2 font-mono text-[11px]" style="color:#333333;">${formatDate(a.created_at)}</span><span class="ml-2" style="color:var(--text-dark);">${a.commentaire||'-'}</span><span class="text-[10px] ml-2" style="color:#333333;">(${a.operateur_prenom})</span></div>`).join('')||'<p class="text-xs italic" style="color:#333333;">Premier appel — aucun historique</p>'}
              </div>

              <!-- RDV existants -->
              ${rdvs.length>0?`
                <h3 class="text-[11px] font-bold mb-3 uppercase tracking-wider" style="color:#333333;">Rendez-vous (${rdvs.length})</h3>
                <div class="space-y-2 mb-4">${rdvs.map(r=>`<div class="rounded-xl p-3 text-xs" style="background:#ECFDF5;border:1.5px solid #A7F3D0;"><strong class="font-mono" style="color:#059669;">${formatDate(r.date_rdv)}</strong> <span style="color:var(--text-dark);">— ${r.type_rdv}</span>${r.formation_souhaitee?`<br><span style="color:var(--text-dark);">${r.formation_souhaitee}</span>`:''}</div>`).join('')}</div>
              `:''}
            </div>

            <!-- COLONNE DROITE : Actions -->
            <div class="p-6 pl-4 lg:border-l" style="border-color:#F0F0F0;background:#FAFAFA;border-radius:0 0 1rem 0;">
              <h3 class="text-[11px] font-bold mb-4 uppercase tracking-wider" style="color:#333333;"><i class="fas fa-clipboard-check mr-1.5"></i>Actions</h3>
              
              <div class="space-y-2.5 mb-5">
                <button onclick="showModalResultForm('NRP', ${p.id})" class="action-btn" style="--btn-color:#fca5a5;--btn-bg:#fef2f2;--btn-glow:rgba(239,68,68,0.06);">
                  <span class="flex items-center"><i class="fas fa-phone-slash text-red-400 mr-3"></i><span class="font-semibold text-sm" style="color:var(--text-dark);">NRP</span></span>
                  <span class="text-[10px]" style="color:#333333;">Ne repond pas</span>
                </button>
                <button onclick="showModalResultForm('AR', ${p.id})" class="action-btn" style="--btn-color:#fcd34d;--btn-bg:#fffbeb;--btn-glow:rgba(245,158,11,0.06);">
                  <span class="flex items-center"><i class="fas fa-redo text-amber-400 mr-3"></i><span class="font-semibold text-sm" style="color:var(--text-dark);">AR</span></span>
                  <span class="text-[10px]" style="color:#333333;">A rappeler</span>
                </button>
                <button onclick="showModalResultForm('RDV', ${p.id})" class="action-btn" style="--btn-color:#6ee7b7;--btn-bg:#ecfdf5;--btn-glow:rgba(16,185,129,0.06);">
                  <span class="flex items-center"><i class="fas fa-calendar-check text-green-500 mr-3"></i><span class="font-semibold text-sm" style="color:var(--text-dark);">RDV</span></span>
                  <span class="text-[10px]" style="color:#333333;">Rendez-vous</span>
                </button>
                <button onclick="showModalResultForm('FIN', ${p.id})" class="action-btn" style="--btn-color:#d1d5db;--btn-bg:#f9fafb;--btn-glow:rgba(0,0,0,0.02);">
                  <span class="flex items-center"><i class="fas fa-ban mr-3" style="color:#666666;"></i><span class="font-semibold text-sm" style="color:var(--text-dark);">FIN</span></span>
                  <span class="text-[10px]" style="color:#333333;">Cloturer</span>
                </button>
              </div>

              <!-- Zone formulaire dynamique -->
              <div id="modalResultForm"></div>
            </div>

          </div>
        </div>
      </div>`;
    document.getElementById('modal').classList.remove('hidden');
  } catch (err) { alert('Erreur: '+(err.response?.data?.error||err.message)); }
}

// Formulaire de resultat dans la modal prospect
function showModalResultForm(type, prospectId) {
  const formDiv = document.getElementById('modalResultForm');
  const dateAppelField = `<label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Date de l'appel *</label><input type="datetime-local" id="modalCallDate" class="w-full glass-input p-2.5 rounded-lg text-xs mb-2" value="${getCurrentDateTime()}">`;
  const forms = {
    NRP: `<div class="glass-card-static rounded-xl p-4 scale-in" style="border-color:#FECACA;">
      <h4 class="font-bold text-red-600 text-sm mb-3"><i class="fas fa-phone-slash mr-2"></i>NRP</h4>
      ${dateAppelField}
      <textarea id="modalNrpComment" placeholder="Commentaire optionnel..." rows="2" class="w-full p-3 rounded-lg text-xs"></textarea>
      <button onclick="submitModalResult('NRP', ${prospectId})" class="w-full btn-danger py-2.5 rounded-lg text-sm mt-2"><i class="fas fa-check mr-2"></i>Confirmer NRP</button>
    </div>`,
    AR: `<div class="glass-card-static rounded-xl p-4 scale-in" style="border-color:#FDE68A;">
      <h4 class="font-bold text-amber-600 text-sm mb-3"><i class="fas fa-redo mr-2"></i>A rappeler</h4>
      ${dateAppelField}
      <label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Date de rappel *</label>
      <input type="datetime-local" id="modalArDate" required class="w-full glass-input p-3 rounded-lg text-xs mb-2" value="${getDefaultRappelDate()}">
      <textarea id="modalArComment" placeholder="Raison du rappel..." rows="2" class="w-full p-3 rounded-lg text-xs mb-2"></textarea>
      <button onclick="submitModalResult('AR', ${prospectId})" class="w-full btn-warning py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer AR</button>
    </div>`,
    RDV: `<div class="glass-card-static rounded-xl p-4 scale-in" style="border-color:#A7F3D0;">
      <h4 class="font-bold text-green-600 text-sm mb-3"><i class="fas fa-calendar-check mr-2"></i>Rendez-vous</h4>
      <div class="space-y-2">
        ${dateAppelField.replace('mb-2','mb-1')}
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Date et heure du RDV *</label><input type="datetime-local" id="modalRdvDate" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Type</label><select id="modalRdvType" class="w-full p-2.5 rounded-lg text-xs"><option value="presentiel">Presentiel</option><option value="distance">A distance</option><option value="telephone">Telephone</option></select></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Lieu</label><input type="text" id="modalRdvLieu" placeholder="Adresse ou lien visio..." class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Formation souhaitee</label><textarea id="modalRdvFormation" placeholder="Formation souhaitee..." rows="2" class="w-full p-2.5 rounded-lg text-xs"></textarea></div>
        <div><label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Notes</label><textarea id="modalRdvComments" placeholder="Notes..." rows="2" class="w-full p-2.5 rounded-lg text-xs"></textarea></div>
      </div>
      <button onclick="submitModalResult('RDV', ${prospectId})" class="w-full btn-success py-2.5 rounded-lg text-sm mt-3"><i class="fas fa-check mr-2"></i>Confirmer RDV</button>
    </div>`,
    FIN: `<div class="glass-card-static rounded-xl p-4 scale-in">
      <h4 class="font-bold text-sm mb-3" style="color:#333333;"><i class="fas fa-ban mr-2"></i>Cloturer</h4>
      ${dateAppelField}
      <label class="block text-[10px] font-bold mb-1 uppercase tracking-wider" style="color:#333333;">Motif *</label>
      <select id="modalFinMotif" class="w-full p-2.5 rounded-lg text-xs mb-2"><option value="PAS_INTERESSE">Pas interesse</option><option value="HORS_CIBLE">Hors cible</option><option value="FAUX_NUMERO">Faux numero</option><option value="DOUBLON">Doublon</option><option value="AUTRE">Autre</option></select>
      <textarea id="modalFinComment" placeholder="Commentaire..." rows="2" class="w-full p-2.5 rounded-lg text-xs mb-2"></textarea>
      <button onclick="submitModalResult('FIN', ${prospectId})" class="w-full btn-secondary py-2.5 rounded-lg text-sm"><i class="fas fa-check mr-2"></i>Confirmer</button>
    </div>`
  };
  formDiv.innerHTML = forms[type];
}

// Soumettre un resultat depuis la modal
async function submitModalResult(type, prospectId) {
  const payload = { prospect_id: prospectId, statut_resultat: type };
  payload.date_appel = document.getElementById('modalCallDate')?.value || null;
  switch (type) {
    case 'NRP': payload.commentaire = document.getElementById('modalNrpComment')?.value; break;
    case 'AR':
      payload.date_rappel = document.getElementById('modalArDate')?.value;
      payload.commentaire = document.getElementById('modalArComment')?.value;
      if (!payload.date_rappel) { alert('Date de rappel obligatoire'); return; } break;
    case 'RDV':
      payload.rdv_date = document.getElementById('modalRdvDate')?.value;
      payload.rdv_type = document.getElementById('modalRdvType')?.value;
      payload.rdv_lieu = document.getElementById('modalRdvLieu')?.value;
      payload.rdv_formation = document.getElementById('modalRdvFormation')?.value;
      payload.rdv_commentaires = document.getElementById('modalRdvComments')?.value;
      payload.commentaire = 'RDV pris: ' + (payload.rdv_formation || 'Formation a preciser');
      if (!payload.rdv_date) { alert('Date du RDV obligatoire'); return; } break;
    case 'FIN':
      payload.motif_fin = document.getElementById('modalFinMotif')?.value;
      payload.commentaire = document.getElementById('modalFinComment')?.value; break;
  }
  try {
    await API.post('/appels', payload);
    if (type === 'RDV') showConfetti();
    // Afficher message de succes dans la modal
    const cfgMap = {
      NRP: { icon: 'fa-phone-slash', msg: 'NRP enregistre', bgc: '#FEF2F2', icc: '#EF4444' },
      AR: { icon: 'fa-redo', msg: 'Rappel programme', bgc: '#FFFBEB', icc: '#F59E0B' },
      RDV: { icon: 'fa-trophy', msg: 'RDV confirme !', bgc: '#ECFDF5', icc: '#10B981' },
      FIN: { icon: 'fa-ban', msg: 'Prospect cloture', bgc: '#F9FAFB', icc: '#9CA3AF' },
    };
    const cfg = cfgMap[type];
    const modalContent = document.querySelector('.modal-overlay > div');
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="text-center py-12 px-8 scale-in">
          <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${type==='RDV'?'success-glow':''}" style="background:${cfg.bgc};">
            <i class="fas ${cfg.icon} text-3xl" style="color:${cfg.icc};"></i>
          </div>
          <h2 class="text-xl font-extrabold mb-2" style="color:var(--text-dark);">${cfg.msg}</h2>
          ${type === 'RDV' ? '<p class="text-sm mb-6 font-bold" style="color:#10B981;">Excellent travail !</p>' : '<div class="mb-6"></div>'}
          <div class="flex justify-center space-x-3">
            <button onclick="document.getElementById('modal').classList.add('hidden');loadProspects();" class="btn-secondary px-6 py-3 rounded-xl text-sm">
              <i class="fas fa-list mr-2"></i>Retour a la liste
            </button>
            <button onclick="document.getElementById('modal').classList.add('hidden');navigate('#operator');" class="btn-primary px-6 py-3 rounded-xl text-sm">
              <i class="fas fa-bolt mr-2"></i>Poste d'appel
            </button>
          </div>
        </div>`;
    }
    // Rafraichir la liste en arriere-plan
    if (typeof loadProspects === 'function' && document.getElementById('prospectsTable')) loadProspects();
    if (typeof loadMyStats === 'function') loadMyStats();
  } catch (err) { alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement'); }
}

function showAddProspectModal() {
  document.getElementById('modal').innerHTML = `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="bg-white rounded-2xl max-w-lg w-full scale-in" onclick="event.stopPropagation()" style="box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div class="p-7">
          <div class="flex justify-between items-center mb-6"><h2 class="text-lg font-bold text-gray-800"><i class="fas fa-plus-circle text-maf-500 mr-2"></i>Ajouter</h2><button onclick="document.getElementById('modal').classList.add('hidden')" class="text-gray-700 hover:text-gray-600"><i class="fas fa-times"></i></button></div>
          <form id="addProspectForm" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">Entreprise *</label><input type="text" id="pNom" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">Contact</label><input type="text" id="pContact" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">Telephone *</label><input type="tel" id="pTel" required class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">Email</label><input type="email" id="pEmail" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">Ville</label><input type="text" id="pVille" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">CP</label><input type="text" id="pCP" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">APE</label><input type="text" id="pAPE" class="w-full glass-input p-2.5 rounded-lg text-xs"></div>
              <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">OPCO</label><select id="pOPCO" class="w-full p-2.5 rounded-lg text-xs"><option value="">-</option><option value="AGEFICE">AGEFICE</option><option value="FAFCEA">FAFCEA</option><option value="AKTO">AKTO</option><option value="ATLAS">ATLAS</option><option value="OPCO_EP">OPCO EP</option></select></div>
            </div>
            <div><label class="block text-[10px] font-semibold text-gray-800 mb-1 uppercase tracking-wider">Notes</label><textarea id="pNotes" rows="2" class="w-full p-2.5 rounded-lg text-xs"></textarea></div>
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
      ? '<div class="text-center py-20 text-gray-700"><div class="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-gray-50"><i class="fas fa-calendar text-2xl text-gray-600"></i></div><p class="text-sm">Aucun RDV</p></div>'
      : `<div class="grid gap-3 stagger-children">${list.map(r=>`
          <div class="glass-card rounded-xl p-5">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold text-gray-800 text-sm">${r.nom_entreprise}</h3>
                <p class="text-gray-800 text-xs mt-1">${r.nom_dirigeant||''} - ${r.ville||''}</p>
                <p class="text-xs mt-2"><i class="fas fa-phone text-gray-600 mr-1.5"></i><span class="text-gray-900 font-mono">${r.telephone}</span></p>
                ${r.formation_souhaitee?`<p class="text-xs mt-1"><i class="fas fa-graduation-cap text-maf-400 mr-1.5"></i><span class="text-gray-600">${r.formation_souhaitee}</span></p>`:''}
                ${r.commentaires?`<p class="text-xs text-gray-700 mt-1 italic">${r.commentaires}</p>`:''}
              </div>
              <div class="text-right">
                <div class="text-sm font-bold font-mono text-maf-600">${formatDate(r.date_rdv)}</div>
                <span class="badge mt-2 inline-flex ${r.type_rdv==='presentiel'?'bg-blue-50 text-blue-600 border border-blue-100':'bg-purple-50 text-purple-600 border border-purple-100'}"><i class="fas ${r.type_rdv==='presentiel'?'fa-building':r.type_rdv==='distance'?'fa-video':'fa-phone'} mr-1"></i>${r.type_rdv}</span>
                ${r.lieu?`<p class="text-[10px] text-gray-700 mt-1">${r.lieu}</p>`:''}
                <div class="mt-2"><span class="badge" style="${getStatutRDVStyle(r.statut)}">${r.statut}</span></div>
                <p class="text-[10px] text-gray-700 mt-1">Par ${r.pris_par_prenom} ${r.pris_par_nom}</p>
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
        <button onclick="switchAdminTab('import')" id="tabImport" class="px-5 py-2 rounded-lg text-xs font-semibold text-gray-800 hover:text-gray-600 transition-all"><i class="fas fa-file-import mr-1.5"></i>Import CSV</button>
      </div>
      <div id="adminContent"></div>
    </div>
    <div id="modal" class="hidden"></div>`;
  switchAdminTab('users');
}

function switchAdminTab(tab) {
  document.querySelectorAll('[id^="tab"]').forEach(el => { el.style.background='transparent'; el.className=el.className.replace('bg-white text-gray-700 shadow-sm','text-gray-800'); });
  const a = document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`);
  if (a) { a.style.background='#fff'; a.className=a.className.replace('text-gray-800','bg-white text-gray-700 shadow-sm'); }
  if (tab==='users') loadUsers(); else renderImportCSV();
}

async function loadUsers() {
  try {
    const { data } = await API.get('/users');
    const actifs = data.users.filter(u=>u.actif).length;
    document.getElementById('adminContent').innerHTML = `
      <div class="glass-card rounded-xl overflow-hidden fade-in">
        <div class="px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <div>
            <h3 class="text-sm font-bold text-gray-900">Utilisateurs</h3>
            <p class="text-[10px] text-gray-600 mt-0.5">${actifs} actifs · ${data.users.length} total</p>
          </div>
          <button onclick="showAddUserModal()" class="btn-primary text-xs py-2.5 px-4 rounded-lg">
            <i class="fas fa-user-plus mr-1.5"></i>Ajouter un utilisateur
          </button>
        </div>
        <div class="divide-y divide-gray-50">
          ${data.users.map(u=>`
            <div class="flex items-center justify-between px-6 py-4 hover:bg-orange-50/20 transition-all group">
              <div class="flex items-center space-x-4">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style="background:${u.role==='admin'?'#e8642c':u.role==='supervisor'?'#7c3aed':'#2563eb'}">
                  ${u.prenom.charAt(0)}${u.nom.charAt(0)}
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-800">${u.prenom} ${u.nom}</p>
                  <p class="text-[11px] text-gray-600 font-mono">${u.email}</p>
                </div>
              </div>
              <div class="flex items-center space-x-3">
                <span class="badge text-[10px]" style="${getRoleBadgeStyle(u.role)}">${getRoleLabel(u.role)}</span>
                <span class="text-[10px] font-semibold px-2 py-1 rounded-full ${u.actif?'bg-green-50 text-green-600':'bg-red-50 text-red-400'}">
                  ${u.actif?'Actif':'Inactif'}
                </span>
                ${u.id!==currentUser.id ? `
                  <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="showEditUserModal(${u.id},'${u.prenom}','${u.nom}','${u.email}','${u.role}')"
                      class="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors" title="Modifier">
                      <i class="fas fa-pen text-blue-500 text-[10px]"></i>
                    </button>
                    <button onclick="toggleUserActive(${u.id}, ${u.actif})"
                      class="w-7 h-7 rounded-lg ${u.actif?'bg-amber-50 hover:bg-amber-100':'bg-green-50 hover:bg-green-100'} flex items-center justify-center transition-colors"
                      title="${u.actif?'Désactiver':'Réactiver'}">
                      <i class="fas ${u.actif?'fa-user-slash text-amber-500':'fa-user-check text-green-500'} text-[10px]"></i>
                    </button>
                    <button onclick="deleteUser(${u.id},'${u.prenom} ${u.nom}')"
                      class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors" title="Supprimer définitivement">
                      <i class="fas fa-trash text-red-400 text-[10px]"></i>
                    </button>
                  </div>
                ` : '<span class="text-[10px] text-gray-500 italic">Vous</span>'}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch (err) { document.getElementById('adminContent').innerHTML = `<p class="text-red-500 text-sm p-6">Erreur: ${err.message}</p>`; }
}

function userModalHTML(title, icon, submitLabel, submitColor='btn-primary', fields='') {
  return `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="bg-white rounded-2xl max-w-md w-full scale-in" onclick="event.stopPropagation()" style="box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div class="p-7">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-base font-bold text-gray-800"><i class="fas ${icon} text-maf-500 mr-2"></i>${title}</h2>
            <button onclick="document.getElementById('modal').classList.add('hidden')" class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <i class="fas fa-times text-gray-600 text-xs"></i>
            </button>
          </div>
          <form id="userForm" class="space-y-4">
            ${fields}
            <button type="submit" class="${submitColor} w-full py-3 rounded-xl mt-2 text-sm font-semibold">${submitLabel}</button>
          </form>
        </div>
      </div>
    </div>`;
}

function fieldGroup(label, id, type='text', required=true, placeholder='', value='', extra='') {
  return `<div>
    <label class="block text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">${label}${required?' *':''}</label>
    <input type="${type}" id="${id}" ${required?'required':''} placeholder="${placeholder}" value="${value}" ${extra}
      class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-maf-400 focus:outline-none transition-colors">
  </div>`;
}

function roleSelect(selectedRole='operator') {
  const roles = [{v:'operator',l:'Téléopérateur'},{v:'supervisor',l:'Superviseur'},{v:'admin',l:'Administrateur'}];
  return `<div>
    <label class="block text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Rôle *</label>
    <select id="uRole" class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-maf-400 focus:outline-none transition-colors">
      ${roles.map(r=>`<option value="${r.v}" ${r.v===selectedRole?'selected':''}>${r.l}</option>`).join('')}
    </select>
  </div>`;
}

function showAddUserModal() {
  document.getElementById('modal').innerHTML = userModalHTML(
    'Nouvel utilisateur', 'fa-user-plus', '<i class="fas fa-plus mr-2"></i>Créer le compte', 'btn-primary',
    `<div class="grid grid-cols-2 gap-3">
      ${fieldGroup('Prénom','uPrenom','text',true,'Marie')}
      ${fieldGroup('Nom','uNom','text',true,'Dupont')}
    </div>
    ${fieldGroup('Email','uEmail','email',true,'marie@maf-formation.fr')}
    ${fieldGroup('Mot de passe','uPassword','password',true,'Min. 6 caractères','','minlength="6"')}
    ${roleSelect('operator')}`
  );
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Création...'; btn.disabled = true;
    try {
      await API.post('/users', {
        prenom: document.getElementById('uPrenom').value,
        nom:    document.getElementById('uNom').value,
        email:  document.getElementById('uEmail').value,
        password: document.getElementById('uPassword').value,
        role:   document.getElementById('uRole').value
      });
      document.getElementById('modal').classList.add('hidden');
      loadUsers();
    } catch (err) {
      btn.innerHTML = '<i class="fas fa-plus mr-2"></i>Créer le compte'; btn.disabled = false;
      alert(err.response?.data?.error || 'Erreur');
    }
  });
}

function showEditUserModal(id, prenom, nom, email, role) {
  document.getElementById('modal').innerHTML = userModalHTML(
    'Modifier l\'utilisateur', 'fa-user-pen', '<i class="fas fa-save mr-2"></i>Enregistrer', 'btn-primary',
    `<div class="grid grid-cols-2 gap-3">
      ${fieldGroup('Prénom','uPrenom','text',true,'',prenom)}
      ${fieldGroup('Nom','uNom','text',true,'',nom)}
    </div>
    ${fieldGroup('Email','uEmail','email',true,'',email)}
    ${roleSelect(role)}
    <div class="border-t border-gray-100 pt-4">
      <label class="block text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Nouveau mot de passe <span class="text-gray-500 normal-case font-normal">(laisser vide pour ne pas changer)</span></label>
      <input type="password" id="uPassword" placeholder="Laisser vide pour garder l'actuel" minlength="6"
        class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-maf-400 focus:outline-none transition-colors">
    </div>`
  );
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enregistrement...'; btn.disabled = true;
    const payload = {
      prenom: document.getElementById('uPrenom').value,
      nom:    document.getElementById('uNom').value,
      email:  document.getElementById('uEmail').value,
      role:   document.getElementById('uRole').value,
    };
    const pwd = document.getElementById('uPassword').value;
    if (pwd) payload.password = pwd;
    try {
      await API.put(`/users/${id}`, payload);
      document.getElementById('modal').classList.add('hidden');
      loadUsers();
    } catch (err) {
      btn.innerHTML = '<i class="fas fa-save mr-2"></i>Enregistrer'; btn.disabled = false;
      alert(err.response?.data?.error || 'Erreur');
    }
  });
}

async function deleteUser(userId, userName) {
  document.getElementById('modal').innerHTML = `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="bg-white rounded-2xl max-w-sm w-full scale-in" onclick="event.stopPropagation()" style="box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div class="p-7 text-center">
          <div class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-trash text-red-400 text-xl"></i>
          </div>
          <h2 class="text-base font-bold text-gray-800 mb-2">Supprimer ${userName} ?</h2>
          <p class="text-xs text-gray-600 mb-6">Cette action est irréversible. L'historique des appels sera conservé.</p>
          <div class="flex gap-3">
            <button onclick="document.getElementById('modal').classList.add('hidden')"
              class="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Annuler</button>
            <button id="confirmDeleteBtn"
              class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              <i class="fas fa-trash mr-1.5"></i>Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    const btn = document.getElementById('confirmDeleteBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i>Suppression...'; btn.disabled = true;
    try {
      await API.delete(`/users/${userId}`);
      document.getElementById('modal').classList.add('hidden');
      loadUsers();
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  });
}

async function toggleUserActive(userId, currentActive) {
  try {
    await API.put(`/users/${userId}`, { actif: currentActive ? 0 : 1 });
    loadUsers();
  } catch (err) { alert(err.response?.data?.error||'Erreur'); }
}

// =============================================
// IMPORT PROSPECTS - Upload fichier Excel/CSV
// =============================================

let importData = []; // données parsées en attente de confirmation

function renderImportCSV() {
  document.getElementById('adminContent').innerHTML = `
    <div class="glass-card rounded-xl p-7 fade-in">
      <h3 class="text-sm font-bold text-gray-900 mb-1"><i class="fas fa-file-import text-maf-500 mr-2"></i>Import de prospects en masse</h3>
      <p class="text-xs text-gray-500 mb-6">Importez un fichier Excel (.xlsx) ou CSV (.csv) — colonnes détectées automatiquement</p>

      <!-- Zone de drop -->
      <div id="dropZone" onclick="document.getElementById('fileInput').click()"
        ondragover="event.preventDefault();this.classList.add('border-maf-400','bg-maf-50')"
        ondragleave="this.classList.remove('border-maf-400','bg-maf-50')"
        ondrop="handleFileDrop(event)"
        class="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-maf-400 hover:bg-orange-50/30 transition-all mb-6">
        <div class="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-cloud-upload-alt text-2xl text-maf-500"></i>
        </div>
        <p class="text-sm font-semibold text-gray-700 mb-1">Glissez votre fichier ici</p>
        <p class="text-xs text-gray-600">ou cliquez pour parcourir — .xlsx, .xls, .csv acceptés</p>
        <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" class="hidden" onchange="handleFileSelect(this)">
      </div>

      <!-- Mapping des colonnes -->
      <div id="mappingZone" class="hidden mb-6">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs font-bold text-gray-700"><i class="fas fa-columns mr-1.5 text-maf-500"></i>Mapping des colonnes détectées</h4>
          <span id="fileInfo" class="text-[10px] text-gray-600 font-mono"></span>
        </div>
        <div id="mappingGrid" class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5"></div>
        <div class="flex items-center gap-3">
          <button onclick="previewImport()" class="btn-primary rounded-lg text-xs px-5 py-2.5">
            <i class="fas fa-eye mr-1.5"></i>Prévisualiser (<span id="rowCount">0</span> lignes)
          </button>
          <button onclick="resetImport()" class="btn-secondary rounded-lg text-xs px-4 py-2.5">
            <i class="fas fa-times mr-1.5"></i>Annuler
          </button>
        </div>
      </div>

      <!-- Prévisualisation -->
      <div id="previewZone" class="hidden mb-6">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs font-bold text-gray-700"><i class="fas fa-table mr-1.5 text-maf-500"></i>Aperçu — <span id="previewCount">0</span> prospects à importer</h4>
          <button onclick="document.getElementById('previewZone').classList.add('hidden');document.getElementById('mappingZone').classList.remove('hidden')" class="text-xs text-gray-600 hover:text-gray-600">
            <i class="fas fa-arrow-left mr-1"></i>Modifier
          </button>
        </div>
        <div class="overflow-x-auto rounded-xl border border-gray-100 mb-5" style="max-height:320px;overflow-y:auto">
          <table class="w-full dark-table text-xs" id="previewTable"></table>
        </div>
        <button onclick="confirmImport()" class="btn-primary rounded-lg px-6 py-3 text-sm">
          <i class="fas fa-check mr-2"></i>Confirmer l'import
        </button>
        <button onclick="resetImport()" class="btn-secondary rounded-lg px-5 py-3 text-sm ml-3">Annuler</button>
      </div>

      <!-- Résultat -->
      <div id="importResult" class="hidden"></div>

      <!-- Format CSV info -->
      <div class="rounded-lg p-4 mt-4 text-xs bg-gray-50 border border-gray-100">
        <p class="font-semibold text-gray-700 mb-2"><i class="fas fa-info-circle mr-1.5 text-blue-400"></i>Colonnes reconnues automatiquement</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          ${['nom_entreprise / entreprise / société','nom_dirigeant / dirigeant / contact','telephone / tel / phone','email / mail','ville / city','code_postal / cp','code_ape / ape / naf','opco','notes / commentaires'].map(c=>`<code class="text-[10px] bg-white px-2 py-1 rounded border border-gray-200 text-maf-600">${c}</code>`).join('')}
        </div>
      </div>
    </div>`;
}

// Correspondances colonnes -> champ interne
const COLUMN_MAP = {
  nom_entreprise: ['nom_entreprise','entreprise','societe','société','raison_sociale','company','nom'],
  nom_dirigeant:  ['nom_dirigeant','dirigeant','contact','gerant','gérant','responsable','prenom_nom'],
  telephone:      ['telephone','tel','phone','portable','mobile','fixe','numero','téléphone'],
  email:          ['email','mail','courriel','e-mail'],
  ville:          ['ville','city','commune','localite','localité'],
  code_postal:    ['code_postal','cp','codepostal','code postal','postal'],
  code_ape:       ['code_ape','ape','naf','activite','activité'],
  opco:           ['opco','organisme','fonds'],
  notes:          ['notes','commentaire','commentaires','observation','remarque'],
};

let columnMapping = {}; // header original -> champ interne

function detectColumn(header) {
  const h = header.toLowerCase().trim().replace(/[\s_-]+/g,'_');
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    if (aliases.some(a => h.includes(a.replace(/[\s_-]+/g,'_')) || a.replace(/[\s_-]+/g,'_').includes(h))) {
      return field;
    }
  }
  return '';
}

function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('border-maf-400','bg-maf-50');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let rows = [];
      if (file.name.endsWith('.csv')) {
        // Parsing CSV
        const text = new TextDecoder('utf-8').decode(e.target.result);
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const sep = lines[0].includes(';') ? ';' : ',';
        rows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g,'')));
      } else {
        // Parsing Excel avec SheetJS
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      }

      if (rows.length < 2) { alert('Fichier vide ou non reconnu'); return; }

      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));

      // Détecter les mappings
      columnMapping = {};
      headers.forEach(h => { columnMapping[h] = detectColumn(h); });

      // Stocker les données brutes
      importData = { headers, rows: dataRows };

      // Afficher le mapping
      showMappingUI(headers, dataRows.length, file.name);
    } catch(err) {
      alert('Erreur lecture fichier: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function showMappingUI(headers, rowCount, fileName) {
  document.getElementById('dropZone').classList.add('hidden');
  document.getElementById('mappingZone').classList.remove('hidden');
  document.getElementById('fileInfo').textContent = fileName + ' — ' + rowCount + ' lignes';
  document.getElementById('rowCount').textContent = rowCount;

  const fieldOptions = Object.keys(COLUMN_MAP).map(f => `<option value="${f}">${f}</option>`).join('');

  document.getElementById('mappingGrid').innerHTML = headers.map(h => `
    <div class="bg-white rounded-lg border border-gray-100 p-3">
      <p class="text-[10px] font-mono text-gray-600 mb-1.5 truncate" title="${h}">${h}</p>
      <select onchange="columnMapping['${h}']=this.value" class="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 focus:border-maf-400 outline-none">
        <option value="">— ignorer —</option>
        ${fieldOptions}
      </select>
    </div>
  `).join('');

  // Pré-sélectionner les mappings détectés
  document.querySelectorAll('#mappingGrid select').forEach((sel, i) => {
    const detected = columnMapping[headers[i]];
    if (detected) sel.value = detected;
  });
}

function previewImport() {
  const { headers, rows } = importData;

  // Construire les prospects depuis le mapping courant
  const prospects = rows.slice(0, rows.length).map(row => {
    const p = {};
    headers.forEach((h, i) => {
      const field = columnMapping[h];
      if (field) p[field] = String(row[i] || '').trim();
    });
    return p;
  }).filter(p => p.nom_entreprise && p.telephone);

  importData.prospects = prospects;

  document.getElementById('previewCount').textContent = prospects.length;
  document.getElementById('mappingZone').classList.add('hidden');
  document.getElementById('previewZone').classList.remove('hidden');

  const cols = ['nom_entreprise','nom_dirigeant','telephone','email','ville','opco'];
  document.getElementById('previewTable').innerHTML = `
    <thead><tr>${cols.map(c=>`<th class="text-left px-3 py-2 bg-gray-50 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">${c}</th>`).join('')}</tr></thead>
    <tbody>${prospects.slice(0,50).map(p=>`<tr class="hover:bg-orange-50/30">${cols.map(c=>`<td class="px-3 py-2 border-b border-gray-50 text-gray-700">${p[c]||'—'}</td>`).join('')}</tr>`).join('')}
    ${prospects.length>50?`<tr><td colspan="${cols.length}" class="px-3 py-2 text-center text-gray-600 text-[10px]">... et ${prospects.length-50} autres lignes</td></tr>`:''}</tbody>`;
}

async function confirmImport() {
  const { prospects } = importData;
  if (!prospects || prospects.length === 0) { alert('Aucun prospect valide'); return; }

  const btn = document.querySelector('#previewZone button[onclick="confirmImport()"]');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Import en cours...';
  btn.disabled = true;

  // Envoyer par lots de 500
  let totalImported = 0, allErrors = [];
  const batchSize = 500;

  for (let i = 0; i < prospects.length; i += batchSize) {
    const batch = prospects.slice(i, i + batchSize);
    try {
      const { data } = await API.post('/prospects/import', { prospects: batch });
      totalImported += data.imported;
      if (data.errors) allErrors = allErrors.concat(data.errors);
    } catch(err) {
      allErrors.push('Erreur lot ' + (i/batchSize+1) + ': ' + (err.response?.data?.error||err.message));
    }
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${totalImported} importés...`;
  }

  document.getElementById('previewZone').classList.add('hidden');
  const r = document.getElementById('importResult');
  r.classList.remove('hidden');
  r.innerHTML = `
    <div class="rounded-xl p-6 ${allErrors.length===0?'bg-green-50 border border-green-100':'bg-amber-50 border border-amber-100'} scale-in">
      <div class="flex items-center mb-3">
        <i class="fas ${allErrors.length===0?'fa-check-circle text-green-500':'fa-exclamation-triangle text-amber-500'} text-xl mr-3"></i>
        <p class="font-bold text-sm ${allErrors.length===0?'text-green-700':'text-amber-700'}">${totalImported} prospects importés sur ${prospects.length}</p>
      </div>
      ${allErrors.length>0?`<div class="mt-2 text-[10px] text-red-500 max-h-24 overflow-y-auto">${allErrors.slice(0,10).join('<br>')}${allErrors.length>10?`<br>...et ${allErrors.length-10} autres erreurs`:''}</div>`:''}
      <button onclick="resetImport()" class="btn-secondary rounded-lg text-xs px-4 py-2 mt-4"><i class="fas fa-plus mr-1.5"></i>Nouvel import</button>
    </div>`;
}

function resetImport() {
  importData = {};
  columnMapping = {};
  renderImportCSV();
}

// Garder l'ancienne fonction pour compatibilité
async function importCSV() { confirmImport(); }

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
    FIN: '<span class="badge bg-gray-50 text-gray-900 border border-gray-200">Cloture</span>',
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
function getCurrentDateTime() { return new Date().toISOString().slice(0,16); }
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
window.showEditUserModal = showEditUserModal; window.deleteUser = deleteUser;
window.toggleUserActive = toggleUserActive; window.importCSV = importCSV;
window.handleFileDrop = handleFileDrop; window.handleFileSelect = handleFileSelect;
window.previewImport = previewImport; window.confirmImport = confirmImport;
window.resetImport = resetImport;
window.logout = logout; window.debounce = debounce; window.loadRDV = loadRDV;
window.showModalResultForm = showModalResultForm; window.submitModalResult = submitModalResult;
