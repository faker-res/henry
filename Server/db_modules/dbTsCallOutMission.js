const dbconfig = require('./../modules/dbproperties');
const dbutility = require('./../modules/dbutility');
const dbCtiCallOut = require('./dbCtiCallOut');
const dbTeleSales = require('./dbTeleSales');

const constCallOutMissionStatus = require('./../const/constCallOutMissionStatus');
const constCallOutMissionCalleeStatus = require('./../const/constCallOutMissionCalleeStatus');

const request = require('request');
const rsaCrypto = require('./../modules/rsaCrypto');
const errorUtils = require("./../modules/errorUtils");

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

let dbTsCallOutMission = {
    createCallOutMission: (platformObjId, adminObjId, searchFilter, searchQuery, sortCol, selectedPhones) => {
        let platform, admin, calleeList, callOutMission, availableCallOutMission;
        searchQuery = typeof searchQuery == "string" ? JSON.parse(searchQuery) : searchQuery;

        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
        let availableCallOutMissionProm = dbconfig.collection_tsCallOutMission.find({admin: adminObjId, isUsing: true}).lean();

        return Promise.all([platformProm, adminProm, availableCallOutMissionProm]).then(
            data => {
                ([platform, admin, availableCallOutMission] = data);

                if (!platform ) {
                    return Promise.reject({name: "DataError", message: "Platform not found."});
                }

                if (!admin) {
                    return Promise.reject({name: "DataError", message: "No admin acc"});
                }

                if (availableCallOutMission && availableCallOutMission.length) {
                    availableCallOutMission.map(mission => {
                        dbconfig.collection_tsCallOutMission.update({missionName: mission.missionName}, {isUsing: false}).exec().catch(err => {
                            console.log('unuse mission fail', mission.missionName, err);
                            return errorUtils.reportError(err);
                        });
                    });
                }

                return getCalleeList(searchQuery, sortCol, selectedPhones);
            }
        ).then(
            calleeData => {
                if (!calleeData || !calleeData.length) {
                    return Promise.reject({name: "DataError", message: "Player Not Found"});
                }

                calleeList = calleeData;

                return dbCtiCallOut.addMissionToCti(platform, admin, calleeList, platform.teleMarketingMaxRingTime, platform.teleMarketingRedialTimes, platform.teleMarketingMinRedialInterval, platform.teleMarketingIdleAgentMultiple, true);
            }
        ).then(
            missionName => {
                let callOutMissionData = {
                    platform: platform._id,
                    admin: admin._id,
                    adminName: admin.adminName,
                    missionName: missionName,
                    searchFields: searchFilter,
                    status: constCallOutMissionStatus.ON_GOING,
                };

                // todo :: might want to change to upsert if necessary
                return dbconfig.collection_tsCallOutMission(callOutMissionData).save();
            }
        ).then(
            callOutMissionData => {
                callOutMission = callOutMissionData;
                let proms = [];

                for (let i = 0; i < calleeList.length; i++) {
                    let callee = calleeList[i];
                    let calleeData = {
                        platform: platform._id,
                        admin: admin._id,
                        mission: callOutMission._id,
                        missionName: callOutMission.missionName,
                        indexNo: i,
                        tsPhone: callee.tsPhone,
                        tsDistributedPhone: callee.tsDistributedPhone,
                        phoneNumber: callee.phoneNumber
                    };

                    let prom = dbconfig.collection_tsCallOutMissionCallee(calleeData).save().catch(errorUtils.reportError);
                    proms.push(prom);
                }

                return Promise.all(proms);
            }
        ).then(
            () => {
                return callOutMission;
            }
        );
    },

    toggleCallOutMissionStatus: (platformObjId, missionName, adminObjId) => {
        let platform = {};
        let mission = {};
        let operation;
        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platformData => {
                platform = platformData;

                let missionProm = dbconfig.collection_tsCallOutMission.findOne({missionName: missionName}).lean();
                let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
                return Promise.all([missionProm, adminProm]);
            }
        ).then(
            ([missionData, adminData]) => {
                if (!missionData) {
                    return Promise.reject({message: "Call out mission not found."});
                }
                mission = missionData;

                let admin = adminData || {};

                if (mission.status == constCallOutMissionStatus.ON_GOING) {
                    operation = constCallOutMissionStatus.PAUSED;
                } else if (mission.status == constCallOutMissionStatus.PAUSED) {
                    operation = constCallOutMissionStatus.ON_GOING;
                } else {
                    return Promise.reject({message: "This mission is finished."})
                }

                return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, operation, admin.ctiTsUrl || admin.ctiUrl);
            }
        ).then(
            () => {
                return dbconfig.collection_tsCallOutMission.findOneAndUpdate({_id: mission._id}, {status: operation}, {new: true}).lean();
            }
        );
    },

    stopCallOutMission: (platformObjId, missionName, adminObjId) => {
        let platform = {};
        let mission = {};

        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platformData => {
                platform = platformData;

                let missionProm = dbconfig.collection_tsCallOutMission.findOne({missionName: missionName}).lean();
                let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
                return Promise.all([missionProm, adminProm]);
            }
        ).then(
            ([missionData, adminData]) => {
                if (!missionData) {
                    return Promise.reject({message: "Call out mission not found."});
                }
                mission = missionData;
                let admin = adminData || {};

                if (mission.status != constCallOutMissionStatus.ON_GOING && mission.status != constCallOutMissionStatus.PAUSED && mission.status != constCallOutMissionStatus.CREATED) {
                    return Promise.reject({message: "This mission is finished."})
                }

                if (mission.status == constCallOutMissionStatus.PAUSED) {
                    return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.ON_GOING, admin.ctiTsUrl || admin.ctiUrl).then(
                        () => dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.FINISHED, admin.ctiTsUrl || admin.ctiUrl)
                    );
                }

                return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.FINISHED, admin.ctiTsUrl || admin.ctiUrl); //.catch().then(() => deleteCtiMission(platform, missionName));
            }
        ).then(
            () => {
                return dbconfig.collection_tsCallOutMission.findOneAndUpdate({_id: mission._id}, {status: constCallOutMissionStatus.CANCELLED}, {new: true}).lean();
            }
        );
    },

    checkTsCtiMissionMode: (platformObjId, adminObjId) => {
        return dbconfig.collection_tsCallOutMission.findOne({
            platform: platformObjId,
            admin: adminObjId,
            isUsing: true
        }).lean().then(
            tsCallOutMission => {
                return {hasOnGoingMission: Boolean(tsCallOutMission)};
            }
        );
    },

    getUpdatedAdminMissionStatusFromCti: (platformObjId, adminObjId, limit, index) => {
        let platform, admin;

        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();

        return Promise.all([platformProm, adminProm]).then(
            data => {
                ([platform, admin] = data);

                if (!platform ) {
                    return Promise.reject({name: "DataError", message: "Platform not found."});
                }

                if (!admin) {
                    return Promise.reject({name: "DataError", message: "No admin acc"});
                }

                return dbconfig.collection_tsCallOutMission.findOne({
                    platform: platform._id,
                    admin: admin._id,
                    // status: {
                    //     $in: [
                    //         constCallOutMissionStatus.CREATED,
                    //         constCallOutMissionStatus.ON_GOING,
                    //         constCallOutMissionStatus.PAUSED
                    //     ]
                    // }
                    isUsing: true
                }).lean();
            }
        ).then(
            callOutMissionData => {
                if (!callOutMissionData) {
                    return {hasOnGoingMission: false};
                }

                return getUpdatedMissionDetail(platform, admin, callOutMissionData, limit, index);
            }
        );
    },

    confirmMissionFinish: (platformObjId, adminObjId, missionName) => {
        let platform, admin;

        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();

        return Promise.all([platformProm, adminProm]).then(
            data => {
                ([platform, admin] = data);

                if (!platform ) {
                    return Promise.reject({name: "DataError", message: "Platform not found."});
                }

                if (!admin) {
                    return Promise.reject({name: "DataError", message: "No admin acc"});
                }

                return dbconfig.collection_tsCallOutMission.findOneAndUpdate({
                    platform: platform._id,
                    admin: admin._id,
                    status: constCallOutMissionStatus.FINISHED,
                    missionName: missionName,
                    isUsing: true
                }, {
                    isUsing: false
                }, {
                    new: true
                }).lean();
            }
        ).then(
            mission => {
                if (!mission) {
                    console.log("ts confirm mission finish failure, mission not found", missionName)
                    return Promise.reject({message: "Mission not found, probably finished."})
                }
                addCallOutMissionFailureFeedback(mission._id, adminObjId).catch(err => {
                    console.log("ts auto feedback failure", mission._id, err);
                });
                return mission;
            }
        );
    },

    forceStopFPMSMission: (platformObjId, adminObjId) => {
        let platform, admin;

        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();

        return Promise.all([platformProm, adminProm]).then(
            data => {
                ([platform, admin] = data);

                if (!platform ) {
                    return Promise.reject({name: "DataError", message: "Platform not found."});
                }

                if (!admin) {
                    return Promise.reject({name: "DataError", message: "No admin acc"});
                }

                return dbconfig.collection_tsCallOutMission.update({
                    platform: platform._id,
                    admin: admin._id,
                    isUsing: true
                }, {isUsing: false}, {multi: true}).lean();
            }
        );
    },
};

