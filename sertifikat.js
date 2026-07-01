/* ============================================================
   sertifikat.js  —  Halaman DAFTAR PROYEK sertifikat
   Menampilkan list proyek + tambah proyek baru.
   Klik proyek → sertifikat-detail.html?id=<id>
   ============================================================ */

/* Set true setelah tabel Supabase dibuat & RLS siap. */
const USE_SUPABASE = true;

let proyekList = [];
let kegiatanOptions = [];
let selectedSource = 'kegiatan';
let currentUserInfo = null;

/* ============================================================
   INIT
   ============================================================ */
function initSertifikat(user) {
  currentUserInfo = namaUser(user);
  loadProyek();
}

/* Ambil nama tampilan dari objek user — coba beberapa field umum
   karena struktur user bisa beda tergantung sumbernya (Supabase Auth
   user_metadata, tabel profil custom, dst). Sesuaikan urutan di bawah
   kalau field nama aslinya bukan salah satu dari ini. */
function namaUser(user) {
  if (!user) return null;
  return user.nama_lengkap
    || user.nama
    || user.full_name
    || (user.user_metadata && (user.user_metadata.nama_lengkap || user.user_metadata.full_name || user.user_metadata.nama))
    || user.email
    || user.username
    || null;
}

/* ---- Muat daftar proyek ---- */
async function loadProyek() {
  const grid = document.getElementById('proyekGrid');
  grid.innerHTML = '<div class="loading-state">Memuat proyek…</div>';
  try {
    if (USE_SUPABASE) {
      const res = await sb('sertifikat_proyek?select=*&order=created_at.desc');
      proyekList = await res.json();
    } else {
      proyekList = contohProyek();
    }
  } catch (e) {
    showToast('Gagal memuat proyek', 'error');
    proyekList = [];
  }
  renderProyek();
}

function renderProyek() {
  const grid = document.getElementById('proyekGrid');
  document.getElementById('proyekCount').textContent = proyekList.length;

  if (!proyekList.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        </div>
        <div class="empty-title">Belum ada proyek sertifikat</div>
        <div class="empty-sub">Buat proyek pertamamu — pilih kegiatan, atur template, lalu proses sertifikatnya.</div>
        <button class="btn-primary" onclick="openTambahProyek()" style="display:inline-flex;">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Proyek
        </button>
      </div>`;
    return;
  }

  grid.innerHTML = proyekList.map(p => {
    const drive = (p.drive_folder_url || '').trim();
    return `
    <div class="proyek-row" onclick="bukaProyek('${p.id}')">
      <div class="proyek-row-main">
        <div class="proyek-title">${escapeHtml(p.nama)}</div>
        <div class="proyek-keg">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${escapeHtml(p.kegiatan_nama) || 'tanpa kegiatan'}
        </div>
      </div>
      <div class="proyek-row-meta">
        <span class="proyek-meta-item"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(p.dibuat_oleh) || '—'}</span>
        <span class="proyek-meta-item"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatTgl(p.created_at)}</span>
        ${badgeStatus(p.status)}
      </div>
      <div class="row-actions" onclick="event.stopPropagation()">
        ${drive
          ? `<a class="row-act row-act-drive" href="${escapeAttr(drive)}" target="_blank" rel="noopener" title="Buka folder Drive">${driveLogoSvg()}</a>`
          : `<span class="row-act row-act-drive disabled" title="Folder Drive belum diatur">${driveLogoSvg()}</span>`}
        <button class="row-act" onclick="editProyek('${p.id}')" title="Edit nama"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
        <button class="row-act del" onclick="hapusProyek('${p.id}')" title="Hapus proyek"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
      </div>
    </div>`;
  }).join('');
}

/* Logo Google Drive resmi (multi-warna). Dipakai apa adanya —
   fill tiap path sudah eksplisit jadi tidak kena style stroke abu-abu
   dari .row-act svg (lihat class .row-act-drive di CSS/inline style). */
function driveLogoSvg() {
  return `<svg viewBox="0 0 87.3 78" style="width:16px;height:16px;stroke:none">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>`;
}

function badgeStatus(s) {
  const map = { draft: ['draft','Draft'], proses: ['proses','Proses'], selesai: ['selesai','Selesai'] };
  const [cls, txt] = map[s] || map.draft;
  return `<span class="status-badge ${cls}">${txt}</span>`;
}

function bukaProyek(id) {
  const p = proyekList.find(x => String(x.id) === String(id));
  if (!p) return;
  if (p.source === 'manual') {
    window.location.href = `sertifikat-manual.html?id=${id}`;
  } else {
    window.location.href = `sertifikat-detail.html?id=${id}`;
  }
}

/* ============================================================
   EDIT & HAPUS PROYEK
   ============================================================ */
let editId = null;
let hapusId = null;

function editProyek(id) {
  const p = proyekList.find(x => String(x.id) === String(id));
  if (!p) return;
  editId = id;
  document.getElementById('editNamaProyek').value = p.nama || '';
  document.getElementById('editOverlay').classList.add('show');
}
function closeEditProyek() {
  document.getElementById('editOverlay').classList.remove('show');
  editId = null;
}
async function simpanEditProyek() {
  const nama = document.getElementById('editNamaProyek').value.trim();
  if (!nama) { showToast('Nama tidak boleh kosong', 'error'); return; }
  const btn = document.getElementById('btnSimpanEdit');
  btn.disabled = true;
  try {
    await sb(`sertifikat_proyek?id=eq.${editId}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ nama }) });
    const p = proyekList.find(x => String(x.id) === String(editId));
    if (p) p.nama = nama;
    renderProyek();
    closeEditProyek();
    showToast('Nama proyek diperbarui', 'success');
  } catch (e) { showToast('Gagal menyimpan', 'error'); }
  finally { btn.disabled = false; }
}

