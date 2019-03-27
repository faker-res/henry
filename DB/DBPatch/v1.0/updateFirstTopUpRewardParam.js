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
            playerLevel: {
                type: "DBString",
                action: "getPlayerLevelByPlatformId",
                field: "name",
                des: "Base Player Level"
            },
            bankCardType: {type: "Array", des: "Bank Card Type"},
            maxRewardAmountPerDay: {type: "Number", des: "Max reward amount per day"}
        }
    }
});

//Player top up return reward
var type10 = "PlayerTopUpReturn";
db.rewardParam.update({"name": type10}, {
    $set: {
        params: {
            targetEnable: {type: "Boolean", des: "If target is enabled"},
            providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
            providerGroup: {
                type: "DBString",
                action: "getPlatformProviderGroup",
                field: "name",
                des: "Game Provider Group"
            },
            //games: {type: "DBArray", action:"getGamesByProviderId", field: "name", des: "Games"},
            useConsumption: {type: "Boolean", des: "If use consumption record"},
            reward: {
                type: "Table",
                data: {
                    rewardPercentage: {type: "Percentage", des: "Reward percentage"},
                    spendingTimes: {type: "Number", des: "Consumption amount times"},
                    maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
                    minTopUpAmount: {type: "Number", des: "Minimum top up amount"},
                    maxDailyRewardAmount: {type: "Number", des: "Maximum daily reward amount"}
                },
                des: "Reward parameter for each level"
            }
        }
    }
});

// var param10Cursor = db.rewardParam.find({"name": type10});
// var param10 = param10Cursor.next();
//
// db.rewardType.insert({"name": type10, params: param10._id, des: "Player Top Up Return"});

