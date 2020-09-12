'use strict';

const axios = require('axios');
const {Command} = require('@dyno.gg/dyno-core');

class Restart extends Command {
	constructor(...args) {
		super(...args);

		this.aliases         = ['restart'];
		this.group           = 'Admin';
		this.description     = 'Restart shards.';
		this.usage           = 'restart';
		this.permissions     = 'admin';
		this.overseerEnabled = true;
		this.expectedArgs    = 0;
		this.cooldown        = 30000;
	}

	async execute({ message, args }) {
		if (!this.isAdmin(message.member) && !this.isOverseer(message.member)) {
			return this.error(`You're not authorized to use this command.`);
		}

		const instances = this.dyno.globalConfig.instances || {
			titan: `http://titan.dyno.lan:5000/restart`,
			atlas: `http://atlas.dyno.lan:5000/restart`,
			pandora: `http://pandora.dyno.lan:5000/restart`,
			hype: `http://hype.dyno.lan:5000/restart`,
			prom: `http://prom.dyno.lan:5000/restart`,
			janus: `http://janus.dyno.lan:5000/restart`,
			local: `http://localhost:5000/restart`,
		};

		if (args.length && Object.keys(instances).find(i => i.toLowerCase() === args[0].toLowerCase())) {
			if (!args[1]) {
				return this.error(message.channel, `Please specify a cluster #.`);
			}

			if (args[1] === 'all' && !this.isAdmin(message.member)) {
				return this.error(message.channel, `You're not authorized.`);
			}

			try {
				await axios.post(instances[args[0].toLowerCase()], {
					token: this.config.restartToken,
					id: args[1] === 'all' ? args[1] : parseInt(args[1]),
				});
				return this.success(message.channel, args[1] === 'all' ? `Restarting all clusters on ${args[0]}.` : `Restarting cluster ${args[1]} on ${args[0]}`);
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, err);
			}
		}

		try {
			if (!args.length) {
				return this.error(message.channel, 'Specify a cluster id.');
			}
			if (args[0] === 'all' && !this.isAdmin(message.member)) {
				return this.error(message.channel, `You're not authorized.`);
			}

			await axios.post(instances.local, {
				token: this.config.restartToken,
				id: args[0] === 'all' ? args[0] : parseInt(args[0]),
			});

			return this.success(message.channel, args[0] === 'all' ? `Restarting all clusters.` : `Restarting cluster ${args[0]}`);
		} catch (err) {
			this.logger.error(err);
			return this.error(message.channel, `Something went wrong.`);
		}
	}
}

module.exports = Restart;
