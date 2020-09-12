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
        var docs = await this.models.Autopurge.find({ disabled: { $ne: true }, nextPurge: { $lte: moment().add(24, 'hours').toDate() } }).lean().exec();
        const hourly = {};
        for (let i = 0; i < 24; i++) {
            hourly[i.toString()] = new Map();
        }

        for(let doc of docs) {
            const hour = moment(doc.nextPurge).hour();
            const minute = moment(doc.nextPurge).minute();
            let value = hourly[hour].get(minute) || 0;
            value += 1;zz
            hourly[hour].set(minute, value);
        }

        for(let key of Object.keys(hourly)) {
            console.log(key, '---' ,Array.from(hourly[key].values()).reduce((sum, curr) => { return sum + curr }, 0));
            for(let mapKey of hourly[key].keys()) {
                console.log('    ', mapKey, '---', hourly[key].get(mapKey));
            }
        }

        process.exit(0);
	}
}

const task = new Script();
