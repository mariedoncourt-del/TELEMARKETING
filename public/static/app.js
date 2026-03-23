// =============================================
// MAF Formation - Telemarketing SPA
// Application JavaScript complète
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

// ---- Router simple basé sur le hash ----
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
// PAGE: LOGIN
// =============================================
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-maf-800 via-maf-700 to-maf-600">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md fade-in">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-maf-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-headset text-maf-600 text-3xl"></i>
          </div>
          <h1 class="text-2xl font-bold text-gray-800">MAF Formation</h1>
          <p class="text-gray-500 mt-1">Plateforme Télémarketing</p>
        </div>
        <form id="loginForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div class="relative">
              <i class="fas fa-envelope absolute left-3 top-3 text-gray-400"></i>
              <input type="email" id="loginEmail" placeholder="votre@email.fr" required
                class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maf-500 focus:border-transparent">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <div class="relative">
              <i class="fas fa-lock absolute left-3 top-3 text-gray-400"></i>
              <input type="password" id="loginPassword" placeholder="••••••" required
                class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maf-500 focus:border-transparent">
            </div>
          </div>
          <div id="loginError" class="hidden bg-red-50 text-red-700 p-3 rounded-lg text-sm"></div>
          <button type="submit" class="w-full btn-primary py-3 text-lg">
            <i class="fas fa-sign-in-alt mr-2"></i>Connexion
          </button>
        </form>
        <div class="mt-6 text-center text-xs text-gray-400">
          <p>Comptes de test : admin@maf-formation.fr</p>
          <p>Mot de passe : admin</p>
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

      // Redirection selon le rôle
      if (currentUser.role === 'admin') navigate('#admin');
      else if (currentUser.role === 'supervisor') navigate('#dashboard');
      else navigate('#operator');
    } catch (err) {
      errorDiv.textContent = err.response?.data?.error || 'Erreur de connexion';
      errorDiv.classList.remove('hidden');
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
// COMPOSANT: Navigation
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
    <nav class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 bg-maf-600 rounded-lg flex items-center justify-center">
              <i class="fas fa-headset text-white text-sm"></i>
            </div>
            <span class="font-bold text-gray-800">MAF Formation</span>
          </div>
          <div class="flex items-center space-x-1">
            ${links.map(l => `
              <a href="${l.hash}" class="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${l.active ? 'bg-maf-100 text-maf-700' : 'text-gray-600 hover:bg-gray-100'}">
                <i class="fas ${l.icon} mr-1.5"></i>${l.label}
              </a>
            `).join('')}
          </div>
          <div class="flex items-center space-x-3">
            <div class="text-right">
              <p class="text-sm font-medium text-gray-700">${currentUser?.prenom} ${currentUser?.nom}</p>
              <p class="text-xs text-gray-500">${getRoleLabel(currentUser?.role)}</p>
            </div>
            <button onclick="logout()" class="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Déconnexion">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  `;
}

function getRoleLabel(role) {
  return { admin: 'Administrateur', supervisor: 'Superviseur', operator: 'Téléopérateur' }[role] || role;
}

// =============================================
// PAGE: OPÉRATEUR - Fiche d'appel
// =============================================
function renderOperator() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('operator')}
    <div class="max-w-5xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-phone-alt text-maf-600 mr-2"></i>Poste d'appel
        </h1>
        <div id="myStatsBar" class="flex items-center space-x-4 text-sm"></div>
      </div>
      <div id="operatorContent">
        <div class="text-center py-20">
          <div class="w-24 h-24 bg-maf-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i class="fas fa-phone-volume text-maf-600 text-4xl"></i>
          </div>
          <h2 class="text-xl font-semibold text-gray-700 mb-2">Prêt à appeler</h2>
          <p class="text-gray-500 mb-6">Cliquez sur le bouton pour obtenir le prochain prospect</p>
          <button onclick="fetchNextProspect()" class="btn-primary text-lg px-8 py-3">
            <i class="fas fa-forward mr-2"></i>Prochain prospect
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
      <span class="bg-gray-100 px-3 py-1 rounded-full"><i class="fas fa-phone mr-1"></i>${s.total_appels || 0} appels</span>
      <span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full"><i class="fas fa-calendar-check mr-1"></i>${s.nb_rdv || 0} RDV</span>
      <span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full"><i class="fas fa-redo mr-1"></i>${s.nb_ar || 0} AR</span>
      <span class="bg-red-100 text-red-700 px-3 py-1 rounded-full"><i class="fas fa-phone-slash mr-1"></i>${s.nb_nrp || 0} NRP</span>
    `;
  } catch (e) { console.error(e); }
}

