const moment = require('moment');
const config = require('../config');
const Task = require('../Task');
const Purger = require('../utils/Purger');
const logger = require('../logger').get('Script');

class Script extends Task {
	constructor() {
        super();
        // Timeout for mongo to connect
        setTimeout(() => this.runScript(), 15000);
	}

	async runScript() {
        const experimentName = 'test';
        const lastActiveThreshold = moment().subtract(1, 'd').toDate().getTime();
        const coll = this.db.collection('servers');
        const docs = await coll.find(
            { 
                deleted: { $ne: true }, 
                isPremium: { $ne: true }, 
                lastActive: { $gt: lastActiveThreshold }, 
                experiment: { $exists: false }},
                { projection: { _id: 1 } }
        ).toArray();
        
        logger.info(`Found ${docs.length}`)

        this.shuffleArray(docs);

        //Fixed amount of guilds
        const guildsToOptIn = 10000;

        // Percent (0.05 === 5%)
        // const guildsToOptIn = docs.length * 0.05;

        const bulkOp = coll.initializeUnorderedBulkOp();

        const expGuilds = docs.slice(0, guildsToOptIn);
        const expGuildsControl = docs.slice(guildsToOptIn, guildsToOptIn *2 );

        for(let guild of expGuilds) {
            bulkOp.find({ _id: guild._id }).updateOne({ $set: { experiment: experimentName }})
        }

        for(let guild of expGuildsControl) {
            bulkOp.find({ _id: guild._id }).updateOne({ $set: { experiment: `${experimentName}_control` }})
        }

        await bulkOp.execute();
        logger.info('done');
        process.exit(0);
    }
    
    //Durstenfeld shuffle
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

const task = new Script();
