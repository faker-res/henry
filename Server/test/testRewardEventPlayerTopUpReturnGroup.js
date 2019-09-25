const should = require('chai').should();
const commonTestFunc = require('../test_modules/commonTestFunc');
const constRewardType = require("../const/constRewardType");
const dbConfig = require('../modules/dbproperties');
const dbUtility = require("../modules/dbutility");
const dbRewardEvent = require('../db_modules/dbRewardEvent');
const dbRewardType = require('../db_modules/dbRewardType');
const dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');
const dbProposalType = require('../db_modules/dbProposalType');
const dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
const env = require("../config/env").config();
const WebSocketClient = require('../server_common/WebSocketClient');
const client = new WebSocketClient(env.clientAPIServerUrl);
const eventTypeName = constRewardType.PLAYER_TOP_UP_RETURN_GROUP;
const date = new Date().getTime();

describe("Test reward event: Player top up return group", function () {
    let testPlayer = null;
    let testPlayerObjId = null;
    let testPlayerId = null;
    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;
    let testPlatformPlayerLevelId = null;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;
    let playerTopUpReturnGroupRewardTypeId = null;
    let playerTopUpReturnGroupRewardEventCode = null;
    let rewardData = {};
    let checkRewardAmount = null;

    before(async function () {
        //create test platform
        testPlatform = await commonTestFunc.createTestPlatform();
        testPlatform.should.have.property('_id');
        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        testPlayer = await commonTestFunc.createTestPlayer(testPlatformObjId);
        testPlayer.should.have.property('_id');
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
        };
        await clientOpenProm();
    });

    describe("Test player top up group reward", function () {
        before(async function () {
            let proposalType = await dbProposalType.getProposalType({platformId: testPlatformObjId, name: eventTypeName});
            proposalType.should.have.property('_id');
            proposalTypeId = proposalType._id;

            let proposalTypeProcess = await dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformObjId, name: eventTypeName});
            proposalTypeProcess.should.have.property('_id');
            proposalTypeProcessId = proposalTypeProcess._id;

            // add reward type
            let rewardTypeData = {
                "isGrouped": true,
                "des": eventTypeName,
                "name": eventTypeName
            };
            await commonTestFunc.createRewardType(eventTypeName, rewardTypeData);

            let playerTopUpReturnGroupRewardType = await dbRewardType.getRewardType({name: eventTypeName});
            playerTopUpReturnGroupRewardType.should.have.property('_id');
            playerTopUpReturnGroupRewardTypeId = playerTopUpReturnGroupRewardType._id;

            let testPlatformPlayerLevel = await dbConfig.collection_playerLevel.findOne({platform: testPlatformObjId, value: 0}).lean();
            testPlatformPlayerLevel.should.have.property('_id');
            testPlatformPlayerLevelId = testPlatformPlayerLevel._id;

            let createPlayerTopUpReturnData = {
                platform: testPlatformObjId,
                type: playerTopUpReturnGroupRewardTypeId,
                name : "rewardName" + date,
                code : "rewardCode" + date,
                validStartTime : dbUtility.getTodaySGTime().startTime,
                validEndTime : dbUtility.getTodaySGTime().endTime,
                executeProposal: proposalTypeId,
                settlementPeriod : "2",
                needSettlement : false,
                param : {
                    countInRewardInterval : 1,
                    rewardParam : [
                        {
                            value : [
                                {
                                    minTopUpAmount : 100,
                                    rewardPercentage : 1,
                                    maxRewardInSingleTopUp : 888,
                                    forbidWithdrawAfterApply : false,
                                    spendingTimes : 10
                                }
                            ],
                            levelId : testPlatformPlayerLevelId
                        }
                    ]
                },
                condition : {
                    name : "rewardName" + date,
                    code : "rewardCode" + date,
                    applyType : "1",
                    canApplyFromClient : true,
                    showInRealServer : false,
                    isIgnoreAudit : 887,
                    validEndTime : dbUtility.getTodaySGTime().endTime,
                    validStartTime : dbUtility.getTodaySGTime().startTime,
                    interval : "5",
                    topUpCountType : [
                        "1",
                        1
                    ],
                    isDynamicRewardAmount : true,
                    isSharedWithXIMA : true
                },
                canApplyFromClient : true,
                needApply : false
            };

            let testRewardEvent = await dbRewardEvent.createRewardEvent(createPlayerTopUpReturnData);
            testRewardEvent.should.have.property('_id');
            playerTopUpReturnGroupRewardEventCode = testRewardEvent.code;

            let topUpData = {
                playerId: testPlayerObjId,
                platformId: testPlatformObjId,
                amount: 500,
                createTime: new Date(),
                topUpType: "1"
            };

            let topup = await dbPlayerTopUpRecord.createPlayerTopUpRecord(topUpData);
            rewardData.topUpRecordId = topup._id;
        });

        it('Should check whether player top up return group reward event is applicable', function (done) {
            dbRewardEvent.getRewardApplicationData(testPlayerObjId, testPlatformId, playerTopUpReturnGroupRewardEventCode).then(
                checkTestRewardEvent => {
                    checkTestRewardEvent.should.have.property('result');
                    checkTestRewardEvent.result.should.have.property('rewardAmount');

                    checkRewardAmount = checkTestRewardEvent.result.rewardAmount;

                    return dbPlayerInfo.applyRewardEvent(null, testPlayerId, playerTopUpReturnGroupRewardEventCode, rewardData);
                },
                error => {
                    console.error(error);
                }
            ).then(
                applyTestReward => {
                    applyTestReward.should.have.property('rewardAmount');
                    applyTestReward.rewardAmount.should.equal(checkRewardAmount);
                    done();
                },
                error => {
                    console.error(error);
                }
            );
        });
    });

    after(async function () {
        // remove all test data
        let removeTestDataProm = commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]);
        let removeTestProposalData = commonTestFunc.removeTestProposalData([] , testPlatformObjId, [proposalTypeId], [testPlayerObjId]);
        await Promise.all([removeTestDataProm, removeTestProposalData]);

        // close connection
        client.disconnect();
    });
});