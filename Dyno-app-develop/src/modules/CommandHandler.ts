import {Command, Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';

/**
 * Command handler module
 * @class CommandHandler
 * @extends Module
 */
export default class CommandHandler extends Module {
	public module: string = 'CommandHandler';
	public description: string = 'Command handler module';
	public enabled: boolean = true;
	public core: boolean = true;
	public list: boolean = false;

	public start() {
		this.cooldowns = new Map();
		this.dmCooldowns = new Map();

		this.cooldown = 900;
		this.dmCooldown = 10000;

		this.schedule('*/1 * * * *', this.clearCooldowns.bind(this));

		this.enabledCommandGroups = this.config.enabledCommandGroups ? this.config.enabledCommandGroups.split(',') : null;
		this.disabledCommandGroups = this.config.disabledCommandGroups ? this.config.disabledCommandGroups.split(',') : null;

		this.footer = [
			`**Additional links and help**\n`,
			`[All Commands](${this.config.site.host}/commands)`,
			`[Dyno Discord](${this.config.site.host}/discord)`,
			`[Add To Your Server](${this.config.site.host}/invite)`,
			`[Donate](${this.config.site.host}/donate)`,
		];
	}

	/**
	 * Fired when the client receives a message
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	// tslint:disable-next-line:cyclomatic-complexity
	public messageCreate(e: MessageEvent) {
		const { message, guildConfig, isAdmin } = e;
		if (message.author.bot) { return; }

		let livePrefix;
		if (!this.config.isPremium && guildConfig.isPremium && guildConfig.premiumInstalled) {
			livePrefix = guildConfig.livePrefix || null;
		}

		if (!this.config.test && message.guild.id !== this.config.dynoGuild) {
			// premium checks
			if (!this.config.isPremium && guildConfig.isPremium && guildConfig.premiumInstalled) {
				return false;
			}
			if (this.config.isPremium && (!guildConfig.isPremium || !guildConfig.premiumInstalled)) {
				return false;
			}
		}

		if (!this.config.isPremium && guildConfig.clientID && this.config.client.id !== guildConfig.clientID) {
			return false;
		}

		if (this.config.handleRegion && !this.utils.regionEnabled(message.guild, this.config)) {
			return false;
		}

		const globalConfig = this.dyno.globalConfig;
		const helpCmds = ['help', 'commands'];
		const prefix = livePrefix || guildConfig.prefix || this.config.prefix;
		const prefixes = [
			`<@${this.client.user.id}> `,
			`<@!${this.client.user.id}> `,
			prefix,
		];

		let msgContent = message.content;
		const hasPrefix = prefixes.filter((p: string) => message.content.startsWith(p));

		// ignore if it's not a prefixed command
		if (!(isAdmin && message.content.startsWith(this.config.sudopref)) && (!hasPrefix || !hasPrefix.length)) {
			return;
		}

		let cmd = message.content.replace(this.config.sudopref, '');

		for (const pref of prefixes) {
			cmd = cmd.replace(pref, '');
			msgContent = msgContent.replace(pref, '');
		}

		cmd = cmd.split(' ')[0].toLowerCase();
		if (!cmd.length) { return; }

		if (this.shouldCooldown(message)) { return; }

		// ignore disabled commands
		if (guildConfig.commands.hasOwnProperty(cmd) && guildConfig.commands[cmd] !== true) { return; }

		const commands = this.dyno.commands;

		// command doesn't exist
		if (helpCmds.indexOf(cmd) === -1 && !commands.has(cmd)) { return; }

		const args = msgContent.replace(/ {2,}/g, ' ').split(' ').slice(1);

		// generate and display help
		if (helpCmds.indexOf(cmd) > -1) {
			if (this.config.disableHelp) { return; }

			if (args.length && commands.has(args[0])) {
				const c = commands.get(args[0]);
				return c.help(message, guildConfig);
			}
			return this.generateHelp({ message, guildConfig, isAdmin });
		}

		// return help for default prefixes
		if (message.content.startsWith('?help')) {
			return this.generateHelp({ message, guildConfig, isAdmin });
		}

		// get the command
		const command = commands.get(cmd);
		const module = command.module || command.group;

		// ignore disabled commands if an alias
		if (guildConfig.commands.hasOwnProperty(command.name) && guildConfig.commands[command.name] !== true) { return; }

		if (!this.commandGroupEnabled(module)) { return; }

		if (this.dyno.modules.has(module) &&
			(guildConfig.modules.hasOwnProperty(module) && guildConfig.modules[module] === false)) { return; }

		if (globalConfig && globalConfig.commands.hasOwnProperty(cmd) && globalConfig.commands[cmd] === false) {
			return;
		}

		if (globalConfig && globalConfig.modules.hasOwnProperty(module) && globalConfig.modules[module] === false) {
			return;
		}

		const isOverseer = this.isOverseer(message.member);
		e.isOverseer = isOverseer;

		// check if user has permissions
		if (!this.canExecute(command, e)) { return; }

		const executeStart = Date.now();

		// execute command
		try {
			command._execute({
				message: message,
				args: args,
				command: cmd,
				guildConfig: guildConfig,
				isAdmin: isAdmin,
				isOverseer: isOverseer,
			})
			.then(() => {
				const time = Date.now() - executeStart;
				commands.emit('command', { command, message, guildConfig, args, time });
			})
			.catch(() => {
				const time = Date.now() - executeStart;
				commands.emit('error', { command, message, guildConfig, args, time });
			});
		} catch (err) {
			this.logger.error(err, {
				type: 'CommandHandler.command._execute',
				command: command.name,
				guild: message.channel.guild.id,
				shard: message.channel.guild.shard.id,
			});
		}
	}

	/**
	 * Generate help
	 * @param {Message} message Message object
	 */
	public generateHelp({ message, guildConfig, isAdmin }: MessageEvent) {
		if (this.config.disableHelp) { return; }

		const prefix = (guildConfig) ? guildConfig.prefix || this.config.prefix : this.config.prefix;

		return this.client.getDMChannel(message.author.id).then((channel: eris.PrivateChannel) => {
			if (!channel) {
				return this.logger.error('Channel is undefined or null');
			}

			return this.sendMessage(channel, {
				content: `The prefix for ${message.guild.name} is \`${prefix}\`\nYou can find a list of commands at <https://www.dynobot.net/commands>`,
				embed: { description: this.footer.join('\n') },
			}).then(() => this.statsd.increment(['messages.dm', 'help.sent'])).catch(() => this.statsd.increment('help.failed'));
		}).catch((err: string) => {
			this.statsd.increment('help.failed');
			this.logger.error(err);
		});

		// const author          = message.author;
		// const isServerAdmin   = this.isServerAdmin(author, message.channel);
		// const isServerMod     = this.isServerMod(author, message.channel);
		// const globalConfig    = this.dyno.globalConfig;
		// let commands        = [...this.dyno.commands.values()];
		// let msgArray        = [];

		// // filter commands that shouldn't be shown
		// commands = commands.filter((o: Command) =>
		// 	(!o.hideFromHelp && !o.disabled) && // disabled/hidden commands
		// 	(!o.permissions || // commands with no permissions
		// 		(isAdmin && o.permissions === 'admin') || // admin commands
		// 		(isServerAdmin && o.permissions === 'serverAdmin') ||  // server manager commands
		// 		(isServerMod && o.permissions === 'serverMod') // server mod commands
		// 	));

		// // remove duplicates
		// commands = [...new Set(commands)];

		// // group commands
		// commands = commands.reduce((a: any, o: Command) => {
		// 	o.group = o.group || 'No Group';
		// 	const module = o.module || o.group;

		// 	// ignore disabled commands
		// 	if (guildConfig.commands.hasOwnProperty(o.name) && guildConfig.commands[o.name] !== true) { return a; }
		// 	// ignore commands for disabled modules
		// 	if (this.dyno.modules.has(module) &&
		// 		(guildConfig.modules.hasOwnProperty(module) && !guildConfig.modules[module])) { return a; }

		// 	if (globalConfig && globalConfig.modules.hasOwnProperty(module) && globalConfig.modules[module] === false) {
		// 		return a;
		// 	}

		// 	a[o.group] = a[o.group] || [];
		// 	a[o.group].push(o);

		// 	return a;
		// }, {});

		// for (let group in commands) {
		// 	const cmds = commands[group];

		// 	group = (!group || group === 'undefined') ? 'No Category' : group;

		// 	msgArray.push('');
		// 	msgArray.push(`**${group}**`);

		// 	for (const cmd of cmds) {
		// 		msgArray.push(`\t[${prefix}${this.utils.pad(cmd.name)}](${this.config.site.host}/commands#${cmd.group}) - ${cmd.description}`);
		// 		if (cmd.commands) {
		// 			for (const c of cmd.commands) {
		// 				msgArray.push(`\t\t[${prefix}${cmd.name} ${c.name}](${this.config.site.host}/commands#${cmd.group}) - ${c.desc}`);
		// 			}
		// 		}
		// 	}
		// }

		// msgArray.shift();
		// msgArray = this.utils.splitMessage(msgArray, 1950);

		// this.client.getDMChannel(message.author.id).then((channel: eris.PrivateChannel) => {
		// 	if (!channel) {
		// 		this.logger.error('Channel is undefined or null');
		// 	}

		// 	for (const msg of msgArray) {
		// 		this.sendMessage(channel, { embed: {
		// 			description: msg,
		// 			author: {
		// 				name: 'Commands',
		// 				icon_url: `${this.config.site.host}/${this.config.avatar}`,
		// 			},
		// 		} }).then(() => this.statsd.increment(`messages.dm`));
		// 	}

		// 	this.sendMessage(channel, { embed: { description: this.footer.join('\n') } })
		// 		.then(() => this.statsd.increment(['messages.dm', 'help.sent']))
		// 		.catch(() => this.statsd.increment('help.failed'));
		// }).catch((err: string) => {
		// 	this.statsd.increment('help.failed');
		// 	this.logger.error(err);
		// });
	}

	private clearCooldowns() {
		each([...this.cooldowns.keys()], (id: string) => {
			const time = this.cooldowns.get(id);
			if ((Date.now() - time) < this.cooldown) { return; }
			this.cooldowns.delete(id);
		});
		each([...this.dmCooldowns.keys()], (id: string) => {
			const time = this.dmCooldowns.get(id);
			if ((Date.now() - time) < this.dmCooldown) { return; }
			this.dmCooldowns.delete(id);
		});
	}

	private handleDM({ message }: MessageEvent) {
		if (this.config.test || this.config.beta) { return; }

		const cooldown = this.dmCooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) < this.dmCooldown) { return; }
		this.dmCooldowns.set(message.author.id, Date.now());

		let msgArray = [];

		msgArray.push('**Commands are disabled in DM.**\n');
		msgArray.push('Use commands **in a server**, type **`?help`** for a list of commands.\n');
		msgArray = msgArray.concat(this.footer);

		return this.client.getDMChannel(message.author.id).then((channel: eris.PrivateChannel) => {
			if (!channel) {
				this.logger.error('Channel is undefined or null');
			}
			this.sendMessage(channel, { embed: { description: msgArray.join('\n') } });
		});
	}

	// tslint:disable-next-line:cyclomatic-complexity
	private canExecute(command: Command, { message, guildConfig, isAdmin, isOverseer }: MessageEvent): boolean {
		const isServerAdmin = this.isServerAdmin(message.member, message.channel);
		const isServerMod   = this.isServerMod(message.member, message.channel);

		const isMod = isServerMod || isServerAdmin || isOverseer;
		let hasPermission = true;

		if (isAdmin) { return true; }

		const globalConfig = this.dyno.globalConfig || {};
		if (globalConfig.ignoredUsers && globalConfig.ignoredUsers.includes(message.author.id)) {
			return false;
		}

		if (!isMod && guildConfig.ignoredChannels && guildConfig.ignoredChannels.includes(message.channel.id)) {
			return false;
		}
		if (!isMod && guildConfig.ignoredUsers && guildConfig.ignoredUsers.find((u: any) => u.id === message.author.id)) {
			return false;
		}
		if (!isMod && guildConfig.ignoredRoles && message.member && message.member.roles &&
			guildConfig.ignoredRoles.find((r: string) => message.member.roles.includes(r))) {
				return false;
		}

		// check if commands are mod only in the guildConfig, ignore music
		if (command.group !== 'Music' && (guildConfig.modonly && !isServerMod)) { hasPermission = false; }
		// check serverAdmin permissions
		if (command.permissions === 'serverAdmin' && !isServerAdmin) { hasPermission = false; }
		// check serverMod permissions
		if (command.permissions === 'serverMod' && !isServerMod) { hasPermission = false; }
		// ignore admin commands for users without rights
		if (command.permissions === 'admin' && !isAdmin) { hasPermission = false; }

		const overwrite = this.permissionsManager.canOverride(message.channel, message.author, command.name);
		if (typeof overwrite === 'boolean') {
			hasPermission = overwrite;
		}

		if (command.overseerEnabled && isOverseer) {
			if (hasPermission !== true) {
				this.logOverride(message, command);
			}
			return true;
		}

		if (command.permissionsFn && command.permissionsFn({ message })) {
			return true;
		}

		return hasPermission;
	}

	private commandGroupEnabled(group: string) {
		const enabledCommandGroups = this.config.enabledCommandGroups ?
			this.config.enabledCommandGroups.split(',') : null;
		const disabledCommandGroups = this.config.disabledCommandGroups ?
			this.config.disabledCommandGroups.split(',') : null;

		if (enabledCommandGroups) {
			if (enabledCommandGroups.includes(group)) {
				return true;
			}

			return false;
		}

		if (disabledCommandGroups) {
			if (disabledCommandGroups.includes(group)) {
				return false;
			}

			return true;
		}

		return true;
	}

	private shouldCooldown(message: eris.Message) {
		const cooldown = this.cooldowns.get(message.author.id);
		if (cooldown && (Date.now() - cooldown) <= this.cooldown) { return true; }
		this.cooldowns.set(message.author.id, Date.now());
		return false;
	}

	private logOverride(message: eris.Message, command: Command) {
		const doc = {
			guild: (<eris.GuildChannel>message.channel).guild.id,
			user: {
				id: message.author.id,
				name: message.author.username,
				discrim: message.author.discriminator,
			},
			command: command.name,
			message: message.cleanContent,
		};

		const log = new this.models.OverrideLog(doc);
		log.save((err: string) => err ? this.logger.error(err) : false);
	}
}
