/******************************************************************
 *        Server
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

//for local development environment
var localConfig = {
    mode: "local",
    wss: [
        "ws://localhost:8001"
    ],
    numOfProcess: 16
};

var devConfig = {
    mode: "development",
    wss: [
        "ws://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:8001"
    ],
    numOfProcess: 16
};

var apiConfig = {
    mode: "api",
    wss: [
        "ws://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:8001"
    ],
    numOfProcess: 16
};

var prodConfig = {
    mode: "production",
    wss: [
        "ws://10.167.11.107:8001"
    ],
    numOfProcess: 1
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

            case 'api':
                return apiConfig;

            case 'production':
                return prodConfig;

            default:
                return localConfig;
        }
    }
};

module.exports = env;