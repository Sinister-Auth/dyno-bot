import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Avatar extends Command {
	public aliases     : string[] = ['avatar', 'av'];
	public group       : string   = 'Misc';
	public description : string   = `Get a users' avatar.`;
	public usage       : string   = 'avatar [user]';
	public example     : string   = 'avatar [user]';
	public expectedArgs: number   = 0;
	public cooldown    : number   = 3000;

	public execute({ message, args, t }: CommandData) {
		let user = args.length ? this.resolveUser(message.channel.guild, args[0]) : message.author;

		if (!user) {
			return this.error(message.channel, t('general.no-user-found'));
		}

		user = user.user || user;

		let avatar = user.dynamicAvatarURL(null, 256);
		avatar = avatar.match(/.gif/) ? `${avatar}&f=.gif` : avatar;

		return this.sendMessage(message.channel, { embed: {
			author: {
				name: this.utils.fullName(user),
				icon_url: user.dynamicAvatarURL(null, 32).replace(/\?size=.*/, ''),
			},
			title: t('avatar'),
			image: { url: avatar, width: 256, height: 256 },
		} });
	}
}
