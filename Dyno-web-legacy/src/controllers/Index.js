'use strict';

const accounting = require('accounting');
const superagent = require('superagent');
const moment = require('moment');
const Controller = require('../core/Controller');
const config = require('../core/config');
const logger = require('../core/logger');
const redis = require('../core/redis');

/**
 * Index controller
 * @class Index
 * @extends {Controller}
 */
class Index extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			index: {
				method: 'get',
				uri: '/',
				handler: this.index.bind(this),
			},
			commands: {
				method: 'get',
				uri: '/commands',
				handler: this.commands.bind(this),
			},
			discord: {
				method: 'get',
				uri: '/discord',
				handler: (_, req, res) => res.redirect(config.invite),
			},
			invite: {
				method: 'get',
				uri: '/invite',
				handler: (_, req, res) =>
					res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${config.client.id}&scope=bot%20identify%20guilds&response_type=code&redirect_uri=https://www.dynobot.net/return&permissions=${config.defaultPermissions}`),
			},
			donate: {
				method: 'get',
				uri: '/donate',
				handler: (_, req, res) => res.redirect(`https://www.patreon.com/dyno`),
			},
			stats: {
				method: 'get',
				uri: '/stats',
				handler: (_, req, res) => res.redirect('https://p.datadoghq.com/sb/6ac51d7ba-f48fd68210'),
			},
			faq: {
				method: 'get',
				uri: '/faq',
				handler: (_, req, res) => res.render('faq'),
			},
			upgrade: {
				method: 'get',
				uri: '/upgrade',
				handler: (_, req, res) => res.redirect('https://www.patreon.com/bePatron?c=543081&rid=1233178'),
			},
			ping: {
				method: 'get',
				uri: '/ping',
				handler: (_, req, res) => res.send('OK'),
			},
			terms: {
				method: 'get',
				uri: '/terms',
				handler: (_, req, res) => res.render('terms'),
			},
			privacy: {
				method: 'get',
				uri: '/privacy',
				handler: (_, req, res) => res.render('privacy'),
			},
		};
	}

	/**
	 * Index handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	index(bot, req, res) {
		if (req.query && req.query.code) {
			const tokenUrl = 'https://discordapp.com/api/oauth2/token';

			return superagent
				.post(tokenUrl)
				.set('Content-Type', 'application/x-www-form-urlencoded')
				.set('Accept', 'application/json')
				.send({
					grant_type: 'authorization_code',
					code: req.query.code,
					redirect_uri: `https://www.carbonitex.net/discord/data/botoauth.php`,
					client_id: config.client.id,
					client_secret: config.client.secret,
				})
				.end((err, r) => {
					if (err) {
						logger.error(err);
						return res.redirect('/');
					}

					if (r.body && r.body.access_token) {
						req.session.auth = r.body;
					}

					if (req.query.guild_id) {
						return res.redirect(`/server/${req.query.guild_id}`);
					}

					if (req.get('Referer')) {
						const guildMatch = new RegExp('guild_id=([0-9]+)&').exec(req.get('Referer'));
						if (guildMatch && guildMatch.length > 1) {
							return res.redirect(`/server/${guildMatch[1]}`);
						}
					}

					return res.redirect('/');
				});
		}

        const timeout = setTimeout(() => res.render('index'), 1000);

		res.locals.title = 'Dyno Discord Bot - Home';
		res.locals.t = moment().format('YYYYMMDDHHmm');

        redis.hgetallAsync(`dyno:guilds:${config.client.id}`).then(data => {
            let guildCount = Object.values(data).reduce((a, b) => a += parseInt(b), 0);
            res.locals.guildCount = accounting.formatNumber(guildCount);
            clearTimeout(timeout);
            return res.render('index');
        });
	}

	commands(bot, req, res) {
		let commands = config.commands;

		// filter commands that shouldn't be shown
		commands = commands.filter(o => (!o.hideFromHelp && !o.disabled) && o.permissions !== 'admin');

		// remove duplicates
		commands = [...new Set(commands)];

		// index by group
		commands = commands.reduce((i, o) => {
			i[o.group || o.module] = i[o.group || o.module] || [];
			i[o.group || o.module].push(o);
			return i;
		}, {});

		let commandGroups = [];

		for (let key in commands) {
			commandGroups.push({
				name: key,
				commands: commands[key],
			});
		}

		commandGroups[0].isActive = true;

		res.locals.title = 'Dyno Discord Bot - Commands';
		res.locals.commands = commandGroups;

		return res.render('commands');
	}
}

module.exports = Index;
