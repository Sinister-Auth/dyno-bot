import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Roles extends Command {
	public aliases: string[] = ['roles'];
	public group: string = 'Roles';
	public description: string = 'Get a list of server roles and member counts.';
	public usage: string = 'roles';
	public example: string = 'roles';
	public permissions: string = 'serverMod';
	public expectedArgs: number = 0;
	public cooldown: number = 30000;

	public async execute({ message, t }: CommandData) {
		try {
			const roles = await this.getRoles(message.channel.guild, t);
			const msgArray = this.utils.splitMessage(roles, 1950);

			for (const m of msgArray) {
				this.sendCode(message.channel, m);
			}

			return Promise.resolve();
		} catch (err) {
			return this.error(message.channel, t('general.unknown-error'), err);
		}
	}

	private getRoles(guild: eris.Guild, t: Function) {
		if (!guild.roles || !guild.roles.size) {
			return Promise.resolve(t('role.no-roles'));
		}

		const msgArray = [];
		const len = Math.max(...guild.roles.map((r: eris.Role) => r.name.length));

		const roles = this.utils.sortRoles(guild.roles);

		for (const role of roles) {
			if (role.name === '@everyone') {
				continue;
			}
			const members = guild.members.filter((m: eris.Member) => m.roles.includes(role.id));
			role.memberCount = members && members.length ? members.length : 0;
			msgArray.push(`${this.utils.pad(role.name, len)} ${role.memberCount} members`);
		}

		return Promise.resolve(msgArray.join('\n'));
	}
}
