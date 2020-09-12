'use strict';

const Module = Loader.require('./core/structures/Module');

/**
 * Starboard module
 * @class Starboard
 * @extends Module
 */
class Starboard extends Module {
	constructor(...args) {
		super(...args);

		this.module = 'Starboard';
		this.description = 'Create a public starboard for members to star messages.';
		this.enabled = false;
		this.hasPartial = false;
		this.vipOnly = true;
	}

	static get name() {
		return 'Starboard';
	}

	get settings() {
		return {
			channels: { type: Array },
			minStars: { type: Number, default: 2 },
		}
	}

	start() {
		this.messages = new Map();
	}

	async getOrFetchMessage(id) {
		if (this.messages.has(id)) {
			return this.messages.get(id);
		}
		let docs = await this.models.StarredMessages.find({ id: id }).limit(1).lean().exec();
		if (!docs || !docs.length) {
			throw 'Message not found';
		}
		this.messages.set(id, docs[0]);
		return docs[0];
	}

	async star(message, user, remove) {
		message = await this.getOrFetchMessage(message.id);
		if (!message) {
			message = {
				id: message.id,
				guild: message.guild.id,
				channel: message.channel.id,
				author: message.author.toJSON(),
				content: message.content,
				timestamp: message.timestamp,
				stars: [],
			};

			let doc = this.models.StarredMessages(message);
			try {
				await doc.save();
			} catch (err) {
				return this.logger.error(err);
			}
		}

		if (remove) {
			let index = message.stars.indexOf(user.id);
			if (index === -1) return;
			message.stars.splice(index, 1);
		} else {
			if (message.stars.indexOf(user.id) > -1) return;
			message.stars.push(user.id);
		}

		return this.models.StarredMessages.update({ $set: { stars: message.stars } }).catch(() => null);
	}

	messageReactionAdd({ message, guild, emoji, userId, guildConfig }) {
		if (!this.isEnabled(guild, this.module, guildConfig)) return;
		if (!emoji || !userId) return;
	}

	messageReactionRemove({ message, guild, emoji, userId, guildConfig }) {
		if (!this.isEnabled(guild, this.module, guildConfig)) return;
		if (!emoji || !userId) return;
	}

	messageReactionRemoveAll({ message, guild, guildConfig }) {
		if (!this.isEnabled(guild, this.module, guildConfig)) return;
	}
}
