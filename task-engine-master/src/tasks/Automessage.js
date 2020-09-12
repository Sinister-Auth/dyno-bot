const moment = require('moment');
const config = require('../config');
const Task = require('../Task');
const logger = require('../logger').get('Automessage');

class Automessage extends Task {
	constructor() {
		super();

		if (this.isDisabled('Automessage')) {
			logger.info('Automessage Task is disabled.');
			return;
		}

		logger.info('Starting Automessage Task');

		this.schedule('15,45 * * * * *', this.post.bind(this));

		this.getUser().catch(err => {
			throw new Error(err);
		})
	}

	getUser() {
		return this.client.getSelf(config.userId).then(user => this.user = user);
	}

	async post() {
		let docs;
		try {
			// Add 29 seconds so we can properly process everything
			docs = await this.models.Automessage.find({ disabled: { $ne: true }, nextPost: { $lte: Date.now() + (29 * 1000) } }).lean().exec();
			let ids = docs.map(d => d.guild);
			const validGuilds = await this.models.Server.find(
				{
					_id: { $in: ids },
					'modules.Automessage': { $ne: false },
					deleted: { $ne: true },
					isPremium: config.isPremium || { $ne: true },
				}, { _id: 1 }
			).lean().exec();
			const validGuildMap = new Map();
			validGuilds.forEach(g => validGuildMap.set(g._id, true));

			docs = docs.filter(doc => validGuildMap.has(doc.guild));
			logger.debug(`Docs: ${docs.length}, validGuilds: ${validGuilds.length}`);
		} catch (err) {
			return logger.error(err);
		}

		if (!docs || !docs.length) {
			return;
		}

		docs.forEach(async (doc) => {
			try {
				logger.debug(`Posting to ${doc.guild} ${doc.channel}`);

				const options = {};

				if (doc.content) {
					options.content = doc.content;
				}

				if (doc.embed) {
					options.embeds = [doc.embed];
				}

				const nextPost = moment()
					.add(doc.interval, 'minutes')
					.toDate();
					
				await this.models.Automessage.update({ _id: doc._id }, { $set: { nextPost: nextPost } }).catch(() => null);
				await this.postWebhook(doc.channel, doc.webhook, options);
				logger.debug(`Posted to ${doc.channel}, prevNextPost: ${doc.nextPost}, nextPost: ${nextPost}`);

			} catch (err) {
				logger.error(err, 'Automessage', doc);
				let update = { $inc: { errorCount: 1 } };
				if (doc.errorCount >= 5) {
					update = Object.assign(update, {
						$set: { disabled: true, disabledAt: moment().toDate() },
					});
				}
				await this.models.Automessage.update({ _id: doc._id }, update).catch(() => null);
			}
		});
	}

	postWebhook(channelId, webhook, options) {
		const avatarURL = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.jpg?r=${config.version}`;

		let payload = {
			username: 'Dyno',
			avatarURL: avatarURL,
			tts: false,
			wait: true,
		};

		payload = Object.assign(payload, options);

		return this.client.executeWebhook(webhook.id, webhook.token, payload);
	}
}

const task = new Automessage();
