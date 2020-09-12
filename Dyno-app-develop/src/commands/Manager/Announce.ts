import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Announce extends Command {
	public aliases: string[] = ['announce'];
	public group: string = 'Manager';
	public module: string = 'Announcements';
	public description: string = 'Send an announcement using the bot.';
	public permissions: string = 'serverAdmin';
	public expectedArgs: number = 2;
	public cooldown: number = 5000;
	public defaultCommand: string = 'announce';
	public defaultUsage: string = 'announce [channel] [message]';

	public commands: SubCommand[] = [
		{ name: 'announce', desc: 'Send an announcement using the bot.', default: true, usage: 'announce [channel] [message]' },
		{ name: 'everyone', desc: 'Send an announcement with @everyone.', usage: 'everyone [channel] [message]' },
		{ name: 'here', desc: 'Send an announcement with @here.', usage: 'here [channel] [message]' },
		{ name: 'role', desc: 'Send an announcement with a role mention.', usage: 'role [role] [channel] [message]' },
	];

	public usage: string[] = [
		'announce [channel] [announcement]',
		'announce here [channel] [announcmenet]',
		'announce everyone [channel] [announcmenet]',
		'announce role [role] [channel] [announcmenet]',
	];
	public example: string[] = [
		'announce #announcements Some nice announcement!',
		`announce here #updates we're live now!`,
		'announce everyone #announcemnets A new release is here! :tada:',
		'announce role @Updates #updates A big update just landed!',
	];

	public execute() {
		return Promise.resolve();
	}

	public async announce({ message, args, guildConfig, t, mention }: CommandData) {
		const channel = this.resolveChannel(message.guild, args[0]);

		if (!channel) {
			return this.error(message.channel, t('manager.valid-channel-error'));
		}

		const embed = {
			description: args.slice(1).join(' '),
			timestamp: (new Date()).toISOString(),
		};

		if (mention && ['everyone', 'here'].includes(mention)) {
			mention = `@${mention}`;
		}

		if (this.config.isPremium) {
			const payload: eris.WebhookPayload = {
				disableEveryone: false,
				embeds: [embed],
			};
			if (mention) {
				payload.content = mention;
			}

			try {
				await this.sendWebhook(channel, payload, guildConfig);
				return Promise.resolve();
			} catch (err) {
				const payload: eris.MessageContent = { embed };
				if (mention) {
					payload.content = mention;
				}

				this.sendMessage(channel, payload, { disableEveryone: false });
				return Promise.resolve();
			}
		}

		const payload: eris.MessageContent = { embed };
		if (mention) {
			payload.content = mention;
		}

		return this.sendMessage(channel, payload, { disableEveryone: false });
	}

	public everyone({ message, args, guildConfig, t }: CommandData) {
		return this.announce({ message, args, guildConfig, t, mention: 'everyone' });
	}

	public here({ message, args, guildConfig, t }: CommandData) {
		return this.announce({ message, args, guildConfig, t, mention: 'here' });
	}

	public role({ message, args, guildConfig, t }: CommandData) {
		const role = this.resolveRole(message.guild, args[0]);
		if (!role) {
			return this.error(message.channel, t('general.no-role-found'));
		}

		return this.announce({ message, args: args.slice(1), guildConfig, t, mention: role.mention });
	}
}
