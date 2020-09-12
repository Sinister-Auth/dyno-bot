import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Premium extends Command {
	public aliases: string[] = ['premium'];
	public group: string = 'Info';
	public description: string = 'Dyno premium information.';
	public usage: string = 'premium';
	public example: string = 'premium';
	public expectedArgs: number = 0;
	public cooldown: number = 60000;

	public execute({ message, t }: CommandData) {
		const prefix = '`▶`';
		const embed = {
			color: this.utils.getColor('premium'),
			author: {
				name: 'Dyno Premium',
				icon_url: 'https://cdn.discordapp.com/avatars/168274283414421504/c59afc8221e1304a54cdfb4bd8125b11.jpg',
			},
			description: t('premium.description'),
			fields: [
				{
					name: t('features'),
					value: t('premium.features', { prefix: prefix }),
				},
				{
					name: t('get-premium'),
					value: t('upgrade', { url: 'https://www.dynobot.net/upgrade' }),
				},
			],
		};

		return this.sendDM(message.author.id, { embed });
	}
}
