import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Username extends Command {
	public aliases         : string[] = ['username', 'un'];
	public group           : string   = 'Admin';
	public description     : string   = 'Change the bot username.';
	public usage           : string   = 'username [new username]';
	public example         : string   = 'username Dyno';
	public permissions     : string   = 'admin';
	public extraPermissions: string[] = [this.config.owner || this.config.admin];
	public cooldown        : number   = 60000;
	public expectedArgs    : number   = 1;

	public execute({ message, args }: CommandData) {
		return this.client.editSelf({ username: args.join(' ') })
			.then(() => this.success(message.channel, `Username changed to ${args.join(' ')}`))
			.catch(() => this.error(message.channel, 'Unable to change username.'));
	}
}
