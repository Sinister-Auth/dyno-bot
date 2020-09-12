import {Command, Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';
import * as superagent from 'superagent';

export default class Data extends Command {
	public aliases        : string[] = ['data'];
	public group          : string   = 'Admin';
	public description    : string   = 'Get various stats and data.';
	public defaultCommand : string   = 'user';
	public permissions    : string   = 'admin';
	public overseerEnabled: boolean  = true;
	public hideFromHelp   : boolean  = true;
	public cooldown       : number   = 3000;
	public expectedArgs   : number   = 0;

	public commands: SubCommand[] = [
		{ name: 'user', desc: 'Get information about a user.', default: true, usage: '' },
		{ name: 'servers', desc: 'Get a list of servers.', usage: '' },
		{ name: 'server', desc: 'Get information about a server.', usage: '' },
		{ name: 'automod', desc: 'Get automod stats.', usage: '' },
		{ name: 'topshared', desc: 'Top list of bots with guild counts and shared guilds', usage: '' },
		{ name: 'addmodule', desc: 'NO', usage: '' },
	];

	public usage: string[] = [
		'data [user]',
		'data user [user]',
		'data server [serverId]',
		'data servers [page]',
		'data automod',
	];

	public example: string[] = [
		'data 155037590859284481',
		'data server 203039963636301824',
		'data servers 1',
		'data automod',
	];

	public permissionsFn({ message }: CommandData) {
		if (!message.member) {
			return false;
		}
		if (message.guild.id !== this.config.dynoGuild) {
			return false;
		}

		if (this.isServerAdmin(message.member, message.channel)) {
			return true;
		}
		if (this.isServerMod(message.member, message.channel)) {
			return true;
		}

		const allowedRoles = [
			'225209883828420608', // Accomplices
			'222393180341927936', // Regulars
		];

		const roles = message.guild.roles.filter((r: eris.Role) => allowedRoles.includes(r.id));
		if (roles && message.member.roles.find((r: string) => roles.find((role: eris.Role) => role.id === r))) {
			return true;
		}

		return false;
	}

	public execute({ message }: CommandData) {
		return Promise.resolve();
	}

	public async servers({ message, args }: CommandData) {
		let guilds;
		try {
			guilds = await this.models.Server.find({ deleted: false })
				.sort({ memberCount: -1 })
				.limit(25)
				.skip(args[0] ? (args[0] - 1) * 25 : 0)
				.lean()
				.exec();
		} catch (err) {
			return this.error(message.channel, err);
		}

		if (!guilds || !guilds.length) {
			return this.sendMessage(message.channel, 'No guilds returned.');
		}

		const embed = {
			title: `Guilds - ${args[0] || 0}`,
			fields: [],
		};

		for (const guild of guilds) {
			embed.fields.push({
				name: guild.name,
				value: `${guild._id}\t${guild.region}\t${guild.memberCount} members`,
				inline: true,
			});
		}

		return this.sendMessage(message.channel, { embed });
	}

	public async server({ message, args }: CommandData) {
		let guild;
		try {
			guild = await this.models.Server.findOne({ _id: args[0] || message.channel.guild.id }).lean().exec();
		} catch (err) {
			return this.error(message.channel, err);
		}

		if (!guild) {
			return this.sendMessage(message.channel, 'No guild found.');
		}

		let owner;
		if (guild.ownerID) {
			owner = await this.restClient.getRESTUser(guild.ownerID).catch(() => false);
		}

		const embed = {
			author: {
				name: guild.name,
				icon_url: guild.iconURL,
			},
			fields: [
				{ name: 'Region', value: guild.region || 'Unknown', inline: true },
				{ name: 'Members', value: guild.memberCount ? guild.memberCount.toString() : '0', inline: true },
				{ name: 'Owner ID', value: guild.ownerID || 'Unknown', inline: true },
			],
			footer: { text: `ID: ${guild._id}` },
			timestamp: (new Date()).toISOString(),
		};

		if (owner) {
			embed.fields.push({ name: 'Owner', value: owner ? `${this.utils.fullName(owner)}` : guild.ownerID || 'Unknown', inline: true });
		}

		embed.fields.push({ name: 'Prefix', value: guild.prefix || '?', inline: true });

		embed.fields.push({ name: 'Mod Only', value: guild.modonly ? 'Yes' : 'No', inline: true });
		embed.fields.push({ name: 'Premium', value: guild.isPremium ? 'Yes' : 'No', inline: true });
		if (guild.beta) {
			embed.fields.push({ name: 'Beta', value: guild.beta ? 'Yes' : 'No', inline: true });
		}

		// START MODULES
		const modules = this.dyno.modules.filter((m: Module) => !m.admin && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		const enabledModules = modules.filter((m: Module) => !guild.modules.hasOwnProperty(m.name) ||
			guild.modules[m.name] === true);
		const disabledModules = modules.filter((m: Module) => guild.modules.hasOwnProperty(m.name) &&
			guild.modules[m.name] === false);

		embed.fields.push({ name: 'Enabled Modules', value: enabledModules.map((m: Module) => m.name).join(', '), inline: false });
		embed.fields.push({ name: 'Disabled Modules', value: disabledModules.map((m: Module) => m.name).join(', '), inline: false });

		embed.fields.push({ name: '\u200b', value: `[Dashboard](https://www.dynobot.net/server/${guild._id})`, inline: true });

		return this.sendMessage(message.channel, { embed });
	}

	public async user({ message, args }: CommandData) {
		let resolvedUser;
		if (args && args.length) {
			resolvedUser = this.resolveUser(message.channel.guild, args.join(' '));
		}

		if (!resolvedUser) {
			resolvedUser = await this.dyno.restClient.getRESTUser(args[0]).catch(() => false);
		}

		const userId = resolvedUser ? resolvedUser.id : args[0] || message.author.id;
		const user = resolvedUser;

		let guilds;
		try {
			guilds = await this.models.Server
				.find({ ownerID: userId })
				.sort({ memberCount: -1 })
				.lean()
				.exec();
		} catch (err) {
			return this.error(message.channel, `Unable to get guilds.`);
		}

		const userEmbed = {
			author: {
				name: `${user.username}#${user.discriminator}`,
				icon_url: resolvedUser.avatarURL,
			},
			fields: [],
		};

		userEmbed.fields.push({ name: 'ID', value: user.id, inline: true });
		userEmbed.fields.push({ name: 'Name', value: user.username, inline: true });
		userEmbed.fields.push({ name: 'Discrim', value: user.discriminator, inline: true });

		await this.sendMessage(message.channel, { embed: userEmbed });

		if (!guilds || !guilds.length) {
			return Promise.resolve();
		}

		const embed = {
			title: 'Owned Guilds',
			fields: [],
		};

		// START MODULES
		const modules = this.dyno.modules.filter((m: Module) => !m.admin && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		for (const guild of guilds) {
			const valArray = [
				`Region: ${guild.region}`,
				`Members: ${guild.memberCount}`,
				`Prefix: ${guild.prefix || '?'}`,
			];

			if (guild.modonly) {
				valArray.push(`Mod Only: true`);
			}
			if (guild.beta) {
				valArray.push(`Beta: true`);
			}
			if (guild.isPremium) {
				valArray.push(`Premium: true`);
			}
			if (guild.deleted) {
				valArray.push(`Kicked/Deleted: true`);
			}

			const disabledModules = modules.filter((m: Module) => guild.modules.hasOwnProperty(m.name) && guild.modules[m.name] === false);

			if (disabledModules && disabledModules.length) {
				valArray.push(`Disabled Modules: ${disabledModules.map((m: Module) => m.name).join(', ')}`);
			}

			valArray.push(`[Dashboard](https://www.dynobot.net/server/${guild._id})`);

			embed.fields.push({
				name: `${guild.name} (${guild._id})`,
				value: valArray.join('\n'),
				inline: false,
			});
		}

		return this.sendMessage(message.channel, { embed });
	}

	public async automod({ message }: CommandData) {
		let counts;
		try {
			counts = await this.redis.hgetallAsync('automod.counts');
		} catch (err) {
			return this.error(message.channel, err);
		}

		const embed = {
			title: 'Automod Stats',
			fields: [
				{ name: 'All Automods', value: counts.any, inline: true },
				{ name: 'Spam/Dup Chars', value: counts.spamdup, inline: true },
				{ name: 'Caps', value: counts.manycaps, inline: true },
				{ name: 'Bad Words', value: counts.badwords, inline: true },
				{ name: 'Emojis', value: counts.manyemojis, inline: true },
				{ name: 'Link Cooldown', value: counts.linkcooldown, inline: true },
				{ name: 'Any Link', value: counts.anylink, inline: true },
				{ name: 'Blacklist Link', value: counts.blacklistlink, inline: true },
				{ name: 'Invite', value: counts.invite, inline: true },
				{ name: 'Attach/Embed Spam', value: counts.attachments, inline: true },
				{ name: 'Attach Cooldown', value: counts.attachcooldown, inline: true },
				{ name: 'Rate Limit', value: counts.ratelimit, inline: true },
				{ name: 'Chat Clearing', value: counts.spamclear, inline: true },
				{ name: 'Light Mentions', value: counts.mentionslight, inline: true },
				{ name: 'Mention Bans', value: counts.mentions, inline: true },
				{ name: 'Auto Mutes', value: counts.mutes, inline: true },
				{ name: 'Forced Mutes', value: counts.forcemutes, inline: true },
			],
			timestamp: (new Date()).toISOString(),
		};

		return this.sendMessage(message.channel, { content: 'Note: Automod stats from Dec. 29, 2016', embed });
	}

	public invite({ message, args }: CommandData) {
		if (!args || !args.length) {
			return this.error(message.channel, `No name or ID specified.`);
		}
		this.client.guilds.find((g: eris.Guild) => g.id === args[0] || g.name === args.join(' '))
			.createInvite({ max_age: 60 * 30 })
			.then((invite: eris.Invite) => this.success(message.channel, `https://discord.gg/${invite.code}`))
			.catch(() => this.error(message.channel, `Couldn't create invite.`));
	}

	public async topshared({ message }: CommandData) {
		let data;
		let dbots;
		try {
			const dres = await superagent.get(`https://bots.discord.pw/api/bots`)
				.set('Authorization', this.config.dbots.key)
				.set('Accept', 'application/json');
			const res = await superagent.get(this.config.carbon.list);
			data = res.body;
			dbots = dres.body;
		} catch (err) {
			return this.logger.error(err);
		}

		if (!data || !data.length) {
			return this.error(message.channel, 'Unable to get data');
		}

		let i = 0;

		const list = data.map((bot: any) => {
				bot.botid = bot.botid;
				bot.servercount = parseInt(bot.servercount, 10);
				return bot;
			})
			.filter((bot: any) => bot.botid > 1000 && bot.servercount >= 25000)
			.sort((a: any, b: any) => (a.servercount < b.servercount) ? 1 : (a.servercount > b.servercount) ? -1 : 0);

		return new Promise(async (resolve: any) => {
			let bots = [];
			for (const bot of list) {
				bot.botid = bot.botid.replace('195244341038546948', '195244363339530240');
				const allShared = await this.ipc.awaitResponse('shared', { user: bot.botid });
				bot.shared = allShared.reduce((a: number, b: any) => {
					a += parseInt(b.result, 10);
					return a;
				}, 0);
				bots.push(bot);
			}
			bots = bots.map((b: any) => {
				++i;
				// tslint:disable-next-line:max-line-length
				return `${this.utils.pad(`${i}`, 2)} ${this.utils.pad(b.name, 12)} ${this.utils.pad(`${b.servercount}`, 6)} Guilds, ${this.utils.pad(`${b.shared}`, 5)} Shared`;
			});
			this.sendCode(message.channel, bots.join('\n'));
			return resolve();
		});
	}

	public addmodule({ message, args }: CommandData) {
		if (!this.dyno.modules.has(args[0])) {
			return this.error(message.channel, `That module does not exist.`);
		}
		if (this.config.moduleList.includes(args[0])) {
			return this.error(message.channel, `That module is already loaded.`);
		}
		this.config.moduleList.push(args[0]);

		if (this.config.disabledCommandGroups && this.config.disabledCommandGroups.includes(args[0])) {
			const index = this.config.disabledCommandGroups.indexOf(args[0]);
			const commandGroups = this.config.disabledCommandGroups.split(',');
			commandGroups.splice(index, 1);
			this.config.disabledCommandGroups = commandGroups.join(',');
			return this.success(message.channel, `Added module ${args[0]} and removed the disabled command group.`);
		}

		return this.success(message.channel, `Added module ${args[0]}.`);
	}

	public permissionsFor({ message, args }: CommandData) {
		if (!args || !args.length) {
			return this.error(message.channel, `No name or ID specified.`);
		}
		const guild = this.client.guilds.find((g: eris.Guild) => g.id === args[0] || g.name === args.join(' '));

		if (!guild) {
			return this.error(message.channel, `Couldn't find that guild.`);
		}

		const perms = guild.members.get(this.client.user.id);

		const msgArray = this.utils.splitMessage(perms, 1950);

		for (const m of msgArray) {
			this.sendCode(message.channel, m, 'js');
		}
	}
}
