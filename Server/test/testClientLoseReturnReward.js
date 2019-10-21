var should = require('chai').should();
var dbconfig = require('../modules/dbproperties');

var WebSocketClient = require('../server_common/WebSocketClient');
var PlayerService = require('../services/client/ClientServices').PlayerService;
var RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;
var TopUpIntentionService = require('../services/client/ClientServices').TopUpIntentionService;
var ConsumptionService = require('../services/client/ClientServices').ConsumptionService;
var RewardService = require('../services/client/ClientServices').RewardService;
var ProviderConsumptionService = require('../services/provider/ProviderServices').ConsumptionService;

var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');
var ClientRewardAPITest = require('../testAPI/clientAPITest/ClientRewardAPITest');
var ProviderConsumptionAPITest = require('../testAPI/providerAPITest/ConsumptionAPITest');


var dbProposal = require('../db_modules/dbProposal');
var constProposalType = require('../const/constProposalType');
var constRewardType = require('../const/constRewardType');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');


var testPlayer = null;
var testPlayerName = null;
var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var token = null;
let rewardCode = "testlosecode";
let rewardName = "testlose";
let rewardAmount = 200;

describe("Test Client API - reward(PlayerLoseReturnRewardGroup) service", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);
    var provider = new WebSocketClient(env.providerAPIServerUrl);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    var registrationIntentionService = new RegistrationIntentionService();
    client.addService(registrationIntentionService);

    var topUpIntentionService = new TopUpIntentionService();
    client.addService(topUpIntentionService);

    var consumptionService = new ConsumptionService();
    client.addService(consumptionService);

    var rewardService = new RewardService();
    client.addService(rewardService);
    var clientRewardAPITest = new ClientRewardAPITest(rewardService);

    var providerConsumptionService = new ProviderConsumptionService();
    provider.addService(providerConsumptionService);
    var providerConsumptionAPITest = new ProviderConsumptionAPITest(providerConsumptionService);

    // NOTE :: if you return promise (or use async/await), you do not need to call done(). An exception will occur if you do it
    // however, if you use promise(or any sort of async programming) without return promise, done() is necessary to tell mocha that the script is finished
    before(async function () {
        //create test platform
        let testPlatform = await commonTestFun.createTestPlatform();
        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        testPlayer = await commonTestFun.createTestPlayer(testPlatformObjId);
        testPlayerName = testPlayer.name;
        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;

        // create a connection
        client.connect();
        let clientOpenProm = () => {
            return new Promise(res => {
                client.addEventListener("open", function () {
                    res();
                });
            });
        }
        await clientOpenProm();

        provider.connect();
        let providerOpenProm = () => {
            return new Promise(res => {
                provider.addEventListener("open", function () {
                    res();
                });
            });
        }
        await providerOpenProm();
    });

    // let apiCreatedPlayer;
    before(async function() {
        let proposalType = await dbconfig.collection_proposalType.findOne({platformId: testPlatformObjId, name: constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP}).lean();
        if (!proposalType) {
            return Promise.reject("Cannot find proposal type");
        }
        let rewardType = await dbconfig.collection_rewardType.findOne({name: constRewardType.PLAYER_LOSE_RETURN_REWARD_GROUP}).lean();
        if (!rewardType) {
            return Promise.reject("Cannot find reward type");
        }

        let rewardEventData = {
            platform: testPlatformObjId,
            type: rewardType._id,
            name: rewardName,
            code: rewardCode,
            executeProposal: proposalType._id,
            condition: {
                app: {
                    visibleFromHomePage: {},
                    visibleFromRewardEntry: {},
                    visibleFromRewardList: {},
                },
                applyType: "1",
                backStage: {
                    visibleFromHomePage: {},
                    visibleFromRewardEntry: {},
                    visibleFromRewardList: {},
                },
                code: rewardCode,
                defineLoseValue: "3",
                h5: {
                    visibleFromHomePage: {},
                    visibleFromRewardEntry: {},
                    visibleFromRewardList: {},
                },
                imageUrl: [""],
                interval: "1",
                name: rewardName,
                showInRealServer: true,
                web: {
                    visibleFromHomePage: {},
                    visibleFromRewardEntry: {},
                    visibleFromRewardList: {}
                }
            },
            param: {
                isMultiStepReward: false,
                rewardParam: [
                    {
                        levelId: testPlayer.playerLevel,
                        value: [
                            {
                                minDeposit: 100,
                                minLoseAmount: 100,
                                rewardAmount: rewardAmount,
                                spendingTimes: 2
                            }
                        ]
                    }
                ]

            },
            showInRealServer: true
        }
        let rewardEvent = await dbconfig.collection_rewardEvent(rewardEventData).save();
        if (!rewardEvent) {
            return Promise.reject("Create reward event failed");
        }


        let newProposal = {
            creator: {type: "player", name: testPlayer.name, id: testPlayer._id},
            data: {
                playerId: testPlayerId,
                playerObjId: testPlayerObjId,
                playerLevel: testPlayer.playerLevel,
                playerRealName: testPlayer.realName,
                platform: testPlatformId,
                realName: testPlayer.realName,
                amount: 100,
                bPMSGroup: false,
                depositeTime: new Date()
            }
        }
        let topupProposal = await dbProposal.createProposalWithTypeName(testPlatformObjId, constProposalType.PLAYER_ALIPAY_TOP_UP, newProposal);
        if (!topupProposal) {
            return Promise.reject("create proposal fail")
        }
        await dbProposal.updateTopupProposal(topupProposal.proposalId, "Success", "1212132434", "1", "", {});

    })


    // NOTE:: move the dependency out of 'it' so you can run each 'it' test individually while still not having dependency issue
    before(function (done) {
        let consumptionData = {
            "userName": testPlayerName,
            "platformId": testPlatformId,
            "providerId": "18",
            "gameId": "024E509C-A28F-4F77-9BCF-3B513D83DF92",
            "code": "drd",
            "amount": 200,
            "validAmount": 200,
            "bonusAmount": -200,
            "cpGameType": "电子"
        }
        providerConsumptionAPITest.addConsumption(
            function (data) {
                if (data.status == 200) {
                    done();
                }
            },
            consumptionData
        )
    });

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


    it('Should login correct apiUser successfully', function(done) {
        apiLoginPlayer.data.name.should.equal(testPlayerName);
        done();
    });


    it('Should apply reward event successfully', function(done) {
        const testApplyRewardData = {
            code: rewardCode,
            data: {
                topUpRecordIds: [null]
            },
        };
        clientRewardAPITest.applyRewardEvent(function (data) {
            data.data.rewardAmount.should.equal(rewardAmount)
            done();
        }, testApplyRewardData);
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