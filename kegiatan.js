// ─── KEGIATAN.JS ───
// Logika khusus halaman kegiatan.html
// Depends on: config.js, auth.js, sidebar.js, lokasi.js

// ─── STATE ───
let allKegiatan = [];
let allPeserta = [];
let allDetailPeserta = [];
let _autoNonaktifDone = false; // hanya jalan sekali per session

// ─── KEGIATAN ───
function _skeletonCards(n = 4) {
  return Array.from({length: n}, () => `
    <div class="skeleton-card">
      <div class="skeleton-date">
        <div class="skeleton" style="height:28px;width:44px;border-radius:6px"></div>
        <div class="skeleton" style="height:11px;width:30px;border-radius:4px"></div>
        <div class="skeleton" style="height:10px;width:26px;border-radius:4px"></div>
      </div>
      <div class="skeleton-sep"></div>
      <div class="skeleton-body">
        <div class="skeleton" style="height:16px;width:65%;border-radius:6px"></div>
        <div class="skeleton" style="height:13px;width:40%;border-radius:4px"></div>
      </div>
      <div class="skeleton-actions">
        <div class="skeleton" style="height:34px;width:100px;border-radius:12px"></div>
        <div class="skeleton" style="height:34px;width:72px;border-radius:12px"></div>
        <div class="skeleton" style="height:34px;width:34px;border-radius:12px"></div>
        <div class="skeleton" style="height:34px;width:34px;border-radius:12px"></div>
      </div>
    </div>
  `).join('');
}

async function loadKegiatan() {
  const list = document.getElementById('kegiatanList');
  list.innerHTML = _skeletonCards(4);
  try {
    const res = await sb('kegiatan?order=created_at.desc&select=id,nama_kegiatan,lokasi,aktif,kegiatan_peserta(count)');
    if (!res.ok) {
      const errBody = await res.text();
      console.error('Supabase error', res.status, errBody);
      list.innerHTML = '<div class="loading-state">Gagal memuat data (HTTP ' + res.status + ').</div>';
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error('Supabase returned non-array:', data);
      list.innerHTML = '<div class="loading-state">Respons tidak valid dari server.</div>';
      return;
    }
    data.sort((a, b) => {
      const ta = parseTanggalKegiatan(a.nama_kegiatan).tglBuka;
      const tb = parseTanggalKegiatan(b.nama_kegiatan).tglBuka;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return tb - ta;
    });
    allKegiatan = data;
    const searchEl = document.getElementById('searchKegiatan');
    if (searchEl) searchEl.value = '';

    // Auto-nonaktifkan kegiatan yang tanggal tutupnya sudah lewat (hanya sekali per session)
    if (!_autoNonaktifDone) {
      await autoNonaktifKegiatan(data);
      _autoNonaktifDone = true;
    }

    renderKegiatan(allKegiatan);
    updateRightPanel(allKegiatan);
  } catch(e) {
    console.error('loadKegiatan error:', e);
    list.innerHTML = '<div class="loading-state">Gagal terhubung ke Supabase.</div>';
  }
}

// Auto-nonaktifkan kegiatan yang tanggal tutupnya sudah lewat tengah malam
async function autoNonaktifKegiatan(data) {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // mulai hari ini jam 00.00

  const perluNonaktif = data.filter(k => {
    if (!k.aktif) return false; // sudah nonaktif, skip
    const p = parseTanggalKegiatan(k.nama_kegiatan);
    if (!p.tglTutup) return false;
    const tutup = new Date(p.tglTutup);
    tutup.setHours(23, 59, 59, 999);
    return now > tutup; // sekarang sudah lewat hari terakhir
  });

  if (!perluNonaktif.length) return;

  // PATCH semua sekaligus secara paralel
  await Promise.all(perluNonaktif.map(k =>
    sb(`kegiatan?id=eq.${k.id}`, { method: 'PATCH', body: JSON.stringify({ aktif: false }) })
  ));

  // Update allKegiatan lokal supaya render langsung benar tanpa reload
  perluNonaktif.forEach(k => {
    const item = allKegiatan.find(x => x.id === k.id);
    if (item) item.aktif = false;
  });
}

// Parse tanggal dari nama kegiatan format "[8-10 Juni 2026] Nama"
function parseTanggalKegiatan(namaFull) {
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const matchBracket = namaFull.match(/^\[([^\]]+)\]\s*(.*)/);
  if (!matchBracket) return { nama: namaFull, tglBuka: null, tglTutup: null, dayNum: '', bulanStr: '', tahun: '' };
  const range = matchBracket[1];
  const nama = matchBracket[2];
  const mSama = range.match(/^(\d{1,2})-(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  const mBeda = range.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})\s*-\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  let tglBuka = null, tglTutup = null, dayNum = '', bulanStr = '', tahun = '';
  if (mSama) {
    const bi = BULAN.indexOf(mSama[3]);
    const y = parseInt(mSama[4]);
    tglBuka = new Date(y, bi, parseInt(mSama[1]));
    tglTutup = new Date(y, bi, parseInt(mSama[2]));
    dayNum = mSama[1] + (mSama[1] !== mSama[2] ? '–' + mSama[2] : '');
    bulanStr = mSama[3].substring(0,3).toUpperCase();
    tahun = mSama[4];
  } else if (mBeda) {
    const bi1 = BULAN.indexOf(mBeda[2]);
    const bi2 = BULAN.indexOf(mBeda[5]);
    tglBuka = new Date(parseInt(mBeda[3]), bi1, parseInt(mBeda[1]));
    tglTutup = new Date(parseInt(mBeda[6]), bi2, parseInt(mBeda[4]));
    dayNum = mBeda[1] + '–' + mBeda[4];
    bulanStr = mBeda[2].substring(0,3).toUpperCase();
    tahun = mBeda[3];
  }
  return { nama, tglBuka, tglTutup, dayNum, bulanStr, tahun };
}