function hapusProyek(id) {
  const p = proyekList.find(x => String(x.id) === String(id));
  if (!p) return;
  hapusId = id;
  document.getElementById('hapusNama').textContent = p.nama || 'proyek ini';
  document.getElementById('hapusOverlay').classList.add('show');
}
function closeHapus() {
  document.getElementById('hapusOverlay').classList.remove('show');
  hapusId = null;
}
async function doHapusProyek() {
  const btn = document.getElementById('btnConfirmHapus');
  btn.disabled = true;
  try {
    await sb(`sertifikat_proyek?id=eq.${hapusId}`, { method: 'DELETE', prefer: 'return=minimal' });
    proyekList = proyekList.filter(x => String(x.id) !== String(hapusId));
    renderProyek();
    closeHapus();
    showToast('Proyek dihapus', 'success');
  } catch (e) { showToast('Gagal menghapus', 'error'); }
  finally { btn.disabled = false; }
}

/* ============================================================
   TAMBAH PROYEK
   ============================================================ */
async function openTambahProyek() {
  document.getElementById('inputNamaProyek').value = '';
  pilihSource('kegiatan');
  document.getElementById('tambahOverlay').classList.add('show');

  // muat opsi kegiatan (sekali)
  if (!kegiatanOptions.length) await loadKegiatanOptions();
  const sel = document.getElementById('selectKegiatan');
  sel.innerHTML = '<option value="">— Pilih kegiatan —</option>' +
    kegiatanOptions.map(k =>
      `<option value="${k.id}" data-nama="${escapeAttr(k.nama)}">${escapeHtml(k.nama)}</option>`
    ).join('');
}

function closeTambahProyek() {
  document.getElementById('tambahOverlay').classList.remove('show');
}

function pilihSource(src) {
  selectedSource = src;
  document.getElementById('srcKegiatan').classList.toggle('active', src === 'kegiatan');
  document.getElementById('srcManual').classList.toggle('active', src === 'manual');
  document.getElementById('fieldKegiatan').style.display = src === 'kegiatan' ? '' : 'none';
}

