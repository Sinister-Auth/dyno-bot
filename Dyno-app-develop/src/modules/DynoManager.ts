import {Module} from '@dyno.gg/dyno-core';

/**
 * DynoManager module
 * @class DynoManager
 * @extends Module
 */
export default class DynoManager extends Module {
	public module: string = 'DynoManager';
	public description: string = 'Dyno manager.';
	public core: boolean = true;
	public list: boolean = false;
	public enabled: boolean = true;
	public hasPartial: boolean = false;

	public start() {}

	public guildCreate({ guild }: GuildEvent) {
		if (!this.config.isCore) { return; }
		const clients = this.globalConfig.clients;
		if (!clients || !clients.length) { return; }
		for (const client of clients) {
			if (client.userid === this.config.client.id) { continue; }
			if (guild.members.has(client.userid)) {
				this.client.leaveGuild(guild.id);
			}
		}
	}
}
