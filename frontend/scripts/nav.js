document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('casinozz_token');
    const user = localStorage.getItem('casinozz_user');
    const authControls = document.querySelectorAll('.auth-control');
    
    authControls.forEach(el => {
        if(token) {
            el.innerHTML = `<a href="#" onclick="logout()" class="nav-link" class="nav-link logout-nav-btn">Logout (${user})</a>`;
        }
    });

    // Make sure we resolve the exact path prefix by looking at the login link itself if we need it
});

function logout() {
    localStorage.removeItem('casinozz_token');
    localStorage.removeItem('casinozz_user');
    window.location.reload();
}
