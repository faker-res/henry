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
        fpmsUpdateKeyAddress: 'http://localhost:7100/updateKeyPair',
        instanceNo: 1
    },
    local_2: {
        mode: "local",
        redisUrl : 'http://localhost',
        redisPort : '1804',
        socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
        fpmsUpdateKeyAddress: 'http://localhost:7100/updateKeyPair',
        instanceNo: 2
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
        let selfInstance = this.config().instanceNo;
        let nextInstance = selfInstance + 1;

        // Find next instance available, else get first instance
        let nextConfig = Object.keys(envConf).filter(getNextInstance).map(o => envConf[o]);

        if (nextConfig && nextConfig[0]) {
            return nextConfig;
        } else {
            return Object.keys(envConf).filter(getFirstInstance).map(o => envConf[o]);
        }

        function getNextInstance (o) {
            return envConf[o].mode === selfMode
                && envConf[o].isGateway !== true
                && envConf[o].instanceNo === nextInstance
        }

        function getFirstInstance (o) {
            return envConf[o].mode === selfMode
                && envConf[o].isGateway !== true
                && envConf[o].instanceNo === 1
        }
    },

    getNonGatewayConfig: function () {
        let selfMode = this.config().mode;

        return Object.keys(envConf).filter(isNonGatewayConfig).map(o => envConf[o]);

        function isNonGatewayConfig (o) {
            if (
                envConf[o].mode === selfMode
                && envConf[o].isGateway !== true
            ) {
                return true;
            }
        }
    },

    getKeyAddress: () => keyAddress,
};

module.exports = env;
