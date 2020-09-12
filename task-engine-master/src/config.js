require('envkey');
const getenv = require('getenv');

const mapping = {
    mongoDSN: 'MONGO_DSN',
    logLevel: 'LOG_LEVEL',
    version: 'VERSION',
    userId: 'USER_ID',
    token: 'TOKEN',
    isPremium: ['IS_PREMIUM', false, 'bool'],
    disabledTasks: ['DISABLED_TASKS', 'string', 'array'],
};

const elasticMapping = {
    host: 'ELASTIC_HOST',
    environment: 'ELASTIC_ENVIRONMENT',
    minLevel: 'ELASTIC_MINLOGLEVEL'
}

const config = getenv.multi(mapping);
config.elastic = getenv.multi(elasticMapping);

module.exports = config;
