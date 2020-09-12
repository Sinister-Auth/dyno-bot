import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ServerInfo extends Command {
	public aliases: string[] = ['serverinfo'];
	public group: string = 'Misc';
	public description: string = 'Get server info/stats.';
	public usage: string = 'serverinfo';
	public example: string = 'serverinfo';
	public cooldown: number = 10000;
	public expectedArgs: number = 0;

	public async execute({ message, args, t }: CommandData) {
		const guild = (this.isAdmin(message.author) && args && args.length) ?
			this.client.guilds.get(args[0]) : message.channel.guild;

		const owner = this.client.users.get(guild.ownerID);

		const categories = guild.channels.filter((c: eris.GuildChannel) => c.type === 4).length;
		const textChannels = guild.channels.filter((c: eris.GuildChannel) => c.type === 0).length;
		const voiceChannels = guild.channels.filter((c: eris.GuildChannel) => c.type === 2).length;

		const embed = {
			author: {
				name: guild.name,
				icon_url: guild.iconURL,
			},
			thumbnail: {
				url: `https://discordapp.com/api/guilds/${guild.id}/icons/${guild.icon}.jpg`,
			},
			fields: [
				{ name: t('misc.owner'), value: this.utils.fullName(owner), inline: true },
				{ name: t('misc.region'), value: guild.region, inline: true },
				{ name: t('misc.categories'), value: categories ? categories.toString() : '0', inline: true },
				{ name: t('misc.text-channels'), value: textChannels ? textChannels.toString() : '0', inline: true },
				{ name: t('misc.voice-channels'), value: voiceChannels ? voiceChannels.toString() : '0', inline: true },
				{ name: t('misc.members'), value: guild.memberCount.toString(), inline: true },
				{ name: t('misc.humans'), value: guild.members.filter((m: eris.Member) => !m.bot).length.toString(), inline: true },
				{ name: t('misc.bots'), value: guild.members.filter((m: eris.Member) => m.bot).length.toString(), inline: true },
				{ name: t('misc.online'), value: guild.members.filter((m: eris.Member) => m.status !== 'offline').length.toString(), inline: true },
				{ name: t('misc.roles'), value: guild.roles.size.toString(), inline: true },
			],
			footer: {
				text: `ID: ${guild.id} | ${t('misc.server-created')}`,
			},
			timestamp: (new Date(guild.createdAt)).toISOString(),
		};

		if (guild.roles.size < 25) {
			embed.fields.push({ name: t('misc.role-list'), value: guild.roles.map((r: eris.Role) => r.name).join(', '), inline: false });
		}

		return this.sendMessage(message.channel, { embed });
	}
}
