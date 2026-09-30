import { apiRequest, showToast } from './api.js';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('tribalscholar_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem('tribalscholar_token');
}

export function isAuthenticated() {
  return !!getStoredToken();
}

export function requireAuth(allowedRoles = []) {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return false;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    showToast(`Access restricted to [${allowedRoles.join(', ')}].`, 'error');
    if (user.role === 'student') window.location.href = '/dashboard.html';
    else if (user.role === 'institute') window.location.href = '/institute/dashboard.html';
    else if (user.role === 'admin' || user.role === 'super_admin') window.location.href = '/admin/dashboard.html';
    return false;
  }

  return true;
}

export async function loginUser(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.success && data.token) {
    localStorage.setItem('tribalscholar_token', data.token);
    localStorage.setItem('tribalscholar_user', JSON.stringify(data.user));
    showToast(`Welcome back, ${data.user.full_name}!`, 'success');

    setTimeout(() => {
      if (data.user.role === 'institute') {
        window.location.href = '/institute/dashboard.html';
      } else if (data.user.role === 'admin' || data.user.role === 'super_admin') {
        window.location.href = '/admin/dashboard.html';
      } else {
        window.location.href = '/dashboard.html';
      }
    }, 600);
  }
  return data;
}

export async function logoutUser() {
  try {
    await apiRequest('/auth/logout', { method: 'POST', silent: true });
  } catch (e) {
    // ignore
  }
  localStorage.removeItem('tribalscholar_token');
  localStorage.removeItem('tribalscholar_user');
  showToast('Logged out successfully.', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 400);
}

// Quick Demo Login helper for hackathon live demo flow
export async function quickDemoLogin(role) {
  const demoCredentials = {
    student: { email: 'student@example.com', pass: 'password123' },
    institute: { email: 'institute@example.com', pass: 'password123' },
    admin: { email: 'admin@example.com', pass: 'password123' },
  };

  const cred = demoCredentials[role] || demoCredentials.student;
  return loginUser(cred.email, cred.pass);
}

// Update UI Navigation Bar & Build Responsive Mobile Navigation
export function updateNavbarUser() {
  const user = getStoredUser();
  const authNav = document.getElementById('nav-auth-container');

  let portalLink = '/dashboard.html';
  let roleBadge = 'Student';
  if (user) {
    if (user.role === 'institute') {
      portalLink = '/institute/dashboard.html';
      roleBadge = 'Institute Nodal Officer';
    } else if (user.role === 'admin' || user.role === 'super_admin') {
      portalLink = '/admin/dashboard.html';
      roleBadge = 'Welfare Admin';
    }
  }

  // Ensure nav links container has class nav-desktop-menu
  document.querySelectorAll('.main-header nav, header nav').forEach(nav => {
    if (!nav.classList.contains('nav-desktop-menu')) {
      nav.classList.add('nav-desktop-menu');
    }
  });

  if (authNav) {
    authNav.className = 'nav-actions-wrap';
    authNav.innerHTML = `
      <!-- Voice AI Header Button (both desktop & mobile) -->
      <button type="button" class="nav-voice-btn" id="nav-header-voice-btn" title="Talk to TribalScholar Voice AI (Vapi)">
        <span>🎙️</span>
        <span class="nav-voice-text"><span class="nav-voice-full">Voice </span>AI</span>
      </button>

      <!-- Notification Bell -->
      <a href="/notifications.html" title="Notifications" class="btn btn-outline btn-sm nav-notif-btn" id="nav-header-notif-btn" aria-label="Notifications">
        <span>🔔</span>
        <span id="nav-notif-count" class="nav-notif-badge" style="display:none;">0</span>
      </a>

      <!-- Desktop Auth Items (strictly hidden on <= 992px) -->
      <div class="nav-desktop-auth">
        ${user ? `
          <a href="${portalLink}" class="btn btn-outline btn-sm nav-user-btn" title="Open Portal Dashboard">
            <span>👤</span>
            <span><strong>${user.full_name ? user.full_name.split(' ')[0] : 'User'}</strong> (${roleBadge})</span>
          </a>
          <button id="nav-logout-btn" class="btn btn-sm btn-outline nav-logout-btn" style="color:#b91c1c;border-color:#fca5a5;">
            Logout
          </button>
        ` : `
          <a href="/login.html" class="btn btn-outline btn-sm">Log In</a>
          <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
        `}
      </div>

      <!-- Mobile Hamburger Button (visible on <= 992px) -->
      <button type="button" class="nav-mobile-toggle" id="nav-hamburger-toggle" aria-label="Open Navigation Menu" title="Open Navigation Menu">
        ☰
      </button>
    `;

    // Logout listener
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logoutUser);
    }

    // Connect header Voice AI button to trigger Vapi call
    const headerVoiceBtn = document.getElementById('nav-header-voice-btn');
    if (headerVoiceBtn) {
      headerVoiceBtn.addEventListener('click', () => {
        const floatTrigger = document.getElementById('voice-call-trigger');
        if (floatTrigger) {
          floatTrigger.click();
        } else {
          // If drawer not yet initialized, open drawer
          const drawer = document.getElementById('ai-chat-drawer');
          if (drawer) drawer.classList.add('open');
        }
      });
    }

    // Fetch unread notifications count
    if (user) {
      apiRequest('/notifications', { silent: true })
        .then((data) => {
          if (data.success && data.unreadCount > 0) {
            const badge = document.getElementById('nav-notif-count');
            if (badge) {
              badge.innerText = data.unreadCount;
              badge.style.display = 'inline-block';
            }
          }
        })
        .catch(() => {});
    }
  }

  // Initialize or update Mobile Drawer
  initMobileDrawer(user, portalLink, roleBadge);
}

