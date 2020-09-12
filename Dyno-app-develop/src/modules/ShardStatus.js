'use strict';

const blocked = require('blocked');
const moment = require('moment');
const Module = Loader.require('./core/structures/Module');
const Collection = Loader.require('./core/interfaces/Collection');
const statsd = require('../core/statsd');

/**
 * ShardStatus module
 * @class ShardStatus
 * @extends Module
 */
class ShardStatus extends Module {
	constructor() {
		super();

		this.module = 'ShardStatus';
		this.description = 'Dyno core module.';
		this.core = true;
		this.list = false;
		this.enabled = true;
		this.hasPartial = false;
	}

	static get name() {
		return 'ShardStatus';
	}

	start() {
		this.shardListeners = new Collection();

		this.shardListeners.set('shardReady', this.shardReady.bind(this))
		this.shardListeners.set('shardResume', this.shardResume.bind(this))
		this.shardListeners.set('shardDisconnect', this.shardDisconnect.bind(this))

		for (let [event, listener] of this.shardListeners) {
			this.client.on(event, listener);
		}

		this.blockHandler = blocked(ms => {
			const id = this.cluster.clusterId.toString();
			const text = `C${id} blocked for ${ms}ms`;
			this.logger.info(`[Dyno] ${text}`);
			this.ipc.send('blocked', text);
		}, { threshold: 1000 });
	}

	unload() {
		if (this.blockHandler) {
			clearInterval(this.blockHandler);
			this.blockHandler = null;
		}
		if (!this.shardListeners.size) return;
		for (let [event, listener] of this.shardListeners) {
			this.client.removeListener(event, listener);
		}
	}

	/**
	 * Shard ready handler
	 * @param  {Number} id Shard ID
	 */
	shardReady(id) {
		this.logger.info(`[Dyno] Shard ${id} ready.`);
		this.ipc.send(`shardReady`, id.toString());
		this.postStat('ready');
	}

	/**
	 * Shard resume handler
	 * @param  {Number} id Shard ID
	 */
	shardResume(id) {
		this.logger.info(`[Dyno] Shard ${id} resumed.`);
		this.ipc.send('shardResume', id.toString());
		this.postStat('resume');
	}

	/**
	 * Shard disconnect handler
	 * @param  {Error} err Error if one is passed
	 * @param  {Number} id  Shard ID
	 */
	shardDisconnect(err, id) {
		// let fields = null;

		if (err) {
			const shard = this.client.shards.get(id);
			this.logger.warn(err, { type: 'dyno.shardDisconnect', cluster: this.cluster.clusterId, shard: id, trace: shard.discordServerTrace });
			// fields = [{ name: 'Error', value: err.message }, { name: 'Trace', value: shard.discordServerTrace.join(', ') }];
		}

		this.logger.info(`[Dyno] Shard ${id} disconnected`);

		let data = { id };
		if (err && err.message) data.error = err.message;

		this.ipc.send('shardDisconnect', data);
		this.postStat('disconnect');
	}

	postShardStatus(text, fields) {
		if (!this.config.shardWebhook) return;
		if (this.config.state === 2) return;

		const payload = {
            username: 'Shard Manager',
            avatar_url: `${this.config.site.host}/${this.config.avatar}`,
            embeds: [],
            tts: false,
        };

        const embed = {
			title: text,
			timestamp: new Date(),
			footer: {
				text: this.config.stateName,
			},
        };

        if (fields) embed.fields = fields;

        payload.embeds.push(embed);

        postWebhook(this.config.shardWebhook, payload);
	}

	async postStat(key) {
		const day = moment().format('YYYYMMDD');
		const hr = moment().format('YYYYMMDDHH');

		statsd.increment(`discord.shard.${key}`, 1);

		const [dayExists, hrExists] = await Promise.all([
			this.redis.existsAsync(`shard.${key}.${day}`),
			this.redis.existsAsync(`shard.${key}.${hr}`),
		]);

		const multi = this.redis.multi();

		multi.incrby(`shard.${key}.${day}`, 1);
		multi.incrby(`shard.${key}.${hr}`, 1);

		if (!dayExists) {
			multi.expire(`shard.${key}.${day}`, 604800);
		}

		if (!hrExists) {
			multi.expire(`shard.${key}.${hr}`, 259200);
		}

		multi.execAsync().catch(err => logger.error(err));
	}
}

module.exports = ShardStatus;
