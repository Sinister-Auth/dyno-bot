const schema = {
    subreddit: { type: String, index: true },
    includeNsfw: { type: Boolean },
    onlyNsfw: { type: Boolean },
    blurNsfw: { type: Boolean },
    channelId: { type: String },
    webhookId: { type: String },
    webhookToken: { type: String },
    guildId: { type: String },
    messageType: { type: String },
    flair: { type: Array },
};

module.exports = {
    name: 'Reddit',
    schema: schema,
    options: { strict: false },
};
