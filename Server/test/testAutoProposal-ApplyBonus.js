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

const constProposalStatus = require('../const/constProposalStatus');

let dbAutoProposal = require('../db_modules/dbAutoProposal');

let commonTestFunc = require('../test_modules/commonTestFunc');
let socketConnection = require('../test_modules/socketConnection');
/**
 * Case
 *  1:  Amount > Single withdrawal limit
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

    it('create test player (First case)', function () {
        return commonTestFunc.createTestPlayer(testPlatformObj._id).then(
            data => {
                testPlayerObj = data;
                //console.log('testPlayerObj', testPlayerObj);
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
                    playerId: testPlayerObj.playerId,
                    playerObjId: testPlayerObj._id,
                    playerName: testPlayerObj.name,
                    bonusId: 123,
                    platformId: testPlatformObj._id,
                    platform: testPlatformObj.platformId,
                    amount: 500,
                    type: proposalTypeObjId,
                    status: constProposalStatus.PROCESSING
                };
                return commonTestFunc.createTestAutoTopUpProposal(proposalData);
            }
        ).then(
            () => dbAutoProposal.applyBonus(testPlatformObj._id)
        ).then(
            () => {
                return dbConfig.collection_proposal.findOne({
                    platform: testPlatformObj.platformId,
                    type: proposalTypeObjId
                }).then(
                    proposal => {
                        console.log('proposal', proposal);
                    }
                )
            }
        );
    });

    it('Check first case', function () {


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
