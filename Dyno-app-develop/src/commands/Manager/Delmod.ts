import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Delmod extends Command {
	public aliases: string[] = ['delmod'];
	public group: string = 'Manager';
	public description: string = 'Remove a bot moderator';
	public usage: string = 'delmod [user or role]';
	public example: string = 'delmod @Mods';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 1;

	public async execute({ message, args, guildConfig, t }: CommandData) {
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		let user;
		let index;

		if (!role) {
			user = this.resolveUser(message.channel.guild, args.join(' '));
			if (!user) {
				return this.error(message.channel, t('general.no-user-role', { value: args[0] }));
			}
			user = user.user || user;
		}

		guildConfig.mods = guildConfig.mods || [];
		guildConfig.modRoles = guildConfig.modRoles || [];

		if (role) {
			index = guildConfig.modRoles.indexOf(role.id);

			if (index === -1) {
				return this.error(message.channel, t('manager.no-mod-role'));
			}

			guildConfig.modRoles.splice(index, 1);

			try {
				await this.dyno.guilds.update(guildConfig._id, { $set: { modRoles: guildConfig.modRoles } });
				return this.success(message.channel, t('manager.delmod-role', { role: role.name }));
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, t('general.unknown-error'), err);
			}
		}

		index = guildConfig.mods.indexOf(user.id);

		if (index > -1) {
			return this.error(message.channel, t('manager.no-mod-user'));
		}

		guildConfig.mods.splice(index, 1);

		try {
			await this.dyno.guilds.update(guildConfig._id, { $set: { mods: guildConfig.mods } });
			return this.success(message.channel, t('manager.delmod-user', { user: this.utils.fullName(user) }));
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, t('general.unknown-error'), err);
		}
	}
}
