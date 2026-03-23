const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

async function getGeminiModel() {
    if (!genAI) throw new Error("Gemini API Key not configured.");
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
}

async function generateHint(game, recentEvents) {
    if (!genAI) return "API Key missing. Keep playing carefully!";
    try {
        const model = await getGeminiModel();
        const prompt = `You are a helpful AI assistant for the casino game '${game}'. 
Based on these recent events: ${JSON.stringify(recentEvents)}, provide a one-sentence gameplay tip. Keep it encouraging!`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        console.error("Gemini Hint Error:", e.message);
        return "You're doing great, trust your instincts!";
    }
}

async function narrateProbability(game, mlPrediction) {
    if (!genAI) {
        let text = 'Our models recommend ';
        if (game === 'rps') text += mlPrediction.recommended_move;
        if (game === 'mine') text += (mlPrediction.withdraw_now ? 'withdrawing' : 'continuing');
        return `${text} with ${Math.round(mlPrediction.confidence * 100)}% confidence.`;
    }
    try {
        const model = await getGeminiModel();
        const prompt = `You are an AI dealer for '${game}'. Tell the user the ML model's prediction in one short, engaging sentence. The prediction is: ${JSON.stringify(mlPrediction)}. Use a confident but fun tone!`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        console.error("Gemini Narrative Error:", e.message);
        return `Algorithm says: ${JSON.stringify(mlPrediction)}. Proceed with caution!`;
    }
}

module.exports = { generateHint, narrateProbability };
