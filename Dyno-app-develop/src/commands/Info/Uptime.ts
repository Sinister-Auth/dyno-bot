import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment';

require('moment-duration-format');

export default class Uptime extends Command {
	public aliases: string[] = ['uptime', 'up'];
	public group: string = 'Info';
	public description: string = 'Get bot uptime';
	public usage: string = 'uptime';
	public example: string = 'uptime';
	public cooldown: number = 3000;
	public expectedArgs: number = 0;

	public execute({ message, t }: CommandData) {
		const uptime: any = moment.duration(process.uptime(), 'seconds');
		const started = moment().subtract(process.uptime(), 'seconds').format('llll');

		const embed = {
			color: this.utils.getColor('blue'),
			title: t('uptime'),
			description: uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]'),
			footer: {
				// tslint:disable-next-line:max-line-length
				text: `${this.config.stateName} | Cluster ${this.dyno.options.clusterId || this.dyno.options.shardId} | Shard ${message.channel.guild.shard.id} | Last started on ${started}`,
			},
		};

		return this.sendMessage(message.channel, { embed });
	}
}
