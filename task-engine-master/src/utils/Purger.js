const logger = require('../logger').get('Purger');

class Purger {
    constructor(client) {
        this.client = client;
    }

	async getMessages(channel, options = {}) {
		const channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.resolve();
		}

		let messages = await this.client.getMessages(channelId, options.limit || 5000, options.before || null);

		if (!messages || !messages.length) {
			return Promise.resolve();
		}
		if (options.slice) {
			const count = options.slice > messages.length ? messages.length : options.slice;
			messages = messages.slice(0, count);
		}

		return Promise.resolve(messages);
	}

	deleteMessages(channel, messages) {
		if (!messages || !messages.length) {
			return Promise.resolve();
		}

		const channelId = typeof channel === 'string' ? channel : channel.id || null;
		if (!channelId) {
			return Promise.reject('Invalid channel');
		}

		const messageIds = messages.filter(m => {
			if (m.pinned) {
				return false;
			}
			if (!m.timestamp) {
				return true;
			}
			if ((Date.now() - m.timestamp) > (14 * 24 * 60 * 60 * 1000)) {
				return false;
			}
			return true;
		}).map(m => m.id);

		if (!messageIds.length) {
			return Promise.resolve();
		}

		return this.client.deleteMessages(channelId, messageIds)
	}

	purge(channel, options) {
		return this.getMessages(channel, options)
			.then((messages) => {
				if (!messages || !messages.length) {
					return;
				}
				logger.debug(`Got ${messages.length} messages.`);

				const filter = options.filter;

				if (filter && this[filter.filter]) {
					messages = this[filter.filter](messages, filter.text || filter.roles);
				}

				return this.deleteMessages(channel, messages);
			});
	}

	match(messages, text) {
		text = text.split('|');

		return messages.filter(m => {
			const content = m.content.toLowerCase();
			for (let t of text) {
				if (content.includes(t.toLowerCase())) return true;
				if (m.embeds && m.embeds.length) {
					for (let e of m.embeds) {
						if (e.title && e.title.includes(t.toLowerCase())) return true;
						if (e.description && e.description.includes(t.toLowerCase())) return true;
					}
				}
			}
			return false;
		});
	}

	not(messages, text) {
		text = text.split('|');

		return messages.filter(m => {
			const content = m.content.toLowerCase();
			for (let t of text) {
				if (content.includes(t.toLowerCase())) return false;
				if (m.embeds && m.embeds.length) {
					for (let e of m.embeds) {
						if (e.title && e.title.includes(t.toLowerCase())) return true;
						if (e.description && e.description.includes(t.toLowerCase())) return false;
					}
				}
			}
			return true;
		});
	}

	startswith(messages, text) {
		return messages.filter(m => {
			const content = m.content.toLowerCase();
			for (let t of text) {
				if (content.startsWith(t.toLowerCase())) return true;
			}
			return false;
		});
	}

	endswith(messages, text) {
		return messages.filter(m => {
			const content = m.content.toLowerCase();
			for (let t of text) {
				if (content.endsWith(t.toLowerCase())) return true;
			}
			return false;
		});
	}

	hasrole(messages, roles) {
		return messages.filter(m => m.member.roles && m.member.roles.find(r => roles.includes(r)));
	}

	notrole(messages, roles) {
		return messages.filter(m => !m.member.roles || !m.member.roles.find(r => roles.includes(r)));
	}

	links(messages) {
		const linkRegex = new RegExp(/https?:\/\/[\w\d-_]/, 'gi');
		return messages.filter(m => m.content.match(linkRegex));
	}

	invites(messages) {
		const inviteRegex = new RegExp(/discord(?:app.com\/invite|.gg|.me|.io)(?:[\\]+)?\/([a-zA-Z0-9\-]+)/, 'gi');
		return messages.filter(m => m.content.match(inviteRegex));
	}

	images(messages) {
		return messages.filter(m => (m.attachments && m.attachments.length) || (m.embeds && m.embeds.find(e => e.type === 'image')));
	}

	notimages(messages) {
		return messages.filter(m => !(m.attachments && m.attachments.length > 0) && !(m.embeds && !!m.embeds.find(e => e.type === 'image')));
	}

	embeds(messages) {
		return messages.filter(m => m.embeds && m.embeds.length && m.embeds[0].type === 'rich');
	}

	bots(messages) {
		return messages.filter(m => m.author && m.author.bot);
	}

	humans(messages) {
		return messages.filter(m => m.author && !m.author.bot);
	}
}

module.exports = Purger;
