import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class RoleInfo extends Command {
	public aliases: string[] = ['roleinfo'];
	public group: string = 'Roles';
	public description: string = 'Get information about a role.';
	public usage: string = 'roleinfo';
	public example: string = 'roleinfo';
	public expectedArgs: number = 1;
	public cooldown: number = 6000;

	public execute({ message, args, t }: CommandData) {
		const guild = message.channel.guild;
		const role = this.resolveRole(message.channel.guild, args.join(' '));

		if (!role) {
			return this.error(message.channel, t('general.no-role-found'));
		}

		if (!guild.roles || !guild.roles.size) {
			return this.error(message.channel, t('general.no-roles'));
		}

		const members = guild.members.filter((m: eris.Member) => m.roles.includes(role.id));

		const color = role.color ? role.color.toString(16) : null;

		const embed: eris.EmbedBase = {
			fields: [
				{ name: t('general.id'), value: role.id, inline: true },
				{ name: t('general.name'), value: role.name, inline: true },
				{ name: t('general.color'), value: color ? `#${color}` : 'None', inline: true },
				{ name: t('general.mention'), value: `\`<@&${role.id}>\``, inline: true },
				{ name: t('general.members'), value: members.length.toString(), inline: true },
				{ name: t('general.hoisted'), value: role.hoist ? 'Yes' : 'No', inline: true },
				{ name: t('general.position'), value: role.position.toString(), inline: true },
				{ name: t('general.mentionable'), value: role.mentionable ? 'Yes' : 'No', inline: true },
			],
			footer: {
				text: t('role.created'),
			},
			timestamp: (new Date(role.createdAt)).toISOString(),
		};

		if (color) {
			embed.color = role.color;
			embed.thumbnail = { url: `https://dummyimage.com/80x80/${color}/${color}.jpg` };
		}

		return this.sendMessage(message.channel, { embed });
	}
}
