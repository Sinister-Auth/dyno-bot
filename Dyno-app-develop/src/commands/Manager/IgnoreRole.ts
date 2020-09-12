import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class IgnoreRole extends Command {
	public aliases: string[] = ['ignorerole'];
	public group: string = 'Manager';
	public description: string = 'Toggles command usage for a role. (Does not affect mods and managers)';
	public usage: string = 'ignorerole [role]';
	public example: string = 'ignorerole Lost Privileges';
	public permissions: string = 'serverAdmin';
	public overseerEnabled: boolean = true;
	public expectedArgs: number = 1;

	public execute({ message, args, guildConfig, t }: CommandData) {
		const role = this.resolveRole(message.guild, args.join(' '));
		if (!role) {
			return this.error(message.channel, t('general.no-role-found'));
		}

		guildConfig.ignoredRoles = guildConfig.ignoredRoles || [];
		const index = guildConfig.ignoredRoles.indexOf(role.id);
		if (index > -1) {
			guildConfig.ignoredRoles.splice(index, 1);
		} else {
			guildConfig.ignoredRoles.push(role.id);
		}

		return this.dyno.guilds.update(message.guild.id, { $set: { ignoredRoles: guildConfig.ignoredRoles } })
			.then(() => this.success(message.channel, index > -1 ?
				t('ignore-role-remove', { role: role.name }) :
				t('ignore-role-add', { role: role.name })))
			.catch(() => this.error(message.channel, 'Something went wrong.'));
	}
}
