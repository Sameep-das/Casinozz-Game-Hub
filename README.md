# Casinozz Game Hub - AI Enhanced v2.0

Welcome to the AI-Enhanced version of Casinozz Game Hub! This project integrates an intelligent backend and machine-learning simulation engine to provide advanced analytics, predictive profiling, and AI-generated hints inside the classic vanilla JavaScript games.

## Features

- **Classic Games:** Rock Paper Scissors, Mine The Gold, Guess The Number, Flip The Coin.
- **AI Simulation Engine:** Runs pure JS background simulations to pit computer logic against games.
- **Python ML Predictions:** Uses `scikit-learn` to analyze gameplay patterns and predict outcomes (e.g., Logistic Regression for Mine the Gold, Frequency analysis for RPS).
- **Player K-Means Clustering:** Profiles players into 4 behavioral "Risk Profile" buckets using KMeans models.
- **Generative AI Narrations:** Integrates Google Gemini Flash API to narrate predictive hints to the player in real-time.
- **Analytics Dashboard:** Chart.js powered `analytics.html` page to review strategy efficiencies and player profiles.

## Technologies Used

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend APIs:** Node.js, Express.js, Google Gemini API
- **Machine Learning Service:** Python 3, Flask, scikit-learn, numpy, pandas
- **Database:** MySQL

---

## Setup & Run Instructions

### 1. Database Setup
1. Open MySQL Workbench.
2. Create `casinozz_v2` database if not existing.
3. Run the `schema.sql` script to structure the tables (`sessions`, `events`, `game_stats`, `simulation_results`, `player_clusters`).

### 2. Node.js Backend
1. Navigate to the `backend/` directory.
2. Ensure you have installed dependencies: `npm install` (express, cors, mysql2, axios, dotenv, @google/generative-ai).
3. Create a `.env` file in `backend/` mirroring `.env.example`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=casinozz_v2
   GEMINI_API_KEY=your_actual_gemini_key
   ```
4. Start the server: `node server.js`
   Server will run on `http://localhost:3000`.

### 3. Python ML Service
1. Navigate to the `ml-service/` directory.
2. Ensure Python dependencies are installed using `pip install -r requirements.txt`.
3. Start the Flask server: `python app.py`
   Service will run on `http://127.0.0.1:5001`.
4. *Note:* Make sure to run `python train.py` at least once to generate the `.pkl` ML models before running predictions!

### 4. Running the Web App
Simply open `index.html` or `analytics.html` in your favorite web browser (or serve it locally via Live Server). Use the UI to navigate the game collection. AI hints and statistics will populate automatically via the backend!

---

*Project implemented according to the Casinozz AI Integration Plan v2.0 Blueprint.*
