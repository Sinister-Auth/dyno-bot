import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Rolename extends Command {
	public aliases: string[] = ['rolename'];
	public group: string = 'Manager';
	public description: string = 'Change the name of a role.';
	public defaultUsage: string = 'rolename [role name], [new name]';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 2;
	public cooldown: number = 6000;
	public requiredPermissions: string[] = ['manageRoles'];
	public usage: string[] = [
		'rolename [role name], [new name]',
	];
	public example: string[] = [
		'rolename Members, Regulars',
		'rolename The Hammer, Moderators',
	];

	public async execute({ message, args, t }: CommandData) {
		const [roleName, newName] = args.join(' ').replace(', ', ',').split(',');

		if (!roleName || !newName) {
			return this.error(message.channel, t('manager.role-comma-error'));
		}

		const role = this.resolveRole(message.channel.guild, roleName);

		if (!role) {
			return this.error(message.channel, t('general.no-role-found-for', { role: roleName }));
		}

		return role.edit({ name: newName })
			.then(() => this.success(message.channel, t('manager.role-name-change', { roleName, newName })))
			.catch(() => this.error(message.channel, t('manager.role-edit-error')));
	}
}
