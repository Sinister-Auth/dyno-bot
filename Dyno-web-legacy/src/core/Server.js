'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const compression = require('compression');
//const removeRoute = require('express-remove-route');
const exphbs = require('express-handlebars');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const RedisStore = require('connect-redis')(session);
const morgan = require('morgan');
const logger = require('./logger');
const config = require('./config');
const utils = require('./utils');
const compareHelper = require('../helpers/compare');
const ifArrayHelper = require('../helpers/ifArray');

const reload = requireReload(require);

/**
 * Express server
 * @class Server
 * @prop {String} module The module name
 * @prop {Boolean} enabled Whether the module is enabled by default
 * @prop {Boolean} core Whether this is a core module
 * @prop {Boolean} list Whether to list the module in the dashboard
 * @prop {Object} app The express server instance
 * @prop {Eris} client The eris client instance
 */
class Server {

	constructor() {
		this.module = 'HTTP Server';
		this.enabled = true;
		this.core = true;
		this.list = false;
	}

	/**
	 * Start the server module
	 * @param {Eris} client The eris client instance
	 */
	start(client) {
		let app = this.app = express();

		this.client = client;

		/**
		 * Start Web Server setup
		 */
		app.set('port', config.site.listen_port || 8000);
		app.set('views', config.paths.views);

		// setup handlebars for view rendering
		app.engine('hbs', exphbs({
			extname: '.hbs',
			defaultLayout: 'main',
			partialsDir: path.join(config.paths.views, 'partials'),
			compilerOptions: {
				preventIndent: true,
			},
			helpers: {
				compare: compareHelper,
				ifArray: ifArrayHelper.ifArray,
				unlessArray: ifArrayHelper.unlessArray,
				dynamicPartial: (name) => name,
			},
		}));

		app.set('view engine', 'hbs');
		app.enable('view cache');
		app.use(express.static(config.paths.public));
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(compression());
		app.use(multer({ dest: config.paths.uploads }).single('photo'));


		if (!config.test) {
			// setup access control for all routes
			app.use((req, res, next) => {
				res.header('Access-Control-Allow-Credentials', true);
				res.header('Access-Control-Allow-Origin', req.headers.origin);
				res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
				res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
				res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
				res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
				res.header('X-Frame-Options', 'SAMEORIGIN');
				res.header('X-Content-Type-Options', 'nosniff');
				res.header('X-XSS-Protection', '1; mode=block');
				next();
			});
		}

		const sessionOpts = {
			name: 'dynobot.sid',
			secret: config.site.secret,
			resave: false,
			saveUninitialized: true,
			store: new RedisStore({
				host: config.redis.host,
				port: config.redis.port,
				pass: config.redis.auth,
				db: 1,
				ttl: 8 * 60 * 60, // 8 hours
			}),
			cookie: {
				path: '/',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
		};

		if (!config.test) {
			sessionOpts.cookie.domain = '.dynobot.net';
		}

		// create the session handler using mongodb
		app.use(session(sessionOpts));

		app.disable('x-powered-by');

		/**
		 * Morgan to Winston log stream funcion
		 * @type {Object}
		 */
		const stream = {
			write: message => {
				logger.info(message);
			},
		};

		morgan.token('userid', req => req.userid);
		morgan.token('realip', req => req.realip);

		app.use((req, res, next) => {
			req.userid = req.session && req.session.user ? req.session.user.id : 'N/A';
			req.realip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			next();
		});
		// stream logs to winston using morgan
		app.use(morgan(':realip - :remote-user [:date[clf]] - :userid ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
			{ stream: stream }));

		// set template data
		app.locals = {
			site: {
				title: config.site.title,
				uuid: config.uuid,
			},
			stylesheets: ['app'],
		};

		app.use((req, res, next) => {
			if (req.sessionID) {
				res.locals.sessionID = req.sessionID;
			}
			next();
		});

		// load controllers
		utils.readdirRecursive(config.paths.controllers).then(files => {
			files.forEach(file => {
				let Controller = require(file);
				return this.createRoutes(new Controller(this.client));
			});
		});

		// create server
		http.createServer(app).listen(app.get('port'), () => {
			logger.info('Express server listening on port %d', app.get('port'));
		});
	}

	loadController(name) {
		let filePath = path.join(config.paths.controllers, name);
		filePath = filePath.endsWith('.js') ? filePath : filePath + '.js';

		if (!utils.existsSync(filePath)) {
			return Promise.reject(`File does not exist: ${filePath}`);
		}

		let Controller = reload(filePath);
		if (!Controller) {
			return Promise.reject(`Error loading controller.`);
		}

		const controller = new Controller(this.client);
/*
		for (let key in controller) {
			let route = controller[key];

			// remove route(s) when reloading controllers
			if (route.uri instanceof Array) {
				for (let uri of route.uri) {
					removeRoute(this.app, uri);
				}
			} else {
				removeRoute(this.app, route.uri);
			}
		}
*/
		this.createRoutes(controller);
		return Promise.resolve();
	}

	/**
	 * Create routes
	 * @param  {Array} routes Array of routes returned by the controller
	 */
	createRoutes(routes) {
		// iterate over the routes defined by the controller
		for (let o in routes) {
			let route = routes[o];

			if (!(route.uri instanceof Array)) {
				if (route.method === 'use') logger.info(`Registering middleware for ${route.uri}`);
				else logger.info(`Creating route for ${route.uri}`);

				// create the express route
				this.app[route.method](route.uri, route.handler.bind(route, this.client));
				continue;
			}

			for (let uri of route.uri) {
				if (route.method === 'use') logger.info(`Registering middleware for ${uri}`);
				else logger.info(`Creating route for ${uri}`);

				// create the express route
				this.app[route.method](uri, route.handler.bind(route, this.client));
			}
		}
	}
}

module.exports = Server;
