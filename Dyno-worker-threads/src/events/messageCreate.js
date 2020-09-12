'use strict';

const { utils } = require('@dyno.gg/dyno-core');

function cacheMessageOnRedis(dispatcher, message) {
	if (dispatcher.dyno.globalConfig && dispatcher.dyno.globalConfig.cacheMessagesOnRedis === false) { return; }

	if (!message.content) { return; }

	const redis = dispatcher.dyno.redis;
	const ttl = (dispatcher.dyno.config.isPremium) ? 604800 : 86400;
	if (!message || !message.channel || !message.toJSON) {
		return;
	}

	const obj = message.toJSON();
	delete obj.embeds;
	delete obj.attachments;
	delete obj.reactions;
	const jsonData = JSON.stringify(obj);

	const key = `dyno:message:${message.channel.id}:${message.id}`;
	const pipeline = redis.pipeline();
	pipeline.hset(key, 'json', jsonData);
	pipeline.expire(key, ttl);
	pipeline.exec();
}

module.exports = function messageCreate(dispatcher, message) {
	if (!dispatcher.dyno.isReady || (message.author && message.author.bot)) return Promise.reject();
	if (!message.channel.guild) return Promise.reject();

	if (dispatcher.config.handleRegion && !utils.regionEnabled(message.channel.guild, dispatcher.config)) return Promise.reject();

	const guildConfig = dispatcher.dyno.guilds.get(message.channel.guild.id);

	if (guildConfig) {
		if (guildConfig.actionlog && (guildConfig.actionlog.messageDelete || guildConfig.actionlog.messageEdit)) {
			cacheMessageOnRedis(dispatcher, message);
		}

		return Promise.resolve({
			message: message,
			guild: message.channel.guild,
			guildConfig: guildConfig,
			isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
		});
	}

	return dispatcher.dyno.guilds.getOrFetch(message.channel.guild.id).then(guildConfig => { // eslint-disable-line
		if (guildConfig && guildConfig.actionlog && (guildConfig.actionlog.messageDelete || guildConfig.actionlog.messageEdit)) {
			cacheMessageOnRedis(dispatcher, message);
		}

		return {
			message: message,
			guild: message.channel.guild,
			guildConfig: guildConfig,
			isAdmin: dispatcher.dyno.permissions.isAdmin(message.author),
		};
	});
};
