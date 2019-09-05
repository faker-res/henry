const should = require('should');
const commonTestFunc = require('../test_modules/commonTestFunc');
const constRewardType = require("../const/constRewardType");
const dbConfig = require('../modules/dbproperties');
const dbUtility = require("../modules/dbutility");
const dbRewardEvent = require('../db_modules/dbRewardEvent');
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
    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;
    let testPlatformPlayerLevelId = null;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;
    let playerTopUpReturnGroupRewardTypeId = null;
    let playerTopUpReturnGroupRewardEvent = null;
    let rewardData = {};

    let createPlayerTopUpReturnData = {
        //"platform": testPlatformObjId,
        //"type": playerTopUpReturnGroupRewardTypeId,
        "name" : "rewardName" + date,
        "code" : "rewardCode" + date,
        "validStartTime" : dbUtility.getTodaySGTime().startTime,
        "validEndTime" : dbUtility.getTodaySGTime().endTime,
        //"executeProposal": proposalTypeId,
        "settlementPeriod" : "2",
        "needSettlement" : false,
        "param" : {
            "countInRewardInterval" : 1,
            "rewardParam" : [
                {
                    "value" : [
                        {
                            "minTopUpAmount" : 100,
                            "rewardPercentage" : 1,
                            "maxRewardInSingleTopUp" : 888,
                            "forbidWithdrawAfterApply" : false,
                            "spendingTimes" : 10
                        }
                    ]//,
                    // "levelId" : testPlatformPlayerLevelId
                }
            ]
        },
        "condition" : {
            "backStage" : {
                "visibleFromRewardList" : {},
                "visibleFromRewardEntry" : {},
                "visibleFromHomePage" : {}
            },
            "web" : {
                "visibleFromRewardList" : {},
                "visibleFromRewardEntry" : {},
                "visibleFromHomePage" : {}
            },
            "h5" : {
                "visibleFromRewardList" : {},
                "visibleFromRewardEntry" : {},
                "visibleFromHomePage" : {}
            },
            "app" : {
                "visibleFromRewardList" : {},
                "visibleFromRewardEntry" : {},
                "visibleFromHomePage" : {}
            },
            "name" : "rewardName" + date,
            "code" : "rewardCode" + date,
            "applyType" : "1",
            "imageUrl" : [
                "hm/NNew/NewPC/promo/slotFirstDeposit100%25/promoBanner.jpg"
            ],
            "canApplyFromClient" : true,
            "showInRealServer" : false,
            "isIgnoreAudit" : 887,
            "validEndTime" : dbUtility.getTodaySGTime().endTime,
            "validStartTime" : dbUtility.getTodaySGTime().startTime,
            "interval" : "5",
            "topUpCountType" : [
                "1",
                1
            ],
            "isDynamicRewardAmount" : true,
            "isSharedWithXIMA" : true
        },
        "canApplyFromClient" : true,
        "needApply" : false
    };

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

        // create test player
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

    before(async function () {
        let proposalType = await dbProposalType.getProposalType({platformId: testPlatformObjId, name: eventTypeName});
        proposalType.should.have.property('_id');
        proposalTypeId = proposalType._id;

        let proposalTypeProcess = await dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformObjId, name: eventTypeName});
        proposalTypeProcess.should.have.property('_id');
        proposalTypeProcessId = proposalTypeProcess._id;

        let playerTopUpReturnGroupRewardType = await dbConfig.collection_rewardType.findOne({name: eventTypeName}).lean();
        playerTopUpReturnGroupRewardType.should.have.property('_id');
        playerTopUpReturnGroupRewardTypeId = playerTopUpReturnGroupRewardType._id;

        let testPlatformPlayerLevel = await dbConfig.collection_playerLevel.findOne({platform: testPlatformObjId, value: 0}).lean();
        testPlatformPlayerLevel.should.have.property('_id');
        testPlatformPlayerLevelId = testPlatformPlayerLevel._id;
    });

    it('Should create reward event player top up return group', function (done) {
        createPlayerTopUpReturnData.type = playerTopUpReturnGroupRewardTypeId;
        createPlayerTopUpReturnData.executeProposal = proposalTypeId;
        createPlayerTopUpReturnData.param.rewardParam[0].levelId = testPlatformPlayerLevelId;
        createPlayerTopUpReturnData.platform = testPlatformObjId;
        commonTestFunc.createRewardEvent(createPlayerTopUpReturnData).then(
            () => {
                done();
            },
            (error) => {
                console.error(error);
                done(error);
            }
        )
    });

    it('Should get player top up return group reward event', function (done) {
        dbRewardEvent.getRewardEvent({
            platform: testPlatformObjId,
            type: playerTopUpReturnGroupRewardTypeId
        }).then(
            (rewardEvent) => {
                if (rewardEvent) {
                    playerTopUpReturnGroupRewardEvent = rewardEvent;
                    done();
                } else {
                    done('Player top up return group reward event not found');
                }
            },
            (error) => {
                console.error(error);
                done(error);
            }
        )
    });

    it('Should create player top up record', function (done) {
        commonTestFunc.createTopUpRecord(testPlayerObjId, testPlatformObjId).then(
            (data) => {
                rewardData.topUpRecordId = data._id;
                done();

            },
            (error) => {
                console.error(error);
                done(error);
            });
        }
    );

    it('Should apply player top up return group reward event', function (done) {
        dbPlayerInfo.applyRewardEvent("", testPlayer.playerId, createPlayerTopUpReturnData.code, rewardData).then(
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
        let removeTestDataProm = commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]);
        let removeTestProposalData = commonTestFunc.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]);
        await Promise.all([removeTestDataProm, removeTestProposalData]);

        // close connection
        client.disconnect();
    });
});