'use strict';

const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const each = require('async-each');
const jsonSchema = require('mongoose_schema-json');
const Collection = requireReload(require)('../interfaces/Collection');
const logger = requireReload(require)('../logger');
const utils = requireReload(require)('../utils');
const models = require('../models');
const { Server } = models;

/**
 * @class ModuleCollection
 * @extends Collection
 */
class ModuleCollection extends Collection {
	/**
	 * A collection of modules
	 * @param {Object} config The Dyno configuration object
	 * @param {Dyno} dyno The Dyno instance
	 */
	constructor(config, dyno) {
		super();

		this.dyno = dyno;
		this._client = dyno.client;
		this._config = config;
		this._listenerCount = 0;

		this.moduleList = this._config.moduleList || [];

		this.loadModules();
	}

	unload() {
		for (let module of this.values()) {
			module._unload();
			this.delete(module.name);
		}
	}

	/**
	 * Load commands
	 */
	async loadModules() {
		try {
			var files = await fs.readdirAsync(this._config.paths.modules);
		} catch (err) {
			logger.error(err);
		}

		each(files, (file, next) => {
			if (file.endsWith('.map')) return next();
			let load = () => {
				var module = requireReload(path.join(this._config.paths.modules, file));
				this.register(module);
			};
			load();
			// utils.time(load, file);
			return next();
		}, err => {
			if (err) logger.error(err);
			logger.info(`[ModuleCollection] Registered ${this.size} modules.`);
		});
	}

	/**
	 * Register module
	 * @param {Function} Module class
	 */
	register(Module) {
		if (typeof Module !== 'function') {
			return logger.debug('[ModuleCollection] Skipping unknown module');
		}

		let module = new Module(this._config, this.dyno),
			activeModule = this.get(module.name),
			globalConfig = this.dyno.globalConfig;

		if (activeModule) {
			logger.debug(`[ModuleCollection] Unloading module ${module.name}`);
			activeModule._unload();
			this.delete(module.name);
		}

		logger.debug(`[ModuleCollection] Registering module ${module.name}`);

		// ensure the module defines all required properties/methods
		module.ensureInterface();

		if (!activeModule) {
			const moduleCopy = module.toJSON();

			if (module.settings) {
				moduleCopy.settings = jsonSchema.schema2json(module.settings);

				Server.schema.add({
					[module.name.toLowerCase()]: module.settings,
				});
			}

			models.Module.update({ name: module.name, _state: this._config.state }, moduleCopy, { upsert: true })
				.catch(err => logger.error(err));
		}

		this.set(module.name, module);

		if (this.moduleList.length && !this.moduleList.includes(Module.name)) {
			return;
		}

		if (globalConfig && globalConfig.modules.hasOwnProperty(module.name) &&
			globalConfig.modules[module.name] === false) return;

		each(this.dyno.dispatcher.events, (event, next) => {
			if (!module[event]) return next();
			module.registerListener(event, module[event]);
			this._listenerCount++;
			next();
		}, err => {
			if (err) logger.error(err);
			this.get(module.name)._start(this._client);
		});
	}

	/**
	 * Enable or disable a module
	 * @param   {String} id      Guild id
	 * @param   {String} name    Module name
	 * @param   {String|Boolean} enabled Enabled or disabled
	 * @returns {Promise}
	 */
	async toggle(id, name, enabled) {
		let guildConfig = await this.dyno.guilds.getOrFetch(id),
			guild       = this._client.guilds.get(id),
			module      = this.get(name),
			key         = `modules.${name}`;

		enabled = enabled === 'true';

		if (!guild || !guildConfig)
			return Promise.reject(`Couldn't get guild or config for module ${name}.`);

		guildConfig.modules[name] = enabled;

		if (enabled && module && module.enable) module.enable(guild);
		if (!enabled && module && module.disable) module.disable(guild);

		return this.dyno.guilds.update(guildConfig._id, { $set: { [key]: enabled } });
	}
}

module.exports = ModuleCollection;
