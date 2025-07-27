const axios = require('axios');
const { fetchBuffer } = require('../lib/myfunc');

async function imagineCommand(sock, chatId, message) {
    try {
        const prompt = message.message?.conversation?.trim() || 
                      message.message?.extendedTextMessage?.text?.trim() || '';
        
        const imagePrompt = prompt.slice(8).trim();

        if (!imagePrompt) {
            await sock.sendMessage(chatId, {
                text: 'Please provide a prompt for the image generation.\nExample: .imagine a beautiful sunset over mountains'
            }, { quoted: message });
            return;
        }

        const userName = message.pushName || 'user';

        // Progress bar frames
        const progressFrames = [
            `🎨 Drawing for *${userName}*...\n█░░░░░░░░`,
            `🎨 Drawing for *${userName}*...\n██░░░░░░░`,
            `🎨 Drawing for *${userName}*...\n███░░░░░░`,
            `🎨 Drawing for *${userName}*...\n████░░░░░`,
            `🎨 Drawing for *${userName}*...\n█████░░░░`,
            `🎨 Drawing for *${userName}*...\n██████░░░`,
            `🎨 Drawing for *${userName}*...\n███████░░`,
            `🎨 Drawing for *${userName}*...\n████████░`,
            `🎨 Drawing for *${userName}*...\n█████████`
        ];

        // Reaction frames
        const reactionFrames = ['⏳', '🎨', '🔄', '✨'];
        let frameIndex = 0;
        let reactIndex = 0;
        let isGenerating = true;

        // Send first loading message
        let loadingMsg = await sock.sendMessage(chatId, {
            text: progressFrames[frameIndex]
        }, { quoted: message });

        // Start progress bar animation
        const progressInterval = setInterval(async () => {
            if (!isGenerating) return clearInterval(progressInterval);
            frameIndex = (frameIndex + 1) % progressFrames.length;
            try {
                await sock.sendMessage(chatId, {
                    edit: loadingMsg.key,
                    text: progressFrames[frameIndex]
                });
            } catch (err) {
                console.error('Progress edit failed:', err.message);
            }
        }, 700); // 0.7s per progress step

        // Start reaction animation
        const reactionInterval = setInterval(async () => {
            if (!isGenerating) return clearInterval(reactionInterval);
            reactIndex = (reactIndex + 1) % reactionFrames.length;
            try {
                await sock.sendMessage(chatId, {
                    react: {
                        text: reactionFrames[reactIndex],
                        key: loadingMsg.key
                    }
                });
            } catch (err) {
                console.error('Reaction failed:', err.message);
            }
        }, 800); // 0.8s per emoji change

        // Enhance prompt
        const enhancedPrompt = enhancePrompt(imagePrompt);

        // Generate image
        const response = await axios.get(`https://api.shizo.top/ai/imagine/flux`, {
            params: {
                apikey: 'knightbot',
                prompt: enhancedPrompt
            },
            responseType: 'arraybuffer'
        });

        const imageBuffer = Buffer.from(response.data);

        // Stop both animations
        clearInterval(progressInterval);
        clearInterval(reactionInterval);
        isGenerating = false;

        // Finalize loading message
        await sock.sendMessage(chatId, {
            edit: loadingMsg.key,
            text: `✅ *Image generated for ${userName}* \n > © By Imalsha`
        });

        // Send the generated image
        const sentImageMsg = await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `🎨 *Generated image for:* "${imagePrompt} \n > © By Imalsha"`
        }, { quoted: message });

        // Final reaction
        await sock.sendMessage(chatId, {
            react: {
                text: '✅',
                key: sentImageMsg.key
            }
        });

    } catch (error) {
        console.error('Error in imagine command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to generate image. Please try again later.'
        }, { quoted: message });
    }
}

// Function to enhance the prompt
function enhancePrompt(prompt) {
    const qualityEnhancers = [
        'high quality',
        'detailed',
        'masterpiece',
        'best quality',
        'ultra realistic',
        '4k',
        'highly detailed',
        'professional photography',
        'cinematic lighting',
        'sharp focus'
    ];

    const numEnhancers = Math.floor(Math.random() * 2) + 3;
    const selectedEnhancers = qualityEnhancers
        .sort(() => Math.random() - 0.5)
        .slice(0, numEnhancers);

    return `${prompt}, ${selectedEnhancers.join(', ')}`;
}

module.exports = imagineCommand;
