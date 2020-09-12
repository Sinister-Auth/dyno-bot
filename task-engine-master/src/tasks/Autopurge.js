const moment = require('moment');
const config = require('../config');
const Task = require('../Task');
const Purger = require('../utils/Purger');
const logger = require('../logger').get('Autopurge');

class Autopurge extends Task {
	constructor() {
		super();

		if (this.isDisabled('Autopurge')) {
			logger.info('Autopurge Task is disabled.');
			return;
		}

		if (!config.isPremium) {
			return process.exit('SIGTERM');
		}

		logger.info('Starting Autopurge task.');

		this.purger = new Purger(this.client);
		this.schedule('0,30 * * * * *', this.purge.bind(this));
	}

	async purge() {
		try {
			var docs = await this.models.Autopurge.find({ disabled: { $ne: true }, nextPurge: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			return logger.error(err);
		}

		if (!docs || !docs.length) {
			return;
		}

		logger.debug(`Found ${docs.length} channels to purge.`);

		// The idea here is to spread out the purges within the scheduled interval to prevent 429s
		const intervalBetweenPurges = (docs.length / 28) * 1000;

		let accumulator = 0;
		for(let doc of docs) {
			setTimeout(async () => {
				try {
					if (doc.interval < 1) {
						await this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
					}
	
					const guildConfig = await this.models.Server.findOne({ _id: doc.guild }).lean().exec().catch(() => null);
					if (!guildConfig.modules.hasOwnProperty('Autopurge') && guildConfig.modules.Autopurge === false) {
						await this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
					}
	
					logger.debug(`Purging ${doc.guild}`);
					try {
						const nextPurge = moment().add(doc.interval, 'minutes').toDate();
						await this.models.Autopurge.update({ _id: doc._id }, { $set: { nextPurge: nextPurge } }).catch(err => logger.error(err));
						await this.purger.purge(doc.channel, { limit: 5000, filter: doc.filter || false })
					} catch (err) {
						if (err && err.code) {
							if (err.code == 10003) {
								logger.info(`Auto removing ${doc.guild} - ${doc.channel}, Unknown Channel`);
								await this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
							} else if (err.code == 50001) {
								logger.info(`Auto removing ${doc.guild} - ${doc.channel}, Missing Access`);
								await this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
							} else if (err.code == 50013) {
								logger.info(`Auto removing ${doc.guild} - ${doc.channel}, Missing Permissions`);
								await this.models.Autopurge.remove({ _id: doc._id }).catch(() => null);
							}
	
							logger.error(err);
						}
					}
				} catch (err) {
					logger.error(err, 'Autopurge', doc);
				}
			}, accumulator);
			accumulator += intervalBetweenPurges;
		}
	}
}

const task = new Autopurge();
