const {
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto
} = require('@whiskeysockets/baileys');

/**
 * Build and relay a WhatsApp native-flow interactive message.
 * This helper intentionally reuses the bot's existing socket.
 */
async function sendInteractive(conn, jid, {
    body,
    footer = '👨‍💻 Hasindu-MD',
    title = 'HASINDU MD',
    subtitle = 'WhatsApp Multi Device Bot',
    imageUrl,
    buttons = [],
    mentions = [],
    quoted
}) {
    const nativeButtons = buttons
        .filter(Boolean)
        .map(button => ({
            name: button.name,
            buttonParamsJson: JSON.stringify(button.params || {})
        }));

    let header = proto.Message.InteractiveMessage.Header.create({
        title,
        subtitle,
        hasMediaAttachment: false
    });

    if (imageUrl) {
        try {
            const media = await prepareWAMessageMedia(
                { image: { url: imageUrl } },
                { upload: conn.waUploadToServer }
            );

            header = proto.Message.InteractiveMessage.Header.create({
                title,
                subtitle,
                hasMediaAttachment: true,
                imageMessage: media.imageMessage
            });
        } catch (error) {
            console.error('[HASINDU-MD] Interactive image error:', error.message);
        }
    }

    const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: body }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
        header,
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: nativeButtons
        }),
        contextInfo: {
            mentionedJid: mentions,
            forwardingScore: 999,
            isForwarded: true
        }
    });

    const generated = generateWAMessageFromContent(
        jid,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        },
        { quoted }
    );

    await conn.relayMessage(jid, generated.message, {
        messageId: generated.key.id
    });

    return generated;
}

function quickReply(displayText, id) {
    return {
        name: 'quick_reply',
        params: { display_text: displayText, id }
    };
}

function singleSelect(title, sections) {
    return {
        name: 'single_select',
        params: { title, sections }
    };
}

module.exports = {
    sendInteractive,
    quickReply,
    singleSelect
};
