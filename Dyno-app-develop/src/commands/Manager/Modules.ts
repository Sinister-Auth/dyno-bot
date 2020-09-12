import {Command, Module} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Modules extends Command {
	public aliases: string[] = ['modules'];
	public group: string = 'Manager';
	public description: string = 'List available modules';
	public usage: string = 'modules';
	public example: string = 'modules';
	public permissions: string = 'serverAdmin';
	public overseerEnabled: boolean = true;
	public expectedArgs: number = 0;

	public execute({ message, guildConfig, t }: CommandData) {
		const modules = this.dyno.modules.filter((m: Module) => !m.admin && !m.core && m.list !== false);

		if (!modules) {
			return this.error(message.channel, `Couldn't get a list of modules.`);
		}

		const enabledModules = modules.filter((m: Module) => !guildConfig.modules.hasOwnProperty(m.name) ||
			guildConfig.modules[m.name] === true);
		const disabledModules = modules.filter((m: Module) => guildConfig.modules.hasOwnProperty(m.name) &&
			guildConfig.modules[m.name] === false);

		return this.sendMessage(message.channel, { embed: {
			author: {
				name: 'Dyno',
				url: 'https://www.dynobot.net',
				icon_url: `${this.config.site.host}/${this.config.avatar}?r=${this.config.version}`,
			},
			description: t('modules-description', { prefix: guildConfig.prefix || '?' }),
			fields: [
				{ name: t('manager.enabled-modules'), value: enabledModules.map((m: Module) => m.name).join('\n'), inline: false },
				{ name: t('manager.disabled-modules'), value: disabledModules.map((m: Module) => m.name).join('\n'), inline: false },
			],
		} });
	}
}
