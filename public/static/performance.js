// =============================================
// MAF Formation - Performance Teleoperateurs
// Ajouts non destructifs sur la SPA existante
// =============================================

(function () {
  const state = {
    scripts: [],
    formations: [],
    callStartedAt: null,
    formOpenedAt: null,
    originalRenderCallCard: null,
    originalSubmitResult: null,
    originalLoadDashboard: null,
  };

  function safeText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function badgeTemperature(temp) {
    const map = {
      CHAUD: 'bg-green-50 text-green-700 border-green-100',
      TIEDE: 'bg-amber-50 text-amber-700 border-amber-100',
      FROID: 'bg-blue-50 text-blue-700 border-blue-100',
      A_NOURRIR: 'bg-purple-50 text-purple-700 border-purple-100',
    };
    return `<span class="badge ${map[temp] || map.FROID} border">${safeText(temp || 'FROID')}</span>`;
  }

  async function loadPerformanceAssets() {
    try {
      const { data } = await API.get('/performance/scripts');
      state.scripts = data.scripts || [];
      state.formations = data.formations || [];
    } catch (e) {
      console.warn('Performance assets indisponibles', e);
    }
  }

  function renderScriptBox() {
    const accroche = state.scripts.find(s => s.type_script === 'ACCROCHE');
    const objections = state.scripts.filter(s => s.type_script === 'OBJECTION');
    const cloture = state.scripts.find(s => s.type_script === 'CLOTURE_RDV');

    return `
      <div class="glass-card rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 text-sm mb-3"><i class="fas fa-comments mr-2 text-maf-500"></i>Script d'appel</h3>
        ${accroche ? `<div class="p-3 rounded-lg bg-orange-50 border border-orange-100 mb-3 text-xs text-gray-800"><strong>Accroche :</strong><br>${safeText(accroche.contenu)}</div>` : ''}
        <div class="space-y-2">
          ${objections.map(o => `
            <details class="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs">
              <summary class="cursor-pointer font-bold text-gray-800">${safeText(o.titre)}</summary>
              <p class="mt-2 text-gray-700">${safeText(o.contenu)}</p>
            </details>
          `).join('')}
        </div>
        ${cloture ? `<div class="p-3 rounded-lg bg-green-50 border border-green-100 mt-3 text-xs text-gray-800"><strong>Cloture RDV :</strong><br>${safeText(cloture.contenu)}</div>` : ''}
      </div>`;
  }

  function renderFormationBox() {
    return `
      <div class="glass-card rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 text-sm mb-3"><i class="fas fa-graduation-cap mr-2 text-maf-500"></i>Formations a proposer</h3>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          ${state.formations.map(f => `
            <button type="button" onclick="window.selectPerformanceFormation('${safeText(f.titre)}')" class="w-full text-left p-3 rounded-lg border border-gray-100 bg-white hover:bg-orange-50 hover:border-orange-100 transition-all">
              <div class="flex justify-between gap-2">
                <span class="text-xs font-bold text-gray-900">${safeText(f.titre)}</span>
                ${f.duree_heures ? `<span class="text-[10px] font-mono text-maf-600">${f.duree_heures}h</span>` : ''}
              </div>
              <p class="text-[11px] text-gray-600 mt-1">${safeText(f.argumentaire_court)}</p>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  function renderProspectPerformanceBox(prospect, historique) {
    const last = (historique || [])[0];
    return `
      <div class="glass-card rounded-xl p-5">
        <h3 class="font-semibold text-gray-900 text-sm mb-3"><i class="fas fa-bullseye mr-2 text-maf-500"></i>Priorite commerciale</h3>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold text-gray-700">Score prospect</span>
          <span class="text-xl font-extrabold text-maf-600">${Number(prospect.score_potentiel || 0)}/100</span>
        </div>
        <div class="w-full h-2 rounded-full bg-gray-100 mb-3">
          <div class="h-2 rounded-full" style="width:${Math.min(100, Number(prospect.score_potentiel || 0))}%;background:linear-gradient(90deg,#e8642c,#10b981);"></div>
        </div>
        <div class="flex flex-wrap gap-2 mb-3">
          ${badgeTemperature(prospect.temperature)}
          ${prospect.priorite_manuelle ? `<span class="badge bg-red-50 text-red-700 border border-red-100">Priorite ${prospect.priorite_manuelle}</span>` : ''}
          ${prospect.meilleur_creneau ? `<span class="badge bg-gray-50 text-gray-700 border border-gray-100">Creneau ${safeText(prospect.meilleur_creneau)}h</span>` : ''}
        </div>
        ${prospect.besoin_formation ? `<p class="text-xs text-gray-800 mb-2"><strong>Besoin :</strong> ${safeText(prospect.besoin_formation)}</p>` : ''}
        ${prospect.dernier_resume ? `<p class="text-xs text-gray-700"><strong>Dernier resume :</strong> ${safeText(prospect.dernier_resume)}</p>` : last ? `<p class="text-xs text-gray-700"><strong>Dernier appel :</strong> ${safeText(last.statut_resultat)} - ${safeText(last.commentaire || '')}</p>` : '<p class="text-xs text-gray-600 italic">Premier passage sur ce prospect.</p>'}
      </div>`;
  }

  function injectCallEnhancements(prospect, historique) {
    const leftColumn = document.querySelector('#operatorContent .lg\\:col-span-2.space-y-4');
    const rightColumn = document.querySelector('#operatorContent .space-y-4:last-child');
    const badgeRow = document.querySelector('#operatorContent .flex.space-x-2');

    if (badgeRow && !document.getElementById('prospectPerformanceBadges')) {
      badgeRow.insertAdjacentHTML('beforeend', `<span id="prospectPerformanceBadges" class="flex gap-2">${badgeTemperature(prospect.temperature)}<span class="badge bg-orange-50 text-maf-600 border border-orange-100">Score ${Number(prospect.score_potentiel || 0)}</span></span>`);
    }

    if (leftColumn && !document.getElementById('prospectPerformanceBox')) {
      leftColumn.insertAdjacentHTML('afterbegin', `<div id="prospectPerformanceBox">${renderProspectPerformanceBox(prospect, historique)}</div>`);
    }

    if (rightColumn && !document.getElementById('scriptPerformanceBox')) {
      rightColumn.insertAdjacentHTML('beforeend', `<div id="scriptPerformanceBox">${renderScriptBox()}${renderFormationBox()}</div>`);
    }
  }

  window.selectPerformanceFormation = function (titre) {
    const rdvFormation = document.getElementById('rdvFormation');
    const arComment = document.getElementById('arComment');
    if (rdvFormation) rdvFormation.value = titre;
    if (arComment && !arComment.value.includes(titre)) arComment.value = `${arComment.value ? arComment.value + '\n' : ''}Interet formation : ${titre}`;
  };

  function addCommercialFields(type) {
    const formDiv = document.getElementById('resultForm');
    if (!formDiv || document.getElementById('performanceFields')) return;
    state.formOpenedAt = Date.now();

    const subMotifs = {
      NRP: ['REPONDEUR', 'SONNERIE_SANS_REPONSE', 'OCCUPE', 'NUMERO_INVALIDE'],
      AR: ['RAPPEL_AUJOURD_HUI', 'RAPPEL_DEMAIN', 'RAPPEL_SEMAINE_PROCHAINE', 'RAPPEL_PERSONNALISE'],
      RDV: ['BESOIN_IDENTIFIE', 'FINANCEMENT_A_VERIFIER', 'DIRIGEANT_INTERESSE', 'RDV_CONFIRMATION'],
      FIN: ['PAS_INTERESSE', 'HORS_CIBLE', 'DEJA_FORME', 'PAS_DE_BUDGET', 'MAUVAIS_NUMERO', 'DOUBLON', 'CESSATION_ACTIVITE'],
    }[type] || [];

    const objections = ['PAS_LE_TEMPS', 'ENVOYEZ_MAIL', 'PAS_BESOIN', 'BUDGET', 'DEJA_PRESTATAIRE', 'A_RAPPELER_PLUS_TARD'];

    formDiv.insertAdjacentHTML('beforeend', `
      <div id="performanceFields" class="glass-card rounded-xl p-5 mt-3 scale-in">
        <h4 class="font-bold text-sm mb-3 text-gray-900"><i class="fas fa-chart-line mr-2 text-maf-500"></i>Qualification performance</h4>
        <label class="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-700">Sous-motif</label>
        <select id="perfSousMotif" class="w-full p-3 rounded-lg text-xs mb-3">
          <option value="">Non precise</option>
          ${subMotifs.map(m => `<option value="${m}">${m.replaceAll('_', ' ')}</option>`).join('')}
        </select>
        <label class="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-700">Objection principale</label>
        <select id="perfObjection" class="w-full p-3 rounded-lg text-xs mb-3">
          <option value="">Aucune / non precisee</option>
          ${objections.map(o => `<option value="${o}">${o.replaceAll('_', ' ')}</option>`).join('')}
        </select>
        <label class="flex items-center gap-2 text-xs font-semibold text-gray-800 mb-3">
          <input id="perfContactArgumente" type="checkbox" class="w-4 h-4" ${type === 'AR' || type === 'RDV' ? 'checked' : ''}> Contact argumente
        </label>
        <label class="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-700">Prochaine action</label>
        <input id="perfProchaineAction" type="text" class="w-full glass-input p-3 rounded-lg text-xs" placeholder="Ex: envoyer programme IA, confirmer financement, rappeler dirigeant...">
      </div>`);
  }

  function patchShowResultForm() {
    if (typeof window.showResultForm !== 'function') return;
    const original = window.showResultForm;
    window.showResultForm = function (type, prospectId) {
      original(type, prospectId);
      addCommercialFields(type);
    };
  }

  function patchSubmitResult() {
    if (typeof window.submitResult !== 'function') return;
    state.originalSubmitResult = window.submitResult;
    window.submitResult = async function (type, prospectId) {
      const payload = { prospect_id: prospectId, statut_resultat: type };
      payload.date_appel = document.getElementById('callDate')?.value || null;
      payload.sous_motif = document.getElementById('perfSousMotif')?.value || null;
      payload.objection = document.getElementById('perfObjection')?.value || null;
      payload.prochaine_action = document.getElementById('perfProchaineAction')?.value || null;
      payload.contact_argumente = document.getElementById('perfContactArgumente')?.checked || false;
      payload.temps_saisie_secondes = state.formOpenedAt ? Math.round((Date.now() - state.formOpenedAt) / 1000) : null;
      payload.duree_secondes = state.callStartedAt ? Math.round((Date.now() - state.callStartedAt) / 1000) : null;

      switch (type) {
        case 'NRP': payload.commentaire = document.getElementById('nrpComment')?.value; break;
        case 'AR':
          payload.date_rappel = document.getElementById('arDate')?.value;
          payload.commentaire = document.getElementById('arComment')?.value;
          if (!payload.date_rappel) { alert('Date obligatoire'); return; }
          break;
        case 'RDV':
          payload.rdv_date = document.getElementById('rdvDate')?.value;
          payload.rdv_type = document.getElementById('rdvType')?.value;
          payload.rdv_lieu = document.getElementById('rdvLieu')?.value;
          payload.rdv_formation = document.getElementById('rdvFormation')?.value;
          payload.rdv_commentaires = document.getElementById('rdvComments')?.value;
          payload.commentaire = `RDV pris: ${payload.rdv_formation || 'Formation a preciser'}`;
          if (!payload.rdv_date) { alert('Date obligatoire'); return; }
          break;
        case 'FIN':
          payload.motif_fin = document.getElementById('finMotif')?.value;
          payload.commentaire = document.getElementById('finComment')?.value;
          break;
      }

      try {
        await API.post('/appels', payload);
        const content = document.getElementById('operatorContent');
        if (type === 'RDV' && typeof window.showConfetti === 'function') window.showConfetti();
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
        if (typeof window.loadMyStats === 'function') window.loadMyStats();
        loadOperatorCoachingCard();
      } catch (err) {
        alert(err.response?.data?.error || 'Erreur');
      }
    };
  }

  async function loadOperatorCoachingCard() {
    const target = document.getElementById('myStatsBar');
    if (!target || currentUser?.role !== 'operator') return;
    try {
      const { data } = await API.get('/performance/my-coaching');
      const c = data.coaching;
      let box = document.getElementById('operatorCoachingCard');
      if (!box) {
        document.getElementById('operatorContent')?.insertAdjacentHTML('afterbegin', '<div id="operatorCoachingCard" class="glass-card rounded-xl p-4 mb-5 text-xs"></div>');
        box = document.getElementById('operatorCoachingCard');
      }
      box.innerHTML = `<div class="flex items-start gap-3"><div class="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center"><i class="fas fa-user-tie text-maf-500"></i></div><div><strong class="text-gray-900">Coaching du jour</strong><p class="text-gray-700 mt-1"><b>Point fort :</b> ${safeText(c.point_fort)}<br><b>Axe :</b> ${safeText(c.axe_amelioration)}<br><b>Conseil :</b> ${safeText(c.conseil)}</p></div></div>`;
    } catch (e) {}
  }

  function patchRenderCallCard() {
    if (typeof window.renderCallCard !== 'function') return;
    state.originalRenderCallCard = window.renderCallCard;
    window.renderCallCard = function (prospect, historique, lockedUntil) {
      state.callStartedAt = Date.now();
      state.originalRenderCallCard(prospect, historique, lockedUntil);
      injectCallEnhancements(prospect, historique);
      loadOperatorCoachingCard();
    };
  }

  function patchDashboard() {
    if (typeof window.loadDashboard !== 'function') return;
    state.originalLoadDashboard = window.loadDashboard;
    window.loadDashboard = async function () {
      await state.originalLoadDashboard();
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'supervisor') return;
      try {
        const [alertsRes, creneauxRes, objectionsRes] = await Promise.all([
          API.get('/performance/alerts'),
          API.get('/performance/creneaux'),
          API.get('/performance/objections'),
        ]);
        const root = document.getElementById('dashboardContent');
        if (!root || document.getElementById('performanceDashboardBlocks')) return;
        const alerts = alertsRes.data.alerts || [];
        const creneaux = creneauxRes.data.creneaux || [];
        const objections = objectionsRes.data.objections || [];
        root.insertAdjacentHTML('afterbegin', `
          <div id="performanceDashboardBlocks" class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <div class="glass-card rounded-xl p-5">
              <h3 class="text-sm font-bold text-gray-900 mb-3"><i class="fas fa-bell mr-2 text-red-500"></i>Alertes superviseur</h3>
              ${alerts.length ? alerts.map(a => `<div class="p-3 rounded-lg bg-red-50 border border-red-100 mb-2 text-xs"><b>${safeText(a.titre)}</b><br>${safeText(a.detail)}</div>`).join('') : '<p class="text-xs text-gray-600 italic">Aucune alerte critique.</p>'}
            </div>
            <div class="glass-card rounded-xl p-5">
              <h3 class="text-sm font-bold text-gray-900 mb-3"><i class="fas fa-clock mr-2 text-maf-500"></i>Meilleurs creneaux</h3>
              ${creneaux.length ? creneaux.slice(0, 5).map(c => `<div class="flex justify-between text-xs border-b border-gray-100 py-2"><span>${safeText(c.heure)}h</span><span>${c.taux_reponse}% reponse</span><b>${c.taux_rdv}% RDV</b></div>`).join('') : '<p class="text-xs text-gray-600 italic">Pas encore assez de donnees.</p>'}
            </div>
            <div class="glass-card rounded-xl p-5">
              <h3 class="text-sm font-bold text-gray-900 mb-3"><i class="fas fa-comment-dots mr-2 text-amber-500"></i>Objections</h3>
              ${objections.length ? objections.slice(0, 5).map(o => `<div class="flex justify-between text-xs border-b border-gray-100 py-2"><span>${safeText(o.motif).replaceAll('_', ' ')}</span><span>${o.total}</span><b>${o.taux_transformation}%</b></div>`).join('') : '<p class="text-xs text-gray-600 italic">Aucune objection qualifiee.</p>'}
            </div>
          </div>`);
      } catch (e) {
        console.warn('Blocs performance dashboard indisponibles', e);
      }
    };
  }

  function init() {
    loadPerformanceAssets().finally(() => {
      patchRenderCallCard();
      patchShowResultForm();
      patchSubmitResult();
      patchDashboard();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
