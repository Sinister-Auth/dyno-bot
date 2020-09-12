import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as superagent from 'superagent';

export default class Botlist extends Command {
	public aliases     : string[] = ['botlist'];
	public group       : string   = 'Misc';
	public description : string   = 'Gets the carbonitex bot list ordered by server counts';
	public usage       : string   = 'botlist [page]';
	public example     : string   = 'botlist [page]';
	public hideFromHelp: boolean  = true;
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message, args, t }: CommandData) {
		const page = args[0] || 1;
		let i = 0;

		let data;
		try {
			const res = await superagent.get(this.config.carbon.list);
			data = res.body;
		} catch (err) {
			return this.logger.error(err);
		}

		let list = [];
		if (this.dyno.botlist && (Date.now() - this.dyno.botlist.createdAt) < 300000) {
			list = this.dyno.botlist.data;
		} else {
			list = data.map((bot: any) => {
				bot.botid = parseInt(bot.botid, 10);
				bot.servercount = parseInt(bot.servercount, 10);
				return bot;
			})
			.filter((bot: any) => bot.botid > 1000)
			.sort((a: any, b: any) => (a.servercount < b.servercount) ? 1 : (a.servercount > b.servercount) ? -1 : 0)
			.map((bot: any) => {
				const name = bot.name.includes('spoo.py') ? 'spoo.py' : bot.name;
				return {
					name: `${++i}. ${name}`,
					value: t('misc.server-count', { count: bot.servercount }),
					inline: true,
				};
			});

			this.dyno.botlist = {
				createdAt: Date.now(),
				data: list,
			};
		}

		if (!list || !list.length) {
			return this.error(message.channel, t('general.no-results'));
		}

		const start = (page - 1) * 10;

		list = list.slice(start, start + 10);

		return this.sendMessage(message.channel, { embed: {
			color: parseInt((`00000${(Math.random() * (1 << 24) | 0).toString(16)}`).slice(-6), 16),
			description: `**${t('misc.bot-list-title', { page })}**)`,
			fields: list,
			footer: { text: t('misc.last-updates') },
			timestamp: (new Date(this.dyno.botlist.createdAt)).toISOString(),
		} });
	}
}
