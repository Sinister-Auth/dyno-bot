import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Addmod extends Command {
	public aliases: string[] = ['addmod'];
	public group: string = 'Manager';
	public description: string = 'Add a bot moderator or group of moderators.';
	public usage: string = 'addmod [user or role]';
	public example: string = 'addmod [user or role]';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 1;

	public async execute({ message, args, guildConfig, t }: CommandData) {
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		let user;

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
			if (guildConfig.modRoles.includes(role.id)) {
				return this.error(message.channel, t('manager.already-mod-role'));
			}

			guildConfig.modRoles.push(role.id);

			try {
				await this.dyno.guilds.update(guildConfig._id, { $set: { modRoles: guildConfig.modRoles } });
				return this.success(message.channel, t('manager.addmod-role', { role: role.name }));
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, t('general.unknown-error'), err);
			}
		}

		if (guildConfig.mods.indexOf(user.id) > -1) {
			return this.error(message.channel, t('manager.already-mod-user'));
		}

		guildConfig.mods.push(user.id);

		try {
			await this.dyno.guilds.update(guildConfig._id, { $set: { mods: guildConfig.mods } });
			return this.success(message.channel, t('manager.addmod-user', { user: this.utils.fullName(user) }));
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, t('general.unknown-error'), err);
		}
	}
}
