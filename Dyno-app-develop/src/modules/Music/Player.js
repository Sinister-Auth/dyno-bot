'use strict';

const moment = require('moment');
const each = require('async-each');
const superagent = require('superagent');
const Base = Loader.require('./core/structures/Base');
const redis = require('../../core/redis');
const statsd = require('../../core/statsd');

require('moment-duration-format');

/**
 * @class Player
 * @extends Base
 */
class Player extends Base {
	constructor(module) {
		super();

		this.queue = module.queue;
		this.module = module;

		this.retries = new Map();
		this.playing = new Map();
		this.stopping = new Set();
		this.cooldowns = new Map();
		this.errCooldowns = new Map();
		this.nowPlayingIds = new Map();

		this.timers = [];

		this.resetPlaying();

		this.timeouts = [];
		this.timeoutInterval = setInterval(this.postTimeouts.bind(this), 15000);
	}

	unload() {
		if (this.timers.length) {
			for (let timer of this.timers) {
				clearTimeout(timer);
			}
		}

		if (this.timeoutInterval) {
			clearInterval(this.timeoutInterval);
		}
	}

	resetPlaying() {
		if (!this.client.voiceConnections.size) return;
		for (let conn of this.client.voiceConnections.values()) {
			if (this.playing.has(conn.id)) return;
			this.playing.set(conn.id, Date.now());
		}
	}

	postTimeouts() {
		let timeouts = [...this.timeouts];
		this.timeouts = [];

		if (!timeouts || !timeouts.length) return;
		let embed = {
			description: timeouts.join('\n'),
			timestamp: new Date(),
		};
		this.client.createMessage('349628001249394688', { embed });
	}

	runTasks() {
		each([...this.cooldowns.keys()], id => {
			let time = this.cooldowns.get(id);
			if ((Date.now() - time) < 500) return;
			this.cooldowns.delete(id);
		});
		each([...this.errCooldowns.keys()], id => {
			let time = this.errCooldowns.get(id);
			if ((Date.now() - time) < 500) return;
			this.errCooldowns.delete(id);
		});
	}

	/**
	 * Get or create the voice player
	 * @param {GuildChannel} channel channel object
	 * @returns {Promise.<Player>} Resolves a player object
	 */
	getPlayer(channel) {
		let player;

		if (!channel || !channel.guild) {
			return Promise.reject('Not a guild channel.');
		}

		if (!this.hasPermissions(channel.guild, 'voiceConnect', 'voiceSpeak')) {
			return Promise.reject(`I don't have permissions to join or speak in that channel`);
		}

		if (this.client.voiceConnections) {
			player = this.client.voiceConnections.get(channel.guild.id);
			if (player) return Promise.resolve(player);
		}

		let options = {};
		if (channel.guild.region) {
			options.region = channel.guild.region;
		}

		return this.client.voiceConnections.join(channel.guild.id, channel.id, options);
	}

	async resolveTracks(host, videoId) {
		try {
			var result = await superagent.get(`http://${host}:2333/loadtracks?identifier=${videoId}`)
				.set('Authorization', 'youshallnotpass')
				.set('Accept', 'application/json');
		} catch (err) {
			throw err;
		}

		if (!result) {
			return Promise.reject('Unable play that video.');
		}

		return result.body;
	}

