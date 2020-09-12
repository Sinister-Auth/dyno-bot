import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Listmods extends Command {
	public aliases: string[] = ['listmods'];
	public group: string = 'Manager';
	public description: string = 'List moderators';
	public usage: string = 'listmods';
	public example: string = 'listmods';
	public permissions: string = 'serverAdmin';
	public cooldown: number = 10000;
	public expectedArgs: number = 0;

	public execute({ message, guildConfig }: CommandData) {
		const msgArray = [];

		if (!guildConfig) {
			return this.error(message.channel, 'No settings found for this server.');
		}

		if ((!guildConfig.mods || !guildConfig.mods.length) &&
			(!guildConfig.modRoles || !guildConfig.modRoles.length)) {
			return this.sendMessage(message.channel, 'There are no moderators for this server. Use the `addmod` command to add.');
		}

		// const moderators = []; // future use

		msgArray.push('```ini');
		msgArray.push('[ Moderators ]');

		if (!guildConfig.mods || !guildConfig.mods.length) {
			msgArray.push('None');
		} else {
			for (const mod of guildConfig.mods) {
				const member = message.channel.guild.members.get(mod);
				if (!member) { continue; }
				msgArray.push(this.utils.fullName(member));
			}
		}

		msgArray.push('[ Mod Roles ]');

		if (!guildConfig.modRoles || !guildConfig.modRoles.length) {
			msgArray.push('None');
		} else {
			for (const roleid of guildConfig.modRoles) {
				const role = message.channel.guild.roles.get(roleid);
				if (!role) { continue; }
				msgArray.push(role.name);
			}
		}

		msgArray.push('```');

		return this.sendMessage(message.channel, msgArray.join('\n'));
	}
}
