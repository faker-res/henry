var Q = require("q");
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
var dbGameProviderDaySummary = require('../db_modules/dbGameProviderDaySummary');
var dbGameProviderPlayerDaySummary = require('../db_modules/dbGameProviderPlayerDaySummary');

var playerSummary = require("../scheduleTask/playerSummary");
var consumptionReturnEvent = require("../scheduleTask/consumptionReturnEvent");

var constProposalType = require('./../const/constProposalType');
var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");
var dataUtils = require("../modules/dataUtils.js");
var promiseUtils = require("../modules/promiseUtils.js");
var dbUtil = require("../modules/dbutility");

const showAveragePartnerCredit = (platformId) => dbconfig.collection_partner.find({platform: platformId}).then(
    (partners) => {
        const average = partners.map( p => p.credits ).reduce( (a,b) => a + b , 0 ) / partners.length;
        console.log("Average partner credit:", average);
    }
);

function calculatePlatformDaySummaryForPastDays (numDays, platformId) {
    // If I remove this function, only one test fails, despite the fact that it is being called from three places!
    //return Q.resolve('fake');

    var proms = [];

    for (var i = 0; i < numDays; i++) {
        // var endTime = new Date();
        // endTime.setHours(0, 0, 0, 0);
        // endTime.setDate(endTime.getDate() - i);
        var endTime = dbUtil.getLastWeekSGTime().endTime;
        endTime.setDate(endTime.getDate() - i);
        var startTime = dbUtil.getLastWeekSGTime().endTime;
        startTime.setDate(startTime.getDate() - (i + 1));
        console.log("day summary", startTime, endTime);
        proms.push(dbPlayerConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, platformId));
    }

    return Q.all(proms);
}

function calculateProviderPlayerDaySummaryForPastDays (consumeDays, testGameProviderId) {
    var proms = [];

    for (var i = 0; i < consumeDays; i++) {
        var endTime = new Date();
        endTime.setHours(0, 0, 0, 0);
        endTime.setDate(endTime.getDate() - i);
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);
        startTime.setDate(startTime.getDate() - (i + 1));
        // var endTime = dbUtil.getLastWeekSGTime().endTime;
        // endTime.setDate(endTime.getDate() - i);
        // var startTime = dbUtil.getLastWeekSGTime().endTime;
        // startTime.setDate(startTime.getDate() - (i + 1));
        proms.push(dbGameProviderPlayerDaySummary.calculateProviderPlayerDaySummaryForTimeFrame(startTime, endTime, testGameProviderId));
    }
    return Q.all(proms);
}

function calculateProviderDaySummaryForPastDays (consumeDays, testGameProviderId) {
    var proms = [];

    for (var i = 0; i < consumeDays; i++) {
        var endTime = new Date();
        endTime.setHours(0, 0, 0, 0);
        endTime.setDate(endTime.getDate() - i);
        var startTime = new Date();
        startTime.setHours(0, 0, 0, 0);
        startTime.setDate(startTime.getDate() - (i + 1));
        proms.push(dbGameProviderDaySummary.calculateProviderDaySummaryForTimeFrame(startTime, endTime, testGameProviderId));
    }
    Q.all(proms);
}

const migrationActionsByIndex = [ 'promote', 'demote', 'punish', 'coast' ];

function preparePartnerLevelMigrationsTest (platformId) {
    return dbconfig.collection_partner.find({platform: platformId}).populate({path: 'level', model: dbconfig.collection_partnerLevel}).then(
        function (partners) {
            return dbconfig.collection_partnerWeekSummary.find({platformId: platformId}).then(
                function (partnerWeekSummaries) {
                    const summariesByPartnerId = dataUtils.byKey(partnerWeekSummaries, 'partnerId');

                    return promiseUtils.eachConcurrently(partners, 500, function (partner) {
                        const summary = summariesByPartnerId[partner._id];

                        const index = Number(partner.partnerId);
                        const action = migrationActionsByIndex[index % migrationActionsByIndex.length];

                        if (action === 'promote') {
                            // He will surely get promoted
                            summary.validPlayers = 9999999999;
                            summary.validConsumptionSum = 9999999999;
                            return summary.save();
                        }
                        else if (action === 'demote') {
                            // He will surely get demoted
                            summary.validPlayers = 0;
                            summary.validConsumptionSum = 0;
                            partner.failMeetingTargetWeeks = 9999999999;
                            return summary.save().then(
                                () => partner.save()
                                // Or if we want to avoid save middleware:
                                //() => dbUtil.findOneAndUpdateForShard(
                                //    dbconfig.collection_partner,
                                //    {_id: partner._id},
                                //    {failMeetingTargetWeeks: partner.failMeetingTargetWeeks},
                                //    constShardKeys.collection_partner
                                //)
                            );
                        }
                        else if (action === 'punish') {
                            // He will be "punished"
                            summary.validPlayers = 0;
                            summary.validConsumptionSum = 0;
                            return summary.save();
                        }
                        else if (action === 'coast') {
                            // Give him just enough to survive at his current level
                            summary.validPlayers = partner.level.limitPlayers;
                            summary.validConsumptionSum = partner.level.consumptionAmount;
                            return summary.save();
                        }
                    });
                }
            );
        }
    );
}

function checkPartnerMigrationsTest (platformId) {
    return dbconfig.collection_partner.find({platform: platformId}).populate({path: 'level', model: dbconfig.collection_partnerLevel}).then(
        function (partners) {
            partners.length.should.be.greaterThan(4 - 1);

            const checksMadeByAction = {};

            partners.forEach(function (partner) {
                const index = Number(partner.partnerId);
                const action = migrationActionsByIndex[index % migrationActionsByIndex.length];

                // Assuming they all started on partnerLevel 1
                if (action === 'promote') {
                    partner.level.value.should.equal(2);
                    partner.failMeetingTargetWeeks.should.equal(0);
                }
                else if (action === 'demote') {
                    partner.level.value.should.equal(0);
                    partner.failMeetingTargetWeeks.should.equal(0);
                }
                else if (action === 'punish') {
                    partner.level.value.should.equal(1);
                    partner.failMeetingTargetWeeks.should.equal(1);
                }
                else if (action === 'coast') {
                    partner.level.value.should.equal(1);
                    partner.failMeetingTargetWeeks.should.equal(0);
                }

                checksMadeByAction[action] = (checksMadeByAction[action] || 0) + 1;
            });

            // The above checks are good, but will only work if the records are actually checked.
            // So here we ensure that enough actions were checked.
            const oneQuarterOfThePartners = Math.floor(partners.length / 4);
            checksMadeByAction['promote'].should.be.greaterThan(oneQuarterOfThePartners - 1);
            checksMadeByAction['demote'].should.be.greaterThan(oneQuarterOfThePartners - 1);
            checksMadeByAction['punish'].should.be.greaterThan(oneQuarterOfThePartners - 1);
            checksMadeByAction['coast'].should.be.greaterThan(oneQuarterOfThePartners - 1);
        }
    );
}

module.exports = {
    calculatePlatformDaySummaryForPastDays: calculatePlatformDaySummaryForPastDays,
    calculateProviderPlayerDaySummaryForPastDays: calculateProviderPlayerDaySummaryForPastDays,
    calculateProviderDaySummaryForPastDays: calculateProviderDaySummaryForPastDays,
    preparePartnerLevelMigrationsTest: preparePartnerLevelMigrationsTest,
    checkPartnerMigrationsTest: checkPartnerMigrationsTest,
    showAveragePartnerCredit: showAveragePartnerCredit,
};
