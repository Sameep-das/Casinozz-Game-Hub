require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const cluster = require('cluster');
const os = require('os');
const path = require('path');

const requested = parseInt(process.env.WEB_CONCURRENCY || '', 10);
const workerCount = Math.max(1, Math.min(requested || 2, os.cpus().length || 1));

if (cluster.isPrimary && process.env.NODE_CLUSTER !== 'false' && workerCount > 1) {
    cluster.setupPrimary({
        exec: path.join(__dirname, 'server.js'),
        env: { ...process.env, NODE_CLUSTER: 'false' },
    });

    console.log(`[Cluster] Starting ${workerCount} backend workers`);
    for (let i = 0; i < workerCount; i += 1) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.error(`[Cluster] Worker ${worker.process.pid} exited (${code || signal}); restarting`);
        cluster.fork();
    });
} else {
    require('./server');
}
