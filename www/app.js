'use strict';
const API = (new URLSearchParams(location.search).get('api') || localStorage.getItem('jv_api') || 'https://3-110-115-23.sslip.io/portal').replace(/\/$/, '');
const $ = (s) => document.querySelector(s), view = $('#view'), tabsEl = $('#tabs');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const st = {token: localStorage.getItem('jv_tok') || '', role: '', tab: 'home', mode: 'login', step: 1, number: '', seen: Number(localStorage.getItem('jv_seen') || 0), feed: [], unread: 0, timer: 0, home: null, stats: null, installs: null};
const ICON = {home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'};
const ico = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
function toast(t) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (e.hidden = true), 3200); }
async function api(path, method = 'GET', body) {
  let r; try { r = await fetch(API + path, {method, headers: {'content-type': 'application/json', ...(st.token ? {authorization: 'Bearer ' + st.token} : {})}, body: body ? JSON.stringify(body) : undefined}); } catch { throw new Error('Cannot reach the Jarvis service. Check your connection.'); }
  const j = await r.json().catch(() => ({})); if (r.status === 401 && st.token && !path.includes('login')) { logout(true); throw new Error('Please log in again.'); }
  if (!j.success) throw new Error(j.error?.message || (r.status === 503 ? 'The Jarvis app is not open yet. Please check back soon.' : 'Something went wrong.')); return j.data;
}
const ago = (t) => { if (!t) return 'never'; const s = Math.max(0, (Date.now() - t) / 1000); return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
const dur = (s) => { s = Math.floor(s || 0); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };
const badge = (on) => `<span class="badge ${on ? 'on1' : 'off1'}">${on ? 'Online' : 'Offline'}</span>`;

// ---------- auth ----------
function authView(err = '') {
  tabsEl.hidden = true;
  const otp = st.step === 2;
  view.innerHTML = `<h1>JARVIS</h1><p class="mu">Your WhatsApp assistant, in your pocket.</p>
  <label class="lbl">WhatsApp number with country code</label><input id="num" inputmode="numeric" autocomplete="tel" placeholder="919876543210" value="${esc(st.number)}" ${otp ? 'readonly' : ''}>
  ${otp ? '<label class="lbl">6-digit code sent to your WhatsApp</label><input id="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code">' : ''}
  <p class="err" id="err">${esc(err)}</p>
  <button class="p" id="go">${otp ? 'Verify and continue' : 'Send code on WhatsApp'}</button>
  ${otp ? '<button id="back" style="margin-top:10px">Use a different number</button>' : ''}
  <p class="mu sm" style="margin-top:14px">No password and no separate sign-up. Your number is your account: the first verified code creates it. Codes come from the Jarvis WhatsApp number. Your phone number is stored as a one-way hash and a sealed copy, and is never shown in the dashboard.</p>`;
  const fail = (e) => { $('#err').textContent = e.message; $('#go').disabled = false; };
  if ($('#back')) $('#back').onclick = () => { st.step = 1; authView(); };
  $('#go').onclick = async () => { $('#go').disabled = true; try {
    if (!otp) { st.number = $('#num').value.replace(/\D/g, ''); await api('/app/v1/otp', 'POST', {number: st.number, purpose: 'login'}); st.step = 2; authView(); return toast('Code sent on WhatsApp'); }
    const r = await api('/app/v1/login', 'POST', {number: st.number, code: $('#code').value.trim()}); start(r.token);
  } catch (e) { fail(e); } };
}
async function start(token) { st.token = token; localStorage.setItem('jv_tok', token); st.home = await api('/app/v1/home'); st.role = st.home.role; st.tab = 'home'; shell(); pollFeed(); st.timer = setInterval(pollFeed, 20000); }
async function logout(quiet) { try { if (!quiet && st.token) await api('/app/v1/logout', 'POST'); } catch { /* ignore */ } clearInterval(st.timer); st.token = ''; st.home = st.stats = st.installs = null; st.feed = []; st.unread = 0; localStorage.removeItem('jv_tok'); st.step = 1; authView(); }

// ---------- shell ----------
function shell() {
  tabsEl.hidden = false; const owner = st.role === 'owner';
  const t = [['home', owner ? 'chart' : 'home', owner ? 'Control' : 'Home'], ['alerts', 'bell', 'Alerts'], ['me', 'user', 'Profile']];
  tabsEl.innerHTML = t.map(([id, ic, lb]) => `<button data-t="${id}" class="${st.tab === id ? 'on' : ''}"><span class="${id === 'alerts' && st.unread ? 'dot' : ''}">${ico(ic)}${id === 'alerts' && st.unread ? '<b></b>' : ''}</span>${lb}</button>`).join('');
  tabsEl.querySelectorAll('button').forEach((b) => (b.onclick = () => { st.tab = b.dataset.t; shell(); }));
  if (st.tab === 'alerts') { st.unread = 0; const m = Math.max(0, ...st.feed.map((x) => x.id)); st.seen = Math.max(st.seen, m); localStorage.setItem('jv_seen', st.seen); }
  (st.tab === 'home' ? (owner ? ownerView : userView) : st.tab === 'alerts' ? alertsView : meView)();
}
async function refresh(kind) { try { if (kind === 'home') st.home = await api('/app/v1/home'); if (kind === 'owner') { [st.stats, st.installs] = await Promise.all([api('/app/v1/owner/stats'), api('/app/v1/owner/installs')]); } } catch (e) { toast(e.message); } }

// ---------- user home ----------
function userView() {
  const h = st.home;
  if (!h?.paired) { view.innerHTML = `<h2>Welcome</h2><div class="card note"><div class="lbl">Not paired yet</div><p>Link your own Jarvis to see its S-ID and status here.</p><ol><li>Open the Jarvis pairing website and enter your number.</li><li>Send the code it shows to your bot, like <b>/pair K7QM-4X2P</b>.</li><li>Your S-ID arrives in your own WhatsApp chat and appears here.</li></ol></div>${proofCard()}`; return; }
  const s = h.status || {};
  view.innerHTML = `<div class="row"><div><div class="mu sm">Your Jarvis</div><h2 style="margin:0">Status</h2></div>${badge(s.online)}</div>
  <div class="card"><div class="lbl">S-ID</div><div class="row"><span class="sid big">${esc(h.sid)}</span><button style="width:auto;padding:8px 14px" id="cp">Copy</button></div><div class="mu sm">Paired ${ago(h.pairedAt)}. Keep it private.</div></div>
  ${s.lastSeen ? `<div class="grid"><div class="card"><div class="lbl">Uptime</div><div class="big">${dur(s.uptimeSec)}</div></div><div class="card"><div class="lbl">Version</div><div class="big">${esc(s.version || '-')}</div></div>
  <div class="card"><div class="lbl">Commands today</div><div class="big">${s.commandsToday ?? 0}</div></div><div class="card"><div class="lbl">Memory</div><div class="big">${s.ramMb ?? 0} MB</div></div></div>
  <p class="mu sm">Hosting: ${esc(s.hosting || 'unknown')}. Last update ${ago(s.lastSeen)}.</p>` : '<div class="card"><div class="lbl">Waiting for status</div><p class="mu">Your bot has not sent a status update yet. It needs the latest Jarvis version and an internet connection.</p></div>'}
  ${proofCard()}`;
  $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(h.sid); toast('S-ID copied'); } catch { toast('Select and copy it by hand'); } };
}
const proofCard = () => `<div class="card"><div class="lbl">How pairing proves your number</div><p class="sm" style="margin:4px 0">Your own linked Jarvis proves to the portal that you control the number, so there is no verification message in your chats. The portal stores only a one-way hash of your number and the S-ID. Status updates carry counters only: version, hosting type, uptime, commands today and memory. No chats, contacts or files.</p></div>`;

