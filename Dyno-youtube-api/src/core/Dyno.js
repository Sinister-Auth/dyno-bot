'use strict';

global.Promise = require('bluebird');
global.Loader = require('./utils/Loader');
global.requireReload = require('require-reload');

const Eris = require('eris');
const each = require('async-each');
const moment = require('moment');
const config = require('./config');
const logger = require('./logger');
const utils = require('../core/utils');
const redis = require('../core/redis');
const models = require('../core/models');
const statsd = require('../core/statsd');
const postWebhook = require('./helpers/post-webhook');
const PermissionsManager = require('./managers/PermissionsManager');
const CommandCollection = require('./collections/CommandCollection');
const ModuleCollection = require('./collections/ModuleCollection');
const GuildCollection = require('./collections/GuildCollection');
const WebhookManager = require('./managers/WebhookManager');
const EventManager = require('./managers/EventManager');
const IPCManager = require('./managers/IPCManager');

var instance;

/**
 * @class Dyno
 */
class Dyno {

	/**
	 * Dyno constructor
	 */
	constructor() {
		this._config = config;
		this.isReady = false;

		instance = this; // eslint-disable-line

		Object.defineProperty(Eris.Message.prototype, 'guild', {
			get: function get() { return this.channel.guild; },
		});

		this._wsStatus = Date.now();

		process.on('unhandledRejection', this.handleRejection.bind(this));
	}

	static get instance() {
		return instance;
	}

	/**
	 * Eris client instance
	 * @returns {Eris}
	 */
	get client() {
		return this._client;
	}

	/**
	 * Eris rest client instance
	 * @return {Eris}
	 */
	get restClient() {
		return this._restClient;
	}

	/**
	 * Dyno configuration
	 * @returns {Object}
	 */
	get config() {
		return this._config;
	}

	/**
	 * Global configuration
	 * @return {Object}
	 */
	get globalConfig() {
		return this._globalConfig;
	}

	get models() {
		return models;
	}

	get redis() {
		return redis;
	}

	get statsd() {
		return statsd;
	}

	handleError(err) {
		if (!err || (typeof err === 'string' && !err.length)) {
			return logger.error('An undefined exception occurred.');
		}

		try {
			logger.error(err);
		} catch (e) {
			console.error(err); // eslint-disable-line
		}
	}

	/**
	 * Unhandled rejection handler
	 * @param {Error|*} reason The reason the promise was rejected
	 * @param {Promise} p The promise that was rejected
	 */
	handleRejection(reason, p) {
		try {
			console.error('Unhandled rejection at: Promise ', p, 'reason: ', reason); // eslint-disable-line
		} catch (err) {
			console.error(reason); // eslint-disable-line
		}
	}

	/**
	 * Setup Dyno and login
	 */
	async setup(options) {
		options = options || {};

		this.options = options;

		options.client = {
			disableEvents: {
				TYPING_START: true,
			},
			disableEveryone: config.client.disableEveryone,
			getAllUsers: config.client.fetchAllUsers || false,
			firstShardID: options.firstShardId || options.clusterId || options.shardId || 0,
			lastShardID: options.lastShardId || options.clusterId || options.shardId || 0,
			maxShards: options.shardCount || 1,
			messageLimit: parseInt(config.client.maxCachedMessages) || 10,
			guildCreateTimeout: 3000,
			// crystal: true,
		};

		options.restClient = { restMode: true };

		if (config.disableEvents) {
			for (let event of config.disableEvents) {
				options.client.disableEvents[event] = true;
			}
		}

		// create the discord client
		this._client = new Eris(config.client.token, options.client);
		this._restClient = new Eris(`Bot ${config.client.token}`, options.restClient);

		this.client.on('error', err => logger.error(err));
		this.client.on('warn', err => logger.error(err));
		this.client.on('debug', msg => {
			if (typeof msg === 'string') {
				msg = msg.replace(process.env.CLIENT_TOKEN, 'potato');
			}
			logger.debug(`[Eris] ${msg}`);
		});

		await this.fetchGlobal();
		setInterval(this.fetchGlobal.bind(this), 60000);

		this.dispatcher = new EventManager(this);
		this.ipc = new IPCManager(this);

		// Create collections
		this.commands = new CommandCollection(config, this);
		this.modules  = new ModuleCollection(config, this);
		this.guilds   = new GuildCollection(config, this);

		// Create managers
		this.webhooks  = new WebhookManager(this);
		this.permissions = new PermissionsManager(this);

		if (config.prefix) {
			this.prefix = (typeof config.prefix === 'string') ? config.prefix : '?';
		}

		// event listeners
		this.client.once('ready', this.ready.bind(this));
		this.client.on('error', this.handleError.bind(this));

		if (!config.disableHeartbeat) {
			this.client.on('messageCreate', this.gatewayPing.bind(this));
			setInterval(this.gatewayCheck.bind(this), 30000);
		}

		// login to discord
		this.login();

		this.readyTimeout = setTimeout(() => this.ipc.send('ready'), 90000);
	}

	/**
	 * Login to Discord
	 * @returns {*}
	 */
	login() {
		if (!config.client.token || !config.client.token.length) {
			return logger.error('OAuth Token must be set in .env');
		}

		// connect to discord
		this.client.connect();

		return false;
	}

	/**
	 * Ready event handler
	 */
	ready() {
		logger.info(`[Dyno] ${this.config.name} ready with ${this.client.guilds.size} guilds.`);

		// register discord event listeners
		this.dispatcher.bindListeners();

		clearTimeout(this.readyTimeout);
		this.ipc.send('ready');

		this.user = this._client.user;
		this.userid = this._client.user.id;

		this.isReady = true;

		if (this.config.client.game) {
			this.client.editStatus('online', { name: this.config.client.game, type: 0 });
		}

		if (this.config.isPremium) {
			this.leaveInterval = setInterval(this.leaveGuilds.bind(this), 300000);
			this.leaveGuilds();
		}
	}

	fetchGlobal() {
		return models.Dyno.findOne().lean()
			.then(doc => { this._globalConfig = doc; })
			.catch(err => logger.error(err));
	}

	/**
	 * Updated the gateway status for this shard
	 */
	gatewayPing() {
		this._wsStatus = Date.now();
	}

	/**
	 * Check the status of the gateway connection and kill the process
	 * if it hasn't received a message in 5 minutes
	 */
	gatewayCheck() {
		const elapsed = (Date.now() - this._wsStatus) / 1000;
		if (elapsed > 900) {
			logger.error(`No message received in 15 minutes, restarting cluster ${this.options.clusterId}`);
			process.exit(9);
		}
	}

	async leaveGuilds() {
		try {
			var docs = await models.Server.find({ deleted: false, isPremium: true }, { _id: 1, isPremium: 1, premiumInstalled: 1 }).lean().exec();
		} catch (err) {
			return logger.error(err);
		}

		each([...this.client.guilds.values()], guild => {
			let guildConfig = docs.find(d => d._id === guild.id);
			if (!guildConfig || !guildConfig.isPremium) {
				this.guilds.update(guild.id, { $set: { premiumInstalled: false } }).catch(err => false);
				this.client.leaveGuild(guild.id);
			}
		});
	}
}

module.exports = Dyno;
