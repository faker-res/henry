"use strict";

let Q = require("q");
let should = require('should');
let dbConfig = require('../modules/dbproperties');
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


describe("Test referral reward group", function () {

    let typeName = constProposalType.REFERRAL_REWARD_GROUP;
    let proposalTypeId = null;
    let proposalTypeProcessId = null;

    let testPlatformObjId = null;
    let testPlatformId = null;

    let testReferralPlayerObjId = null;
    let testReferralPlayerId = null;

    let testRefereePlayerObjId = null;

    let step1DepartmentId = null;
    let step1AdminId = null;
    let step1AdminName = null;
    let step1RoleId = null;
    let stepType1Name = null;
    let stepType1Id = null;
    let testRewardTypeId = null;
    let testRewardEventNameCode = "";

    let testGame;
    let testProviderObjId;

    let date = new Date().getTime();

    it('Should create test API player and platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;

                // update referral reward config
                let updateReferralConfig = {
                    query: {platform: testPlatformObjId},
                    updateData: {
                        enableUseReferralPlayerId: Boolean(true),
                        referralPeriod: "1",
                        referralLimit: 10
                    }
                };

                return dbPlatform.updateReferralConfig(updateReferralConfig.query, updateReferralConfig.updateData)
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                //create player - referral
                return commonTestFunc.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (referralData) {
                testReferralPlayerObjId = referralData._id;
                testReferralPlayerId = referralData.playerId;

                //create player - referee
                return commonTestFunc.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (refereeData) {
                testRefereePlayerObjId = refereeData._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });


    it('Should get Referral Reward Group proposal type id and proposal type process id', function (done) {
        let typeProm = dbProposalType.getProposalType({platformId: testPlatformObjId, name: typeName});
        let typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformObjId, name: typeName});
        Q.all([typeProm, typeProcessProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    data[0].name.should.equal(typeName);
                    data[1].name.should.equal(typeName);
                    proposalTypeId = data[0]._id;
                    proposalTypeProcessId = data[1]._id;
                    done();
                }
                else {
                    console.log(data);
                }
            }
        ).catch(
            function (error) {
                console.log(error);
            }
        );
    });

    it('Should create test department', function (done) {
        commonTestFunc.createTestDepartment().then(
            function (data) {
                step1DepartmentId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create related admin users and roles', function (done) {
        commonTestFunc.createTestAdminWithRole(step1DepartmentId).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    step1AdminId = data[0]._id;
                    step1AdminName = data[0].adminName;

                    step1RoleId = data[1]._id;
                    done();
                }
                else {
                    console.log(data);
                }
            }
        ).catch(
            function (error) {
                console.log(error);
            }
        );
    });

    it('attach users to roles', function (done) {
        let prom1 = dbRole.attachRolesToUsersById([step1AdminId], [step1RoleId]);
        prom1.then(
            function (data) {
                if (data) {
                    done();
                }
                else {
                    console.log(data);
                }
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('create test proposal type process steps', function (done) {
        stepType1Name = "testStepType1" + date;
        let prom1 = dbProposalTypeProcessStep.createProposalTypeProcessStep(
            {title: stepType1Name, department: step1DepartmentId, role: step1RoleId}
        );

        prom1.then(
            function (data) {
                if (data) {
                    data.title.should.equal(stepType1Name);
                    stepType1Id = data._id;
                    done();
                }
                else {
                    console.log(data);
                }
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('link type steps and add them to type process', function (done) {
        let processProm = dbProposalTypeProcess.addStepToProcess(proposalTypeProcessId, [stepType1Id]);
        processProm.then(
            function (data) {
                if (data) {
                    done();
                }
                else {
                    console.log(data);
                }
            },
            function (error) {
                console.log(error);
            }
        );
    });

    it('get test reward type', function (done) {
        dbRewardType.getRewardType({name: constRewardType.REFERRAL_REWARD_GROUP}).then(
            function(data){
                testRewardTypeId = data._id;
                done();
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('create test reward event', function (done) {
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
                forbidApplyReward : []
            },
            executeProposal: proposalTypeId
        };
        dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testRewardEventNameCode = data.code;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should bind referral', function (done) {
        let updateData = {
            referral: testReferralPlayerObjId,
            remark: '推荐人',
            _id: testRefereePlayerObjId
        }

        let updateQuery = {
            creator: {type: "admin", name: step1AdminName, id: step1AdminId},
            data: updateData,
            platformId: testPlatformObjId
        };

        dbProposal.createProposalWithTypeNameWithProcessInfo(testPlatformObjId, constProposalType.UPDATE_PLAYER_INFO, updateQuery).then(
            function (data) {
                console.log('data ==>', data)
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('check bind referral', function (done) {
        dbConfig.collection_referralLog.findOne({platform: testPlatformObjId}).then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });


    it('Should create test provider and game and add consumption', function (done) {
        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testProviderObjId = data._id;
                return commonTestFunc.createGame(testProviderObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (game) {
                testGame = game;

                // Create Consumption Record
                let consumptionRecordData = {
                    "playerId" : testRefereePlayerObjId,
                    "platformId" : testPlatformObjId,
                    "providerId": testProviderObjId,
                    "gameId": testGame._id,
                    "insertTime": new Date(),
                    "gameType": testGame.type,
                    "amount": 1000,
                    "validAmount": 1000,
                    "bonusAmount": 1000,
                    "createTime": new Date(),
                    "orderNo": new Date().getTime()+Math.random()
                };

                return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(consumptionRecordData);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function(data){
                done();
            },
            function(error){
                console.error(error);
            }
        );
    });

    it('check referral reward applicable', function (done) {
        dbRewardEvent.getRewardApplicationData(testReferralPlayerObjId, testPlatformId, testRewardEventNameCode).then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('check referral reward applicable', function (done) {
        dbPlayerInfo.applyRewardEvent(null, testReferralPlayerId, testRewardEventNameCode, {}).then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });


    it('Should remove test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testReferralPlayerObjId, testRefereePlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([step1RoleId] , testPlatformObjId, [proposalTypeId], [testReferralPlayerObjId, testRefereePlayerObjId]).then(function(data){
            done();
        })
    });

});
