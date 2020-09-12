'use strict';

const Controller = require('../core/Controller');
const config = require('../core/config');
const redis = require('../core/redis');
const axios = require('axios');

/**
 * Status controller
 * @class Status
 * @extends {Controller}
 */
class Status extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			status: {
				method: 'get',
				uri: '/status',
				handler: this.index.bind(this),
			},
			staffStatus: {
				method: 'get',
				uri: '/staff/status',
				handler: this.staffStatus.bind(this),
			},
			api: {
				method: 'get',
				uri: '/api/status',
				handler: this.api.bind(this),
			},
			restart: {
				method: 'post',
				uri: '/api/status/restart',
				handler: this.restart.bind(this),
			},
		};
	}

	index(bot, req, res) {
		res.locals.scripts.push('/js/react/status.js');
		res.locals.stylesheets.push('/css/status.css');
		res.locals.statusConfig = {
			shardCount: config.global.shardCount,
		};
		return res.render('status');
	}

	staffStatus(bot, req, res) {
		if (!req.session || !req.session.isAdmin) {
			return res.redirect('/');
		}

		res.locals.scripts.push('/js/react/staffStatus.js');
		res.locals.stylesheets.push('/css/status.css');
		res.locals.statusConfig = {
			shardCount: config.global.shardCount,
		};
		return res.render('staffStatus');
	}

	async restart(bot, req, res) {
		if (!req.session || !req.session.isAdmin) {
			return res.status(403).send('Forbidden');
		}

		if (!req.body || !req.body.server || !req.body.id) {
			return res.status(400).send('Invalid request');
		}

		const instances = config.global.instances || {
			titan: `http://titan.dyno.lan:5000/restart`,
			atlas: `http://atlas.dyno.lan:5000/restart`,
			pandora: `http://pandora.dyno.lan:5000/restart`,
			hype: `http://hype.dyno.lan:5000/restart`,
			prom: `http://prom.dyno.lan:5000/restart`,
			janus: `http://janus.dyno.lan:5000/restart`,
		};

		const { server, id } = req.body;

		if (Object.keys(instances).find(i => i.toLowerCase() === server.toLowerCase())) {
			try {
				await axios.post(instances[server.toLowerCase()], {
					token: config.restartToken,
					id: parseInt(id),
				});
				return res.status(200).send('OK');
			} catch (err) {
				console.error(err && err.response ? err.response.data : err);
				return res.status(500).send(err && err.response ? err.response.data : err);
			}
		}
	}

	async api(bot, req, res) {
		const response = {};
		const { servers } = config;
		const { clustersPerServer } = config.global;
		await Promise.all(Object.keys(servers).map(async (objectKey) => {
			const server = servers[objectKey];
			response[server.name] = [];

			const pipeline = await redis.pipeline();

			for (let i = 0; i < clustersPerServer; i++) {
				pipeline.get(`dyno.status.${server.state}.${i}`);
			}


			const statuses = await pipeline.exec();

			// Results in a pipeline are ordered. We can figure out which command
			// errored out by the order of the results.
			let currentClusterId = 0;
			statuses.forEach((s) => {
				const [err, redisStatus] = s;

				if (err) {
					response[server.name].push({ id: currentClusterId.toString(), error: 'Redis call failed.' });
					return;
				}

				if (redisStatus === null) {
					response[server.name].push({ id: currentClusterId.toString(), error: 'Cluster offline.' });
					return;
				}

				let parsedStatus = JSON.parse(redisStatus);

				if (!req.query.shard_status && parsedStatus.shardStatus) {
					delete parsedStatus.shardStatus;
				}

				if (!req.query.versions && parsedStatus.versions) {
					delete parsedStatus.versions;
				}
				// for (let [key, value] of Object.entries(parsedStatus)) {
				// 	value = value.map(o => {

				// 		return o;
				// 	});

				// 	parsedStatus[key] = value;
				// }

				const status = {
					id: parsedStatus.clusterId,
					result: parsedStatus,
				};

				response[server.name].push(status);
				currentClusterId++;
			});
		}));

		res.send(response);
	}
}

module.exports = Status;
