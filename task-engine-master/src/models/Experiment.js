const schema = {
    guildId: { type: String, index: true },
    guild: { type: Object },
    firstAdShown: { type: Date },
    adsServed: { type: Number },
    guildDeletedAt: { type: Date },
    isPremium: { type: Boolean }
};

module.exports = {
    name: 'Experiment',
    schema: schema,
    options: { strict: false },
};
