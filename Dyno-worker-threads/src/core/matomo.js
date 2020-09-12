var MatomoTracker = require('matomo-tracker');
var logger = require('./logger');

let matomoUsers, matomoGuilds;

function initMatomo(dyno) {
    matomoUsers = new MatomoTracker(4, 'http://10.12.0.69/piwik.php');
    matomoGuilds = new MatomoTracker(5, 'http://10.12.0.69/piwik.php');

    matomoUsers.on('error', (err) => {
        logger.error(err);
    });

    matomoGuilds.on('error', (err) => {
        logger.error(err);
    });

    dyno.internalEvents.on('actionlog', ({ type, guild }) => {
        if (dyno.globalConfig && dyno.globalConfig.matomo === false) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        if (type === 'commands') {
            return;
        }

        matomoGuilds.track({
            url: `/modules/actionlog/${type}`,
            action_name: 'ActionLog',
            ua: 'Node.js',
            e_c: 'AutomatedAction',
            e_a: 'ActionLog',
            e_n: type,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Guild ID', guild.id],
            }),
        });
    });

    dyno.internalEvents.on('autoresponder', ({ type, guild }) => {
        if (dyno.globalConfig && dyno.globalConfig.matomo === false) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        matomoGuilds.track({
            url: `/modules/autoresponder/${type}`,
            action_name: 'AutoResponder',
            ua: 'Node.js',
            e_c: 'AutomatedAction',
            e_a: 'AutoResponder',
            e_n: type,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Guild ID', guild.id],
            }),
        });
    });

    dyno.internalEvents.on('automod', ({ type, guild }) => {
        if (dyno.globalConfig && dyno.globalConfig.matomo === false) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        matomoGuilds.track({
            url: `/modules/automod/${type}`,
            action_name: 'AutoMod',
            ua: 'Node.js',
            e_c: 'AutomatedAction',
            e_a: 'AutoMod',
            e_n: type,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Guild ID', guild.id],
            }),
        });
    });

    dyno.commands.on('command', ({ command, message, guildConfig, args, time }) => {
        if (dyno.globalConfig && dyno.globalConfig.matomo === false) { return; }
        if (!matomoUsers || !matomoGuilds) {
            return;
        }

        const user = message.author;
        const channel = message.channel;
        const guild = channel.guild;
        matomoUsers.track({
            url: `/commands/${command.name}/${user.id}`,
            action_name: 'CommandUsed',
            ua: 'Node.js',
            e_c: 'Command',
            e_a: command.module || command.group,
            e_n: command.name,
            gt_ms: time,
            uid: user.id,
            _cvar: JSON.stringify({
                1: ['Command Name', command.name],
                2: ['Arguments', args.join(' ')],
                3: ['Guild ID', guild.id],
                4: ['Channel ID', channel.id],
                5: ['User ID', user.id],
            }),
        });

        matomoGuilds.track({
            url: `/commands/${command.name}/${user.id}`,
            action_name: 'CommandUsed',
            ua: 'Node.js',
            e_c: 'Command',
            e_a: command.module || command.group,
            e_n: command.name,
            gt_ms: time,
            uid: guild.id,
            _cvar: JSON.stringify({
                1: ['Command Name', command.name],
                2: ['Arguments', args.join(' ')],
                3: ['Guild ID', guild.id],
                4: ['Channel ID', channel.id],
                5: ['User ID', user.id],
            }),
        });
    });
}

module.exports = {
    initMatomo,
};
