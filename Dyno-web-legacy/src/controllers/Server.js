'use strict';

const Controller = require('../core/Controller');
const models = require('../core/models');
const config = require('../core/config');
const logger = require('../core/logger');
const utils = require('../core/utils');
const { Queue } = models;

const redirect_base = (!config.site.port || parseInt(config.site.port) === 80) ?
	`${config.site.host}` :
	`${config.site.host}:${config.site.port}`;

/**
 * Server controller
 */
class Server extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		return {
			beforeServer:{
				method: 'use',
				uri: [
					'/server/:id',
					'/server/:id/*',
				],
				handler: this.beforeServer.bind(this),
			},
			server: {
				method: 'get',
				uri: '/server/:id',
				handler: this.server.bind(this),
			},
			playlist: {
				method: 'get',
				uri: '/playlist/:id',
				handler: this.playlist.bind(this),
			},
		};
	}

	/**
	 * Helper method to return if user is an admin of a server
	 * @param {Object} server Server object
	 * @param {Object} user User object
	 * @returns {Boolean}
	 */
	isAdmin(guild, member) {
		if (guild.owner_id === member.id) return true;
		return false;
		// return guild.ownerID === member.id || member.permission.has('administrator') || member.permission.has('manageServer');
	}

	async beforeServer(bot, req, res, next) {
		if (!req.session) {
			return next();
		}

		res.locals.stylesheets = ['server'];

		if (req.session.isAdmin) {
			res.locals = Object.assign(res.locals, req.session);
			res.locals.isAdmin = true;
		}

		if (req.session.user) {
			const guilds = req.session.guilds;
			if (req.params.id) {
				let guild;

				guild = guilds.find(g => g.id === req.params.id);

				if (!guild && (req.session.isAdmin || req.session.dashAccess)) {
					guild = await this.getRESTData('Guild', 300, req.params.id);
				}

				if (!guild) {
					return res.redirect('/?error=Unauthorized');
				}

				const hash = utils.sha256(`${config.site.secret}${req.session.user.id}${guild.id}`);

				req.session.apiToken = hash;
				res.locals.isManager = true;
				res.locals.guild = guild;

				if (req.session.dashAccess) {
					res.locals.dashAccess = true;
				}

				if (req.session.isOverseer) {
					res.locals.isOverseer = true;
				}

				config.guilds.fetch(req.params.id).then(guildConfig => {
					res.locals.guildConfig = guildConfig;
					return next();
				}).catch(err => {
					logger.error(err);
					return res.status(500).send('Error getting server information.');
				});
			}

			if (!res.locals.user) {
				res.locals = Object.assign(res.locals, req.session);
			}
		} else {
			return next();
		}
	}

	/**
	 * Server route handler
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async server(bot, req, res) {
		const client = bot.client;

		if (!req.session || !req.session.auth) return res.redirect('/');
		if (!res.locals.isAdmin && !res.locals.isManager) return res.redirect('/');

		const guild = res.locals.guild;
		const guildConfig = res.locals.guildConfig;

		if (guildConfig && guildConfig.beta && !config.beta && !config.test) {
			return res.redirect(`https://beta.dynobot.net/server/${req.params.id}`);
		}

		if (guildConfig && !guildConfig.beta && config.beta && !config.test) {
			return res.redirect(`https://www.dynobot.net/server/${req.params.id}`);
		}

		if (guildConfig && config.isPremium && !config.test) {
			if (!guildConfig.isPremium) {
				return res.redirect(`https://www.dynobot.net/server/${req.params.id}`);
			}
			try {
				let globalConfig = await models.Dyno.findOne().lean().exec();

				globalConfig = globalConfig || {};
				globalConfig.premiumIgnored = globalConfig.premiumIgnored || [];

				if (globalConfig.premiumIgnored.includes(guild.id) ||
					globalConfig.premiumIgnored.includes(req.session.user.id)) {
						return res.redirect(`https://www.dynobot.net/server/${req.params.id}`);
				}
			} catch (err) {
				return res.status(500).send('Something went wrong.');
			}
		}

		if (guildConfig && !config.isPremium && !config.test) {
			if (guildConfig.isPremium) {
				try {
					let globalConfig = await models.Dyno.findOne().lean().exec();

					globalConfig = globalConfig || {};
					globalConfig.premiumIgnored = globalConfig.premiumIgnored || [];

					if (!globalConfig.premiumIgnored.includes(guild.id) &&
						!globalConfig.premiumIgnored.includes(req.session.user.id)) {
							return res.redirect(`https://premium.dyno.gg/manage/${req.params.id}`);
					}
				} catch (err) {
					return res.status(500).send('Something went wrong.');
				}
			}
		}

		const redirect_uri = `${redirect_base}/return`;
		const oauthRedirect = `https://discordapp.com/oauth2/authorize?client_id=${config.client.id}&scope=bot&guild_id=${req.params.id}&response_type=code&redirect_uri=${redirect_uri}&permissions=${config.defaultPermissions}`;

		// redirect to authorize the bot
		if (!guild || !guildConfig) {
			req.session.authServer = req.params.id;
			return res.redirect(oauthRedirect);
		}

		let modules = config.modules,
			commands = config.commands,
			commandGroups = [],
			mods = [];

		let [restGuild, clientMember, channels] = await Promise.all([
			this.getRESTData('Guild', 300, req.params.id),
			this.getRESTData('GuildMember', 60, guild.id, client.user.id),
			this.getRESTData('GuildChannels', 60, guild.id),
			]);

		if (!restGuild) {
			req.session.authServer = req.params.id;
			return res.redirect(oauthRedirect);
		}

		// bot user details
		res.locals.bot = clientMember;

		guildConfig.prefix = guildConfig.prefix || '?';

		// clone server and merge the server config
		res.locals.server = Object.assign(Object.create(guild.toJSON ? guild.toJSON() : guild), restGuild, guildConfig);

		channels = channels || [];

		// stats variables
		res.locals.channels = channels.filter(c => c.type === 0).map(c => Object.create(c));
		res.locals.server.textChannels = channels.filter(c => c.type === 0);
		res.locals.server.voiceChannels = channels.filter(c => c.type === 2);
		// res.locals.server.humans = guild.members.filter(u => u.bot !== true);
		// res.locals.server.bots = guild.members.filter(u => u.bot === true);

		// map mod ids to user objects
		res.locals.server.mods = res.locals.server.mods || [];
		// let mappedMods = [],
		// 	pendingMods = [];

		// for (const id of res.locals.server.mods) {
		// 	pendingMods.push(this.getRESTData('User', 600, id));
		// }

		// mappedMods = await Promise.all(pendingMods);
		// mappedMods = mappedMods.map((index, user) =>
		// 	user || { id: res.locals.server.mods[index], username: 'unknown', discriminator: '' });

		// for (const id of res.locals.server.mods) {
		// 	const user = await this.getRESTData('User', 600, id);
		// 	mappedMods.push(user || { id: id, username: 'unknown', discriminator: '' });
		// }

		// res.locals.server.mods = mappedMods;
		res.locals.server.mods = [];

		res.locals.roles = restGuild.roles && restGuild.roles.size ? utils.sortRoles([...restGuild.roles.values()]) : [];

		const botRole = res.locals.botRole = res.locals.roles.find(r => r.name === 'Dyno');
		res.locals.roles = res.locals.roles.filter(r => r.name !== '@everyone')
			.map(r => {
				r = Object.create(r);
				if (!botRole) return r;
				if (r.name === 'Dyno') r.disabled = true;
				if (r.position > botRole.position || (r.position === botRole.position && r.id < botRole.id)) {
					r.disabled = true;
				}

				return r;
			});

		// map mod role id's to role objects
		res.locals.server.modRoles = res.locals.server.modRoles || [];
		res.locals.server.modRoles = res.locals.server.modRoles.map(id => {
			const role = res.locals.roles.find(r => r.id === id);
			return role || { id: id, name: 'unknown' };
		});

		// list of server admins
		res.locals.admins = [];
		// res.locals.server.admins = [...guild.members.values()].filter(m => m.bot !== true && this.isAdmin(guild, m));

		// filter modules
		res.locals.modules = [...modules.values()].filter(m => {
			let filtered = !(~mods.indexOf(m.module) || (m.core && !m.list));
			if (m.admin && !res.locals.isAdmin) return false;

			if (filtered) {
				mods.push(m.module);
			}

			return filtered;
		});

		res.locals.modules = res.locals.modules.map(m => {
			m.enabled = (guildConfig.modules && guildConfig.modules[m.module] === true);
			m.friendlyName = m.friendlyName || m.module;
			m.partial = `modules/${m.module.toLowerCase()}`;
			m.partialId = m.module.toLowerCase();
			m.needsPerms = false;

            if (m.vipOnly && !guildConfig.vip) {
                m.hide = true;
            }

			if (!m.permissions) return m;

			// const clientMember = res.locals.bot;

			// for (const perm of m.permissions) {
			// 	if (!clientMember.permission.has(perm)) m.needsPerms = true;
			// }

			return m;
		});

		for (const mod of modules.values()) {
			// admin enabled
			if (mod.adminEnabled) {
				let enabled = guildConfig.modules[mod.module];

				if (res.locals.isAdmin || enabled) {
					res.locals.adminEnabled = res.locals.adminEnabled || {};
					res.locals.adminEnabled[mod.module] = true;
				}
			}

			// permissions check
			if (mod.permissions && mod.enabled) {
				// const clientMember = res.locals.bot;

				// for (const perm of mod.permissions) {
				// 	res.locals.needsPerms = res.locals.needsPerms || [];
				// 	if (!clientMember.permission.has(perm) && !res.locals.needsPerms.includes(perm)) {
				// 		res.locals.needsPerms.push(perm);
				// 	}
				// }
			}
		}

		// remove admin commands
		commands = commands.filter(c => c.permissions !== 'admin')
			.map(c => {
				c.enabled = (guildConfig.commands[c.name] === true);
				if (guildConfig.modules[c.group]) c.noedit = true;
				return c;
			}); // .sort((a, b) => +(a.group > b.group) || +(a.group === b.group) - 1);

		// remove duplicates
		commands = [...new Set(commands)];

		// index by group
		commands = commands.reduce((i, o) => {
			i[o.group || o.module] = i[o.group || o.module] || [];
			i[o.group || o.module].push(o);
			return i;
		}, {});

		// create grouped array
		for (let key in commands) {
			commandGroups.push({
				name: key,
				commands: commands[key],
			});
		}

		commandGroups[commandGroups.length - 1].isLast = true;

		res.locals.commands = commandGroups;

		res.locals.globalwords = config.automod.badwords || [];
		res.locals.badwords = guildConfig.automod ? guildConfig.automod.badwords || [] : [];

		return res.render('server');
	}

	/**
	 * Get playlist for a server
	 * @param {Bot} bot Bot instance
	 * @param {Object} req Express request
	 * @param {Object} res Express response
	 */
	async playlist(bot, req, res) {
		res.locals.stylesheets = ['server'];

		try {
			var [guild, doc] = await Promise.all([
				this.getRESTData('Guild', 300, req.params.id),
				Queue.findOne({ guild: req.params.id }).lean().exec(),
			]);
		} catch (err) {
			return res.redirect('/?error=PlaylistError');
		}

		if (!guild) {
			return res.redirect('/?error=NotFound');
		}

		const queue = doc ? doc.queue || [] : [];

		for (let i = 0; i < queue.length; i++) {
			queue[i].index = i + 1;
		}

		res.locals.server = guild;
		res.locals.queue = queue;

		res.render('playlist');
	}
}

module.exports = Server;
