import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class RandomColor extends Command {
	public aliases: string[] = ['randomcolor', 'randcolor', 'randomcolour'];
	public group: string = 'Misc';
	public description: string = 'Generates a random hex color with preview.';
	public usage: string = 'randomcolor';
	public example: string = 'randomcolor';
	public cooldown: number = 3000;
	public expectedArgs: number = 0;

	public execute({ message }: CommandData) {
		const hex = (`00000${(Math.random() * (1 << 24) | 0).toString(16)}`).slice(-6);
		const int = parseInt(hex, 16);
		const rgb = [(int & 0xff0000) >> 16, (int & 0x00ff00) >> 8, (int & 0x0000ff)];

		return this.sendMessage(message.channel, {
			embed: {
				color: int,
				description: `Hex: #${hex} | RGB: ${rgb.join(',')}`,
			},
		});
	}
}
