/* ============================================================
   sertifikat-detail.js  —  DETAIL satu proyek sertifikat
   Baca ?id → load proyek + penerima dari Supabase, restore
   setting, simpan tiap perubahan, proses PDF lalu (opsional)
   kirim email. Paginasi 15/halaman. GAS masih disimulasikan.
   ============================================================ */

const USE_SUPABASE = true;
const PERAN_ORDER = { narasumber: 0, fasilitator: 1, peserta: 2 };
const EMAIL_LIMIT_HARIAN = 500;
const BATCH_SIZE = 25;
const PER_PAGE = 15;

let proyekId = null;
let proyek = null;
let penerima = [];
let searchTerm = '';
let currentPage = 1;
let kirimEmail = false;
let tpl = { default: '', narasumber: { on: false, link: '' }, fasilitator: { on: false, link: '' } };
let driveFolder = '';
let _pending = {};
let _saveTimer = null;

/* ============================================================
   INIT
   ============================================================ */
function initSertifikat(user) {
  proyekId = new URLSearchParams(location.search).get('id');
  if (!proyekId) {
    showToast('Proyek tidak ditemukan', 'error');
    setTimeout(() => location.href = 'sertifikat.html', 1200);
    return;
  }
  loadAll();
}

async function loadAll() {
  try {
    const rows = await (await sb(`sertifikat_proyek?id=eq.${proyekId}&select=*`)).json();
    if (!rows.length) {
      showToast('Proyek tidak ditemukan', 'error');
      setTimeout(() => location.href = 'sertifikat.html', 1200);
      return;
    }
    proyek = rows[0];
  } catch (e) { showToast('Gagal memuat proyek', 'error'); return; }

  fillHeader();
  restoreSettings();
  bindEmailFields();
  await loadPenerima();

  // reveal langkah sesuai data
  revealStep('step2');
  if (penerima.length) revealStep('step3');
  maybeRevealStep4();

  const adaPdf = penerima.some(p => p.pdf === 'sudah');
  if (adaPdf || proyek.status !== 'draft') {
    revealStep('step4'); showHasilActions(); showEmailToggleRow();
  }
  if (kirimEmail) {
    document.getElementById('emailToggle').classList.add('on');
    showEmailToggleRow();
    revealStep('step5');
  }
}

/* ---- Header ---- */
function fillHeader() {
  document.getElementById('phNama').textContent = proyek.nama || 'Tanpa nama';
  document.getElementById('phKegiatan').textContent = proyek.kegiatan_nama || 'Tanpa kegiatan';
  setStatusBadge(proyek.status);
  if (typeof setTopbarTitle === 'function') setTopbarTitle('Sertifikat');
}
function setStatusBadge(s) {
  const map = { draft: ['draft', 'Draft'], proses: ['proses', 'Proses'], selesai: ['selesai', 'Selesai'] };
  const [cls, txt] = map[s] || map.draft;
  const el = document.getElementById('phStatus');
  el.className = 'status-badge ' + cls; el.textContent = txt;
}

/* ---- Restore setting ---- */
function restoreSettings() {
  driveFolder = proyek.drive_folder_url || '';
  document.getElementById('inputDrive').value = driveFolder;
  tpl.default = proyek.template_default || '';
  document.getElementById('inputSlideDefault').value = tpl.default;
  tpl.narasumber  = { on: !!proyek.template_narasumber,  link: proyek.template_narasumber  || '' };
  tpl.fasilitator = { on: !!proyek.template_fasilitator, link: proyek.template_fasilitator || '' };
  kirimEmail = !!proyek.email_aktif;
  if (proyek.email_subject != null) document.getElementById('emailSubject').value = proyek.email_subject;
  if (proyek.email_body != null)    document.getElementById('emailBody').value = proyek.email_body;
}
function bindEmailFields() {
  document.getElementById('emailSubject').addEventListener('input', e => saveProyek({ email_subject: e.target.value }));
  document.getElementById('emailBody').addEventListener('input', e => saveProyek({ email_body: e.target.value }));
}

/* ============================================================
   PENERIMA — load & seed
   ============================================================ */
async function loadPenerima() {
  document.getElementById('rcpTbody').innerHTML =
    '<tr><td colspan="11" class="td-empty">Memuat penerima…</td></tr>';
  try {
    let rows = await (await sb(`sertifikat_penerima?proyek_id=eq.${proyekId}&select=*&order=id`)).json();
    if (!rows.length && proyek.source === 'kegiatan' && proyek.kegiatan_id) {
      rows = await seedPenerima();
    }
    penerima = rows.map(normalisasi);
  } catch (e) { showToast('Gagal memuat penerima', 'error'); penerima = []; }
  sortPenerima(); renderPenerima(); renderOverride();
}

