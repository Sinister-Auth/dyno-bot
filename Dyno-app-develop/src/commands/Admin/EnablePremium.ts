import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class EnablePremium extends Command {
	public name           : string   = 'enpremium';
	public aliases        : string[] = ['enpremium'];
	public group          : string   = 'Admin';
	public description    : string   = 'Enable premium for a server.';
	public usage          : string   = 'enpremium [server id] [user]';
	public example        : string   = 'enpremium 11957389571359731 175138573107591735';
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

	public execute({ message, args }: CommandData) {
		const user = this.resolveUser(message.guild, args.slice(1).join(' '));

		if (!user) {
			return this.error(message.channel, 'Unable to find that user.');
		}

		const logChannel = this.client.getChannel('231484392365752320');
		const dataChannel = this.client.getChannel('301131818483318784');

		if (!logChannel || !dataChannel) {
			return this.error(message.channel, 'Unable to find log channel.');
		}

		return this.dyno.guilds.update(args[0], { $set: { vip: true, isPremium: true } })
			.then(async () => {
				let doc;
				try {
					doc = await this.models.Server.findOne({ _id: args[0] }).lean().exec();
				} catch (e) {
					return this.logger.error(e);
				}

				this.success(logChannel,
					`[**${this.utils.fullName(message.author)}**] Enabled Premium on **${doc.name} (${doc._id})** for ${user.mention}`);
				this.success(message.channel, `Enabled Dyno Premium on ${doc.name} for ${this.utils.fullName(user)}.`);

				const embed = {
					fields: [
						{ name: 'Server ID', value: doc._id, inline: true },
						{ name: 'Server Name', value: doc.name, inline: true },
						{ name: 'Owner ID', value: doc.ownerID, inline: true },
						{ name: 'User ID', value: user.id, inline: true },
						{ name: 'Username', value: this.utils.fullName(user), inline: true },
						{ name: 'Mention', value: user.mention, inline: true },
						{ name: 'Member Count', value: `${doc.memberCount || 0}`, inline: true },
						{ name: 'Region', value: `${doc.region || 'Unknown'}`, inline: true },
					],
					timestamp: (new Date()).toISOString(),
				};

				this.sendMessage(dataChannel, { embed });
				message.delete().catch(() => false);

			})
			.catch((err: any) => {
				this.logger.error(err);
				return this.error(message.channel, `Error: ${err.message}`);
			});
	}
}
