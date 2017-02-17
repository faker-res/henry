var should = require('should');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var consecutiveTopUpEvent = require('../scheduleTask/consecutiveTopUpEvent');

var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardRule = require('../db_modules/dbRewardRule');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var consecutiveTopUpEvent = require('../scheduleTask/consecutiveTopUpEvent');
var dbProposalType = require('../db_modules/dbProposalType');
var dbGame = require('../db_modules/dbGame');
var dbProvider = require('../db_modules/dbGameProvider');
var dbRewardType = require('../db_modules/dbRewardType');
var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var dbconfig = require('../modules/dbproperties');

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");

var playerSummary = require('../scheduleTask/playerSummary');

var mongoose = require('mongoose');
var Q = require("q");

describe("Scheduled top up tasks", function () {

    var testPlatformId =  mongoose.Types.ObjectId(process.env.PLATFORM);

    var minAmount = 100;
    var numOfDays = 3;
    var rewardAmount = 100;
    var spendingAmount = 300;

    var numDaysToProcess = 7;

    var typeName = constProposalType.FULL_ATTENDANCE;
    var proposalTypeId;
    var testRewardTypeId;
    var testRewardEventId;

    it('get proposal type id and proposal type process id', function () {
        var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: typeName});
        var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformId, name: typeName});
        return Q.all([typeProm, typeProcessProm]).then(
            function (data) {
                data[0].name.should.equal(typeName);
                data[1].name.should.equal(typeName);
                proposalTypeId = data[0]._id;
                proposalTypeProcessId = data[1]._id;
            }
        );
    });

    it('get test reward type', function () {
        return dbRewardType.getRewardType({name: constRewardType.FULL_ATTENDANCE}).then(
            function(data){
                testRewardTypeId = data._id;
            }
        );
    });

    it('get test reward event', function () {
        this.timeout(900);

        var date = new Date();
        var eventName = "testEvent" + date.getTime();

        var eventData = {
            name: eventName,
            platform: testPlatformId,
            type: testRewardTypeId,
            param: {
                numOfDays: numOfDays,
                minAmount: minAmount,
                rewardAmount: rewardAmount,
                spendingAmount: spendingAmount
            },
            executeProposal: proposalTypeId
        };
        return dbRewardEvent.createRewardEvent(eventData).then(
            function (data) {
                testRewardEventId = data._id;
            }
        );
    });

    it('calculate platform daily summary (for '+numDaysToProcess+' days)', function () {
        this.timeout(15*60*1000);

        var proms = [];

        // We calculate the day summary for each of the last 7 days.
        // That's seven times more than the settlement server will usually have to do!
        // But it should ensure we have all the data required for the weekly summary later.
        for (var i = 0; i < numDaysToProcess; i++) {
            var endTime = new Date();
            endTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() - i);
            var startTime = new Date();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - (i + 1));
            proms.push(dbPlayerTopUpDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, testPlatformId));
        }
        return Q.all(proms).then(
            function (data) {
                "use strict";
                var expectedResultProms = [];

                // A slightly dodgy test
                // Since we don't have the playerIds, we just ensure that there is at least one top up day summary for each day in the last week

                for (var i = 0; i < numDaysToProcess; i++) {
                    let endTime = new Date();
                    endTime.setHours(0, 0, 0, 0);
                    endTime.setDate(endTime.getDate() - i);
                    let startTime = new Date();
                    startTime.setHours(0, 0, 0, 0);
                    startTime.setDate(startTime.getDate() - (i + 1));

                    expectedResultProms.push(
                        dbconfig.collection_playerTopUpDaySummary.findOne({date: startTime}).then(
                            summary => {
                                if (!summary) {
                                    return Q.reject(Error("Could not find a summary for date: " + startTime));
                                }
                                should(summary).not.equal(undefined);
                                should(summary).not.equal(null);
                                // summary.amount.should.equal(topUpAmount*topUpTimes);
                                summary.amount.should.not.equal(0);
                            }
                        )
                    );
                }

                return Q.all(expectedResultProms);
            }
        );
    });

    it('check platform weekly consecutive top up', function () {
        this.timeout(15*60*1000);

        return consecutiveTopUpEvent.checkPlatformFullAttendancePlayers(testPlatformId);
    });

    it('calculate platform\'s last week player top up summary', function () {
        this.timeout(15 * 60 * 1000);

        // This calls dbPlayerTopUpWeekSummary.calculatePlatformWeekSummaryForTimeFrame
        return playerSummary.calculateLastWeekPlayerTopUpSummary(testPlatformId);
    });

});
