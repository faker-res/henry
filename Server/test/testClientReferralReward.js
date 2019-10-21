var should = require('chai').should();
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbRewardEvent = require('../db_modules/dbRewardEvent');
let dbRewardType = require('../db_modules/dbRewardType');
let dbPlatform = require('../db_modules/dbPlatform');
let dbProposal = require('../db_modules/dbProposal');
let dbProposalType = require('../db_modules/dbProposalType');
let dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
let dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
let dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
let commonTestFunc = require('../test_modules/commonTestFunc');
let dbRole = require('../db_modules/dbRole');

const constProposalType = require('../const/constProposalType');
const constRewardType = require('../const/constRewardType');
let env = require("../config/env").config();
let WebSocketClient = require('../server_common/WebSocketClient');

describe("Test reward group", function () {
    let typeName;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;

    let testPlatformObjId = null;
    let testPlatformId = null;

    let testPlayerObjId = null;
    let testPlayerId = null;

    let testPlayerObjId2 = null;
    let testPlayerId2 = null;

    let step1DepartmentId = null;
    let step1AdminId = null;
    let step1AdminName = null;
    let step1RoleId = null;
    let stepType1Name = null;
    let stepType1Id = null;
    let testRewardTypeId = null;
    let testRewardEventNameCode = "";

    let testGameData;
    let testProviderObjId;

    let date = new Date().getTime();

    let client = new WebSocketClient(env.clientAPIServerUrl);

    before(async function () {
        // create test platform
        let platformData = {usePointSystem: true, autoCheckPlayerLevelUp: false};
        let testPlatform = await commonTestFunc.createTestPlatform(platformData);
        testPlatform.should.have.property('_id');

        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player 1
        let testPlayer = await commonTestFunc.createTestPlayer(testPlatformObjId);
        testPlayer.should.have.property('_id');

        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;

        // create test player 2
        let testPlayer2 = await commonTestFunc.createTestPlayer(testPlatformObjId);
        testPlayer2.should.have.property('_id');

        testPlayerObjId2 = testPlayer2._id;
        testPlayerId2 = testPlayer2.playerId;

        // create test department
        let testDepartment = await commonTestFunc.createTestDepartment();
        testDepartment.should.have.property('_id');

        step1DepartmentId = testDepartment._id;

        // create test admin with role
        let testAdminWithRole = await commonTestFunc.createTestAdminWithRole(step1DepartmentId);
        testAdminWithRole[0].should.have.property('_id');
        testAdminWithRole[1].should.have.property('_id');

        step1AdminId = testAdminWithRole[0]._id;
        step1AdminName = testAdminWithRole[0].adminName;
        step1RoleId = testAdminWithRole[1]._id;

        // attach test roles to test users
        let testAttachRolesToUsers = await dbRole.attachRolesToUsersById([step1AdminId], [step1RoleId]);

        // create test provider
        let testGameProvider = await commonTestFunc.createTestGameProvider();
        testGameProvider.should.have.property('_id');

        testProviderObjId = testGameProvider._id;

        // create test game
        let testGame = await commonTestFunc.createGame(testProviderObjId);
        testGameData = testGame;

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
    });

    describe("Test referral reward group", function () {
        before(async function() {
            // test update referral reward config
            let updateReferralConfig = {
                query: {platform: testPlatformObjId},
                updateData: {
                    enableUseReferralPlayerId: Boolean(true),
                    referralPeriod: "1",
                    referralLimit: 10
                }
            };

            await dbPlatform.updateReferralConfig(updateReferralConfig.query, updateReferralConfig.updateData);

            // test get Referral Reward Group proposal type id and proposal type process id
            typeName = constProposalType.REFERRAL_REWARD_GROUP;
            let typeProm = dbProposalType.getProposalType({platformId: testPlatformObjId, name: typeName});
            let typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformObjId, name: typeName});
            let testProposalTypeAndProcess = await Promise.all([typeProm, typeProcessProm]);
            testProposalTypeAndProcess[0].name.should.equal(typeName);
            testProposalTypeAndProcess[1].name.should.equal(typeName);

            proposalTypeId = testProposalTypeAndProcess[0]._id;
            proposalTypeProcessId = testProposalTypeAndProcess[1]._id;

            // create test proposal type process steps
            stepType1Name = "testStepType1" + date;
            let testProposalTypeProcessSteps = await dbProposalTypeProcessStep.createProposalTypeProcessStep({title: stepType1Name, department: step1DepartmentId, role: step1RoleId});
            testProposalTypeProcessSteps.title.should.equal(stepType1Name);

            stepType1Id = testProposalTypeProcessSteps._id;

            // link type steps and add them to type process
            await dbProposalTypeProcess.addStepToProcess(proposalTypeProcessId, [stepType1Id]);

            // add reward type
            let rewardTypeData = {
                "isGrouped": true,
                "des": typeName,
                "name": typeName
            };
            await commonTestFunc.createRewardType(typeName, rewardTypeData);

            // get test reward type - referral reward group
            let testGetRewardType = await dbRewardType.getRewardType({name: constRewardType.REFERRAL_REWARD_GROUP});
            testGetRewardType.should.have.property('_id');

            testRewardTypeId = testGetRewardType._id;

            // create test reward event - referral reward event
            let eventName = "testEvent" + date;
            let eventData = {
                name: eventName,
                code: new Date().getTime(),
                platform: testPlatformObjId,
                type: testRewardTypeId,
                param: {
                    rewardParam: [
                        {
                            "value" : [
                                {
                                    "spendingTimes" : 10,
                                    "maxRewardAmount" : 100,
                                    "rewardPercentage" : 0.01,
                                    "playerValidConsumption" : 1000
                                }
                            ]
                        }
                    ]
                },
                condition : {
                    canApplyFromClient : true,
                    allowApplyAfterWithdrawal : false,
                    interval : '1',
                    isPlayerLevelDiff : false,
                    validEndTime : new Date(),
                    validStartTime : new Date().setDate(new Date().getDate() + 30),
                    applyType : '1',
                    forbidApplyReward : [],
                    referralRewardMode: "1",
                },
                executeProposal: proposalTypeId
            };
            let testRewardEvent = await dbRewardEvent.createRewardEvent(eventData);
            testRewardEvent.should.have.property('_id');
            testRewardEventNameCode = testRewardEvent.code;

            // bind test player 2 to test player 1
            let updateData = {
                referral: testPlayerObjId,
                remark: '推荐人',
                _id: testPlayerObjId2
            }

            let updateQuery = {
                creator: {type: "admin", name: step1AdminName, id: step1AdminId},
                data: updateData,
                platformId: testPlatformObjId
            };

            await dbProposal.createProposalWithTypeNameWithProcessInfo(testPlatformObjId, constProposalType.UPDATE_PLAYER_INFO, updateQuery);

            // Create Test Consumption Record
            let consumptionRecordData = {
                "playerId" : testPlayerObjId2,
                "platformId" : testPlatformObjId,
                "providerId": testProviderObjId,
                "gameId": testGameData._id,
                "insertTime": new Date(),
                "gameType": testGameData.type,
                "amount": 1000,
                "validAmount": 1000,
                "bonusAmount": 1000,
                "createTime": new Date(),
                "orderNo": new Date().getTime()+Math.random()
            };

            await dbPlayerConsumptionRecord.createPlayerConsumptionRecord(consumptionRecordData);
        });

        let checkReferralRewardAmount;
        it('Should check whether referral reward group is applicable', function (done) {
            dbRewardEvent.getRewardApplicationData(testPlayerObjId, testPlatformId, testRewardEventNameCode).then(
                function (checkTestReferralReward) {
                    checkTestReferralReward.should.have.property('result');
                    checkTestReferralReward.result.should.have.property('rewardAmount');

                    checkReferralRewardAmount = checkTestReferralReward.result.rewardAmount;

                    return dbPlayerInfo.applyRewardEvent(null, testPlayerId, testRewardEventNameCode, {});
                },
                function (error) {
                    console.error(error);
                }
            ).then(
                function (applyTestReferralReward) {
                    applyTestReferralReward.should.have.property('rewardAmount');
                    applyTestReferralReward.rewardAmount.should.equal(checkReferralRewardAmount);
                    done();
                },
                function (error) {
                    console.error(error);
                }
            );
        });
    });

    after(async function() {
        // remove all test data
        let removeTestDataProm = commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId, testPlayerObjId2]);
        let removeTestProposalDataProm = commonTestFunc.removeTestProposalData([step1RoleId] , testPlatformObjId, [proposalTypeId], [testPlayerObjId, testPlayerObjId2]);

        await Promise.all([removeTestDataProm, removeTestProposalDataProm]);

        client.disconnect();
    });

});