function renderKegiatan(items) {
  const list = document.getElementById('kegiatanList');
  document.getElementById('badgeCount').textContent = items.length;
  if (!items.length) {
    list.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Belum ada kegiatan. Tambahkan di atas.
    </div>`;
    return;
  }
  list.innerHTML = items.map(item => {
    const jumlahPeserta = item.kegiatan_peserta?.[0]?.count ?? 0;
    const isKeuangan = currentUser && currentUser.role === 'keuangan';
    const nonaktifClass = item.aktif ? '' : (isKeuangan ? 'nonaktif keuangan-view' : 'nonaktif');
    const parsed = parseTanggalKegiatan(item.nama_kegiatan);
    const namaDisplay = parsed.nama || item.nama_kegiatan;
    const dayNum = parsed.dayNum || '—';
    const bulanStr = parsed.bulanStr || '';
    const tahun = parsed.tahun || '';
    return `
    <div class="kegiatan-item ${nonaktifClass}">
      <div class="kegiatan-date-block">
        <div class="kegiatan-date-num">${escHtml(dayNum)}</div>
        <div class="kegiatan-date-month">${escHtml(bulanStr)}</div>
        <div class="kegiatan-date-year">${escHtml(tahun)}</div>
      </div>
      <div class="kegiatan-date-separator"></div>
      <div class="kegiatan-info">
        <div class="kegiatan-nama">${escHtml(namaDisplay)}</div>
        <div class="kegiatan-meta">
          <div class="kegiatan-meta-item">
            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escHtml(item.lokasi)}
          </div>
          <div class="kegiatan-meta-item">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${jumlahPeserta} peserta
          </div>
          <span class="kegiatan-status ${item.aktif ? 'aktif' : 'nonaktif'}">${item.aktif ? 'Aktif' : 'Nonaktif'}</span>
        </div>
      </div>
      <div class="kegiatan-actions">
        <button class="btn-sm btn-lihat-peserta" onclick="lihatPesertaKegiatan(${item.id}, \`${escHtml(item.nama_kegiatan)}\`, \`${escHtml(item.lokasi)}\`)">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span class="btn-txt">Lihat Peserta</span>
        </button>
        ${!isKeuangan ? `
        <button class="btn-sm kegiatan-toggle-btn ${item.aktif ? 'deactivate' : 'activate'}" onclick="toggleKegiatan(${item.id}, ${!item.aktif})" title="${item.aktif ? 'Nonaktifkan' : 'Aktifkan'}">
          <span class="toggle-track ${item.aktif ? 'on' : 'off'}"><span class="toggle-thumb"></span></span>
          <span class="btn-txt">${item.aktif ? 'Aktif' : 'Nonaktif'}</span>
        </button>
        <button class="btn-sm edit icon-only" onclick="openEditKegiatan(${item.id}, \`${escHtml(item.nama_kegiatan)}\`)" title="Edit kegiatan">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-sm danger icon-only" onclick="hapusKegiatan(${item.id}, \`${escHtml(item.nama_kegiatan)}\`)" title="Hapus kegiatan">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
        ` : ''}
      </div>
    </div>
  `}).join('');
}

function filterKegiatan() {
  const q = (document.getElementById('searchKegiatan').value || '').trim().toLowerCase();
  const filtered = q ? allKegiatan.filter(k => k.nama_kegiatan.toLowerCase().includes(q)) : allKegiatan;
  renderKegiatan(filtered);
}

// ─── RIGHT PANEL LOGIC ───
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let _calDayItems = {}; // day (angka) -> [{id, nama_kegiatan, lokasi}]

function updateRightPanel(kegiatanData) {
  updateRingkasan(kegiatanData);
  renderCalendar(kegiatanData);
  renderAgenda(kegiatanData);
}

function updateRingkasan(data) {
  const total = data.length;
  const aktif = data.filter(k => k.aktif).length;
  const nonaktif = data.filter(k => !k.aktif).length;
  const peserta = data.reduce((s, k) => s + (k.kegiatan_peserta?.[0]?.count ?? 0), 0);
  document.getElementById('rTotal').textContent = total;
  document.getElementById('rAktif').textContent = aktif;
  document.getElementById('rNonaktif').textContent = nonaktif;
  document.getElementById('rPeserta').textContent = peserta;
}

const BULAN_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_SHORT = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

function renderCalendar(kegiatanData) {
  const label = BULAN_NAMES[calMonth] + ' ' + calYear;
  document.getElementById('calMonthLabel').textContent = label;

  // Collect event dates for this month (1 hari maupun rentang, sama-sama pakai bulet+pill),
  // sekaligus simpan kegiatan apa saja yang jatuh di tiap tanggal (untuk fitur klik)
  const dayItems = {};
  (kegiatanData || allKegiatan).forEach(item => {
    const p = parseTanggalKegiatan(item.nama_kegiatan);
    if (p.tglBuka && p.tglTutup) {
      let d = new Date(p.tglBuka);
      while (d <= p.tglTutup) {
        if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
          const day = d.getDate();
          if (!dayItems[day]) dayItems[day] = [];
          dayItems[day].push({ id: item.id, nama_kegiatan: item.nama_kegiatan, lokasi: item.lokasi });
        }
        d.setDate(d.getDate() + 1);
      }
    }
  });
  _calDayItems = dayItems;
  const eventDays = new Set(Object.keys(dayItems).map(Number));

  const today = new Date();
  const firstDay = new Date(calYear, calMonth, 1);
  // Monday-first: 0=Mon ... 6=Sun
  let startDow = (firstDay.getDay() + 6) % 7; // convert Sun=0 to Mon=0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();

  let html = DAY_SHORT.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // Prev month blanks
  for (let i = startDow - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month empty"><div class="cal-day-num">${prevDays - i}</div></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const inRange = eventDays.has(d);
    let rangeClasses = '';
    let clickAttr = '';
    if (inRange) {
      const dow = (startDow + d - 1) % 7; // 0=Sen ... 6=Min
      // Bulet solid cuma di ujung pita yang benar-benar tersambung (bukan per-item),
      // supaya tanggal tengah dari rentang beberapa hari nggak ikut kebuletin.
      const prevInRange = d > 1 && eventDays.has(d - 1);
      const nextInRange = d < daysInMonth && eventDays.has(d + 1);
      rangeClasses = 'in-range';
      if (dow === 0 || !prevInRange) rangeClasses += ' range-cap-start';
      if (dow === 6 || !nextInRange) rangeClasses += ' range-cap-end';
      if (!prevInRange) rangeClasses += ' range-start';
      if (!nextInRange) rangeClasses += ' range-end';
      clickAttr = ` onclick="calDayClick(${d})"`;
    }
    html += `<div class="cal-day ${isToday ? 'today' : ''} ${rangeClasses}"${clickAttr}>
      <div class="cal-day-num">${d}</div>
    </div>`;
  }

  // Fill remaining
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  let nextDay = 1;
  for (let i = startDow + daysInMonth; i < totalCells; i++) {
    html += `<div class="cal-day other-month empty"><div class="cal-day-num">${nextDay++}</div></div>`;
  }

  document.getElementById('calGrid').innerHTML = html;
}

function calDayClick(day) {
  const items = _calDayItems[day];
  if (!items || !items.length) return;
  const item = items[0];
  lihatPesertaKegiatan(item.id, item.nama_kegiatan, item.lokasi);
}

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }
function calToday() { calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); renderCalendar(); }

function renderAgenda(kegiatanData) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayData = (kegiatanData || allKegiatan).filter(item => {
    const p = parseTanggalKegiatan(item.nama_kegiatan);
    if (!p.tglBuka || !p.tglTutup) return false;
    const buka = new Date(p.tglBuka); buka.setHours(0,0,0,0);
    const tutup = new Date(p.tglTutup); tutup.setHours(23,59,59,999);
    return today >= buka && today <= tutup;
  });

  document.getElementById('badgeAgenda').textContent = todayData.length;

  if (!todayData.length) {
    document.getElementById('agendaList').innerHTML = '<div class="agenda-empty">Tidak ada kegiatan hari ini</div>';
    return;
  }

  document.getElementById('agendaList').innerHTML = todayData.map(item => {
    const p = parseTanggalKegiatan(item.nama_kegiatan);
    const nama = p.nama || item.nama_kegiatan;
    return `<div class="agenda-item ${item.aktif ? '' : 'nonaktif'}">
      <div class="agenda-title">${escHtml(nama.length > 52 ? nama.substring(0,52)+'...' : nama)}</div>
      <div class="agenda-meta">
        <div class="agenda-info">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escHtml(item.lokasi)}
        </div>
        <span class="agenda-badge ${item.aktif ? 'aktif' : 'nonaktif'}">${item.aktif ? 'Aktif' : 'Nonaktif'}</span>
      </div>
    </div>`;
  }).join('');
}

// ─── TAMBAH KEGIATAN ───
async function tambahKegiatan() {
  const nama = document.getElementById('inputNama').value.trim();
  const lokasi = document.getElementById('inputLokasi').value.trim();
  const tglBuka = document.getElementById('inputTglBuka').value;
  const tglTutup = document.getElementById('inputTglTutup').value;
  let valid = true;
  ['inputNama','inputLokasi','inputTglBuka','inputTglTutup'].forEach(id => document.getElementById(id).classList.remove('error'));
  if (!nama) { document.getElementById('inputNama').classList.add('error'); valid = false; }
  if (!lokasi || !_lokasiValid) { document.getElementById('inputLokasi').classList.add('error'); valid = false; }
  if (!tglBuka) { document.getElementById('inputTglBuka').classList.add('error'); valid = false; }
  if (!tglTutup) { document.getElementById('inputTglTutup').classList.add('error'); valid = false; }
  if (!valid) return;

  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const buka = new Date(tglBuka + 'T00:00:00');
  const tutup = new Date(tglTutup + 'T00:00:00');
  let rangeStr;
  if (buka.getMonth() === tutup.getMonth() && buka.getFullYear() === tutup.getFullYear()) {
    rangeStr = `${buka.getDate()}-${tutup.getDate()} ${BULAN[buka.getMonth()]} ${buka.getFullYear()}`;
  } else {
    rangeStr = `${buka.getDate()} ${BULAN[buka.getMonth()]} ${buka.getFullYear()} - ${tutup.getDate()} ${BULAN[tutup.getMonth()]} ${tutup.getFullYear()}`;
  }
  const namaFinal = `[${rangeStr}] ${nama}`;

  const btn = document.getElementById('btnTambah');
  btn.disabled = true; btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:white;fill:none;stroke-width:2.5;stroke-linecap:round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Menyimpan...';
  try {
    const res = await sb('kegiatan', { method: 'POST', body: JSON.stringify({ nama_kegiatan: namaFinal, lokasi, aktif: true }) });
    if (res.ok) {
      document.getElementById('inputNama').value = '';
      document.getElementById('inputLokasi').value = '';
      _lokasiValid = false;
      document.getElementById('inputTglBuka').value = '';
      document.getElementById('inputTglTutup').value = '';
      showToast('Kegiatan berhasil ditambahkan!', 'success');
      loadKegiatan();
    } else {
      const err = await res.json();
      showToast('Gagal: ' + (err.message || 'Unknown error'), 'error');
    }
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:white;fill:none;stroke-width:2.5;stroke-linecap:round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tambah Kegiatan'; }
}

async function toggleKegiatan(id, aktif) {
  try {
    const res = await sb(`kegiatan?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ aktif }) });
    if (res.ok) { showToast(aktif ? 'Kegiatan diaktifkan.' : 'Kegiatan dinonaktifkan.', 'success'); loadKegiatan(); }
    else showToast('Gagal update status.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
}

