// auth.js
const AUTH_API_URL = 'https://tank.remeil.co.nz/login';

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('login-modal');
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const closeModal = document.getElementById('close-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Toggle nav items based on session existence
    updateNavUI();

    // Modal Control
    if (navLogin) navLogin.addEventListener('click', () => loginModal.style.display = 'flex');
    if (closeModal) closeModal.addEventListener('click', () => hideModal());

    // Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.style.display = 'none';

            const username = document.getElementById('uname').value.trim();
            const password = document.getElementById('pword').value.trim();

            try {
                const response = await fetch(AUTH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    throw new Error('Invalid username or password.');
                }

                const data = await response.json();

                // Save session with 1-hour expiration timestamp
                const expiresAt = Date.now() + (60 * 60 * 1000);
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_user', JSON.stringify(data.user));
                localStorage.setItem('token_expires_at', expiresAt.toString());

                hideModal();
                loginForm.reset();
                updateNavUI();

                // Example: Trigger protected content load after successful login
                if (typeof loadProtectedCards === 'function') {
                    loadProtectedCards();
                }

            } catch (err) {
                loginError.innerText = err.message || 'Login failed. Please try again.';
                loginError.style.display = 'block';
            }
        });
    }

    if (navLogout) {
        navLogout.addEventListener('click', () => {
            clearAuthSession();
            updateNavUI();
        });
    }

    function hideModal() {
        loginModal.style.display = 'none';
        loginError.style.display = 'none';
    }

    function updateNavUI() {
        const token = getValidToken();
        if (token) {
            if (navLogin) navLogin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'block';
        } else {
            if (navLogin) navLogin.style.display = 'block';
            if (navLogout) navLogout.style.display = 'none';
        }
    }
});

// Utility to retrieve token and auto-purge if expired (> 1 hour)
function getValidToken() {
    const token = localStorage.getItem('auth_token');
    const expiresAt = localStorage.getItem('token_expires_at');

    if (!token || !expiresAt) return null;

    if (Date.now() > parseInt(expiresAt, 10)) {
        clearAuthSession();
        return null;
    }
    return token;
}

function clearAuthSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('token_expires_at');
}

// Wrapper for protected API calls that attaches the Authorization header
async function fetchWithAuth(url, options = {}) {
    const token = getValidToken();
    if (!token) {
        // Open modal if not logged in or token expired
        document.getElementById('login-modal').style.display = 'flex';
        throw new Error('User not authenticated');
    }

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const res = await fetch(url, options);

    // Handle token invalidation from server side (e.g. HTTP 401)
    if (res.status === 401) {
        clearAuthSession();
        document.getElementById('login-modal').style.display = 'flex';
        throw new Error('Session expired. Please log in again.');
    }

    return res;
}
