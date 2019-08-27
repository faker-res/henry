var should = require('should');
var dbconfig = require('../modules/dbproperties');

var WebSocketClient = require('../server_common/WebSocketClient');
var PlayerService = require('../services/client/ClientServices').PlayerService;
var RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;
var TopUpIntentionService = require('../services/client/ClientServices').TopUpIntentionService;
var ConsumptionService = require('../services/client/ClientServices').ConsumptionService;

var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');
var ClientRegistrationIntentionAPITest = require('../testAPI/clientAPITest/ClientRegistrationIntentionAPITest');
var ClientTopUpIntentionAPITest = require('../testAPI/clientAPITest/ClientTopUpIntentionAPITest');
var ClientConsumptionAPITest = require('../testAPI/clientAPITest/ClientConsumptionAPITest');

var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
let dbProposal = require('../db_modules/dbProposal');
let dbProposalType = require('../db_modules/dbProposalType');
let dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
let dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');
const constProposalType = require('../const/constProposalType');

var testPlatformName = 'unittestPlayerApi_platformName';
var testQuickPlayerName = 'testquickplayername';
var testPhoneNumber = '95567654';

var testPlayerName = null;
var testNewPlayerName = 'testnewplayer';
var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var testNewPlayerId = null;
var smsCode = null;
var token = null;
let date = new Date().getTime();
let testRewardEventNameCode = "";

