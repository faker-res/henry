'use strict';

const should = require('should');

const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('./../const/constProposalType');

const dbAutoProposal = require('../db_modules/dbAutoProposal');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');
const dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');

const dbConfig = require('../modules/dbproperties');

let commonTestFunc = require('../test_modules/commonTestFunc');
/**
 * Case
 *  1:  Amount > Single withdrawal limit
 *  2:  Amount > Single day withdrawal limit
 *  3:  Player is forbidden
 *  4:  First time withdrawal
 *  5:  Situation A: topup > bonus
 *  6:  Situation B: Consumption amount < required consumption for reward
 */
describe("Test Auto Proposal - Apply Bonus", function () {

    // DISABLED FOR CSTEST
    // return true;

    let proposalTypeId = null;
    let testPlayerId = null;
    let testPlatformId = null;
    let step1RoleId;

    let testPlatformObj;
    let testPlayerObj;

    let proposalTypeObjId;
    let playerBonusProposalTypeObjId, playerTopUpProposalTypeObjId;

    it('Should create test API platform', function (done) {
        let platformData = {
            autoApproveWhenSingleBonusApplyLessThan: 300,
            autoApproveWhenSingleDayTotalBonusApplyLessThan: 500,
            autoApproveRepeatCount: 3,
            samePhoneNumberRegisterCount: 10
        };

        commonTestFunc.createTestPlatform(platformData).then(
            data => {
                testPlatformObj = data;
                testPlatformId = data._id;
                done();
            },
            error => {
                console.error(error);
            }
        );
    });

    it('Should get proposal types id', function (done) {
        dbConfig.collection_proposalType.findOne({
            platformId: testPlatformObj._id,
            name: constProposalType.PLAYER_BONUS
        }).lean().then(
            proposalType => {
                playerBonusProposalTypeObjId = proposalType._id;

                return dbConfig.collection_proposalType.findOne({
                    platformId: testPlatformObj._id,
                    name: constProposalType.PLAYER_TOP_UP
                }).lean();
            }
        ).then(
            proposalType => {
                playerTopUpProposalTypeObjId = proposalType._id;
                done();
            }
        )
    });

    it('Case 1: Amount > Single withdrawal limit', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                // Create bonus proposal
                let proposalData = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.PENDING,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 500,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    }
                };

                return commonTestFunc.createTestProposal(proposalData);
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            () => {
                setTimeout(() => {
                    return dbConfig.collection_proposal.findOne({
                        'data.platformId': testPlatformObj._id,
                        type: playerBonusProposalTypeObjId,
                        'data.playerObjId': testPlayerObj._id
                    }).then(
                        proposal => {
                            proposal.status.should.equal("Pending");
                            done();
                        }
                    )
                }, 200);
            }
        );
    });

    it('Case 2: Amount > Single day withdrawal limit', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                // Create top up proposal
                let proposalData1 = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.SUCCESS,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 280,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    },
                    createTime: Date.now()
                };

                let proposalData2 = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.PENDING,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 290,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    },
                    createTime: Date.now()
                };

                return Promise.all([
                    commonTestFunc.createTestProposal(proposalData1),
                    commonTestFunc.createTestProposal(proposalData2)]
                );
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            () => {
                setTimeout(() => {
                    return dbConfig.collection_proposal.findOne({
                        'data.platformId': testPlatformObj._id,
                        type: playerBonusProposalTypeObjId,
                        'data.playerObjId': testPlayerObj._id,
                        status: {$ne: constProposalStatus.SUCCESS}
                    }).then(
                        proposal => {
                            proposal.status.should.equal("Pending");
                            done();
                        }
                    )
                }, 200);
            }
        );
    });

    it('Case 3: Player is forbidden', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                return dbPlayerInfo.updatePlayerStatus(testPlayerObj._id, constPlayerStatus.FORBID, 'testing purpose', null, 'admin').then(
                    data => {
                        return dbConfig.collection_proposalType.findOne({
                            platformId: testPlatformObj._id,
                            name: constProposalType.PLAYER_BONUS
                        }).lean();
                    }
                );
            }
        ).then(
            proposalType => {
                proposalTypeObjId = proposalType._id;

                // Create top up proposal
                let proposalData1 = {
                    type: proposalTypeObjId,
                    status: constProposalStatus.PENDING,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 280,
                        playerStatus: constPlayerStatus.FORBID,
                        bonusId: 123,
                    }
                };

                return Promise.all([
                    commonTestFunc.createTestProposal(proposalData1)
                ]);
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            () => {
                setTimeout(() => {
                    return dbConfig.collection_proposal.findOne({
                        'data.platformId': testPlatformObj._id,
                        type: proposalTypeObjId,
                        'data.playerObjId': testPlayerObj._id
                    }).then(
                        proposal => {
                            proposal.status.should.equal("Pending");
                            done();
                        }
                    );
                }, 200);
            }
        );
    });

    it('Case 4: First time withdrawal', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                // Create bonus proposal
                let proposalData = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.PENDING,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 250,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    }
                };

                return commonTestFunc.createTestProposal(proposalData);
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            (data) => {
                setTimeout(() => {
                    return dbConfig.collection_proposal.findOne({
                        'data.platformId': testPlatformObj._id,
                        type: playerBonusProposalTypeObjId,
                        'data.playerObjId': testPlayerObj._id
                    }).then(
                        proposal => {
                            proposal.status.should.equal("Pending");
                            done();
                        }
                    );
                }, 200);
            }
        );
    });

    it('Case 5: Situation A: topup > bonus', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                // Create bonus proposal
                let proposalData = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.SUCCESS,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 100,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    },
                    createTime: new Date()
                };

                return commonTestFunc.createTestProposal(proposalData);
            }
        ).then(
            () => {
                // Create top up proposal
                let proposalData = {
                    mainType: "TopUp",
                    type: playerTopUpProposalTypeObjId,
                    status: constProposalStatus.SUCCESS,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 130,
                        playerStatus: constPlayerStatus.NORMAL
                    },
                    createTime: new Date()
                };

                return commonTestFunc.createTestProposal(proposalData);
            }
        ).then(
            (data) => {
                console.log('Topup proposal createtime', data.createTime);

                // Create bonus proposal
                let proposalData = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.PROCESSING,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 110,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    },
                    createTime: new Date()
                };

                return commonTestFunc.createTestProposal(proposalData);
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            (data) => {
                setTimeout(() => {
                    return dbConfig.collection_proposal.findOne({
                        'data.platformId': testPlatformObj._id,
                        type: playerBonusProposalTypeObjId,
                        'data.playerObjId': testPlayerObj._id,
                        status: {$ne: constProposalStatus.SUCCESS}
                    }).then(
                        proposal => {
                            console.log('proposal', proposal);
                            proposal.status.should.equal("Processing");
                            // proposal.data.autoApproveRepeatCount.should.equal(2);
                            done();
                        }
                    );
                }, 200);
            }
        );
    });

    let testGame, curBonusProposal;
    it("Case 6: Situation B: Consumption amount < required consumption for reward", function (done) {
        // Create test player
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                let threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate()-3);

                // Create succeeded bonus proposal
                let proposalData = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.SUCCESS,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 100,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    },
                    createTime: threeDaysAgo
                };

                return commonTestFunc.createTestProposal(proposalData);
            },
            error => {
                if(error instanceof Error) {
                    throw error;
                } else {
                    throw new Error(JSON.stringify(error, null, 2));
                }
            }
        ).then(
            () => {
                let twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate()-2);
                let oneWeekLater = new Date();
                oneWeekLater.setDate(oneWeekLater.getDate()+7);

                // Create Reward Proposal
                let proposalData = {
                    "mainType" : "Reward",
                    "status" : "Approved",
                    "expirationTime" : oneWeekLater,
                    "noSteps" : true,
                    "userType" : "2",
                    "entryType" : "1",
                    "priority" : "0",

                    "data" : {
                        "proposalPlayerLevel" : "Normal",
                        "playerStatus" : 1,
                        "useConsumption" : false,
                        "initAmount" : 250,
                        "amount" : 250,
                        "currentAmount" : 150,
                        // "requiredUnlockAmount" : 250,
                        "spendingAmount": 250,
                        "playerName" : testPlayerObj.name,
                        "playerObjId" : testPlayerObj._id,
                        "playerId" : testPlayerObj.playerId,
                        "platformId" : testPlatformObj._id,
                        "rewardType" : "we",
                        "type" : "we",
                        "targetProviders" : []
                    },
                    "createTime" : twoDaysAgo,
                    "creator" : {
                        "id" : "593607d7147220d426552637",
                        "name" : "admin",
                        "type" : "admin"
                    },
                    "__v" : 0
                };
                return commonTestFunc.createTestProposal(proposalData);
            },
            error => {
                if(error instanceof Error) {
                    throw error;
                } else {
                    throw new Error(JSON.stringify(error, null, 2));
                }
            }
        ).then(
            () => {
                // Create Consumption Record
                return commonTestFunc.createGame();
            },
            error => {
                if(error instanceof Error) {
                    throw error;
                } else {
                    throw new Error(JSON.stringify(error, null, 2));
                }
            }
        ).then(
            game => {
                testGame = game;

                let yesterday = new Date();
                yesterday.setDate(yesterday.getDate()-1);

                // Create Consumption Record
                let consumptionRecordData = {
                    "playerId" : testPlayerObj._id,
                    "platformId" : testPlatformObj._id,
                    "gameId": testGame._id,
                    "insertTime": yesterday,
                    "gameType": testGame.type,
                    "amount": 150,
                    "validAmount": 150,
                    "createTime": yesterday,
                    "orderNo": yesterday.getTime()+Math.random()
                };

                return dbPlayerConsumptionRecord.createPlayerConsumptionRecord(consumptionRecordData);
            },
            error => {
                if(error instanceof Error) {
                    throw error;
                } else {
                    throw new Error(JSON.stringify(error, null, 2));
                }
            }
        ).then(
            data => {
                // Create bonus proposal
                let proposalData = {
                    type: playerBonusProposalTypeObjId,
                    status: constProposalStatus.PROCESSING,
                    data: {
                        platformId: testPlatformObj._id,
                        platform: testPlatformObj.platformId,
                        playerName: testPlayerObj.name,
                        playerId: testPlayerObj.playerId,
                        playerObjId: testPlayerObj._id,
                        amount: 110,
                        playerStatus: constPlayerStatus.NORMAL,
                        bonusId: 123,
                    },
                    createTime: new Date()
                };

                return commonTestFunc.createTestProposal(proposalData);
            },
            error => {
                if(error instanceof Error) {
                    throw error;
                } else {
                    throw new Error(JSON.stringify(error, null, 2));
                }
            }
        ).then(
            data => {
                curBonusProposal = data;
                // auto screening proposal
                return dbAutoProposal.applyBonus(testPlatformObj._id);
            },
            error => {
                if(error instanceof Error) {
                    throw error;
                } else {
                    throw new Error(JSON.stringify(error, null, 2));
                }
            }
        ).then(
            () => {
                setTimeout(() => {
                    // checking result
                    return dbConfig.collection_proposal.findOne({
                        _id: curBonusProposal._id
                    }).then(
                        proposal => {
                            proposal.status.should.equal("Processing");
                            // proposal.data.autoApproveRepeatCount.should.equal(2);
                            done();
                        }
                    ).catch(
                        err => {
                            done(err)
                        }
                    );
                }, 200);
            },
            error => {
                if(error instanceof Error) {
                    throw error;
                } else {
                    throw new Error(JSON.stringify(error, null, 2));
                }
            }
        ).catch(
            error => {
                done(error);
            }
        );
    });

    it('Should remove test Data', function (done) {
        commonTestFunc.removeTestData(testPlatformId, [testPlayerId]).then(function (data) {
            done();
        })
    });
    
    it('Should remove all test Data', function (done) {
        commonTestFunc.removeTestProposalData([step1RoleId], testPlatformId, [proposalTypeId], [testPlayerId]).then(function (data) {
            done();
        })
    });
});