async function seedPenerima() {
  const join = await (await sb(
    `kegiatan_peserta?kegiatan_id=eq.${proyek.kegiatan_id}&select=peserta(id,nama,instansi,provinsi,kabkota,email)`
  )).json();
  const baris = (Array.isArray(join) ? join : [])
    .map(j => j.peserta).filter(Boolean)
    .map(p => ({
      proyek_id: Number(proyekId), user_id: p.id,
      nama: p.nama || '', instansi: p.instansi || '', provinsi: p.provinsi || '',
      kabupaten_kota: p.kabkota || '', email: p.email || '', peran: 'peserta'
    }));
  if (!baris.length) return [];
  const res = await sb('sertifikat_penerima', { method: 'POST', body: JSON.stringify(baris) });
  return await res.json();
}

function normalisasi(r) {
  return {
    id: r.id, user_id: r.user_id,
    nama: r.nama || '', instansi: r.instansi || '', provinsi: r.provinsi || '',
    kabupaten_kota: r.kabupaten_kota || '', email: r.email || '', peran: r.peran || 'peserta',
    pdf: r.pdf_status || 'belum', pdf_url: r.pdf_url || '', email_status: r.email_status || 'belum'
  };
}

/* ============================================================
   PENERIMA — render + paginasi
   ============================================================ */
function sortPenerima() {
  penerima.sort((a, b) => {
    const pa = PERAN_ORDER[a.peran] ?? 9, pb = PERAN_ORDER[b.peran] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.nama.localeCompare(b.nama, 'id');
  });
}
function filterPenerima() {
  searchTerm = (document.getElementById('rcpSearch').value || '').toLowerCase().trim();
  currentPage = 1;
  renderPenerima();
}

function renderPenerima() {
  const tb = document.getElementById('rcpTbody');
  document.getElementById('rcpCount').textContent = penerima.length;

  if (!penerima.length) {
    tb.innerHTML = '<tr><td colspan="11" class="td-empty">Belum ada penerima.</td></tr>';
    hidePagination(); return;
  }
  const rows = searchTerm ? penerima.filter(p => p.nama.toLowerCase().includes(searchTerm)) : penerima;
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="11" class="td-empty">Tidak ada nama cocok dengan "${escapeHtml(searchTerm)}".</td></tr>`;
    hidePagination(); return;
  }

  const totalPages = Math.ceil(rows.length / PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const start = (currentPage - 1) * PER_PAGE;
  const pageRows = rows.slice(start, start + PER_PAGE);

  tb.innerHTML = pageRows.map((p, i) => `
    <tr>
      <td>${start + i + 1}</td>
      <td class="td-nama td-truncate" title="${escapeHtml(p.nama)}">${escapeHtml(p.nama) || '<span style="color:var(--text-faint)">—</span>'}</td>
      <td class="td-truncate" title="${escapeHtml(p.instansi)}">${escapeHtml(p.instansi)}</td>
      <td class="td-truncate" title="${escapeHtml(p.provinsi)}">${escapeHtml(p.provinsi)}</td>
      <td class="td-truncate" title="${escapeHtml(p.kabupaten_kota)}">${escapeHtml(p.kabupaten_kota)}</td>
      <td class="td-truncate" title="${escapeHtml(p.email)}">${escapeHtml(p.email) || '<span style="color:var(--danger)">tanpa email</span>'}</td>
      <td>
        <select class="peran-select ${p.peran}" onchange="ubahPeran(${p.id}, this.value)">
          <option value="peserta" ${p.peran === 'peserta' ? 'selected' : ''}>Peserta</option>
          <option value="fasilitator" ${p.peran === 'fasilitator' ? 'selected' : ''}>Fasilitator</option>
          <option value="narasumber" ${p.peran === 'narasumber' ? 'selected' : ''}>Narasumber</option>
        </select>
      </td>
      <td>${badgePdf(p.pdf)}</td>
      <td>${badgeEmail(p)}</td>
      <td>${p.pdf_url
        ? `<a class="pdf-link" href="${escapeHtml(p.pdf_url)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Lihat</a>`
        : '<span style="color:var(--text-faint)">—</span>'}</td>
      <td>
        <button class="icon-btn" title="Hapus" onclick="hapusPenerima(${p.id})">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </td>
    </tr>`).join('');

  renderPagination(rows.length, totalPages);
}

function renderPagination(total, totalPages) {
  const wrap = document.getElementById('paginationWrap');
  if (totalPages <= 1) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  document.getElementById('paginationInfo').textContent =
    `Halaman ${currentPage} dari ${totalPages} · ${total} penerima`;
  let nav = `<button class="pg-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>`;
  getPageRange(currentPage, totalPages).forEach(p => {
    nav += p === '...'
      ? `<span style="display:flex;align-items:center;padding:0 4px;color:var(--text-faint);font-size:13px;">…</span>`
      : `<button class="pg-btn${p === currentPage ? ' active' : ''}" onclick="goToPage(${p})">${p}</button>`;
  });
  nav += `<button class="pg-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>`;
  document.getElementById('paginationNav').innerHTML = nav;
}
function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const r = [];
  if (current <= 4) { for (let i = 1; i <= 5; i++) r.push(i); r.push('...', total); }
  else if (current >= total - 3) { r.push(1, '...'); for (let i = total - 4; i <= total; i++) r.push(i); }
  else { r.push(1, '...', current - 1, current, current + 1, '...', total); }
  return r;
}
function goToPage(page) {
  currentPage = page;
  renderPenerima();
}
function hidePagination() { document.getElementById('paginationWrap').style.display = 'none'; }

