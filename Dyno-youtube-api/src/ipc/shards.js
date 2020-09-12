'use strict';

module.exports = function shards(dyno) {
        try {
                const client = dyno.client;
                const shardCount = client.shards.size;
                const connectedCount = client.shards.filter(s => s.status === 'ready').length;
                const guildCount = client.guilds.size;
                const unavailableCount = client.unavailableGuilds.size;
                process.send({ op: 'resp', d: `Shards: ${connectedCount}/${shardCount} Guilds: ${guildCount}, Unavailable: ${unavailableCount}` });
        } catch (err) {
                dyno.logger.error(err);
        }
};
