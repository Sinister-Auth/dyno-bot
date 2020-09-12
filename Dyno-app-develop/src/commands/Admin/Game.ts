import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Game extends Command {
	public aliases         : string[] = ['game', 'status'];
	public group           : string   = 'Admin';
	public description     : string   = 'Set game status.';
	public usage           : string   = 'game [text]';
	public example         : string   = 'game dynobot.net';
	public permissions     : string   = 'admin';
	public extraPermissions: string[] = [this.config.owner || this.config.admin];
	public expectedArgs    : number   = 1;

	public execute({ args }: CommandData) {
		this.client.editStatus('online', { name: args.join(' ') });
		return Promise.resolve();
	}
}
