const logger = require('../logger').get('RedditFetcher');
const snoowrap = require('snoowrap');
const EventEmitter = require('eventemitter3');

class RedditFetcher extends EventEmitter {
    constructor(db) {
        super();
        this.reddit = new snoowrap({
            clientId: 'AbSnJWHm4H0HaA',
            clientSecret: '1qyGVXB1Vso3CV2Vb9Enb9NPN6s',
            userAgent: 'discord:dynobot:v0.1.0 (by /u/germanoeich)',
            refreshToken: '242653594028-cESctbvro0G7PGvK2JwxGkSugVw',
        });

        this.db = db;

        this.postsNotFetched = [];
        this.fetchCounter = 0;
        this.fetch = false;
        this.fetchInterval = 2000;
    }

    start() {
        this.fetch = true;
        this.init();
    }

    stop() {
        this.fetch = false;
    }

    async delay(ms) {
        await new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    async init() {
        try {
            await this.setupLastFetchedId()

            while (this.fetch) {
                const start = new Date();

                await this.fetchPosts();

                const elapsed = new Date().getTime() - start.getTime();
                if (elapsed > this.fetchInterval) {
                    continue;
                }

                await this.delay(this.fetchInterval - elapsed);
            }
        } catch (err) {
            logger.error(err);
        }
    }

    async setupLastFetchedId() {
        const coll = await this.db.collection('redditconfig');
        const redditConfig = await coll.findOne({});

        if (redditConfig && redditConfig.id && redditConfig.created_utc) {
            this.lastFetchedId = redditConfig.id;
            this.lastFetchedAge = redditConfig.created_utc;
        } else {
            this.sub = await this.reddit.getSubreddit('all');
            const posts = await this.sub.getNew({ limit: 1 });

            this.lastFetchedId = posts[0].id;
            this.lastFetchedAge = posts[0].created_utc;
            
            await coll.replaceOne({}, { id: posts[0].id, created_utc: posts[0].created_utc }, { upsert: true });
        }
    }

    async fetchPosts() {
        logger.info(`Fetching posts. PID: ${process.pid}`);

        try {
            if (!this.lastFetchedId || !Number.isInteger(parseInt(this.lastFetchedId, 36))) {
                await this.setupLastFetchedId();
                logger.warn(
                    `Invalid lastFetchedId. lastFetchedAge: ${this.lastFetchedAge}, lastFetchedId: ${this.lastFetchedId}`,
                    'fetchPosts',
                    {
                        lastFetchedAge: this.lastFetchedAge,
                        lastFetchedId: this.lastFetchedId,
                    }
                );
            }

            const ids = (new Array(100).fill(0)).map((a, i) => {
                return `t3_${(parseInt(this.lastFetchedId, 36) + i + 1).toString(36)}`;
            });

            const unix = new Date().getTime() / 1000;

            if ((unix - this.lastFetchedAge) < 60) {
                let delay = (60 - (unix - this.lastFetchedAge)) * 1000;

                if (!delay || Number.isNaN(delay) || !Number.isFinite(delay) || delay > 60000) {
                    logger.warn(
                        `Invalid delay / delay too high. Value: ${delay}, lastFetchedAge: ${this.lastFetchedAge}, lastFetchedId: ${this.lastFetchedId}`,
                        'delayGuard',
                        {
                            delay,
                            lastFetchedAge: this.lastFetchedAge,
                            lastFetchedId: this.lastFetchedId,
                            unix,
                        }
                    );
                    delay = 60000;
                } else if (delay < 3000) {
                    logger.warn(
                        `Delay too low. Value: ${delay}, lastFetchedAge: ${this.lastFetchedAge}, lastFetchedId: ${this.lastFetchedId}`,
                        'delayGuard',
                        {
                            delay,
                            lastFetchedAge: this.lastFetchedAge,
                            lastFetchedId: this.lastFetchedId,
                            unix,
                        }
                    );
                    delay = 3000;
                }

                logger.debug(`Delaying next post fetch by ${delay}`);
                await this.delay(Math.round(delay));
            }

            const posts = await this.reddit._get({ uri: '/r/all/api/info', qs: { id: ids.join() } });

            if (posts && posts.length > 0) {
                const postIds = posts.map(p => parseInt(p.id, 36));

                postIds.reduce((prev, curr, i) => {
                    const delta = curr - prev;

                    if (delta !== 1) {
                        for (let j = 1; j < delta; j++) {
                            this.postsNotFetched.push(`t3_${(prev + j).toString(36)}`);
                        }
                    }

                    return curr;
                });
            }

            logger.debug(`Fetched ${posts.length} posts`);

            if (posts && posts.length > 0 && posts[posts.length - 1].id && posts[posts.length - 1].created_utc) {
                this.lastFetchedId = posts[posts.length - 1].id;
                this.lastFetchedAge = posts[posts.length - 1].created_utc;
                const coll = await this.db.collection('redditconfig');
                await coll.replaceOne({}, { id: posts[posts.length - 1].id, created_utc: posts[posts.length - 1].created_utc }, { upsert: true });
            }

            this.emit('posts', posts);
        } catch (err) {
            // Increase failureCounter on RedditDispatcher
            this.emit('posts', []);
            logger.error(err, 'fetchPosts', { lastFetchedAge: this.lastFetchedAge, lastFetchedId: this.lastFetchedId });
        }
    }
}

module.exports = RedditFetcher;