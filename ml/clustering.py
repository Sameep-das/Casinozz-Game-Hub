import pickle
import os
import numpy as np
from sklearn.cluster import KMeans

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'saved_models/kmeans.pkl')

def train_cluster_model(X_train):
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if not X_train or len(X_train) < 4:
        # Dummy data if insufficient real data
        X_train = np.random.rand(10, 6).tolist()

    model = KMeans(n_clusters=4, random_state=42, n_init=10)
    model.fit(X_train)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    return True

def cluster_player(feature_vec):
    if not os.path.exists(MODEL_PATH):
        # Fallback if no model exists
        return { 'cluster_id': 0, 'profile_label': 'New Player' }

    model = pickle.load(open(MODEL_PATH, 'rb'))
    cluster_id = model.predict([feature_vec])[0]
    
    labels = ['High-Risk Racer', 'Cautious Analyst', 'Pattern Hunter', 'Streak Chaser']
    if cluster_id >= len(labels):
        cluster_id = 0
        
    return {
        'cluster_id': int(cluster_id),
        'profile_label': labels[cluster_id]
    }
