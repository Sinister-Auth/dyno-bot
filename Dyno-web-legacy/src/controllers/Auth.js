'use strict';

const superagent = require('superagent');
const Controller = require('../core/Controller');
const config = require('../core/config');
const logger = require('../core/logger');
const utils = require('../core/utils');

const redirect_base = (!config.site.port || parseInt(config.site.port) === 80) ?
	`${config.site.host}` :
	`${config.site.host}:${config.site.port}`;

const authUrl = `https://discordapp.com/oauth2/authorize?redirect_uri=${redirect_base}%2Freturn` +
	`&scope=identify guilds&response_type=code&client_id=${config.client.id}`;
const tokenUrl = 'https://discordapp.com/api/oauth2/token';

class Auth extends Controller {
	constructor(bot) {
		super(bot);

		return {
			before: {
				method: 'use',
				uri: [
					'/',
					'/commands/',
					'/server/:id',
					'/server/:id/playlist',
				],
				handler: this.before.bind(this),
			},
			beforeAll: {
				method: 'use',
				uri: '*',
				handler: this.beforeAll.bind(this),
			},
			auth: {
				method: 'get',
				uri: '/auth',
				handler: this.auth.bind(this),
			},
			logout: {
				method: 'get',
				uri: '/logout',
				handler: this.logout.bind(this),
			},
			return: {
				method: 'get',
				uri: '/return',
				handler: this.return.bind(this),
			},
			forward: {
				method: 'get',
				uri: '/forward',
				handler: this.forward.bind(this),
			},
		};
	}

	/**
	 * Before middleware
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 * @param {Function} next Next callback
	 */
	async before(bot, req, res, next) {
		// handle redirectTo
		if (req.session && req.session.authServer) {
			let authServer = req.session.authServer,
				redirectTo = `/server/${authServer}`;

			delete req.session.authServer;

			const guild = await this.getRESTData('Guild', null, authServer);
			if (guild) {
				return res.redirect(redirectTo);
			}
		}

		res.locals.config = config;

		if (!req.session || !req.session.auth || res.locals.user) return next();

		if (req.session.user) {
			const guilds = req.session.guilds;
			if (req.params.id) {
				const guild = guilds.find(g => g.id === req.params.id);

				if (guild) {
					res.locals.isManager = true;
				}
			}

			res.locals.isAdmin = req.session.isAdmin;
			res.locals.user = req.session.user;
			res.locals.userkey = utils.sha256(`${config.site.secret}${req.session.userid}`);
			res.locals.guilds = req.session.guilds;

			return next();
		}

		const token = req.session.auth.access_token;

		return this.fetchUser(token, req, res, next);
	}

	async beforeAll(bot, req, res, next) {
		if (!req.session || !req.session.auth || !req.session.lastAuth) return next();
		if ((Date.now() - req.session.lastAuth) < 60000) return next();

		const token = req.session.auth.access_token;

		console.log('Refetching user data...');

		return this.fetchUser(token, req, res, next);
	}

	/**
	 * Auth request handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	auth(bot, req, res) {
		if (req.session.auth) {
			return res.redirect('/');
		}
		return res.redirect(authUrl);
	}

	/**
	 * Logout handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	logout(bot, req, res) {
		req.session.destroy(err => {
			if (err) {
				logger.error(err);
			}
			return res.redirect('/');
		});
	}

	/**
	 * OAuth redirect handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	return(bot, req, res) {
		if (req.query.error) {
			return res.redirect('/');
		}

		return superagent
			.post(tokenUrl)
			.set('Content-Type', 'application/x-www-form-urlencoded')
			.set('Accept', 'application/json')
			.send({
				grant_type: 'authorization_code',
				code: req.query.code,
				redirect_uri: `${redirect_base}/return`,
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

	/**
	 * Forwarding route for mobile
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 * @returns {*}
	 */
	forward(bot, req, res) {
		const query = req.originalUrl.split('?').slice(1);
		logger.debug(query);
		return res.redirect(`dyno://return?${query}`);
	}
}

module.exports = Auth;
