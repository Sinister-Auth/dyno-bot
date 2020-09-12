import {Collection, Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as blocked from 'blocked';
import * as moment from 'moment';
import * as superagent from 'superagent';

/**
 * ShardStatus module
 * @class ShardStatus
 * @extends Module
 */
export default class ShardStatus extends Module {
	public module     : string  = 'ShardStatus';
	public description: string  = 'Dyno core module.';
	public core       : boolean = true;
	public list       : boolean = false;
	public enabled    : boolean = true;
	public hasPartial : boolean = false;

	public start() {
		this.shardListeners = new Collection();

		this.shardListeners.set('shardReady', this.shardReady.bind(this));
		this.shardListeners.set('shardResume', this.shardResume.bind(this));
		this.shardListeners.set('shardDisconnect', this.shardDisconnect.bind(this));

		for (const [event, listener] of this.shardListeners) {
			this.client.on(event, listener);
		}

		this.blockHandler = blocked((ms: number) => {
			const id = this.cluster.clusterId.toString();
			const text = `C${id} blocked for ${ms}ms`;
			this.logger.info(`[Dyno] ${text}`);
			this.ipc.send('blocked', text);
		}, { threshold: 1000 });
	}

	public unload() {
		if (this.blockHandler) {
			clearInterval(this.blockHandler);
			this.blockHandler = null;
		}

		if (!this.shardListeners.size) {
			return;
		}

		for (const [event, listener] of this.shardListeners) {
			this.client.removeListener(event, listener);
		}
	}

	/**
	 * Shard ready handler
	 */
	public shardReady(id: number) {
		this.logger.info(`[Dyno] Shard ${id} ready.`);
		this.ipc.send(`shardReady`, id.toString());
		this.postStat('ready');
	}

	/**
	 * Shard resume handler
	 */
	public shardResume(id: number) {
		this.logger.info(`[Dyno] Shard ${id} resumed.`);
		this.ipc.send('shardResume', id.toString());
		this.postStat('resume');
	}

	/**
	 * Shard disconnect handler
	 */
	public shardDisconnect(err: Error, id: number) {
		if (err) {
			const shard = this.client.shards.get(id);
			this.logger.warn(err, { type: 'dyno.shardDisconnect', cluster: this.cluster.clusterId, shard: id, trace: shard.discordServerTrace });
		}

		this.logger.info(`[Dyno] Shard ${id} disconnected`);

		const data = {
			id,
			error: null,
		};

		if (err && err.message) {
			data.error = err.message;
		}

		this.ipc.send('shardDisconnect', data);
		this.postStat('disconnect');
	}

	public postShardStatus(text: string, fields: any[]) {
		if (!this.config.shardWebhook) { return; }
		if (this.config.state === 2) { return; }

		const payload = {
			username: 'Shard Manager',
			avatar_url: `${this.config.site.host}/${this.config.avatar}`,
			embeds: [],
			tts: false,
		};

		const embed = {
			title: text,
			timestamp: new Date(),
			fields: [],
			footer: {
				text: this.config.stateName,
			},
		};

		if (fields) {
			embed.fields = fields;
		}

		payload.embeds.push(embed);

		this.postWebhook(this.config.shardWebhook, payload);
	}

	private async postStat(key: string) {
		const day = moment().format('YYYYMMDD');
		const hr = moment().format('YYYYMMDDHH');

		this.statsd.increment(`discord.shard.${key}`, 1);

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

		multi.execAsync().catch((err: string) => logger.error(err));
	}

	private postWebhook(webhook: string, payload: eris.WebhookPayload) {
		return new Promise((resolve: any, reject: any) => {
			superagent
				.post(webhook)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json')
				.send(payload)
				.then(resolve)
				.catch(reject);
			});
	}
}