module.exports = dbTsCallOutMission;

function getUpdatedMissionDetail (platform, admin, mission, limit, index) {
    let apiOutput, ctiMissionStatus;

    return dbCtiCallOut.getCtiCallOutMissionDetail(platform, mission.missionName, admin.ctiTsUrl || admin.ctiUrl).then(
        apiOutputData => {
            apiOutput = apiOutputData;

            ctiMissionStatus = apiOutput.status;

            let updateMissionStatusProm = Promise.resolve(mission);
            if (ctiMissionStatus == constCallOutMissionStatus.FINISHED) {
                updateMissionStatusProm = dbconfig.collection_tsCallOutMission.findOneAndUpdate({_id: mission._id}, {status: constCallOutMissionStatus.FINISHED}, {new: true}).lean();
            }
            if (ctiMissionStatus == constCallOutMissionStatus.PAUSED && mission.status !== constCallOutMissionStatus.PAUSED) {
                updateMissionStatusProm = dbconfig.collection_tsCallOutMission.findOneAndUpdate({_id: mission._id}, {status: constCallOutMissionStatus.PAUSED}, {new: true}).lean();
            }

            return updateMissionStatusProm;
        }
    ).then(
        missionData => {
            if (missionData) {
                mission = missionData;
            }

            if (!apiOutput.cust || !apiOutput.cust.length) {
                return [];
            }

            let proms = [];

            // console.log('ctiOutput mission data', apiOutput);
            apiOutput.cust.map(calleeDetail => {
                if (Number(calleeDetail.callCount) > 0) {
                    let status = 0;
                    if (calleeDetail.callResult == 0) {
                        if (Number(calleeDetail.callCount) >= (platform.teleMarketingRedialTimes || 1)) {
                            status = constCallOutMissionCalleeStatus.FAILED;
                        }
                    } else {
                        status = constCallOutMissionCalleeStatus.SUCCEEDED;
                    }

                    let prom = dbconfig.collection_tsCallOutMissionCallee.update({platform: platform._id, admin: admin._id, mission: mission._id, tsDistributedPhone: calleeDetail.custName}, {status: status, callingTime: calleeDetail.lastCallTime, callCount: calleeDetail.callCount}).catch(errorUtils.reportError);
                    proms.push(prom);
                }
            });

            return Promise.all(proms);
        }
    ).then(
        () => {
            return dbconfig.collection_tsCallOutMissionCallee.find({platform: platform._id, admin: admin._id, mission: mission._id}).lean();
        }
    ).then(
        calleeList => {
            let proms = [];
            calleeList.map(callee => {
                if (!callee) return;
                let prom = dbconfig.collection_tsDistributedPhone.findOne({_id: callee.tsDistributedPhone})
                    .populate({path: "tsPhone", model: dbconfig.collection_tsPhone})
                    .populate({path: "tsPhoneList", model: dbconfig.collection_tsPhoneList, select: "name callerCycleCount"})
                    .lean().then(
                        tsDistributedPhone => {
                            if (!tsDistributedPhone) return;
                            callee.tsDistributedPhone = tsDistributedPhone;
                            callee.tsPhone = tsDistributedPhone.tsPhone;
                            return callee;
                        }
                    );

                proms.push(prom);
            });

            return Promise.all(proms);
        }
    ).then(
        calleeList => {
            calleeList = calleeList.filter(calleeList => calleeList); // remove undefined value
            let outputData = {};
            outputData.hasOnGoingMission = true;
            outputData = Object.assign({}, outputData, mission);
            outputData.callee = calleeList;

            if (limit) {
                let total = calleeList.length;
                index = index || 0;
                let calleeShown = calleeList.slice(index, Number(limit) + Number(index));

                outputData.feedbackPlayerDetail = {
                    data: calleeShown,
                    index: index,
                    total: total
                };
            }

            return outputData;
        }
    );
}

