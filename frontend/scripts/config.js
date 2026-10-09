const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

window.CASINOZZ_API = IS_PROD 
    ? 'https://casinozz-backend.onrender.com/api' 
    : 'http://localhost:3000/api';

window.ML_SERVICE_URL = IS_PROD 
    ? 'https://casinozz-game-hub.onrender.com' 
    : 'http://localhost:5001';

(function warmRenderServices() {
    const endpoints = [
        `${window.CASINOZZ_API}/health`,
        `${window.ML_SERVICE_URL}/api/health`,
    ];
    const maxDelay = 15000;

    function ping(url, attempt = 0) {
        fetch(url, { cache: 'no-store' })
            .then((res) => {
                if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
            })
            .catch(() => {
                const delay = Math.min(1000 * (attempt + 1), maxDelay);
                setTimeout(() => ping(url, attempt + 1), delay);
            });
    }

    endpoints.forEach((url) => ping(url));
})();

