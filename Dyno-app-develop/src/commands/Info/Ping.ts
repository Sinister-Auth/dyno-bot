import {Command, CommandData} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Ping extends Command {
	public aliases     : string[] = ['ping'];
	public group       : string   = 'Info';
	public description : string   = 'Ping the bot';
	public usage       : string   = 'ping';
	public example     : string   = 'ping';
	public hideFromHelp: boolean  = true;
	public cooldown    : number   = 3000;
	public expectedArgs: number   = 0;

	public execute({ message, t }: CommandData) {
		const start = Date.now();

		return this.sendMessage(message.channel, `${t('ping.pong')}`)
			.then((msg: eris.Message) => {
				const diff = (Date.now() - start);
				return msg.edit(`${t('ping.pong')} \`${diff}ms\``);
			});
	}
}