function getCalleeList (query, sortCol, selectedPhones) {
    let phoneListProm = Promise.resolve();
    if (query.phoneListName && query.phoneListName.length) {
        phoneListProm = dbconfig.collection_tsPhoneList.find({name: {$in: query.phoneListName}, platform: query.platform}, {_id: 1}).lean();
    }

    return phoneListProm.then(
        phoneListData => {
            let phoneListQuery = {
                platform: query.platform,
                assignee: query.admin,
                registered: false
            }

            if (query.phoneListName && query.phoneListName.length) {
                if (!(phoneListData && phoneListData.length)) {
                    return []; // return empty data
                }
            }

            dbTeleSales.getAdminPhoneListQuery(query, phoneListQuery, phoneListData);

            if (selectedPhones && selectedPhones.length && selectedPhones instanceof Array) {
                phoneListQuery = {
                    platform: query.platform,
                    assignee: query.admin,
                    _id: {$in: selectedPhones}
                }
            }

            return dbconfig.collection_tsDistributedPhone.find(phoneListQuery).sort(sortCol)
                .populate({path: 'tsPhone', model: dbconfig.collection_tsPhone}).lean();
        }
    ).then(
        tsDistributedPhones => {
            return tsDistributedPhones.map(dPhone => {
                let phoneNumber = dPhone && dPhone.tsPhone && dPhone.tsPhone.phoneNumber ? rsaCrypto.decrypt(dPhone.tsPhone.phoneNumber) : "";
                let tsDistributedPhone = dPhone && dPhone._id;
                let tsPhone = dPhone && dPhone.tsPhone && dPhone.tsPhone._id || undefined;
                let name = String(dPhone && dPhone._id);
                let id = String(dPhone && dPhone.tsPhone && dPhone.tsPhone._id || dPhone && dPhone._id);

                return {phoneNumber, tsDistributedPhone, tsPhone, name, id};
            });
        }
    );
}

