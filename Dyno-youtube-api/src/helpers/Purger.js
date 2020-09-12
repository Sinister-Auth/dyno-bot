'use strict';

const Base = Loader.require('./core/structures/Base');

class Purger extends Base {
	async getMessages(channel, options = {}) {
		let channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.resolve();
		}

		try {
			var messages = await this.client.getMessages(channelId, options.limit || 5000, options.before || null);
		} catch (err) {
			this.logger.error(err);
			return Promise.resolve();
		}

		if (!messages || !messages.length) {
			return Promise.resolve();
		}
		if (options.filter) {
			messages = messages.filter(options.filter);
		}
		if (options.slice) {
			let count = options.slice > messages.length ? messages.length : options.slice;
			messages = messages.slice(0, count);
		}

		return Promise.resolve(messages);
	}

	deleteMessages(channel, messages) {
		if (!messages || !messages.length) {
			return Promise.resolve();
		}

		let channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.reject('Inavlid channel');
		}

		let messageIds = messages.filter(m => {
			if (m.pinned) return false;
			if (!m.timestamp) return true;
			if ((Date.now() - m.timestamp) > (14 * 24 * 60 * 60 * 1000)) {
				return false;
			}
			return true;
		}).map(m => m.id);

		if (!messageIds.length) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) =>
			this.client.deleteMessages(channelId, messageIds)
				.catch(reject)
				.then(resolve));
	}

	purge(channel, options) {
		return this.getMessages(channel, options)
			.then(messages => {
				this.logger.debug(`Got ${messages.length} messages.`);
				this.deleteMessages(channel, messages);
			});
	}
}

module.exports = Purger;
