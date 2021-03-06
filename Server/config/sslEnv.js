// local
var localConfig = {
    mode: "local",
    redisUrl : 'http://localhost',
    redisPort : '1802',
};

// dev-test
var devConfig = {
    mode: "development",
    redisUrl : '',
    redisPort : '',
};

//for release production
var prodConfig = {
    mode: "production",
    redisUrl : '',
    redisPort : '',
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
