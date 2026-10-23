const { proto, getContentType, jidNormalizedUser } = require('@whiskeysockets/baileys');

const sms = (conn, m) => {
    if (!m) return m;

    let M = proto.WebMessageInfo;

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat ? m.chat.endsWith('@g.us') : false;

        m.sender = jidNormalizedUser(
            m.fromMe
                ? conn.user.id
                : (
                    m.participant ||
                    m.key.participant ||
                    m.chat
                )
        );
    }

    if (m.message) {

        // ViewOnce / Ephemeral
        if (
            m.message.viewOnceMessageV2 ||
            m.message.viewOnceMessage ||
            m.message.ephemeralMessage
        ) {
            const type =
                m.message.viewOnceMessageV2
                    ? 'viewOnceMessageV2'
                    : m.message.viewOnceMessage
                        ? 'viewOnceMessage'
                        : 'ephemeralMessage';

            if (m.message[type]?.message) {
                m.message = m.message[type].message;
            }
        }

        m.mtype = getContentType(m.message);

        m.msg = m.mtype
            ? m.message[m.mtype]
            : undefined;

        // ==============================
        // TEXT / BUTTON / LIST SUPPORT
        // ==============================

        if (m.mtype === 'conversation') {

            m.body = m.message.conversation || '';

        } else if (m.mtype === 'imageMessage') {

            m.body = m.message.imageMessage?.caption || '';

        } else if (m.mtype === 'videoMessage') {

            m.body = m.message.videoMessage?.caption || '';

        } else if (m.mtype === 'extendedTextMessage') {

            m.body = m.message.extendedTextMessage?.text || '';

        // Old WhatsApp Buttons
        } else if (m.mtype === 'buttonsResponseMessage') {

            m.body =
                m.message.buttonsResponseMessage?.selectedButtonId || '';

        // WhatsApp List
        } else if (m.mtype === 'listResponseMessage') {

            m.body =
                m.message.listResponseMessage
                    ?.singleSelectReply
                    ?.selectedRowId || '';

        // Template Button
        } else if (m.mtype === 'templateButtonReplyMessage') {

            m.body =
                m.message.templateButtonReplyMessage
                    ?.selectedId || '';

        // Interactive / Native Flow Button
        } else if (m.mtype === 'interactiveResponseMessage') {

            try {
                const response =
                    m.message.interactiveResponseMessage
                        ?.nativeFlowResponseMessage
                        ?.paramsJson;

                if (response) {
                    const data = JSON.parse(response);

                    m.body =
                        data.id ||
                        data.button_id ||
                        data.selectedId ||
                        data.selected_id ||
                        data.selectedRowId ||
                        data.selected_row_id ||
                        '';
                } else {
                    m.body = '';
                }

            } catch (e) {
                m.body = '';
            }

        // Message Context Info
        } else if (m.mtype === 'messageContextInfo') {

            m.body =
                m.message.messageContextInfo
                    ?.buttonsResponseMessage
                    ?.selectedButtonId ||

                m.message.messageContextInfo
                    ?.listResponseMessage
                    ?.singleSelectReply
                    ?.selectedRowId ||

                m.text ||

                '';
        } else {

            m.body = '';
        }

        // ==============================
        // BUTTON ID
        // ==============================

        m.buttonId = m.body || '';

        // ==============================
        // TEXT ALIAS
        // ==============================

        m.text = m.body || '';

        // ==============================
        // REPLY FUNCTION
        // ==============================

        m.reply = (
            text,
            chatId = m.chat,
            options = {}
        ) => {
            return conn.sendMessage(
                chatId,
                {
                    text: text
                },
                {
                    quoted: m,
                    ...options
                }
            );
        };
    }

    return m;
};

module.exports = { sms };