//Player Consumption incentive
var type11 = "PlayerConsumptionIncentive";
db.rewardParam.update({"name": type11}, {
    $set: {
        params: {
            needApply: {type: "Boolean", des: "If this reward requires player application"},
            useConsumption: {type: "Boolean", des: "If use consumption record"},
            reward: {
                type: "Table",
                data: {
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
        }
    }
});

var param11Cursor = db.rewardParam.find({"name": type11});
var param11 = param11Cursor.next();

db.rewardType.insert({"name": type11, params: param11._id, des: "Player Consumption Incentive"});

//Partner top up return reward
var type12 = "PartnerTopUpReturn";
db.rewardParam.insert({
    "name": type12, params: {
        reward: {
            type: "Table",
            data: {
                rewardPercentage: {type: "Percentage", des: "Reward percentage"},
                maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
                minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
            },
            des: "Reward parameter for each level"
        }
    }
});

var param12Cursor = db.rewardParam.find({"name": type12});
var param12 = param12Cursor.next();

db.rewardType.insert({"name": type12, params: param12._id, des: "Partner Top Up Return"});

//Player top up reward
var type13 = "PlayerTopUpReward";
db.rewardParam.insert({
    "name": type13, params: {
        reward: {
            minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
            rewardAmount: {type: "Number", des: "Reward amount"},
            maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
            unlockTimes: {type: "Number", des: "Unlock times"}
        }
    }
});

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
                requiredLevel: {type: "String", des: "Required Level"},
                qty: {type: "Number", des: "Quantity"},
                limitPerson: {type: "Number", des: "Limit Apply Per Person"},
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
    name: {index: 0, type: "text", des: "Reward name", detail: "REWARD_NAME_DETAIL"},
    // Reward system code
    code: {index: 1, type: "text", des: "Reward code", detail: "REWARD_CODE_DETAIL"},
    // Reward apply type
    applyType: {index: 2, type: "select", des: "Reward apply type", options: "rewardApplyType", detail: "REWARD_APPLY_TYPE_DETAIL"},
    // Reward image url
    imageUrl: {
        index: 3,
        type: "ImageURLText",
        des: "Display imageUrl",
        value: [""]
    },
    // Is player manually applicable
    canApplyFromClient: {index: 4, type: "checkbox", des: "Is player manually applicable", detail: "REWARD_CLIENT_APPLY_DETAIL"},
    // Is show in production server
    showInRealServer: {index: 5, type: "checkbox", des: "Is show in production server", detail: "REWARD_SERVER_SHOW_DETAIL", default: true},
    // Is ignore audit
    isIgnoreAudit: {index: 6, type: "number", des: "below X amount auto execute reward", detail: "REWARD_IGNORE_AUDIT_DETAIL"},
    // Reward start time
    validStartTime: {index: 7, type: "date", des: "Reward start time"},
    // Reward end time
    validEndTime: {index: 8, type: "date", des: "Reward end time"},
    // Is differentiate reward by player level
    isPlayerLevelDiff: {index: 9, type: "checkbox", des: "Reward differentiate by player level", default: false}
};

var topUpCond = {
    // User device to top up
    userAgent: {index: 10, type: "multiSelect", des: "Top up agent", options: "constPlayerRegistrationInterface", detail: "REWARD_TOP_UP_TYPE_DETAIL"},
    // Top up type
    topupType: {index: 11, type: "multiSelect", des: "Top up type", options: "topUpTypeList", detail: "REWARD_TOP_UP_TYPE_DETAIL"},
    // Online top up type
    onlineTopUpType: {index: 12, type: "multiSelect", des: "Online top up type", options: "merchantTopupTypeJson", detail: "REWARD_TOP_UP_TYPE_DETAIL"},
    // Bank card type
    bankCardType: {index: 13, type: "multiSelect", des: "Bank card type", options: "bankType", detail: "REWARD_TOP_UP_TYPE_DETAIL"}
};

var periodCond = {
    // Reward apply interval
    interval: {index: 20, type: "select", des: "Reward interval", options: "rewardInterval", detail: "REWARD_INTERVAL_DETAIL"},
    // Top up count between interval check type
    topUpCountType: {index: 21, type: "interval", des: "Top up count between interval type", options: "intervalType"}
};

var loseValueCond = {
    // Chain condition head
    //defineLoseValue: {index: 102, type: "chain", chainType:"select", des: "Define Lose Value", options: "loseValueType"},
    defineLoseValue: {index: 42, type: "select", des: "Define Lose Value", options: "loseValueType"},
    // Chain condition child
    //consumptionRecordProvider: {index: 102.1, type: "chain", chainKey: "102", chainType:"multiSelect", chainOptions: [2,3], des: "Consumption Record Provider", options: "consumptionRecordProviderName"},
    // consumptionRecordProvider: {
    //     index: 42.1,
    //     type: "multiSelect",
    //     des: "Consumption Record Provider",
    //     options: "consumptionRecordProviderName"
    // },
    consumptionProvider: {
        index: 42.1,
        type: "multiSelect",
        des: "Consumption Record Provider",
        options: "gameProviders"
    }
}

var latestTopUpCond = {
    // Allow to apply only if top up is the latest
    allowOnlyLatestTopUp: {
        index: 29,
        type: "checkbox",
        des: "Allow to apply if top up is the latest"
    },
    // Allow to apply after latest top up has consumption after it
    allowConsumptionAfterTopUp: {
        index: 30,
        type: "checkbox",
        des: "Allow to apply if there is consumption after top up"
    },
    // Allow to apply if there is withdrawal after top up
    allowApplyAfterWithdrawal: {index: 31, type: "checkbox", des: "Allow to apply if there is withdrawal after top up", detail: "REWARD_APPLY_AFTER_WITHDRAWAL_DETAIL"},
    // Ignore checks for certain rewards that applied with this top up
    ignoreTopUpDirtyCheckForReward: {
        index: 32,
        type: "multiSelect",
        des: "Ignore the following rewards that applied with top up",
        options: "allRewardEvent"
    }
};

var consumptionCond = {
    // Is consumption shared with XIMA
    isSharedWithXIMA: {index: 40, type: "checkbox", des: "Consumption can be shared with XIMA"},
    // Provider group binded with this reward
    providerGroup: {index: 41, type: "select", des: "Provider group", options: "providerGroup"},
};

var consumptionProviderCond = {
    consumptionProvider: {
        index: 27,
        type: "multiSelect",
        des: "Use consumptions only from these provider",
        options: "gameProviders"
    }
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
            dynamicCond: dynamicCond,
            customCond: {
                depositMethod: {
                    index: 19,
                    type: "multiSelect",
                    des: "DEPOSIT_METHOD",
                    options: "depositMethod",
                    detail: "REWARD_TOP_UP_TYPE_DETAIL"
                }
            }
        },
        param: {
            tblOptFixed: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                isSteppingReward: {type: "checkbox", des: "Reward step needed"},
                countInRewardInterval: {type: "number", des: "Reward limit in interval"},
                rewardParam: {
                    minTopUpAmount: {type: "number", des: "Minimum top up amount"},
                    rewardAmount: {type: "number", des: "Reward amount"},
                    spendingTimesOnReward: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                isSteppingReward: {type: "checkbox", des: "Reward step needed"},
                countInRewardInterval: {type: "number", des: "Reward limit in interval"},
                dailyMaxRewardAmount: {type: "number", des: "Daily Reward Limit"},
                rewardParam: {
                    minTopUpAmount: {type: "number", des: "Minimum top up amount"},
                    rewardPercentage: {type: "percentage", des: "Reward percentage"},
                    maxRewardInSingleTopUp: {type: "number", des: "Max reward in single top up"},
                    spendingTimes: {type: "number", des: "Spending times"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            }
        }
    }
}, {
    upsert: true
});

