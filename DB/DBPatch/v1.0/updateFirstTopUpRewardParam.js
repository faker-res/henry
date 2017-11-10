
var db = db.getSiblingDB("admindb");

var type5 = "FirstTopUp";

db.rewardParam.update({"name": type5}, {
    $set: {
        params: {
            periodType: {type: "Number", des: "Reward period"}, //0: First time, 1: week, 2: month
            targetEnable: {type: "Boolean", des: "If target is enabled"},
            providers: {type: "DBString", action: "getAllGameProviders", field: "name", des: "Game Provider"},
            reward: {
                type: "Table",
                data: {
                    rewardPercentage: {type: "Percentage", des: "Reward percentage"},
                    spendingTimes: {type: "Number", des: "Consumption amount times"},
                    maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
                    minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
                },
                des: "Reward parameter for each level"
            },
        }
    }
});

var type6 = "PlatformTransactionReward";

db.rewardParam.update({"name": type6}, {
    $set: {
        params: {
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},
            playerLevel: {type: "DBString", action: "getPlayerLevelByPlatformId", field: "name", des: "Base Player Level"},
            bankCardType: {type: "Array", des: "Bank Card Type"},
            maxRewardAmountPerDay: {type: "Number", des: "Max reward amount per day"}
        }
    }
});

//Player top up return reward
var type10 = "PlayerTopUpReturn";
db.rewardParam.update({"name": type10}, {$set: { params:{
    targetEnable: {type: "Boolean", des: "If target is enabled"},
    providers: {type: "DBArray", action:"getAllGameProviders", field: "name", des: "Game Provider"},
    providerGroup: {type: "DBString", action: "getPlatformProviderGroup", field: "name", des: "Game Provider Group"},
    //games: {type: "DBArray", action:"getGamesByProviderId", field: "name", des: "Games"},
    useConsumption: {type: "Boolean", des: "If use consumption record"},
    reward: {
        type: "Table",
        data:{
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},
            spendingTimes: {type: "Number", des: "Consumption amount times"},
            maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
            minTopUpAmount: {type: "Number", des: "Minimum top up amount"},
            maxDailyRewardAmount: {type: "Number", des: "Maximum daily reward amount"}
        },
        des: "Reward parameter for each level"
    }
}}});

// var param10Cursor = db.rewardParam.find({"name": type10});
// var param10 = param10Cursor.next();
//
// db.rewardType.insert({"name": type10, params: param10._id, des: "Player Top Up Return"});

//Player Consumption incentive
var type11= "PlayerConsumptionIncentive";
db.rewardParam.update({"name": type11}, {$set: {params:{
    needApply: {type: "Boolean", des: "If this reward requires player application"},
    useConsumption: {type: "Boolean", des: "If use consumption record"},
    reward: {
        type: "Table",
        data:{
            minPlayerLevel: {type: "Number", des: "PlayerLevel"},
            minDeficitAmount: {type: "Number", des: "Minimum deficit amount"},
            rewardAmount: {type: "Number", des: "REWARDAMOUNT"},
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},
            spendingTimes: {type: "Number", des: "Consumption amount times"},
            minRewardAmount: {type: "Number", des: "Minimal reward amount"},
            maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
            //minConsumptionAmount: {type: "Number", des: "Minimal total consumption amount"},
            minTopUpRecordAmount: {type: "Number", des: "Minimum top up amount"},
            //maxPlayerCredit: {type: "Number", des: "Maximum player credit"}
        },
        des: "Reward parameter for each level"
    }
}}});

var param11Cursor = db.rewardParam.find({"name": type11});
var param11 = param11Cursor.next();

db.rewardType.insert({"name": type11, params: param11._id, des: "Player Consumption Incentive"});

//Partner top up return reward
var type12 = "PartnerTopUpReturn";
db.rewardParam.insert({"name": type12, params:{
    reward: {
        type: "Table",
        data:{
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},
            maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
            minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
        },
        des: "Reward parameter for each level"
    }
}});

var param12Cursor = db.rewardParam.find({"name": type12});
var param12 = param12Cursor.next();

db.rewardType.insert({"name": type12, params: param12._id, des: "Partner Top Up Return"});

//Player top up reward
var type13 = "PlayerTopUpReward";
db.rewardParam.insert({"name": type13, params:{
    reward: {
        minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
        rewardAmount: {type: "Number", des: "Reward amount"},
        maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
        unlockTimes: {type: "Number", des: "Unlock times"}
    }
}});

var param13Cursor = db.rewardParam.find({"name": type13});
var param13 = param13Cursor.next();

db.rewardType.insert({"name": type13, params: param13._id, des: "Player Top Up Reward"});