describe("Test Client API - Player service", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var playerService = new PlayerService();
    client.addService(playerService);

    var registrationIntentionService = new RegistrationIntentionService();
    client.addService(registrationIntentionService);

    var topUpIntentionService = new TopUpIntentionService();
    client.addService(topUpIntentionService);

    var consumptionService = new ConsumptionService();
    client.addService(consumptionService);

    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    // NOTE :: if you return promise (or use async/await), you do not need to call done(). An exception will occur if you do it
    // however, if you use promise(or any sort of async programming) without return promise, done() is necessary to tell mocha that the script is finished
    before(async function () {
        //create test platform
        let testPlatform = await commonTestFun.createTestPlatform();
        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        let testPlayer = await commonTestFun.createTestPlayer(testPlatformObjId);
        testPlayerName = testPlayer.name;
        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;


        typeName = constProposalType.PLAYER_FESTIVAL_REWARD_GROUP;
        let typeProm = dbProposalType.getProposalType({platformId: testPlatformObjId, name: typeName});
        let typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformObjId, name: typeName});
        let testProposalTypeAndProcess = await Promise.all([typeProm, typeProcessProm]);
        console.log('****typeProm', typeProm);
        testProposalTypeAndProcess[0].name.should.equal(typeName);
        testProposalTypeAndProcess[1].name.should.equal(typeName);

        proposalTypeId = testProposalTypeAndProcess[0]._id;
        proposalTypeProcessId = testProposalTypeAndProcess[1]._id;
        //
        //
        let eventName = "testEvent" + date;
        let eventData = {
            name: eventName,
            code: new Date().getTime(),
            platform: testPlatformObjId,
            type: typeProm._id,
            param: {
                rewardParam: [
                    {
                        levelId: "57ff08433f8838c63a7f8372",
                        value: [
                            // {id: "5d6388cfaed4cb0c7bf33d35", rewardType: 1},
                            // {id: "5d6388cf1967f8f941b03ab4", rewardType: 2},
                            // {id: "5d6388cf30bd154e57564234", rewardType: 3},
                            {id: "5d6388cfdce164037cd0c624",
                                applyTimes: 2,
                                expiredInDay: 1,
                                festivalId: "11111111",
                                id: "5d63a59c16b5114bf21201fb",
                                rewardAmount: 100,
                                rewardType: 4,
                                spendingTimes: 0
                            },
                            {id: "5d6388cf913a60b5e296bfb5", rewardType: 5},
                            {id: "5d6388cf1e799d9ffa5e7206", rewardType: 6}
                        ]
                    }
                ]
            },
            condition : {
                    app: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
                    applyType: "1",
                    backStage: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
                    code: "testsp3",
                    h5: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
                    imageUrl: [""],
                    interval: "7",
                    name: "testsp3",
                    showInRealServer: true,
                    topUpCountType: ["1", 0],
                    validEndTime: "2023-04-01T07:22:56.033Z",
                    validStartTime: "2014-01-01T07:22:56.013Z",
                    web: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}}
            },
            executeProposal: proposalTypeId
        };

        // let eventData = {
        //    adminName: 'admin',
        //    action: 'createRewardEvent',
        //    data:
        //    { platform: testPlatformObjId,
        //         type: typeProm._id,
        //         condition: {
        //             app: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
        //             applyType: "1",
        //             backStage: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
        //             code: "testsp3",
        //             h5: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
        //             imageUrl: [""],
        //             interval: "7",
        //             name: "testsp3",
        //             showInRealServer: true,
        //             topUpCountType: ["1", 0],
        //             validEndTime: "2023-04-01T07:22:56.033Z",
        //             validStartTime: "2014-01-01T07:22:56.013Z",
        //             web: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}}
        //         },
        //         param: {
        //             rewardParam: [
        //                 {
        //                     levelId: "57ff08433f8838c63a7f8372",
        //                     value: [
        //                         {id: "5d6388cfaed4cb0c7bf33d35", rewardType: 1},
        //                         {id: "5d6388cf1967f8f941b03ab4", rewardType: 2},
        //                         {id: "5d6388cf30bd154e57564234", rewardType: 3},
        //                         {id: "5d6388cfdce164037cd0c624", rewardType: 4},
        //                         {id: "5d6388cf913a60b5e296bfb5", rewardType: 5},
        //                         {id: "5d6388cf1e799d9ffa5e7206", rewardType: 6}
        //                     ]
        //                 }
        //             ]
        //         },
        //         name: 'testsp3',
        //         code: 'testsp3',
        //         showInRealServer: true,
        //         validStartTime: '2015-01-01T06:45:48.045Z',
        //         validEndTime: '2022-12-02T06:45:48.065Z',
        //         display: [] } ,
        // }
        let testRewardEvent = await commonTestFun.createRewardEvent(eventData);
        console.log(JSON.stringify(testRewardEvent._doc.param.rewardParam));
        testRewardEvent.should.have.property('_id');
        testRewardEventNameCode = testRewardEvent.code;

        // create a connection
        client.connect();
        let clientOpenProm = () => {
            return new Promise(res => {
                client.addEventListener("open", function () {
                    res();
                });
            });
        }
        await clientOpenProm()
    });

    let apiCreatedPlayer;
    before(function(done) {
        const newPlayerData = {
            name: testNewPlayerName,
            platformId: testPlatformId,
            phoneNumber: testPhoneNumber,
            captcha: 'testCaptcha',
            password: "123456",
            lastLoginIp: "192.168.3.22",
            email: "testPlayer123@gmail.com",
            isTestPlayer: true
        };
        clientPlayerAPITest.create(function(data) {
            apiCreatedPlayer = data;
            testNewPlayerId = data.data.playerId;
            done();
        }, newPlayerData);
    })

    it('Should create a test player', function(done) {
        console.log('testNewPlayerName',testNewPlayerName)
        apiCreatedPlayer.data.name.should.endWith(testNewPlayerName);
        done();
    });

    // NOTE:: move the dependency out of 'it' so you can run each 'it' test individually while still not having dependency issue
    let apiLoginPlayer;
    before(function (done) {
        const testPlayerLoginData = {
            name: testPlayerName,
            password: "123456",
            lastLoginIp: "192.168.3.22",
            platformId: testPlatformId
        };
        clientPlayerAPITest.login(function (data) {
            token = data.token;
            apiLoginPlayer = data;
            done();
        }, testPlayerLoginData);
    });


    it('Should check whether referral reward group is applicable', function (done) {
        return dbPlayerInfo.applyRewardEvent(null, testPlayerId, testRewardEventNameCode, {})
        .then(
            function (applyTestReferralReward) {
                // applyTestReferralReward.should.have.property('rewardAmount');
                // applyTestReferralReward.rewardAmount.should.equal(checkReferralRewardAmount);
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    after(async function () {
        // remove all test data
        let removeTestDataProm = commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]);
        let removeTestProposalData = commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]);
        let finished = await Promise.all([removeTestDataProm, removeTestProposalData]);

        //
        client.disconnect();
    });

    //notifyNewMail
    //sendPlayerMailFromPlayerToAdmin

});
