const moment = require('moment');
const Task = require('../Task');
const logger = require('../logger').get('Reminders');

require('moment-duration-format');

class Reminders extends Task {
    constructor() {
        super();

        if (this.isDisabled('Reminders')) {
            logger.info('Reminders Task is disabled.');
            return;
        }

        logger.info('Starting Reminders Task.');

        this.schedule('*/1 * * * *', this.processReminders.bind(this));
    }

    async processReminders() {
		try {
			var docs = await this.models.Reminder.find({ completedAt: { $lte: Date.now() } }).lean().exec();
			if (!docs || !docs.length) {
				return false;
            }
            
            logger.info(`Processing ${docs.length} Reminders.`);
		} catch (e) {
			return logger.error(e);
		}

		docs.forEach(async (doc) => {
            try {
                var user = await this.client.getRESTUser(doc.user);
            } catch (err) {
                return logger.error(err);
            }

            if (!user) {
                return;
            }

            if (doc.content.length > 2000) {
                return this.models.Reminder.deleteOne({ _id: doc._id }).catch(err => logger.error(err));
            }

            const timeSince = moment().diff(moment(doc.createdAt));

            const embed = {
                color: 1,
                title: `Reminder`,
                description: doc.content,
                thumbnail: { url: 'https://cdn.discordapp.com/attachments/516435840130482216/687012987525136440/DynoTimer.png' },
                footer: { text: `Reminder from ${moment.duration(timeSince, 'milliseconds').format('w [weeks] d [days], h [hrs], m [min], s [sec]')} ago` }
            };

			this.models.Reminder.deleteOne({ _id: doc._id }).catch(err => logger.error(err));
            this.sendDM(user.id, { embed }).catch(() => null);
		});
	}
}

const task = new Reminders();
