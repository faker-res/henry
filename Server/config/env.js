// add timestamps in front of log messages
require('console-stamp')(console, '[dd/mm/yyyy HH:MM:ss.l]');

//for local development environment
var localConfig = {
    mode: "local",
    socketServerUrl : 'localhost',
    db: {
        adminDBUrl: 'diFyB/6xlKq9UHCW4dAPOfTh8Um4w8I8bCKTm9kt/rg+5TvTEI7Wsgp47VYI28VRQ4HMkgu83DMBEzASRU8uJKOLrz2NF05TvtacVSBi3xAEoan1TYjUCdtwS2IxEXp+AojGtduJss5PdAizVtOzP7aLbWpcmhhUgnjFyxzUhvY=',
        playerDBUrl: 'YdslALiZmRWDf1nm0Ze9nhCmnO0yMzoIYAl0STBaJMrErHiqRiGRLy1r7lRv8zkBTWx66ahxqXYH1iusq95wS5jgfBIZkftVIK5dxsFjmQVoWk5dCUZuvPzdZcFJ/R7SerHgTphhA6UbCoKevRMUbipVu2us+TwG7B63IGPT/PA=',
        logsDBUrl: 'hqu+G0VPZ1d7NnFEU2WfoQ8MBPndUtwbIfImkw8F9jfh2oxAFIU9PYJksK2UHqUhJYPuq2Wgp4nAtkU6RGpO+viUNGT7JAVMVJAY07mKsAQeHDBiEXs+QCRY2m1LaPqx/2EoPiszCxitLpSO4pyZOosyhVx9LrJgGA/Ok0v46u0=',
        logs2DBUrl: 'Z2R+aljpWDOYZR3TfRjRPjuH3wbpWRPsX6jPy3uOlkwOLfPPf30RkhKNL0E95ECfglDQLxq3ExKlO7FnZzyUIYIAbQ4ju+iU5TAIgAa3wA0oHPzlHRF6GgHUvQYoRZbtkfRlWrERR0TGcfbvQNil3NTbLcLV0u2wClD9G9lpGc8='
    },
    live800Port: '3306',
    tel400CsIp: '205.177.199.7',
    tel400JiaBoIp: '101.78.133.213',
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'localhost',
    redisPort : '6379',
    clientAPIServerUrl : "ws://localhost:9280",
    providerAPIServerUrl : "ws://localhost:9380",
    paymentAPIServerUrl : "ws://localhost:9480",
    messageServerUrl: "ws://localhost:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    cpAPIUrl2: "",
    cpAPIUrlList : {},
    cpAPIUrlList2 : {},
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://papi99.pms8.me:8330/acc",
    // smsAPIUrl: "ws://203.192.151.12:8560/sms",
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login",
    disableCPAPI: false,
    disablePaymentAPI: false,
    disableSMSAPI: false,
    //paymentHTTPAPIUrl: "http://pms-pay-cstest.neweb.me/",
    internalRESTUrl: "http://localhost:7100",
    ebetRTNUrl: "ws://rtn-xindeli99.cpms8.me:7351/ebet",
    mailerNoReply: "no-reply@snsoft.my",
    providerTimeoutNotificationRecipient: "victorpee@snsoft.my",
    providerTimeoutNotificationM1chatUserRecipient: ['2586120068006814','2586120068006810','2586120068006811'], //Victor, Ricco, Mark
    m1chatApiUrl: "http://m1chat.com:8888/v1/",
    m1chatAppId: "2586120068008812",
    m1chatCorpId: "2586120068005889",
    m1chatCorpSecret: "SNOkTdCmgLBNnEKLdft4FyrcyqJYeVQ0",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/8H_tfnbk5J3_j8rjthtPGdyo70QPBqoqeDti1YaCwj4",
    keyMode: 0, // Mode 0: Legacy Key, Mode 1: Key Service,
    voiceCodeUrl_YP: "https://voice.yunpian.com/v2/voice/send.json", // yunpian
    voiceCodeKEY_YP: "374b4bd0043a359cdd91489762db4107", //yunpian
    voiceCodeUrl_NE: "https://api.netease.im/sms/sendcode.action", //netease
    voiceCodeKEY_NE: "40a07dbb1976981d394429ddbb2819a9", //netease
    voiceCodeSecret_NE: "bfb2bab2d9ec", // netease
    voiceCodeKEY: "0793164d7d7320f72ae19a66bb2bf971",
    voiceCodeSecret: "1400268547",
    bankCardInfoAppCode: "cc889034bd5c4f2e94d2428c455bf6f3",
    bankCardInfoUrl: "http://bankaera.market.alicloudapi.com/bankcard",
};

