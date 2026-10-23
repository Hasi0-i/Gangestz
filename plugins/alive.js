// ============================================================
// HASINDU-MD - ALIVE COMMAND
// Command : .alive
// Alias   : .online | .bot
//
// Baileys : 7.0.0-rc14
// Native Flow Quick Reply Buttons
// ============================================================

const os = require('os');

const {
    cmd,
    quickReplyButton,
    safeInteractiveMessage
} = require('../hasindu');


// ============================================================
// ALIVE COMMAND
// ============================================================

cmd(

    {
        pattern: 'alive',

        alias: [
            'online',
            'bot'
        ],

        desc:
            'Check bot online status',

        category:
            'main',

        react:
            '👨‍💻',

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
            config,
            prefix
        }

    ) => {

        try {

            // ==================================================
            // BOT INFORMATION
            // ==================================================

            const botName =

                config?.BOT_NAME ||

                config?.BOTNAME ||

                '👨‍💻 Hasindu-MD';


            const version =

                config?.BOT_VERSION ||

                config?.VERSION ||

                '2.0.0';


            const owner =

                config?.OWNER_NAME ||

                'Hasindu';


            const footer =

                config?.BOT_FOOTER ||

                '👨‍💻 Hasindu-MD';


            // ==================================================
            // ALIVE IMAGE
            // ==================================================

            const aliveImage =
                'https://files.catbox.moe/ezq6dm.jpeg';


            // ==================================================
            // UPTIME
            // ==================================================

            const uptimeSeconds =
                Math.floor(
                    process.uptime()
                );


            const days =
                Math.floor(
                    uptimeSeconds / 86400
                );


            const hours =
                Math.floor(
                    (
                        uptimeSeconds %
                        86400
                    ) / 3600
                );


            const minutes =
                Math.floor(
                    (
                        uptimeSeconds %
                        3600
                    ) / 60
                );


            const seconds =
                uptimeSeconds % 60;


            let uptime = '';


            if (days > 0) {

                uptime +=
                    `${days}d `;
            }


            if (
                hours > 0 ||
                days > 0
            ) {

                uptime +=
                    `${hours}h `;
            }


            if (
                minutes > 0 ||
                hours > 0 ||
                days > 0
            ) {

                uptime +=
                    `${minutes}m `;
            }


            uptime +=
                `${seconds}s`;


            uptime =
                uptime.trim();


            // ==================================================
            // MEMORY
            // ==================================================

            const memory =
                process.memoryUsage();


            const memoryMB =

                (
                    memory.rss /
                    1024 /
                    1024
                ).toFixed(1);


            // ==================================================
            // PLATFORM
            // ==================================================

            const platform =
                os.platform();


            const nodeVersion =
                process.version;


            // ==================================================
            // ALIVE TEXT
            // ==================================================

            const aliveText = `

*👨‍💻Hasindu-MD*
━━━━━━━━━━━━━━━━━━━━
🧚‍♀️ Status   : *ONLINE*
⏱️ Uptime   : *${uptime}*
🚀 Version  : *${version}*
💾 Memory   : *${memoryMB} MB*
🖥️ Platform : *${platform}*
🟢 Node.js  : *${nodeVersion}*

━━━━━━━━━━━━━━━━━━━━
👨‍💻 *Hasindu-MD is a powerful WhatsApp bot built for fast, reliable and smart automation.*

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
            // SEND INTERACTIVE MESSAGE WITH IMAGE FALLBACK SAFETY
            // ==================================================

            try {

                await safeInteractiveMessage(

                    conn,

                    from,

                    {

                        title:
                            '🧚‍♀️ HASINDU MD',

                        subtitle:
                            '🤖 Bot Online',

                        text:
                            aliveText,

                        image:
                            aliveImage,

                        footer:
                            footer,

                        buttons:
                            buttons,

                        quoted:
                            mek
                    }
                );


            } catch (buttonError) {

                console.log(

                    '[HASINDU MD] Alive interactive send failed:',

                    buttonError?.message ||
                    buttonError
                );


                // ==================================================
                // IMAGE WITH CAPTION FALLBACK (Ensures image always shows)
                // ==================================================

                try {

                    await conn.sendMessage(

                        from,

                        {
                            image: {
                                url: aliveImage
                            },
                            caption:
                                aliveText
                        },

                        {
                            quoted:
                                mek
                        }
                    );

                } catch (textError) {

                    console.log(

                        '[HASINDU MD] Alive text fallback failed:',

                        textError?.message ||
                        textError
                    );

                    try {

                        if (
                            typeof reply ===
                            'function'
                        ) {

                            await reply(
                                aliveText
                            );
                        }

                    } catch (_) {}

                }

            }

        } catch (error) {

            // ==================================================
            // COMMAND ERROR
            // ==================================================

            console.error(

                '[HASINDU MD] Alive command error:',

                error
            );


            try {

                if (
                    typeof reply ===
                    'function'
                ) {

                    await reply(

                        '❌ *Alive command failed.*\n\n' +
                        'Please try again.'
                    );
                }

            } catch (_) {}

        }

    }

);

 
