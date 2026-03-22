let isLoginMode = true;
const API_BASE = window.CASINOZZ_API || 'http://localhost:3000/api';

function toggleMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('submit-btn');
    const switchText = document.getElementById('switch-text');
    
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';
    
    if (isLoginMode) {
        title.innerText = 'Login to Casinozz';
        submitBtn.innerText = 'Login';
        switchText.innerHTML = `Don't have an account? <span>Sign Up Here</span>`;
    } else {
        title.innerText = 'Create an Account';
        submitBtn.innerText = 'Sign Up';
        switchText.innerHTML = `Already have an account? <span>Login Here</span>`;
    }
}

async function handleAuth() {
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    
    const errEl = document.getElementById('auth-error');
    const succEl = document.getElementById('auth-success');
    errEl.style.display = 'none';
    succEl.style.display = 'none';
    
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
    
    try {
        const res = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        
        const data = await res.json();
        if (!res.ok) {
            errEl.innerText = data.error || 'Authentication failed.';
            errEl.style.display = 'block';
            return;
        }
        
        localStorage.setItem('casinozz_token', data.token);
        localStorage.setItem('casinozz_user', data.username);
        
        succEl.innerText = data.message + '! Redirecting...';
        succEl.style.display = 'block';
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
        
    } catch(err) {
        console.error(err);
        errEl.innerText = 'Network error. Please try again.';
        errEl.style.display = 'block';
    }
}
