import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import { exec } from 'child_process';

export default class Update extends Command {
	public aliases     : string[] = ['update'];
	public group       : string   = 'Admin';
	public description : string   = 'Update the bot';
	public usage       : string   = 'update [branch]';
	public example     : string   = 'update develop';
	public hideFromHelp: boolean  = true;
	public permissions : string   = 'admin';
	public cooldown    : number   = 30000;
	public expectedArgs: number   = 0;

	public async execute({ message, args }: CommandData) {
		let msgArray = [];
		let result;

		const branch = args && args.length ? args[0] : 'develop';
		this.sendMessage(message.channel, `Pulling the latest from ${branch}...`);

		try {
			result = await this.exec(`git pull origin ${branch}; gulp build`);
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
