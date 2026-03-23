const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

window.CASINOZZ_API = IS_PROD 
    ? 'https://casinozz-backend.onrender.com/api' 
    : 'http://localhost:3000/api';

window.CASINOZZ_ML = IS_PROD 
    ? 'https://casinozz-game-hub.onrender.com' 
    : 'http://localhost:5001';

