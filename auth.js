// ─── STATE ───
let currentUser = null;

// ─── INIT ───
// Dipanggil otomatis saat halaman load.
// Tiap halaman bisa definisikan window.onAppReady(user) untuk logika spesifik halaman.
window.onload = () => {
  if (DESIGN_MODE) {
    currentUser = { id: 0, username: 'design', nama_lengkap: 'Design Preview', role: 'administrator' };
    document.body.style.visibility = 'visible';
    _initSharedUI();
    if (typeof onAppReady === 'function') onAppReady(currentUser);
    return;
  }

  const saved = localStorage.getItem('adminUser');
  if (saved) {
    try { currentUser = JSON.parse(saved); }
    catch { localStorage.clear(); window.location.href = 'login.html'; return; }
  } else {
    window.location.href = 'login.html';
    return;
  }

  document.body.style.visibility = 'visible';
  _initSharedUI();
  if (typeof onAppReady === 'function') onAppReady(currentUser);
};

// Inisialisasi elemen UI yang sama di semua halaman (sidebar user info, topbar pill)
function _initSharedUI() {
  document.getElementById('app')?.classList.add('visible');

  const roleLabels = { administrator: 'Administrator', operator: 'Operator', keuangan: 'Keuangan' };
  const roleLabel = roleLabels[currentUser.role] || currentUser.role;

  const elName = document.getElementById('sidebarUserName');
  const elRole = document.getElementById('sidebarUserRole');
  const elPill = document.getElementById('pillRoleLabel');

  if (elName) elName.textContent = currentUser.nama_lengkap || currentUser.username;
  if (elRole) elRole.textContent = roleLabel;
  if (elPill) elPill.textContent = roleLabel;

  initSidebar(currentUser);
}

// ─── LOGOUT ───
function doLogout() {
  localStorage.clear();
  window.location.href = 'login.html';
}