//Player referral reward
var type14 = "PlayerReferralReward";
db.rewardParam.insert({
    "name": type14, params: {
        reward: {
            minTopUpAmount: {type: "Number", des: "Minimal top up amount"},     //本身充值限额
            validTopUpDays: {type: "Number", des: "Valid top up days"},         //充值有效天数
            validTopUpAmount: {type: "Number", des: "Valid top up amount"},     //充值最小限额
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},   //奖励比例
            maxRewardAmount: {type: "Number", des: "Maximum reward amount per player"},    //每个推荐人最大奖励限额
            expirationDays: {type: "Number", des: "Expeiration days"}           //推荐人有效期
        }
    }
});

var param14Cursor = db.rewardParam.find({"name": type14});
var param14 = param14Cursor.next();

db.rewardType.insert({"name": type14, params: param14._id, des: "Player Referral Reward"});

//Player registration reward
var type16 = "PlayerRegistrationReward";
db.rewardParam.insert({
    "name": type16, params: {
        rewardAmount: {type: "Number", des: "Reward amount"},                           //奖励金额
        unlockBonusAmount: {type: "Number", des: "Required unlock bonus amount"}        //解锁目标金额
    }
});

var param16Cursor = db.rewardParam.find({"name": type16});
var param16 = param16Cursor.next();

db.rewardType.insert({"name": type16, params: param16._id, des: "Player Registration Reward"});

//Player double top up reward
var type17 = "PlayerDoubleTopUpReward";
db.rewardParam.insert({
    "name": type17, params: {
        maxRewardTimes: {type: "Number", des: "Max Reward Times"},
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        reward: {
            type: "Table",
            data: {
                minPlayerLevel: {type: "Number", des: "PlayerLevel"},
                topUpAmount: {type: "Number", des: "Topup Amount"},
                rewardAmount: {type: "Number", des: "Reward amount"},
                consumptionTimes: {type: "Number", des: "Consumption Times"},
                maxRewardAmount: {type: "Number", des: "Maximum reward amount"}
            },
            des: "Reward parameter for each level"
        }
    }
});

var param17Cursor = db.rewardParam.find({"name": type17});
var param17 = param17Cursor.next();

db.rewardType.insert({"name": type17, params: param17._id, des: "Player Double Top Up Reward"});

//Player consecutive login reward
var type18 = "PlayerConsecutiveLoginReward";
db.rewardParam.insert({
    "name": type18, params: {
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        bonusAmount: {type: "Number", des: "Bonus amount"},
        bonusRequiredTimes: {type: "Number", des: "Bonus amount required times"},
        dailyTopUpAmount: {type: "Number", des: "Minimum daily top up amount"},
        dailyConsumptionAmount: {type: "Number", des: "Minimum daily consumption amount"},
        reward: {
            type: "Table",
            data: {
                dayIndex: {type: "Number", des: "Day Index"},
                rewardAmount: {type: "Number", des: "Reward amount"},
                consumptionTimes: {type: "Number", des: "Consumption Times"}
            },
            des: "Reward parameter for each day"
        }
    }
});

var param18Cursor = db.rewardParam.find({"name": type18});
var param18 = param18Cursor.next();

db.rewardType.insert({"name": type18, params: param18._id, des: "Player Consecutive Login Reward"});

//Player easter egg reward
var type19 = "PlayerEasterEggReward";
db.rewardParam.insert({
    "name": type19, params: {
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        minTopUpAmount: {type: "Number", des: "Min top up amount"},
        consumptionTimes: {type: "Number", des: "Required Consumption Amount Times"},
        reward: {
            type: "Table",
            data: {
                rewardAmount: {type: "Number", des: "Reward amount"},
                probability: {type: "Number", des: "Probability"}
            },
            des: "Reward parameter"
        }
    }
});

var param19Cursor = db.rewardParam.find({"name": type19});
var param19 = param19Cursor.next();

db.rewardType.insert({"name": type19, params: param19._id, des: "Player Easter Egg Reward"});

//Player Top Up Promo
var type20 = "PlayerTopUpPromo";
db.rewardParam.insert({
    "name": type20, params: {
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        minTopUpAmount: {type: "Number", des: "Min top up amount"},
        consumptionTimes: {type: "Number", des: "Required Consumption Amount Times"},
        reward: {
            type: "Table",
            data: {
                index: {type: "Number", des: "Index"},
                topUpType: {type: "String", des: "Top Up Type"},
                rewardDes: {type: "String", des: "Reward des"},
                rewardPercentage: {type: "Number", des: "Percentage"}
            },
            des: "Reward parameter"
        }
    }
});

var param20Cursor = db.rewardParam.find({"name": type20});
var param20 = param20Cursor.next();

db.rewardType.insert({"name": type20, params: param20._id, des: "Player Top Up Promo"});

//Player Consecutive Consumption Reward
var type21 = "PlayerConsecutiveConsumptionReward";
db.rewardParam.insert({
    "name": type21, params: {
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        reward: {
            type: "Table",
            data: {
                index: {type: "Number", des: "Index"},
                minConsumptionAmount: {type: "String", des: "Minimal total consumption amount"},
                rewardAmount: {type: "Number", des: "Reward amount"},
                spendingTimes: {type: "Number", des: "Consumption amount times"}
            },
            des: "Reward parameter"
        }
    }
});