async function fetchNextProspect() {
  const content = document.getElementById('operatorContent');
  content.innerHTML = `
    <div class="text-center py-20">
      <i class="fas fa-spinner fa-spin text-maf-600 text-4xl mb-4"></i>
      <p class="text-gray-500">Recherche du prochain prospect...</p>
    </div>
  `;

  try {
    const { data } = await API.get('/prospects/next');
    if (!data.prospect) {
      content.innerHTML = `
        <div class="text-center py-20">
          <div class="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i class="fas fa-check-circle text-emerald-500 text-4xl"></i>
          </div>
          <h2 class="text-xl font-semibold text-gray-700 mb-2">File d'attente vide !</h2>
          <p class="text-gray-500 mb-6">${data.message || 'Tous les prospects sont traités.'}</p>
          <button onclick="fetchNextProspect()" class="btn-primary px-6 py-2">
            <i class="fas fa-sync mr-2"></i>Vérifier à nouveau
          </button>
        </div>
      `;
      return;
    }
    renderCallCard(data.prospect, data.historique || [], data.locked_until);
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || 'Erreur serveur';
    content.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-exclamation-triangle text-amber-500 text-4xl mb-4"></i>
        <p class="text-gray-700 font-medium mb-2">${msg}</p>
        <button onclick="fetchNextProspect()" class="btn-primary mt-4 px-6 py-2">
          <i class="fas fa-redo mr-2"></i>Réessayer
        </button>
      </div>
    `;
  }
}

function renderCallCard(prospect, historique, lockedUntil) {
  lockEndTime = new Date(lockedUntil);
  const content = document.getElementById('operatorContent');

  const statusBadge = {
    'NOUVEAU': '<span class="badge bg-blue-100 text-blue-700"><i class="fas fa-star mr-1"></i>Nouveau</span>',
    'AR': '<span class="badge bg-amber-100 text-amber-700"><i class="fas fa-redo mr-1"></i>À rappeler</span>',
  }[prospect.statut] || '';

  const nrpBadge = prospect.compteur_nrp > 0
    ? `<span class="badge bg-red-100 text-red-700"><i class="fas fa-phone-slash mr-1"></i>${prospect.compteur_nrp}/5 NRP</span>`
    : '';

  content.innerHTML = `
    <div class="fade-in">
      <!-- Timer de verrouillage -->
      <div class="bg-maf-50 border border-maf-200 rounded-lg p-3 mb-4 flex justify-between items-center">
        <div class="flex items-center text-maf-700">
          <i class="fas fa-lock mr-2"></i>
          <span class="text-sm font-medium">Prospect verrouillé pour vous</span>
        </div>
        <div id="lockTimer" class="text-sm font-mono font-bold text-maf-700"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Colonne gauche: Infos prospect -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Fiche entreprise -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h2 class="text-xl font-bold text-gray-800">${prospect.nom_entreprise}</h2>
                <p class="text-gray-500">${prospect.nom_dirigeant || 'Contact non renseigné'}</p>
              </div>
              <div class="flex space-x-2">${statusBadge} ${nrpBadge}</div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex items-center">
                <i class="fas fa-phone text-maf-500 w-5 mr-2"></i>
                <a href="tel:${prospect.telephone}" class="text-maf-600 font-semibold text-lg hover:underline">${prospect.telephone}</a>
              </div>
              <div class="flex items-center">
                <i class="fas fa-map-marker-alt text-gray-400 w-5 mr-2"></i>
                <span>${prospect.ville || 'Non renseigné'} ${prospect.code_postal || ''}</span>
              </div>
              ${prospect.email ? `<div class="flex items-center"><i class="fas fa-envelope text-gray-400 w-5 mr-2"></i><span>${prospect.email}</span></div>` : ''}
              ${prospect.code_ape ? `<div class="flex items-center"><i class="fas fa-industry text-gray-400 w-5 mr-2"></i><span>APE: ${prospect.code_ape}</span></div>` : ''}
              ${prospect.opco ? `<div class="flex items-center"><i class="fas fa-building text-gray-400 w-5 mr-2"></i><span>OPCO: ${prospect.opco}</span></div>` : ''}
              ${prospect.budget_identifie ? `<div class="flex items-center"><i class="fas fa-euro-sign text-gray-400 w-5 mr-2"></i><span>Budget: ${prospect.budget_identifie}€</span></div>` : ''}
            </div>
            ${prospect.notes ? `<div class="mt-4 p-3 bg-yellow-50 rounded-lg text-sm"><i class="fas fa-sticky-note text-yellow-500 mr-2"></i>${prospect.notes}</div>` : ''}
            ${prospect.date_rappel ? `<div class="mt-3 p-3 bg-amber-50 rounded-lg text-sm"><i class="fas fa-clock text-amber-500 mr-2"></i>Rappel prévu: ${formatDate(prospect.date_rappel)}</div>` : ''}
          </div>

          <!-- Historique des appels -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-700 mb-3"><i class="fas fa-history mr-2"></i>Historique (${historique.length})</h3>
            ${historique.length === 0
              ? '<p class="text-gray-400 text-sm">Premier appel pour ce prospect</p>'
              : `<div class="space-y-2 max-h-48 overflow-y-auto">${historique.map(h => `
                  <div class="flex items-start text-sm border-l-2 ${getResultBorderColor(h.statut_resultat)} pl-3 py-1">
                    <span class="font-medium w-10">${h.statut_resultat}</span>
                    <span class="text-gray-500 w-32">${formatDate(h.created_at)}</span>
                    <span class="text-gray-600 flex-1">${h.commentaire || '-'}</span>
                    <span class="text-gray-400 text-xs">${h.operateur_prenom} ${h.operateur_nom}</span>
                  </div>
                `).join('')}</div>`
            }
          </div>
        </div>

        <!-- Colonne droite: Actions -->
        <div class="space-y-4">
          <!-- Résultat de l'appel -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="font-semibold text-gray-700 mb-4"><i class="fas fa-clipboard-check mr-2"></i>Résultat de l'appel</h3>
            <div class="space-y-3">
              <button onclick="showResultForm('NRP', ${prospect.id})" class="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all">
                <span class="flex items-center"><i class="fas fa-phone-slash text-red-500 mr-3"></i><span class="font-medium">NRP</span></span>
                <span class="text-xs text-gray-400">Ne répond pas</span>
              </button>
              <button onclick="showResultForm('AR', ${prospect.id})" class="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all">
                <span class="flex items-center"><i class="fas fa-redo text-amber-500 mr-3"></i><span class="font-medium">AR</span></span>
                <span class="text-xs text-gray-400">À rappeler</span>
              </button>
              <button onclick="showResultForm('RDV', ${prospect.id})" class="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                <span class="flex items-center"><i class="fas fa-calendar-check text-emerald-500 mr-3"></i><span class="font-medium">RDV</span></span>
                <span class="text-xs text-gray-400">Rendez-vous pris !</span>
              </button>
              <button onclick="showResultForm('FIN', ${prospect.id})" class="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all">
                <span class="flex items-center"><i class="fas fa-ban text-gray-500 mr-3"></i><span class="font-medium">FIN</span></span>
                <span class="text-xs text-gray-400">Clôturer</span>
              </button>
            </div>
          </div>

          <!-- Formulaire dynamique -->
          <div id="resultForm" class="hidden"></div>

          <!-- Passer -->
          <button onclick="releaseProspect(${prospect.id})" class="w-full btn-secondary py-2 text-sm">
            <i class="fas fa-forward mr-2"></i>Passer ce prospect
          </button>
        </div>
      </div>
    </div>
  `;

  // Démarrer le timer
  startLockTimer();
}

function startLockTimer() {
  const timerEl = document.getElementById('lockTimer');
  if (!timerEl) return;

  lockTimer = setInterval(() => {
    const now = new Date();
    const diff = lockEndTime - now;
    if (diff <= 0) {
      timerEl.innerHTML = '<span class="text-red-600 timer-urgent">⚠️ Verrou expiré</span>';
      clearInterval(lockTimer);
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
    if (diff < 120000) timerEl.classList.add('text-red-600');
  }, 1000);
}

function showResultForm(type, prospectId) {
  const formDiv = document.getElementById('resultForm');
  formDiv.classList.remove('hidden');

  const forms = {
    NRP: `
      <div class="bg-red-50 rounded-xl border border-red-200 p-6 fade-in">
        <h4 class="font-semibold text-red-700 mb-3"><i class="fas fa-phone-slash mr-2"></i>NRP - Ne répond pas</h4>
        <textarea id="nrpComment" placeholder="Commentaire (optionnel)..." rows="2"
          class="w-full border rounded-lg p-2 text-sm mb-3"></textarea>
        <button onclick="submitResult('NRP', ${prospectId})" class="w-full btn-danger py-2">
          <i class="fas fa-check mr-2"></i>Confirmer NRP
        </button>
      </div>
    `,
    AR: `
      <div class="bg-amber-50 rounded-xl border border-amber-200 p-6 fade-in">
        <h4 class="font-semibold text-amber-700 mb-3"><i class="fas fa-redo mr-2"></i>AR - À rappeler</h4>
        <label class="block text-sm font-medium text-gray-700 mb-1">Date et heure de rappel *</label>
        <input type="datetime-local" id="arDate" required
          class="w-full border rounded-lg p-2 text-sm mb-3" value="${getDefaultRappelDate()}">
        <textarea id="arComment" placeholder="Raison du rappel..." rows="2"
          class="w-full border rounded-lg p-2 text-sm mb-3"></textarea>
        <button onclick="submitResult('AR', ${prospectId})" class="w-full btn-warning py-2">
          <i class="fas fa-check mr-2"></i>Confirmer AR
        </button>
      </div>
    `,
    RDV: `
      <div class="bg-emerald-50 rounded-xl border border-emerald-200 p-6 fade-in">
        <h4 class="font-semibold text-emerald-700 mb-3"><i class="fas fa-calendar-check mr-2"></i>RDV - Rendez-vous</h4>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date et heure du RDV *</label>
            <input type="datetime-local" id="rdvDate" required class="w-full border rounded-lg p-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Type de RDV</label>
            <select id="rdvType" class="w-full border rounded-lg p-2 text-sm">
              <option value="presentiel">Présentiel</option>
              <option value="distance">À distance</option>
              <option value="telephone">Téléphone</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
            <input type="text" id="rdvLieu" placeholder="Adresse ou lien visio..." class="w-full border rounded-lg p-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Formation souhaitée</label>
            <textarea id="rdvFormation" placeholder="Décrivez la formation souhaitée..." rows="2"
              class="w-full border rounded-lg p-2 text-sm"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
            <textarea id="rdvComments" placeholder="Notes supplémentaires..." rows="2"
              class="w-full border rounded-lg p-2 text-sm"></textarea>
          </div>
        </div>
        <button onclick="submitResult('RDV', ${prospectId})" class="w-full btn-success py-2 mt-4">
          <i class="fas fa-check mr-2"></i>Confirmer RDV 🎉
        </button>
      </div>
    `,
    FIN: `
      <div class="bg-gray-50 rounded-xl border border-gray-200 p-6 fade-in">
        <h4 class="font-semibold text-gray-700 mb-3"><i class="fas fa-ban mr-2"></i>Clôturer le prospect</h4>
        <label class="block text-sm font-medium text-gray-700 mb-1">Motif *</label>
        <select id="finMotif" class="w-full border rounded-lg p-2 text-sm mb-3">
          <option value="PAS_INTERESSE">Pas intéressé</option>
          <option value="HORS_CIBLE">Hors cible</option>
          <option value="FAUX_NUMERO">Faux numéro</option>
          <option value="DOUBLON">Doublon</option>
          <option value="AUTRE">Autre</option>
        </select>
        <textarea id="finComment" placeholder="Commentaire..." rows="2"
          class="w-full border rounded-lg p-2 text-sm mb-3"></textarea>
        <button onclick="submitResult('FIN', ${prospectId})" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg">
          <i class="fas fa-check mr-2"></i>Confirmer clôture
        </button>
      </div>
    `
  };

  formDiv.innerHTML = forms[type];
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
      payload.commentaire = `RDV pris: ${payload.rdv_formation || 'Formation à préciser'}`;
      if (!payload.rdv_date) { alert('Date de RDV obligatoire'); return; }
      break;
    case 'FIN':
      payload.motif_fin = document.getElementById('finMotif')?.value;
      payload.commentaire = document.getElementById('finComment')?.value;
      break;
  }

  try {
    await API.post('/appels', payload);
    // Succès - afficher message et passer au suivant
    const content = document.getElementById('operatorContent');
    const successMsg = {
      NRP: '📵 NRP enregistré',
      AR: '🔄 Rappel programmé',
      RDV: '🎉 RDV enregistré avec succès !',
      FIN: '🏁 Prospect clôturé'
    }[type];
    const successColor = {
      NRP: 'red', AR: 'amber', RDV: 'emerald', FIN: 'gray'
    }[type];

    content.innerHTML = `
      <div class="text-center py-12 fade-in">
        <div class="w-20 h-20 bg-${successColor}-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-check text-${successColor}-500 text-3xl"></i>
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">${successMsg}</h2>
        <button onclick="fetchNextProspect()" class="btn-primary mt-6 px-8 py-3 text-lg">
          <i class="fas fa-forward mr-2"></i>Prochain prospect
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
    alert('Erreur lors de la libération du prospect');
  }
}

