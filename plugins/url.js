const { cmd } = require('../hasindu');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require('path');

cmd({
    pattern: "tourl",
    alias: ["catbox", "upload", "url"],
    desc: "Upload replied media to Cloud",
    react: "🔗",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, {
    from, reply
}) => {
    try {
        const quoted = mek.msg?.contextInfo?.quotedMessage || m.quoted;
        
        if (!quoted) {
            return reply("❌ *Please reply to an image, video, audio, or document!*");
        }

        const mime = 
            quoted.imageMessage?.mimetype || 
            quoted.videoMessage?.mimetype || 
            quoted.audioMessage?.mimetype || 
            quoted.documentMessage?.mimetype || '';

        if (!quoted.imageMessage && !quoted.videoMessage && !quoted.audioMessage && !quoted.documentMessage) {
            return reply("❌ *The replied message is not a valid media type!*");
        }

        let mediaType = 'image';
        let msgKey = quoted.imageMessage;

        if (quoted.videoMessage) {
            mediaType = 'video';
            msgKey = quoted.videoMessage;
        } else if (quoted.audioMessage) {
            mediaType = 'audio';
            msgKey = quoted.audioMessage;
        } else if (quoted.documentMessage) {
            mediaType = 'document';
            msgKey = quoted.documentMessage;
        }

        await reply("⏳ *Uploading media to server...*");

        const stream = await downloadContentFromMessage(msgKey, mediaType);
        let buffer = Buffer.alloc(0);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        let ext = mime.split('/')[1] || 'bin';
        if (mediaType === 'audio' || mime.includes('audio') || mime.includes('ogg') || quoted.audioMessage) {
            ext = 'mp3';
        }

        const tempFilePath = path.join(os.tmpdir(), `hasindu_${Date.now()}.${ext}`);
        fs.writeFileSync(tempFilePath, buffer);

        let mediaUrl = "";

        try {
            // පළමුව Catbox හරහා උත්සාහ කිරීම
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(tempFilePath));

            const response = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders(),
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            mediaUrl = typeof response.data === 'string' ? response.data.trim() : '';
        } catch (catboxErr) {
            console.warn("Catbox failed, switching to Telegraph backup...", catboxErr.message);
        }

        // Catbox ෆේල් වුණොත් Telegraph හරහා අප්ලෝඩ් කිරීම (මෙය කිසිදා 412 දෙන්නේ නැත)
        if (!mediaUrl || !mediaUrl.startsWith('http')) {
            const form2 = new FormData();
            form2.append('file', fs.createReadStream(tempFilePath));

            const telegraphRes = await axios.post('https://telegra.ph/upload', form2, {
                headers: {
                    ...form2.getHeaders(),
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });

            if (telegraphRes.data && telegraphRes.data[0] && telegraphRes.data[0].src) {
                mediaUrl = "https://telegra.ph" + telegraphRes.data[0].src;
            }
        }

        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        if (!mediaUrl || !mediaUrl.startsWith('http')) {
            throw new Error('All upload servers failed to return a valid URL.');
        }

        const fileSize = (buffer.length / 1024 / 1024).toFixed(2) + ' MB';
        const typeStr = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);

        const newsletterContext = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363412673839541@newsletter",
                newsletterName: "🥷 Hasindu MD"
            }
        };

        const txt = `
🔗 *MEDIA UPLOADER*

📂 *Type:* ${typeStr}
📊 *Size:* ${fileSize}

🚀 *Url:* \`${mediaUrl}\`

_© ᴘᴏᴡᴇʀᴅ ʙʏ 👨‍💻 Hasindu-MD_`.trim();

        await conn.sendMessage(
            from,
            {
                text: txt,
                contextInfo: newsletterContext
            },
            { quoted: mek }
        );

    } catch (e) {
        console.error("Upload Error:", e);
        return reply(`❌ Error uploading media:\n${e.message}`);
    }
});
