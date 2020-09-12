const Logger = require('@dyno.gg/logger');
const config = require('./config');

let elasticcfg = config.elastic;
elasticcfg.environment = config.elastic.environment || 'development';
elasticcfg.indexPrefix = 'task.';

module.exports = Logger({
    logLevel: config.logLevel,
    minLogLevel: 'INFO',
    elastic: elasticcfg,
});