async function hapusKegiatan(id, nama) {
  const ok = await showConfirm('Hapus Kegiatan', `Hapus kegiatan "<strong>${escHtml(nama)}</strong>"? Data responses yang sudah masuk tidak ikut terhapus.`);
  if (!ok) return;
  try {
    const res = await sb(`kegiatan?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
    if (res.ok) { showToast('Kegiatan dihapus.', 'success'); loadKegiatan(); }
    else showToast('Gagal hapus kegiatan.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
}

// ─── PESERTA ───
async function loadPeserta() {
  const tbody = document.getElementById('pesertaTbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="16" class="td-loading">Memuat data...</td></tr>';
  try {
    const res = await sb('peserta?order=created_at.desc');
    const data = await res.json();
    allPeserta = data;
    if (typeof renderTableHeader === 'function') renderTableHeader();
    if (typeof applyTableFilters === 'function') applyTableFilters();
  } catch {
    if (tbody) tbody.innerHTML = '<tr><td colspan="16" class="td-loading">Gagal memuat data peserta.</td></tr>';
  }
}

let _kopBase64Cache = null;
async function preloadKopSurat() {
  if (_kopBase64Cache) return;
  try {
    const baseUrl = window.location.href.replace(/[^/]*$/, '');
    const r = await fetch(baseUrl + 'kopsurat.png');
    if (!r.ok) return;
    const blob = await r.blob();
    _kopBase64Cache = await new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch { /* biarkan null */ }
}

async function lihatPesertaKegiatan(kegiatanId, namaKegiatan, lokasi) {
  _detailKegiatanId = kegiatanId;
  _detailKegiatanNama = namaKegiatan;
  _detailKegiatanLokasi = lokasi;
  _detailKegiatanTglBuka = '';
  preloadKopSurat();
  document.getElementById('kegiatanList').style.display = 'none';
  document.getElementById('kegiatanToolbar').style.display = 'none';
  const addForm = document.getElementById('addFormCard');
  if (addForm) addForm.style.display = 'none';
  document.getElementById('rightPanel').style.display = 'none';
  const _gb1 = document.getElementById('greetingBar'); if (_gb1) _gb1.style.display = 'none';
  const panel = document.getElementById('detailPesertaPanel');
  panel.classList.add('active');
  document.getElementById('detailPesertaTbody').innerHTML = '<tr><td colspan="6" class="td-loading">Memuat data...</td></tr>';
  document.getElementById('badgeDetailPeserta').textContent = '0';
  document.getElementById('topbarTitle').textContent = 'Peserta: ' + namaKegiatan;
  try {
    const res = await sb(`kegiatan_peserta?kegiatan_id=eq.${kegiatanId}&select=created_at,peserta(id,nama,nip,golongan,nik,mapel,instansi,jabatan,wa,provinsi,kabkota,alamat,telp_instansi)&order=created_at.asc`);
    const data = await res.json();
    const tbody = document.getElementById('detailPesertaTbody');
    document.getElementById('badgeDetailPeserta').textContent = data.length;
    const searchEl = document.getElementById('searchDetailPeserta');
    if (searchEl) searchEl.value = '';
    allDetailPeserta = data;
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="td-empty">Belum ada peserta terdaftar di kegiatan ini.</td></tr>';
      return;
    }
    renderDetailPeserta(data);
  } catch {
    document.getElementById('detailPesertaTbody').innerHTML = '<tr><td colspan="6" class="td-loading">Gagal memuat data.</td></tr>';
  }
}

function renderDetailPeserta(rows) {
  const tbody = document.getElementById('detailPesertaTbody');
  const unduhWrap = document.getElementById('unduhExcelWrap');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="td-empty">Tidak ada peserta yang cocok.</td></tr>';
    if (unduhWrap) unduhWrap.style.display = 'none';
    return;
  }
  if (unduhWrap) unduhWrap.style.display = 'flex';
  tbody.innerHTML = rows.map((row) => {
    const p = row.peserta || {};
    const pEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
    return `<tr class="tr-clickable" data-p="${pEncoded}" onclick="showDetailPesertaFromBtn(this)" title="Klik untuk lihat detail">
      <td onclick="event.stopPropagation()" style="text-align:center;padding:0 8px;">
        <svg data-p="${pEncoded}" onclick="cetakBiodataFromBtn(this)" title="Cetak biodata" viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--text-faint);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;cursor:pointer;display:inline-block;transition:stroke 0.15s;" onmouseover="this.style.stroke='var(--success-text)'" onmouseout="this.style.stroke='var(--text-faint)'"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      </td>
      <td class="td-ts">${escHtml(formatTs(row.created_at))}</td>
      <td style="font-weight:600;color:var(--text)">${escHtml(p.nama || '-')}</td>
      <td>${escHtml(p.instansi || '-')}</td>
      <td>${escHtml(p.provinsi || '-')}</td>
      <td>${escHtml(p.kabkota || '-')}</td>
    </tr>`;
  }).join('');
}

function filterDetailPeserta() {
  const q = (document.getElementById('searchDetailPeserta').value || '').trim().toLowerCase();
  const filtered = q ? allDetailPeserta.filter(row => {
    const nama = (row.peserta?.nama || '').toLowerCase();
    const instansi = (row.peserta?.instansi || '').toLowerCase();
    return nama.includes(q) || instansi.includes(q);
  }) : allDetailPeserta;
  renderDetailPeserta(filtered);
}

let _detailKegiatanId = null, _detailKegiatanNama = '', _detailKegiatanLokasi = '', _detailKegiatanTglBuka = '';

async function hapusPesertaKegiatan(pesertaId, nama) {
  const ok = await showConfirm('Hapus dari Kegiatan', `Hapus "<strong>${escHtml(nama)}</strong>" dari kegiatan ini? Data peserta di database tidak akan ikut terhapus.`);
  if (!ok) return;
  try {
    const res = await sb(`kegiatan_peserta?kegiatan_id=eq.${_detailKegiatanId}&peserta_id=eq.${pesertaId}`, { method: 'DELETE', prefer: 'return=minimal' });
    if (res.ok) { showToast('Peserta dihapus dari kegiatan.', 'success'); lihatPesertaKegiatan(_detailKegiatanId, _detailKegiatanNama, _detailKegiatanLokasi); }
    else showToast('Gagal hapus peserta dari kegiatan.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
}

async function cetakBiodata(p, btnEl) {
  if (btnEl) {
    const tdActions = btnEl.closest('.td-actions');
    if (tdActions && !tdActions.querySelector('.badge-printed')) {
      const badge = document.createElement('span');
      badge.className = 'badge-printed';
      badge.textContent = '✓ Dicetak';
      tdActions.appendChild(badge);
    }
  }
  const namaKegiatan = _detailKegiatanNama || '';
  const lokasi = _detailKegiatanLokasi || '';
  let namaKegiatanMurni = namaKegiatan;
  let tglPembukaan = '';
  const BULAN_LIST = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bulanRe = BULAN_LIST.join('|');
  const matchBracket = namaKegiatan.match(/^\[([^\]]+)\]\s*(.*)/);
  if (matchBracket) {
    namaKegiatanMurni = matchBracket[2];
    const range = matchBracket[1];
    const mSama = range.match(new RegExp('^(\\d{1,2})[-–]\\d{1,2}\\s+(' + bulanRe + ')\\s+(\\d{4})'));
    const mBeda = range.match(new RegExp('^(\\d{1,2})\\s+(' + bulanRe + ')\\s+(\\d{4})'));
    if (mSama) tglPembukaan = mSama[1] + ' ' + mSama[2] + ' ' + mSama[3];
    else if (mBeda) tglPembukaan = mBeda[1] + ' ' + mBeda[2] + ' ' + mBeda[3];
  }
  const lokasiTanggal = lokasi && tglPembukaan
    ? `${lokasi}, ${tglPembukaan}`
    : (lokasi || tglPembukaan || '-');
  const f = v => v || '-';
  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Biodata ${f(p.nama)} - ${f(namaKegiatanMurni)}</title>
<style>
  @page { size: A4 portrait; margin: 0.5in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #fff; line-height: 1.5; }
  .kop { width: 100%; margin-bottom: 14pt; }
  .kop img { width: 100%; height: auto; display: block; }
  .judul { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.5; }
  .sub-judul { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 16pt; line-height: 1.5; }
  table.biodata { width: 100%; border-collapse: collapse; }
  table.biodata td { padding: 3pt 0; vertical-align: top; font-size: 12pt; line-height: 1.8; }
  table.biodata td.label { width: 42%; padding-right: 8pt; }
  table.biodata td.sep { width: 4%; text-align: center; }
  table.biodata td.value { width: 54%; }
  .ttd-section { margin-top: 32pt; display: flex; justify-content: flex-end; }
  .ttd-box { text-align: center; width: 200pt; line-height: 1.5; }
  .ttd-lokasi-tgl { font-size: 12pt; margin-bottom: 60pt; }
  .ttd-nama { font-size: 12pt; font-weight: bold; display: inline-block; min-width: 180pt; }
</style>
</head>
<body>
  <div class="kop"><img src="kopsurat.png" alt="Kop Surat"></div>
  <div class="judul">BIODATA PESERTA</div>
  <div class="sub-judul">${f(namaKegiatanMurni)}</div>
  <table class="biodata">
    <tr><td class="label">Nama</td><td class="sep">:</td><td class="value">${f(p.nama)}</td></tr>
    <tr><td class="label">NIP</td><td class="sep">:</td><td class="value">${f(p.nip)}</td></tr>
    <tr><td class="label">Pangkat/Golongan</td><td class="sep">:</td><td class="value">${f(p.golongan)}</td></tr>
    <tr><td class="label">Jabatan</td><td class="sep">:</td><td class="value">${f(p.jabatan)}</td></tr>
    <tr><td class="label">No. HP (WA)</td><td class="sep">:</td><td class="value">${f(p.wa)}</td></tr>
    <tr><td class="label">NPWP/NIK</td><td class="sep">:</td><td class="value">${f(p.nik)}</td></tr>
    <tr><td class="label">Instansi</td><td class="sep">:</td><td class="value">${f(p.instansi)}</td></tr>
    <tr><td class="label">Alamat</td><td class="sep">:</td><td class="value">${f(p.alamat)}</td></tr>
    <tr><td class="label">Telepon</td><td class="sep">:</td><td class="value">${f(p.telp_instansi)}</td></tr>
    <tr><td class="label">Kabupaten/Kota</td><td class="sep">:</td><td class="value">${f(p.kabkota)}</td></tr>
    <tr><td class="label">Provinsi</td><td class="sep">:</td><td class="value">${f(p.provinsi)}</td></tr>
  </table>
  <div class="ttd-section">
    <div class="ttd-box">
      <div class="ttd-lokasi-tgl">${f(lokasiTanggal)}</div>
      <div class="ttd-nama">${f(p.nama)}</div>
    </div>
  </div>
</body></html>`;
  const baseUrl = window.location.href.replace(/[^/]*$/, '');
  async function getKopBase64() {
    try {
      const r = await fetch(baseUrl + 'kopsurat.png');
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    } catch { return null; }
  }
  const kopDataUrl = await getKopBase64();
  const kopSrc = kopDataUrl || (baseUrl + 'kopsurat.png');
  const htmlFinal = html.replace('<img src="kopsurat.png" alt="Kop Surat">', `<img src="${kopSrc}" alt="Kop Surat">`);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(htmlFinal); doc.close();
  iframe.contentWindow.focus();
  setTimeout(() => { iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 600);
}

function showDetailPesertaFromBtn(btn) {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(btn.dataset.p))));
    showDetailPeserta(p);
  } catch(e) { console.error('showDetailPeserta decode error', e); }
}

