/*
 * Schedule task node server for settlement and statistics calculation
 */

let env = require("./config/env").config();
let scheduleAutoFeedback = require('./schedule/scheduleAutoFeedback');
let scheduleSettlement = require('./schedule/scheduleSettlement');
let scheduleProposal = require('./schedule/scheduleProposal');
let scheduleSavePlayersCredit = require('./schedule/scheduleSavePlayersCredit');
let scheduleAutoProposal = require('./schedule/scheduleAutoProposal');
let scheduleConvertRewardPoints = require('./schedule/scheduleConvertRewardPoints');
let scheduleCheckAndUpdateWCSessionStatus = require('./schedule/scheduleCheckAndUpdateWCSessionStatus');
let scheduleLive800DailySummarized = require('./schedule/scheduleLive800DailySummarized');
let scheduleCheckMinPointNotification = require('./schedule/scheduleCheckMinPointNotification');
let scheduleAutoUnbindReferral = require('./schedule/scheduleAutoUnbindReferral');
let scheduleCheckAndUpdateQQSessionStatus = require('./schedule/scheduleCheckAndUpdateQQSessionStatus');
let scheduleGetPlayerBillBoard = require('./schedule/scheduleGetPlayerBillBoard');
// let scheduleCheckEveryHourPassOneMin = require('./schedule/schedulerPerHourPassOneMin');
//var scheduleProposalExpiration = require('./schedule/scheduleProposalExpiration');

//var scheduleStatistics = require('./schedule/scheduleStatistics');
