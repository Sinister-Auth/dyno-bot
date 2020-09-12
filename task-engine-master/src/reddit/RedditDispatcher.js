const config = require('../config');
const logger = require('../logger').get('RedditDispatcher');
const RedditFetcher = require('./RedditFetcher');
const moment = require('moment');


class RedditDispatcher {
    constructor(client, db, user) {
        this.client = client;
        this.user = user;

        this.buffer = [];

        this.fetcher = new RedditFetcher(db);
        this.fetcher.start();

        this.models = db.models;

        this.dispatchInterval = 30000;

        this.interval = setInterval(this.dispatch.bind(this), this.dispatchInterval);

        this.failureCounter = 0;
        this.fetcher.on('posts', this.handlePosts.bind(this));
    }

    handlePosts(posts) {
        if (!posts || posts.length < 1) {
            this.failureCounter += 1;
        } else {
            this.failureCounter = 0;
            this.buffer.push(...posts);
        }
    }

    async dispatch() {
        if (this.failureCounter > 5) {
            process.exit(1);
        }

        logger.debug('Dispatching webhooks');
        const bufferCopy = this.buffer.splice(0);

        const subredditNames = [...new Set(bufferCopy.map((p) => p.subreddit.display_name.toLowerCase()))];

        const subscriptions = await this.models.Reddit.find({ subreddit: { $in: subredditNames } }).lean().exec();
        logger.debug(`${subscriptions.length} subscriptions found`);

        const subscriptionsBySubreddit = {};

        subscriptions.forEach((l) => {
            subscriptionsBySubreddit[l.subreddit] = subscriptionsBySubreddit[l.subreddit] || [];
            subscriptionsBySubreddit[l.subreddit].push(l);
        })

        bufferCopy.forEach(post => {
            const subs = subscriptionsBySubreddit[post.subreddit.display_name.toLowerCase()] || [];
            subs.forEach(async (s) => {
                let message;
                try {
                    const guildConfig = await this.models.Server.findOne({ _id: s.guildId }).lean().exec().catch(() => null);

                    if (!guildConfig) {
                        return;
                    }

                    if (guildConfig.deleted && !guildConfig.premiumInstalled) {
                        return;
                    }

                    if (guildConfig.modules.hasOwnProperty('Reddit') && guildConfig.modules.Reddit === false) {
                        return;
                    }

                    if ((config.isPremium && !guildConfig.isPremium) || (!config.isPremium && guildConfig.isPremium)) {
                        return;
                    }

                    if (s.includeNsfw !== true && post.over_18) {
                        return;
                    }

                    if (s.onlyNsfw === true && !post.over_18) {
                        return;
                    }

                    if (s.flair && s.flair.length > 0) {
                        if (!post.link_flair_text) {
                            return;
                        }

                        const postFlair = post.link_flair_text.toLowerCase();

                        if (!s.flair.some(f => f.toLowerCase() === postFlair)) {
                            return;
                        }
                    }

                    message = this.buildMessage(post, s)

                    try {
                        await this.postWebhook(s.webhookId, s.webhookToken, message);
                    } catch (err) {
                        if (err && err.code) {
                            if (err.code == 10003) {
                                logger.info(`Auto removing ${s.guildId} - ${s.channelId}, Unknown Channel`);
                                return this.models.Reddit.remove({ _id: s._id }).catch(() => null);
                            } else if (err.code == 50001) {
                                logger.info(`Auto removing ${s.guildId} - ${s.channelId}, Missing Access`);
                                return this.models.Reddit.remove({ _id: s._id }).catch(() => null);
                            } else if (err.code == 10015) {
                                logger.info(`Auto removing ${s.guildId} - ${s.channelId}, Unknown Webhook`);
                                return this.models.Reddit.remove({ _id: s._id }).catch(() => null);
                            }

                            logger.error(err);
                        }
                    }
                } catch (err) {
                    logger.error(err, 'dispatchWebhook', {
                        post,
                        subscription: s,
                        message,
                    });
                }
            });
        })
    }

    buildMessage(post, sub) {
        if (sub.messageType === "simple") {
            let content = `**__/${post.subreddit_name_prefixed}__**\n`;

            content += `**${post.title}** (<https://redd.it/${post.id}>)\n`;

            if (post.author && post.author.name) {
                content += `by /u/${post.author.name}`;
            }

            if (post.url !== `https://www.reddit.com${post.permalink}`) {
                if (post.over_18 && !sub.showNsfw) {
                    const preview = post.preview;
                    if (preview && preview.images && preview.images.length > 0) {
                        const image = preview.images[0];

                        if (image.variants && (image.variants.nsfw || image.variants.obfuscated)) {
                            const blurred = image.variants.nsfw || image.variants.obfuscated;
                            const url = blurred.resolutions[blurred.resolutions.length - 1].url;

                            content += `\n${url}`;
                        } else {
                            content += `\n<${post.url}>`;
                        }
                    } else {
                        content += `\n<${post.url}>`;
                    }
                } else {
                    content += `\n${post.url}`;
                }
            }
            return { content };
        } else if (sub.messageType === "embed") {
            let image, thumbnail;
            let hasMedia = false;

            if (post.url !== `https://www.reddit.com${post.permalink}`) {
                hasMedia = true;
                if (post.over_18 && !sub.showNsfw) {
                    const preview = post.preview;
                    if (preview && preview.images && preview.images.length > 0) {
                        const img = preview.images[0];

                        if (img.variants && (img.variants.nsfw || img.variants.obfuscated)) {
                            const blurred = img.variants.nsfw || img.variants.obfuscated;
                            const url = blurred.resolutions[blurred.resolutions.length - 1].url;

                            image = { url };
                        }
                    }
                } else {
                    if (post.post_hint && (post.post_hint === 'link' || post.post_hint.includes('video'))) {
                        const preview = post.preview;
                        if (preview && preview.images && preview.images.length > 0) {
                            const img = preview.images[0];

                            if (img.source && img.source.url) {
                                image = { url: img.source.url };
                            } else {
                                thumbnail = { url: post.thumbnail };
                            }
                        } else {
                            thumbnail = { url: post.thumbnail }
                        }
                    } else {
                        image = { url: post.url };
                    }
                }
            }

            let title = post.title;

            if (title.length > 256) {
                title = `${title.substr(0, 252)}...`;
            }

            const embed = {
                title: `**${title}**`,
                description: (hasMedia) ? `[Go to link](${post.url})` : undefined,
                url: `https://redd.it/${post.id}`,
                color: 2333922,
                fields: [
                    {
                        name: 'Subreddit',
                        value: `/${post.subreddit_name_prefixed}`,
                        inline: true,
                    },
                    {
                        name: 'Author',
                        value: `/u/${post.author.name}`,
                        inline: true,
                    },
                ]
            }

            if (image && !sub.noImages) {
                embed.image = image;
            }

            if (thumbnail && !sub.noImages) {
                embed.thumbnail = thumbnail;
            }

            return { embeds: [embed] };
        }

    }

    postWebhook(webhookId, webhookToken, options) {
        const avatarURL = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?r=${config.version}`;

        let payload = {
            username: 'Dyno',
            avatarURL: avatarURL,
            tts: false,
            wait: true,
        };

        payload = Object.assign(payload, options);

        return this.client.executeWebhook(webhookId, webhookToken, payload);
    }
}

module.exports = RedditDispatcher;