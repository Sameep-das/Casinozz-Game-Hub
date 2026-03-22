const API_BASE = window.CASINOZZ_API || 'http://localhost:3000/api';
let simChartInstance = null;
let profileChartInstance = null;
let learningChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            let targetTab = document.getElementById(e.target.dataset.tab);
            targetTab.classList.add('active');
            if (e.target.dataset.tab === 'user-tab') {
                loadUserStats();
                loadLearningCurve();
            }
        });
    });

    // Load initial simulation data
    loadSimulationResults();

    document.getElementById('sim-fetch-btn').addEventListener('click', loadSimulationResults);
    
    document.getElementById('sim-run-btn').addEventListener('click', async () => {
        const game = document.getElementById('sim-game').value;
        const mode = document.getElementById('sim-mode').value;
        document.getElementById('sim-run-btn').innerText = 'Running...';
        try {
            await fetch(`${API_BASE}/simulate/${game}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n: 1000, strategy: 'all', mode })
            });
            loadSimulationResults();
        } catch(e) {
            console.error(e);
            alert('Simulation failed.');
        }
        document.getElementById('sim-run-btn').innerText = 'Run 1000 Simulations';
    });
});

async function loadSimulationResults() {
    const game = document.getElementById('sim-game').value;
    const mode = document.getElementById('sim-mode').value;
    
    try {
        const res = await fetch(`${API_BASE}/simulate/results/${game}?mode=${mode}`);
        const data = await res.json();
        const results = data.simulation_results || [];
        
        // Group by strategy to get latest
        const latestByStrat = {};
        results.forEach(r => {
            if(!latestByStrat[r.strategy]) latestByStrat[r.strategy] = r;
        });
        const finalResults = Object.values(latestByStrat).sort((a,b) => b.win_rate - a.win_rate);
        
        updateSimulationUI(finalResults);
    } catch(e) {
        console.error(e);
    }
}

function updateSimulationUI(results) {
    // 1. Update Table
    const tbody = document.getElementById('sim-table-body');
    tbody.innerHTML = '';
    results.forEach(r => {
        let det = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.strategy}</strong></td>
            <td>${(r.win_rate * 100).toFixed(2)}%</td>
            <td>${Number(r.avg_score).toFixed(3)}</td>
            <td>W: ${det.wins} | L: ${det.losses} | T: ${det.ties || 0}</td>
        `;
        tbody.appendChild(tr);
    });

    // 2. Update Chart
    const labels = results.map(r => r.strategy);
    const winRates = results.map(r => (r.win_rate * 100).toFixed(2));
    
    const ctx = document.getElementById('simChart').getContext('2d');
    if(simChartInstance) {
        simChartInstance.destroy();
    }
    
    simChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates,
                backgroundColor: 'rgba(50, 205, 50, 0.6)',
                borderColor: 'rgba(50, 205, 50, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });
}

async function loadUserStats() {
    try {
        const token = localStorage.getItem('casinozz_token');
        const sessionUser = localStorage.getItem('casinozz_user') || 'anonymous';
        
        const [userRes, profileRes] = await Promise.all([
            fetch(`${API_BASE}/analytics/user`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }),
            fetch(`${API_BASE}/analytics/profile`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }, 
                body: JSON.stringify({session_key: sessionUser}) 
            })
        ]);
        
        if (userRes.status === 401 || profileRes.status === 401) {
            document.getElementById('u-rounds').innerHTML = '<a href="Pages/auth.html" style="color:limegreen">Login Required</a>';
            document.getElementById('u-winrate').innerText = '--';
            document.getElementById('u-profile').innerText = 'Restricted';
            document.getElementById('game-wise-container').innerHTML = '<p>Please log in to view your detailed game analysis.</p>';
            return;
        }

        const userData = await userRes.json();
        const profileData = await profileRes.json();
        
        document.getElementById('u-rounds').innerText = userData.overall.total_rounds || 0;
        document.getElementById('u-winrate').innerText = ((userData.overall.win_rate || 0) * 100).toFixed(1) + '%';
        document.getElementById('u-profile').innerText = profileData.profile_label || 'Unknown';
        
        const gamesList = [
            { id: 'rps', name: 'Rock Paper Scissors', url: 'Pages/rock-paper-scissos.html' },
            { id: 'mine', name: 'Mine The Gold', url: 'Pages/mine-the-gold.html' },
            { id: 'guess', name: 'Guess The Number', url: 'Pages/guess-the-num.html' },
            { id: 'coin', name: 'Flip The Coin', url: 'Pages/flip-the-coin.html' }
        ];

        let html = '';
        gamesList.forEach(g => {
            const stat = userData.games.find(row => row.game === g.id);
            if (!stat || stat.total_rounds === 0) {
                html += `
                <div class="game-stat-card-empty">
                    <h3 >${g.name}</h3>
                    <p >You haven't played this game yet!</p>
                    <a href="${g.url}" class="btn btn-fill">Play Now</a>
                </div>`;
            } else {
                html += `
                <div class="game-stat-card-filled">
                    <h3 >${g.name}</h3>
                    <p >Rounds Played: <strong>${stat.total_rounds}</strong></p>
                    <p>Win Rate: <strong>${(stat.win_rate * 100).toFixed(1)}%</strong></p>
                </div>`;
            }
        });
        document.getElementById('game-wise-container').innerHTML = html;
        
    } catch(e) { 
        console.error('User stats error', e); 
        document.getElementById('u-profile').innerText = 'Analysis Failed';
    }
}

