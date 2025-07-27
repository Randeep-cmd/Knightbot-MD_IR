
const fetch = require('node-fetch');

async function googleCommand(sock, chatId, message) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = text.split(' ').slice(1).join(' ');
    if (!query) {
        await sock.sendMessage(chatId, { text: '📘 Example:\n.google albert einstein' });
        return;
    }

    const res = await fetch(`https://api.popcat.xyz/wikipedia?article=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.error) {
        await sock.sendMessage(chatId, { text: '😕 No results found.' });
    } else {
        await sock.sendMessage(chatId, {
            text: `📌 *${data.title}*\n\n${data.text}\n\n🔗 ${data.url}`
        });
    }
}

module.exports = { googleCommand };
