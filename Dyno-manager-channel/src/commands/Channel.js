'use strict';

const { Command } = require('@dyno.gg/dyno-core');

class Channel extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['channel', 'chan'];
		this.group        = 'Manager';
		this.description  = 'Manage channels.';
		this.defaultUsage = 'channel [channel name]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.cooldown     = 5000;
		this.expectedArgs = 2;
		this.requiredPermissions = ['manageChannels'];
		this.defaultCommand = 'create';

		this.commands = [
			{ name: 'create', desc: 'Add/remove a channel.', default: true, usage: 'create [channel] [text/voice/category] ([in/above/below] [channel/category])' },
			{ name: 'move', desc: 'Move a channel.', usage: 'move [channel] [inside/above/below/outside] [channel/category]' },
			{ name: 'delete', desc: 'Delete a channel.', usage: 'delete [channel]' },
			{ name: 'clone', desc: 'Clone a channel.', usage: 'clone [channel] [name]' },
			{ name: 'rename', desc: 'Rename a channel.', usage: 'rename [channel] [name]' },
			{ name: 'topic', desc: 'Change a channel topic.', usage: 'topic [channel] [topic]' },
		];

		this.usage = [
			'channel create general',
			'channel create voice general-voice',
			'channel create text secret inside secret-category',
			'channel move #general above #testing',
			'channel move testing below general',
			'channel delete #memes',
			'channel clone general',
			'channel rename testing spam',
			'channel topic memes post memes here',
		];
	}

	async execute() {
		return Promise.resolve();
    }

	// create [channel] ([voice/text/category]) (inside/below/above) ([channel])
    async create({ message, args }) {
        if (!this.hasPermissions(message.channel.guild, 'manageChannels')) {
			return this.error(message.channel, 'I don\'t have `Manage Channels` permissions.');
		}

		const name = args[0];
		if (!name) {
			return this.error(message.channel, 'Provide a channel name.');
		}
		args.shift();

		let type;
		switch (args[0]) {
			case 'voice': {
				type = 2;
				args.shift();
				break;
			}
			case 'category':
			case 'cat': {
				type = 4;
				args.shift();
				break;
			}
			case 'text': {
				type = 0;
				args.shift();
				break;
			}
			default: {
				type = 0;
			}
		}

		switch (args[0]) {
			case 'below': {
				args.shift();
				if (!args[0]) {
					return this.error(message.channel, 'Provide a channel below.');
				}

				const [channel, created] = await this.getAndCreate(message, args, name, type);
				if (!channel) {
					return this.error(message.channel, 'Couldn\'t find this channel.');
				}

				if (channel.type === 4 && type !== 4) {
					return this.error(message.channel, 'A channel can\'t be moved below a category.');
				}

				await this.below(message, created, channel);
				return this.success(message.channel, `Channel **${created.name}** created below **${channel.name}**.`);
			}
			case 'above': {
				args.shift();
				if (!args[0]) {
					return this.error(message.channel, 'Provide a channel above.');
				}

				const [channel, created] = await this.getAndCreate(message, args, name, type);
				if (!channel) {
					return this.error(message.channel, 'Couldn\'t find this channel.');
				}

				if (channel.type === 4 && type !== 4) {
					return this.error(message.channel, 'A channel can\'t be moved above a category.');
				}

				await this.above(message, created, channel);
				return this.success(message.channel, `Channel **${created.name}** created above **${channel.name}**.`);
			}
			case 'in':
			case 'inside': {
				args.shift();
				if (!args[0]) {
					return this.error(message.channel, 'Provide a category where to create the channel.');
				}

				if (type === 4) {
					return this.error(message.channel, 'You can\'t create a category in a category.');
				}

				const channel = this.resolveChannel(message.channel.guild, args.join(' '));

				if (!channel) {
					return this.error(message.channel, 'Couldn\'t find this channel.');
				}
				if (channel.type !== 4) {
					return this.error(message.channel, 'This channel is not a category.');
				}

				const created = await this.createChannel(message, name, type, channel.id);

				return this.success(message.channel, `Channel **${created.name}** created inside **${channel.name}**.`);
			}
			default: {
				if (args[0]) {
					const channel = this.resolveChannel(message.channel.guild, args.join(' '));
					if (!channel) {
						return this.error(message.channel, 'Couldn\'t find this channel.');
					}
					if (channel.type !== 4) {
						return this.error(message.channel, 'This channel is not a category.');
					}

					const created = await this.createChannel(message, name, type, channel.id);
					return this.success(message.channel, `Channel **${created.name}** created inside **${channel.name}**.`);
				} else {
					const created = await this.createChannel(message, name, type);
					return this.success(message.channel, `Channel created: **${created.name}**.`);
				}
			}
		}
    }

	// move [channel] inside/outside/below/above [channel/category]
	async move({ message, args }) {
		if (!this.hasPermissions(message.channel.guild, 'manageChannels')) {
			return this.error(message.channel, 'I don\'t have `Manage Channels` permissions.');
		}

		if (!args[0]) {
			return this.error(message.channel, 'Provide a channel to edit.');
		}

		const moved = this.resolveChannel(message.channel.guild, args[0]);
		if (!moved) {
			return this.error(message.channel, `Couldn't find the channel **${args[0]}**.`);
		}

		args.shift();

		if (!args[0]) {
			return this.error(message.channel, 'Provide a channel to move in/below/above.');
		}

		switch (args[0]) {
			case 'below': {
				args.shift();
				if (!args[0]) {
					return this.error(message.channel, 'Provide a channel below.');
				}

				const channel = this.resolveChannel(message.channel.guild, args.join(' '));
				if (!channel) {
					return this.error(message.channel, 'Couldn\'t find this channel.');
				}

				if (channel.type === 4 && moved.type !== 4) {
					return this.error(message.channel, 'A channel can\'t be moved below a category.');
				}

				await this.below(message, moved, channel);
				return this.success(message.channel, `Channel **${moved.name}** moved below **${channel.name}**.`);
			}
			case 'above': {
				args.shift();
				if (!args[0]) {
					return this.error(message.channel, 'Provide a channel above.');
				}

				const channel = this.resolveChannel(message.channel.guild, args.join(' '));
				if (!channel) {
					return this.error(message.channel, 'Couldn\'t find this channel.');
				}

				if (channel.type === 4 && moved.type !== 4) {
					return this.error(message.channel, 'A channel can\'t be moved above a category.');
				}

				await this.above(message, moved, channel);
				return this.success(message.channel, `Channel **${moved.name}** moved above **${channel.name}**.`);
			}
			case 'in':
			case 'inside': {
				args.shift();
				if (!args[0]) {
					return this.error(message.channel, 'Provide a category where to create the channel.');
				}

				if (moved.type === 4) {
					return this.error(message.channel, 'This channel is already a category.');
				}

				const channel = this.resolveChannel(message.channel.guild, args.join(' '));
				if (!channel) {
					return this.error(message.channel, 'Couldn\'t find this channel.');
				}
				if (channel.type !== 4) {
					return this.error(message.channel, 'This channel is not a category.');
				}

				const lastChannel = message.channel.guild.channels
					.filter(c => c.type === moved.type && c.parentID === channel.id)
					.sort((a, b) => b.position - a.position)[0];
				if (!lastChannel) {
					await this.inside(message, moved, channel.id);
				} else {
					await this.below(message, moved, lastChannel);
				}

				return this.success(message.channel, `Channel **${moved.name}** moved inside **${channel.name}**.`);
			}
			case 'out':
			case 'outside': {
				args.shift();
				if (moved.type === 4) {
					return this.error(message.channel, 'This channel is a category.');
				}

				if (!moved.parentID) {
					return this.error(message.channel, 'Channel not in a category.');
				}

				const lastChannel = message.channel.guild.channels
					.filter(c => c.type === moved.type && c.parentID === null)
					.sort((a, b) => b.position - a.position)[0];

				if (!lastChannel) {
					await this.outside(message, moved);
				} else {
					await this.below(message, moved, lastChannel);
				}

				return this.success(message.channel, `Channel **${moved.name}** moved outside **${message.channel.guild.channels.get(moved.parentID).name}**.`);
			}
			default: {
				const channel = this.resolveChannel(message.channel.guild, args.join(' '));
				if (!channel) {
					return this.error(message.channel, 'Couldn\'t find this channel.');
				}
				if (channel.type !== 4) {
					return this.error(message.channel, 'This channel is not a category.');
				}

				await this.inside(message, moved, channel.id);
				return this.success(message.channel, `Channel **${moved.name}** moved inside **${channel.name}**.`);
			}
		}
	}

    delete({ message, args }) {
		if (!this.hasPermissions(message.channel.guild, 'manageChannels')) {
			return this.error(message.channel, 'I don\'t have `Manage Channels` permissions.');
		}

		if (!args[0]) {
			return this.error(message.channel, 'Provide a channel to delete.');
		}

		const channel = this.resolveChannel(message.channel.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, 'This channel doesn\'t exist.');
		}

		this.client.deleteChannel(channel.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));

		return this.success(message.channel, `Channel: **${channel.name}** successfully deleted`);
    }

	async clone({ message, args }) {
		if (!this.hasPermissions(message.channel.guild, 'manageChannels')) {
			return this.error(message.channel, 'I don\'t have `Manage Channels` permissions.');
		}

		if (!args[0]) {
			return this.error(message.channel, 'Provide a channel to clone.');
		}

		const channel = this.resolveChannel(message.channel.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `Couldn't find the channel **${args[0]}**.`);
		}

		if (channel.type === 4) {
			return this.error(message.channel, 'You can\'t clone categories');
		}

		const name = args[1] || channel.name;

		const cloned = channel.parentID ?
			await await this.createChannel(message, name, channel.type, channel.parentID) :
			await await this.createChannel(message, name, channel.type);

		// await for all permissions before sending success message ?

		// could be done without waiting for all request
		// possibly bad for performance?
		if (channel.permissionOverwrites.size > 0) {
			const promises = channel.permissionOverwrites.map(p => this.client.editChannelPermission(cloned.id, p.id, p.allow, p.deny, p.type, '[CLONE]'));
			await Promise.all(promises);
		}

		return this.success(message.channel, `**${channel.name}** was cloned to **${name}**.`);
	}

	rename({ message, args }) {
		if (!this.hasPermissions(message.channel.guild, 'manageChannels')) {
			return this.error(message.channel, 'I don\'t have `Manage Channels` permissions.');
		}

		if (!args[0]) {
			return this.error(message.channel, 'Provide a channel to edit.');
		}

		const channel = this.resolveChannel(message.channel.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `Couldn't find the channel **${args[0]}**.`);
		}

		if (!args[1]) {
			return this.error(message.channel, 'Provide a name to edit.');
		}

		const name = args.slice(1).join(' ');
		if (name.length < 1 || name.length > 100) {
			return this.error(message.channel, 'A channel can\'t have a name longer than 100 char.');
		}

		this.client.editChannel(channel.id, { name: name }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
		return this.success(message.channel, `**${channel.name}** was renamed to **${name}**.`);
	}

    topic({ message, args }) {
		if (!this.hasPermissions(message.channel.guild, 'manageChannels')) {
			return this.error(message.channel, 'I don\'t have `Manage Channels` permissions.');
		}

		if (!args[0]) {
			return this.error(message.channel, 'Provide a channel to edit.');
		}

		const channel = this.resolveChannel(message.channel.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `Couldn't find the channel **${args[0]}**.`);
		}

		if (channel.type !== 0) {
			return this.error(message.channel, 'This channel is not a text channel.');
		}

		if (!args[1]) {
			return this.error(message.channel, 'Provide a topic to edit.');
		}

		const topic = args.slice(1).join(' ');
		if (topic.length > 1024) {
			return this.error(message.channel, 'The topic can\'t be longer than 1024 char.');
		}

		this.client.editChannel(channel.id, { topic: topic }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
		return this.success(message.channel, `Channel topic for **${channel.name}** successfully edited`);
	}

	async getAndCreate(message, args, name, type) {
		const channel = this.resolveChannel(message.channel.guild, args.join(' '));
		if (!channel) {
			return null;
		}

		let created;
		if (channel.parentID) {
			created = await this.createChannel(message, name, type, channel.parentID);
		} else {
			created = await this.createChannel(message, name, type);
		}

		return [channel, created];
	}

	createChannel(message, name, type, parentID) {
		if (parentID) {
			return this.client.createChannel(message.channel.guild.id, name, type, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`), parentID);
		} else {
			return this.client.createChannel(message.channel.guild.id, name, type, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
		}
	}

	inside(message, channel, categoryID) {
		return this.client.editChannel(channel.id, { parentID: categoryID }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
	}

	outside(message, channel) {
		return this.client.editChannel(channel.id, { parentID: null }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
	}

	async above(message, channel, above) {
		if (above.parentID && (channel.parentID !== above.parentID)) {
			channel = await this.inside(message, channel, above.parentID);
		} else if (!above.parentID) {
			channel = await this.outside(message, channel);
		} else if (channel.position === above.position - 1) {
			return Promise.resolve();
		}

		let position = (channel.position > above.position) ? above.position : above.position - 1;
		position = position < 0 ? 0 : position;

		return this.editChannelPosition(channel.id, position);
	}

	async below(message, channel, below) {
		if (below.parentID && (channel.parentID !== below.parentID)) {
			channel = await this.inside(message, channel, below.parentID);
		} else if (!below.parentID) {
			channel = await this.outside(message, channel);
		} else if (channel.position === below.position + 1) {
			return Promise.resolve();
		}

		const position = (channel.position > below.position) ? below.position + 1 : below.position;

		return this.editChannelPosition(channel.id, position);
	}

	/**
    * Edit a guild channel's position. Note that channel position numbers are lowest on top and highest at the bottom.
    * @arg {String} channelID The ID of the channel
    * @arg {Number} position The new position of the channel
    * @returns {Promise}
    */
   editChannelPosition(channelID, position) {
	var channels = this.client.guilds.get(this.client.channelGuildMap[channelID]).channels;
	var channel = channels.get(channelID);
	if (!channel) {
		return Promise.reject(new Error(`Channel ${channelID} not found`));
	}
	if (channel.position === position) {
		return Promise.resolve();
	}
	var min = Math.min(position, channel.position);
	var max = Math.max(position, channel.position);

	channels = channels
		.filter((chan) => chan.type === channel.type &&
			min <= chan.position &&
			chan.position <= max &&
			chan.id !== channelID)
		.sort((a, b) => a.position - b.position);

	if (position > channel.position) {
		channels.push(channel);
	} else {
		channels.unshift(channel);
	}
	return this.client.requestHandler.request(
		'PATCH',
		`/guilds/${this.client.channelGuildMap[channelID]}/channels`,
		true,
		channels.map((channel, index) => ({
			id: channel.id,
			position: index + min,
		}))
	);
	}
}

module.exports = Channel;