function badgePdf(s) {
  const map = { belum: ['belum', 'Belum'], proses: ['proses', 'Proses'], sudah: ['sudah', 'Jadi'], gagal: ['gagal', 'Gagal'] };
  const [cls, txt] = map[s] || map.belum;
  return `<span class="st-badge ${cls}">${txt}</span>`;
}
function badgeEmail(p) {
  if (!kirimEmail) return '<span class="st-badge na">—</span>';
  const map = { belum: ['belum', 'Belum'], proses: ['proses', 'Proses'], terkirim: ['sudah', 'Terkirim'], gagal: ['gagal', 'Gagal'] };
  const [cls, txt] = map[p.email_status] || map.belum;
  return `<span class="st-badge ${cls}">${txt}</span>`;
}

async function ubahPeran(id, val) {
  const p = penerima.find(x => x.id === id);
  if (!p) return;
  p.peran = val;
  sortPenerima(); renderPenerima(); renderOverride();
  try { await sb(`sertifikat_penerima?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ peran: val }) }); }
  catch (e) { showToast('Gagal simpan peran', 'error'); }
}
async function hapusPenerima(id) {
  try { await sb(`sertifikat_penerima?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' }); }
  catch (e) { showToast('Gagal hapus penerima', 'error'); return; }
  penerima = penerima.filter(x => x.id !== id);
  renderPenerima(); renderOverride();
}
/* ============================================================
   TAMBAH PESERTA (dari database peserta / input manual)
   ============================================================ */
let searchHits = [];
let _cariTimer = null;

function tambahPenerima() {
  setTambahMode('db');
  document.getElementById('searchPeserta').value = '';
  document.getElementById('searchResults').innerHTML =
    '<div class="sr-hint">Ketik minimal 2 huruf untuk mencari nama atau NIK.</div>';
  ['mNama', 'mInstansi', 'mProvinsi', 'mKabkota', 'mEmail'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('mPeran').value = 'peserta';
  document.getElementById('tambahPesertaOverlay').classList.add('show');
}
function closeTambahPeserta() {
  document.getElementById('tambahPesertaOverlay').classList.remove('show');
}
function setTambahMode(mode) {
  const isDb = mode === 'db';
  document.getElementById('mtDb').classList.toggle('active', isDb);
  document.getElementById('mtManual').classList.toggle('active', !isDb);
  document.getElementById('modeDb').style.display = isDb ? '' : 'none';
  document.getElementById('modeManualForm').style.display = isDb ? 'none' : '';
  document.getElementById('btnSimpanManual').style.display = isDb ? 'none' : 'inline-flex';
}

function cariPeserta() {
  const term = document.getElementById('searchPeserta').value.trim();
  clearTimeout(_cariTimer);
  const box = document.getElementById('searchResults');
  if (term.length < 2) {
    box.innerHTML = '<div class="sr-hint">Ketik minimal 2 huruf untuk mencari nama atau NIK.</div>';
    return;
  }
  box.innerHTML = '<div class="sr-hint">Mencari…</div>';
  _cariTimer = setTimeout(async () => {
    try {
      const t = encodeURIComponent(term);
      const res = await sb(`peserta?or=(nama.ilike.*${t}*,nik.ilike.*${t}*)&select=id,nama,instansi,provinsi,kabkota,email&limit=25`);
      searchHits = await res.json();
      renderSearchResults();
    } catch (e) {
      box.innerHTML = '<div class="sr-hint">Gagal mencari peserta.</div>';
    }
  }, 350);
}

function renderSearchResults() {
  const box = document.getElementById('searchResults');
  if (!searchHits.length) { box.innerHTML = '<div class="sr-hint">Tidak ada peserta cocok.</div>'; return; }
  box.innerHTML = searchHits.map((p, i) => {
    const sudah = penerima.some(x => x.user_id === p.id);
    return `
      <div class="sr-row">
        <div class="sr-info">
          <div class="sr-name">${escapeHtml(p.nama) || '—'}</div>
          <div class="sr-sub">${escapeHtml([p.instansi, p.kabkota].filter(Boolean).join(' · ')) || '—'}</div>
        </div>
        ${sudah
          ? '<span class="sr-added">Sudah ada</span>'
          : `<button class="sr-add" onclick="addFromDb(${i})"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Tambah</button>`}
      </div>`;
  }).join('');
}

async function addFromDb(i) {
  const p = searchHits[i];
  if (!p || penerima.some(x => x.user_id === p.id)) return;
  const payload = {
    proyek_id: Number(proyekId), user_id: p.id,
    nama: p.nama || '', instansi: p.instansi || '', provinsi: p.provinsi || '',
    kabupaten_kota: p.kabkota || '', email: p.email || '', peran: 'peserta'
  };
  try {
    const [row] = await (await sb('sertifikat_penerima', { method: 'POST', body: JSON.stringify(payload) })).json();
    penerima.push(normalisasi(row));
    sortPenerima(); renderPenerima(); renderOverride(); renderSearchResults();
    showToast(`${p.nama} ditambahkan`, 'success');
  } catch (e) { showToast('Gagal menambahkan', 'error'); }
}

async function simpanManual() {
  const nama = document.getElementById('mNama').value.trim();
  if (!nama) { showToast('Nama wajib diisi', 'error'); return; }
  const payload = {
    proyek_id: Number(proyekId), user_id: null, nama,
    instansi: document.getElementById('mInstansi').value.trim(),
    provinsi: document.getElementById('mProvinsi').value.trim(),
    kabupaten_kota: document.getElementById('mKabkota').value.trim(),
    email: document.getElementById('mEmail').value.trim(),
    peran: document.getElementById('mPeran').value
  };
  const btn = document.getElementById('btnSimpanManual');
  btn.disabled = true;
  try {
    const [row] = await (await sb('sertifikat_penerima', { method: 'POST', body: JSON.stringify(payload) })).json();
    penerima.push(normalisasi(row));
    sortPenerima(); renderPenerima(); renderOverride();
    closeTambahPeserta();
    showToast(`${nama} ditambahkan`, 'success');
  } catch (e) { showToast('Gagal menambahkan', 'error'); }
  finally { btn.disabled = false; }
}

/* ============================================================
   TEMPLATE & FOLDER + override per peran (autosave)
   ============================================================ */
function renderOverride() {
  const area = document.getElementById('overrideArea');
  if (!area) return;
  const adaNarsum = penerima.some(p => p.peran === 'narasumber');
  const adaFasil  = penerima.some(p => p.peran === 'fasilitator');
  if (!adaNarsum && !adaFasil) {
    area.innerHTML = `
      <div class="tpl-override-note">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Semua penerima berperan <strong>peserta</strong> — cukup satu template default di atas.</span>
      </div>`;
    return;
  }
  let html = '<div style="font-size:11.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-soft);margin-bottom:6px;">Template Khusus per Peran (opsional)</div>';
  if (adaNarsum) html += blokOverride('narasumber', 'Narasumber');
  if (adaFasil)  html += blokOverride('fasilitator', 'Fasilitator');
  area.innerHTML = html;
}
function blokOverride(peran, label) {
  const o = tpl[peran];
  return `
    <div class="ov-row">
      <button class="toggle-track ${o.on ? 'on' : ''}" onclick="toggleTpl('${peran}')"><span class="toggle-thumb"></span></button>
      <span class="toggle-label">Pakai template khusus untuk</span>
      <span class="ov-badge ${peran}">${label}</span>
    </div>
    <div class="field ov-link ${o.on ? '' : 'hidden'}" id="ovLink-${peran}">
      <input type="text" value="${escapeAttr(o.link)}" placeholder="https://docs.google.com/presentation/d/..."
             oninput="onOvLinkInput('${peran}', this.value)">
      <div class="field-hint">Kalau dikosongkan, ${label.toLowerCase()} ikut template default.</div>
    </div>`;
}
function toggleTpl(peran) {
  tpl[peran].on = !tpl[peran].on;
  renderOverride();
  saveProyek({ ['template_' + peran]: (tpl[peran].on && tpl[peran].link.trim()) ? tpl[peran].link.trim() : null });
}
function onOvLinkInput(peran, val) {
  tpl[peran].link = val;
  saveProyek({ ['template_' + peran]: (tpl[peran].on && val.trim()) ? val.trim() : null });
}
function onDriveInput() {
  driveFolder = document.getElementById('inputDrive').value;
  saveProyek({ drive_folder_url: driveFolder });
  maybeRevealStep4();
}
function onDefaultTplInput() {
  tpl.default = document.getElementById('inputSlideDefault').value;
  saveProyek({ template_default: tpl.default });
  maybeRevealStep4();
}
function maybeRevealStep4() {
  if (driveFolder.trim() && tpl.default.trim()) revealStep('step4');
}
function templateFor(peran) {
  const o = tpl[peran];
  if (o && o.on && o.link.trim()) return o.link.trim();
  return tpl.default.trim();
}

function saveProyek(partial) {
  Object.assign(proyek, partial);
  Object.assign(_pending, partial);
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSave, 600);
}
async function flushSave() {
  if (!Object.keys(_pending).length) return;
  const body = _pending; _pending = {};
  try { await sb(`sertifikat_proyek?id=eq.${proyekId}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify(body) }); }
  catch (e) { showToast('Gagal menyimpan setting', 'error'); }
}

/* ============================================================
   CEK PLACEHOLDER & LIHAT SAMPEL (butuh GAS — stub dulu)
   ============================================================ */
function cekPlaceholder() {
  if (!tpl.default.trim()) { showToast('Isi link Google Slides dulu', 'error'); return; }
  // >>> SAMBUNG GAS: buka Slides → kembalikan daftar placeholder yang ada.
  showToast('Cek placeholder butuh Apps Script (menyusul)', '');
}
function lihatSampel() {
  if (!tpl.default.trim()) { showToast('Isi link Google Slides dulu', 'error'); return; }
  if (!penerima.length) { showToast('Belum ada penerima', 'error'); return; }
  // >>> SAMBUNG GAS: bikin 1 PDF contoh dari penerima pertama → buka preview.
  showToast('Preview sampel butuh Apps Script (menyusul)', '');
}

/* ============================================================
   EMAIL toggle (muncul setelah PDF jadi)
   ============================================================ */
function showEmailToggleRow() {
  const el = document.getElementById('emailToggleRow');
  if (el) el.style.display = 'flex';
}
function toggleEmail() {
  kirimEmail = !kirimEmail;
  document.getElementById('emailToggle').classList.toggle('on', kirimEmail);
  if (kirimEmail) revealStep('step5');
  else document.getElementById('step5').classList.add('step-hidden');
  saveProyek({ email_aktif: kirimEmail });
  renderPenerima();
}

/* ============================================================
   PROSES — TAHAP 1: BUAT PDF (status dipersist per batch)
   ============================================================ */
async function prosesGenerate() {
  if (!validasi()) return;
  const btnGen = document.getElementById('btnGenerate');
  btnGen.disabled = true;
  await saveStatusProyek('proses');
  showProgress('gen', 'Membuat PDF…');

  const total = penerima.length;
  let done = 0;
  for (let s = 0; s < total; s += BATCH_SIZE) {
    const batch = penerima.slice(s, s + BATCH_SIZE);
    // >>> SAMBUNG GAS: kirim batch (template per peran via templateFor(p.peran))
    for (const p of batch) {
      await delay(120);
      p.pdf = 'sudah';
      p.pdf_url = driveFolder;     // simulasi; nanti URL PDF asli dari GAS
      done++;
      updateProgress('gen', done, total);
      renderPenerima();
    }
    await simpanBatchPdf(batch);
  }

  finishProgress('gen', `${done} PDF dibuat & tersimpan di folder Drive.`, false);
  showHasilActions();
  showEmailToggleRow();
  if (kirimEmail) revealStep('step5');
  await saveStatusProyek('selesai');
  btnGen.disabled = false;
  showToast(`${done} PDF selesai dibuat`, 'success');
}
async function simpanBatchPdf(batch) {
  try {
    await Promise.all(batch.map(p =>
      sb(`sertifikat_penerima?id=eq.${p.id}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ pdf_status: p.pdf, pdf_url: p.pdf_url }) })
    ));
  } catch (e) { /* lanjut */ }
}

