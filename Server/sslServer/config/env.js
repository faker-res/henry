var envConf = {
    // Local
    local: {
        mode: "local",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1802',
    },
    local_2: {
        mode: "local",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1804',
    },

    // Development
    development: {
        mode: "development",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1802',
    },
    development_2:{
        mode: "development",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1804',
    },

    // Production
    production: {
        mode: "production",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1802',
    },
    production_2: {
        mode: "production",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1804',
    }
};

//env parameters
var env = {
    //cur server message client
    messageClient: null,
    //env mode development, qa or production
    mode : process.env.NODE_ENV || 'local',

    config : function() {
        return envConf[this.mode];
    }
};

module.exports = env;
