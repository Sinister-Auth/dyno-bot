import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Rolecolor extends Command {
	public aliases: string[] = ['rolecolor', 'rolecolour'];
	public group: string = 'Manager';
	public description: string = 'Change the color of a role.';
	public usage: string = 'rolecolor [role name] [hex color]';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 2;
	public cooldown: number = 6000;
	public requiredPermissions: string[] = ['manageRoles'];
	public example: string[] = [
		'rolecolor Regulars #000000',
		'rolecolor Regulars random',
	];

	public async execute({ message, args, t }: CommandData) {
		let hexColor = args.pop();

		if (hexColor === 'random') {
			hexColor = (`00000${(Math.random() * (1 << 24) | 0).toString(16)}`).slice(-6);
		}

		const color = this.utils.hexToInt(hexColor);
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		if (!role) {
			return this.error(message.channel, t('general.no-role-found'));
		}

		return role.edit({ color: color })
			.then(() => this.sendMessage(message.channel, {
				embed: { color: color, description: t('manager.role-color-change', { role: role.name, color: hexColor }) },
			}))
			.catch(() => this.error(message.channel, t('manager.role-edit-error')));
	}
}