/* ============================================================
   PROSES — TAHAP 2: KIRIM EMAIL
   ============================================================ */
async function prosesKirim() {
  if (!kirimEmail) return;
  const target = penerima.filter(p => p.pdf === 'sudah' && p.email && p.email_status !== 'terkirim');
  if (!target.length) { showToast('Tidak ada yang perlu dikirim', ''); return; }
  const btnSend = document.getElementById('btnSend');
  btnSend.disabled = true;
  showProgress('kirim', 'Mengirim email…');

  const batas = Math.min(target.length, EMAIL_LIMIT_HARIAN);
  let sent = 0;
  for (const p of target) {
    if (sent >= EMAIL_LIMIT_HARIAN) continue;
    p.email_status = 'proses'; renderPenerima();
    await delay(90);
    // >>> SAMBUNG GAS: kirim email + lampiran PDF
    p.email_status = 'terkirim'; sent++;
    await sb(`sertifikat_penerima?id=eq.${p.id}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ email_status: 'terkirim' }) }).catch(() => {});
    updateProgress('kirim', sent, batas);
    renderPenerima();
  }
  const sisa = target.length - sent;
  if (sisa > 0) finishProgress('kirim', `${sent} email terkirim. Batas ${EMAIL_LIMIT_HARIAN}/hari tercapai — ${sisa} sisanya bisa dikirim lagi besok.`, true);
  else finishProgress('kirim', `${sent} email berhasil terkirim.`, false);
  btnSend.disabled = false;
  showToast(`${sent} email terkirim`, 'success');
}

async function saveStatusProyek(st) {
  proyek.status = st; setStatusBadge(st);
  try { await sb(`sertifikat_proyek?id=eq.${proyekId}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ status: st }) }); }
  catch (e) { /* diamkan */ }
}

