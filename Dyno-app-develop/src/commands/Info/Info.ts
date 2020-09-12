import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Info extends Command {
	public aliases: string[] = ['info'];
	public group: string = 'Info';
	public description: string = 'Get bot info.';
	public usage: string = 'info';
	public example: string = 'info';
	public cooldown: number = 60000;
	public expectedArgs: number = 0;
	public noDisable: boolean    = true;

	public async execute({ message, t }: CommandData) {
		const embed = {
			color: this.utils.hexToInt('#3395d6'),
			author: {
				name: 'Dyno',
				url: 'https://www.dynobot.net',
				icon_url: `${this.config.site.host}/${this.config.avatar}?r=${this.config.version}`,
			},
			fields: [],
		};

		embed.fields.push({ name: t('general.version'), value: this.config.pkg.version, inline: true });
		embed.fields.push({ name: t('general.library'), value: this.config.lib, inline: true });
		embed.fields.push({ name: t('general.creator'), value: this.config.author, inline: true });

		try {
			const res = await this.redis.hgetallAsync(`dyno:stats:${this.config.state}`);

			const shards = [];
			for (const key in res) {
				const shard = JSON.parse(res[key]);
				shards.push(shard);
			}

			const guildCount = this.utils.sumKeys('guilds', shards);
			const userCount = this.utils.sumKeys('users', shards);

			embed.fields.push({ name: t('general.servers'), value: guildCount.toString(), inline: true });
			embed.fields.push({ name: t('general.users'), value: userCount.toString(), inline: true });
		} catch (err) {
			this.logger.error(err);
		}

		embed.fields.push({ name: t('general.website'), value: '[dynobot.net](https://www.dynobot.net)', inline: true });
		embed.fields.push({ name: t('general.invite'), value: '[dynobot.net/invite](https://www.dynobot.net/invite)', inline: true });
		embed.fields.push({ name: t('general.discord'), value: '[dynobot.net/discord](https://www.dynobot.net/discord)', inline: true });
		embed.fields.push({ name: t('general.donate'), value: '[dynobot.net/donate](https://www.dynobot.net/donate)', inline: true });

		const len = Math.max(...this.config.contributors.map((r: any) => r.name.length));

		const contributors = this.config.contributors.map((c: any) => `\`${this.utils.pad(c.name, len)}\` - ${c.desc}`);
		const mentions = this.config.mentions.map((c: any) => `\`${c.name}\` - ${c.desc}`);

		embed.fields.push({ name: t('general.contributors'), value: contributors.join('\n'), inline: false });
		// embed.fields.push({ name: 'Honorable Mentions', value: mentions.join('\n'), inline: false });

		return this.sendMessage(message.channel, { embed });
	}
}
