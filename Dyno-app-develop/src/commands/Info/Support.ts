import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Support extends Command {
	public aliases     : string[] = ['support'];
	public group       : string   = 'Info';
	public description : string   = 'Dyno support information.';
	public usage       : string   = 'support';
	public example     : string   = 'support';
	public expectedArgs: number   = 0;
	public cooldown    : number   = 60000;

	public execute({ message, args, t }: CommandData) {
		return this.sendDM(message.author.id, t('support-server', { url: 'https://discord.gg/xAwbw8K' }));
	}
}
