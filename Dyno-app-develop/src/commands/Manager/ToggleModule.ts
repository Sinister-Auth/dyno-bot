import {Command, Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class ToggleModule extends Command {
	public aliases: string[] = ['module'];
	public file: string = 'ToggleModule';
	public group: string = 'Manager';
	public description: string = 'Enable/disable a module';
	public usage: string = 'module [module name]';
	public example: string = 'module Autopurge';
	public permissions: string = 'serverAdmin';
	public overseerEnabled: boolean = true;
	public cooldown: number = 5000;
	public expectedArgs: number = 1;

	public execute({ message, args, guildConfig, t }: CommandData) {
		const module = this.dyno.modules.find((c: Module) =>
			c.module.toLowerCase() === args.join(' ').toLowerCase() ||
			(c.friendlyName && c.friendlyName.toLowerCase() === args.join(' ').toLowerCase()));

		if (!guildConfig) {
			return this.error(message.channel, t('general.no-settings-error'));
		}

		if (!module || module.admin === true || module.core === true || module.list === false) {
			return this.error(message.channel, t('manager.no-module-error', { command: args[0] }));
		}

		const key = `modules.${module.name}`;

		guildConfig.modules[module.name] = !guildConfig.modules[module.name];

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: guildConfig.modules[module.name] } })
			.then(() => this.success(message.channel, guildConfig.modules[module.name] ?
				t('manager.module-enabled', { module: module.name }) :
				t('manager.module-disabled', { module: module.name })))
			.catch(() => this.error(message.channel, t('general.unknown-error')));
	}
}