	/**
	 * Start playing a song
	 * @param {GuildChannel} channel The voice channel to play in
	 * @param {Object} [mediaInfo] The media info to play
	 * @param {Number} [volume=1] Volume to send to encoder
	 * @returns {Promise}
	 */
	async play(channel, mediaInfo, volume = 1) {
		const guildConfig = await this.dyno.guilds.getOrFetch(channel.guild.id);
		if (!guildConfig) return Promise.reject('Unable to get server configuration.');

		const musicChannelId = guildConfig.music ? guildConfig.music.channel || null : null,
			  musicChannel   = musicChannelId ? this.client.getChannel(musicChannelId) : null,
			  msgArray       = [];

		if (!guildConfig.isPremium && !this.playing.has(channel.guild.id)) {
			this.playing.set(channel.guild.id, Date.now());
		} else if (!guildConfig.isPremium) {
			if (mediaInfo && mediaInfo.length) {
				if (mediaInfo.length < 30 || mediaInfo.length > (this.config.maxSongLength || 5400)) {
					return this.skip(channel.guild.id, channel);
				}
			}

			let time = this.playing.get(channel.guild.id);
			if ((Date.now() - time) >= (this.config.maxPlayingTime || 14400000)) {
				this.playing.delete(channel.guild.id);
				if (this.client.voiceConnections.has(channel.guild.id)) {
					await this.stop(channel, true);
					if (musicChannel) {
						return this.sendMessage(musicChannel, `Leaving the channel for performance reasons, use ?play to continue or upgrade to remove this.`);
					}
				}
			}
		}

		try {
			var player = await this.getPlayer(channel);
		} catch (err) {
			if (this.client.voiceConnections.has(channel.guild.id)) {
				await this.stop(channel, true);
			}
			return Promise.reject(err);
		}

		if (player.playing) {
			await this.stop(channel);
		}

		try {
			var lavaResult = await this.resolveTracks(player.node.host, mediaInfo.video_id);
		} catch (err) {
			return this.error(channel, err);
		}

		if (!lavaResult) {
			return this.error(channel, 'Unable to resolve track.');
		}

		let trackInfo = lavaResult.tracks ? lavaResult.tracks[0] : (lavaResult.length ? lavaResult[0] : null),
			track = trackInfo && trackInfo.track ? trackInfo.track : trackInfo;

		if (!track) {
			let queue = await this.queue.fetch(channel.guild.id);
			if (!queue || !queue.length || queue.length <= 1) {
				try {
					this.stop(channel, true);
					return Promise.reject(`I'm not able to play that song, please try another.`);
				} catch (err) {
					this.logger.error(err);
					return Promise.reject(`I'm not able to play that song, please try another.`);
				}
			}
			return this.skip(channel.guild.id, channel);
		}

		redis.incr('music.plays');
		statsd.increment(`music.plays`);

		// this.logger.info(`[${channel.guild.id}] Track started: ${mediaInfo.video_id}`);

		player.play(track);
		player.on('disconnect', (err) => {
			if (err) {
				this.logger.error(err, {
					type: 'player.node.disconnect',
					guild: channel.guild.id,
					shard: channel.guild.shard.id,
					cluster: this.dyno.options.clusterId,
				});
			}
			// this.logger.warn('disconnect', { guild: channel.guild.id, shard: channel.guild.shard.id });
		});

		player.on('error', err => {
			let leave = false;
			if (err.message && err.message.toLowerCase().includes('not ready yet')) {
				leave = true;
			}

			if (err) {
				this.logger.error(err);
			}

			this.queue.fetch(channel.guild.id).then(queue => {
	                        if (!queue || !queue.length || queue.length <= 1) {
        	                        try {
						this.logger.warn(`[${channel.guild.id}] Nothing to skip to in queue, stopping.`);
                	                        return this.stop(channel, true);
                        	        } catch (err) {
                                	        return this.logger.error(err);
                               		}
	                        }

				this.logger.warn(`[${channel.guild.id}] Skipping after error.`);
				return this.skip(channel.guild.id, channel);
			});
		});

		player.on('stuck', msg => {
			if (msg) {
				return this.logger.warn(`[${channel.guild.id}] Track stuck`, msg);
			}
			this.logger.warn(`[${channel.guild.id}] Track stuck`);
		})

		player.once('end', (data) => {
			if (data.reason && data.reason === 'REPLACED') {
				return;
			}

			// this.logger.info(`[${data.guildId}] Track ended: ${data.reason}`);
			this.queue.shift(channel.guild.id).then(queue => {
				if (queue && queue.length) {
					return this.module.play(channel).catch(() => false);
				}

				if (musicChannel) {
					this.sendMessage(musicChannel, `Queue concluded.`);
				}

				return this.stop(channel, true);
			});
		});

		if (!musicChannel) return Promise.resolve();

		let cooldown = this.cooldowns.get(channel.id);
		if (cooldown && (Date.now() - cooldown) <= 500) {
			return Promise.resolve();
		}

		this.cooldowns.set(channel.id, Date.now());

		const length = mediaInfo.length ? moment.duration(mediaInfo.length, 'seconds').format('h[h] m[m] s[s]') : null;

		const embed = {
			color: this.utils.getColor('blue'),
			author: {
				name: `Now Playing: ${mediaInfo.title}`,
				icon_url: mediaInfo.thumbnail_url,
			},
			fields: [
				{ name: 'Link', value: `[Click Here](${mediaInfo.url})`, inline: true },
				{ name: 'Playlist', value: `[Click Here](${this.config.site.host}/playlist/${channel.guild.id}#${mediaInfo.video_id})`, inline: true },
			],
			timestamp: new Date(),
		};

		if (length) {
			embed.footer = { text: `Length: ${length}` };
		}

		if (mediaInfo.thumbnail_url) {
			embed.thumbnail = { url: mediaInfo.thumbnail_url };
		}

		const sortedMessages = [...musicChannel.messages.values()].sort((a, b) => (a.timestamp > b.timestamp) ? 1 : (a.timestamp < b.timestamp) ? -1 : 0);
		const lastMessage = sortedMessages ? sortedMessages.pop() : null;

		let nowPlaying = this.nowPlayingIds.get(musicChannel.id);
		if (nowPlaying && lastMessage && lastMessage.id === nowPlaying) {
			return lastMessage.edit({ embed });
		}

		return this.sendMessage(musicChannel, { embed })
			.then(msg => {
				this.nowPlayingIds.set(musicChannel.id, msg.id);
			});
	}

