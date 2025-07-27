
const fetch = require('node-fetch');

async function imageCommand(sock, chatId, message) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = text.split(' ').slice(1).join(' ');
    if (!query) {
        await sock.sendMessage(chatId, { text: '📸 Example:\n.img mount everest' });
        return;
    }

    const res = await fetch(`https://api.popcat.xyz/imagesearch?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data || data.length === 0) {
        await sock.sendMessage(chatId, { text: '😕 No image results found.' });
        return;
    }

    for (let i = 0; i < Math.min(3, data.length); i++) {
        await sock.sendMessage(chatId, {
            image: { url: data[i] },
            caption: `🔍 Result for: *${query}*`
        });
    }
}

module.exports = { imageCommand };