//for aws-development
var devConfig = {
    mode: "development",
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:27017/playerdb/',
        logsDBUrl: 'ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:27017/logsdb',
        logs2DBUrl: 'ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:27017/logs2db'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9280" ,
    providerAPIServerUrl : "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl : "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9480",
    messageServerUrl: "ws://ec2-54-179-151-35.ap-southeast-1.compute.amazonaws.com:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://papi99.pms8.me:8330/acc",
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login",
    //paymentHTTPAPIUrl: "http://pms-pay-cstest.neweb.me/",
    internalRESTUrl: "http://localhost:7100",
    ebetRTNUrl: "ws://rtn-xindeli99.cpms8.me:7351/ebet",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/C8AZHg3OOI6hjVfT6S5rm192b4i2KbdJ8KZWOEY_dN0",
    keyMode: 0, // Mode 0: Legacy Key, Mode 1: Key Service
    voiceCodeUrl_YP: "https://voice.yunpian.com/v2/voice/send.json", // yunpian
    voiceCodeKEY_YP: "374b4bd0043a359cdd91489762db4107", //yunpian
    voiceCodeUrl_NE: "https://api.netease.im/sms/sendcode.action", //netease
    voiceCodeKEY_NE: "40a07dbb1976981d394429ddbb2819a9", //netease
    voiceCodeSecret_NE: "bfb2bab2d9ec", // netease
    voiceCodeKEY: "0793164d7d7320f72ae19a66bb2bf971",
    voiceCodeSecret: "1400268547",
    bankCardInfoAppCode: "cc889034bd5c4f2e94d2428c455bf6f3",
    bankCardInfoUrl: "http://bankaera.market.alicloudapi.com/bankcard",
};

//for settlement
var settleConfig = {
    mode: "settle",
    socketServerUrl : 'ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@54.179.178.19:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@54.179.178.19:27017/playerdb/',
        logsDBUrl: '54.179.178.19:27017/logsdb',
        logs2DBUrl: '54.179.178.19:27017/logs2db'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'ec2-54-169-3-146.ap-southeast-1.compute.amazonaws.com',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com:9280",
    providerAPIServerUrl : "ws://ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl: "ws://ec2-54-169-253-167.ap-southeast-1.compute.amazonaws.com:9480",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://papi99.pms8.me:8330/acc",
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login",
    //paymentHTTPAPIUrl: "http://pms-pay-cstest.neweb.me/",
    internalRESTUrl: "http://localhost:7100",
    ebetRTNUrl: "ws://rtn-xindeli.cpms8.me:7351/ebet",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/C8AZHg3OOI6hjVfT6S5rm192b4i2KbdJ8KZWOEY_dN0",
};

//for testing
var qaConfig = {
    mode: "qa",
    socketServerUrl : 'ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@ec2-54-254-216-189.ap-southeast-1.compute.amazonaws.com:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@ec2-54-254-216-189.ap-southeast-1.compute.amazonaws.com:27017/playerdb/',
        logsDBUrl: 'ec2-54-254-216-189.ap-southeast-1.compute.amazonaws.com:27017/logsdb',
        logs2DBUrl: 'ec2-54-254-216-189.ap-southeast-1.compute.amazonaws.com:27017/logs2db'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'ec2-54-169-3-146.ap-southeast-1.compute.amazonaws.com',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9280",
    providerAPIServerUrl : "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl: "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9480",
    messageServerUrl: "ws://ec2-54-255-210-7.ap-southeast-1.compute.amazonaws.com:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://papi99.pms8.me:8330/acc",
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login",
    //paymentHTTPAPIUrl: "http://pms-pay-cstest.neweb.me/",
    internalRESTUrl: "http://localhost:7100",
    ebetRTNUrl: "ws://rtn-xindeli.cpms8.me:7351/ebet",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/C8AZHg3OOI6hjVfT6S5rm192b4i2KbdJ8KZWOEY_dN0",
    voiceCodeUrl_YP: "https://voice.yunpian.com/v2/voice/send.json", // yunpian
    voiceCodeKEY_YP: "374b4bd0043a359cdd91489762db4107", //yunpian
    voiceCodeUrl_NE: "https://api.netease.im/sms/sendcode.action", //netease
    voiceCodeKEY_NE: "40a07dbb1976981d394429ddbb2819a9", //netease
    voiceCodeSecret_NE: "bfb2bab2d9ec", // netease
    voiceCodeKEY: "0793164d7d7320f72ae19a66bb2bf971",
    voiceCodeSecret: "1400268547",
    bankCardInfoAppCode: "cc889034bd5c4f2e94d2428c455bf6f3",
    bankCardInfoUrl: "http://bankaera.market.alicloudapi.com/bankcard",
};

