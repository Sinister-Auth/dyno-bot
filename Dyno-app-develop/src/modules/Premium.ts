import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

const { Permissions } = eris.Constants;

export default class Premium extends Module {
	public module     : string  = 'Premium';
	public description: string  = 'Premium helper module.';
	public core       : boolean = true;
	public list       : boolean = false;
	public enabled    : boolean = true;
	public hasPartial : boolean = false;

	public start() {}

	// tslint:disable-next-line:cyclomatic-complexity
	public async guildRoleCreate({ guild, role, guildConfig }: RoleCreateEvent) {
		if (this.config.isPremium || this.config.beta || this.config.test) { return; }
		if (role.name !== 'Dyno Premium' || role.managed !== true) { return; }
		if (!guildConfig.isPremium) { return; }

		await new Promise((res: any) => setTimeout(res, 2000));

		const premiumMember = guild.members.get('168274283414421504');
		if (!premiumMember) { return; }

		const clientMember = guild.members.get(this.dyno.user.id);
		if (!clientMember) { return; }

		const dynoRole = guild.roles.find((r: eris.Role) => r.name === 'Dyno' && r.managed === true);
		if (!dynoRole || !dynoRole.position) { return; }

		const textPerms = ['readMessages', 'sendMessages', 'embedLinks', 'externalEmojis'];
		const voicePerms = ['voiceConnect', 'voiceSpeak', 'voiceUseVAD'];
		const pos = dynoRole.position - 1;

		this.client.editRolePosition(guild.id, role.id, pos).catch((err: Error) => this.logger.error(err.message));

		for (const channel of guild.channels.values()) {
			const dynoPerms = channel.permissionsOf(clientMember.id);
			const premiumPerms = channel.permissionsOf(premiumMember.id);

			if (channel.type === 0) {
				if ((dynoPerms.has('readMessages') && !premiumPerms.has('readMessages')) ||
					(dynoPerms.has('sendMessages') && !premiumPerms.has('sendMessages'))) {
						const permInt = textPerms.reduce((a: number, b: string) => {
							a |= Permissions[b];
							return a;
						}, 0);
						channel.editPermission(role.id, permInt, 0, 'role').catch(() => false);
				}
			} else if (channel.type === 2) {
				if ((dynoPerms.has('voiceConnect') && !premiumPerms.has('voiceConnect')) ||
					(dynoPerms.has('voiceSpeak') && !premiumPerms.has('voiceSpeak'))) {
					const permInt = voicePerms.reduce((a: number, b: string) => {
						a |= Permissions[b];
						return a;
					}, 0);
					channel.editPermission(role.id, permInt, 0, 'role').catch(() => false);
				}
			}
		}

		this.dyno.guilds.update(guild.id, { $set: { premiumInstalled: true } });
	}
}
