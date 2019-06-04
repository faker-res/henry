var envConf = {
    // Local
    local_web: {
        mode: "local",
        redisUrl: "http://localhost",
        redisPort: "7200",
        socketSecret: "aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE",
        fpmsUpdateKeyAddress: 'http://localhost:7100/updateKeyPair',
        isGateway: true
    },
    local: {
        mode: "local",
        redisUrl : 'http://localhost',
        redisPort : '1802',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
        fpmsUpdateKeyAddress: 'http://localhost:7100/updateKeyPair'
    },
    local_2: {
        mode: "local",
        redisUrl : 'http://localhost',
        redisPort : '1804',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
        fpmsUpdateKeyAddress: 'http://localhost:7100/updateKeyPair'
    },

    // Development
    development: {
        mode: "development",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1802',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
        fpmsUpdateKeyAddress: 'http://localhost:7100/updateKeyPair'
    },
    development_2:{
        mode: "development",
        redisUrl : 'fpms_sslserver.neweb.me',
        redisPort : '1804',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
        fpmsUpdateKeyAddress: 'http://localhost:7100/updateKeyPair'
    },

    // Production
    production: {
        mode: "production",
        redisUrl : '',
        redisPort : '',
        socketSecret : '',
        fpmsUpdateKeyAddress: ''
    },
    production_2: {
        mode: "production",
        redisUrl : '',
        redisPort : '',
        socketSecret : '',
        fpmsUpdateKeyAddress: ''
    }
};

let keyAddress = '';

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
            if (
                envConf[o].mode === selfMode
                && envConf[o].redisUrl === selfUrl
                && envConf[o].redisPort !== selfPort
                && envConf[o].isGateway !== true
            ) {
                return true;
            }
        }
    },

    getKeyAddress: () => keyAddress,
};

module.exports = env;
