/*
 * db collections shard keys
 */

const constShardKeys = {
    //player db
    collection_players: ["_id", "platform"],
    collection_partner: ["_id", "platform"],
    collection_playerFeedback: ["_id", "platform"],
    collection_rewardTask: ["_id", "platformId"],
    collection_playerMail: ["_id", "platformId"],

    //logsdb
    collection_creditChangeLog: ["operationTime", "_id"],

    collection_platformDaySummary: ["date", "_id"],

    collection_providerDaySummary: ["date", "_id"],
    collection_providerPlayerDaySummary: ["date", "_id"],

    collection_partnerWeekSummary: ["date", "_id"],
    collection_partnerChildWeekSummary: ["date", "_id"],

    collection_playerTopUpDaySummary: ["date", "_id"],
    collection_playerTopUpWeekSummary: ["date", "_id"],
    collection_playerConsumptionDaySummary: ["date", "_id"],
    collection_playerConsumptionWeekSummary: ["date", "_id"],
    //collection_playerConsumptionSummary: ["_id", "createTime"],
    collection_playerConsumptionSummary: ["platformId", "playerId", "gameType", "summaryDay", "bDirty"],

    collection_playerLoginRecord: ["_id", "loginTime"],
    collection_playerRegistrationIntentRecord: ["createTime", "_id"],
    collection_playerTopUpIntentRecord: ["createTime", "_id"],

    collection_playerTopUpRecord: ["createTime", "_id"],
    collection_proposal: ["createTime", "_id"],
    collection_settlementLog: ["createTime", "_id"],

    collection_systemLog: ["operationTime", "_id"],
    collection_rewardLog: ["createTime", "_id"],
    collection_playerStatusChangeLog: ["createTime", "_id"],
    collection_playerPermissionLog: ["createTime", "_id"],
    collection_playerCreditTransferLog: ["createTime", "_id"],
    collection_playerClientSourceLog: ["createTime", "_id"],
    collection_partnerCommissionRecord: ["createTime", "_id"],
    collection_paymentAPILog: ["createTime", "_id"]

};

module.exports = constShardKeys;


