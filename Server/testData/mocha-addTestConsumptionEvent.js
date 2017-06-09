var should = require('should');
var dbconfig = require('./../modules/dbproperties');

var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerLevel = require('../db_modules/dbPlayerLevel');
var dbPlatform = require('../db_modules/dbPlatform');

var dbRewardRule = require('../db_modules/dbRewardRule');
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

var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbPlayerConsumptionDaySummary = require('../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerConsumptionWeekSummary = require('../db_modules/dbPlayerConsumptionWeekSummary');
var dbPlayerGameTypeConsumptionDaySummary = require('../db_modules/dbPlayerGameTypeConsumptionDaySummary');

var playerSummary = require("../scheduleTask/playerSummary");
var consumptionReturnEvent = require("../scheduleTask/consumptionReturnEvent");

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");

var dailyPlatformSettlement = require('./../scheduleTask/dailyPlatformSettlement');
var weeklyPlatformSettlement = require('./../scheduleTask/weeklyPlatformSettlement');
var rewardEventGenerator = require('../test_modules/rewardEventGenerator');

var mongoose = require('mongoose');
var Q = require("q");

describe("Create test API client data", function () {

    var testPlatformId = null; //mongoose.Types.ObjectId('56f10485b4915aea1abfde0a');

    var typeName = constProposalType.PLAYER_CONSUMPTION_RETURN;
    var proposalTypeId = null;
    var proposalTypeProcessId = null;

    var testRewardRuleId = null;
    var testRewardEventId = null;

    var testPlayerLevels = [];
    var testPlayersId = [];
    var testPlayersPlayerId = [];
    var testPlayerNum = 3;

    var testPlayerObjId = null;
    var testPlayerId = null;

    var testGameId = null;
    var testGameType = null;

    var testGame2Id = null;
    var testGame2Type = null;

    var consumeTimes = 5;
    var consumeDays = 1;

    var creationProcesses = 200;

    var logCreation = false;

    var date = new Date().getTime();

    var testRewardTypeId = null;

    it('create test platform', function (done) {
        var date = new Date();
        var platformName = "testStressPlatform";

        var platformData = {
            name: platformName
        };
        dbPlatform.createPlatform(platformData).then(
            function (data) {
                testPlatformId = data._id;
                console.log( "testPlatformId", testPlatformId );
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

    /*
    it('Should get consumption return proposal type id and proposal type process id', function (done) {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: typeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
                                                                               platformId: testPlatformId,
                                                                               name: typeName
                                                                           });
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

    it('get test reward type', function (done) {
        dbRewardType.getRewardType({name: constRewardType.PLAYER_CONSUMPTION_RETURN}).then(
            function (data) {
                testRewardTypeId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('create test platform reward event', function (done) {
        var date = new Date();
        var eventName = "testStressEvent";

        var eventData = {
            name: eventName,
            platform: testPlatformId,
            type: testRewardTypeId,
            param: {
                ratio: {
                    Normal: {
                        Casual: 0.02,
                        Card: 0.03,
                        Sports: 0.04
                    },
                    VIP: {
                        Casual: 0.03,
                        Card: 0.04,
                        Sports: 0.05
                    },
                    Diamond: {
                        Casual: 0.04,
                        Card: 0.05,
                        Sports: 0.06
                    }
                }
            },
            executeProposal: proposalTypeId
        };
        dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testRewardEventId = data._id;
                console.log("testPlatformId:", testPlatformId);
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });
    */
    it('create player consumption return reward event', function () {
        return rewardEventGenerator.createPlayerConsumptionReturnRewardEvent(testPlatformId);
    });

});
