import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class MemberCount extends Command {
	public aliases: string[] = ['membercount'];
	public group: string = 'Misc';
	public description: string = 'Get the server member count.';
	public usage: string = 'membercount';
	public example: string = 'membercount';
	public cooldown: number = 10000;
	public expectedArgs: number = 0;

	public async execute({ message, args, t }: CommandData) {
		const guild = message.channel.guild;
		let pruneCount;
		let banCount;

		if (args.length && (args.includes('full') || args.includes('withprune')) && this.isServerMod(message.member, message.channel)) {
			try {
				pruneCount = await this.client.getPruneCount(guild.id, 30);
			} catch (err) {
				// pass
			}
		}

		if (args.length && (args.includes('full') || args.includes('withbans')) && this.isServerMod(message.member, message.channel)) {
			try {
				const bans = await this.client.getGuildBans(guild.id);
				banCount = bans.length;
			} catch (err) {
				// pass
			}
		}

		const fields = [
			{ name: t('misc.members'), value: guild.memberCount.toString(), inline: true },
			{ name: t('misc.online'), value: guild.members.filter((m: eris.Member) => m.status !== 'offline').length.toString(), inline: true },
			{ name: t('misc.humans'), value: guild.members.filter((m: eris.Member) => !m.bot).length.toString(), inline: true },
			{ name: t('misc.bots'), value: guild.members.filter((m: eris.Member) => m.bot).length.toString(), inline: true },
		];

		if (pruneCount) {
			fields.push({ name: t('general.prune-count'), value: pruneCount.toString(), inline: true });
		}

		if (banCount) {
			fields.push({ name: t('misc.bans'), value: banCount.toString(), inline: true });
		}

		const embed = {
			fields: fields,
			timestamp: (new Date()).toISOString(),
		};

		return this.sendMessage(message.channel, { embed });
	}
}
