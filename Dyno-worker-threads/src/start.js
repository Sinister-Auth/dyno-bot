'use strict';

process.on('uncaughtException', err => console.error(err) && setTimeout(() => process.exit(), 1000));

const fs = require('fs');
const util = require('util');
const { isMainThread, workerData } = require('worker_threads');
const childProcess = require('child_process');
const config = require('./core/config');

global.Promise = require('bluebird');

require.extensions['.txt'] = (module, filename) => {
    module.exports = fs.readFileSync(filename, 'utf8');
};

const env = config.util.getEnv('NODE_ENV');
const logo = require('./logo.txt');

process.on('SIGINT', () => process.exit());

if (isMainThread) {
	init().then(() => {
		const ClusterManager = require('./core/cluster/Manager');
		const clusterManager = new ClusterManager(); // eslint-disable-line
	});
} else if (workerData && (workerData.hasOwnProperty('clusterId') || workerData.hasOwnProperty('shardId')) && workerData.hasOwnProperty('shardCount')) {
	if (process.env.DEBUG_BLOCKS) {
		const blocked = require('blocked-at');
		const { stop } = blocked((time, stack) => {
			console.log(`Blocked for ${time}ms, operation started here:`, stack);
		}, { threshold: 5000 });

		setTimeout(() => stop(), 900000);
	}


	console.log(`[C${workerData.clusterId}] Process ${process.pid} online.`);

	const Dyno = require('./core/Dyno');
	const options = {};

	if (workerData.hasOwnProperty('awaitReady')) {
		options.awaitReady = workerData.awaitReady;
	}

	if (workerData.hasOwnProperty('shardId')) {
		options.shardId = parseInt(workerData.shardId, 10);
	}

	if (workerData.hasOwnProperty('clusterId')) {
		options.clusterId = parseInt(workerData.clusterId, 10);
	}

	if (workerData.hasOwnProperty('shardCount')) {
		options.shardCount = parseInt(workerData.shardCount, 10);
	}

	if (workerData.hasOwnProperty('clusterCount')) {
		options.clusterCount = parseInt(workerData.clusterCount, 10);
	}

	if (workerData.hasOwnProperty('firstShardId')) {
		options.firstShardId = workerData.firstShardId ? parseInt(workerData.firstShardId, 10) : null;
		options.lastShardId = workerData.lastShardId ? parseInt(workerData.lastShardId, 10) : null;
	}

	if (env === 'development') {
		require('longjohn');
	}

	const dyno = new Dyno();
	dyno.setup(options, require);
}

function log(...args) {
	process.stdout.write(`${util.format.apply(null, args)}\n`);
}

async function init() {
	log(logo, '\n');
	log(`Starting [${env} ${config.pkg.version}]`);

	if (env === 'production') {
		return Promise.resolve();
	}

	try {
		log(`Packages:`);
		await listPackages();
	} catch (err) {}

	try {
		log(`Repo:`);
		await gitInfo();
	} catch (err) {}

	return Promise.resolve();
}

function listPackages() {
	return new Promise((res, rej) =>
		childProcess.exec('yarn list --depth=0 --pattern "@dyno.gg"', (err, stdout) => {
			if (err) {
				return rej(err);
			}
			let output = stdout.split('\n');
			log(`${output.slice(1, output.length - 1).join('\n')}\n`);
			res();
		}));
}

function gitInfo() {
	return new Promise((res, rej) =>
		childProcess.exec('git log -n 3 --no-color --pretty=format:\'[ "%h", "%s", "%cr", "%an" ],\'', (err, stdout) => {
			if (err) {
				return rej(err);
			}

			let str = stdout.split('\n').join('');
			str = str.substr(0, str.length - 1);

			let lines = JSON.parse(`[${str}]`);
			lines = lines.map(l => `[${l[0]}] ${l[1]} - ${l[2]}`);
			log(`${lines.join('\n')}\n`);
			return res();
		}));
}
