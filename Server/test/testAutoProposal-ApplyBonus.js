'use strict';

const should = require('should');

const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalType = require('./../const/constProposalType');

const dbAutoProposal = require('../db_modules/dbAutoProposal');
const dbPlayerInfo = require('../db_modules/dbPlayerInfo');

const dbConfig = require('../modules/dbproperties');

let commonTestFunc = require('../test_modules/commonTestFunc');
/**
 * Case
 *  1:  Amount > Single withdrawal limit
 *  2:  Amount > Single day withdrawal limit
 *  3:  Player is forbidden
 *  4:  First time withdrawal
 */
describe("Test Auto Proposal - Apply Bonus", function () {
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
            autoApproveRepeatCount: 3
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
                    status: constProposalStatus.PROCESSING,
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
                    status: constProposalStatus.PROCESSING,
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
                    status: constProposalStatus.PROCESSING,
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
                    status: constProposalStatus.PROCESSING,
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
                            proposal.data.autoApproveRepeatCount.should.equal(2);
                            done();
                        }
                    );
                }, 200);
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
