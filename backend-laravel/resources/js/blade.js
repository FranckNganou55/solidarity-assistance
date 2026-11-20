import '../css/solidarity.css';
import '../css/design-system.css';
import '../css/pages/login.css';
import '../css/public.css';

const $ = (s, root = document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path = location.pathname.replace(/^\//, '') || 'landing';
const store = { token: localStorage.getItem('ms.token') || '', group: localStorage.getItem('ms.group') || '', lang: localStorage.getItem('ms.lang') || 'fr', theme: localStorage.getItem('ms.theme') || 'light', member: null, groups: [] };
let pendingInstallPrompt = null;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pendingInstallPrompt = event; });
window.addEventListener('appinstalled', () => { pendingInstallPrompt = null; const button = $('[data-action="install-app"]'); if (button) button.hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js', {scope:'/'}).catch(() => {}));
document.documentElement.dataset.theme = store.theme === 'dark' ? 'dark' : '';
document.documentElement.lang = store.lang;

async function api(url, options = {}) {
  const headers = {'Accept':'application/json', ...(options.body instanceof FormData ? {} : {'Content-Type':'application/json'}), ...(options.headers || {})};
  if (store.token) headers.Authorization = `Bearer ${store.token}`;
  if (store.group) headers['X-Group-Id'] = store.group;
  const response = await fetch(`/api${url}`, {...options, headers, body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined});
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.errors && Object.values(data.errors).flat().join(' ') || `Erreur ${response.status}`);
  return data;
}
function toast(message, error = false) { const el = document.createElement('div'); el.className = `toast ${error ? 'error' : 'success'}`; el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 3600); }
function errorBox(message) { const el = $('[data-error]'); if (el) { el.textContent = message; el.hidden = false; } }
function titleCase(s) { return String(s || '').replace(/([A-Z])/g,' $1').replace(/^./, c => c.toUpperCase()); }
function asRows(data) { return Array.isArray(data) ? data : data?.content || data?.data || data?.items || []; }
const names = { home:'Accueil',myStats:'Mes statistiques',assistances:'Assistances',events:'Évènements',eventDetail:'Détails de l’assistance',contributions:'Cotisations',requests:'Demandes',members:'Membres',archives:'Archives',board:'Membres du bureau',types:'Types d’assistance',audit:'Journal d’audit',roles:'Rôles et permissions',assignments:'Affectations des rôles',groups:'Groupes et associations',settings:'Paramètres',profile:'Profil' };
const cfg = {
  assistances:{url:'/events?status=OPEN&size=100',fields:['reference','typeName','beneficiaryName','createdAt','closingDate','status'],create:'event'},
  events:{url:'/events?status=OPEN&size=100',fields:['reference','typeName','beneficiaryName','createdAt','closingDate','status'],create:'event'},
  contributions:{url:'/contributions/pending',fields:['eventReference','memberName','memberPhone','amount','method','status','submittedAt'],actions:['validate','invalidate']},
  requests:{url:'/requests?scope=all',fields:['id','memberName','typeName','description','status','createdAt'],create:'request',actions:['approve','reject']},
  members:{url:'/members?active=true&size=100',fields:['fullName','phone','roleName','status','city','quarter'],create:'member',actions:['edit','archive','permissions']},
  archives:{url:'/members?active=false&size=100',fields:['fullName','phone','roleName','status','city','quarter'],actions:['restore','delete']},
  board:{url:'/administration/bureau',fields:['fullName','phone','bureauPosition','roleName','status'],create:'board',actions:['edit','remove']},
  types:{url:'/assistance-types',fields:['name','description','icon','active'],create:'type',actions:['edit','delete']},
  roles:{url:'/roles',fields:['name','code','description'],create:'role',actions:['edit','delete']},
  assignments:{url:'/members?active=true&size=100',fields:['fullName','phone','roleName','bureauPosition'],actions:['assign']},
  groups:{url:'/groups/manage',fields:['name','city','phone','email','minAssistancesRequired','active'],create:'group',actions:['edit','delete']},
  audit:{url:'/audit-logs',fields:['createdAt','memberName','action','entity','description']},
  eventDetail:{url:null,fields:[]},
};
function cellValue(key, row) { const value = row[key]; if (key.toLowerCase().includes('status') || ['active'].includes(key)) { const label = value === true ? 'Actif' : value === false ? 'Inactif' : ({OPEN:'Ouvert',PENDING:'En attente',VALIDATED:'Validé',REJECTED:'Rejeté',CLOSED:'Clôturé',CANCELLED:'Annulé',ACTIVE:'Actif',INACTIVE:'Inactif'}[value] || value); return `<span class="status-badge ${String(value).toLowerCase()}">${esc(label)}</span>`; } if (/amount|total|fcfa/i.test(key)) return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`; if (/At$|Date$/i.test(key) && value) return esc(new Date(value).toLocaleDateString(store.lang === 'fr' ? 'fr-FR' : 'en-GB')); return esc(value || '—'); }
function table(rows, fields, actions = []) { if (!rows.length) return '<div class="card empty-state"><span>🤝</span><strong>Aucune donnée</strong><small>Les éléments disponibles apparaîtront ici.</small></div>'; return `<div class="card table-card"><div class="table-head">${fields.map(f=>`<span>${esc(titleCase(f))}</span>`).join('')}${actions.length?'<span>Actions</span>':''}</div>${rows.map(row=>`<div class="table-row" style="grid-template-columns:repeat(${fields.length + (actions.length?1:0)},minmax(110px,1fr))">${fields.map(f=>`<span>${cellValue(f,row)}</span>`).join('')}${actions.length?`<span class="row-actions">${actions.map(a=>`<button class="small-button" data-row-action="${a}" data-id="${esc(row.id || row.memberId || '')}">${({validate:'Valider',invalidate:'Invalider',edit:'Modifier',archive:'Archiver',restore:'Réactiver',delete:'Supprimer',approve:'Approuver',reject:'Rejeter',remove:'Retirer',permissions:'Permissions',assign:'Rôle'})[a]||a}</button>`).join('')}</span>`:''}</div>`).join('')}</div>`; }

const formDefs = {
 member:[['firstName','Prénom','text',true],['lastName','Nom','text',true],['phone','Téléphone','tel',true],['email','E-mail','email'],['city','Ville','text'],['quarter','Quartier','text'],['photoUrl','Photo','file'],['photoShape','Forme du profil','select',['CIRCLE','SQUARE']],['requiredAssistancesOverride','Seuil individuel','number']],
 event:[['typeId','Type d’assistance','number',true],['beneficiaryId','Identifiant du bénéficiaire','number',true],['description','Description','textarea'],['closingDate','Date de clôture','date'],['targetAmount','Montant cible','number']],
 request:[['typeId','Type d’assistance','number',true],['description','Description','textarea',true],['supportingDocument','Justificatif (PDF, Word, Excel ou image)','file']],
 type:[['name','Nom','text',true],['description','Description','textarea'],['icon','Icône','text']],
 role:[['name','Nom du rôle','text',true],['code','Code','text',true],['description','Description','textarea']],
 group:[['name','Nom du groupe','text',true],['city','Ville','text'],['description','Description','textarea'],['phone','Téléphone','tel'],['email','E-mail','email'],['minAssistancesRequired','Seuil minimum','number'],['logo','Logo','file']],
 board:[['memberId','Identifiant membre','number',true],['position','Fonction au bureau','text',true]],
};
function openForm(kind, row = null) { const root = $('[data-modal-root]'); const fields = formDefs[kind] || []; root.innerHTML = `<div class="modal-backdrop" data-close-modal><form class="modal-card" data-form="${kind}"><button class="modal-close" type="button" data-close-modal aria-label="Fermer">×</button><h2>${row?'Modifier':'Nouveau'} ${esc(names[kind] || kind)}</h2>${fields.map(([key,label,type,required,opts])=>`<label>${esc(label)}${type==='textarea'?`<textarea name="${key}" ${required?'required':''}>${esc(row?.[key] || '')}</textarea>`:type==='select'?`<select name="${key}">${opts.map(o=>`<option value="${o}" ${row?.[key]===o?'selected':''}>${o==='CIRCLE'?'Rond':'Carré'}</option>`).join('')}</select>`:`<input name="${key}" type="${type}" ${required?'required':''} ${type==='file'?'accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"':''} value="${type==='file'?'':esc(row?.[key] || '')}">`}</label>`).join('')}<div data-image-preview></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-modal>Annuler</button><button class="primary-button" type="submit">Enregistrer</button></div></form></div>`; }
async function loadPublic() { const root = $('[data-public-groups]'); try { const groups = await api('/public/groups'); store.groups = groups; $('[data-group-count]').textContent = `${groups.length} groupe(s)`; renderPublicGroups(groups); } catch(e) { root.innerHTML = `<div class="error-banner">${esc(e.message)}</div>`; } }
function renderPublicGroups(groups) { const root = $('[data-public-groups]'); if (!root) return; root.innerHTML = groups.length ? groups.map(g=>`<article class="public-group-card"><div class="group-cover"><img src="${esc(g.logoUrl || '/logo-fm-mak.jpeg')}" alt=""></div><div class="group-card-body"><h3>${esc(g.name)}</h3><p class="group-city">${esc(g.city || 'Makénéné')}</p><a class="group-enter" href="/login?group=${encodeURIComponent(g.id)}">Accéder à ce groupe →</a></div></article>`).join('') : '<div class="empty-inline">Aucun groupe n’est encore disponible.</div>'; }
async function loadLoginGroups() { try { const groups = await api('/public/groups'); store.groups = groups; const select = $('[data-login-groups]'); const selected = new URLSearchParams(location.search).get('group') || ''; select.innerHTML = `<option value="">${groups.length?'Choisir un groupe':'Aucun groupe — super administrateur'}</option>` + groups.map(g=>`<option value="${g.id}" ${String(g.id)===selected?'selected':''}>${esc(g.name)}</option>`).join(''); } catch(e) { $('[data-login-groups]').innerHTML = '<option value="">Groupes indisponibles</option>'; } }
async function loadWorkspace() { if (!store.token) { location.replace(`/login${store.group?`?group=${store.group}`:''}`); return; } const page = $('[data-page]').dataset.page; try { const [member, groups] = await Promise.all([api('/auth/me'), api('/groups')]); store.member=member; store.groups=groups; const active = groups.find(g=>String(g.id)===store.group) || groups[0]; if (active && !store.group) { store.group=String(active.id); localStorage.setItem('ms.group',store.group); } paintShell(member,groups,active,page); await renderPage(page); } catch(e) { if (/token|session|authent/i.test(e.message)) { localStorage.removeItem('ms.token'); location.replace('/login'); } else errorBox(e.message); } }
function paintShell(member, groups, active, page) { document.querySelectorAll('[data-page-title]').forEach(e=>e.textContent=names[page]||page); document.querySelectorAll('[data-group-name]').forEach(e=>e.textContent=active?.name || 'Créer un groupe'); $('[data-active-group]').textContent=active?.name||''; $('[data-member-name]').textContent=member.fullName||`${member.firstName||''} ${member.lastName||''}`; $('[data-member-role]').textContent=member.superAdmin?'Super administrateur':member.roleName||'Membre'; const initials=(member.firstName?.[0]||'')+(member.lastName?.[0]||''); document.querySelectorAll('[data-avatar],[data-profile-avatar]').forEach(e=>{e.textContent=initials.toUpperCase()||'MS'; if(member.photoUrl)e.innerHTML=`<img src="${esc(member.photoUrl)}" alt="">`;}); const picker=$('[data-group-picker]'), staticGroup=$('[data-group-static]'); if(member.superAdmin && groups.length>1){picker.hidden=false;picker.querySelector('select').innerHTML=groups.map(g=>`<option value="${g.id}" ${String(g.id)===store.group?'selected':''}>${esc(g.name)}</option>`).join('');} else if(active) staticGroup.hidden=false; document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('router-link-active',a.dataset.nav===page || (page==='eventDetail'&&a.dataset.nav==='events')); const permission=a.dataset.permission; if(permission && !member.superAdmin && !(member.permissions||[]).includes(permission)) a.hidden=true; if(a.hasAttribute('data-super-admin')&&!member.superAdmin)a.hidden=true;}); document.querySelectorAll('[data-nav-section]').forEach(section=>{section.hidden=!Array.from(section.querySelectorAll('.nav-link')).some(a=>!a.hidden);}); }
async function renderPage(page, options = {}) {
  const background = options.background === true;
  const host = $('[data-page-content]');
  const toolbar = $('[data-list-toolbar]');
  const actions = $('[data-page-actions]');
  const editing = () => Boolean(
    $('[data-modal-root] .modal-backdrop') ||
    $('[data-page-content] form[data-dirty="true"]') ||
    document.activeElement?.matches('input, textarea, select')
  );
  const commit = html => {
    if (background && editing()) return;
    if (host.innerHTML === html) return;
    host.innerHTML = html;
    if (toolbar && !toolbar.hidden) {
      const search = $('[data-search]');
      const query = search?.value.trim().toLocaleLowerCase();
      if (query) host.querySelectorAll('.table-row,.event-card').forEach(el => { el.hidden = !el.textContent.toLocaleLowerCase().includes(query); });
      if (search) search.oninput = () => {
        const q = search.value.trim().toLocaleLowerCase();
        host.querySelectorAll('.table-row,.event-card').forEach(el => { el.hidden = !el.textContent.toLocaleLowerCase().includes(q); });
      };
    }
  };
  if (!background) {
    host.innerHTML = '<div class="loading-line"><span class="spinner"></span>Chargement…</div>';
    actions.innerHTML = '';
  } else if (editing()) return;
  const c = cfg[page];
  if (page === 'home' || page === 'myStats') {
    const stat = page === 'home' ? await api('/stats/dashboard') : await api('/auth/me/summary');
    commit(statsHtml(stat, page));
    return;
  }
  if (page === 'profile') {
    const m = await api('/auth/me');
    commit(`<div class="card profile-card"><div class="avatar avatar-large">${esc((m.firstName||'M')[0]+(m.lastName||'S')[0])}</div><h2>${esc(m.fullName||'Mon profil')}</h2><p>${esc(m.phone||'')}</p><form class="password-change" data-password-form><label>Mot de passe actuel<input name="currentPassword" type="password" required></label><label>Nouveau mot de passe<input name="newPassword" type="password" minlength="12" required></label><label>Confirmer le mot de passe<input name="newPassword_confirmation" type="password" required></label><button class="primary-button">Changer le mot de passe</button></form><label class="preference-row"><span>Photo de profil</span><input type="file" accept="image/*" data-profile-photo></label></div>`);
    return;
  }
  if (page === 'settings') {
    const s = await api('/settings');
    commit(`<form class="card form-card settings-form" data-settings-form><h2>Préférences du groupe</h2>${Object.entries(s).map(([k,v])=>`<label>${esc(titleCase(k))}<input name="${esc(k)}" value="${esc(typeof v==='object'?JSON.stringify(v):v)}"></label>`).join('')}<button class="primary-button">Enregistrer les paramètres</button></form>`);
    return;
  }
  if (page === 'eventDetail') {
    const id = $('[data-page]').dataset.eventId;
    const [ev, parts] = await Promise.all([api(`/events/${id}`), api(`/events/${id}/participants`)]);
    commit(`<button class="back-link" onclick="history.back()">← Retour</button><div class="card event-summary"><div><small>${esc(ev.reference)}</small><h2>${esc(ev.typeName)} · ${esc(ev.beneficiaryName)}</h2><p>${esc(ev.description)}</p><span class="status-badge ${String(ev.status).toLowerCase()}">${esc(ev.status)}</span><p>Demandée le ${cellValue('createdAt',ev)} · Clôture ${cellValue('closingDate',ev)}</p></div><strong>${cellValue('collectedAmount',ev)} / ${cellValue('targetAmount',ev)}</strong></div>${table(asRows(parts),['memberName','memberPhone','amount','status'],['validate','invalidate'])}`);
    return;
  }
  if (!c) { commit('<div class="empty-state">Page Blade sans ressource associée.</div>'); return; }
  toolbar.hidden = !['members','archives','board','contributions','requests','events','assistances'].includes(page);
  if (!background && c.create) actions.innerHTML = `<button class="primary-button" data-create="${c.create}">+ Nouveau ${esc(({member:'membre',event:'évènement',request:'demande',type:'type',role:'rôle',group:'groupe',board:'membre du bureau'})[c.create])}</button>`;
  let rows = asRows(await api(c.url));
  if (page === 'contributions') {
    const [pending, validated] = await Promise.all([api('/contributions/pending'), api('/contributions/validated')]);
    rows = [...asRows(pending), ...asRows(validated)];
  }
  if (page === 'events' || page === 'assistances') {
    commit(`<div class="event-list">${rows.map(r=>`<a class="card event-card" href="/events/${r.id}"><span class="event-icon">${esc(r.typeIcon||'♡')}</span><span class="event-info"><strong>${esc(r.reference)} · ${esc(r.typeName)} — ${esc(r.beneficiaryName)}</strong><p>${esc(r.description||'Assistance en cours')}</p><small>${cellValue('closingDate',r)} · ${cellValue('collectedAmount',r)} / ${cellValue('targetAmount',r)}</small></span><span class="status-badge open">Ouverte</span></a>`).join('')||'<div class="card empty-state">Aucune assistance en cours</div>'}</div>`);
  } else commit(table(rows, c.fields, c.actions || []));
}function statsHtml(s,page){const stats=page==='home'?[['Membres',s.totalMembers??s.memberCount??0,'♙'],['Total cotisé',`${Number(s.totalContributions??s.totalAmount??0).toLocaleString()} FCFA`,'↗'],['Assistances réalisées',s.completedAssistances??s.completedEvents??0,'♡'],['Demandes à traiter',s.pendingRequests??0,'▤']]:[['Assistances',`${s.cycleContributions??0} / ${s.requiredAssistances??0}`,'♡'],['Total cotisé',`${Number(s.totalContributions??0).toLocaleString()} FCFA`,'↗'],['Demandes',s.requestCount??0,'▤'],['Évènements',s.eventCount??0,'▣']]; return `<div class="stat-grid">${stats.map(x=>`<article class="stat-card"><span>${x[2]}</span><small>${esc(x[0])}</small><strong>${esc(x[1])}</strong></article>`).join('')}</div><div class="chart-grid"><article class="card chart-card"><h2>Cotisations</h2><p>Résumé des contributions enregistrées dans le groupe.</p><strong>${Number(s.totalContributions??s.totalAmount??0).toLocaleString()} FCFA</strong></article><article class="card chart-card"><h2>Assistances</h2><p>Assistances réalisées et en cours.</p><strong>${s.completedAssistances??s.completedEvents??0}</strong></article></div>${page==='home'&&s.pendingContributions?`<a class="check-card card" href="/contributions"><span>🔔</span><div><strong>Cotisations à vérifier</strong><small>${s.pendingContributions} en attente · Ouvrir la partie à traiter →</small></div></a>`:''}`;}

document.addEventListener('click', async e=>{ const act=e.target.closest('[data-action]')?.dataset.action; if(act==='language'){store.lang=store.lang==='fr'?'en':'fr';localStorage.setItem('ms.lang',store.lang);document.documentElement.lang=store.lang;document.querySelectorAll('[data-action="language"]').forEach(b=>b.textContent=store.lang.toUpperCase());} if(act==='theme'){store.theme=store.theme==='dark'?'light':'dark';localStorage.setItem('ms.theme',store.theme);document.documentElement.dataset.theme=store.theme==='dark'?'dark':'';} if(act==='install-app'){if(pendingInstallPrompt){await pendingInstallPrompt.prompt();await pendingInstallPrompt.userChoice;pendingInstallPrompt=null;}else{alert(/iphone|ipad|ipod/i.test(navigator.userAgent)?'Pour installer, touchez Partager puis « Sur l’écran d’accueil ».':'Utilisez l’option « Installer cette application » du menu de votre navigateur.');}} if(act==='toggle-password'){const i=e.target.closest('label').querySelector('input');i.type=i.type==='password'?'text':'password';e.target.textContent=i.type==='password'?'Afficher':'Masquer';} if(act==='logout'){try{await api('/auth/logout',{method:'POST'});}catch{} localStorage.removeItem('ms.token');location.href='/login';} if(act==='open-mobile-nav')$('#admin-shell').classList.add('mobile-nav-open');if(act==='close-mobile-nav')$('#admin-shell').classList.remove('mobile-nav-open');if(e.target.matches('[data-create]'))openForm(e.target.dataset.create);if(e.target.matches('[data-close-modal]'))$('[data-modal-root]').innerHTML=''; if(e.target.matches('[data-row-action]'))handleRowAction(e.target); if(act==='notifications'){const pop=$('[data-notification-popover]');pop.hidden=!pop.hidden;if(!pop.hidden){try{const n=await api('/notifications');pop.innerHTML=asRows(n).map(x=>`<div class="notification-row"><strong>${esc(x.title||x.message)}</strong><span>${esc(x.createdAt||'')}</span></div>`).join('')||'Aucune notification';}catch(err){pop.textContent=err.message;}}}});
document.addEventListener('change',async e=>{if(e.target.matches('[data-action="select-group"]')){store.group=e.target.value;localStorage.setItem('ms.group',store.group);location.reload();} if(e.target.matches('[data-profile-photo]')){const file=e.target.files?.[0];if(!file)return;try{const form=new FormData();form.append('image',file);const result=await api('/uploads',{method:'POST',body:form});await api('/auth/me/photo',{method:'PUT',body:{photoUrl:result.url}});toast('Photo de profil mise à jour');location.reload();}catch(err){toast(err.message,true);}} if(e.target.matches('input[type=file]')){const file=e.target.files?.[0];if(file&&file.type.startsWith('image/')){const preview=$('[data-image-preview]');if(preview)preview.innerHTML=`<img class="image-preview" src="${URL.createObjectURL(file)}" alt="Aperçu">`;}}});
document.addEventListener('submit',async e=>{if(e.target.matches('[data-login-form]')){e.preventDefault();const f=new FormData(e.target),error=$('[data-login-error]');error.hidden=true;try{const result=await api('/auth/login',{method:'POST',body:{phone:f.get('phone'),password:f.get('password'),groupId:f.get('groupId')||undefined}});store.token=result.token;store.group=String(result.member?.groupId||f.get('groupId')||'');localStorage.setItem('ms.token',store.token);localStorage.setItem('ms.group',store.group);location.href='/dashboard';}catch(err){error.hidden=false;error.querySelector('div').textContent=err.message;}} if(e.target.matches('[data-form]')){e.preventDefault();const kind=e.target.dataset.form;try{const form=new FormData(e.target),body={};for(const [k,v]of form.entries())if(v instanceof File){if(v.size){const upload=new FormData();upload.append('file',v);const res=await api(k==='supportingDocument'?'/uploads/document':'/uploads',{method:'POST',body:upload});body[k==='supportingDocument'?'supportingDocumentUrl':'photoUrl']=res.url;}}else body[k]=v===''?null:(['typeId','beneficiaryId','targetAmount','requiredAssistancesOverride','minAssistancesRequired','memberId'].includes(k)?Number(v):v);const endpoint={member:'/members',event:'/events',request:'/requests','type':'/assistance-types',role:'/roles',group:'/groups',board:'/administration/bureau'}[kind];await api(endpoint,{method:'POST',body});$('[data-modal-root]').innerHTML='';toast('Enregistrement effectué');await renderPage($('[data-page]').dataset.page);}catch(err){toast(err.message,true);}} if(e.target.matches('[data-password-form]')){e.preventDefault();const f=new FormData(e.target);try{await api('/auth/change-password',{method:'POST',body:Object.fromEntries(f)});toast('Mot de passe modifié');e.target.reset();delete e.target.dataset.dirty;}catch(err){toast(err.message,true);}} if(e.target.matches('[data-settings-form]')){e.preventDefault();try{await api('/settings',{method:'PUT',body:Object.fromEntries(new FormData(e.target))});toast('Paramètres enregistrés');delete e.target.dataset.dirty;}catch(err){toast(err.message,true);}}});
async function handleRowAction(button){const id=button.dataset.id,action=button.dataset.rowAction,page=$('[data-page]').dataset.page;try{if(action==='edit'&&page==='members'){const row=await api(`/members/${id}`);openForm('member',row);return;}if(action==='archive'||action==='restore'){await api(`/members/${id}/status`,{method:'PUT',body:{active:action==='restore'}});}else if(action==='delete'){if(!confirm('Supprimer définitivement cet élément ?'))return;await api(`/members/${id}`,{method:'DELETE'});}else if(action==='validate')await api(`/contributions/${id}/validate`,{method:'POST',body:{paymentReceived:true}});else if(action==='invalidate')await api(`/contributions/${id}/invalidate`,{method:'POST',body:{}});else if(action==='approve')await api(`/requests/${id}/approve`,{method:'POST',body:{}});else if(action==='reject')await api(`/requests/${id}/reject`,{method:'POST',body:{reason:'Refusé'}});else if(action==='remove')await api(`/administration/bureau/${id}`,{method:'DELETE'});else if(action==='delete'&&page==='types')await api(`/assistance-types/${id}`,{method:'DELETE'});toast('Action effectuée');await renderPage(page);}catch(err){toast(err.message,true);}}

if(path==='')loadPublic(); else if(path==='login')loadLoginGroups(); else if($('[data-page]'))loadWorkspace();
if($('[data-group-search]'))$('[data-group-search]').addEventListener('input',e=>renderPublicGroups(store.groups.filter(g=>`${g.name} ${g.city||''} ${g.description||''}`.toLowerCase().includes(e.target.value.toLowerCase()))));
let lastUserInteraction=0;
document.addEventListener('pointerdown',()=>{lastUserInteraction=Date.now();},{passive:true});
document.addEventListener('keydown',()=>{lastUserInteraction=Date.now();},{passive:true});
document.addEventListener('input', e => { lastUserInteraction=Date.now(); const form=e.target.closest('[data-settings-form],[data-password-form]'); if(form) form.dataset.dirty='true'; });
let backgroundRefreshBusy=false;
if($('[data-page]'))setInterval(async()=>{if(document.visibilityState!=='visible'||backgroundRefreshBusy||Date.now()-lastUserInteraction<1200)return;backgroundRefreshBusy=true;try{await renderPage($('[data-page]').dataset.page,{background:true});}catch{}finally{backgroundRefreshBusy=false;}},4000);
