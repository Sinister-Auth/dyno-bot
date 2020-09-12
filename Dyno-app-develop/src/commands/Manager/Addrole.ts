import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Addrole extends Command {
	public aliases: string[] = ['addrole'];
	public group: string = 'Manager';
	public description: string = 'Add a new role, with optional color and hoist.';
	public usage: string = 'addrole [name] [hex color] [hoist]';
	public example: string = 'addrole Test #FF0000 true';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 1;
	public requiredPermissions: string[] = ['manageRoles'];

	public async execute({ message, args, t }: CommandData) {
		const options: eris.RoleOptions = {};

		if (['true', 'yes'].includes(args[args.length - 1].toLowerCase())) {
			options.hoist = args.pop();
		}

		if (args.length > 1 && args[args.length - 1].match(/^#?([a-f\d]{3}){1,2}\b/i)) {
			options.color = this.utils.hexToInt(args.pop());
		}

		options.name = args.join(' ');

		if (!options.name) {
			return this.error(message.channel, t('manager.no-role-name'));
		}

		try {
			await this.createRole(message.channel.guild, options);
			return this.success(message.channel, t('manager.role-created', { role: options.name }));
		} catch (err) {
			return this.error(message.channel, t('manager.role-create-error'));
		}
	}
}
