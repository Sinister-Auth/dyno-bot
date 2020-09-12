import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Discrim extends Command {
	public aliases: string[] = ['discrim'];
	public group: string = 'Misc';
	public description: string = 'Gets a list of users with a discriminator';
	public usage: string = 'discrim [discriminator]';
	public example: string = 'discrim 1234';
	public hideFromHelp: boolean = true;
	public cooldown: number = 10000;
	public expectedArgs: number = 0;

	public execute({ message, args, t }: CommandData) {
		const discrim = args.length ? args[0] : message.author.discriminator;
		let users = this.client.users.filter((u: eris.User) => u.discriminator === discrim)
			.map((u: eris.User) => this.utils.fullName(u));

		if (!users || !users.length) {
			return this.error(message.channel, t('general.no-results-for', { value: discrim }));
		}

		users = users.slice(0, 10);

		return this.sendMessage(message.channel, { embed: {
			color: parseInt((`00000${(Math.random() * (1 << 24) | 0).toString(16)}`).slice(-6), 16),
			description: users.join('\n'),
		} });
	}
}