var param21Cursor = db.rewardParam.find({"name": type21});
var param21 = param21Cursor.next();

db.rewardType.insert({"name": type21, params: param21._id, des: "Player Consecutive Consumption Reward"});

//Player Packet Rain Reward
var type22 = "PlayerPacketRainReward";
db.rewardParam.insert({
    "name": type22, params: {
        dailyApplyLimit: {type: "Boolean", des: "Daily apply limit"},
        reward: {
            type: "Table",
            data: {
                minTopUpAmount: {type: "String", des: "Minimal top up amount"},
                ratio1: {
                    type: "Array",
                    probability: {type: "Number", des: "Probability"},
                    rewardAmount: {type: "Number", des: "Reward amount"},
                    des: "Reward amount"
                },
                ratio2: {
                    type: "Array",
                    probability: {type: "Number", des: "Probability"},
                    rewardAmount: {type: "Number", des: "Reward amount"},
                    des: "Reward amount"
                },
                ratio3: {
                    type: "Array",
                    probability: {type: "Number", des: "Probability"},
                    rewardAmount: {type: "Number", des: "Reward amount"},
                    des: "Reward amount"
                },
            },
            des: "Reward parameter"
        }
    }
});

var param22Cursor = db.rewardParam.find({"name": type22});
var param22 = param22Cursor.next();

db.rewardType.insert({"name": type22, params: param22._id, des: "Player Packet Rain Reward"});

//Player Limited Offers Reward

var type23 = "PlayerLimitedOfferReward";
db.rewardParam.insert({
    "name": type23, params: {
        dailyApplyLimit: {type: "Boolean", des: "Daily apply limit"},
        reward: {
            type: "Table",
            data: {
                displayOrder: {type: "String", des: "Display Order"},
                name: {type: "String", des: "Offer Name"},
                oriPrice: {type: "Number", des: "Original Amount"},
                offerPrice: {type: "Number", des: "Offer Amount"},
                displayOriPrice: {type: "Boolean", des: "Display Original Price"},
                qty : {type: "Number", des: "Quantity"},
                limitPerson : {type: "Number", des: "Limit Apply Per Person"},
                limitTime: {type: "Number", des: "Offer Amount"},
                bet: {type: "Number", des: "Bet"},
                providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
                hrs: {type: "String", des: "Start Hour"},
                min: {type: "String", des: "Start Min"},
                repeatWeekDay: {type: "Array", des: "Repeat Day"},
                inStockDisplayTime: {type: "Number", des: "inStock DisplayTime"},
                outStockDisplayTime: {type: "Number", des: "Out Of Stock DisplayTime"},
                countDownTime: {type: "Number", des: "CountDown Time"},
                imgUrl: {type: "String", des: "Image Url"},
                status: {type: "Boolean", des: "Status"},
            },
            des: "Reward parameter"
        }
    }
});
var param23Cursor = db.rewardParam.find({"name": type23});
var param23 = param23Cursor.next();

db.rewardType.insert({"name": type23, params: param23._id, des: "Player Limited Offers Reward"});

/* Reward restructured */
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
    topupType: {index: 11, type: "multiSelect", des: "Top up type", options: "merchantTopupMainTypeJson"},
    // Online top up type
    onlineTopUpType: {index: 12, type: "multiSelect", des: "Online top up type", options: "merchantTopupTypeJson"},
    // Bank card type
    bankCardType: {index: 13, type: "multiSelect", des: "Bank card type"}
};

var periodCond = {
    // Reward apply interval
    interval: {index: 20, type: "select", des: "Reward interval", options: "rewardInterval"},
    // Top up count between interval check type
    topUpCountType: {index: 21, type: "interval", des: "Top up count between interval type", options: "intervalType"}
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
    ignoreTopUpDirtyCheckForReward: {
        index: 32,
        type: "multiSelect",
        des: "Ignore the following rewards that applied with top up"
    }
};

var consumptionCond = {
    // Is consumption shared with XIMA
    isSharedWithXIMA: {index: 40, type: "checkbox", des: "Consumption can be shared with XIMA"},
    // Provider group binded with this reward
    providerGroup: {index: 41, type: "multiSelect", des: "Provider group"},
};

var dynamicCond = {
    // Is reward amount dynamic
    isDynamicRewardAmount: {index: 50, type: "checkbox", des: "Reward amount is dynamically changed"}
};

// 存送金
var type100 = "PlayerTopUpReturnGroup";

db.rewardParam.update({
    "name": type100
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

var param100Cursor = db.rewardParam.find({"name": type100});
var param100 = param100Cursor.next();

db.rewardType.update({"name": type100}, {$set: {params: param100._id, des: type100, isGrouped: true}}, {upsert: true});