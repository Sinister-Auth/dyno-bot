import {Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

/**
 * Admin command handler
 * @class AdminHandler
 * @extends Module
 */
export default class AdminHandler extends Module {
	public module     : string  = 'AdminHandler';
	public description: string  = 'Admin command handler';
	public enabled    : boolean = true;
	public core       : boolean = true;
	public list       : boolean = false;

	public start() {
		this.boundListener = this.preMessage.bind(this);
		this.client.on('messageCreate', this.boundListener);
	}

	public unload() {
		this.client.removeListener('messageCreate', this.boundListener);
	}

	/**
	 * Fired when the client receives a message
	 * @param {Message} message Message object
	 * @returns {*}
	 */
	public onMessage({ message, guildConfig, isOverseer }: MessageEvent) {
		const params = message.content.split(' ');

		// ignore if it's not a prefixed command
		if (!params.join(' ').startsWith(this.config.adminPrefix)) {
			return;
		}

		const name = params[0].replace(this.config.adminPrefix, '').toLowerCase();

		if (!name.length) { return false; }

		const commands = this.dyno.commands;

		// command doesn't exist
		if (!commands.has(name)) { return; }

		const args = message.content.replace(/ {2,}/g, ' ').split(' ').slice(1);

		// get the command
		const command = commands.get(name);

		if (isOverseer && command.permissions && !command.overseerEnabled) { return; }

		const cmd = new command.constructor(this.dyno);
		cmd.name = cmd.aliases[0];

		const executeStart = Date.now();

		cmd._execute({
			message,
			args,
			command: cmd,
			guildConfig,
		})
		.then(() => {
			const time = Date.now() - executeStart;
			this.dyno.commands.emit('command', { command, message, guildConfig, args, time });
		})
		.catch(() => {
			const time = Date.now() - executeStart;
			this.dyno.commands.emit('error', { command, message, guildConfig, args, time });
		});
	}

	private preMessage(message: eris.Message) {
		if (!message.author || message.author.bot) {
			return;
		}

		const isAdmin = this.isAdmin(message.author);
		const isOverseer = this.isOverseer(message.author);
		if (!isAdmin && !isOverseer) {
			return;
		}

		this.dyno.guilds.getOrFetch((<eris.GuildChannel>message.channel).guild.id)
			.then((guildConfig: GuildConfig) => this.onMessage({ message, guildConfig, isOverseer }));
	}
}