var testAPIConfig = {
    mode: "api",
    socketServerUrl : 'localhost',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com:27017/playerdb/',
        logsDBUrl: 'ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com:27017/logsdb',
        logs2DBUrl: 'ec2-54-169-224-43.ap-southeast-1.compute.amazonaws.com:27017/logs2db'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'localhost',
    redisPort : '6379',
    clientAPIServerUrl : "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9280",
    providerAPIServerUrl : "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9380",
    paymentAPIServerUrl: "ws://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com:9480",
    messageServerUrl: "ws://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:9580",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://papi99.pms8.me:8330/acc",
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms",
    cpHttpUrl: "http://gameapi-server.neweb.me/httpget/login",
    //paymentHTTPAPIUrl: "http://pms-pay-cstest.neweb.me/",
    internalRESTUrl: "http://localhost:7100",
    ebetRTNUrl: "ws://rtn-xindeli99.cpms8.me:7351/ebet",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/C8AZHg3OOI6hjVfT6S5rm192b4i2KbdJ8KZWOEY_dN0",
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
var prodOldConfig = {
    mode: "productionold",
    socketServerUrl : '10.167.11.109',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@10.167.11.108:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@10.167.11.108:27017/playerdb/',
        logsDBUrl: 'logsinonet:passwordsinonet@10.167.11.108:27017/logsdb',
        logs2DBUrl: 'logs2dbsinonet:passwordsinonet@10.167.11.108:27020/logs2db'
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
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://10.167.11.135:8566/acc",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/C8AZHg3OOI6hjVfT6S5rm192b4i2KbdJ8KZWOEY_dN0",
    //smsAPIUrl: "ws://203.192.151.12:8560/sms"
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms"
};

var prodConfig = {
    mode: "production",
    socketServerUrl : '10.167.11.109',
    db: {
        adminDBUrl: 'Pd5cUveLELFUyR9Xwq1H8Y/pveYm+gMz5cs8QzQ8YqQe+aJeDeptG5x3xkCfUf9ZUVJ4Ow7EXM4RHVcNJwxftoa0sh5UI5LRcJ1yPaRO9aodhJQoQWetAFBVDxlHLtwGxqevnz+xJRdf2gyxcTU0gevofNJoY8Vwn1Orprk4ZtM=',
        playerDBUrl: 'T7P5G3ibfyQyCqM8tNJu7oeouGa8S2o5z3fLeJnJvuzPOiuQWXNmO9E2e0NrWvVuf+LIal+vmMdAOKdW5vXmGLsWLx8+f8RCs9TRTfFUrETDCs6RzsBwxv29CAktr9hlRmUlwEHAReXhthTmkpefHbhItx8rz459fJpQBsW1f6M=',
        logsDBUrl: 'MTF0rMRYQSjy1fkL9GGUXNWyeTUGzEZnEM3bJAIDmPgjIr+K/MvkOKpNr1X12cHXYYhBQmX9dCHIqIifB2ou0W26ydCz1Vd9tlElZtSTW30e0nmJqi0cZXtsybgzYcaYKEARN+EA3yKqtpu3HisHPtM4GA81AwRYmurR8IH9MDk=',
	    logs2DBUrl: 'TZXworYj1JKgQva2YnDE5iwBVDy5vbCoDfn8ovuo2g0F+oMn5xQ0ztI3XbPWTbhmv4IDY6H9fdJYxId+YDO8dQqSSBE432BdaN/79ef+7mJZ6TrSQ/4JT+DBgSkp4B2zEfLEKHfS4m3AQSD0pqjWo2fRXlI/Vil7XDypRw76oig='
    },
    live800Port: '3306',
    tel400CsIp: '205.177.199.7',
    tel400JiaBoIp: '101.78.133.213',
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : 'localhost',
    redisPort : '6379',
    clientAPIServerUrl : "ws://10.167.11.108:9280",
    providerAPIServerUrl : "ws://10.167.11.108:9380",
    paymentAPIServerUrl: "ws://10.167.11.108:9480",
    messageServerUrl: "ws://10.167.11.108:9580",

    cpAPIUrl : "ws://cpapi77.cpms8.me:7124/websocketapi",
    cpAPIUrl2: "",
    cpAPIUrlList : {
        4: "ws://10.167.11.153:8661/websocketapi",
        7: "ws://10.167.11.153:8662/websocketapi",
        8: "ws://10.167.11.153:8663/websocketapi",
        6: "ws://10.167.11.153:8664/websocketapi",
        5: "ws://10.167.11.153:8665/websocketapi",
        2: "ws://10.167.11.153:8666/websocketapi",
        10: "ws://10.167.11.153:8667/websocketapi",
        30: "ws://10.167.11.153:8668/websocketapi",
        29: "ws://10.167.11.153:8669/websocketapi",
        28: "ws://10.167.11.153:8670/websocketapi"
    },
    cpAPIUrlList2 : {},
    // cpAPIUrl : "ws://timeout.com:9020/websocketapi",
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://10.167.11.140:8330/acc",
    //smsAPIUrl: "ws://203.192.151.12:8560/sms"
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms",
    //paymentHTTPAPIUrl: "http://pms-pay-dev.neweb.me/",
    internalRESTUrl: "http://devtest.wsweb.me:7100",
    ebetRTNUrl: "ws://rtn-xindeli99.cpms8.me:7351/ebet",
    mailerNoReply: "no-reply@snsoft.my",
    providerTimeoutNotificationRecipient: "victorpee@snsoft.my",
    providerTimeoutNotificationM1chatUserRecipient: ['2586120068006814','2586120068006810','2586120068006811'], //Victor, Ricco, Mark
    m1chatApiUrl: "http://m1chat.com:8888/v1/",
    m1chatAppId: "2586120068008812",
    m1chatCorpId: "2586120068005889",
    m1chatCorpSecret: "SNOkTdCmgLBNnEKLdft4FyrcyqJYeVQ0",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/C8AZHg3OOI6hjVfT6S5rm192b4i2KbdJ8KZWOEY_dN0",
    keyMode: 0, // Mode 0: Legacy Key, Mode 1: Key Service
    voiceCodeUrl_YP: "https://voice.yunpian.com/v2/voice/send.json", // yunpian
    voiceCodeKEY_YP: "374b4bd0043a359cdd91489762db4107", //yunpian
    voiceCodeUrl_NE: "https://api.netease.im/sms/sendcode.action", //netease
    voiceCodeKEY_NE: "40a07dbb1976981d394429ddbb2819a9", //netease
    voiceCodeSecret_NE: "bfb2bab2d9ec", // netease
    voiceCodeKEY: "0793164d7d7320f72ae19a66bb2bf971",
    voiceCodeSecret: "1400268547",
    bankCardInfoAppCode: "cc889034bd5c4f2e94d2428c455bf6f3",
    bankCardInfoUrl: "http://bankaera.market.alicloudapi.com/bankcard",
};


var botConfig = {
    mode: "bottesting",
    socketServerUrl : '54.169.235.54',
    db: {
        adminDBUrl: 'adminsinonet:passwordsinonet@54.169.235.54:27017/admindb/',
        playerDBUrl: 'playersinonet:passwordsinonet@54.169.235.54:27017/playerdb/',
        logsDBUrl: 'logsinonet:passwordsinonet@54.169.235.54:27017/logsdb',
        logs2DBUrl: 'logsinonet:passwordsinonet@54.169.235.54:27017/logs2db'
    },
    socketSecret : 'aO5GIR8Sk5a70XCAfecsDIHZ3D5hVSIvHkudBLCE',
    redisUrl : '54.169.235.54',
    redisPort : '6379',
    clientAPIServerUrl : "ws://54.169.235.54:9280",
    providerAPIServerUrl : "ws://54.169.235.54:9380",
    paymentAPIServerUrl: "ws://54.169.235.54:9480",
    cpAPIUrl : "ws://gameapi-server.neweb.me/websocketapi",
    cpAPIUrlForGame : "ws://gameapi-server.neweb.me/game",
    //paymentAPIUrl: "ws://papi99.pms8.me:8330/acc",
    smsAPIUrl: "ws://smsapiserver99.pms8.me/sms",
    //paymentHTTPAPIUrl: "http://pms-pay-cstest.neweb.me/",
    internalRESTUrl: "http://devtest.wsweb.me:7100",
    ebetRTNUrl: "ws://rtn-xindeli99.cpms8.me:7351/ebet",
    gmailOAuthUser: "no-reply@snsoft.my",
    gmailOAuthClientId: "1038978421433-9huu4iii0becis24bob05kc7flv83d04.apps.googleusercontent.com",
    gmailOAuthClientSecret: "UZg27F7_tJcTdf3O6covSw5p",
    gmailOAuthRefreshToken: "1/C8AZHg3OOI6hjVfT6S5rm192b4i2KbdJ8KZWOEY_dN0",
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