// ---------- owner ----------
async function ownerView() {
  if (!st.stats) { view.innerHTML = '<h2>Control room</h2><p class="mu">Loading...</p>'; await refresh('owner'); if (!st.stats) return; }
  const s = st.stats, mb = s.maintainerBot || {}, max = Math.max(1, ...s.perDay.map((d) => d.installs));
  const bars = (o) => { const e = Object.entries(o).sort((a, b) => b[1] - a[1]), t = Math.max(1, ...e.map((x) => x[1])); return e.length ? e.map(([k, n]) => `<div class="row"><span>${esc(k)}</span><span class="mu">${n}</span></div><div class="bar"><i style="width:${Math.round(n / t * 100)}%"></i></div>`).join('') : '<p class="mu sm">No bots are reporting yet.</p>'; };
  view.innerHTML = `<div class="row"><div><span class="badge own">OWNER</span><h2 style="margin:8px 0 0">Control room</h2></div>${badge(mb.online)}</div>
  <div class="grid" style="margin-top:12px"><div class="card"><div class="lbl">Installs</div><div class="big">${s.installs}</div><div class="mu sm">+${s.new7d} this week</div></div><div class="card"><div class="lbl">Active 24h</div><div class="big">${s.active24h}</div><div class="mu sm">${s.installs ? Math.round(s.active24h / s.installs * 100) : 0}% of installs</div></div>
  <div class="card"><div class="lbl">Online now</div><div class="big">${s.online}</div></div><div class="card"><div class="lbl">Maintainer bot</div><div class="big" style="font-size:18px">${mb.online ? 'Online' : 'Offline'}</div><div class="mu sm">${esc(mb.version || '')} ${mb.lastSeen ? ago(mb.lastSeen) : ''}</div></div></div>
  <div class="card"><div class="lbl">Installs, last 14 days</div><div class="spark">${s.perDay.map((d) => `<i title="${esc(d.day)}: ${d.installs}" style="height:${Math.max(5, Math.round(d.installs / max * 100))}%"></i>`).join('')}</div></div>
  <div class="card"><div class="lbl">Hosting</div>${bars(s.hosting)}</div><div class="card"><div class="lbl">Versions</div>${bars(s.versions)}</div>
  <div class="card"><div class="lbl">Installs</div>${(st.installs?.installs || []).slice(0, 25).map((i) => `<div class="item row"><div><span class="sid">${esc(i.sid)}</span><div class="mu sm">v${esc(i.version || '?')} - ${esc(i.hosting || 'unknown')} - paired ${ago(i.at)}</div></div>${badge(i.online)}</div>`).join('') || '<p class="mu sm">No installs yet.</p>'}</div>
  <button id="rf">Refresh</button>`;
  $('#rf').onclick = async () => { st.stats = null; ownerView(); };
}

