import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import {exec} from 'child_process';

export default class Speedtest extends Command {
	public aliases         : string[] = ['speedtest', 'speed'];
	public group           : string   = 'Admin';
	public description     : string   = 'Get the result of a speed test.';
	public usage           : string   = 'speedtest';
	public example         : string   = 'speedtest';
	public permissions     : string   = 'admin';
	public extraPermissions: string[] = [this.config.owner || this.config.admin];
	public overseerEnabled : boolean  = true;
	public cooldown        : number   = 10000;
	public expectedArgs    : number   = 0;

	public execute({ message }: CommandData) {
		return this.sendMessage(message.channel, '```Running speed test...```').then((m: eris.Message) => {
			exec('/usr/bin/speedtest --simple --share', (err: any, stdout: any) => {
				if (err) {
					return m.edit('An error occurred.');
				}
				// tslint:disable-next-line:prefer-template
				return m.edit('```\n' + stdout + '\n```');
			});
		}).catch((err: string) => {
			if (this.config.self) {
				return this.logger.error(err);
			}
			return this.error(message.channel, 'Unable to get speedtest.');
		});
	}
}
