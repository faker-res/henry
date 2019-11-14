const should = require('chai').should();

var WebSocketClient = require('../server_common/WebSocketClient');

var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbProposalType = require('../db_modules/dbProposalType');
let dbRewardType = require('../db_modules/dbRewardType');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');
const constProposalType = require('../const/constProposalType');
const constRewardType = require('../const/constRewardType');
const dbUtility = require("../modules/dbutility");

var testPlayerName = null;
var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
let date = new Date().getTime();
let testRewardEventNameCode = "";
let festivalItemId;
let rewardData = {};

function hex (value) {
  return Math.floor(value).toString(16)
}
// generate a objectId for edit random reward item.
function createObjectId() {
  return hex(Date.now() / 1000) +
    ' '.repeat(16).replace(/./g, () => hex(Math.random() * 16))
}


describe("Test Client API - Player service", function () {

    let client = new WebSocketClient(env.clientAPIServerUrl);

    // NOTE :: if you return promise (or use async/await), you do not need to call done(). An exception will occur if you do it
    // however, if you use promise(or any sort of async programming) without return promise, done() is necessary to tell mocha that the script is finished
    before(async function () {
        //create test platform
        let testPlatform = await commonTestFun.createTestPlatform();
        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        let testPlayer = await commonTestFun.createTestPlayer(testPlatformObjId, true);
        testPlayerName = testPlayer.name;
        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;

        // get test proposal type
        typeName = constProposalType.PLAYER_FESTIVAL_REWARD_GROUP;
        let proposalType = await dbProposalType.getProposalType({platformId: testPlatformObjId, name: typeName});
        proposalType.should.have.property('_id');
        proposalTypeId = proposalType._id;

        // get test reward type
        let testGetRewardType = await dbRewardType.getRewardType({name: constRewardType.PLAYER_FESTIVAL_REWARD_GROUP});
        testGetRewardType.should.have.property('_id');
        testRewardTypeId = testGetRewardType._id;

        festivalItemId = createObjectId();
        rewardData = { festivalItemId: festivalItemId };
        let eventName = "testEvent" + date;
        let eventData = {
            name: eventName,
            code: new Date().getTime(),
            platform: testPlatformObjId,
            type: testGetRewardType,
            param: {
                rewardParam: [
                    {
                        levelId: testPlayer.playerLevel,
                        value: [
                            {
                                id: festivalItemId,
                                applyTimes: 2,
                                expiredInDay: 1,
                                festivalId: "11111111",
                                rewardAmount: 100,
                                rewardType: 4,
                                spendingTimes: 0
                            }
                        ]
                    }
                ]
            },
            condition : {
                    app: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
                    applyType: "1",
                    backStage: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
                    h5: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
                    imageUrl: [""],
                    interval: "7",
                    showInRealServer: true,
                    topUpCountType: ["1", 0],
                    validEndTime: dbUtility.getTodaySGTime().endTime,
                    validStartTime: dbUtility.getTodaySGTime().startTime,
                    web: {visibleFromHomePage: {}, visibleFromRewardEntry: {}, visibleFromRewardList: {}},
                    festivalType: 1
            },
            executeProposal: proposalTypeId
        };

        let testRewardEvent = await commonTestFun.createRewardEvent(eventData);
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

    it('Should check whether festival reward group is applicable', function (done) {
        dbPlayerInfo.applyRewardEvent(null, testPlayerId, testRewardEventNameCode, rewardData).then(
            () => {
                done();
            },
            (error) => {
                console.error(error);
                done(error);
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

});
