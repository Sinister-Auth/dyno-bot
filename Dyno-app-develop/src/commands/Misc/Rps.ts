import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Rps extends Command {
	public aliases: string[] = ['rps'];
	public group: string = 'Misc';
	public description: string = 'Rock Paper Scissors with the bot.';
	public usage: string = 'rps [choice]';
	public example: string = 'rps rock';
	public cooldown: number = 3000;
	public expectedArgs: number = 1;

	public execute({ message, args, t }: CommandData) {
		const rps = ['rock', 'paper', 'scissors'];
		const choice = rps[Math.floor(Math.random() * rps.length)];
		const userChoice = args[0].toLowerCase();
		const msgArray = [];

		msgArray.push(t('rps.choice', { userchoice: this.utils.ucfirst(userChoice), choice: this.utils.ucfirst(choice) }));

		if (choice === userChoice) {
			msgArray.push(t('rps.tie'));
			return this.sendMessage(message.channel, msgArray.join('\n'));
		}

		if (userChoice === 'noob') {
			msgArray.push('Noob wins!');
			return this.sendMessage(message.channel, msgArray.join('\n'));
		}

		switch (choice) {
			case 'rock':
				switch (userChoice) {
					case 'paper':
						msgArray.push(t('rps.wins', { winner: 'Paper' }));
						break;
					case 'scissors':
						msgArray.push(t('rps.wins', { winner: 'Rock' }));
						break;
					default:
						msgArray.push(t('rps.wins', { winner: 'Rock' }));
						break;
				}
				break;
			case 'paper':
				switch (userChoice) {
					case 'rock':
						msgArray.push(t('rps.wins', { winner: 'Paper' }));
						break;
					case 'scissors':
						msgArray.push(t('rps.win', { winner: 'Scissors' }));
						break;
					default:
						msgArray.push(t('rps.wins', { winner: 'Paper' }));
						break;
				}
				break;
			case 'scissors':
				switch (userChoice) {
					case 'rock':
						msgArray.push(t('rps.wins', { winner: 'Rock' }));
						break;
					case 'paper':
						msgArray.push(t('rps.win', { winner: 'Scissors' }));
						break;
					default:
						msgArray.push(t('rps.win', { winner: 'Scissors' }));
						break;
				}
			default:
				break;
		}

		return this.sendMessage(message.channel, msgArray.join('\n'));
	}
}
