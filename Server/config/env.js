// add timestamps in front of log messages
require('console-stamp')(console, '[dd/mm/yyyy HH:MM:ss.l]');

//for local development environment
var localConfig = {
    mode: "local",
    socketServerUrl : 'localhost',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@localhost:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@localhost:27017/playerdb/',
        logsDBUrl: 'localhost:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'localhost',
    redisPort : '6379',
    clientAPIServerUrl : "ws://localhost:9280",
    providerAPIServerUrl : "ws://localhost:9380",
    paymentAPIServerUrl : "ws://localhost:9480",
    messageServerUrl: "ws://localhost:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    paymentAPIUrl: "ws://203.177.198.117:8330/acc",
    smsAPIUrl: "ws://203.192.151.12:8560/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login",
    disableCPAPI: false,
    disablePaymentAPI: false,
    disableSMSAPI: false
};

//for aws-development
var devConfig = {
    mode: "development",
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:27017/playerdb/',
        logsDBUrl: 'ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9280" ,
    providerAPIServerUrl : "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl : "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9480",
    messageServerUrl: "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    paymentAPIUrl: "ws://203.192.151.11:8330/acc",
    smsAPIUrl: "ws://203.192.151.12:8560/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login"
};

//for settlement
var settleConfig = {
    mode: "settle",
    socketServerUrl : 'ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@54.179.178.19:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@54.179.178.19:27017/playerdb/',
        logsDBUrl: '54.179.178.19:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'ec2-54-169-3-146.ap-southeast-1.compute.amazonaws.com',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com:9280",
    providerAPIServerUrl : "ws://ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl: "ws://ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com:9480",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    paymentAPIUrl: "ws://203.192.151.11:8330/acc",
    smsAPIUrl: "ws://203.192.151.12:8560/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login"
};

//for testing
var qaConfig = {
    mode: "qa",
    socketServerUrl : 'ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@ec2-54-254-216-189.ap-southeast-1.compute.amazonaws.com:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@ec2-54-254-216-189.ap-southeast-1.compute.amazonaws.com:27017/playerdb/',
        logsDBUrl: 'ec2-54-254-216-189.ap-southeast-1.compute.amazonaws.com:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'ec2-54-169-3-146.ap-southeast-1.compute.amazonaws.com',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9280",
    providerAPIServerUrl : "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl: "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9480",
    messageServerUrl: "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    paymentAPIUrl: "ws://203.192.151.11:8330/acc",
    smsAPIUrl: "ws://203.192.151.12:8560/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login"
};

var testAPIConfig = {
    mode: "api",
    socketServerUrl : 'localhost',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com:27017/playerdb/',
        logsDBUrl: 'ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'localhost',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9280",
    providerAPIServerUrl : "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl: "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9480",
    messageServerUrl: "ws://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    paymentAPIUrl: "ws://203.192.151.11:8330/acc",
    smsAPIUrl: "ws://203.192.151.12:8560/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login"
};

/*
//for release production
var prodConfig = {
    mode: "production",
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@localhost:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@localhost:27017/playerdb/',
        logsDBUrl: 'ec2-54-169-206-213.ap-southeast-1.compute.amazonaws.com:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'localhost',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9280",
    providerAPIServerUrl : "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl: "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9480"
};
*/

//for release production
var prodConfig = {
    mode: "production",
    socketServerUrl : '10.167.11.109',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@10.167.11.108:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@10.167.11.108:27017/playerdb/',
        logsDBUrl: 'logsinonet:passwordsinonet@10.167.11.108:27017/logsdb'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'localhost',
    redisPort : '6379',
    clientAPIServerUrl : "ws://10.167.11.107:9280",
    providerAPIServerUrl : "ws://10.167.11.107:9380",
    paymentAPIServerUrl: "ws://10.167.11.107:9480",
    messageServerUrl: "ws://10.167.11.107:9580",
    //todo::update the urls below
    cpAPIUrl : "ws://10.167.11.229:9020/websocketapi",
    paymentAPIUrl: "ws://10.167.11.135:8566/acc",
    smsAPIUrl: "ws://203.192.151.12:8560/sms"
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
    paymentAPIServerUrl: "ws://54.169.235.54:9480",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    paymentAPIUrl: "ws://203.192.151.11:8330/acc",
    smsAPIUrl: "ws://203.192.151.12:8560/sms"
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

            case 'settle':
                return settleConfig;

            case 'qa':
                return qaConfig;

            case 'api':
                return testAPIConfig;

            case 'production':
                return prodConfig;

            case 'bottesting':
                return botConfig;

            default:
                return devConfig;
        }
    }
};

// This needs to come after console-stamp, if we want to log filenames and line numbers
// But it might need to come before dbproperties if we want it to override the global Promise!
var debugTools = require('../modules/debugTools');
debugTools.init(env.mode === 'local' && debugTools.developmentOptions);

module.exports = env;
