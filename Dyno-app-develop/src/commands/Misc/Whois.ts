import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment';

export default class Whois extends Command {
	public aliases: string[] = ['whois', 'userinfo'];
	public group: string = 'Misc';
	public description: string = 'Get user information.';
	public usage: string = 'whois [user mention]';
	public example: string = 'whois @NoobLance';
	public cooldown: number = 3000;
	public expectedArgs: number = 0;

	public execute({ message, args, t }: CommandData) {
		const member = args.length ? this.resolveUser(message.channel.guild, args.join(' ')) : message.member;

		if (!member) {
			return this.error(message.channel, t('general.no-user-found-for', { user: args.join(' ') }));
		}

		const perms = {
			administrator: t('permissions.administrator'),
			manageGuild: t('permissions.manageGuild'),
			manageRoles: t('permissions.manageRoles'),
			manageChannels: t('permissions.manageChannels'),
			manageMessages: t('permissions.manageMessages'),
			manageWebhooks: t('permissions.manageWebhooks'),
			manageNicknames: t('permissions.manageNicknames'),
			manageEmojis: t('permissions.manageEmojis'),
			kickMembers: t('permissions.kickMembers'),
			banMembers: t('permissions.banMembers'),
			mentionEveryone: t('permissions.mentionEveryone'),
		};

		const roles = member.roles && member.roles.length ?
			this.utils.sortRoles(member.roles.map((r: eris.Role) => {
				r = message.channel.guild.roles.get(r);
				return `<@&${r.id}>`;
			})).join('  ') : 'None';

		const joinPos = [...message.guild.members.values()]
			.sort((a: eris.Member, b: eris.Member) => (a.joinedAt < b.joinedAt) ? -1 : ((a.joinedAt > b.joinedAt) ? 1 : 0))
			.filter((m: eris.Member) => !m.bot)
			.findIndex((m: eris.Member) => m.id === member.id) + 1;

		const embed = {
			author: {
				name: this.utils.fullName(member),
				icon_url: member.user.avatarURL,
			},
			thumbnail: {
				url: member.user.avatarURL,
			},
			description: `\n<@!${member.id}>`,
			fields: [
				{ name: t('user.status'), value: member.status, inline: true },
				{ name: t('user.joined'), value: moment.unix(member.joinedAt / 1000).format('llll'), inline: true },
				{ name: t('user.join-position'), value: joinPos || 'None', inline: true },
				{ name: t('user.registered'), value: moment.unix(member.user.createdAt / 1000).format('llll'), inline: true },
				{ name: t('misc.roles'), value: roles, inline: false },
			],
			footer: { text: `ID: ${member.id}` },
			timestamp: (new Date()).toISOString(),
		};

		if (member.permission) {
			const memberPerms = member.permission.json;
			const infoPerms = [];
			for (const key in memberPerms) {
				if (!perms[key] || memberPerms[key] !== true) { continue; }
				if (memberPerms[key]) {
					infoPerms.push(perms[key]);
				}
			}

			if (infoPerms.length) {
				embed.fields.push({ name: t('user.key-permissions'), value: infoPerms.join(', '), inline: false });
			}
		}

		const extra = [];

		const contrib = this.config.contributors.find((c: any) => c.id === member.id && c.title);

		if (member.id === this.client.user.id) {
			extra.push('The one and only...');
		}
		if (this.isAdmin(member)) {
			extra.push(t('general.creator'));
		}

		if (contrib) {
			extra.push(contrib.title);
		}

		if (this.isServerAdmin(member, message.channel)) {
			extra.push(t('permissions.serverAdmin'));
		} else if (this.isServerMod(member, message.channel)) {
			extra.push(t('permissions.serverMod'));
		}

		if (extra.length) {
			embed.fields.push({ name: t('misc.acknowledgements'), value: extra.join(', '), inline: false });
		}

		return this.sendMessage(message.channel, { embed }).catch((err: any) => this.logger.error(err));
	}
}
