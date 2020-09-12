import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import { exec } from 'child_process';
import * as moment from 'moment';
import * as os from 'os';

require('moment-duration-format');

export default class Stats extends Command {
	public aliases     : string[] = ['stats'];
	public group       : string   = 'Info';
	public description : string   = 'Get bot stats.';
	public usage       : string   = 'stats';
	public example     : string   = 'stats';
	public hideFromHelp: boolean  = true;
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message, args }: CommandData) {
		const stateMap = {
			Lance: 0,
			Beta:  1,
			Lunar: 2,
			Carti: 3,
			API:   5,
			Arsen: 6,
		};

		const idMap = Object.keys(stateMap).reduce((obj: any, key: any) => {
			obj[stateMap[key]] = key;
			return obj;
		}, {});

		let state = args.length ? (isNaN(args[0]) ? stateMap[args[0]] : args[0]) : this.config.state;
		let stateName = args.length ? (isNaN(args[0]) ? args[0] : idMap[args[0]]) : this.config.stateName;

		if (!state || !stateName) {
			state = this.config.state;
			stateName = this.config.stateName;
		}

		const [shards, guildCounts, vc, ffmpegs]: any = await Promise.all([
			this.redis.hgetall(`dyno:stats:${state}`),
			this.redis.hgetall(`dyno:guilds:${this.config.client.id}`),
			this.redis.hgetall(`dyno:vc`), // eslint-disable-line
			this.getFFmpegs(),
		]).catch(() => false);

		const data: any = {};

		data.shards = [];
		for (const key in shards) {
			const shard = JSON.parse(shards[key]);
			data.shards.push(shard);
		}

		data.guilds = Object.values(guildCounts).reduce((a: number, b: string) => a += parseInt(b, 10), 0);
		// data.guilds = this.utils.sumKeys('guilds', data.shards);
		data.users = this.utils.sumKeys('users', data.shards);
		// data.voiceConnections = this.utils.sumKeys('voice', data.shards);
		data.voice = this.utils.sumKeys('voice', data.shards);
		data.playing = this.utils.sumKeys('playing', data.shards);
		data.allConnections = [...Object.values(vc)].reduce((a: number, b: string) => a + parseInt(b, 10), 0);

		const streams = this.config.isCore ? data.allConnections : `${data.playing}/${data.voice}`;
		const uptime: any = moment.duration(process.uptime(), 'seconds');
		// tslint:disable-next-line:max-line-length
		const footer = `${stateName} | Cluster ${this.dyno.options.clusterId || this.dyno.options.shardId} | Shard ${message.channel.guild.shard.id}`;

		const embed = {
			author: {
				name: 'Dyno',
				icon_url: `${this.config.site.host}/${this.config.avatar}`,
			},
			fields: [
				{ name: 'Guilds', value: data.guilds.toString(), inline: true },
				{ name: 'Users', value: data.users.toString(), inline: true },
				{ name: 'Streams', value: streams.toString(), inline: true },
				{ name: 'FFMPEGs', value: ffmpegs.toString(), inline: true },
				{ name: 'Load Avg', value: os.loadavg().map((n: number) => n.toFixed(3)).join(', '), inline: true },
				{ name: 'Free Mem', value: `${this.utils.formatBytes(os.freemem())} / ${this.utils.formatBytes(os.totalmem())}`, inline: true },
				{ name: 'Uptime', value: uptime.format('w [weeks] d [days], h [hrs], m [min], s [sec]'), inline: true },
			],
			footer: {
				text: footer,
			},
			timestamp: (new Date()).toISOString(),
		};

		embed.fields = embed.fields.filter((f: any) => f.value !== '0');

		return this.sendMessage(message.channel, { embed });
	}

	private getFFmpegs() {
		return new Promise((resolve: any) => {
			exec(`pgrep ffmpeg | wc -l | tr -d ' '`, (err: any, stdout: any, stderr: any) => {
				if (err || stderr) {
					return resolve(0);
				}

				return resolve(stdout);
			});
		});
	}
}
