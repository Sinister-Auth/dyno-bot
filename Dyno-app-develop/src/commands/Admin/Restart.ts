import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Restart extends Command {
	public aliases        : string[] = ['restart'];
	public group          : string   = 'Admin';
	public description    : string   = 'Restart shards.';
	public usage          : string   = 'restart';
	public example        : string   = 'restart';
	public permissions    : string   = 'admin';
	public overseerEnabled: boolean  = true;
	public expectedArgs   : number   = 0;
	public cooldown       : number   = 60000;

	public execute({ message, args }: CommandData) {
		if (!this.isAdmin(message.author) || message.author.id !== '77205340050956288') {
			return Promise.reject(null);
		}

		if (args.length) {
			this.dyno.ipc.send('restart', args[0]);
			return Promise.resolve();
		}

		if (!this.isAdmin(message.author)) {
			return Promise.reject(null);
		}

		this.dyno.ipc.send('restart');
		return Promise.resolve();
	}
}