function cetakBiodataFromBtn(btn) {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(btn.dataset.p))));
    cetakBiodata(p, btn);
  } catch(e) { console.error('cetakBiodata decode error', e); }
}

let _editPesertaId = null;

// State untuk modal detail
let _modalCurrentPeserta = null;

function showDetailPeserta(p) {
  _editPesertaId = p.id || null;
  _modalCurrentPeserta = p;

  const GROUPS = [
    { label: 'Identitas', fields: [
      ['Nama Lengkap', p.nama], ['NIP', p.nip],
      ['Pangkat / Golongan', p.golongan], ['NIK', p.nik],
    ]},
    { label: 'Tugas & Instansi', fields: [
      ['Mata Pelajaran', p.mapel], ['Jabatan', p.jabatan],
      ['Instansi / Unit Kerja', p.instansi], ['Alamat Instansi', p.alamat],
      ['Telepon Instansi', p.telp_instansi],
    ]},
    { label: 'Kontak Pribadi', fields: [
      ['No. WhatsApp', p.wa],
    ]},
    { label: 'Wilayah', fields: [
      ['Provinsi', p.provinsi], ['Kabupaten / Kota', p.kabkota],
    ]},
  ];
  let rows = '';
  GROUPS.forEach((g, gi) => {
    if (gi > 0) rows += `<div class="detail-section-divider"></div>`;
    rows += `<div class="detail-group"><div class="detail-group-label">${g.label}</div>`;
    g.fields.forEach(([label, val]) => {
      rows += `<div class="detail-row-new">
        <div class="detail-label-new">${label}</div>
        <div class="detail-value-new${!val ? ' empty' : ''}">${escHtml(val || '—')}</div>
      </div>`;
    });
    rows += `</div>`;
  });

  document.getElementById('modalDetailNama').textContent = p.nama || 'Detail Peserta';
  const subEl = document.getElementById('modalDetailSub');
  if (subEl) subEl.textContent = [p.jabatan, p.instansi].filter(Boolean).join(' · ') || 'Peserta';
  document.getElementById('modalDetailBody').innerHTML = rows;

  // Tampilkan tombol hapus hanya untuk admin
  const isAdmin = currentUser && currentUser.role === 'administrator';
  const btnHapus = document.getElementById('btnHapusPesertaModal');
  if (btnHapus) btnHapus.style.display = isAdmin ? 'flex' : 'none';

  document.getElementById('modalDetailOverlay').classList.add('show');
}

