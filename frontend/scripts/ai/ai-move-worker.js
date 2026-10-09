self.onmessage = async (event) => {
  const { requestId, endpoint, payload, timeoutMs } = event.data || {};
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 3500);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ML batch failed with ${response.status}`);
    }

    const data = await response.json();
    self.postMessage({ requestId, ok: true, data });
  } catch (err) {
    self.postMessage({
      requestId,
      ok: false,
      error: err && err.message ? err.message : "ML batch request failed",
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
