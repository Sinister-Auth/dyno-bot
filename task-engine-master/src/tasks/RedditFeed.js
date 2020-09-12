const config = require('../config');
const Task = require('../Task');
const logger = require('../logger').get('RedditFeed');
const RedditDispatcher = require('./../reddit/RedditDispatcher');

class RedditFeed extends Task {
    constructor() {
        super();

        if (this.isDisabled('Reddit')) {
            logger.info('Reddit Task is disabled.');
            return;
        }

        logger.info('Starting RedditFeed Task.');
        this.init();
    }

    async init() {
        this.user = await this.getUser();
        this.redditDispatcher = new RedditDispatcher(this.client, this.db, this.user);
    }

    getUser() {
        return this.client.getSelf(config.userId).then(user => this.user = user);
    }
}

const task = new RedditFeed();
