const path = require('path');
const { MessageChannel, Worker } = require('worker_threads');
const logger = require('../logger');

process.on('uncaughtException', err => logger.error(err) && process.exit());

let EventEmitter;

try {
	EventEmitter = require('eventemitter3');
} catch (e) {
	EventEmitter = require('events');
}

class Cluster extends EventEmitter {
    /**
	 * Representation of a cluster
	 *
	 * @param {Number} id Cluster ID
	 * @prop {Number} [options.shardCount] Shard count
	 * @prop {Number} [options.firstShardId] Optional first shard ID
	 * @prop {Number} [options.lastShardId] Optional last shard ID
	 * @prop {Number} [options.clusterCount] Optional cluster count
	 *
	 * @prop {Number} id Cluster ID
	 * @prop {Object} worker The worker
     * @prop {MessageChannel} channel A worker message channel for communication
	 * @prop {Number} threadId The worker thread ID
	 */
	constructor(manager, options) {
        super();
        
        this.manager = manager;

		this.id = options.id;
		this.options = options;
		this.shardCount = options.shardCount;
		this.firstShardId = options.firstShardId;
		this.lastShardId = options.lastShardId;
		this.clusterCount = options.clusterCount;

        this.channel = null;
        this.threadId = null;
		this.worker = this.createWorker();
	}

    createWorker(awaitReady = false) {
        const workerPath = path.join(process.cwd(), 'src', 'start.js');

        const workerData = {
            awaitReady: awaitReady,
            clusterId: this.id,
            ...this.options,
        };

        this.worker = new Worker(workerPath, { workerData });
        this.threadId = this.worker.threadId;

        this.worker.on('error', logger.error);
        this.worker.on('exit', code => {
            if (code === 'SIGTERM') {
                return logger.info(`Worker ${this.id} intentionally terminated.`);
            }

            const meta = this.firstShardId !== null ? `${this.firstShardId}-${this.lastShardId}` : this.id.toString();

            this.manager.logger.log(`Cluster ${this.id} died with code ${code}, restarting...`, [
                { name: 'Shards', value: meta },
            ]);

            setTimeout(() => this.restartWorker(awaitReady), 200);
        })

        this.channel = new MessageChannel();
        this.worker.postMessage({ port: this.channel.port1 }, [this.channel.port1]);

        this.channel.port2.on('message', this.handleMessage.bind(this));
    }

    restartWorker(awaitReady = false) {
        const oldWorker = this.worker;
        const oldChannel = this.channel;

        this.createWorker(awaitReady);

        return new Promise(resolve => this.once('ready', () => {
            oldChannel.port2.postMessage({ op: 'exit' });
            if (oldChannel && oldChannel.port2) {
                oldChannel.port2.removeAllListeners();
                oldChannel.port2.close();
            }
            if (oldWorker) {
                oldWorker.removeAllListeners();
            }
        }));
    }

    handleMessage(message) {
        if (message.op && this[message.op]) {
            this[message.op](message);
        }
    }

    send(message) {
        if (!this.channel || !this.channel.port2) {
            return;
        }

        try {
            this.channel.port2.postMessage(message);
        } catch (err) {
            logger.error(err);
        }
    }

    /**
	 * Listen for cluster ready event
	 * @param {String|Object} message Message received from the worker
	 */
	ready(message) {
		if (!message || !message.op) return;
		if (message.op === 'ready') {
			this.emit('ready');
		}
	}
    
    blocked(message) {
		this.manager.logger.blocked.push(message.d);
	}

	shardDisconnect(message) {
		let msg = `[Events] Shard ${message.d.id} disconnected.`;
		if (message.d.err) {
			msg += ` ${message.d.err}`;
		}
		this.manager.logger.shardStatus.push(msg);
	}

	shardReady(message) {
		let msg = `[Events] Shard ${message.d} ready.`;
		this.manager.logger.shardStatus.push(msg);
	}

	shardResume(message) {
		let msg = `[Events] Shard ${message.d} resumed.`;
		this.manager.logger.shardStatus.push(msg);
	}

	shardIdentify(message) {
		let msg = `[Events] Shard ${message.d} identified.`;
		this.manager.logger.shardStatus.push(msg);
	}
}

module.exports = Cluster;
