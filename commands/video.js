const fetch = require('node-fetch');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            await sock.sendMessage(chatId, { text: '📥 ඔයා download කරන්න ඕන video එකේ නම හෝ link එකක් එවන්න.' }, { quoted: message });
            return;
        }

        let videoUrl = '';
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: '😓 Video එකක් හමු නොවුණා.' }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
        }

        const urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urls) {
            await sock.sendMessage(chatId, { text: '⛔ මේක valid YouTube link එකක් නෙමෙයි!' }, { quoted: message });
            return;
        }

        // Try SaveTube API first with timeout
        let data;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(`https://api.savetube.me/ytdl?url=${encodeURIComponent(videoUrl)}`, {
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!res.ok) throw new Error('SaveTube API response error');
            data = await res.json();
        } catch (err) {
            clearTimeout(timeout);
            console.log('⚠️ SaveTube failed:', err.message);

            // Fallback API (Violetics)
            const fallback = await fetch(`https://violetics.pw/api/media/youtube-video?apikey=trial&url=${encodeURIComponent(videoUrl)}`);
            if (!fallback.ok) {
                await sock.sendMessage(chatId, { text: '🛑 Video download API දෙකම fail වුණා.' }, { quoted: message });
                return;
            }
            const res = await fallback.json();
            if (!res?.result?.url) {
                await sock.sendMessage(chatId, { text: '😔 Fallback API එකෙන්වත් link එක හොයාගන්න බැරි වුණා.' }, { quoted: message });
                return;
            }
            data = {
                result: {
                    download: {
                        url: res.result.url,
                        filename: res.result.title || 'video'
                    }
                }
            };
        }

        const videoDownloadUrl = data.result.download.url;
        const title = data.result.download.filename || 'video.mp4';
        const filename = title.replace(/[<>:"/\\|?*]+/g, '').slice(0, 40) + '.mp4';

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const timestamp = Date.now();
        const tempFile = path.join(tempDir, `${timestamp}.mp4`);
        const convertedFile = path.join(tempDir, `converted_${timestamp}.mp4`);

        const videoRes = await fetch(videoDownloadUrl);
        if (!videoRes.ok) {
            await sock.sendMessage(chatId, { text: '⬇️ Video එක download කරන්න බැරි වුණා.' }, { quoted: message });
            return;
        }

        const buffer = await videoRes.buffer();
        if (!buffer || buffer.length < 1024) {
            await sock.sendMessage(chatId, { text: '⚠️ Download වුණාට video එක empty එකක් වගේ!' }, { quoted: message });
            return;
        }

        fs.writeFileSync(tempFile, buffer);

        try {
            await execPromise(`ffmpeg -i "${tempFile}" -c:v libx264 -c:a aac -preset fast -crf 23 -movflags +faststart "${convertedFile}"`);
            const stats = fs.statSync(convertedFile);
            if (stats.size < 1024) throw new Error('Conversion failed - file too small');
            if (stats.size > 62 * 1024 * 1024) {
                await sock.sendMessage(chatId, { text: '🧱 Video එක විශාලයි. WhatsApp එකෙන් එවන්න බැහැ.' }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, {
                video: { url: convertedFile },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `🎬 *${title}*\n\n_📥 Knight Bot MD විසින් download කරන ලදී_`
            }, { quoted: message });

        } catch (err) {
            console.log('🛠️ Conversion failed:', err.message);
            await sock.sendMessage(chatId, {
                video: { url: tempFile },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `🎬 *${title}*\n\n_📥 Knight Bot MD විසින් download කරන ලදී_`
            }, { quoted: message });
        }

        setTimeout(() => {
            try {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                if (fs.existsSync(convertedFile)) fs.unlinkSync(convertedFile);
            } catch {}
        }, 5000);

    } catch (error) {
        console.log('❌ Video Command Error:', error.message);
        await sock.sendMessage(chatId, { text: `💥 Download එක fail වුණා: ${error.message}` }, { quoted: message });
    }
}

module.exports = videoCommand;
