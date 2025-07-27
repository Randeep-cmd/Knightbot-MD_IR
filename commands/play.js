const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, {
                text: "🎵 *ඔබට බාගත කිරීමට අවශ්‍ය සිංදුවක් සඳහන් කරන්න!*\nඋදා: `.play manike mage hithe`"
            });
        }

        const progressStages = [
            "📥 Preparing download...0%\n█░░░░░░░░",
            "📥 Preparing download...10%\n██░░░░░░░",
            "📥 Preparing download...40%\n███░░░░░░",
            "📥 Preparing download...50%\n████░░░░░",
            "📥 Preparing download...60%\n█████░░░░",
            "📥 Preparing download...70%\n██████░░░",
            "📥 Preparing download...80%\n███████░░",
            "📥 Preparing download...90%\n████████░",
            "✅ Download ready! 100%\n█████████"
        ];

        const emojis = ['🎧', '🎵', '🔥', '❤️', '💿'];
        let downloading = true;
        let progress = 0, emojiIndex = 0;

        const loadingMsg = await sock.sendMessage(chatId, {
            text: progressStages[0]
        });

        // Progress Bar Animation
        const progAnim = setInterval(async () => {
            if (!downloading) return clearInterval(progAnim);
            progress = (progress + 1) % progressStages.length;
            try {
                await sock.sendMessage(chatId, {
                    text: progressStages[progress],
                    edit: loadingMsg.key
                });
            } catch (_) {}
        }, 500);

        // Emoji Reaction Animation
        const emojiAnim = setInterval(async () => {
            if (!downloading) return clearInterval(emojiAnim);
            emojiIndex = (emojiIndex + 1) % emojis.length;
            try {
                await sock.sendMessage(chatId, {
                    react: {
                        text: emojis[emojiIndex],
                        key: message.key
                    }
                });
            } catch (_) {}
        }, 700);

        // Search YouTube
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            downloading = false;
            return await sock.sendMessage(chatId, {
                text: "😕 *සිංදුවක් හමු නොවීය!*"
            });
        }

        const video = videos[0];
        const url = video.url;

        // Get audio download link
        const res = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${url}`);
        const audio = res.data?.result?.data;

        if (!audio?.downloadUrl) {
            downloading = false;
            return await sock.sendMessage(chatId, {
                text: "🚫 *Download link එක ලබාගත නොහැකියි. නැවත උත්සාහ කරන්න.*"
            });
        }

        downloading = false;
        clearInterval(progAnim);
        clearInterval(emojiAnim);

        const title = audio.title || "Unknown Title";

        // Final progress edit
        await sock.sendMessage(chatId, {
            text: `✅ *Download complete!*\n🎶 *${title}*\n\n🔊 Sending audio...\n© IMALSHA`,
            edit: loadingMsg.key
        });

        // Send audio file
        await sock.sendMessage(chatId, {
            audio: { url: audio.downloadUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
            caption: `🎧 *${title}*\n\n✅ Powered by KnightBot\n© Developed by IMALSHA`,
            ptt: false
        }, { quoted: message });

        // Final emoji react
        await sock.sendMessage(chatId, {
            react: {
                text: '✅',
                key: message.key
            }
        });

    } catch (err) {
        await sock.sendMessage(chatId, {
            text: "❌ *Download failed. Please try again later.*"
        });
    }
}

module.exports = playCommand;

/*
* 👑 Developed by IMALSHA
* 🤖 KnightBot Media Downloader
* ⚡ Fast & Smooth Experience
*/
