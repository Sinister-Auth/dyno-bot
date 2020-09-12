import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ServerInvite extends Command {
	public aliases: string[] = ['serverinvite'];
	public group: string = 'Misc';
	public description: string = 'Create an invite to this server.';
	public usage: string = 'serverinvite';
	public example: string = 'serverinvite';
	public expectedArgs: number = 0;
	public cooldown: number = 60000;

	public execute({ message, args, isAdmin, isOverseer, t }: CommandData) {
		if (args && args.length && (isAdmin || isOverseer)) {
			return this.client.createChannelInvite(args[0])
				.then((invite: eris.Invite) => this.sendMessage(message.channel, `https://discord.gg/${invite.code}`))
				.catch((err: any) => this.error(message.channel, err && err.message ? err.message : t('invite.create-error')));
		}

		return message.channel.guild.defaultChannel.createInvite()
			.then((invite: eris.Invite) => this.success(message.channel, `https://discord.gg/${invite.code}`))
			.catch(() => this.error(message.channel, t('invite.create-error')));
	}
}
