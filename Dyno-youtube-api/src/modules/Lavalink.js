'use strict';

const { PlayerManager } = require('eris-lavalink');
const Module = Loader.require('./core/structures/Module');
const redis = require('../core/redis');
// const statsd = require('../core/statsd');

class Lavalink extends Module {
	/**
	 * Lavalink module
	 * @param {Object} config Bot configuration
	 * @param {*} [args] Additional arguments that may be passed.
	 */
	constructor(...args) {
		super(...args);

		this.module = 'Lavalink';
		this.description = 'Enables youtube search and playing.';
		this.core = true;
		this.enabled = true;
		this.hasPartial = false;

		this.version = 3.1;
	}

	async start() {
		let nodes = this.globalConfig.nodes || [];

		if (this.config.isPremium) {
			nodes = nodes.filter(n => n.premium);
		} else {
			nodes = nodes.filter(n => !n.premium);
		}

		console.log(nodes);

		let regions = {
            eu: ['eu', 'amsterdam', 'frankfurt', 'russia', 'hongkong', 'singapore', 'sydney'],
            us: ['us', 'brazil'],
        };

		if (!(this.client.voiceConnections instanceof PlayerManager)) {
			this.client.voiceConnections = new PlayerManager(this.client, nodes, {
				numShards: this.dyno.options.shardCount,
				userId: this.config.client.userid || '155149108183695360',
				regions: regions,
				defaultRegion: 'eu',
			});
		}

		this.schedule('*/3 * * * * *', this.checkNodes.bind(this));
		this.schedule('0,15,30,45 * * * * *', this.updateStats.bind(this));
	}

	checkNodes() {
		if (!this.dyno.isReady) return;

		let nodes = this.globalConfig.nodes,
			voiceNodes = this.client.voiceConnections.nodes;

		if (this.config.isPremium) {
			nodes = nodes.filter(n => n.premium);
		} else {
			nodes = nodes.filter(n => !n.premium);
		}

		if (nodes && nodes.length) {
			for (let node of nodes) {
				if (voiceNodes.has(node.host)) continue;
				this.client.voiceConnections.createNode(Object.assign({}, node, {
					numShards: this.dyno.options.shardCount,
					userId: this.config.client.userid || '155149108183695360',
				}));
			}
		}

		if (voiceNodes && voiceNodes.size) {
			for (let [host, node] of voiceNodes) {
				if (nodes.find(n => n.host === host)) continue;
				this.client.voiceConnections.removeNode(host);
			}
		}
	}

	updateStats() {
		let playingConnections = [...this.client.voiceConnections.values()].filter(c => c.playing);
		redis.hsetAsync(`dyno:vc:${this.config.client.id}`, `${this.dyno.options.clusterId}:${this.config.state}`, playingConnections.length || 0)
			.catch(() => null);

		for (let [host, node] of this.client.voiceConnections.nodes) {
			if (!node.stats) continue;
			redis.hsetAsync(`lavalink:nodes`, host, JSON.stringify(node.stats));
		}
	}
}

module.exports = Lavalink;
