// ============================================================
// HASINDU-MD - ALL-IN-ONE MENU SYSTEM
// Commands : .menu | .downloadmenu | .ownermenu
// Baileys  : 7.0.0-rc14
// ============================================================

const os = require('os');
const { cmd, quickReplyButton, safeInteractiveMessage } = require('../hasindu');

// ============================================================
// 1. MAIN MENU COMMAND (.menu)
// ============================================================
cmd(
    {
        pattern: 'menu',
        alias: ['help', 'panel'],
        desc: 'Show bot main command menu',
        category: 'main',
        react: '📜',
        filename: __filename
    },
    async (conn, mek, m, { from, reply, config, prefix }) => {
        try {
            const botName = config?.BOT_NAME || '👨‍💻 Hasindu-MD';
            const owner = config?.OWNER_NAME || 'Hasindu MD';
            const footer = config?.BOT_FOOTER || '👨‍💻 Hasindu-MD';
            const commandPrefix = prefix || '.';
            const menuImage = 'https://files.catbox.moe/ezq6dm.jpeg';

            const uptimeSeconds = Math.floor(process.uptime());
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = uptimeSeconds % 60;

            let uptime = '';
            if (days > 0) uptime += `${days}d `;
            if (hours > 0 || days > 0) uptime += `${hours}h `;
            if (minutes > 0 || hours > 0 || days > 0) uptime += `${minutes}m `;
            uptime += `${seconds}s`;

            const menuText = `
*╭───────────────*
│  🧚‍♀️ *${botName}* 🧚‍♀️
*╰───────────────*

╭╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╮
┆ 🧚‍♀️ Status   : *ONLINE*
┆ ⏱️ Uptime   : *${uptime.trim()}*
┆ 👤 Owner    : *${owner}*
┆ ⚙️ Prefix   : *[ ${commandPrefix} ]*
╰╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╯

*📜 MAIN CATEGORIES:*
> Please select a category below to explore commands.

`.trim();

            const buttons = [
                quickReplyButton('📥 DOWNLOAD MENU', `${commandPrefix}downloadmenu`),
                quickReplyButton('🧚‍♀️ OWNER MENU', `${commandPrefix}ownermenu`),
                quickReplyButton('🏓 PING', `${commandPrefix}ping`)
            ];

            try {
                await safeInteractiveMessage(
                    conn,
                    from,
                    {
                        title: '🧚‍♀️ MAIN PANEL',
                        subtitle: 'Select an option below',
                        text: menuText,
                        image: menuImage,
                        footer: footer,
                        buttons: buttons,
                        quoted: mek
                    }
                );
            } catch (buttonError) {
                await conn.sendMessage(
                    from,
                    { image: { url: menuImage }, caption: menuText },
                    { quoted: mek }
                );
            }

        } catch (error) {
            console.error('[HASINDU MD] Menu command error:', error);
            if (typeof reply === 'function') {
                await reply('❌ *Menu failed to load.*');
            }
        }
    }
);


// ============================================================
// 2. DOWNLOAD MENU COMMAND (.downloadmenu)
// ============================================================
cmd(
    {
        pattern: 'downloadmenu',
        alias: ['dlmenu', 'downloads'],
        desc: 'Show download commands menu',
        category: 'download',
        react: '📥',
        filename: __filename
    },
    async (conn, mek, m, { from, reply, config, prefix }) => {
        try {
            const footer = config?.BOT_FOOTER || '👨‍💻 Hasindu-MD';
            const commandPrefix = prefix || '.';
            const dlImage = 'https://files.catbox.moe/ezq6dm.jpeg';

            const dlText = `
*╭───────────────*
│  📥 *DOWNLOAD MENU* 
*╰───────────────*

Here are the available download commands:

> ⭔ *${commandPrefix}fb* - Download Facebook Videos
> ⭔ *${commandPrefix}tiktok* - Download TikTok Videos
> ⭔ *${commandPrefix}ytmp4* - Download YouTube Videos
> ⭔ *${commandPrefix}spotify* - Download Spotify Songs

*Type the command with the link to download!*
`.trim();

            const buttons = [
                quickReplyButton('📜 MAIN MENU', `${commandPrefix}menu`),
                quickReplyButton('🧚‍♀️ OWNER MENU', `${commandPrefix}ownermenu`)
            ];

            try {
                await safeInteractiveMessage(
                    conn,
                    from,
                    {
                        title: '📥 DOWNLOADS',
                        subtitle: 'Media Downloader Panel',
                        text: dlText,
                        image: dlImage,
                        footer: footer,
                        buttons: buttons,
                        quoted: mek
                    }
                );
            } catch (err) {
                await conn.sendMessage(
                    from,
                    { image: { url: dlImage }, caption: dlText },
                    { quoted: mek }
                );
            }
        } catch (error) {
            console.error('[HASINDU MD] Download Menu error:', error);
        }
    }
);


// ============================================================
// 3. OWNER MENU COMMAND (.ownermenu)
// ============================================================
cmd(
    {
        pattern: 'ownermenu',
        alias: ['adminmenu', 'owner'],
        desc: 'Show owner commands menu',
        category: 'owner',
        react: '🧚‍♀️',
        filename: __filename
    },
    async (conn, mek, m, { from, reply, config, prefix }) => {
        try {
            const footer = config?.BOT_FOOTER || '👨‍💻 Hasindu-MD';
            const commandPrefix = prefix || '.';
            const ownerImage = 'https://files.catbox.moe/ezq6dm.jpeg';

            const ownerText = `
*╭───────────────*
│  🧚‍♀️ *OWNER MENU* 🧚‍♀️
*╰───────────────*

Here are the restricted owner controls:

> ⭔ *${commandPrefix}restart* - Restart Bot
> ⭔ *${commandPrefix}block* - Block User
> ⭔ *${commandPrefix}unblock* - Unblock User
> ⭔ *${commandPrefix}setpp* - Change Bot Profile Pic

*⚠️ Authorized personnel only!*
`.trim();

            const buttons = [
                quickReplyButton('📜 MAIN MENU', `${commandPrefix}menu`),
                quickReplyButton('📥 DOWNLOAD MENU', `${commandPrefix}downloadmenu`)
            ];

            try {
                await safeInteractiveMessage(
                    conn,
                    from,
                    {
                        title: '🧚‍♀️ OWNER PANEL',
                        subtitle: 'Exclusive Controls',
                        text: ownerText,
                        image: ownerImage,
                        footer: footer,
                        buttons: buttons,
                        quoted: mek
                    }
                );
            } catch (err) {
                await conn.sendMessage(
                    from,
                    { image: { url: ownerImage }, caption: ownerText },
                    { quoted: mek }
                );
            }
        } catch (error) {
            console.error('[HASINDU MD] Owner Menu error:', error);
        }
    }
);

