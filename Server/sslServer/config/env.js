var envConf = {
    // Local
    local: {
        mode: "local",
        redisUrl : 'localhost',
        redisPort : '1802',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    },
    local_2: {
        mode: "local",
        redisUrl : 'localhost',
        redisPort : '1804',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    },

    // Development
    development: {
        mode: "development",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1802',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    },
    development_2:{
        mode: "development",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1804',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    },

    // Production
    production: {
        mode: "production",
        redisUrl : '',
        redisPort : '',
        socketSecret : '',
    },
    production_2: {
        mode: "production",
        redisUrl : '',
        redisPort : '',
        socketSecret : '',
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
    },

    getAnotherConfig: function () {
        let selfMode = this.config().mode;
        let selfUrl = this.config().redisUrl;
        let selfPort = this.config().redisPort;

        return Object.keys(envConf).filter(isTheOtherConfig).map(o => envConf[o]);

        function isTheOtherConfig (o) {
            return envConf[o].mode === selfMode
                && envConf[o].redisUrl === selfUrl
                && envConf[o].redisPort !== selfPort
        }

    }
};

module.exports = env;
