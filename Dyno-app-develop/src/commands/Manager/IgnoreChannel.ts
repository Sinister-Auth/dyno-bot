import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class IgnoreChannel extends Command {
	public aliases: string[] = ['ignorechannel'];
	public group: string = 'Manager';
	public description: string = 'Toggles command usage for a channel. (Does not affect mods and managers)';
	public usage: string = 'ignorechannel [channel]';
	public example: string = 'ignorechannel #general';
	public permissions: string = 'serverAdmin';
	public overseerEnabled: boolean = true;
	public expectedArgs: number = 1;

	public execute({ message, args, guildConfig, t }: CommandData) {
		const channel = this.resolveChannel(message.guild, args[0]);
		if (!channel) {
			return this.error(message.channel, `Please provide a valid channel.`);
		}

		guildConfig.ignoredChannels = guildConfig.ignoredChannels || [];
		const index = guildConfig.ignoredChannels.indexOf(channel.id);
		if (index > -1) {
			guildConfig.ignoredChannels.splice(index, 1);
		} else {
			guildConfig.ignoredChannels.push(channel.id);
		}

		return this.dyno.guilds.update(message.guild.id, { $set: { ignoredChannels: guildConfig.ignoredChannels } })
			.then(() => this.success(message.channel, index > -1 ?
				t('manager.ignore-channel-remove', { channel: channel.mention }) :
				t('manager.ignore-channel-add', { channel: channel.mention })))
			.catch(() => this.error(message.channel, t('general.unknown-error')));
	}
}
