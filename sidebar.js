// ─── SIDEBAR ───
// Dipanggil dari auth.js setelah currentUser tersedia.
function initSidebar(user) {
  const isAdmin    = user.role === 'administrator';
  const isKeuangan = user.role === 'keuangan';

  // Role-based nav visibility — berlaku di semua halaman
  const navPengaturan = document.getElementById('navPengaturan');
  const navKontak     = document.getElementById('navKontak');
  if (navPengaturan) navPengaturan.style.display = isAdmin    ? 'flex' : 'none';
  if (navKontak)     navKontak.style.display     = isKeuangan ? 'none' : 'flex';

  // User pill di topbar — diisi di sini supaya tidak perlu diulang per halaman
  const roleLabels = { administrator: 'Administrator', operator: 'Operator', keuangan: 'Keuangan' };
  const roleLabel  = roleLabels[user.role] || user.role;
  const elPill     = document.getElementById('pillRoleLabel');
  if (elPill) elPill.textContent = roleLabel;

  // Tandai nav aktif berdasarkan nama file HTML saat ini
  const page = _currentPageId();
  if (page) setActiveNav(page);
}

// Deteksi halaman aktif dari nama file di URL
function _currentPageId() {
  const map = {
    'kegiatan.html':    'Kegiatan',
    'datapeserta.html': 'Peserta',
    'kontak.html':      'Kontak',
    'pengaturan.html':  'Pengaturan',
  };
  const file = window.location.pathname.split('/').pop() || 'kegiatan.html';
  return map[file] || null;
}

function setActiveNav(pageId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav' + pageId);
  if (navEl) navEl.classList.add('active');
}

function setTopbarTitle(title) {
  const el = document.getElementById('topbarTitle');
  if (el) el.textContent = title;
}

// ─── MOBILE OPEN/CLOSE ───
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebarOverlay')?.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
  document.body.style.overflow = '';
}
