import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as superagent from 'superagent';

/**
 * Carbon Module
 * @class Carbon
 * @extends Module
 */
export default class Carbon extends Module {
	public module: string = 'Carbon';
	public description: string = 'Carbonitex reporting module.';
	public enabled: boolean = true;
	public core: boolean = true;
	public list: boolean = false;

	public start() {
		this.schedule('*/1 * * * *', this.updateCarbon.bind(this));
	}

	public async updateCarbon() {
		if (!this.dyno.isReady) { return; }
		if (this.config.state !== 3 || this.dyno.options.clusterId !== 0) {
			return;
		}

		this.info('Updating carbon stats.');

		let guildCounts;
		try {
			guildCounts = await this.redis.hgetallAsync(`dyno:guilds:${this.config.client.id}`);
		} catch (err) {
			return this.logger.error(err);
		}

		const guildCount = Object.values(guildCounts).reduce((a: number, b: string) => a += parseInt(b, 10), 0);

		this.statsd.gauge(`guilds.${this.config.client.id}`, guildCount);

		const data = {
			shard_id: 0,
			shard_count: 1,
			server_count: guildCount,
		};

		// Post to carbonitex
		superagent
			.post(this.config.carbon.url)
			.send(Object.assign({ key: this.config.carbon.key }, Object.assign(data, {
				logoid: `https://www.dynobot.net/images/dyno-v2-300.jpg`,
			})))
			.set('Accept', 'application/json')
			.end((err: string) => err ? this.logger.error(err) : false);

		// Post to bots.discord.pw
		superagent
			.post(this.config.dbots.url)
			.send(data)
			.set('Authorization', this.config.dbots.key)
			.set('Accept', 'application/json')
			.end(() => false); // ignore timeouts
	}
}
