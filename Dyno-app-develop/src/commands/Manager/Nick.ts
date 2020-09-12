import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Nick extends Command {
	public aliases: string[] = ['nick'];
	public group: string = 'Manager';
	public description: string = 'Change the bot nickname.';
	public usage: string = 'nickname [new nickname]';
	public example: string = 'nickname Dyno Premium';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 1;
	public requiredPermissions: string[] = ['changeNickname'];

	public async execute({ message, args, t }: CommandData) {
		const nick = (args.length) ? args.join(' ') : null;

		try {
			await this.client.editNickname(message.channel.guild.id, nick);
		} catch (err) {
			return this.error(message.channel, t('manager.nick-change-error'), err);
		}

		return this.success(message.channel, t('manager.nick-changed'));
	}
}
