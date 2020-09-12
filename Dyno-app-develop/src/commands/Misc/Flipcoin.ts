import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Flipcoin extends Command {
	public aliases: string[] = ['flipcoin'];
	public group: string = 'Misc';
	public description: string = 'Flip a coin.';
	public usage: string = 'flipcoin';
	public example: string = 'flipcoin';
	public cooldown: number = 3000;
	public expectedArgs: number = 0;

	public execute({ message }: CommandData) {
		const result = (Math.floor(Math.random() * 2) === 0) ? 'heads' : 'tails';
		return this.sendMessage(message.channel, `${message.author.mention} ${result}`);
	}
}
