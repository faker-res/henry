var should = require('chai').should();
var dbconfig = require('../modules/dbproperties');

var WebSocketClient = require('../server_common/WebSocketClient');
var PlayerService = require('../services/client/ClientServices').PlayerService;
var GameService = require('../services/client/ClientServices').GameService;
var RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;
var TopUpIntentionService = require('../services/client/ClientServices').TopUpIntentionService;
var ConsumptionService = require('../services/client/ClientServices').ConsumptionService;
var RewardService = require('../services/client/ClientServices').RewardService;
var ProviderConsumptionService = require('../services/provider/ProviderServices').ConsumptionService;

var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');
var ClientGameAPITest = require('../testAPI/clientAPITest/ClientGameAPITest');
var ClientRewardAPITest = require('../testAPI/clientAPITest/ClientRewardAPITest');
var ProviderConsumptionAPITest = require('../testAPI/providerAPITest/ConsumptionAPITest');


var dbProposal = require('../db_modules/dbProposal');
var constProposalType = require('../const/constProposalType');
var constRewardType = require('../const/constRewardType');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');



let testCount = process.env.testCount || 1;

console.log("total websocket ", testCount)

describe("Test Client API - reward(PlayerLoseReturnRewardGroup) service", function () {

    let clientGameAPITest = [];
    let client = [];
    let gameService = [];
    for (let i = 0; i < testCount; i++) {
        client[i] = new WebSocketClient(env.clientAPIServerUrl);
        gameService[i] = new GameService();
        client[i].addService(gameService[i]);
        clientGameAPITest[i] = new ClientGameAPITest(gameService[i]);
    }


    // NOTE :: if you return promise (or use async/await), you do not need to call done(). An exception will occur if you do it
    // however, if you use promise(or any sort of async programming) without return promise, done() is necessary to tell mocha that the script is finished
    before(async function () {

        let clientPromArr = [];
        for (let k = 0; k < testCount; k++) {
            client[k].connect();
            let clientOpenProm =  new Promise(res => {
                // client[k].onopen = function(e) {
                    client[k].addEventListener("open", function () {
                        res();
                    });
                // }
            });
            clientPromArr.push(clientOpenProm);
        }
        await Promise.all(clientPromArr);

    });



    // NOTE:: move the dependency out of 'it' so you can run each 'it' test individually while still not having dependency issue
    before(function (done) {
        let sendData = {
            switchNotify: true,
            count: 1
        }

        for (let j = 0; j < clientGameAPITest.length; j++) {
            clientGameAPITest[j].getLiveGameInfo(
                function (data) {
                    console.log("getLiveGameInfo Data", data)
                    // if (data.status == 200) {
                    //     done();
                    // }
                },
                sendData
            )
        }
        done();
    });


    it('Should wait and observe ebet notification', function(done) {
        done();
        // let time = 60000;
        // if (minutes) {
        //     time = time * minutes;
        // }
        // setTimeout(() => {
        //     done();
        // },time)
    });


    after(async function () {
        // remove all test data
        // let removeTestDataProm = commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]);
        // let removeTestProposalData = commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]);
        // let finished = await Promise.all([removeTestDataProm, removeTestProposalData]);

        //
        // client.disconnect();
    });


});