// Cetak dari modal — panggil cetakBiodata yang sudah ada tanpa ubah
function cetakBiodataDariModal() {
  if (_modalCurrentPeserta) cetakBiodata(_modalCurrentPeserta, null);
}

// Hapus dari modal
async function hapusPesertaDariModal() {
  if (!_modalCurrentPeserta) return;
  tutupDetailPesertaModal();
  await hapusPesertaKegiatan(_modalCurrentPeserta.id, _modalCurrentPeserta.nama || '');
}

function tutupDetailPesertaModal() { document.getElementById('modalDetailOverlay').classList.remove('show'); }

async function simpanEditPeserta() {
  if (!_editPesertaId) { tutupDetailPesertaModal(); return; }
  const KEYS = ['nama','nip','golongan','nik','mapel','instansi','jabatan','wa','provinsi','kabkota','alamat','telp_instansi'];
  const payload = {};
  KEYS.forEach(k => { const el = document.getElementById('edit_' + k); if (el) payload[k] = el.value.trim() || null; });
  const btn = document.getElementById('btnSimpanEdit');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/peserta?id=eq.${_editPesertaId}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Data peserta berhasil disimpan.', 'success');
      tutupDetailPesertaModal();
      if (document.getElementById('detailPesertaPanel').classList.contains('active')) lihatPesertaKegiatan(_detailKegiatanId, _detailKegiatanNama, _detailKegiatanLokasi);
    } else {
      let errMsg = 'Gagal menyimpan perubahan. (HTTP ' + res.status + ')';
      try { const errJson = await res.json(); if (errJson.message) errMsg = 'Gagal: ' + errJson.message; } catch(e) {}
      showToast(errMsg, 'error');
    }
  } catch(e) { showToast('Gagal terhubung ke Supabase. Coba lagi.', 'error'); }
  finally { if (btn) btn.disabled = false; }
}

