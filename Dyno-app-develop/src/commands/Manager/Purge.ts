import {Command, Purger} from '@dyno.gg/dyno-core';
import * as core from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Purge extends Command {
	public aliases: string[] = ['purge', 'prune'];
	public group: string = 'Manager';
	public description: string = 'Delete a number of messages from a channel. (limit 1000)';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 1;
	public defaultCommand: string = 'any';
	public defaultUsage: string = 'purge [number] (user)';
	public requiredPermissions: string[] = ['manageMessages'];
	public commands: SubCommand[] = [
		{ name: 'any', desc: 'Delete a number of messages from a channel.', default: true, usage: 'any [number]' },
		{ name: 'user', desc: 'Delete messages for a user in the channel.', usage: '[number] [user]' },
		{ name: 'match', desc: 'Delete messages containing text. (Limit 100)', usage: 'match [text] [number]' },
		{ name: 'not', desc: 'Delete messages not containing text. (Limit 100', usage: 'not [text] [number]' },
		{ name: 'startswith', desc: 'Delete messages that start with text. (Limit 100)', usage: 'startswith [text] [number]' },
		{ name: 'endswith', desc: 'Delete messages that ends with text. (Limit 100)', usage: 'endswith [text] [number]' },
		{ name: 'links', desc: 'Delete a number links posted in the channel. (Limit 100)', usage: 'links [number]' },
		{ name: 'invites', desc: 'Delete server invites posted in the channel. (Limit 100)', usage: 'invites [number]' },
		{ name: 'images', desc: 'Delete a number of images in the channel. (Limit 100)', usage: 'images [number]' },
		{ name: 'mentions', desc: 'Delete messages with mentions in the channel. (Limit 100)', usage: 'mentions [number]' },
		{ name: 'embeds', desc: 'Delete messages containing rich embeds in the channel.', usage: 'embeds [number]' },
		{ name: 'bots', desc: 'Delete messages sent by bots.', usage: 'bots [number]' },
		{ name: 'text', desc: 'Delete messages containing text, ignoring images/embeds.', usage: 'text [number]' },
	];
	public usage: string[] = [
		'purge [number]',
		'purge [number] [user]',
		'purge match [text] [number]',
		'purge startswith [string] [number]',
		'purge endswith [string] [number]',
		'purge links [number]',
		'purge invites [number]',
		'purge images [number]',
		'purge mentions [number]',
	];
	public example: string[] = [
		'purge 10',
		'purge 20 @NoobLance',
		'purge match heck off 100',
		'purge startswith ? 10',
		'purge endswith / 10',
		'purge links 10',
		'purge invites 10',
		'purge images 5',
		'purge mentions 10',
	];

	constructor(dyno: Dyno, guild: eris.Guild) {
		super(dyno, guild);

		this._linkRegex = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');
		this._inviteRegex = new RegExp(/discord.(gg|me)\s?\//, 'gi');

		this._purger = new Purger(this.dyno);
	}

	public async purgeMessages(channel: eris.GuildChannel, options: any, t: Function) {
		if (!this.hasPermissions(channel.guild, 'manageMessages')) {
			return Promise.reject(t('permissions.premissions-error', { perms: 'Manage Messages' }));
		}

		try {
			await this._purger.purge(channel, options);
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(t('manager.purge-error'));
		}
	}

	public purgeUserMessages(message: eris.Message, user: eris.User|eris.Member, count: number, t: Function) {
		return this.purgeMessages(<eris.GuildChannel>message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.author.id === user.id,
			slice: count > 100 ? 100 : count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public execute() {
		return Promise.resolve();
	}

	public async any({ message, args, guildConfig, t }: CommandData) {
		const count = parseInt(args[0], 10) > 1000 ? 1000 : parseInt(args[0], 10);
		const user = args[1] ? this.resolveUser(message.channel.guild, args.slice(1).join(' ')) : null;

		if (isNaN(count)) {
			return this.error(message.channel, t('manager.purge-number-error'));
		}

		if (user) {
			return this.purgeUserMessages(message, user, count, t);
		}

		this.purgeMessages(message.channel, {
			limit: count,
			before: message.id,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));

		return Promise.resolve();
	}

	public user({ message, args, guildConfig, t }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = isNaN(args[args.length]) ? args.pop() : 100;
		const user = this.resolveUser(message.channel.guild, args.slice(0).join(' '));

		if (!user) {
			return this.error(message.channel, `I couldn't find that user.`);
		}

		return this.purgeUserMessages(message, user, count, t);
	}

	public match({ message, args, guildConfig, t }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.includes(t.toLowerCase())) {
						return true;
					}
				}
				return false;
			},
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public not({ message, args, guildConfig, t }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.includes(t.toLowerCase())) {
						return false;
					}
				}
				return true;
			},
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public startswith({ message, args, guildConfig, t }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.startsWith(t.toLowerCase())) {
						return true;
					}
				}
				return false;
			},
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public endswith({ message, args, guildConfig, t }: CommandData) {
		if (!args || !args.length) {
			return this.help(message, guildConfig);
		}

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => {
				const content = m.content.toLowerCase();
				for (const t of text) {
					if (content.endsWith(t.toLowerCase())) {
						return true;
					}
				}
				return false;
			},
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public links({ message, args, t }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.content.match(this._linkRegex),
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public invites({ message, args, t }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.content.match(this._inviteRegex),
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public images({ message, args, t }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => (m.attachments && m.attachments.length) || (m.embeds && m.embeds.length),
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public mentions({ message, args, t }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.mentions && m.mentions.length,
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public embeds({ message, args, t }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.embeds && m.embeds.length && m.embeds[0].type === 'rich',
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public bots({ message, args, t }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => m.author && m.author.bot,
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}

	public text({ message, args, t }: CommandData) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: (m: eris.Message) => (!m.attachments || !m.attachments.length) && (!m.embeds || !m.embeds.length),
			slice: count,
		}, t)
		.then(() => message.delete().catch(() => null))
		.catch((err: any) => this.error(message.channel, err));
	}
}
