/*
 * Schedule task node server for settlement and statistics calculation
 */

let env = require("./config/env").config();
let scheduleSettlement = require('./schedule/scheduleSettlement');
let scheduleProposal = require('./schedule/scheduleProposal');
let scheduleSavePlayersCredit = require('./schedule/scheduleSavePlayersCredit');
//todo:: eanble this later
//var scheduleProposalExpiration = require('./schedule/scheduleProposalExpiration');

//var scheduleStatistics = require('./schedule/scheduleStatistics');


