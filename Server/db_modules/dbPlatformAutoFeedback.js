var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var moment = require('moment-timezone');
var constSystemParam = require('../const/constSystemParam');
var mongoose = require('mongoose');
const dbutility = require('./../modules/dbutility');
const dbProposal = require('./../db_modules/dbProposal');
const constPlayerFeedbackResult = require('./../const/constPlayerFeedbackResult');
const constProposalEntryType = require('./../const/constProposalEntryType');
const constProposalUserType = require('./../const/constProposalUserType');
const constProposalType = require ('./../const/constProposalType');
const constServerCode = require ('./../const/constServerCode');
const constProposalStatus = require ('./../const/constProposalStatus');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbPlayerReward = require('./../db_modules/dbPlayerReward');
const dbPlayerFeedback = require('./../db_modules/dbPlayerFeedback');
const dbDepartment = require('./../db_modules/dbDepartment');
const ObjectId = mongoose.Types.ObjectId;

let dbPlatformAutoFeedback = {

    createAutoFeedback: function (autoFeedbackData) {
        console.log(autoFeedbackData);
        autoFeedbackData.enabled = autoFeedbackData.defaultStatus.toString().toLowerCase() === "active";
        return dbconfig.collection_autoFeedback(autoFeedbackData).save().then(
            data => {
                console.log(data);
                if(data) {
                    return JSON.parse(JSON.stringify(data));
                }
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error creating auto feedback.", error: error});
            }
        );
    },

    updateAutoFeedback: function (autoFeedbackObjId, autoFeedbackData) {
        console.log(autoFeedbackData);
        if(autoFeedbackData._id) {
            delete autoFeedbackData._id;
        }
        if(autoFeedbackData.defaultStatus) {
            delete autoFeedbackData.defaultStatus;
        }
        return dbconfig.collection_autoFeedback.findOneAndUpdate(
            {
                _id: autoFeedbackObjId,
            },
            autoFeedbackData,
            {new: true}
        ).then(
            data => {
                console.log(data);
                if(data) {
                    return JSON.parse(JSON.stringify(data));
                }
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error updating auto feedback.", error: error});
            }
        );
    },

    getAutoFeedback: function (query, index, limit, ignoreLimit) {
        console.log(query);
        index = index || 0;
        limit = limit || 10;
        let curTime = new Date();
        let result;
        if(query.createTimeStart) {
            query.createTime = {$gte: query.createTimeStart};
            delete query.createTimeStart;
        }
        if(query.createTimeEnd) {
            query.createTime = {$lte: query.createTimeEnd};
            delete query.createTimeEnd;
        }
        if(query.status) {
            let status = query.status;
            switch(status) {
                case 'Unbegun':
                    query.enabled = true;
                    query.missionStartTime = {$gt: curTime};
                    break;
                case 'Ongoing':
                    query.enabled = true;
                    query.missionStartTime = {$lte: curTime};
                    query.missionEndTime = {$gte: curTime};
                    break;
                case 'Ended':
                    query.enabled = true;
                    query.missionEndTime = {$lt: curTime};
                    break;
                case 'Manually Cancelled':
                    query.enabled = false;
                    break;
            }
            delete query.status;
        }
        console.log(query);
        if(ignoreLimit) {
            return dbconfig.collection_autoFeedback.find(query).sort({createTime:-1}).lean();
        } else {
            return dbconfig.collection_autoFeedback.find(query).sort({createTime: -1}).skip(index).limit(limit).lean().then(autoFeedbacks => {
                console.log(autoFeedbacks);
                result = autoFeedbacks;
                let missionsProms = [];
                autoFeedbacks.forEach(mission => {
                    let maxScheduleNumber = 3;
                    let missionProms = [];
                    for (let x = 0; x < maxScheduleNumber; x++) {
                        missionProms.push(dbconfig.collection_promoCode.count({
                            autoFeedbackMissionObjId: mission._id,
                            autoFeedbackMissionScheduleNumber: x + 1
                        }));
                    }
                    missionsProms.push(Promise.all(missionProms));
                });
                return Promise.all(missionsProms);
            }).then(counts => {
                result.forEach((item, i) => {
                    if (counts && counts[i]) {
                        item.firstRunCount = counts[i][0] || 0;
                        item.secondRunCount = counts[i][1] || 0;
                        item.thirdRunCount = counts[i][2] || 0;
                    } else {
                        item.firstRunCount = 0;
                        item.secondRunCount = 0;
                        item.thirdRunCount = 0;
                    }
                });
                return dbconfig.collection_autoFeedback.count(query).lean();
            }).then(totalResultCount => {
                return {total: totalResultCount, data: result};
            });
        }
    },

    getAutoFeedbackDetail: function (platformObjId, name, startTime, endTime) {
        let useProviderGroup;
        let autoFeedbackObjId, autoFeedbackName;
        let autoFeedbackQuery = {};
        autoFeedbackQuery.platformObjId = platformObjId;
        autoFeedbackQuery.name = name;
        return dbconfig.collection_platform.findOne({_id:platformObjId}).lean().then(platform => {
            useProviderGroup = platform.useProviderGroup
        }).then(() => {
            return dbconfig.collection_autoFeedback.findOne(autoFeedbackQuery).lean();
        }).then(autoFeedback => {
                if(autoFeedback) {
                    autoFeedbackObjId = autoFeedback._id;
                    autoFeedbackName = autoFeedback.name;
                    return autoFeedback;
                } else {
                    return Promise.reject();
                }
        }).then(() => {
            let promoCodeQuery = {};
            promoCodeQuery.autoFeedbackMissionObjId = autoFeedbackObjId;
            promoCodeQuery.createTime = {$gte: startTime, $lte:endTime};
            return dbconfig.collection_promoCode.find(promoCodeQuery).populate({
                path: "allowedProviders",
                model: useProviderGroup ? dbconfig.collection_gameProviderGroup : dbconfig.collection_gameProvider
            }).populate({
                path: "promoCodeTemplateObjId",
                model: dbconfig.collection_promoCodeTemplate
            }).populate({
                path: "playerObjId",
                model: dbconfig.collection_players
            }).lean();
        }).then(promoCodes => {
            if(promoCodes && promoCodes.length > 0) {
                promoCodes.forEach(item => {
                    item.playerName = item.playerObjId.name;
                    item.name = autoFeedbackName;
                    item.type = item.promoCodeTemplateObjId.type;
                });
            }
            return promoCodes;
        });
    },

    removeAutoFeedbackByObjId: function (objId) {
        return dbconfig.collection_autoFeedback.remove({_id: objId}).exec();
    },

    executeAutoFeedback: function () {
        let UTC8Time = dbutility.getUTC8Time(new Date());
        let curHour = new Date().getHours();
        let curMinute = new Date().getMinutes();
        let query = {
            missionStartTime: {$lte: UTC8Time},
            missionEndTime: {$gte: UTC8Time},
            $or: [{
                    'schedule.0.triggerHour': curHour,
                    'schedule.0.triggerMinute': curMinute
                }, {
                    'schedule.1.triggerHour': curHour,
                    'schedule.1.triggerMinute': curMinute
                }, {
                    'schedule.2.triggerHour': curHour,
                    'schedule.2.triggerMinute': curMinute
            }],
            enabled: true,
        };
        console.log("new date",(new Date()));
        console.log("UTC8Time",dbutility.getUTC8Time(new Date()));
        console.log("new date getLocalTime",dbutility.getLocalTime(new Date()));

        return dbPlatformAutoFeedback.getAutoFeedback(query, null, null, true).then(autoFeedbacks => {
            if(!autoFeedbacks || autoFeedbacks.length < 1) {
                return {message: 'No auto feedback for processing at this time.'};
            }
            let executeAutoFeedback = feedback => {
                console.log("feedbackName", feedback.name);
                console.log("feedback", feedback);
                let platformObjId = feedback.platformObjId;
                let roles = [];
                let admins = [];

                console.log("platformObjId", platformObjId);
                let departmentProm = dbDepartment.getDepartmentDetailsByPlatformObjId(feedback.platformObjId).then(departments => {
                    console.log("departments",departments);
                    departments.forEach(department => {
                        if(department._id == platformObjId) {
                            roles = department.roles;
                        }
                    });
                    if (feedback.departments) {
                        if (feedback.roles) {
                            roles.map(role => {
                                if (role._id != "" && (feedback.roles.indexOf(role._id) >= 0)) {
                                    role.users.map(user => admins.push(user._id))
                                }
                            })
                        } else {
                            roles.map(role =>
                                role.users.map(user => {
                                    if (user._id != "") {
                                        admins.push(user._id)
                                    }
                                })
                            )
                        }
                    }
                });

                return Promise.all([departmentProm]).then(() => {
                    let registerStartTime = feedback.registerStartTime;
                    let registerEndTime = feedback.registerEndTime;
                    let playerQuery = {platform: platformObjId};

                    let addMultipleOr = function (orArr) {
                        if (playerQuery.$and) {
                            playerQuery.$and.push({$or: orArr});
                        } else {
                            playerQuery.$and = [{$or: orArr}];
                        }
                    };

                    if (feedback.playerType && feedback.playerType != null) {
                        switch (feedback.playerType) {
                            case 'Test Player':
                                playerQuery.isRealPlayer = false;
                                break;
                            case 'Real Player (all)':
                                playerQuery.isRealPlayer = true;
                                break;
                            case 'Real Player (Individual)':
                                playerQuery.isRealPlayer = true;
                                playerQuery.partner = null;
                                break;
                            case 'Real Player (Under Partner)':
                                playerQuery.isRealPlayer = true;
                                playerQuery.partner = {$ne: null};
                        }
                    }

                    if (feedback.playerLevel !== "all") {
                        playerQuery.playerLevel = feedback.playerLevel;
                    }

                    if (feedback.credibilityRemarks && feedback.credibilityRemarks.length > 0) {
                        let tempArr = [];
                        let orQuery = [];
                        if (feedback.credibilityRemarks.includes("")) {
                            feedback.credibilityRemarks.forEach(remark => {
                                if(remark != "") {
                                    tempArr.push(remark);
                                }
                            });
                            orQuery = [{credibilityRemarks: []}, {credibilityRemarks: {$exists: false}}, {credibilityRemarks: {$in: tempArr}}];
                            addMultipleOr(orQuery);
                        } else {
                            playerQuery.credibilityRemarks = {$in: feedback.credibilityRemarks};
                        }
                    }

                    if (feedback.credibilityRemarksFilter && feedback.credibilityRemarksFilter.length > 0) {
                        let tempArr = [];
                        if (feedback.credibilityRemarksFilter.includes("")) {
                            feedback.credibilityRemarksFilter.forEach(remark => {
                                if (remark != "") {
                                    tempArr.push(remark);
                                }
                            });
                            playerQuery.$and = [{credibilityRemarks: {$ne: []}}, {credibilityRemarks: {$exists: true}}, {credibilityRemarks: {$nin: tempArr}}];
                        } else {
                            if (playerQuery.credibilityRemarks && playerQuery.credibilityRemarks.$in) {
                                playerQuery.$and = [{credibilityRemarks: {$nin: feedback.credibilityRemarksFilter}}];
                            }
                            else {
                                playerQuery.credibilityRemarks = {$nin: feedback.credibilityRemarksFilter};
                            }
                        }
                    }

                    if (feedback.lastAccessOperator === "range") {
                        playerQuery.lastAccessTime = {
                            $lt: dbutility.getDayEndTime(dbutility.getNDaysAgoFromSpecificStartTime(new Date(), feedback.lastAccessFormal)),
                            $gte: dbutility.getDayEndTime(dbutility.getNDaysAgoFromSpecificStartTime(new Date(), feedback.lastAccessLatter)),
                        };
                    } else {
                        let range = feedback.lastAccessOperator.split("-");
                        playerQuery.lastAccessTime = {
                            $lt: dbutility.getDayEndTime(dbutility.getNDaysAgoFromSpecificStartTime(new Date(), parseInt(range[0])))
                        };
                        if (range[1]) {
                            playerQuery.lastAccessTime["$gte"] = dbutility.getDayEndTime(dbutility.getNDaysAgoFromSpecificStartTime(new Date(), parseInt(range[1])));
                        }
                    }

                    if (feedback.filterFeedback || feedback.filterFeedbackTopic && feedback.filterFeedbackTopic.length > 0) {
                        let arr = [];
                        if(feedback.filterFeedback) {
                            let lastFeedbackTimeExist = {
                                lastFeedbackTime: null
                            };
                            let lastFeedbackTime = {
                                lastFeedbackTime: {
                                    $lt: dbutility.getDayEndTime(dbutility.getNDaysAgoFromSpecificStartTime(new Date(), feedback.filterFeedback))
                                }
                            };
                            arr.push(lastFeedbackTimeExist);
                            arr.push(lastFeedbackTime);
                        }
                        if(feedback.filterFeedbackTopic && feedback.filterFeedbackTopic.length > 0) {
                            let filterFeedbackTopic = {lastFeedbackTopic: {$nin: feedback.filterFeedbackTopic}};
                            arr.push(filterFeedbackTopic);
                        }
                        addMultipleOr(arr);
                    }

                    if (feedback.callPermission == 'true') {
                        playerQuery['permission.phoneCallFeedback'] = {$ne: false};
                    } else if (feedback.callPermission == 'false') {
                        playerQuery['permission.phoneCallFeedback'] = false;
                    }

                    if (feedback.depositCountOperator && feedback.depositCountFormal != null) {
                        switch (feedback.depositCountOperator) {
                            case ">=":
                                playerQuery.topUpTimes = {
                                    $gte: feedback.depositCountFormal
                                };
                                break;
                            case "=":
                                playerQuery.topUpTimes = feedback.depositCountFormal;
                                break;
                            case "<=":
                                playerQuery.topUpTimes = {
                                    $lte: feedback.depositCountFormal
                                };
                                break;
                            case "range":
                                if (feedback.depositCountLatter != null) {
                                    playerQuery.topUpTimes = {
                                        $lte: feedback.depositCountLatter,
                                        $gte: feedback.depositCountFormal
                                    };
                                }
                                break;
                        }
                    }

                    if (feedback.playerValueOperator && feedback.playerValueFormal != null) {
                        switch (feedback.playerValueOperator) {
                            case ">=":
                                playerQuery.valueScore = {
                                    $gte: feedback.playerValueFormal
                                };
                                break;
                            case "=":
                                playerQuery.valueScore = feedback.playerValueFormal;
                                break;
                            case "<=":
                                playerQuery.valueScore = {
                                    $lte: feedback.playerValueFormal
                                };
                                break;
                            case "range":
                                if (feedback.playerValueLatter != null) {
                                    playerQuery.valueScore = {
                                        $lte: feedback.playerValueLatter,
                                        $gte: feedback.playerValueFormal
                                    };
                                }
                                break;
                        }
                    }

                    if (feedback.consumptionTimesOperator && feedback.consumptionTimesFormal != null) {
                        switch (feedback.consumptionTimesOperator) {
                            case ">=":
                                playerQuery.consumptionTimes = {
                                    $gte: feedback.consumptionTimesFormal
                                };
                                break;
                            case "=":
                                playerQuery.consumptionTimes = feedback.consumptionTimesFormal;
                                break;
                            case "<=":
                                playerQuery.consumptionTimes = {
                                    $lte: feedback.consumptionTimesFormal
                                };
                                break;
                            case "range":
                                if (feedback.consumptionTimesLatter != null) {
                                    playerQuery.consumptionTimes = {
                                        $lte: feedback.consumptionTimesLatter,
                                        $gte: feedback.consumptionTimesFormal
                                    };
                                }
                                break;
                        }
                    }

                    if (feedback.bonusAmountOperator && feedback.bonusAmountFormal != null) {
                        switch (feedback.bonusAmountOperator) {
                            case ">=":
                                playerQuery.bonusAmountSum = {
                                    $gte: feedback.bonusAmountFormal
                                };
                                break;
                            case "=":
                                playerQuery.bonusAmountSum = feedback.bonusAmountFormal;
                                break;
                            case "<=":
                                playerQuery.bonusAmountSum = {
                                    $lte: feedback.bonusAmountFormal
                                };
                                break;
                            case "range":
                                if (feedback.bonusAmountLatter != null) {
                                    playerQuery.bonusAmountSum = {
                                        $lte: feedback.bonusAmountLatter,
                                        $gte: feedback.bonusAmountFormal
                                    };
                                }
                                break;
                        }
                    }

                    if (feedback.withdrawTimesOperator && feedback.withdrawTimesFormal != null) {
                        switch (feedback.withdrawTimesOperator) {
                            case ">=":
                                playerQuery.withdrawTimes = {
                                    $gte: feedback.withdrawTimesFormal
                                };
                                break;
                            case "=":
                                playerQuery.withdrawTimes = feedback.withdrawTimesFormal;
                                break;
                            case "<=":
                                playerQuery.withdrawTimes = {
                                    $lte: feedback.withdrawTimesFormal
                                };
                                break;
                            case "range":
                                if (feedback.withdrawTimesLatter != null) {
                                    playerQuery.withdrawTimes = {
                                        $lte: feedback.withdrawTimesLatter,
                                        $gte: feedback.withdrawTimesFormal
                                    };
                                }
                                break;
                        }
                    }

                    if (feedback.topUpSumOperator && feedback.topUpSumFormal != null) {
                        switch (feedback.topUpSumOperator) {
                            case ">=":
                                playerQuery.topUpSum = {
                                    $gte: feedback.topUpSumFormal
                                };
                                break;
                            case "=":
                                playerQuery.topUpSum = feedback.topUpSumFormal;
                                break;
                            case "<=":
                                playerQuery.topUpSum = {
                                    $lte: feedback.topUpSumFormal
                                };
                                break;
                            case "range":
                                if (feedback.topUpSumLatter != null) {
                                    playerQuery.topUpSum = {
                                        $lte: feedback.topUpSumLatter,
                                        $gte: feedback.topUpSumFormal
                                    };
                                }
                                break;
                        }
                    }

                    if (feedback.gameProviderId && feedback.gameProviderId.length > 0) {
                        playerQuery.gameProviderPlayed = {$in: feedback.gameProviderId};
                    }

                    if (feedback.isNewSystem === "old") {
                        playerQuery.isNewSystem = {$ne: true};
                    } else if (feedback.isNewSystem === "new") {
                        playerQuery.isNewSystem = true;
                    }

                    if (registerStartTime && registerEndTime) {
                        playerQuery.registrationTime = {$gte: registerStartTime, $lte: registerEndTime};
                    }

                    if ( (feedback.admins && feedback.admins.length > 0) || admins.length) {
                        let csOfficer = feedback.admins && feedback.admins.length > 0 ? feedback.admins : admins;
                        if (csOfficer && csOfficer.length) {
                            let noneCSOfficerQuery = {}, csOfficerArr = [];

                            csOfficer.forEach(item => {
                                if (item == "") {
                                    noneCSOfficerQuery = {csOfficer: {$exists: false}};
                                } else {
                                    csOfficerArr.push(ObjectId(item));
                                }
                            });

                            console.log("noneCSOfficerQuery",noneCSOfficerQuery);
                            console.log("csOfficerArr",csOfficerArr);
                            if (Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0 && csOfficerArr.length > 0) {
                                addMultipleOr([noneCSOfficerQuery, {csOfficer: {$in: csOfficerArr}}]);

                            } else if ((Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0) && !csOfficerArr.length) {
                                playerQuery.csOfficer = {$exists: false};

                            } else if (csOfficerArr.length > 0 && !Object.keys(noneCSOfficerQuery).length){
                                playerQuery.csOfficer = {$in: csOfficerArr};

                            }
                        }
                    }

                    console.log('playerQuery', playerQuery);
                    console.log('playerQueryAND', JSON.stringify(playerQuery.$and));
                    return dbconfig.collection_players.find(playerQuery).lean();
                }).then(filteredPlayers => {
                    // console.log("filteredPlayers", filteredPlayers);
                    feedback.schedule.forEach((item, index) => {
                        let curScheduleNumber = index + 1;
                        if(item.triggerHour == curHour && item.triggerMinute == curMinute) {
                            filteredPlayers.forEach(player => {
                                let newPromoCodeEntry;
                                return dbconfig.collection_promoCode.find({
                                    playerObjId: player._id,
                                    autoFeedbackMissionObjId: feedback._id
                                }).sort({createTime: -1}).limit(1).lean().then(promoCode => {
                                    console.log("promoCode",promoCode);
                                    if(promoCode && promoCode.length > 0) {
                                        promoCode = promoCode[0];
                                        let curTime = new Date().getTime();
                                        let timeAfterLastMission = dbutility.getNdaylaterFromSpecificStartTime(item.dayAfterLastMission, new Date(promoCode.createTime)).getTime();
                                        let promoCodeCreateTime = new Date(promoCode.createTime).getTime();
                                        let playerLastAccessTime = new Date(player.lastAccessTime).getTime();
                                        if(curScheduleNumber-1 == promoCode.autoFeedbackMissionScheduleNumber &&
                                            curTime >= timeAfterLastMission && playerLastAccessTime < promoCodeCreateTime) {
                                            return dbconfig.collection_promoCodeTemplate.findOne({_id: item.template}).lean();
                                        } else if(curScheduleNumber == 1 && playerLastAccessTime > promoCodeCreateTime) {
                                            return dbconfig.collection_promoCodeTemplate.findOne({_id: item.template}).lean();
                                        }
                                    } else {
                                        if(curScheduleNumber == 1) {
                                            return dbconfig.collection_promoCodeTemplate.findOne({_id: item.template}).lean();
                                        }
                                    }
                                    return null;
                                }).then(template => {
                                    console.log("template",template);
                                    if(template) {
                                        newPromoCodeEntry = JSON.parse(JSON.stringify(template));
                                        delete newPromoCodeEntry._id;
                                        delete newPromoCodeEntry.createTime;
                                        newPromoCodeEntry.promoCodeTemplateObjId = template._id;
                                        newPromoCodeEntry.playerName = player.name;
                                        newPromoCodeEntry.expirationTime = dbutility.getNdaylaterFromSpecificStartTime(template.expiredInDay, new Date());
                                        newPromoCodeEntry.autoFeedbackMissionObjId = feedback._id;
                                        newPromoCodeEntry.autoFeedbackMissionScheduleNumber = curScheduleNumber;
                                        newPromoCodeEntry.allowedSendSms = true;
                                        return dbPlayerReward.generatePromoCode(player.platform, newPromoCodeEntry, null, null);
                                    } else {
                                        return null;
                                    }
                                }).then(promoCode => {
                                    if(promoCode) {
                                        let feedbackData = {
                                            playerId: player._id,
                                            platform: player.platform,
                                            content: item.content,
                                            result: item.feedbackResult,
                                            topic: item.feedbackTopic,
                                            createTime: new Date()
                                        };
                                        return dbPlayerFeedback.createPlayerFeedback(feedbackData);
                                    } else {
                                        return Promise.resolve();
                                    }
                                })
                            });
                        }
                    });
                });
            };

            let executionChain = Promise.resolve();
            autoFeedbacks.forEach(feedback => {
                executionChain = executionChain.then(()=>{
                    return executeAutoFeedback(feedback);
                });
            });
            return executionChain;
        })
    }
};

module.exports = dbPlatformAutoFeedback;
