const axios = require('axios');
const config = require('../config');

// In-memory conversation context per chat, bounded to avoid unbounded growth.
const MAX_TURNS = 8;
const MAX_CHATS = 500;
const history = new Map();

function remember(chatId, role, content) {
    if (!chatId) return;
    let turns = history.get(chatId);
    if (!turns) {
        if (history.size >= MAX_CHATS) history.delete(history.keys().next().value);
        turns = [];
        history.set(chatId, turns);
    }
    turns.push({ role, content });
    if (turns.length > MAX_TURNS * 2) turns.splice(0, turns.length - MAX_TURNS * 2);
}

function getHistory(chatId) {
    return (chatId && history.get(chatId)) || [];
}

function clearHistory(chatId) {
    if (chatId) history.delete(chatId);
}

const SYSTEM_PROMPT =
    `You are the assistant of ${config.BRAND_NAME || 'TECH ARSLAN SOFTWARE SOLUTIONS'}, ` +
    'a WhatsApp automation bot developed by ' + (config.OWNER_NAME || 'TECH HACKER') + '. ' +
    'Answer clearly, helpfully and concisely.';

async function askGemini(prompt, chatId) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `${base}/v1beta/models/${model}:generateContent?key=${key}`;
    const contents = getHistory(chatId).map(t => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    const { data } = await axios.post(url, {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
    }, { timeout: 60000 });
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('')?.trim();
    if (!text) throw new Error('Empty response from Gemini');
    return text;
}

async function askOpenAI(prompt, chatId) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    const base = process.env.OPENAI_API_BASE || 'https://api.openai.com';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...getHistory(chatId), { role: 'user', content: prompt }];
    const { data } = await axios.post(`${base}/v1/chat/completions`, { model, messages }, {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 60000,
    });
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty response from OpenAI');
    return text;
}

async function askClaude(prompt, chatId) {
    const key = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('CLAUDE_API_KEY is not set');
    const base = process.env.CLAUDE_API_BASE || 'https://api.anthropic.com';
    const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';
    const messages = [...getHistory(chatId), { role: 'user', content: prompt }];
    const { data } = await axios.post(`${base}/v1/messages`, {
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
    }, {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        timeout: 60000,
    });
    const text = data?.content?.map(c => c.text).join('')?.trim();
    if (!text) throw new Error('Empty response from Claude');
    return text;
}

async function askDeepSeek(prompt, chatId) {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error('DEEPSEEK_API_KEY is not set');
    const base = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...getHistory(chatId), { role: 'user', content: prompt }];
    const { data } = await axios.post(`${base}/chat/completions`, { model, messages }, {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 60000,
    });
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty response from DeepSeek');
    return text;
}

// Legacy keyless public endpoint kept as a last-resort fallback.
async function askLegacy(prompt) {
    const base = process.env.LEGACY_AI_API || 'https://lance-frank-asta.onrender.com/api/gpt';
    const { data } = await axios.get(`${base}?q=${encodeURIComponent(prompt)}`, { timeout: 60000 });
    const text = (data?.message || data?.result || data?.answer || '').trim();
    if (!text) throw new Error('Empty response from fallback AI endpoint');
    return text;
}

const PROVIDERS = {
    gemini: askGemini,
    openai: askOpenAI,
    claude: askClaude,
    deepseek: askDeepSeek,
};

/**
 * Ask the configured AI provider, keeping per-chat conversation context.
 * @param {string} prompt  user message
 * @param {object} [opts]  { provider, chatId }
 * @returns {Promise<string>} model reply
 */
async function askAI(prompt, opts = {}) {
    const provider = (opts.provider || config.AI_PROVIDER || 'gemini').toLowerCase();
    const chatId = opts.chatId;

    let reply;
    let used = provider;
    if (PROVIDERS[provider]) {
        reply = await PROVIDERS[provider](prompt, chatId);
    } else {
        used = 'legacy';
        reply = await askLegacy(prompt);
    }

    remember(chatId, 'user', prompt);
    remember(chatId, 'assistant', reply);
    return { reply, provider: used };
}

module.exports = { askAI, clearHistory, getHistory, PROVIDERS };
