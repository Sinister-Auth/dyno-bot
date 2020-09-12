'use strict';

const Eris = require('eris');
const dot = require('dot-object');
const uuid = require('node-uuid');
const Server = require('./Server');
const config = require('./config');
const logger = require('./logger').get('Client');
const CommandCollection = require('../collections/CommandCollection');
const ModuleCollection = require('../collections/ModuleCollection');
const GuildCollection = require('../collections/GuildCollection');
const { Dyno } = require('./models').models;

class Client {
	constructor() {
		process.on('uncaughtException', this.handleException.bind(this));
		process.on('unhandledRejection', this.handleRejection.bind(this));

		this.server = new Server(config);
		this.reconnectIntervals = {};

		config.state = config.state || (config.beta ? 1 : config.test ? 2 : 0);
		config.uuid = uuid.v4();

		this.setup();
	}

	/**
	 * Uncaught exception handler
	 * @param  {Object} err Error object
	 */
	handleException(err) {
		logger.error(err, 'unhandled');
		setTimeout(() => process.exit(), 3000);
	}

	handleRejection(reason, p) {
		logger.error(`Unhandled rejection at: Promise ${p} reason: ${reason}`, 'unhandled', {reason, p}); // eslint-disable-line
	}

	watchGlobal() {
		this._globalWatch = Dyno.watch();
		this._globalWatch.on('error', async (err) => {
			this.logger.error(err);

			try {
				this._globalWatch.close();
			} catch (err) {
				// pass
			}

			setTimeout(this.watchGlobal.bind(this), 1000);
		});
		this._globalWatch.on('change', this.updateGlobal.bind(this));
	}

	updateGlobal(change) {
		const globalConfig = config.global;
		switch (change.operationType) {
			case 'update':
				if (Object.keys(change.updateDescription.updatedFields).length) {
					for (let [key, val] of Object.entries(change.updateDescription.updatedFields)) {
						dot.set(key, val, globalConfig);
					}
				}
				if (change.updateDescription.removedFields.length > 0) {
					for (let field of change.updateDescription.removedFields) {
						dot.remove(field, globalConfig);
					}
				}
				config.global = globalConfig;
				break;
			case 'replace':
				if (change.fullDocument) {
					config.global = change.fullDocument;
				}
				break;
		}
	}

	async setup() {
		this.client = new Eris(`Bot ${config.client.token}`, { restMode: true });

		await Dyno.findOne().lean()
			.then(doc => { config.global = doc; })
			.catch(err => logger.error(err));

		this.watchGlobal();

		// Create collections
		this.commands = config.commands = new CommandCollection();
		this.modules  = config.modules  = new ModuleCollection();
		this.guilds   = config.guilds   = new GuildCollection();

		if (config.prefix) {
			this.prefix = (typeof config.prefix === 'string') ? config.prefix : '?';
		}

		this.user = await this.client.getSelf().catch(err => logger.error(err));

		await this.server.start(this);
	}
}

module.exports = Client;
