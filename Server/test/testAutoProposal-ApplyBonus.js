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

    let testPlatformObj;
    let testPlayerObj;

    let proposalTypeObjId;

    it('Should create test API platform', function (done) {
        let platformData = {
            autoApproveWhenSingleBonusApplyLessThan: 300,
            autoApproveWhenSingleDayTotalBonusApplyLessThan: 500
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

    it('Case 1: Amount > Single withdrawal limit', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                return dbConfig.collection_proposalType.findOne({
                    platformId: testPlatformObj._id,
                    name: constProposalType.PLAYER_BONUS
                }).lean()
            }
        ).then(
            proposalType => {
                proposalTypeObjId = proposalType._id;

                // Create top up proposal
                let proposalData = {
                    type: proposalTypeObjId,
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

                return commonTestFunc.createTestAutoBonusProposal(proposalData);
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
                    )
                }, 200);
            }
        );
    });

    it('Case 2: Amount > Single day withdrawal limit', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;

                return dbConfig.collection_proposalType.findOne({
                    platformId: testPlatformObj._id,
                    name: constProposalType.PLAYER_BONUS
                }).lean()
            }
        ).then(
            proposalType => {
                proposalTypeObjId = proposalType._id;

                // Create top up proposal
                let proposalData1 = {
                    type: proposalTypeObjId,
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
                    }
                };

                let proposalData2 = {
                    type: proposalTypeObjId,
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
                    }
                };

                return Promise.all([
                    commonTestFunc.createTestAutoBonusProposal(proposalData1),
                    commonTestFunc.createTestAutoBonusProposal(proposalData2)]
                );
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            () => {
                setTimeout(() => {
                    return dbConfig.collection_proposal.findOne({
                        'data.platformId': testPlatformObj._id,
                        type: proposalTypeObjId,
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
                    commonTestFunc.createTestAutoBonusProposal(proposalData1)
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

                return dbConfig.collection_proposalType.findOne({
                    platformId: testPlatformObj._id,
                    name: constProposalType.PLAYER_BONUS
                }).lean();
            }
        ).then(
            proposalType => {
                proposalTypeObjId = proposalType._id;

                // Create top up proposal
                let proposalData = {
                    type: proposalTypeObjId,
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

                return commonTestFunc.createTestAutoBonusProposal(proposalData);
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            (data) => {
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
