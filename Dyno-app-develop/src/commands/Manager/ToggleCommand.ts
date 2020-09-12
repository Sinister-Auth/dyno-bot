import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ToggleCommand extends Command {
	public aliases: string[] = ['command'];
	public file: string = 'ToggleCommand';
	public group: string = 'Manager';
	public description: string = 'Enable/disable a command';
	public usage: string = 'command [command name]';
	public example: string = 'command ping';
	public permissions: string = 'serverAdmin';
	public overseerEnabled: boolean = true;
	public cooldown: number = 5000;
	public expectedArgs: number = 1;

	public execute({ message, args, guildConfig, t }: CommandData) {
		const command = this.dyno.commands.find((c: Command) => c.name.toLowerCase() === args[0]);

		if (!guildConfig) {
			return this.error(message.channel, t('general.no-settings-error'));
		}

		if (!command) {
			return this.error(message.channel, t('manager.no-command-error', { command: args[0] }));
		}

		const key = `commands.${args[0]}`;

		guildConfig.commands[command.name] = !guildConfig.commands[command.name];

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: guildConfig.commands[command.name] } })
			.then(() => this.success(message.channel, guildConfig.commands[command.name] ?
				t('manager.module-enabled', { module: command.name }) :
				t('manager.module-disabled', { module: command.name })))
			.catch(() => this.error(message.channel, t('general.unknown-error')));
	}
}
