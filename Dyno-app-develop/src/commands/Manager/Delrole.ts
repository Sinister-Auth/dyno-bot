import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Delrole extends Command {
	public aliases: string[] = ['delrole'];
	public group: string = 'Manager';
	public description: string = 'Delete a role';
	public usage: string = 'delrole [role name]';
	public example: string = 'delrole Noobs';
	public permissions: string = 'serverAdmin';
	public cooldown: number = 6000;
	public expectedArgs: number = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args, t }: CommandData) {
		const roleName = args.join(' ');
		const role = message.channel.guild.roles.find((r: eris.Role) => r.name === roleName);

		if (!role) {
			return this.error(message.channel, t('general.no-role-found-for', { role: roleName }));
		}

		try {
			await role.delete();
			return this.success(message.channel, t('manager.deleted-role', { role: roleName }));
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, t('manager.role-delete-error'));
		}
	}
}