// Injects & Manages the Slide-Out Mobile Navigation Drawer
function initMobileDrawer(user, portalLink, roleBadge) {
  let drawer = document.getElementById('mobile-menu-drawer');
  let overlay = document.getElementById('mobile-menu-overlay');

  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'mobile-menu-drawer';
    drawer.className = 'mobile-menu-drawer';
    document.body.appendChild(drawer);

    overlay = document.createElement('div');
    overlay.id = 'mobile-menu-overlay';
    overlay.className = 'mobile-menu-overlay';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', closeMobileDrawer);
  }

  const currentPath = window.location.pathname;

  drawer.innerHTML = `
    <div class="mobile-drawer-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:800;background:var(--secondary);color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">TS</span>
        <h3>TribalScholar AI</h3>
      </div>
      <button type="button" class="mobile-drawer-close" id="mobile-drawer-close-btn" aria-label="Close Navigation Menu">&times;</button>
    </div>

    <!-- User Status Banner -->
    <div class="mobile-drawer-user">
      ${user ? `
        <div style="font-size:13px;font-weight:700;color:var(--text-main);margin-bottom:2px;">
          👤 ${user.full_name}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">
          Role: <span style="color:var(--primary);font-weight:600;">${roleBadge}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <a href="${portalLink}" class="btn btn-outline btn-sm" style="flex:1;font-size:11px;padding:4px 6px;">Portal Dashboard</a>
          <button type="button" id="mobile-drawer-logout-btn" class="btn btn-outline btn-sm" style="color:#b91c1c;border-color:#fca5a5;font-size:11px;padding:4px 6px;">Logout</button>
        </div>
      ` : `
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">
          Welcome to the Scheduled Tribe Scholarship Portal.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <a href="/login.html" class="btn btn-outline btn-sm" style="padding:6px;font-size:12px;">Sign In</a>
          <a href="/register.html" class="btn btn-primary btn-sm" style="padding:6px;font-size:12px;">Register</a>
        </div>
      `}
    </div>

    <!-- Navigation Links -->
    <ul class="mobile-drawer-links">
      <li><a href="/" class="${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}"><span>🏠</span> Home</a></li>
      <li><a href="/scholarships.html" class="${currentPath.includes('scholarship') && !currentPath.includes('Fellowship') ? 'active' : ''}"><span>🎓</span> Scholarships</a></li>
      <li><a href="/scholarships.html?scholarship_type=Fellowship"><span>🏛️</span> Fellowships</a></li>
      <li><a href="/dashboard.html" class="${currentPath.includes('dashboard') && !currentPath.includes('admin') && !currentPath.includes('institute') ? 'active' : ''}"><span>👨‍🎓</span> Student Dashboard</a></li>
      <li><a href="/profile.html" class="${currentPath.includes('profile') ? 'active' : ''}"><span>📝</span> My Profile</a></li>
      <li><a href="/applications.html" class="${currentPath.includes('application') ? 'active' : ''}"><span>📄</span> My Applications</a></li>
      <li><a href="/notifications.html" class="${currentPath.includes('notification') ? 'active' : ''}"><span>🔔</span> Notifications & Support</a></li>
      <li><a href="https://tribal.nic.in" target="_blank" rel="noopener"><span>ℹ️</span> About Ministry (MoTA)</a></li>
      <li><a href="/institute/dashboard.html" class="${currentPath.includes('institute') ? 'active' : ''}"><span>🏫</span> Institute Portal</a></li>
      <li><a href="/admin/dashboard.html" class="${currentPath.includes('admin') ? 'active' : ''}"><span>🏛️</span> Admin Command Center</a></li>
    </ul>

    <!-- Quick Voice Assistance Trigger -->
    <div style="padding:10px 16px;">
      <button type="button" class="btn btn-sm btn-primary" id="mobile-drawer-voice-btn" style="width:100%;background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <span>🎙️</span> Talk to Voice AI (Vapi)
      </button>
    </div>

    <!-- Mobile Drawer Actions: Theme & Demo Switcher -->
    <div class="mobile-drawer-actions">
      <!-- Portal Theme Select -->
      <div>
        <label for="mobile-drawer-theme-select" style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;">
          PORTAL THEME:
        </label>
        <select id="mobile-drawer-theme-select" class="form-select theme-preview-selector" style="font-size:12px;padding:6px 10px;">
          <option value="gov">Gov Standard</option>
          <option value="tribal">Tribal Heritage</option>
          <option value="contrast">High Contrast (A11y)</option>
        </select>
      </div>

      <!-- Quick Demo Switcher -->
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:6px;">
          SIH DEMO FAST LOGIN:
        </div>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;">
          <button type="button" class="demo-btn" data-demo-role="student">Student</button>
          <button type="button" class="demo-btn" data-demo-role="institute">Institute</button>
          <button type="button" class="demo-btn" data-demo-role="admin">Admin</button>
        </div>
      </div>
    </div>
  `;

  // Attach Close Button
  const closeBtn = document.getElementById('mobile-drawer-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeMobileDrawer);

  // Attach Hamburger Toggle
  const toggleBtn = document.getElementById('nav-hamburger-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', openMobileDrawer);

  // Attach Drawer Logout
  const drawerLogoutBtn = document.getElementById('mobile-drawer-logout-btn');
  if (drawerLogoutBtn) drawerLogoutBtn.addEventListener('click', logoutUser);

  // Attach Drawer Voice Button
  const drawerVoiceBtn = document.getElementById('mobile-drawer-voice-btn');
  if (drawerVoiceBtn) {
    drawerVoiceBtn.addEventListener('click', () => {
      closeMobileDrawer();
      const floatTrigger = document.getElementById('voice-call-trigger');
      if (floatTrigger) floatTrigger.click();
    });
  }

  // Close drawer when any nav link is clicked
  drawer.querySelectorAll('.mobile-drawer-links a').forEach(a => {
    a.addEventListener('click', closeMobileDrawer);
  });

  // Re-attach demo buttons inside drawer
  attachDemoSwitcher();
}

export function openMobileDrawer() {
  const drawer = document.getElementById('mobile-menu-drawer');
  const overlay = document.getElementById('mobile-menu-overlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden'; // prevent background scrolling while drawer is open
}

export function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-menu-drawer');
  const overlay = document.getElementById('mobile-menu-overlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Global Keyboard Handler for accessibility (Escape closes modal & mobile drawer)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileDrawer();
  }
});

// Auto-close drawer if window resized to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 992) {
    closeMobileDrawer();
  }
});

// Global Demo Switcher buttons helper
export function attachDemoSwitcher() {
  document.querySelectorAll('[data-demo-role]').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const role = btn.getAttribute('data-demo-role');
      showToast(`Logging in as Demo ${role.toUpperCase()}...`, 'info');
      quickDemoLogin(role);
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarUser();
  attachDemoSwitcher();
});

export default {
  getStoredUser,
  getStoredToken,
  isAuthenticated,
  requireAuth,
  loginUser,
  logoutUser,
  quickDemoLogin,
  updateNavbarUser,
  openMobileDrawer,
  closeMobileDrawer,
};
