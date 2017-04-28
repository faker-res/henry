/*
 * Schedule task node server for settlement and statistics calculation
 */

let env = require("./config/env").config();
let scheduleSettlement = require('./schedule/scheduleSettlement');
let scheduleProposal = require('./schedule/scheduleProposal');
//todo:: eanble this later
//let scheduleSavePlayersCredit = require('./schedule/scheduleSavePlayersCredit');
//var scheduleProposalExpiration = require('./schedule/scheduleProposalExpiration');

//var scheduleStatistics = require('./schedule/scheduleStatistics');


