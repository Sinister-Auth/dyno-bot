import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as moment from 'moment';

export default class DisablePremium extends Command {
	public name           : string   = 'dispremium';
	public aliases        : string[] = ['dispremium'];
	public group          : string   = 'Admin';
	public description    : string   = 'Disable premium for a server.';
	public usage          : string   = 'dispremium [server id] [reason]';
	public example        : string   = 'dispremium 19515731589731689 requested disable';
	public overseerEnabled: boolean  = true;
	public hideFromHelp   : boolean  = true;
	public permissions    : string   = 'admin';
	public cooldown       : number   = 2000;
	public expectedArgs   : number   = 2;

	public permissionsFn({ message }: CommandData) {
		if (!message.member) { return false; }
		if (message.guild.id !== this.config.dynoGuild) { return false; }

		if (this.isServerAdmin(message.member, message.channel)) { return true; }
		if (this.isServerMod(message.member, message.channel)) { return true; }

		const allowedRoles = [
			'225209883828420608', // Accomplices
		];

		const roles = message.guild.roles.filter((r: eris.Role) => allowedRoles.includes(r.id));
		if (roles && message.member.roles.find((r: string) => roles.find((role: eris.Role) => role.id === r))) {
			return true;
		}

		return false;
	}

	public async execute({ message, args }: CommandData) {
		const reason = args.slice(1).join(' ');

		const logChannel = this.client.getChannel('231484392365752320');
		const dataChannel = this.client.getChannel('301131818483318784');

		if (!logChannel || !dataChannel) {
			return this.error(message.channel, 'Unable to find log channel.');
		}

		try {
			await this.dyno.guilds.update(args[0], { $unset: { vip: 1, isPremium: 1 } });
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Error: ${err.message}`);
		}

		let doc;
		try {
			doc = await this.models.Server.findOne({ _id: args[0] }).lean().exec();
		} catch (e) {
			this.logger.error(e);
			return this.error(message.channel, `Error: ${err.message}`);
		}

		this.success(logChannel, `[**${this.utils.fullName(message.author)}**] Disabled Premium on **${doc.name} (${doc._id})** ${reason}`);
		this.success(message.channel, `Disabled Dyno Premium on ${doc.name} ${reason}`);

		let messages;
		try {
			messages = await this.client.getMessages(dataChannel.id, 500);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Error: ${err.message}`);
		}

		message.delete().catch(() => false);

		if (!messages || !messages.length) {
			return Promise.resolve();
		}

		for (const msg of messages) {
			const embed = msg.embeds[0];

			if (embed.fields.find((f: any) => f.name === 'Server ID' && f.value === doc._id)) {
				embed.fields.push({ name: 'Disabled', value: moment().format('llll'), inline: true });
				embed.fields.push({ name: 'Reason', value: reason, inline: true });
			}

			return msg.edit({ embed }).catch((err: string) => this.logger.error(err));
		}
	}
}

