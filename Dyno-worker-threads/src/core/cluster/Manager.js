'use strict';

const os = require('os');
const Cluster = require('./Cluster');
const Logger = require('./Logger');
const Sharding = require('./Sharding');
const Server = require('./Server');
const config = require('../config');
const { Collection } = require('@dyno.gg/dyno-core');

/**
 * @class Manager
 */
class Manager {
	/**
	 * Create the cluster manager
	 * @param {String} strategy Sharding strategy
	 */
	constructor(strategy) {
		this.clusters = new Collection();

		this.shardCount = config.shardCountOverride || os.cpus().length;

		process.on('uncaughtException', this.handleException.bind(this));
		process.on('unhandledRejection', this.handleRejection.bind(this));

		this.logger = new Logger(this);
		this.sharding = new Sharding(this);
		this.server = new Server(this);

		strategy = strategy || config.shardingStrategy;

		this.logger.register();
		this.logger.info(`[Manager] Sharding strategy ${strategy}`);

		if (strategy && this.sharding[strategy]) {
			this.sharding[strategy]();
		} else {
			this.sharding.createShardsProcess();
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

	handleException(err) {
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
	 * Reload a module
	 * @param {String} module Module name
	 */
	reloadModule(module) {
		const modulekey = module.toLowerCase();
		const activeModule = this[modulekey];
		if (!activeModule) return;

		if (activeModule.unload) {
			activeModule.unload();
		}

		this[modulekey] = requireReload(require)(`./${module}`);

		if (this[modulekey].register) {
			this[modulekey].register();
		}
	}

	/**
	 * Create a cluster
	 * @param {Number} id Shard ID
	 */
	createCluster(options) {
		const cluster = new Cluster(this, options);
		this.clusters.set(parseInt(cluster.id), cluster);

		return cluster;
		// return this.awaitReady(cluster);
	}

	/**
	 * Await the ready event from a cluster
	 * @param {Shard} cluster The cluster to wait
	 * @return {Promise}
	 */
	awaitReady(cluster) {
		return new Promise(resolve =>
			cluster.on('ready', resolve));
	}

	/**
	 * Get a cluster by worker
	 * @param {Object} worker Worker process
	 * @returns {Shard} A cluster matching the worker pid
	 */
	getCluster(worker) {
		return this.clusters.find(s => s.pid === worker.process.pid || s._pid === worker.process.pid);
	}

	/**
	 * Handle a cluster dying
	 * @param {Object} worker Worker process
	 */
	handleExit(worker, code, signal) {
		const cluster = this.getCluster(worker);

		if (signal && signal === 'SIGTERM') return;
		if (!cluster) return;

		const meta = cluster.firstShardId !== null ? `${cluster.firstShardId}-${cluster.lastShardId}` : cluster.id.toString();

		this.logger.log(`Cluster ${cluster.id} died with code ${signal || code}, restarting...`, [
			{ name: 'Shards', value: meta },
		]);

		cluster.restartWorker().then(() => {
			this.logger.log(`Cluster ${cluster.id} ready.`);
		});
	}
}

module.exports = Manager;