async function loadLearningCurve(game) {
    const token = localStorage.getItem('casinozz_token');
    if (!token) return;

    const selectedGame = game || (document.getElementById('learning-game-filter') ? document.getElementById('learning-game-filter').value : '');
    const url = `${API_BASE}/analytics/ai_learning${selectedGame ? '?game=' + selectedGame : ''}`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();

        const noteEl = document.getElementById('learning-note');

        // Always destroy existing chart first before deciding what to show
        if (learningChartInstance) {
            learningChartInstance.destroy();
            learningChartInstance = null;
        }

        if (!data.labels || data.labels.length < 2) {
            if (noteEl) {
                noteEl.style.display = 'block';
                noteEl.style.color = '#888';
                noteEl.innerText = data.total_rounds === 0
                    ? `⚠️ You haven't played ${selectedGame ? selectedGame.toUpperCase() : 'any game'} yet — go play some rounds first!`
                    : '⏳ Not enough data yet — play at least 10 rounds to see the chart!';
            }
            return;
        }
        if (noteEl) noteEl.style.display = 'none';


        const ctx = document.getElementById('learningChart').getContext('2d');
        if (learningChartInstance) learningChartInstance.destroy();

        learningChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Your Win Rate (%)',
                        data: data.userWinRates,
                        borderColor: 'rgba(0, 255, 106, 1)',
                        backgroundColor: 'rgba(0, 255, 106, 0.1)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        tension: 0.4,
                        fill: true,
                    },
                    {
                        label: 'AI Win Rate (%)',
                        data: data.aiWinRates,
                        borderColor: 'rgba(240, 27, 27, 1)',
                        backgroundColor: 'rgba(240, 27, 27, 0.08)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        tension: 0.4,
                        fill: true,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: 'white', font: { size: 13 } } },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: {
                        beginAtZero: true, max: 100,
                        ticks: { color: '#aaa', callback: v => v + '%' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });

        // Wire up the game-filter dropdown
        const filterEl = document.getElementById('learning-game-filter');
        if (filterEl && !filterEl._wired) {
            filterEl._wired = true;
            filterEl.addEventListener('change', () => loadLearningCurve(filterEl.value));
        }

    } catch(e) { console.error('Learning curve error', e); }
}
