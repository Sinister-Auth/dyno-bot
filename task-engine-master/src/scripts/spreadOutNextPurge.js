const moment = require('moment');
const config = require('../config');
const Task = require('../Task');
const Purger = require('../utils/Purger');
const logger = require('../logger').get('Autopurge');

class Script extends Task {
    constructor() {
        super();
        // Timeout for mongo to connect
        setTimeout(() => this.runScript(), 10000);
    }

    async runScript() {
        const scriptStartDate = new Date();
        for (let i = 0; i < 24; i++) {

            let nextPurgeFilter = { 
                $gt: moment(scriptStartDate).add(i, 'hours').toDate(),
                $lt: moment(scriptStartDate).add(i + 1, 'hours').toDate()
            };

            if(i === 0) {
                delete nextPurgeFilter.$gt;
            }
            
            var docs = await this.models.Autopurge.find(
            { 
                disabled: { $ne: true },
                nextPurge: nextPurgeFilter
            }).lean().exec();
            // 1h has 3600 seconds, so we calculate the increase to evenly distribute all purges across that hour, in ms
            const increase = (3600 / docs.length) * 1000;
            let baseDate = moment(scriptStartDate).add(i, 'hours');
            // console.log(`Updating ${docs.length} docs`);
            for (let doc of docs) {
                try {
                    baseDate = baseDate.add(increase, 'ms');
                    // console.log(`${doc.nextPurge.getHours()}:${doc.nextPurge.getMinutes()}`, '-->' ,`${baseDate.toDate().getHours()}:${baseDate.toDate().getMinutes()}`);
                    await this.models.Autopurge.update({ _id: doc._id }, { $set: { nextPurge: baseDate.toDate() } }).catch(err => logger.error(err));
                } catch (err) {
                    logger.error(err, doc);
                }
            }

            console.log(`Updated ${docs.length} docs for hour +${i} from now`);
        }

        process.exit(0);
    }
}

const task = new Script();