async function loadKegiatanOptions() {
  try {
    if (USE_SUPABASE) {
      // tanggal nyelip di dalam nama_kegiatan (format "[8-10 Juni 2026] ...")
      const res = await sb('kegiatan?select=id,nama_kegiatan,aktif&order=created_at.desc');
      const rows = await res.json();
      kegiatanOptions = rows.map(r => ({ id: r.id, nama: r.nama_kegiatan }));
    } else {
      kegiatanOptions = contohKegiatan();
    }
  } catch (e) {
    showToast('Gagal memuat kegiatan', 'error');
    kegiatanOptions = [];
  }
}

async function buatProyek() {
  const nama = document.getElementById('inputNamaProyek').value.trim();
  if (!nama) { showToast('Nama proyek belum diisi', 'error'); return; }

  const sel = document.getElementById('selectKegiatan');
  const kegId = sel.value;
  if (selectedSource === 'kegiatan' && !kegId) { showToast('Pilih kegiatan dulu', 'error'); return; }

  const opt = sel.selectedOptions[0];
  const payload = {
    nama,
    source: selectedSource,
    kegiatan_id: selectedSource === 'kegiatan' ? (kegId || null) : null,
    kegiatan_nama: selectedSource === 'kegiatan' ? (opt ? opt.dataset.nama : null) : null,
    kegiatan_tanggal: null,
    status: 'draft',
    dibuat_oleh: currentUserInfo
  };

  const btn = document.getElementById('btnBuatProyek');
  btn.disabled = true;
  try {
    if (USE_SUPABASE) {
      const res = await sb('sertifikat_proyek', { method: 'POST', body: JSON.stringify(payload) });
      const [row] = await res.json();
      // arahkan sesuai source
      if (selectedSource === 'manual') {
        window.location.href = `sertifikat-manual.html?id=${row.id}`;
      } else {
        window.location.href = `sertifikat-detail.html?id=${row.id}`;
      }
    } else {
      showToast('Proyek dibuat (mode contoh)', 'success');
      closeTambahProyek();
      proyekList.unshift({ id: 'baru', ...payload, jumlah: 0, created_at: new Date().toISOString() });
      renderProyek();
    }
  } catch (e) {
    showToast('Gagal membuat proyek', 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
function formatTgl(tgl) {
  if (!tgl) return '—';
  const d = new Date(tgl);
  if (isNaN(d)) return tgl;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}

/* ============================================================
   DATA CONTOH (USE_SUPABASE = false)
   ============================================================ */
function contohProyek() {
  return [
    { id: '1', nama: 'Sertifikat IHT Kurikulum Bandung', kegiatan_nama: 'IHT Penguatan Kurikulum SMA — Bandung', kegiatan_tanggal: '2026-06-12', status: 'proses', dibuat_oleh: 'Arso Agung', created_at: '2026-06-10' },
    { id: '2', nama: 'Sertifikat Bimtek PID Surabaya', kegiatan_nama: 'Bimtek Papan Interaktif Digital — Surabaya', kegiatan_tanggal: '2026-05-28', status: 'selesai', dibuat_oleh: 'Arso Agung', created_at: '2026-05-30' },
    { id: '3', nama: 'Sertifikat Koordinasi Sekolah Model', kegiatan_nama: 'Koordinasi Sekolah Model 2026 — Makassar', kegiatan_tanggal: '2026-04-15', status: 'draft', dibuat_oleh: 'Tim Kerja', created_at: '2026-06-01' }
  ];
}
function contohKegiatan() {
  return [
    { id: 'k1', tanggal: '2026-06-12', nama: 'IHT Penguatan Kurikulum SMA — Bandung' },
    { id: 'k2', tanggal: '2026-05-28', nama: 'Bimtek Papan Interaktif Digital — Surabaya' },
    { id: 'k3', tanggal: '2026-04-15', nama: 'Koordinasi Sekolah Model 2026 — Makassar' }
  ];
}
