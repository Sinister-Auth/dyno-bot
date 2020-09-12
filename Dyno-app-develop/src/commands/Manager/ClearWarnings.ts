import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ClearWarnings extends Command {
	public aliases: string[] = ['clearwarn'];
	public group: string = 'Manager';
	public description: string = 'Clear warnings a user';
	public usage: string = 'clearwarn [user]';
	public permissions: string = 'serverAdmin';
	public cooldown: number = 5000;
	public expectedArgs: number = 1;
	public example: string[] = [
		'clearwarn NoobLance',
		'clearwarn all',
	];

	public async execute({ message, args, t }: CommandData) {
		let user;
		let userid;
		let warnings;

		if (isNaN(args[0]) && args[0] !== 'all') {
			user = this.resolveUser(message.channel.guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, t('general.no-user-for', { user: args.join(' ') }));
			}
			user = user.user || user;
		} else if (args[0] === 'all') {
			if (message.author.id !== message.guild.ownerID) {
				return this.error(message.channel, t('manager.clearwarn-owner-needed'));
			}

			try {
				await this.models.Warning.remove({ guild: message.channel.guild.id }).exec();
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, t('general.unknown-error'));
			}

			return this.success(message.channel, t('manager.clear-all-warnings'));
		} else {
			userid = args[0];
		}

		try {
			warnings = await this.models.Warning.find({ guild: message.channel.guild.id, 'user.id': userid || user.id }).lean().exec();
			if (!warnings) {
				return this.error(message.channel, t('no-warnings-for', { user: userid || user.mention }));
			}
			await this.models.Warning.remove({ guild: message.channel.guild.id, 'user.id': userid || user.id }).exec();
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, t('general.unknown-error'));
		}

		if (warnings) {
			return this.success(message.channel, t('manager.clear-warnings-for', {
				count: warnings.length,
				user: userid || this.utils.fullName(user),
			}));
		}
	}
}
