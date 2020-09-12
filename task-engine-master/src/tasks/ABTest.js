const moment = require('moment');
const Task = require('../Task');
const logger = require('../logger').get('ABTest');
const client = require('prom-client');

const server = require('express')();
const register = client.register;

require('moment-duration-format');

class ABTest extends Task {
    constructor() {
        super();

        if (this.isDisabled('ABTest')) {
            logger.info('ABTest Task is disabled.');
            return;
        }

        logger.info('Starting ABTest Task.');
        setTimeout(() => this.init(), 10000);
    }

    async init() {
        await this.fetchDocs();
    }

    async fetchDocs() {
        try {
            logger.debug('1 - Fetching docs');
            const coll = this.db.collection('experiments');
            const docs = await coll.find({}).toArray();
            this.experimentsDocs = {};
            for (let doc of docs) {
                this.experimentsDocs[doc.guildId] = doc;
            }

            logger.debug('2 - Creating missing docs');
            await this.createMissingDocs();
            logger.debug('3 - Updating stats');
            await this.updateStats();
            setTimeout(this.fetchDocs.bind(this), 10000);
        } catch (err) {
            logger.error(err);
        }
    }

    async createMissingDocs() {
        const coll = await this.db.collection('servers');
        const docs = await coll.find({ experiment: { $exists: true } }).toArray();

        const expColl = this.db.collection('experiments');
        const bulkOp = expColl.initializeOrderedBulkOp();

        for (let doc of docs) {
            if (this.experimentsDocs[doc._id]) {
                const expDoc = this.experimentsDocs[doc._id];
                if (doc.isPremium && (doc.isPremium !== expDoc.isPremium)) {
                    this.experimentsDocs[doc._id].isPremium = doc.isPremium;
                    bulkOp.find({ guildId: expDoc.guildId }).updateOne({ $set: { isPremium: doc.isPremium } });
                    logger.debug(`Updating premium on ${doc._id}`);
                }

                if(doc.deleted && (doc.deleted !== expDoc.deleted)) {
                    this.experimentsDocs[doc._id].deleted = doc.deleted;
                    bulkOp.find({ guildId: expDoc.guildId }).updateOne({ $set: { deleted: doc.deleted } });
                    logger.debug(`Updating deleted on ${doc._id}`);
                }
                continue;
            };

            const newDoc = {
                guildId: doc._id,
                guild: {
                    name: doc.name,
                    memberCount: doc.memberCount,
                    region: doc.region,
                },
                adsServed: 0,
                group: doc.experiment,
                deleted: doc.deleted || false,
                isPremium: doc.isPremium || false,
            };

            logger.debug(`Inserting ${doc._id}`);

            this.experimentsDocs[newDoc.guildId] = newDoc;
            bulkOp.insert(newDoc);
        }
        
        if(bulkOp.length === 0) {
            logger.debug(`No docs to insert/update`);
            return;
        }

        logger.debug(`Inserting/updating ${bulkOp.length} docs`);
        
        await bulkOp.execute();
    }

    async updateStats() {
        if (!this.metricsRegistered) {
            this.registerMetrics();
        }

        let premiumGuilds = {};
        let deletedGuilds = {};
        let allGuilds = {};
        let adsServed = 0;
        for (let guild of Object.values(this.experimentsDocs)) {
            premiumGuilds[guild.group] = (premiumGuilds[guild.group] || 0);
            deletedGuilds[guild.group] = (deletedGuilds[guild.group] || 0);

            if (guild.isPremium) premiumGuilds[guild.group] += 1;
            if (guild.deleted) deletedGuilds[guild.group] += 1;
            if (guild.adsServed > 0) adsServed++;

            allGuilds[guild.group] = (allGuilds[guild.group] || 0) + 1
        }

        for (let group of Object.keys(allGuilds)) {
            this.guildCountMetric.set({ group }, allGuilds[group]);
            this.deletedCountMetric.set({ group }, deletedGuilds[group]);
            this.premiumCountMetric.set({ group }, premiumGuilds[group]);
        }
        this.adsServedMetric.set(adsServed);
    }

    registerMetrics() {
        this.guildCountMetric = new client.Gauge({
            name: 'experiments_guilds_count',
            help: 'Guilds currently opted in the experiment',
            labelNames: ['group'],
        });

        this.deletedCountMetric = new client.Gauge({
            name: 'experiments_guilds_deleted_count',
            help: 'Guilds opted in that kicked the bot',
            labelNames: ['group'],
        });

        this.premiumCountMetric = new client.Gauge({
            name: 'experiments_guilds_premium_count',
            help: 'Guilds opted in that bought premium',
            labelNames: ['group'],
        });

        this.adsServedMetric = new client.Gauge({
            name: 'experiments_ads_shown_count',
            help: 'Counter for ads shown',
        });

        server.get('/metrics', (req, res) => {
            logger.debug('Prom scraping');
            res.set('Content-Type', register.contentType);
            res.end(register.metrics());
        });

        server.listen(3050);

        this.metricsRegistered = true;
    }
}

const task = new ABTest();
