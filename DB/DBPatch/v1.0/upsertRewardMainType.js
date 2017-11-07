var db = db.getSiblingDB("admindb");

var generalCond = {
    // Reward Name
    name: {index: 0, type: "string", des: "Reward name"},
    // Reward system code
    code: {index: 1, type: "string", des: "Reward code"},
    // Reward apply type
    applyType: {index: 2, type: "select", des: "Reward apply type", options: "rewardApplyType"},
    // Is player manually applicable
    isPlayerApplicable: {index: 3, type: "checkbox", des: "Is player manually applicable"},
    // Is ignore audit
    isIgnoreAudit: {index: 4, type: "checkbox", des: "Is ignore audit"},
    // Reward start time
    startTime: {index: 5, type: "date", des: "Reward start time"},
    // Reward end time
    endTime: {index: 6, type: "date", des: "Reward end time"},
    // Is differentiate reward by player level
    isPlayerLevelDiff: {index: 7, type: "checkbox", des: "Reward differentiate by player level"}
};

var topUpCond = {
    // User device to top up
    userAgent: {index: 10, type: "multiSelect", des: "Top up agent", options: "userAgentType"},
    // Top up type
    type: {index: 11, type: "multiSelect", des: "Top up type", options: "merchantTopupMainTypeJson"},
    // Online top up type
    onlineTopUpType: {index: 12, type: "multiSelect", des: "Online top up type", options: "merchantTopupTypeJson"},
    // Bank card type
    bankCardType: {index: 13, des: "Bank card type"}
};

var periodCond = {
    // Reward apply interval
    interval: {index: 20, type: "select", des: "Reward interval", options: "rewardInterval"},
    // Top up count between interval check type
    topUpCountType: {index: 21, des: "Top up count between interval type"},
    // Top up count
    topUpCount: {index: 22, des: "Top up count between interval"},
    // Top up count 2 if interval is selected
    topUpCount2: {index: 23, des: "Top up count between interval 2"}
};

var latestTopUpCond = {
    // Allow to apply after latest top up has consumption after it
    allowConsumptionAfterTopUp: {
        index: 30,
        type: "checkbox",
        des: "Allow to apply if there is consumption after top up"
    },
    // Allow to apply if there is withdrawal after top up
    allowApplyAfterWithdrawal: {index: 31, type: "checkbox", des: "Allow to apply if there is withdrawal after top up"},
    // Ignore checks for certain rewards that applied with this top up
    ignoreTopUpDirtyCheckForReward: {index: 32, des: "Ignore the following rewards that applied with top up"}
};

var consumptionCond = {
    // Is consumption shared with XIMA
    isSharedWithXIMA: {index: 40, type: "checkbox", des: "Consumption can be shared with XIMA"},
    // Provider group binded with this reward
    providerGroup: {index: 41, des: "Provider group"},
};

var dynamicCond = {
    // Is reward amount dynamic
    isDynamicRewardAmount: {index: 50, type: "checkbox", des: "Reward amount is dynamically changed"}
};

// 存送金
var type1 = "PlayerTopUpReturn";

db.rewardMainType.update({
    "name": type1
}, {
    $set: {
        condition: {
            generalCond: generalCond,
            topUpCond: topUpCond,
            periodCond: periodCond,
            latestTopUpCond: latestTopUpCond,
            consumptionCond: consumptionCond,
            dynamicCond: dynamicCond
        }
    }
}, {
    upsert: true
});