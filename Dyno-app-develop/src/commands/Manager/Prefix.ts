import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Prefix extends Command {
	public aliases: string[] = ['prefix'];
	public group: string = 'Manager';
	public description: string = 'Set prefix for server';
	public usage: string = 'prefix [prefix]';
	public example: string = 'prefix !';
	public permissions: string = 'serverAdmin';
	public overseerEnabled: boolean = true;
	public expectedArgs: number = 0;

	public async execute({ message, args, guildConfig, t }: CommandData) {
		if (!args.length) {
			return this.sendMessage(message.channel, t('manager.get-prefix', { prefix: guildConfig.prefix }));
		}

		guildConfig.prefix = args[0];

		try {
			await this.dyno.guilds.update(guildConfig._id, { $set: { prefix: args[0] } });
			return this.success(message.channel, t('manager.prefix-changed', { prefix: args[0] }));
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, t('general.unknown-error'), err);
		}
	}
}
