//for local development environment
var localConfig = {
    mode: "local",
    db: {
        playerDBUrl: 'playersinonet:passwordsinonet@localhost:27017/playerdb/',
        logsDBUrl: 'localhost:27017/logsdb'
    }
};

//for aws-development
var devConfig = {
    mode: "development",
    db: {
        playerDBUrl: 'playersinonet:passwordsinonet@ec2-54-169-3-146.ap-southeast-1.compute.amazonaws.com:27017/playerdb/',
        logsDBUrl: 'ec2-54-169-3-146.ap-southeast-1.compute.amazonaws.com:27017/logsdb'
    }
};

//for testing
var qaConfig = {
    mode: "qa",
    socketServerUrl : 'localhost',
    db: {
        playerDBUrl: 'playersinonet:passwordsinonet@localhost:27017/playerdb/',
        logsDBUrl: 'localhost:27017/logsdb'
    }
};

//for release production
var prodConfig = {
    mode: "production",
    db: {
        playerDBUrl: 'playersinonet:passwordsinonet@localhost:27017/playerdb/',
        logsDBUrl: 'localhost:27017/logsdb'
    }
};

var botConfig = {
    mode: "bottesting",
    socketServerUrl : '54.169.235.54',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@54.169.235.54:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@54.169.235.54:27017/playerdb/',
        logsDBUrl: 'logsinonet:passwordsinonet@54.169.235.54:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : '54.169.235.54',
    redisPort : '6379',
    clientAPIServerUrl : "ws://54.169.235.54:9280",
    providerAPIServerUrl : "ws://54.169.235.54:9380",
    paymentAPIServerUrl: "ws://54.169.235.54:9480"
};

//env parameters
var env = {
    //env mode development, qa or production
    mode : process.env.NODE_ENV || 'local',

    config : function() {
        //config settings
        switch (this.mode) {
            case 'local':
                return localConfig;

            case 'development':
                return devConfig;

            case 'qa':
                return qaConfig;

            case 'production':
                return prodConfig;

            case 'bottesting':
                return botConfig;

            default:
                return devConfig;
        }
    }
};

module.exports = env;
