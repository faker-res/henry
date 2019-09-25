const should = require('chai').should();

let WebSocketClient = require('../server_common/WebSocketClient');
let PlayerService = require('../services/client/ClientServices').PlayerService;
let GameService = require('../services/client/ClientServices').GameService;

let ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');
let ClientGameAPITest = require('../testAPI/clientAPITest/ClientGameAPITest');

let constRewardPointsTaskCategory = require('../const/constRewardPointsTaskCategory');
let constIntervalPeriod = require('../const/constIntervalPeriod');
let constRewardApplyType = require('../const/constRewardApplyType');

let env = require("../config/env").config();
let commonTestFun = require('../test_modules/commonTestFunc');

let testPlayerName = null;
let testPlatformObjId = null;
let testPlatformId = null;
let testPlayerObjId = null;
let testPlayerId = null;
let testPlayerLevel = null;
let rewardPointEventData = {};

describe("Test Client API - Reward Point service", function () {

    let client = new WebSocketClient(env.clientAPIServerUrl);

    let playerService = new PlayerService();
    client.addService(playerService);

    let gameService = new GameService();
    client.addService(gameService);

    let clientPlayerAPITest = new ClientPlayerAPITest(playerService);
    let clientGameAPITest = new ClientGameAPITest(gameService);

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
        testPlayerLevel = testPlayer.playerLevel;

        let rewardPointsLvlConfigData = {
            platformObjId: testPlatformObjId,
            intervalPeriod: constIntervalPeriod.DAILY,
            customPeriodEndTime: null,
            customPeriodStartTime: null,
            applyMethod: constRewardApplyType.AUTO_APPLY,
            params: [
                {
                    levelObjId: testPlayerLevel,
                    dailyMaxPoints: 99999,
                    pointToCreditManualRate: 10,
                    pointToCreditManualMaxPoints: 30000,
                    pointToCreditAutoRate: 20,
                    pointToCreditAutoMaxPoints: 90000,
                    spendingAmountOnReward: 1
                },
            ],
        };
        let testRewardPointsLvlConfig = await commonTestFun.upsertRewardPointsLvlConfig(rewardPointsLvlConfigData);

        // create a connection
        client.connect();
        let clientOpenProm = () => {
            return new Promise(res => {
                client.addEventListener("open", function () {
                    res();
                });
            });
        };
        await clientOpenProm();
    });

    describe("Test Login Reward Points Event", function() {
        before(async function () {
            rewardPointEventData = {
                rewardTitle: "test LOGIN_REWARD_POINTS rewardPointEvent",
                level: testPlayerLevel,
                platformObjId: testPlatformObjId,
                category: constRewardPointsTaskCategory.LOGIN_REWARD_POINTS,
                period: constIntervalPeriod.DAILY,
                consecutiveCount: 1,
                rewardPoints: 10,
                status: true,
            };
            // create LOGIN_REWARD_POINTS
            let testRewardPointsEvent = await commonTestFun.createTestRewardPointsEvent(rewardPointEventData);
        });

        it('Should get reward points after logging into platform', function (done) {
            const testPlayerLoginData = {
                name: testPlayerName,
                password: "123456",
                lastLoginIp: "192.168.3.22",
                platformId: testPlatformId
            };
            const testPlayerGetData = {
                playerId: testPlayerId
            };
            clientPlayerAPITest.login(function () {
                clientPlayerAPITest.get(function (data) {
                    data.data.userCurrentPoint.should.equal(rewardPointEventData.rewardPoints);
                    done();
                }, testPlayerGetData);
            }, testPlayerLoginData);
        });

        // it('Should get reward points after logging into game', function (done) {
        //     const testPlayerLoginData = {
        //         name: testPlayerName,
        //         password: "123456",
        //         lastLoginIp: "192.168.3.22",
        //         platformId: testPlatformId
        //     };
        //     const testGameGetLoginUrlData = {
        //         gameId: "19D207EB-C09C-4E87-8CFE-0C0DF71CE232",
        //         clientDomainName: "buyuwang.com"
        //     };
        //     const testPlayerGetData = {
        //         playerId: testPlayerId
        //     };
        //     clientPlayerAPITest.login(function (data1) {
        //         console.log("data1.data.name", data1.data.name);
        //         console.log("data1.data.playerId", data1.data.playerId);
        //         clientGameAPITest.getLoginURL(function(data2) {
        //             console.log("data2", data2);
        //             clientPlayerAPITest.get(function (data) {
        //                 console.log("userCurrentPoint",data.data.userCurrentPoint);
        //                 console.log("playerId",data.data.playerId);
        //                 data.data.userCurrentPoint.should.equal(rewardPointEventData.rewardPoints);
        //                 done();
        //             }, testPlayerGetData);
        //         }, testGameGetLoginUrlData);
        //     }, testPlayerLoginData);
        // });
    });

    after(async function () {
        // remove all test data
        await commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]);

        // close connection
        client.disconnect();
    });
});
