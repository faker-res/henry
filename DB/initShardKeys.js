/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

db = db.getSiblingDB("playerdb");
db.dropDatabase();

sh.enableSharding("playerdb");
sh.shardCollection("playerdb.playerInfo", {platform: 1, _id: 1});
sh.shardCollection("playerdb.partner", {platform: 1, _id: 1});
sh.shardCollection("playerdb.playerFeedback", {platform: 1, _id: 1});
sh.shardCollection("playerdb.rewardTask", {platformId: 1, _id: 1});
sh.shardCollection("playerdb.playerMail", {platformId: 1, _id: 1});

db = db.getSiblingDB("logsdb");
db.dropDatabase();

sh.enableSharding("logsdb");
//sh.shardCollection("logsdb.adminUserActionLogs", { "_id": "hashed" } );
sh.shardCollection("logsdb.creditChangeLog", {operationTime: 1, _id: 1});
sh.shardCollection("logsdb.gameProviderDaySummary", {date: 1, _id: 1});
sh.shardCollection("logsdb.gameProviderPlayerDaySummary", {date: 1, _id: 1});

sh.shardCollection("logsdb.partnerChildWeekSummary", {date: 1, _id: 1});
sh.shardCollection("logsdb.partnerWeekSummary", {date: 1, _id: 1});
sh.shardCollection("logsdb.playerConsumptionDaySummary", {date: 1, _id: 1});
sh.shardCollection("logsdb.playerConsumptionRecord", {createTime: 1, _id: 1});

//sh.shardCollection("logsdb.playerConsumptionSummary", { createTime:1, _id:1 } );
sh.shardCollection("logsdb.playerConsumptionSummary", {
    platformId: 1,
    playerId: 1,
    gameType: 1,
    bDirty: 1
}, {unique: true});
sh.shardCollection("logsdb.playerConsumptionWeekSummary", {date: 1, _id: 1});
sh.shardCollection("logsdb.playerLoginRecord", {loginTime: 1, _id: 1});
sh.shardCollection("logsdb.playerRegistrationIntentRecord", {createTime: 1, _id: 1});

sh.shardCollection("logsdb.playerTopUpDaySummary", {date: 1, _id: 1});
sh.shardCollection("logsdb.playerTopUpIntentRecord", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.playerTopUpRecord", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.playerTopUpWeekSummary", {date: 1, _id: 1});

sh.shardCollection("logsdb.proposal", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.proposalProcess", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.proposalProcessStep", {createTime: 1, _id: 1});

sh.shardCollection("logsdb.systemLog", {operationTime: 1, _id: 1});

sh.shardCollection("logsdb.playerPermissionLog", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.playerCreditTransferLog", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.playerClientSourceLog", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.playerStatusChangeLog", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.rewardLog", {operationTime: 1, _id: 1});
sh.shardCollection("logsdb.settlementLog", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.partnerCommissionRecord", {createTime: 1, _id: 1});
sh.shardCollection("logsdb.paymentAPILog", {createTime: 1, _id: 1});