var param100Cursor = db.rewardParam.find({"name": type100});
var param100 = param100Cursor.next();

db.rewardType.update({"name": type100}, {$set: {params: param100._id, des: type100, isGrouped: true}}, {upsert: true});

// 签到全勤
var type101 = "PlayerConsecutiveRewardGroup";

db.rewardParam.update({
    "name": type101
}, {
    $set: {
        condition: {
            generalCond: generalCond,
            topUpCond: topUpCond,
            periodCond: {
                interval: {index: 20, type: "select", des: "Reward interval", options: "rewardInterval", detail: "REWARD_INTERVAL_DETAIL"},
            },
            consumptionCond: consumptionCond,
            consumptionProviderCond: consumptionProviderCond,
            allTopUpCond: {
                ignoreAllTopUpDirtyCheckForReward: {
                    index: 32,
                    type: "multiSelect",
                    des: "Ignore the following rewards that applied with all top up",
                    options: "allRewardEvent",
                    detail: "REWARD_TOP_UP_DIRTY_FOR_REWARD_DETAIL"
                }
            },
            customCond: {
                requireNonBreakingCombo: {
                    index: 21,
                    type: "checkbox",
                    des: "Player does not need to earn reward consecutively in order for it to accumulate",
                    detail: "REWARD_REQUIRE_NON_BREAKING_COMBO_DETAIL"
                },
                allowReclaimMissedRewardDay: {
                    index: 21.1,
                    type: "checkbox",
                    des: "Player can delay apply for reward within period",
                    detail: "REWARD_RECLAIM_MISSED_DAY_DETAIL"
                },
            },
            dynamicCond: dynamicCond,
        },
        param: {
            tblOptFixed: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                requiredTopUpAmount: {type: "number", des: "Required top up amount daily"},
                requiredConsumptionAmount: {type: "number", des: "Required consumption amount daily"},
                operatorOption: {type: "checkbox", des: "Required both"},
                rewardParam: {
                    rewardAmount: {type: "number", des: "Reward amount"},
                    spendingTimes: {type: "number", des: "Spending times needed"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                requiredTopUpAmount: {type: "number", des: "Required top up amount daily"},
                requiredConsumptionAmount: {type: "number", des: "Required consumption amount daily"},
                dailyMaxRewardAmount: {type: "number", des: "Daily Reward Limit"},
                operatorOption: {type: "checkbox", des: "Required both"},
                rewardParam: {
                    totalConsumptionInInterval: {type: "number", des: "Total Consumption In Interval"},
                    rewardPercentage: {type: "percentage", des: "Reward percentage"},
                    maxRewardInSingleTopUp: {type: "number", des: "Max reward in single top up"},
                    spendingTimes: {type: "number", des: "Spending times"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            }
        }
    }
}, {
    upsert: true
});

var param101Cursor = db.rewardParam.find({"name": type101});
var param101 = param101Cursor.next();

db.rewardType.update({"name": type101}, {$set: {params: param101._id, des: type101, isGrouped: true}}, {upsert: true});

// region输值反利
var type102 = "PlayerLoseReturnRewardGroup";

db.rewardParam.update({
    "name": type102
}, {
    $set: {
        condition: {
            generalCond: generalCond,
            topUpCond: topUpCond,
            periodCond: periodCond,
            consumptionCond: consumptionCond,
            loseValueCond: loseValueCond,
            allTopUpCond: {
                ignoreAllTopUpDirtyCheckForReward: {
                    index: 32,
                    type: "multiSelect",
                    des: "Ignore the following rewards that applied with all top up",
                    options: "allRewardEvent"
                }
            },
            dynamicCond: {
                isDynamicRewardAmount: {
                    index: 50,
                    type: "checkbox",
                    des: "Reward amount is dynamically changed by losses"
                }
            }
        },
        param: {
            tblOptFixed: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                rewardParam: {
                    minDeposit: {type: "number", des: "Minimum Deposit Period"},
                    minLoseAmount: {type: "number", des: "Minimum Lose Period"},
                    rewardAmount: {type: "number", des: "Reward amount"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                rewardParam: {
                    minDeposit: {type: "number", des: "Minimum Deposit Period"},
                    minLoseAmount: {type: "number", des: "Minimum Lose Period"},
                    rewardPercent: {type: "number", des: "PROMO_REWARD_%"},
                    maxReward: {type: "number", des: "Maximum Reward"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            }
        }
    }
}, {
    upsert: true
});

var param102Cursor = db.rewardParam.find({"name": type102});
var param102 = param102Cursor.next();

db.rewardType.update({"name": type102}, {$set: {params: param102._id, des: type102, isGrouped: true}}, {upsert: true});
//endregion

// 投注额奖励
var type103 = "PlayerConsumptionRewardGroup";
db.rewardParam.update({
    "name": type103
}, {
    $set: {
        condition: {
            generalCond: generalCond,
            periodCond: periodCond,
            consumptionCond: consumptionCond,
            customCond: {
                consumptionProviderSource: {
                    index: 22,
                    type: "multiSelect",
                    des: "Check consumption source by provider",
                    options: "gameProviders"
                }
            }
        },
        param: {
            tblOptFixed: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                isSteppingReward: {type: "checkbox", des: "Reward step needed"},
                countInRewardInterval: {type: "number", des: "Reward limit in interval"},
                rewardParam: {
                    totalConsumptionInInterval: {type: "number", des: "Total consumption amount in interval"},
                    rewardAmount: {type: "number", des: "Reward amount"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {}
        }
    }
}, {
    upsert: true
});

var param103Cursor = db.rewardParam.find({"name": type103});
var param103 = param103Cursor.next();

db.rewardType.update({"name": type103}, {$set: {params: param103._id, des: type103, isGrouped: true}}, {upsert: true});


// 免费体验金
var type104 = "PlayerFreeTrialRewardGroup";
db.rewardParam.update({
    "name": type104
}, {
    $set: {
        condition: {
            generalCond: generalCond,
            periodCond: periodCond,
            consumptionCond: consumptionCond,
            customCond: {
                checkIPFreeTrialReward: {
                    index: 23,
                    type: "checkbox",
                    des: "Check if this IP address has received free trial"
                },
                checkPhoneFreeTrialReward: {
                    index: 24,
                    type: "checkbox",
                    des: "Check if this phone number has received free trial"
                },
                needSMSVerification: {
                    index: 25,
                    type: "checkbox",
                    des: "Need SMS verification"
                },
                forbidApplyReward: {
                    index: 26,
                    type: "multiSelect",
                    des: "Forbid to apply other reward within reward interval",
                    options: "allRewardEvent"
                },
                checkIsMobileDeviceAppliedBefore: {
                    index: 27,
                    type: "checkbox",
                    des: "Check if this mobile device has received free trial"
                }
            }
        },
        param: {
            tblOptFixed: {
                rewardParam: {
                    rewardAmount: {type: "number", des: "FREE_TRIAL_REWARD_AMOUNT"},
                    spendingTimes: {type: "number", des: "FREE_TRIAL_SPENDING_TIMES"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {} // will never reach here
        }
    }
}, {
    upsert: true
});

var param104Cursor = db.rewardParam.find({"name": type104});
var param104 = param104Cursor.next();

db.rewardType.update({"name": type104}, {$set: {params: param104._id, des: type104, isGrouped: true}}, {upsert: true});


// 随机抽奖
var type105 = "PlayerRandomRewardGroup";
db.rewardParam.update({
    "name": type105
}, {
    $set: {
        condition: {
            generalCond: Object.assign({}, generalCond, {
                applyType: {
                    index: 2,
                    type: "select",
                    des: "Reward apply type",
                    options: "rewardApplyType",
                    disabled: true,
                    value: "1"
                },
                imageUrl: {
                    index: 3,
                    type: "ImageURLText",
                    des: "Display imageUrl",
                    value: [""]
                },
                canApplyFromClient: {
                    index: 4,
                    type: "checkbox",
                    des: "Is player manually applicable",
                    disabled: true,
                    value: false
                }
            }),
            periodCond: {
                interval: {index: 20, type: "select", des: "Reward interval", options: "rewardInterval"},
            },
            consumptionCond: consumptionCond,
            consumptionProviderCond: consumptionProviderCond,
            topUpCond: topUpCond,
            latestTopUpCond: {
                ignoreTopUpDirtyCheckForReward: {
                    index: 32,
                    type: "multiSelect",
                    des: "Ignore the following rewards that applied with all top up",
                    options: "allRewardEvent"
                }
            },
            customCond: {
                rewardAppearPeriod: {
                    index: 26,
                    type: "datetimePeriod",
                    des: "Period show reward",
                    value: [{startDate: "", startTime: "", endDate: "", endTime: ""}]
                },
                checkSameIP: {
                    index: 27,
                    type: "checkbox",
                    des: "Check if this IP address has received the reward"
                },
                checkSamePhoneNumber: {
                    index: 28,
                    type: "checkbox",
                    des: "Check if this phone number has received the reward"
                },
                checkSameDeviceId: {
                    index: 29,
                    type: "checkbox",
                    des: "Check if this portable device has received the reward",
                    detail: "Check the IMEI value/unique code of each handset when applying through APP"
                },
                needSMSVerification: {
                    index: 30,
                    type: "checkbox",
                    des: "Need SMS verification"
                },
            }
        },
        param: {
            tblOptFixed: {
                rewardParam: {
                    numberParticipation: {type: "number", des: "Number of participation"},
                    requiredTopUpAmount: {type: "number", des: "Required top up amount"},
                    operatorOption: {type: "checkbox", des: "Required both"},
                    requiredConsumptionAmount: {type: "number", des: "Required consumption amount"},
                    rewardPercentageAmount: {
                        type: "PercentageAmount",
                        des: "Reward percentage and reward amount",
                        value: [{percentage: "", amount: ""}]
                    },
                    spendingTimesOnReward: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {} // will never reach here
        }
    }
}, {
    upsert: true
});


var param105Cursor = db.rewardParam.find({"name": type105});
var param105 = param105Cursor.next();

db.rewardType.update({"name": type105}, {$set: {params: param105._id, des: type105, isGrouped: true}}, {upsert: true});


// 幸运注单（组）
var type106 = "PlayerConsumptionSlipRewardGroup";
db.rewardParam.update({
    "name": type106
}, {
    $set: {
        condition: {
            generalCond: generalCond,
            topUpCond: topUpCond,
            periodCond: periodCond,
            consumptionCond: consumptionCond,
            customCond: {
                consumptionSlipProviderSource: {
                    index: 42,
                    type: "multiSelect",
                    des: "Check consumption slip source by provider",
                    options: "gameProviders"
                },
                countInRewardInterval: {index: 43, type: "number", des: "Apply Reward limit in interval"},
            }
        },
        param: {
            tblOptFixed: {
                rewardParam: {
                    consumptionSlipEndingDigit: {type: "text", des: "Consumption Slip Ending Digit"},
                    bonusRatio: {type: "number", des: "Bonus Ratio"},
                    minConsumptionAmount: {type: "number", des: "Minimum consumption slip amount"},
                    topUpAmount: {type: "number", des: "Top Up Amount Period"},
                    rewardAmount: {type: "number", des: "Consumption Slip Reward Amount"},
                    maxRewardAmountInSingleReward: {type: "number", des: "Max Reward Amount In Single Reward"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {}
        }
    }
}, {
    upsert: true
});


var param106Cursor = db.rewardParam.find({"name": type106});
var param106 = param106Cursor.next();

db.rewardType.update({"name": type106}, {$set: {params: param106._id, des: type106, isGrouped: true}}, {upsert: true});

// 提升留存（组）
var type107 = "PlayerRetentionRewardGroup";
db.rewardParam.update({
    "name": type107
}, {
    $set: {
        condition: {
            generalCond: Object.assign({}, generalCond, {
                applyType: {
                    index: 2,
                    type: "select",
                    des: "Reward apply type",
                    options: "rewardApplyType",
                    disabled: true,
                    value: "4",
                    detail: "This reward has to be applied first by the player, and once the requirement is fulfilled the reward will be generated automatically"
                },
            }),
            topUpCond: topUpCond,
            periodCond: periodCond,
            consumptionCond: consumptionCond,
            dynamicCond: dynamicCond,
            customCond: {
                checkSameIP: {
                    index: 43,
                    type: "checkbox",
                    des: "Check if this IP address has received the reward"
                },
                checkSamePhoneNumber: {
                    index: 44,
                    type: "checkbox",
                    des: "Check if this phone number has received the reward"
                },
                checkSameDeviceId: {
                    index: 45,
                    type: "checkbox",
                    des: "Check if this portable device has received the reward",
                    detail: "Check the IMEI value/unique code of each handset when applying through APP"
                },
                quantityLimitInInterval: {
                    index: 46,
                    type: "number",
                    des: "The quantity limit of the reward application for the interval",
                    detail: "Only limited quantity of reward is open for applying"
                },
                minDepositAmount: {
                    index: 47,
                    type: "number",
                    des: "The minimum required top up amount to apply for the reward",
                    detail: "Only 1 top up record can be used for the reward during the interval"
                },
                allowOnlyLatestTopUp: {
                    index: 48,
                    type: "checkbox",
                    des: "Check if this is the latest top up record",
                    detail: "Only the latest new top up record without consumption record and withdrawal record can be used to apply"
                },
                ignoreTopUpDirtyCheckForReward: {
                    index: 49,
                    type: "multiSelect",
                    des: "Ignore the following rewards that applied with the latest top up",
                    options: "allRewardEvent"
                },
                definePlayerLoginMode: {
                    index: 52,
                    type: "select",
                    options: "playerLoginMode",
                    des: "Define player login mode",
                    detail1: "1. Accumulative login day: login at  day 1, 2 and 3, collect the reward for day 1, 2 and 3.",
                    detail2: "2. Exact login date: login at 1st, 3rd and 5th, collect the reward for day 1, 3 and 5.",
                    detail3: "3. Accumulative login day: the period start counting from the day when player applies; login at  day 1, 2 and 3, collect the reward for day 1, 2 and 3."
                },
            }
        },
        param: {
            tblOptFixed: {
                rewardParam: {
                    loginDay: {type: "number"},
                    rewardAmount: {type: "number", des: "Actual Reward Amount"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {
                rewardParam: {
                    loginDay: {type: "number"},
                    rewardPercentage: {type: "percentage", des: "Reward Percentage %"},
                    maxRewardAmountInSingleReward: {type: "number", des: "Max Reward Amount In Single Reward"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            }
        }
    }
}, {
    upsert: true
});


var param107Cursor = db.rewardParam.find({"name": type107});
var param107 = param107Cursor.next();

db.rewardType.update({"name": type107}, {$set: {params: param107._id, des: type107, isGrouped: true}}, {upsert: true});

// 盈利翻倍奖（组）
var type108 = "PlayerBonusDoubledRewardGroup";
db.rewardParam.update({
    "name": type108
}, {
    $set: {
        condition: {
            generalCond: Object.assign({}, generalCond, {
                applyType: {
                    index: 2,
                    type: "select",
                    des: "Reward apply type",
                    options: "rewardApplyType",
                    disabled: true,
                    value: "1",
                    detail: "Reward settlement will be triggered when there is a transferring-out process, after applying this reward"
                },
            }),
            // topUpCond: topUpCond,
            periodCond: periodCond,
            consumptionCond: consumptionCond,
            // dynamicCond: dynamicCond,
            customCond: {
                checkSameIP: {
                    index: 43,
                    type: "checkbox",
                    des: "Check if this IP address has received the reward"
                },
                checkSamePhoneNumber: {
                    index: 44,
                    type: "checkbox",
                    des: "Check if this phone number has received the reward"
                },
                checkSameDeviceId: {
                    index: 45,
                    type: "checkbox",
                    des: "Check if this portable device has received the reward",
                    detail: "Check the IMEI value/unique code of each handset when applying through APP"
                },
                defineRewardBonusCount: {
                    index: 46,
                    type: "select",
                    options: "bonusDoubledDefination",
                    des: "Define bonus-doubled",
                    detail: "For instance: 100$ is transferred in and bet, and 110 is gained; the calculation: +110/100 = 1.1, which is the multiplier",
                    value: "1",
                },
                quantityLimitInInterval: {
                    index: 47,
                    type: "number",
                    des: "The quantity limit of the reward application for the interval",
                    detail1: "1. A complete tranferring-in-out process considered as one consumption",
                    detail2: "2. If consecutive transferring-in process happened, the reward settlement will be triggered",
                    detail3: "3. A new cycle is begin if a player applies this reward after losing out all his credit (without transferring-out)"
                },
                gameProvider: {
                    index: 48,
                    type: "multiSelect",
                    des: "Game Providers in the bonus-doubled reward event",
                    options: "gameProviders",
                    detail: "(Multi-selection) Backstage will provide selections for the front-end application"
                },
                rewardBonusModal: {
                    index: 49,
                    type: "select",
                    options: "bonusDoubledRewardModal",
                    des: "The way of calculating the reward bonus",
                    detail: "Take #1 as an instance: (assumed the multiplier is 1) the reward bonus = 100(the principal) x 1%"
                },


            }
        },
        param: {
            // for rewardBonusModal #1
            tblOptDynamic: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                rewardParam: {
                    multiplier: {type: "number", des: "Multiplier setting"},
                    rewardPercentage: {type: "percentage", des: "Reward% (fill in accordingly with the multiplier)"},
                    maxRewardAmountInSingleReward: {type: "number", des: "Max Reward Amount In Single Reward"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            // for rewardBonusModal #2
            tblOptFixed: {
                isMultiStepReward: {type: "checkbox", des: "Is multi step reward"},
                rewardParam: {
                    multiplier: {type: "number", des: "Multiplier setting"},
                    rewardAmount: {type: "number", des: "Fixed Reward Amount"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            }
        }
    }
}, {
    upsert: true
});


var param108Cursor = db.rewardParam.find({"name": type108});
var param108 = param108Cursor.next();

db.rewardType.update({"name": type108}, {$set: {params: param108._id, des: type108, isGrouped: true}}, {upsert: true});

var type109 = "BaccaratRewardGroup";
db.rewardParam.update({
    "name": type109
}, {
    $set: {
        condition: {
            generalCond: Object.assign({}, generalCond, {
                applyType: {
                    index: 2,
                    type: "select",
                    des: "Reward apply type",
                    options: "rewardApplyType",
                    disabled: true,
                    value: "1",
                    detail: "Allow settlement via backstage batch submit"
                },
            }),
            periodCond: {
                // Reward apply interval
                interval: {index: 20, type: "select", des: "Reward interval", options: "rewardInterval", detail: "REWARD_INTERVAL_DETAIL"},
                // Top up count between interval check type
                topUpCountType: {index: 21, type: "interval", des: "Top up count between interval type", options: "intervalType", detail: "REWARD_TOPUP_COUNT_TYPE_DETAIL"}
            },
            consumptionCond: consumptionCond,
            customCond: {
                intervalMaxRewardAmount: {index: 42, type: "number", des: "Apply Max Reward Amount in interval", detail: "MAX_REWARD_AMOUNT_INTERVAL_DETAIL"},
            }
        },
        param: {
            tblOptFixed: {
                rewardParam: {
                    minBetAmount: {type: "number", des: "Minimum Bet Amount"},
                    pairResult: {type: "select", options: "pairResultType", des: "Banker or player tie (empty equal to any pairs)"},
                    hostResult: {type: "number", des: "Host Result"},
                    playerResult: {type: "number", des: "Player Result"},
                    rewardAmount: {type: "number", des: "Baccarat Reward Amount"},
                    spendingTimes: {type: "number", des: "Spending times on reward"},
                    forbidWithdrawAfterApply: {type: "checkbox", des: "Forbid withdraw after apply reward"},
                    forbidWithdrawIfBalanceAfterUnlock: {
                        type: "number",
                        des: "Forbid withdraw if there is balance after unlock"
                    },
                    remark: {type: "text", des: "Remark"},
                }
            },
            tblOptDynamic: {}
        }
    }
}, {
    upsert: true
});


var param109Cursor = db.rewardParam.find({"name": type109});
var param109 = param109Cursor.next();

db.rewardType.update({"name": type109}, {$set: {params: param109._id, des: type109, isGrouped: true}}, {upsert: true});