// ─── CONFIG ───
const SUPABASE_URL = 'https://lusytejskqevwyyffeue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1c3l0ZWpza3Fldnd5eWZmZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzUyODksImV4cCI6MjA5MTcxMTI4OX0.LKCfdnlB8TQTeB7NuZ1DXwSkCI9DK3WlD4xk-jzUTPU';

const DESIGN_MODE = false;

// ─── SUPABASE HELPER ───
const sb = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': opts.prefer || 'return=representation',
    ...(opts.headers || {})
  },
  ...opts
});

// ─── SHA-256 ───
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
