'use strict';

const Controller = require('../../core/Controller');
const logger = require('../../core/logger').get('ReactionRoles');
const db = require('../../core/models');
const config = require('../../core/config');

class ReactionRoles extends Controller {
	constructor(bot) {
		super(bot);

		const basePath = '/api/server/:id/reactionRoles';

		return {
			create: {
				method: 'post',
				uri: `${basePath}/create`,
				handler: this.create.bind(this),
			},
			delete: {
				method: 'post',
				uri: `${basePath}/delete`,
				handler: this.delete.bind(this),
			},
			edit: {
				method: 'post',
				uri: `${basePath}/edit`,
				handler: this.edit.bind(this),
			},
		};
	}

	async create(bot, req, res) {
		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

        let { name, channel, title, description, reactions } = req.body;

		if (!name || !channel || !title || !reactions) {
			return res.status(400).send('Missing required parameters.');
        }

		try {
            const embed = {
                title,
                description,
            };
            const message = await this.client.createMessage(channel, { embed });
            const msgDoc = { id: message.id, title, description, channel, roles: [] };
            msgDoc.roles = reactions.map((r) => { return { ...r.emoji, roleId: r.role.value, description: r.description }; } );

            guildConfig.reactionroles = guildConfig.reactionroles || {};
            guildConfig.reactionroles.messages = guildConfig.reactionroles.messages || [];
            guildConfig.reactionroles.messages.push(msgDoc);

            return this.update(req.params.id, { $set: { reactionroles: { messages: guildConfig.reactionroles.messages } } })
			.then(() => {
	            this.weblog(req, req.params.id, req.session.user, `Created Reaction Role ${name} #${channel.name}.`);
				this.log(req.params.id, `Created Reaction Role: ${name} #${channel.name}.`);
				return res.status(200).send({ message: msgDoc });
			})
			.catch(err => res.status(500).send(err));
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async delete(bot, req, res) {
		if (!req.body.message) {
			return res.status(400).send('Missing required message.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		if (!guildConfig.isPremium) {
			return res.status(500).send('Premium verification failed');
		}

		const doc = req.body.message;
		const channel = typeof doc.channel === 'object' ? doc.channel.id : doc.channel;

		try {
			await this.client.deleteMessage(channel, doc.message);
		} catch (err) {
			if (err.response && err.response.status !== 404) {
				logger.error(err);
			}
		}

		try {
			const docs = await this.getDocs(req.params.id);
			if (!docs || !docs.length) {
				return res.status(400).send(`Auto purge is not enabled for that channel.`);
			}

			await models.MessageEmbed.find({ _id: doc._id }).remove().exec();

			this.weblog(req, req.params.id, req.session.user, 'Deleted Message Embed.');
			return res.send('Deleted Message Embed.');
		} catch (err) {
			logger.error(err);
			return res.status(500).send('Something went wrong.');
		}
	}

	async edit(bot, req, res) {
		if (!req.body.message || !req.body.message._id) {
			return res.status(400).send('Invalid message.');
		}

		const guildConfig = await config.guilds.fetch(req.params.id);
		if (!guildConfig) {
			return res.status(500).send('Something went wrong.');
		}

		if (!guildConfig.isPremium) {
			return res.status(500).send('Premium verification failed');
		}

		const message = req.body.message;
		let msg;

		try {
			msg = await this.client.editMessage(message.channel, message.message, { embed: message.embed });
		} catch (err) {
			logger.error(err);
			// 10008 === Unknown Message
			if (err.response && err.response.code !== 10008) {
				return res.status(500).send('Error editing message in Discord.');
			}
		}

		if (!msg) {
			try {
				msg = await this.client.createMessage(message.channel, { embed: message.embed });
			} catch (err) {
				logger.error(err);
				return res.status(500).send('Error sending message in Discord.');
			}
		}

		if (!msg) {
			return res.status(500).send('Unable to edit/send message.');
		}

		try {
			await models.MessageEmbed.update({ _id: message._id }, { $set: {
				name: message.name,
				embed: message.embed,
			} });

			this.weblog(req, req.params.id, req.session.user, `Edited Message Embed ${message.name}.`);
			return res.send('Edited Message Embed.');
		} catch (err) {
			logger.error(err);
		}
	}
}

module.exports = ReactionRoles;
