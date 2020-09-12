import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as superagent from 'superagent';

export default class SetAvatar extends Command {
	public aliases     : string[] = ['setavatar', 'setav'];
	public group       : string   = 'Admin';
	public description : string   = 'Set the bot avatar';
	public usage       : string   = 'setavatar [url]';
	public example     : string   = 'setavatar https: //link.to/image.png';
	public permissions : string   = 'admin';
	public cooldown    : number   = 10000;
	public expectedArgs: number   = 1;

	constructor(dyno: Dyno, guild: eris.Guild) {
		super(dyno, guild);
		this.extraPermissions = [this.config.owner || this.config.admin];
	}

	public async execute({ message, args }: CommandData) {
		try {
			const res = await superagent.get(args[0]);
			const image = `data:image/jpeg;base64,${res.body.toString('base64')}`;

			return this.client.editSelf({ avatar: image })
				.then(() => this.success(message.channel, 'Changed avatar.'))
				.catch(() => this.error(message.channel, 'Failed setting avatar.'));
		} catch (err) {
			return this.error(message.channel, 'Failed to get a valid image.');
		}
	}
}
