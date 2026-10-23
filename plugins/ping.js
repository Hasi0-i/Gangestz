// ============================================================
// HASINDU-MD - PING COMMAND
// Command : .ping
// Alias   : .speed
//
// Baileys : 7.0.0-rc14
// Compatible with Hasindu-MD Alive System
// ============================================================

const {
    cmd,
    quickReplyButton,
    safeInteractiveMessage
} = require('../hasindu');


// ============================================================
// PING COMMAND
// ============================================================

cmd(

    {
        pattern: 'ping',

        alias: [
            'speed'
        ],

        desc:
            'Check bot response speed',

        category:
            'main',

        react:
            '🏓',

        filename:
            __filename
    },


    async (

        conn,

        mek,

        m,

        {
            from,
            reply,
            prefix,
            config
        }

    ) => {

        try {

            // ==================================================
            // START TIME
            // ==================================================

            const startTime =
                Date.now();


            // ==================================================
            // PING IMAGE
            // ==================================================

            const pingImage =
                'https://files.catbox.moe/ezq6dm.jpeg';


            const owner =
                config?.OWNER_NAME ||
                'Hasindu MD';

            const footer =
                config?.BOT_FOOTER ||
                '👨‍💻 Hasindu-MD';


            // ==================================================
            // INITIAL RESPONSE (Text)
            // ==================================================

            const sent =
                await conn.sendMessage(

                    from,

                    {
                        text:
                            '🏓 *Pinging...*'
                    },

                    {
                        quoted:
                            mek
                    }

                );


            // ==================================================
            // CALCULATE RESPONSE TIME
            // ==================================================

            const latency =
                Date.now() -
                startTime;


            // ==================================================
            // FINAL PING MESSAGE TEXT
            // ==================================================

            const pingText = `

*👨‍💻Hasindu-MD*
━━━━━━━━━━━━━━━━━━━━
🏓 *PONG!*

⚡ Response : *${latency} ms*
🟢 Status   : *ONLINE*
🚀 System   : *RUNNING*

━━━━━━━━━━━━━━━━━━━━
> ${owner}
`.trim();


            // ==================================================
            // COMMAND PREFIX
            // ==================================================

            const commandPrefix =
                prefix || '.';


            // ==================================================
            // NATIVE FLOW BUTTONS
            // ==================================================

            const buttons = [

                quickReplyButton(
                    '📜 MENU',
                    `${commandPrefix}menu`
                ),

                quickReplyButton(
                    '🏓 PING',
                    `${commandPrefix}ping`
                )

            ];


            // ==================================================
            // EDIT / UPDATE MESSAGE WITH INTERACTIVE IMAGE
            // ==================================================

            try {

                // First try sending/editing with interactive message & image
                await safeInteractiveMessage(

                    conn,

                    from,

                    {
                        title:
                            '⚡ PONG!',

                        subtitle:
                            `Speed: ${latency}ms`,

                        text:
                            pingText,

                        image:
                            pingImage,

                        footer:
                            footer,

                        buttons:
                            buttons,

                        quoted:
                            mek
                    }
                );

                // Optional: Delete the old "Pinging..." text message if desired, or keep it.

            } catch (buttonError) {

                console.log(

                    '[HASINDU MD] Ping interactive send failed:',

                    buttonError?.message ||
                    buttonError
                );


                // ==================================================
                // IMAGE WITH CAPTION FALLBACK
                // ==================================================

                try {

                    await conn.sendMessage(

                        from,

                        {
                            image: {
                                url: pingImage
                            },
                            caption:
                                pingText
                        },

                        {
                            quoted:
                                mek
                        }
                    );

                } catch (textError) {

                    console.log(

                        '[HASINDU MD] Ping text fallback failed:',

                        textError?.message ||
                        textError
                    );

                    try {

                        if (
                            typeof reply ===
                            'function'
                        ) {

                            await reply(
                                pingText
                            );
                        }

                    } catch (_) {}

                }

            }

        } catch (error) {

            // ==================================================
            // ERROR HANDLER
            // ==================================================

            console.error(

                '[HASINDU MD] Ping command error:',

                error
            );


            try {

                await reply(

                    '❌ *Ping failed.*\n\n' +
                    'Please try again.'

                );

            } catch (_) {}

        }

    }

);
