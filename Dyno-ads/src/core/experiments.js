const db = require('./database');
const config = require('./config');

export default async function init(dyno) {
    if(config.isPremium) return;

    const experimentsColl = db.collection('experiments');
    dyno.client.on('guildRemove', (guild) => {
        const doc = await experimentsColl.findOne({ guildId: guild.id });
        if(!doc) {
            return;
        }

        experimentsColl.updateOne({ _id: doc._id }, { $set: { deleted: true }});
    });

    dyno.client.on('guildCreate', (guild) => {
        const doc = await experimentsColl.findOne({ guildId: guild.id });
        if(!doc) {
            return;
        }

        experimentsColl.updateOne({ _id: doc._id }, { $unset: { deleted: 1 }});
    });
}