// local
var localConfig = {
    mode: "local",
    redisUrl : 'localhost',
    redisPort : '1802',
};

// dev-test
var devConfig = {
    mode: "development",
    redisUrl : 'fpms_sslserver_dev.neweb.me',
    redisPort : '80',
};

//for release production
var prodConfig = {
    mode: "production",
    redisUrl : 'fpms_sslserver_dev.neweb.me',
    redisPort : '80',
};

//env parameters
var env = {
    //cur server message client
    messageClient: null,
    //env mode development, qa or production
    mode : process.env.NODE_ENV || 'local',

    config : function() {
        //config settings
        switch (this.mode) {
            case 'local':
                return localConfig;

            case 'development':
                return devConfig;

            case 'production':
                return prodConfig;

            default:
                return localConfig;
        }
    }
};

module.exports = env;
