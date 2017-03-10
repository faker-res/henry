/*
 * Schedule task node server for settlement and statistics calculation
 */

var env = require("./config/env").config();
var scheduleSettlement = require('./schedule/scheduleSettlement');
var scheduleProposal = require('./schedule/scheduleProposal');
var scheduleProposalExpiration = require('./schedule/scheduleProposalExpiration');

//var scheduleStatistics = require('./schedule/scheduleStatistics');