function closeRiwayatKegiatan() { document.getElementById('modalRiwayatOverlay').classList.remove('show'); }

async function showRiwayatKegiatan(pesertaId, namaPeserta) {
  document.getElementById('modalRiwayatNama').textContent = 'Riwayat Kegiatan: ' + namaPeserta;
  document.getElementById('modalRiwayatBody').innerHTML = '<div class="loading-state">Memuat...</div>';
  document.getElementById('modalRiwayatOverlay').classList.add('show');
  try {
    const res = await sb(`kegiatan_peserta?peserta_id=eq.${pesertaId}&select=created_at,kegiatan(nama_kegiatan,lokasi)&order=created_at.desc`);
    const data = await res.json();
    if (!data.length) {
      document.getElementById('modalRiwayatBody').innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:24px 0;">Peserta belum terdaftar di kegiatan manapun.</p>';
      return;
    }
    document.getElementById('modalRiwayatBody').innerHTML = data.map(row => {
      const k = row.kegiatan || {};
      return `<div class="riwayat-item">
        <div class="riwayat-dot"></div>
        <div>
          <div class="riwayat-nama">${escHtml(k.nama_kegiatan || '-')}</div>
          <div class="riwayat-ts">${escHtml(k.lokasi || '')}${k.lokasi ? ' · ' : ''}${escHtml(formatTs(row.created_at))}</div>
        </div>
      </div>`;
    }).join('');
  } catch {
    document.getElementById('modalRiwayatBody').innerHTML = '<div class="loading-state">Gagal memuat data.</div>';
  }
}

function tutupDetailPeserta() {
  document.getElementById('detailPesertaPanel').classList.remove('active');
  document.getElementById('kegiatanList').style.display = '';
  document.getElementById('kegiatanToolbar').style.display = '';
  document.getElementById('rightPanel').style.display = '';
  const _gb2 = document.getElementById('greetingBar'); if (_gb2) _gb2.style.display = '';
  const isKeuangan = currentUser && currentUser.role === 'keuangan';
  const addForm = document.getElementById('addFormCard');
  if (addForm) addForm.style.display = isKeuangan ? 'none' : '';
  document.getElementById('topbarTitle').textContent = 'Kegiatan';
  const unduhWrap = document.getElementById('unduhExcelWrap');
  if (unduhWrap) unduhWrap.style.display = 'none';
}

// ─── KOLOM TABEL (untuk datapeserta.html jika nanti diintegrasikan) ───
const TABLE_COLS = [
  { key: 'created_at', label: 'Timestamp' },
  { key: 'nama', label: 'Nama Lengkap' },
  { key: 'nip', label: 'NIP' },
  { key: 'golongan', label: 'Pangkat/Golongan' },
  { key: 'nik', label: 'NIK' },
  { key: 'mapel', label: 'Mata Pelajaran yang Diampu' },
  { key: 'instansi', label: 'Instansi/Unit Kerja' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'wa', label: 'Nomor Telepon (WhatsApp)' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'kabkota', label: 'Kabupaten/Kota' },
  { key: 'alamat', label: 'Alamat Instansi/Unit Kerja' },
  { key: 'telp_instansi', label: 'No Telepon Instansi/Unit Kerja' },
];

function renderTableHeader() {
  const tr = document.getElementById('pesertaTableHead');
  if (!tr) return;
  tr.innerHTML = TABLE_COLS.map(col => `<th><div class="th-inner"><span>${col.label}</span></div></th>`).join('') + '<th style="width:44px"></th>';
}

function applyTableFilters() {
  const q = (document.getElementById('searchPeserta')?.value || '').trim().toLowerCase();
  const items = q ? allPeserta.filter(p => (p.nama || '').toLowerCase().includes(q)) : [...allPeserta];
  const badge = document.getElementById('badgePeserta');
  if (badge) badge.textContent = items.length;
  renderPeserta(items);
}

function formatTs(ts) {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ts; }
}

