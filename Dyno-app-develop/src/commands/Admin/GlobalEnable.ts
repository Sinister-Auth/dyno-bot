import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class GlobalEnable extends Command {
	public aliases     : string[] = ['englobal'];
	public group       : string   = 'Admin';
	public description : string   = 'Disable a module or command globally';
	public usage       : string   = 'englobal [name]';
	public example     : string   = 'englobal ShardStatus';
	public permissions : string   = 'admin';
	public cooldown    : number   = 2000;
	public expectedArgs: number   = 1;

	public execute({ message, args }: CommandData) {
		const name = args.join(' ');
		const module = this.dyno.modules.get(name);
		const command = this.dyno.commands.get(name);
		const globalConfig = this.dyno.globalConfig || {};
		const options = { new: true, upsert: true };

		if (!module || !command) {
			return this.sendMessage(message.channel, `Couldn't find module or command ${name}`);
		}

		if (module) {
			globalConfig.modules = globalConfig.modules || {};
			globalConfig.modules[name] = true;
			return this.models.Dyno.findOneAndUpdate({}, globalConfig, options).then((doc: GlobalConfig) => {
				this.config.global = doc.toObject();
				this.success(message.channel, `Enabled module ${name}`);
			}).catch((err: string) => this.logger.error(err));
		}

		if (command) {
			globalConfig.commands = globalConfig.commands || {};
			globalConfig.commands[name] = true;
			return this.models.Dyno.findOneAndUpdate({}, globalConfig, options).then((doc: GlobalConfig) => {
				this.config.global = doc.toObject();
				this.success(message.channel, `Enabled command ${name}`);
			}).catch((err: string) => this.logger.error(err));
		}

		return Promise.resolve();
	}
}

