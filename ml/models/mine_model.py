import pickle
import os
from sklearn.linear_model import LogisticRegression
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../saved_models/mine_model.pkl')

def train_mine_model(X_train, y_train):
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model = LogisticRegression(max_iter=500)
    # If not enough variance, just add fake rows
    if len(set(y_train)) < 2:
        X_train.extend([[0,1,8,1.2,1,0], [1,5,4,2.5,2,1]])
        y_train.extend([1, 0])
        
    model.fit(X_train, y_train)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    return True

def predict_mine(features):
    # features: [mode_encoded (0=E,1=M,2=H), cells_revealed, cells_remaining, current_multiplier, mines_count, session_win_streak]
    if not os.path.exists(MODEL_PATH):
        # Default safety logic
        prob = 0.5
        if features[1] > 3: prob = 0.8
    else:
        model = pickle.load(open(MODEL_PATH, 'rb'))
        prob = model.predict_proba([features])[0][1]
        
    return {
        'withdraw_now': bool(prob > 0.65),
        'confidence': round(prob, 3),
        'model': 'logistic_regression'
    }
