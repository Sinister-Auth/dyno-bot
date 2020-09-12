'use strict';

const Command = Loader.require('./core/structures/Command');
const Purger = Loader.require('./helpers/Purger');

class Purge extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['purge', 'prune'];
		this.group        = 'Manager';
		this.description  = 'Delete a number of messages from a channel. (limit 1000)';
		this.permissions  = 'serverAdmin';
		this.expectedArgs = 1;
		this.defaultCommand = 'any';
		this.defaultUsage = 'purge [number] (user)';
		this.requiredPermissions = ['manageMessages'];

		this.commands = [
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

		this.usage = [
			'purge 10',
			'purge 20 @NoobLance',
			'purge match heck off 100',
			'purge startswith ? 10',
			'purge endswith / 10',
			'purge links 10',
			'purge invites 10',
			'purge images 5',
			'purge mentions 10',
			// 'purge global @NoobLance 50',
		];

		this.deleteError = `I couldn't purge those messages. Make sure I have manage messages permissions.`;

		this._linkRegex = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');
		this._inviteRegex = new RegExp(/discord.(gg|me)\s?\//, 'gi');

		this._purger = new Purger(this.config, this.dyno);
	}

	async purgeMessages(channel, options) {
		if (!this.hasPermissions(channel.guild, 'manageMessages')) {
			return Promise.reject(`I don't have permissions to Manage Messages.`);
		}

		try {
			await this._purger.purge(channel, options);
		} catch (err) {
			this.logger.error(err);
			return Promise.reject(this.deleteError);
		}
	}

	purgeUserMessages(message, user, count) {
		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.author.id === user.id,
			slice: count > 100 ? 100 : count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	execute() {
		return Promise.resolve();
	}

	async any(message, args) {
		let count = parseInt(args[0]) > 1000 ? 1000 : parseInt(args[0]),
			user = args[1] ? this.resolveUser(message.channel.guild, args.slice(1).join(' ')) : null;

		if (isNaN(count)) {
			return this.error(message.channel, `Enter a number of messages to purge.`);
		}

		if (user) {
			return this.purgeUserMessages(message, user, count);
		}

		this.purgeMessages(message.channel, {
			limit: count,
			before: message.id,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));

		return Promise.resolve();
	}

	user(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = isNaN(args[args.length]) ? args.pop() : 100;
		const user = this.resolveUser(message.channel.guild, args.slice(0).join(' '));

		if (!user) {
			return this.error(message.channel, `I couldn't find that user.`);
		}

		return this.purgeUserMessages(message, user, count);
	}

	match(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.includes(t.toLowerCase())) return true;
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	not(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (!content.includes(t.toLowerCase())) return true;
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	startswith(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');


		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.startsWith(t.toLowerCase())) return true;
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	endswith(message, args, guildConfig) {
		if (!args || !args.length) return this.help(message, guildConfig);

		const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
		const text = args.join(' ').split('|');

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => {
				const content = m.content.toLowerCase();
				for (let t of text) {
					if (content.endsWith(t.toLowerCase())) return true;
				}
				return false;
			},
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	links(message, args) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.content.match(this._linkRegex),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	invites(message, args) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.content.match(this._inviteRegex),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	images(message, args) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => (m.attachments && m.attachments.length) || (m.embeds && m.embeds.length),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	mentions(message, args) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.mentions && m.mentions.length,
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	embeds(message, args) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.embeds && m.embeds.length && m.embeds[0].type === 'rich',
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	bots(message, args) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => m.author && m.author.bot,
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}

	text(message, args) {
		const count = args ? args[0] : 100;

		return this.purgeMessages(message.channel, {
			limit: 100,
			before: message.id,
			filter: m => (!m.attachments || !m.attachments.length) && (!m.embeds || !m.embeds.length),
			slice: count,
		})
		.then(() => message.delete().catch(() => null))
		.catch(err => this.error(message.channel, err));
	}
}

module.exports = Purge;
