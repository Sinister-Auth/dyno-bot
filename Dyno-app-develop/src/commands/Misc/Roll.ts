import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Roll extends Command {
	public aliases: string[] = ['roll'];
	public group: string = 'Misc';
	public description: string = 'Roll the dice';
	public usage: string = 'roll [number of dice]';
	public example: string = 'roll 5';
	public cooldown: number = 3000;
	public expectedArgs: number = 0;

	public execute({ message, args, t }: CommandData) {
		let dice = (args && args.length) ? args[0] : 1;
		let results: any = [];

		dice = dice > 5 ? 5 : dice;

		for (let i = 0; i < dice; i++) {
			results.push(Math.floor(Math.random() * 6) + 1);
		}

		results = results.join(', ');
		return this.sendMessage(message.channel, t('misc.roll'));
	}
}
