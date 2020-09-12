import { Command, CommandData } from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Listmods extends Command {
	public aliases     : string[] = ['listmods'];
	public group       : string   = 'Manager';
	public description : string   = 'List moderators';
	public usage	   : string   = 'listmods';
	public example	   : string   = 'listmods';
	public permissions : string   = 'serverAdmin';
	public cooldown    : number   = 5000;
	public expectedArgs: number   = 0;

	public async execute({ message, guildConfig }: CommandData) {
		const msgArray = [];

		if (!guildConfig) {
			return this.error(message.channel, 'No settings found for this server.');
		}

		const guild = (<eris.GuildChannel>message.channel).guild;

		const embed = {
			fields: [],
		};

		// const admins = guild.members.filter((m: eris.Member) => this.isServerAdmin(m, message.channel));

		// embed.fields.push({
		// 	name: 'Admins',
		// 	value: admins
		// 		.filter((m: eris.Member) => !m.bot)
		// 		.map((m: eris.Member) => m.mention)
		// 		.join('\n'),
		// });

		if (guildConfig.modRoles && guildConfig.modRoles.length) {
			embed.fields.push({
				name: 'Mod Roles',
				value: guildConfig.modRoles
					.filter((id: string) => guild.roles.has(id))
					.map((id: string) => guild.roles.get(id).mention)
					.join('\n'),
			});
		}

		if (guildConfig.mods && guildConfig.mods.length) {
			let mods: any = await this.getMembers(guild, guildConfig.mods);

			mods = guildConfig.mods.map((id: string) => {
				const member = mods.find((m: eris.Member) => m.id === id);
				return member ? member.mention : `${id} (Left server)`;
			}).join('\n');

			if (mods && mods.length) {
				embed.fields.push({
					name: 'Moderators',
					value: mods,
				});
			}
		}

		return this.sendMessage(message.channel, { embed });
	}

	private getMembers(guild: eris.Guild, query: string[]): Promise<eris.Member[]> {
		return new Promise((resolve: Function, reject: Function) => {
			let timeout: NodeJS.Timer;
			const shard = guild.shard;
			const opListener = (_guild: eris.Guild, members: eris.Member[]) => {
				if (_guild.id === guild.id) {
					if (timeout) {
						clearTimeout(timeout);
					}
					shard.client.removeListener('guildMemberChunk', opListener);
					return resolve(members);
				}
			};

			guild.shard.sendWS(8, {
				guild_id: guild.id,
				user_ids: query,
				limit: 50,
			});

			shard.client.on('guildMemberChunk', opListener);
			timeout = setTimeout(() => {
				shard.client.removeListener('guildMemberChunk', opListener);
				return Promise.reject(`Request timed out.`);
			}, 6000);
		});
	}
}
