import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Mentionable extends Command {
	public aliases: string[] = ['mentionable'];
	public group: string = 'Manager';
	public description: string = 'Toggle making a role mentionable on/off';
	public usage: string = 'mentionable [role name]';
	public example: string = 'mentionable Staff';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args, t }: CommandData) {
		let mentionable;
		let rolename;

		if (['true', 'false'].includes(args[args.length - 1])) {
			mentionable = args[args.length - 1] === 'true' ? true : false; // eslint-disable-line
			rolename = args.slice(0, args.length - 1).join(' ');
		}

		const role = this.resolveRole(message.channel.guild, rolename || args.join(' '));

		if (!role) {
			return this.error(message.channel, t('general.no-role-found'));
		}

		mentionable = mentionable || !(role.mentionable || false);

		return role.edit({ mentionable: mentionable })
			.then(() => this.success(message.channel, t('manager.role-mentionable', { role: role.name, mentionable })))
			.catch(() => this.error(message.channel, t('manager.role-edit-error')));
	}
}
