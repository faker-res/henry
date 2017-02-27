var db = db.getSiblingDB("admindb");

db.proposal.remove({});
db.proposalProcess.remove({});
db.proposalProcessStep.remove({});
db.proposalType.remove({});
db.proposalTypeProcess.remove({});
db.proposalTypeProcessStep.remove({});

//var proposalTypes = [ "UpdatePlayerInfo", "ConsecutiveTopUp", "WeeklyConsecutiveTopUp", "PlayerConsumptionReturn",
//"PartnerConsumptionReturn", "FirstTopUp", "PartnerIncentiveReward", "PartnerReferralReward", "GameProviderReward",
//"PlatformTransactionReward" ];
//
//for( var i = 0; i < proposalTypes.length; i++ ){
//    var type = proposalTypes[i];
//    db.proposalTypeProcess.insert({"name": type});
//    var processCursor = db.proposalTypeProcess.find({"name": type});
//    var process = processCursor.next();
//    db.proposalType.insert({"name": type, "process": process._id, "executionType":"execute"+type, "rejectionType":"reject"+type});
//}