function validasi() {
  if (!driveFolder.trim()) { showToast('Folder Drive belum diisi', 'error'); return false; }
  if (!tpl.default.trim()) { showToast('Template default belum diisi', 'error'); return false; }
  if (!penerima.length) { showToast('Belum ada penerima', 'error'); return false; }
  const peranAda = [...new Set(penerima.map(p => p.peran))];
  const kurang = peranAda.filter(pr => !templateFor(pr));
  if (kurang.length) { showToast('Template belum lengkap untuk: ' + kurang.join(', '), 'error'); return false; }
  return true;
}

/* ============================================================
   HASIL
   ============================================================ */
function showHasilActions() {
  const el = document.getElementById('hasilActions');
  if (el) el.style.display = 'flex';
}
function bukaFolder() {
  if (driveFolder.trim()) window.open(driveFolder.trim(), '_blank', 'noopener');
  else showToast('Folder Drive belum diisi', '');
}
function buatRekap() {
  // >>> SAMBUNG GAS: bikin Google Sheet rekap di folder tujuan
  showToast('Rekap Google Sheet butuh Apps Script (menyusul)', '');
}

/* ============================================================
   PROGRESS UI (scope: 'gen' | 'kirim')
   ============================================================ */
function pid(scope, base) { return scope === 'kirim' ? base + 'K' : base; }
function showProgress(scope, label) {
  const w = document.getElementById(pid(scope, 'progressWrap'));
  w.classList.add('show');
  document.getElementById(pid(scope, 'progressLabel')).textContent = label;
  const note = document.getElementById(pid(scope, 'progressNote'));
  note.textContent = ''; note.classList.remove('warn');
  document.getElementById(pid(scope, 'progressFill')).classList.remove('done');
  updateProgress(scope, 0, penerima.length || 1);
}
function updateProgress(scope, done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById(pid(scope, 'progressFill')).style.width = pct + '%';
  document.getElementById(pid(scope, 'progressCount')).textContent = `${done} / ${total}`;
}
function finishProgress(scope, note, warn) {
  document.getElementById(pid(scope, 'progressFill')).classList.add('done');
  document.getElementById(pid(scope, 'progressLabel')).textContent = 'Selesai';
  const n = document.getElementById(pid(scope, 'progressNote'));
  n.textContent = note; n.classList.toggle('warn', !!warn);
}

/* ============================================================
   HELPERS
   ============================================================ */
function revealStep(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('step-hidden');
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}