	/**
	 * Log connection errors
	 * @param {Error} err Error to log
	 * @param {GuildChannel} channel The voice channel where the error originated
	 */
	logError(err, channel) {
		let cooldown = this.errCooldowns.get(channel.id);
		if (cooldown && (Date.now() - cooldown) <= 500) {
			return;
		}

		this.errCooldowns.set(channel.id, Date.now());

		// log other errors
		try {
			this.logger.error(err, {
				type: 'player.node.error',
				guild: channel.guild.id,
				shard: channel.guild.shard.id,
				cluster: this.dyno.options.clusterId,
			});
		} catch (e) {
			console.error(err); // eslint-disable-line
		}
	}

	/**
	 * Handle connection errors
	 * @param {Error} err The error to handle/log
	 * @param {GuildChannel} channel The voice channel where the error originated
	 */
	handleError(err, channel) {
		if (err && err.message) {
			// ffmpeg error, remove song and continue
			if (err.message.includes('Command failed')) {
				this.logger.error(err);
				return this.skip(channel.guild.id, channel);
				// return this.removeAndContinue(channel);
			}

			if (err.message.includes('Timeout') || err.message.includes('TIMEDOUT')) {
				this.logError(err, channel);
				return this.stop(channel, true);
			}

			this.logError(err, channel);
		}

		let retries = this.retries.get(channel.id);
		if (retries && retries >= 3) {
			this.retries.delete(channel.id);
			return;
		}

		retries = retries || 0;
		this.retries.set(channel.id, ++retries);

		setTimeout(() => {
			this.module.play(channel).catch(() => false);
		}, 100 * retries);
	}

	/**
	 * Remove the song and continue the queue
	 * @param {GuildChannel} channel The voice channel
	 * @return {Promise}
	 */
	removeAndContinue(channel) {
		this.queue.shift(channel.guild.id, true).then(queue => {
			if (queue && queue.length) {
				return this.module.play(channel).catch(() => false);
			}

			return this.stop(channel, true);
		});
	}

	leaveChannel(channel) {
		try {
			this.client.leaveVoiceChannel(channel.id);
		} catch (err) {
			this.logger.error(err, {
				type: 'player.leaveChannel',
				guild: channel.guild.id,
				shard: channel.guild.shard.id,
				cluster: this.dyno.options.clusterId,
			});
		}
		this.queue.delete(channel.guild.id);
	}

	/**
	 * Stop playing
	 * @param {GuildChannel} channel channel
	 * @param {Boolean} [leave] Leave the channel
	 */
	stop(channel, leave) {
		if (this.stopping.has(channel.id)) return Promise.resolve();

		this.stopping.add(channel.id);
		this.timers.push(setTimeout(() => {
			this.stopping.delete(channel.id);
		}, 3000));

		let player = this.client.voiceConnections.get(channel.guild.id);
		if (player) {
			player.removeAllListeners('end');
			try {
				player.stop();
			} catch (err) {
				// try just passing
				this.logger.error(err, {
					type: 'player.stop',
					guild: channel.guild.id,
					shard: channel.guild.shard.id,
					cluster: this.dyno.options.clusterId,
				});
			}

			if (leave) {
				player.disconnect();
			}

			if (this.stopping.has(channel.id)) {
				this.stopping.delete(channel.id);
			}

			this.queue.delete(channel.guild.id);

			return Promise.resolve();
		} else {
			this.leaveChannel(channel);
			if (this.stopping.has(channel.id)) {
				this.stopping.delete(channel.id);
			}

			return Promise.resolve();
		}
	}

	/**
	 * Skip the currently playing song
	 * @param {String} guildId Guild ID
	 * @param {GuildChannel} channel Voice channel
	 * @returns {Promise}
	 */
	skip(guildId, channel) {
		return new Promise((resolve, reject) =>
			this.queue.shift(guildId)
				.then(queue => {
					if (!queue || !queue.length) {
						this.stop(channel, true).then(resolve).catch(reject);
					}
					this.module.play(channel).then(resolve).catch(reject)
				})
				.catch(reject));
	}
}

module.exports = Player;
