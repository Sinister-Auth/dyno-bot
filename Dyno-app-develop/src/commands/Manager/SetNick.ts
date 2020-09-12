import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class SetNick extends Command {
	public aliases: string[] = ['setnick'];
	public group: string = 'Manager';
	public description: string = 'Change the nickname of a user.';
	public usage: string = 'setnick [user] [new nickname]';
	public example: string = 'setnick NoobLance LewdLance';
	public permissions: string = 'serverAdmin';
	public cooldown: number = 5000;
	public expectedArgs: number = 2;
	public requiredPermissions: string[] = ['changeNickname'];

	public async execute({ message, args, t }: CommandData) {
		const member = this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, t('general.no-user-found'));
		}

		const nick = args.length > 1 ? args.slice(1).join(' ') : null;
		// member = message.channel.guild.members.get(this.client.user.id);

		try {
			await this.client.editGuildMember(message.channel.guild.id, member.id, { nick });
		} catch (err) {
			return this.error(message.channel, t('manager.nick-change-for-error', { user: this.utils.fullName(member) }), err);
		}

		return this.success(message.channel, t('manager.nick-changed'));
	}
}
