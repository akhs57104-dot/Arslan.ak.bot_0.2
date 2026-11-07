const { cmd } = require('../command');
const config = require('../config');
const { askAI, clearHistory } = require('../lib/ai');

function providerLabel(p) {
    return { gemini: 'Google Gemini', openai: 'OpenAI', claude: 'Claude', deepseek: 'DeepSeek', legacy: 'AI' }[p] || 'AI';
}

cmd({
    pattern: "ai",
    alias: ["bot", "dj", "gpt", "gpt4", "bing", "gemini", "chatgpt"],
    desc: "Chat with the AI assistant",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for the AI.\nExample: `.ai Hello`");

        const { reply: answer, provider } = await askAI(q, { chatId: from });
        await reply(`🤖 *${providerLabel(provider)} Response:*\n\n${answer}`);
        await react("✅");
    } catch (e) {
        console.error("Error in AI command:", e.message);
        await react("❌");
        reply(
            "❌ AI is not available right now.\n" +
            "Set *AI_PROVIDER* and the matching API key (GEMINI_API_KEY / OPENAI_API_KEY / " +
            "CLAUDE_API_KEY / DEEPSEEK_API_KEY) in config.env."
        );
    }
});

cmd({
    pattern: "openai",
    alias: ["gpt3", "open-gpt"],
    desc: "Chat with OpenAI",
    category: "ai",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for OpenAI.\nExample: `.openai Hello`");
        const { reply: answer } = await askAI(q, { chatId: from, provider: 'openai' });
        await reply(`🧠 *OpenAI Response:*\n\n${answer}`);
        await react("✅");
    } catch (e) {
        console.error("Error in OpenAI command:", e.message);
        await react("❌");
        reply("❌ OpenAI is not configured. Set *OPENAI_API_KEY* in config.env.");
    }
});

cmd({
    pattern: "claude",
    alias: ["anthropic", "claudeai"],
    desc: "Chat with Claude",
    category: "ai",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for Claude.\nExample: `.claude Hello`");
        const { reply: answer } = await askAI(q, { chatId: from, provider: 'claude' });
        await reply(`🧠 *Claude Response:*\n\n${answer}`);
        await react("✅");
    } catch (e) {
        console.error("Error in Claude command:", e.message);
        await react("❌");
        reply("❌ Claude is not configured. Set *CLAUDE_API_KEY* in config.env.");
    }
});

cmd({
    pattern: "deepseek",
    alias: ["deep", "seekai"],
    desc: "Chat with DeepSeek AI",
    category: "ai",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for DeepSeek AI.\nExample: `.deepseek Hello`");
        const { reply: answer } = await askAI(q, { chatId: from, provider: 'deepseek' });
        await reply(`🧠 *DeepSeek AI Response:*\n\n${answer}`);
        await react("✅");
    } catch (e) {
        console.error("Error in DeepSeek AI command:", e.message);
        await react("❌");
        reply("❌ DeepSeek is not configured. Set *DEEPSEEK_API_KEY* in config.env.");
    }
});

cmd({
    pattern: "clearchat",
    alias: ["resetai", "aiclear"],
    desc: "Clear the AI conversation context for this chat",
    category: "ai",
    react: "🧹",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    clearHistory(from);
    await reply("🧹 Conversation context cleared for this chat.");
});
