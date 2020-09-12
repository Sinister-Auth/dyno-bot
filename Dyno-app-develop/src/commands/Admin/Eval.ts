import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

const os = require('os');
const util = require('util');
const moment = require('moment-timezone');

export default class Eval extends Command {
	public aliases     : string[] = ['eval', 'e'];
	public group       : string   = 'Admin';
	public description : string   = 'Evaluate js code from discord';
	public usage       : string   = 'eval [javascript]';
	public example     : string   = 'eval true';
	public hideFromHelp: boolean  = true;
	public permissions : string   = 'admin';
	public cooldown    : number   = 1000;
	public expectedArgs: number   = 1;

	public async execute({ message, args, guildConfig }: CommandData) {
		let msgArray = [];
		const msg = message;
		const dyno = this.dyno;
		const client = this.client;
		const config = this.config;
		let result;

		try {
			// tslint:disable-next-line:no-eval
			result = eval(args.join(' '));
		} catch (e) {
			result = e;
		}

		if (result.then) {
			try {
				result = await result;
			} catch (err) {
				result = err;
			}
		}

		msgArray = msgArray.concat(this.utils.splitMessage(result, 1990));

		for (const m of msgArray) {
			this.sendCode(message.channel, m.toString().replace(process.env.CLIENT_TOKEN, 'potato'), 'js');
		}

		return Promise.resolve();
	}
}
