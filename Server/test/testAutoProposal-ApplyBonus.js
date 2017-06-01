'use strict';

var Q = require("q");
var should = require('should');

var dbConfig = require('../modules/dbproperties');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLevel = require('../db_modules/dbPlayerLevel');
var dbPlatform = require('../db_modules/dbPlatform');

var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var dbRewardType = require('../db_modules/dbRewardType');

var dbProposalType = require('../db_modules/dbProposalType');
var dbGame = require('../db_modules/dbGame');

var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');

var playerSummary = require("../scheduleTask/playerSummary");

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");

const constPlayerStatus = require('../const/constPlayerStatus');
const constProposalStatus = require('../const/constProposalStatus');

let dbAutoProposal = require('../db_modules/dbAutoProposal');

let commonTestFunc = require('../test_modules/commonTestFunc');
let socketConnection = require('../test_modules/socketConnection');
/**
 * Case
 *  1:  Amount > Single withdrawal limit
 *  2:  Amount > Single day withdrawal limit
 */
describe("Test Auto Proposal - Apply Bonus", function () {

    // TODO:: Under development
    return true;

    var typeName = constProposalType.PLAYER_CONSUMPTION_INCENTIVE;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    let testPlatformObjId = null;
    let testPlatformId = null;

    let testPlatformObj;
    let testPlayerObj;

    let proposalTypeObjId;

    var testRewardEventId = null;
    var testRewardEventCode = null;

    var testPlayerId = null;
    var testPlayerShortId = null;

    var testGameId = null;
    var testGameType = null;

    var step1DepartmentId = null;
    var step1AdminId = null;
    var step1RoleId = null;
    var stepType1Name = null;
    var stepType1Id = null;
    var testRewardTypeId = null;
    var testPlayerRecordId = null;
    let testDailyLogId = null;

    var date = new Date().getTime();

    it('Should create test API platform', function (done) {
        let platformData = {
            autoApproveWhenSingleBonusApplyLessThan: 300,
            autoApproveWhenSingleDayTotalBonusApplyLessThan: 500
        };

        commonTestFunc.createTestPlatform(platformData).then(
            data => {
                testPlatformObj = data;
                done();
            },
            error => {
                console.error(error);
            }
        );
    });

    it('Case 1: Amount > Single withdrawal limit', function () {
        return commonTestFunc.createTestPlayer(testPlatformObj._id).then(
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
                return dbConfig.collection_proposal.findOne({
                    'data.platformId': testPlatformObj._id,
                    type: proposalTypeObjId,
                    'data.playerObjId': testPlayerObj._id
                }).then(
                    proposal => {
                        proposal.status.should.equal("Pending");
                    }
                )
            }
        );
    });

    it('Case 2: Amount > Single day withdrawal limit', function () {
        return commonTestFunc.createTestPlayer(testPlatformObj._id).then(
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
                return dbConfig.collection_proposal.findOne({
                    'data.platformId': testPlatformObj._id,
                    type: proposalTypeObjId,
                    'data.playerObjId': testPlayerObj._id
                }).then(
                    proposal => {
                        proposal.status.should.equal("Pending");
                    }
                )
            }
        );
    });

    it('Case 3: Player is forbidden', function () {

        return commonTestFunc.createTestPlayer(testPlatformObj._id).then(
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
                return dbConfig.collection_proposal.findOne({
                    'data.platformId': testPlatformObj._id,
                    type: proposalTypeObjId,
                    'data.playerObjId': testPlayerObj._id
                }).then(
                    proposal => {
                        proposal.status.should.equal("Pending");
                    }
                );
            }
        );
    });

    it('Should remove  test Data', function (done) {
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
