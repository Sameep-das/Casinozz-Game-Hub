# Casinozz Game Hub - AI Enhanced v2.0

## Overview
Casinozz Game Hub v2.0 is an intelligent gaming platform that integrates a Node.js backend with a Python-based machine learning service. The system provides advanced analytics, predictive profiling, and real-time AI-generated hints for a collection of classic JavaScript games.

## Features

### Intelligent Game Mechanics
- **Core Gaming Suite**: Includes Rock Paper Scissors, Mine The Gold, Guess The Number, and Flip The Coin.
- **AI Simulation Engine**: Executes background simulations using pure JavaScript engines to analyze game mechanics and strategy efficiency.
- **Generative AI Narrations**: Incorporates the Google Gemini Flash API to provide real-time predictive hints and narrations to players based on their current game state.

### Machine Learning Integration
- **Predictive Modeling**: Utilizes scikit-learn for gameplay pattern analysis.
    - **Logistic Regression**: Used in 'Mine the Gold' to predict the safety of a cell based on previous moves and difficulty.
    - **Frequency Analysis & Markov Chains**: Used in 'Rock Paper Scissors' to predict player patterns.
- **Behavioral Profiling**: Implements K-Means clustering to categorize players into four distinct behavioral risk profiles:
    - High-Risk Racer
    - Cautious Analyst
    - Pattern Hunter
    - Streak Chaser

### Security and Analytics
- **Authentication**: Implements JSON Web Tokens (JWT) for secure user registration and login.
- **Role-Based Access**: Protects sensitive analytics routes, ensuring users can only access their own performance data.
- **Analytics Dashboard**: A centralized interface powered by Chart.js for reviewing player performance, strategy efficiency, and behavioral clusters.

### System Flow
1. **Frontend**: A vanilla JavaScript application that handles user interaction and real-time game logic.
2. **Backend (Node.js)**: Acts as the central orchestrator. It manages user authentication (JWT), interacts with the MySQL database, and communicates with the Gemini API for hints.
3. **ML Service (Python)**: A dedicated Flask-based microservice that handles heavy computational tasks, including model training (scikit-learn) and predictive move generation.

## Folder Structure
- `backend/`: Node.js Express server, API routes, and database abstraction layer.
- `ml/`: Python Flask service, machine learning models, and training scripts.
- `frontend/`: Static web assets including HTML, CSS, and client-side JavaScript.
- `database/`: SQL schema definitions and database initialization scripts.

## Database Schema

### Users
- `id`: Unique identifier for the user.
- `username`: Unique username.
- `password_hash`: Bcrypt-hashed password.
- `created_at`: Timestamp of account creation.

### Sessions
- `id`: Unique session identifier.
- `game`: Name of the game played (e.g., 'mine', 'rps').
- `mode`: Difficulty level ('easy', 'medium', 'hard').
- `session_key`: Unique string identifying the player's session.
- `started_at`: Timestamp when the session began.

### Events
- `id`: Unique event identifier.
- `session_id`: Reference to the parent session.
- `event_type`: Category of the event (e.g., 'result', 'move').
- `payload`: JSON object containing game-specific data.
- `created_at`: Timestamp of the event.

### Player Clusters
- `id`: Unique identifier.
- `session_key`: Reference to the player's session key.
- `cluster_id`: Numeric identifier assigned by the K-Means model.
- `profile_label`: Human-readable label for the behavioral cluster.
- `feature_vec`: JSON representation of the features used for clustering.

### Simulation Results
- `id`: Unique identifier.
- `game`: Game being simulated.
- `strategy`: The algorithm used in the simulation.
- `win_rate`: The calculated success rate for the strategy.

## Setup and Installation

### 1. Database Configuration
1. Initialize a MySQL instance and create a database named `casinozz_v2`.
2. Execute the `database/schema.sql` script to create the necessary table structures.

### 2. Node.js Backend Setup
1. Navigate to the `backend/` directory.
2. Install dependencies: `npm install`.
3. Configure environment variables in a `.env` file (see `.env.example`).
4. Start the server: `node server.js`.

### 3. Machine Learning Service Setup
1. Navigate to the `ml/` directory.
2. Install Python dependencies: `pip install -r requirements.txt`.
3. Configure the `.env` file with the appropriate `DATABASE_URL`.
4. Run the training pipeline: `python train.py`.
5. Start the Flask service: `python app.py`.

### 4. Frontend Execution
Serve the `frontend/` directory using a local web server (e.g., `python -m http.server 8080`).

## API Documentation

### Authentication
- **POST /api/auth/register**: Register a new user account.
- **POST /api/auth/login**: Authenticate a user and receive a JWT token.

### Game Management
- **POST /api/session/start**: Initialize a new game session.
- **POST /api/event**: Log gameplay events and results.

### AI and Machine Learning
- **POST /api/ml/ai_move**: Request an AI-calculated move based on historical data.
- **POST /api/ml/predict/:game**: Fetch model-based outcome predictions.
- **GET /api/hint/:game**: Retrieve a Gemini-powered gameplay hint.

### Analytics (Requires JWT)
- **GET /api/analytics/user**: Retrieve comprehensive user-specific statistics.
- **GET /api/analytics/ai_learning**: Fetch data for the user vs AI learning curve.
- **POST /api/analytics/profile**: Categorize a player into a behavioral cluster.
