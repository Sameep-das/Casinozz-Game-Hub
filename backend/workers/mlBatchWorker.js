const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');

(async () => {
    const { mlUrl, headers, timeout, payload } = workerData;
    try {
        const response = await axios.post(`${mlUrl}/ai_batch`, payload, {
            timeout,
            headers,
        });
        parentPort.postMessage({ ok: true, data: response.data });
    } catch (err) {
        parentPort.postMessage({
            ok: false,
            error: err && err.message ? err.message : 'ML batch worker failed',
        });
    }
})();
