const { cmd } = require('../hasindu');

cmd({
    pattern: "jid",
    alias: ["chatid", "gjid", "mylid"],
    desc: "Get full JID and LID of current chat/user (Creator Only)",
    react: "🆔",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, {
    from, isGroup, isCreator, reply, sender
}) => {
    try {
        if (!isCreator) {
            return reply("❌ *Command Restricted* - Only my creator can use this.");
        }

        // Hasindu MD Newsletter Context
        const newsletterContext = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363412673839541@newsletter",
                newsletterName: "🥷 Hasindu MD"
            }
        };

        let responseText = "";

        if (isGroup) {
            const groupJID = from.includes("@g.us")
                ? from
                : `${from}@g.us`;

            responseText =
`╭──〔 *🏠 GROUP JID* 〕
├─ 🆔 JID: \`${groupJID}\`
╰───────────────────🚀`;

        } else {
            const userJID = sender.includes("@s.whatsapp.net")
                ? sender
                : `${sender}@s.whatsapp.net`;

            const userLID =
                m.userLid ||
                m.senderLid ||
                (conn.user && conn.user.lid) ||
                "Not Detected";

            responseText =
`╭──〔 *👤 USER DETAILS* 〕
├─ 🆔 JID: \`${userJID}\`
├─ 🆔 LID: \`${userLID}\`
╰───────────────────🚀`;
        }

        await conn.sendMessage(
            from,
            {
                text: responseText,
                contextInfo: newsletterContext
            },
            { quoted: mek }
        );

    } catch (e) {
        console.error("JID Error:", e);
        return reply(`⚠️ Error fetching JID:\n${e.message}`);
    }
});
