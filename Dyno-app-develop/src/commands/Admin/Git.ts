import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import { exec } from 'child_process';

export default class Git extends Command {
	public aliases     : string[] = ['git'];
	public group       : string   = 'Admin';
	public description : string   = 'Execute a git command';
	public usage       : string   = 'git [stuff]';
	public example     : string   = 'git status';
	public hideFromHelp: boolean  = true;
	public permissions : string   = 'admin';
	public cooldown    : number   = 3000;
	public expectedArgs: number   = 1;

	public async execute({ message, args }: CommandData) {
		let msgArray = [];
		let result;

		try {
			result = await this.exec(`git ${args.join(' ')}`);
		} catch (err) {
			result = err;
		}

		msgArray = msgArray.concat(this.utils.splitMessage(result, 1990));

		for (const m of msgArray) {
			this.sendCode(message.channel, m, 'js');
		}

		return Promise.resolve();
	}

	private exec(command: string) {
		return new Promise((resolve: any, reject: any) => {
			exec(command, (err: any, stdout: any, stderr: any) => {
				if (err) {
					return reject(err);
				}
				return resolve(stdout || stderr);
			});
		});
	}
}