// ---------- alerts + profile ----------
function alertsView() {
  view.innerHTML = `<h2>Alerts</h2>${'Notification' in window && Notification.permission === 'default' ? '<button id="np" style="margin-bottom:10px">Turn on alerts while the app is open</button>' : ''}<div class="card">${st.feed.length ? st.feed.map((n) => `<div class="item"><div class="row"><b>${esc(n.title)}</b><span class="mu sm">${ago(n.ts)}</span></div><div class="mu sm">${esc(n.body)}</div></div>`).join('') : '<p class="mu">Nothing yet. New installs and bot status changes appear here.</p>'}</div>`;
  const b = $('#np'); if (b) b.onclick = async () => { await Notification.requestPermission(); alertsView(); };
}
function meView() {
  const h = st.home || {}; view.innerHTML = `<h2>Profile</h2><div class="card"><div class="lbl">Account</div><div class="item row"><span>Number</span><span class="mu">${esc(h.number || '')}</span></div><div class="item row"><span>Role</span><span class="mu">${esc(h.role || '')}</span></div><div class="item row"><span>Email</span><span class="mu">${h.emailBound ? 'Added' : 'Not added'}</span></div>${h.sid ? `<div class="item row"><span>S-ID</span><span class="sid">${esc(h.sid)}</span></div>` : ''}</div>${proofCard()}<button id="lo">Log out</button><p class="mu sm" style="text-align:center">Jarvis app 1.0</p>`;
  $('#lo').onclick = () => logout(false);
}
async function pollFeed() {
  if (!st.token) return; try {
    const first = !st.feed.length, d = await api('/app/v1/notifications?since=0'); const fresh = d.items.filter((n) => n.id > st.seen && !st.feed.some((x) => x.id === n.id));
    st.feed = d.items; if (st.tab !== 'alerts') st.unread = d.items.filter((n) => n.id > st.seen).length; else { st.seen = Math.max(st.seen, d.latest); localStorage.setItem('jv_seen', st.seen); }
    if (!first && fresh.length) { toast(fresh[0].title + ': ' + fresh[0].body); if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(fresh[0].title, {body: fresh[0].body}); }
    if (st.tab === 'home' && !first) { if (st.role === 'owner') { st.stats = null; } else { st.home = await api('/app/v1/home'); } } shell();
  } catch { /* offline: try again next time */ }
}
(async () => { if (!st.token) return authView(); try { st.home = await api('/app/v1/home'); st.role = st.home.role; shell(); pollFeed(); st.timer = setInterval(pollFeed, 20000); } catch { authView(); } })();

// Branded opening animation, then fade out. Starts counting once the page is ready so it never flashes.
{ const sp = document.getElementById('splash'); if (sp) { const t0 = performance.now(); const hide = () => { sp.classList.add('out'); setTimeout(() => sp.remove(), 600); }; window.addEventListener('load', () => setTimeout(hide, Math.max(0, 1700 - (performance.now() - t0)))); } }