// =============================================
// PAGE: DASHBOARD SUPERVISEUR
// =============================================
function renderDashboard() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('dashboard')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-chart-bar text-maf-600 mr-2"></i>Dashboard Superviseur
        </h1>
        <div class="flex items-center space-x-2">
          <span id="lastRefresh" class="text-xs text-gray-400"></span>
          <button onclick="loadDashboard()" class="btn-secondary text-sm py-1 px-3">
            <i class="fas fa-sync mr-1"></i>Actualiser
          </button>
        </div>
      </div>
      <div id="dashboardContent">
        <div class="text-center py-12"><i class="fas fa-spinner fa-spin text-maf-600 text-3xl"></i></div>
      </div>
    </div>
  `;
  loadDashboard();
  refreshInterval = setInterval(loadDashboard, 30000); // Refresh toutes les 30s
}

async function loadDashboard() {
  try {
    const { data } = await API.get('/dashboard/stats');
    const g = data.global;
    const ops = data.operators || [];

    document.getElementById('lastRefresh').textContent = `Mis à jour: ${new Date().toLocaleTimeString('fr-FR')}`;

    document.getElementById('dashboardContent').innerHTML = `
      <!-- Stats globales -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div class="stat-card bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-3xl font-bold text-blue-600">${g.nouveaux || 0}</div>
          <div class="text-xs text-gray-500 mt-1"><i class="fas fa-star mr-1"></i>Nouveaux</div>
        </div>
        <div class="stat-card bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-3xl font-bold text-amber-600">${g.a_rappeler || 0}</div>
          <div class="text-xs text-gray-500 mt-1"><i class="fas fa-redo mr-1"></i>À rappeler</div>
        </div>
        <div class="stat-card bg-white rounded-xl shadow-sm border p-4 text-center ${(g.ar_en_retard || 0) > 0 ? 'ring-2 ring-red-400' : ''}">
          <div class="text-3xl font-bold text-red-600 ${(g.ar_en_retard || 0) > 0 ? 'timer-urgent' : ''}">${g.ar_en_retard || 0}</div>
          <div class="text-xs text-gray-500 mt-1"><i class="fas fa-exclamation-triangle mr-1"></i>AR en retard</div>
        </div>
        <div class="stat-card bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-3xl font-bold text-emerald-600">${g.rdv_pris || 0}</div>
          <div class="text-xs text-gray-500 mt-1"><i class="fas fa-calendar-check mr-1"></i>RDV pris</div>
        </div>
        <div class="stat-card bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-3xl font-bold text-maf-600">${g.en_cours || 0}</div>
          <div class="text-xs text-gray-500 mt-1"><i class="fas fa-lock mr-1"></i>En cours</div>
        </div>
        <div class="stat-card bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-3xl font-bold text-gray-600">${g.clotures || 0}</div>
          <div class="text-xs text-gray-500 mt-1"><i class="fas fa-ban mr-1"></i>Clôturés</div>
        </div>
      </div>

      <!-- Jauge de progression -->
      <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h3 class="font-semibold text-gray-700 mb-3">Progression globale</h3>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div class="h-4 rounded-full bg-gradient-to-r from-maf-500 to-emerald-500" 
            style="width: ${g.total > 0 ? Math.round(((g.rdv_pris || 0) + (g.clotures || 0)) / g.total * 100) : 0}%"></div>
        </div>
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>${g.total || 0} prospects total</span>
          <span>${g.total > 0 ? Math.round(((g.rdv_pris || 0) + (g.clotures || 0)) / g.total * 100) : 0}% traités</span>
        </div>
      </div>

      <!-- Performance par opérateur -->
      <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h3 class="font-semibold text-gray-700 mb-4"><i class="fas fa-users mr-2"></i>Performance du jour par opérateur</h3>
        ${ops.length === 0 ? '<p class="text-gray-400 text-sm">Aucun opérateur actif</p>' : `
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-gray-500">
                  <th class="pb-2">Opérateur</th>
                  <th class="pb-2 text-center">Appels</th>
                  <th class="pb-2 text-center">RDV</th>
                  <th class="pb-2 text-center">AR</th>
                  <th class="pb-2 text-center">NRP</th>
                  <th class="pb-2 text-center">FIN</th>
                  <th class="pb-2 text-center">Tx conv.</th>
                  <th class="pb-2 text-center">En cours</th>
                </tr>
              </thead>
              <tbody>
                ${ops.map(op => {
                  const taux = op.total_appels > 0 ? ((op.nb_rdv / op.total_appels) * 100).toFixed(1) : '0.0';
                  return `
                    <tr class="border-b hover:bg-gray-50">
                      <td class="py-3 font-medium">${op.prenom} ${op.nom}</td>
                      <td class="py-3 text-center font-bold">${op.total_appels || 0}</td>
                      <td class="py-3 text-center"><span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">${op.nb_rdv || 0}</span></td>
                      <td class="py-3 text-center text-amber-600">${op.nb_ar || 0}</td>
                      <td class="py-3 text-center text-red-600">${op.nb_nrp || 0}</td>
                      <td class="py-3 text-center text-gray-600">${op.nb_fin || 0}</td>
                      <td class="py-3 text-center font-medium ${parseFloat(taux) >= 10 ? 'text-emerald-600' : 'text-gray-600'}">${taux}%</td>
                      <td class="py-3 text-center">${op.prospect_en_cours ? '<span class="pulse-dot text-maf-600">●</span>' : '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- RDV à venir -->
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <h3 class="font-semibold text-gray-700 mb-4"><i class="fas fa-calendar mr-2"></i>RDV à venir (7 jours)</h3>
        ${(data.upcomingRdv || []).length === 0 ? '<p class="text-gray-400 text-sm">Aucun RDV planifié</p>' : `
          <div class="space-y-2">
            ${data.upcomingRdv.map(r => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span class="font-medium">${r.nom_entreprise}</span>
                  <span class="text-gray-500 text-sm ml-2">${r.ville || ''}</span>
                </div>
                <div class="flex items-center space-x-3 text-sm">
                  <span class="badge ${r.type_rdv === 'presentiel' ? 'bg-blue-100 text-blue-700' : r.type_rdv === 'distance' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">
                    ${r.type_rdv}
                  </span>
                  <span class="font-medium text-maf-700">${formatDate(r.date_rdv)}</span>
                  <span class="text-gray-400">${r.pris_par_prenom} ${r.pris_par_nom}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  } catch (err) {
    document.getElementById('dashboardContent').innerHTML = `
      <div class="text-center py-12 text-red-500">
        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
        <p>Erreur de chargement: ${err.response?.data?.error || err.message}</p>
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
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-users text-maf-600 mr-2"></i>Gestion des Prospects
        </h1>
        <button onclick="showAddProspectModal()" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>Ajouter
        </button>
      </div>
      <!-- Filtres -->
      <div class="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-600">Statut:</label>
          <select id="filterStatut" onchange="loadProspects()" class="border rounded-lg px-3 py-1.5 text-sm">
            <option value="">Tous</option>
            <option value="NOUVEAU">Nouveau</option>
            <option value="AR">À rappeler</option>
            <option value="RDV">RDV</option>
            <option value="FIN">Clôturé</option>
          </select>
        </div>
        <div class="flex-1">
          <input type="text" id="filterSearch" placeholder="Rechercher entreprise, contact, ville..." 
            onkeyup="debounce(loadProspects, 300)()" class="w-full border rounded-lg px-3 py-1.5 text-sm">
        </div>
      </div>
      <div id="prospectsTable">
        <div class="text-center py-8"><i class="fas fa-spinner fa-spin text-maf-600 text-2xl"></i></div>
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
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 text-xs uppercase">
              <th class="px-4 py-3 text-center w-12">N°</th>
              <th class="px-4 py-3">Entreprise</th>
              <th class="px-4 py-3">Contact</th>
              <th class="px-4 py-3">Téléphone</th>
              <th class="px-4 py-3">Ville</th>
              <th class="px-4 py-3">OPCO</th>
              <th class="px-4 py-3">Statut</th>
              <th class="px-4 py-3">NRP</th>
              <th class="px-4 py-3">Verrouillé</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((p, idx) => `
              <tr class="border-t hover:bg-gray-50 cursor-pointer" onclick="showProspectDetail(${p.id})">
                <td class="px-4 py-3 text-center text-gray-400 font-mono text-xs">${(page - 1) * limit + idx + 1}</td>
                <td class="px-4 py-3 font-medium">${p.nom_entreprise}</td>
                <td class="px-4 py-3 text-gray-600">${p.nom_dirigeant || '-'}</td>
                <td class="px-4 py-3">${p.telephone}</td>
                <td class="px-4 py-3 text-gray-600">${p.ville || '-'}</td>
                <td class="px-4 py-3"><span class="badge bg-gray-100 text-gray-700">${p.opco || '-'}</span></td>
                <td class="px-4 py-3">${getStatusBadge(p.statut)}</td>
                <td class="px-4 py-3 text-center">${p.compteur_nrp > 0 ? `<span class="text-red-600 font-bold">${p.compteur_nrp}</span>` : '-'}</td>
                <td class="px-4 py-3">${p.locked_by ? `<span class="text-maf-600"><i class="fas fa-lock"></i> ${p.locked_by_prenom || ''}</span>` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="px-4 py-3 bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
          <span><strong>${data.pagination?.total || 0}</strong> prospects trouvés — affichés ${(page - 1) * limit + 1} à ${Math.min(page * limit, data.pagination?.total || 0)}</span>
          <div class="flex items-center space-x-2">
            ${page > 1 ? `<button onclick="changePage(${page - 1})" class="px-3 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-medium"><i class="fas fa-chevron-left mr-1"></i>Précédent</button>` : ''}
            <span class="text-xs font-medium">Page <input type="number" id="filterPage" value="${page}" min="1" max="${data.pagination?.pages || 1}" onchange="loadProspects()" class="w-12 text-center border rounded px-1 py-0.5 mx-1"> / ${data.pagination?.pages || 1}</span>
            ${page < (data.pagination?.pages || 1) ? `<button onclick="changePage(${page + 1})" class="px-3 py-1 bg-white border rounded hover:bg-gray-100 text-xs font-medium">Suivant<i class="fas fa-chevron-right ml-1"></i></button>` : ''}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('prospectsTable').innerHTML = `<p class="text-red-500">Erreur: ${err.message}</p>`;
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
        <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h2 class="text-xl font-bold text-gray-800">${p.nom_entreprise}</h2>
                <p class="text-gray-500">${p.nom_dirigeant || ''} - ${p.ville || ''}</p>
              </div>
              <button onclick="document.getElementById('modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm mb-6">
              <div><strong>Téléphone:</strong> ${p.telephone}</div>
              <div><strong>Email:</strong> ${p.email || '-'}</div>
              <div><strong>Code APE:</strong> ${p.code_ape || '-'}</div>
              <div><strong>OPCO:</strong> ${p.opco || '-'}</div>
              <div><strong>Statut:</strong> ${getStatusBadge(p.statut)}</div>
              <div><strong>Budget:</strong> ${p.budget_identifie ? p.budget_identifie + '€' : '-'}</div>
            </div>
            ${p.notes ? `<div class="bg-yellow-50 p-3 rounded-lg text-sm mb-4">${p.notes}</div>` : ''}
            
            <h3 class="font-semibold text-gray-700 mb-2">Historique des appels (${appels.length})</h3>
            <div class="space-y-1 mb-4 max-h-40 overflow-y-auto">
              ${appels.map(a => `
                <div class="text-sm border-l-2 ${getResultBorderColor(a.statut_resultat)} pl-3 py-1">
                  <span class="font-medium">${a.statut_resultat}</span> - 
                  <span class="text-gray-500">${formatDate(a.created_at)}</span> - 
                  <span class="text-gray-600">${a.commentaire || '-'}</span>
                  <span class="text-gray-400 text-xs">(${a.operateur_prenom} ${a.operateur_nom})</span>
                </div>
              `).join('') || '<p class="text-gray-400 text-sm">Aucun appel</p>'}
            </div>

            ${rdvs.length > 0 ? `
              <h3 class="font-semibold text-gray-700 mb-2">RDV (${rdvs.length})</h3>
              <div class="space-y-2 mb-4">
                ${rdvs.map(r => `
                  <div class="bg-emerald-50 p-3 rounded-lg text-sm">
                    <strong>${formatDate(r.date_rdv)}</strong> - ${r.type_rdv} - ${r.lieu || 'Non précisé'}
                    <br>${r.formation_souhaitee || ''} 
                    <span class="badge ${r.statut === 'PLANIFIE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}">${r.statut}</span>
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
      <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full" onclick="event.stopPropagation()">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800"><i class="fas fa-plus-circle text-maf-600 mr-2"></i>Ajouter un prospect</h2>
            <button onclick="document.getElementById('modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
          </div>
          <form id="addProspectForm" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Entreprise *</label>
                <input type="text" id="pNom" required class="w-full border rounded-lg p-2 text-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <input type="text" id="pContact" class="w-full border rounded-lg p-2 text-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input type="tel" id="pTel" required class="w-full border rounded-lg p-2 text-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" id="pEmail" class="w-full border rounded-lg p-2 text-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input type="text" id="pVille" class="w-full border rounded-lg p-2 text-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Code Postal</label>
                <input type="text" id="pCP" class="w-full border rounded-lg p-2 text-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Code APE</label>
                <input type="text" id="pAPE" class="w-full border rounded-lg p-2 text-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">OPCO</label>
                <select id="pOPCO" class="w-full border rounded-lg p-2 text-sm">
                  <option value="">Non déterminé</option>
                  <option value="AGEFICE">AGEFICE</option>
                  <option value="FAFCEA">FAFCEA</option>
                  <option value="AKTO">AKTO</option>
                  <option value="ATLAS">ATLAS</option>
                  <option value="OPCO_EP">OPCO EP</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea id="pNotes" rows="2" class="w-full border rounded-lg p-2 text-sm"></textarea>
            </div>
            <button type="submit" class="w-full btn-primary py-2">
              <i class="fas fa-plus mr-2"></i>Ajouter le prospect
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
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  });
}

// =============================================
// PAGE: LISTE DES RDV
// =============================================
function renderRDVList() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('rdv')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-calendar-check text-maf-600 mr-2"></i>Rendez-vous
      </h1>
      <div id="rdvContent">
        <div class="text-center py-8"><i class="fas fa-spinner fa-spin text-maf-600 text-2xl"></i></div>
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
      ? '<div class="text-center py-12 text-gray-400"><i class="fas fa-calendar text-4xl mb-3"></i><p>Aucun RDV enregistré</p></div>'
      : `
        <div class="grid gap-4">
          ${list.map(r => `
            <div class="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold text-gray-800">${r.nom_entreprise}</h3>
                  <p class="text-gray-500 text-sm">${r.nom_dirigeant || ''} - ${r.ville || ''}</p>
                  <p class="text-sm mt-1"><i class="fas fa-phone text-gray-400 mr-1"></i>${r.telephone}</p>
                  ${r.formation_souhaitee ? `<p class="text-sm mt-1"><i class="fas fa-graduation-cap text-maf-500 mr-1"></i>${r.formation_souhaitee}</p>` : ''}
                  ${r.commentaires ? `<p class="text-sm text-gray-500 mt-1">${r.commentaires}</p>` : ''}
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold text-maf-700">${formatDate(r.date_rdv)}</div>
                  <span class="badge ${r.type_rdv === 'presentiel' ? 'bg-blue-100 text-blue-700' : r.type_rdv === 'distance' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">
                    <i class="fas ${r.type_rdv === 'presentiel' ? 'fa-building' : r.type_rdv === 'distance' ? 'fa-video' : 'fa-phone'} mr-1"></i>${r.type_rdv}
                  </span>
                  ${r.lieu ? `<p class="text-xs text-gray-500 mt-1">${r.lieu}</p>` : ''}
                  <div class="mt-2">
                    <span class="badge ${getStatutRDVColor(r.statut)}">${r.statut}</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-1">Par ${r.pris_par_prenom} ${r.pris_par_nom}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
  } catch (err) {
    document.getElementById('rdvContent').innerHTML = `<p class="text-red-500">Erreur: ${err.message}</p>`;
  }
}

// =============================================
// PAGE: ADMINISTRATION
// =============================================
function renderAdmin() {
  document.getElementById('app').innerHTML = `
    ${getNavbar('admin')}
    <div class="max-w-7xl mx-auto p-6 fade-in">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-cog text-maf-600 mr-2"></i>Administration
      </h1>
      
      <!-- Tabs -->
      <div class="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button onclick="switchAdminTab('users')" id="tabUsers" class="px-4 py-2 rounded-md text-sm font-medium bg-white shadow-sm text-maf-700">
          <i class="fas fa-users mr-1"></i>Utilisateurs
        </button>
        <button onclick="switchAdminTab('import')" id="tabImport" class="px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-200">
          <i class="fas fa-file-import mr-1"></i>Import CSV
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
    el.className = 'px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-200';
  });
  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).className = 
    'px-4 py-2 rounded-md text-sm font-medium bg-white shadow-sm text-maf-700';

  if (tab === 'users') loadUsers();
  else if (tab === 'import') renderImportCSV();
}

async function loadUsers() {
  try {
    const { data } = await API.get('/users');
    document.getElementById('adminContent').innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="px-6 py-4 border-b flex justify-between items-center">
          <h3 class="font-semibold text-gray-700">Utilisateurs (${data.users.length})</h3>
          <button onclick="showAddUserModal()" class="btn-primary text-sm py-1.5">
            <i class="fas fa-user-plus mr-1"></i>Ajouter
          </button>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-gray-500 text-xs uppercase">
              <th class="px-6 py-3">Nom</th>
              <th class="px-6 py-3">Email</th>
              <th class="px-6 py-3">Rôle</th>
              <th class="px-6 py-3">Statut</th>
              <th class="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.users.map(u => `
              <tr class="border-t hover:bg-gray-50">
                <td class="px-6 py-3 font-medium">${u.prenom} ${u.nom}</td>
                <td class="px-6 py-3 text-gray-600">${u.email}</td>
                <td class="px-6 py-3"><span class="badge ${getRoleBadgeColor(u.role)}">${getRoleLabel(u.role)}</span></td>
                <td class="px-6 py-3">${u.actif ? '<span class="text-emerald-600">● Actif</span>' : '<span class="text-red-600">● Inactif</span>'}</td>
                <td class="px-6 py-3">
                  ${u.id !== currentUser.id ? `
                    <button onclick="toggleUserActive(${u.id}, ${u.actif})" class="text-sm ${u.actif ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'}">
                      <i class="fas ${u.actif ? 'fa-user-slash' : 'fa-user-check'} mr-1"></i>${u.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  ` : '<span class="text-gray-400 text-xs">Vous</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    document.getElementById('adminContent').innerHTML = `<p class="text-red-500">Erreur: ${err.message}</p>`;
  }
}

function showAddUserModal() {
  document.getElementById('modal').innerHTML = `
    <div class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full" onclick="event.stopPropagation()">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-user-plus text-maf-600 mr-2"></i>Nouvel utilisateur</h2>
          <form id="addUserForm" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm font-medium mb-1">Prénom *</label><input type="text" id="uPrenom" required class="w-full border rounded-lg p-2 text-sm"></div>
              <div><label class="block text-sm font-medium mb-1">Nom *</label><input type="text" id="uNom" required class="w-full border rounded-lg p-2 text-sm"></div>
            </div>
            <div><label class="block text-sm font-medium mb-1">Email *</label><input type="email" id="uEmail" required class="w-full border rounded-lg p-2 text-sm"></div>
            <div><label class="block text-sm font-medium mb-1">Mot de passe *</label><input type="password" id="uPassword" required minlength="6" class="w-full border rounded-lg p-2 text-sm"></div>
            <div><label class="block text-sm font-medium mb-1">Rôle</label>
              <select id="uRole" class="w-full border rounded-lg p-2 text-sm">
                <option value="operator">Téléopérateur</option>
                <option value="supervisor">Superviseur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <button type="submit" class="w-full btn-primary py-2"><i class="fas fa-plus mr-2"></i>Créer l'utilisateur</button>
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
  if (!confirm(currentActive ? 'Désactiver cet utilisateur ?' : 'Réactiver cet utilisateur ?')) return;
  try {
    if (currentActive) {
      await API.delete(`/users/${userId}`);
    } else {
      await API.put(`/users/${userId}`, { actif: true });
    }
    loadUsers();
  } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
}

function renderImportCSV() {
  document.getElementById('adminContent').innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border p-6">
      <h3 class="font-semibold text-gray-700 mb-4"><i class="fas fa-file-import text-maf-600 mr-2"></i>Import de prospects (CSV)</h3>
      <div class="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
        <p class="font-medium mb-2">Format attendu (séparateur: point-virgule) :</p>
        <code class="text-xs bg-gray-200 p-2 rounded block">nom_entreprise;nom_dirigeant;telephone;email;ville;code_postal;code_ape;opco;notes</code>
        <p class="text-gray-500 mt-2">Les champs nom_entreprise et telephone sont obligatoires.</p>
      </div>
      <textarea id="csvData" rows="10" placeholder="Collez vos données CSV ici...&#10;Boulangerie Test;Jean Dupont;05 63 00 00 00;test@test.fr;Castres;81100;1071C;AGEFICE;Notes"
        class="w-full border rounded-lg p-3 text-sm font-mono mb-4"></textarea>
      <button onclick="importCSV()" class="btn-primary"><i class="fas fa-upload mr-2"></i>Importer</button>
      <div id="importResult" class="mt-4 hidden"></div>
    </div>
  `;
}

async function importCSV() {
  const raw = document.getElementById('csvData').value.trim();
  if (!raw) { alert('Collez des données CSV'); return; }

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
      <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p class="font-medium text-emerald-700"><i class="fas fa-check-circle mr-2"></i>${data.imported} prospects importés sur ${data.total}</p>
        ${data.errors?.length ? `<div class="mt-2 text-sm text-red-600">${data.errors.join('<br>')}</div>` : ''}
      </div>
    `;
  } catch (err) {
    alert(err.response?.data?.error || 'Erreur d\'import');
  }
}

function changePage(newPage) {
  const pageInput = document.getElementById('filterPage');
  if (pageInput) {
    pageInput.value = newPage;
  }
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
    NOUVEAU: '<span class="badge bg-blue-100 text-blue-700">Nouveau</span>',
    AR: '<span class="badge bg-amber-100 text-amber-700">À rappeler</span>',
    RDV: '<span class="badge bg-emerald-100 text-emerald-700">RDV</span>',
    FIN: '<span class="badge bg-gray-100 text-gray-700">Clôturé</span>',
  };
  return map[statut] || statut;
}

function getResultBorderColor(statut) {
  return { NRP: 'border-red-400', AR: 'border-amber-400', RDV: 'border-emerald-400', FIN: 'border-gray-400' }[statut] || 'border-gray-200';
}

function getStatutRDVColor(statut) {
  return {
    PLANIFIE: 'bg-blue-100 text-blue-700',
    CONFIRME: 'bg-emerald-100 text-emerald-700',
    REALISE: 'bg-green-100 text-green-700',
    ANNULE: 'bg-red-100 text-red-700',
    REPORTE: 'bg-amber-100 text-amber-700',
  }[statut] || 'bg-gray-100 text-gray-700';
}

function getRoleBadgeColor(role) {
  return { admin: 'bg-red-100 text-red-700', supervisor: 'bg-purple-100 text-purple-700', operator: 'bg-blue-100 text-blue-700' }[role] || 'bg-gray-100';
}

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