function renderPeserta(items) {
  const tbody = document.getElementById('pesertaTbody');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="16" class="td-empty">Belum ada peserta terdaftar.</td></tr>`;
    return;
  }
  const isAdmin = currentUser && currentUser.role === 'administrator';
  const MAX = { instansi: 180, jabatan: 140, mapel: 140, alamat: 180, telp_instansi: 120 };
  function tdTrunc(val, maxW) {
    const v = val || '-';
    return `<td class="td-truncate" style="max-width:${maxW}px" title="${escHtml(v)}">${escHtml(v)}</td>`;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td class="td-ts">${escHtml(formatTs(item.created_at))}</td>
      <td>${escHtml(item.nama || '-')}</td>
      <td>${escHtml(item.nip || '-')}</td>
      <td>${escHtml(item.golongan || '-')}</td>
      <td>${escHtml(item.nik || '-')}</td>
      ${tdTrunc(item.mapel, 140)}
      ${tdTrunc(item.instansi, 180)}
      ${tdTrunc(item.jabatan, 140)}
      <td>${escHtml(item.wa || '-')}</td>
      <td>${escHtml(item.provinsi || '-')}</td>
      <td>${escHtml(item.kabkota || '-')}</td>
      ${tdTrunc(item.alamat, 180)}
      ${tdTrunc(item.telp_instansi, 120)}
      <td>
        <div class="td-actions">
          <button class="icon-btn-info" title="Lihat detail peserta" onclick='showDetailPeserta(${JSON.stringify(item)})'>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </button>
          <button class="icon-btn-riwayat" title="Riwayat kegiatan peserta" onclick='showRiwayatKegiatan(${item.id}, \`${escHtml(item.nama || '')}\`)'>
            <svg viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          ${isAdmin ? `<button class="icon-btn" onclick="hapusPeserta(${item.id}, \`${escHtml(item.nama || '')}\`)" title="Hapus peserta">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

async function hapusPeserta(id, nama) {
  const ok = await showConfirm('Hapus Peserta', `Hapus data peserta "<strong>${escHtml(nama)}</strong>"? Tindakan ini tidak bisa dibatalkan.`);
  if (!ok) return;
  try {
    const res = await sb(`peserta?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
    if (res.ok) { showToast('Data peserta dihapus.', 'success'); loadPeserta(); }
    else showToast('Gagal hapus peserta.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
}

// ─── KELOLA AKUN ───
async function loadAkun() {
  const list = document.getElementById('akunList');
  if (!list) return;
  list.innerHTML = _skeletonCards(4);
  try {
    const res = await sb('admin_users?order=created_at.asc&select=id,username,nama_lengkap,role,aktif');
    const data = await res.json();
    renderAkun(data);
  } catch {
    list.innerHTML = '<div class="loading-state">Gagal memuat data.</div>';
  }
}

function renderAkun(items) {
  const list = document.getElementById('akunList');
  if (!list) return;
  const badge = document.getElementById('badgeAkun');
  if (badge) badge.textContent = items.length;
  if (!items.length) { list.innerHTML = '<div class="empty-state">Belum ada akun.</div>'; return; }
  list.innerHTML = items.map(item => `
    <div class="akun-item ${item.aktif ? '' : 'nonaktif'}">
      <div class="akun-avatar ${item.role === 'operator' ? 'op' : ''}">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="akun-info">
        <div class="akun-nama">${escHtml(item.nama_lengkap || item.username)}</div>
        <div class="akun-username">@${escHtml(item.username)}</div>
      </div>
      <span class="akun-role-badge ${item.role}">${item.role === 'administrator' ? 'Administrator' : item.role === 'keuangan' ? 'Keuangan' : 'Operator'}</span>
      <div class="akun-actions">
        ${item.aktif
          ? `<button class="btn-sm deactivate" onclick="toggleAkun(${item.id}, false)">Nonaktifkan</button>`
          : `<button class="btn-sm activate" onclick="toggleAkun(${item.id}, true)">Aktifkan</button>`
        }
        <button class="btn-sm" onclick="resetPassword(${item.id}, \`${escHtml(item.username)}\`)" style="border-color:#C5D8F5;color:var(--primary);background:var(--primary-light);">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Reset Password
        </button>
        ${item.id !== currentUser.id
          ? `<button class="btn-sm danger" onclick="hapusAkun(${item.id}, \`${escHtml(item.username)}\`)">
               <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
               Hapus</button>`
          : `<span style="font-size:11.5px;color:var(--text-muted);padding:0 8px">(akun kamu)</span>`
        }
      </div>
    </div>
  `).join('');
}

async function tambahAkun() {
  const nama = document.getElementById('akunNama')?.value.trim();
  const username = document.getElementById('akunUsername')?.value.trim();
  const pass = document.getElementById('akunPass')?.value.trim();
  const role = document.getElementById('akunRole')?.value;
  if (!nama || !username || !pass) { showToast('Isi semua field yang diperlukan.', 'error'); return; }
  if (pass.length < 6) { showToast('Password minimal 6 karakter.', 'error'); return; }
  if (/\s/.test(username)) { showToast('Username tidak boleh mengandung spasi.', 'error'); return; }
  const btn = document.getElementById('btnTambahAkun');
  if (btn) btn.disabled = true;
  try {
    const hash = await sha256(pass);
    const res = await sb('admin_users', {
      method: 'POST',
      body: JSON.stringify({ username, password_hash: hash, role, nama_lengkap: nama, aktif: true })
    });
    if (res.ok) {
      document.getElementById('akunNama').value = '';
      document.getElementById('akunUsername').value = '';
      document.getElementById('akunPass').value = '';
      document.getElementById('akunRole').value = 'operator';
      showToast('Akun berhasil dibuat!', 'success');
      loadAkun();
    } else {
      const err = await res.json();
      if (err.code === '23505') showToast('Username sudah digunakan.', 'error');
      else showToast('Gagal: ' + (err.message || 'Unknown error'), 'error');
    }
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
  finally { if (btn) btn.disabled = false; }
}

async function toggleAkun(id, aktif) {
  try {
    const res = await sb(`admin_users?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ aktif }) });
    if (res.ok) { showToast(aktif ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.', 'success'); loadAkun(); }
    else showToast('Gagal update akun.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
}

async function hapusAkun(id, username) {
  const ok = await showConfirm('Hapus Akun', `Hapus akun "<strong>${escHtml(username)}</strong>"? Tindakan ini tidak bisa dibatalkan.`);
  if (!ok) return;
  try {
    const res = await sb(`admin_users?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
    if (res.ok) { showToast('Akun dihapus.', 'success'); loadAkun(); }
    else showToast('Gagal hapus akun.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
}

let _resetPassTargetId = null;
function resetPassword(id, username) {
  _resetPassTargetId = id;
  document.getElementById('resetPassUsername').textContent = '@' + username;
  document.getElementById('resetPassInput').value = '';
  document.getElementById('resetPassOverlay').classList.add('show');
}
function closeResetPass() {
  document.getElementById('resetPassOverlay').classList.remove('show');
  _resetPassTargetId = null;
}
async function doResetPassword() {
  const newPass = document.getElementById('resetPassInput').value.trim();
  if (!newPass) { showToast('Masukkan password baru.', 'error'); return; }
  if (newPass.length < 6) { showToast('Password minimal 6 karakter.', 'error'); return; }
  const btn = document.getElementById('btnDoResetPass');
  btn.disabled = true;
  try {
    const hash = await sha256(newPass);
    const res = await sb(`admin_users?id=eq.${_resetPassTargetId}`, { method: 'PATCH', body: JSON.stringify({ password_hash: hash }) });
    if (res.ok) { showToast('Password berhasil direset.', 'success'); closeResetPass(); }
    else showToast('Gagal reset password.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
  finally { btn.disabled = false; }
}

// ─── UTILITIES ───
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

let confirmResolve = () => {};
function showConfirm(title, msg, okLabel = 'Hapus') {
  return new Promise(resolve => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').innerHTML = msg;
    document.getElementById('confirmOkBtn').textContent = okLabel;
    document.getElementById('confirmOverlay').classList.add('show');
    confirmResolve = (val) => {
      document.getElementById('confirmOverlay').classList.remove('show');
      resolve(val);
    };
  });
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 3000);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── EDIT KEGIATAN ───
let _editKegiatanId = null;

function openEditKegiatan(id, namaFull) {
  _editKegiatanId = id;
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const matchBracket = namaFull.match(/^\[([^\]]+)\]\s*(.*)/);
  let namaMurni = namaFull;
  let tglBukaDate = '', tglTutupDate = '';
  if (matchBracket) {
    namaMurni = matchBracket[2];
    const range = matchBracket[1];
    const mSama = range.match(/^(\d{1,2})-(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    const mBeda = range.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})\s*-\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    if (mSama) {
      const bi = BULAN.indexOf(mSama[3]) + 1; const y = mSama[4];
      tglBukaDate = `${y}-${String(bi).padStart(2,'0')}-${String(mSama[1]).padStart(2,'0')}`;
      tglTutupDate = `${y}-${String(bi).padStart(2,'0')}-${String(mSama[2]).padStart(2,'0')}`;
    } else if (mBeda) {
      const bi1 = BULAN.indexOf(mBeda[2]) + 1; const bi2 = BULAN.indexOf(mBeda[5]) + 1;
      tglBukaDate = `${mBeda[3]}-${String(bi1).padStart(2,'0')}-${String(mBeda[1]).padStart(2,'0')}`;
      tglTutupDate = `${mBeda[6]}-${String(bi2).padStart(2,'0')}-${String(mBeda[4]).padStart(2,'0')}`;
    }
  }
  document.getElementById('editInputNama').value = namaMurni;
  const kg = allKegiatan.find(k => k.id === id);
  const lokasiVal = kg ? (kg.lokasi || '') : '';
  const editLokasiInp = document.getElementById('editInputLokasi');
  editLokasiInp.value = lokasiVal;
  editLokasiInp.classList.remove('error');
  _editLokasiValid = lokasiVal ? true : false;
  document.getElementById('editInputTglBuka').value = tglBukaDate;
  document.getElementById('editInputTglTutup').value = tglTutupDate;
  document.getElementById('editKegiatanOverlay').classList.add('show');
}

function closeEditKegiatan() {
  document.getElementById('editKegiatanOverlay').classList.remove('show');
  document.getElementById('lokasiSuggestBoxEdit').style.display = 'none';
  _editKegiatanId = null;
}

async function doEditKegiatan() {
  const nama = document.getElementById('editInputNama').value.trim();
  const lokasi = document.getElementById('editInputLokasi').value.trim();
  const tglBuka = document.getElementById('editInputTglBuka').value;
  const tglTutup = document.getElementById('editInputTglTutup').value;
  let valid = true;
  ['editInputNama','editInputLokasi','editInputTglBuka','editInputTglTutup'].forEach(id => document.getElementById(id).classList.remove('error'));
  if (!nama) { document.getElementById('editInputNama').classList.add('error'); valid = false; }
  if (!lokasi || !_editLokasiValid) { document.getElementById('editInputLokasi').classList.add('error'); valid = false; }
  if (!tglBuka) { document.getElementById('editInputTglBuka').classList.add('error'); valid = false; }
  if (!tglTutup) { document.getElementById('editInputTglTutup').classList.add('error'); valid = false; }
  if (!valid) return;
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const buka = new Date(tglBuka + 'T00:00:00');
  const tutup = new Date(tglTutup + 'T00:00:00');
  let rangeStr;
  if (buka.getMonth() === tutup.getMonth() && buka.getFullYear() === tutup.getFullYear()) {
    rangeStr = `${buka.getDate()}-${tutup.getDate()} ${BULAN[buka.getMonth()]} ${buka.getFullYear()}`;
  } else {
    rangeStr = `${buka.getDate()} ${BULAN[buka.getMonth()]} ${buka.getFullYear()} - ${tutup.getDate()} ${BULAN[tutup.getMonth()]} ${tutup.getFullYear()}`;
  }
  const namaFinal = `[${rangeStr}] ${nama}`;
  const btn = document.getElementById('btnDoEditKegiatan');
  btn.disabled = true;
  try {
    const res = await sb(`kegiatan?id=eq.${_editKegiatanId}`, { method: 'PATCH', body: JSON.stringify({ nama_kegiatan: namaFinal, lokasi }) });
    if (res.ok) { showToast('Kegiatan berhasil diperbarui!', 'success'); closeEditKegiatan(); loadKegiatan(); }
    else showToast('Gagal menyimpan perubahan.', 'error');
  } catch { showToast('Gagal terhubung ke Supabase.', 'error'); }
  finally { btn.disabled = false; }
}

// ─── UNDUH EXCEL PESERTA ───
function unduhExcelPeserta() {
  if (!allDetailPeserta.length) return;
  const rows = allDetailPeserta;
  const headers = ['No','Timestamp','Nama Lengkap','NIP','NIK','Golongan','Mapel','Instansi/Unit Kerja','Jabatan','Provinsi','Kabupaten/Kota','Alamat','No WA','Telp Instansi'];
  const escCsv = v => {
    const s = (v === null || v === undefined) ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const dataRows = rows.map((row, i) => {
    const p = row.peserta || {};
    return [i+1, formatTs(row.created_at), p.nama||'', p.nip||'', p.nik||'', p.golongan||'', p.mapel||'', p.instansi||'', p.jabatan||'', p.provinsi||'', p.kabkota||'', p.alamat||'', p.wa||'', p.telp_instansi||''].map(escCsv).join(',');
  });
  const csvContent = [headers.join(','), ...dataRows].join('\r\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const namaFile = (_detailKegiatanNama || 'peserta').replace(/[/\\?%*:|"<>]/g, '-');
  a.href = url; a.download = `Peserta - ${namaFile}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('File Excel berhasil diunduh.', 'success');
}


// Keyboard nav untuk lokasi suggest box
const style = document.createElement('style');
style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
document.head.appendChild(style);