function addCallOutMissionFailureFeedback(missionObjId, adminObjId) {
    return dbconfig.collection_tsCallOutMissionCallee.find({mission: missionObjId, status: constCallOutMissionCalleeStatus.FAILED}).lean().then(
        calleeList => {
            let proms = [];

            calleeList.map(callee => {
                let prom = addCalleeFeedback(callee, adminObjId).catch(err => {
                    console.log("create callee feedback failure:", missionObjId, callee._id, err);
                    return errorUtils.reportError(err);
                });
                proms.push(prom);
            });

            return Promise.all(proms);
        }
    );
}

function addCalleeFeedback(callee, adminObjId) {
    let tsPhoneList;
    return dbconfig.collection_tsPhone.findOne({_id: callee.tsPhone}).populate({path: "tsPhoneList", model: dbconfig.collection_tsPhoneList}).lean().then(
        tsPhone => {
            if (tsPhone && tsPhone.tsPhoneList) {
                tsPhoneList = tsPhone.tsPhoneList;
            }

            let feedbackContent = {
                tsPhone: tsPhone._id,
                tsPhoneList: tsPhoneList._id,
                platform: tsPhoneList.platform,
                adminId: adminObjId,
                content: tsPhoneList.failFeedBackContent,
                result: tsPhoneList.failFeedBackResultKey,
                resultName: tsPhoneList.failFeedBackResult,
                topic: tsPhoneList.failFeedBackTopic,
            };

            return dbTeleSales.createTsPhoneFeedback(feedbackContent);
        }
    );
}