// local
var localConfig = {
    mode: "local",
    redisUrl : 'localhost',
    redisPort : '1702',
};

// dev-test
var devConfig = {
    mode: "development",
    redisUrl : 'testkey.fpms8.me',
    redisPort : '1703',
};

//for release production
var prodConfig = {
    mode: "production",
    redisUrl : 'testkey.fpms8.me',
    redisPort : '1703',
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
