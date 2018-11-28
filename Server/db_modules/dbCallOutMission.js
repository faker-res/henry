const dbconfig = require('./../modules/dbproperties');
const dbutility = require('./../modules/dbutility');
const dbCtiCallOut = require('./dbCtiCallOut');

const constCallOutMissionStatus = require('./../const/constCallOutMissionStatus');
const constCallOutMissionCalleeStatus = require('./../const/constCallOutMissionCalleeStatus');

const request = require('request');
const rsaCrypto = require('./../modules/rsaCrypto');
const errorUtils = require("./../modules/errorUtils");

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

let dbCallOutMission = {
    createCallOutMission: (platformObjId, adminObjId, searchFilter, searchQuery, sortCol, selectedPlayers) => {
        let platform, admin, calleeList, callOutMission, availableCallOutMission;
        searchQuery = typeof searchQuery == "string" ? JSON.parse(searchQuery) : searchQuery;

        let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();
        let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
        let availableCallOutMissionProm = dbconfig.collection_callOutMission.find({admin: adminObjId, isUsing: true}).lean();

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
                        dbconfig.collection_callOutMission.update({missionName: mission.missionName}, {isUsing: false}).exec().catch(err => {
                            console.log('unuse mission fail', mission.missionName, err);
                            return errorUtils.reportError(err);
                        });
                    });
                }

                return getCalleeList(searchQuery, sortCol, selectedPlayers);
            }
        ).then(
            calleeData => {
                if (!calleeData || !calleeData.length) {
                    return Promise.reject({name: "DataError", message: "Player Not Found"});
                }

                calleeList = calleeData;

                return dbCtiCallOut.addMissionToCti(platform, admin, calleeList);
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
                return dbconfig.collection_callOutMission(callOutMissionData).save();
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
                        player: callee.player,
                        playerName: callee.playerName,
                        phoneNumber: callee.phoneNumber
                    };

                    let prom = dbconfig.collection_callOutMissionCallee(calleeData).save().catch(errorUtils.reportError);
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

    toggleCallOutMissionStatus: (platformObjId, missionName) => {
        let platform = {};
        let mission = {};
        let operation;
        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platformData => {
                platform = platformData;

                return dbconfig.collection_callOutMission.findOne({missionName: missionName}).lean();
            }
        ).then(
            missionData => {
                if (!missionData) {
                    return Promise.reject({message: "Call out mission not found."});
                }
                mission = missionData;

                if (mission.status == constCallOutMissionStatus.ON_GOING) {
                    operation = constCallOutMissionStatus.PAUSED;
                } else if (mission.status == constCallOutMissionStatus.PAUSED) {
                    operation = constCallOutMissionStatus.ON_GOING;
                } else {
                    return Promise.reject({message: "This mission is finished."})
                }

                return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, operation);
            }
        ).then(
            () => {
                return dbconfig.collection_callOutMission.findOneAndUpdate({_id: mission._id}, {status: operation}, {new: true}).lean();
            }
        );
    },

    stopCallOutMission: (platformObjId, missionName) => {
        let platform = {};
        let mission = {};

        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platformData => {
                platform = platformData;

                return dbconfig.collection_callOutMission.findOne({missionName: missionName}).lean();
            }
        ).then(
            missionData => {
                if (!missionData) {
                    return Promise.reject({message: "Call out mission not found."});
                }
                mission = missionData;

                if (mission.status != constCallOutMissionStatus.ON_GOING && mission.status != constCallOutMissionStatus.PAUSED && mission.status != constCallOutMissionStatus.CREATED) {
                    return Promise.reject({message: "This mission is finished."})
                }

                if (mission.status == constCallOutMissionStatus.PAUSED) {
                    return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.ON_GOING).then(
                        () => dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.FINISHED)
                    );
                }

                return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.FINISHED); //.catch().then(() => deleteCtiMission(platform, missionName));
            }
        ).then(
            () => {
                return dbconfig.collection_callOutMission.findOneAndUpdate({_id: mission._id}, {status: constCallOutMissionStatus.CANCELLED}, {new: true}).lean();
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

                return dbconfig.collection_callOutMission.findOne({
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

                return dbconfig.collection_callOutMission.findOneAndUpdate({
                    platform: platform._id,
                    admin: admin._id,
                    status: constCallOutMissionStatus.FINISHED,
                    missionName: missionName,
                    isUsing: true
                }, {
                    isUsing: false
                }).lean();
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

                return dbconfig.collection_callOutMission.update({
                    platform: platform._id,
                    admin: admin._id,
                    isUsing: true
                }, {isUsing: false}, {multi: true}).lean();
            }
        );
    },
};

module.exports = dbCallOutMission;

function getUpdatedMissionDetail (platform, admin, mission, limit, index) {
    let apiOutput, ctiMissionStatus;

    return dbCtiCallOut.getCtiCallOutMissionDetail(platform, mission.missionName).then(
        apiOutputData => {
            apiOutput = apiOutputData;

            ctiMissionStatus = apiOutput.status;

            let updateMissionStatusProm = Promise.resolve(mission);
            if (ctiMissionStatus == constCallOutMissionStatus.FINISHED) {
                updateMissionStatusProm = dbconfig.collection_callOutMission.findOneAndUpdate({_id: mission._id}, {status: constCallOutMissionStatus.FINISHED}, {new: true}).lean();
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

            apiOutput.cust.map(calleeDetail => {
                if (Number(calleeDetail.callCount) > 0) {
                    let status = 0;
                    if (calleeDetail.callResult == 0) {
                        if (Number(calleeDetail.callCount) >= (platform.redialTimes || 1)) {
                            status = constCallOutMissionCalleeStatus.FAILED;
                        }
                    } else {
                        status = constCallOutMissionCalleeStatus.SUCCEEDED;
                    }

                    let prom = dbconfig.collection_callOutMissionCallee.update({platform: platform._id, admin: admin._id, mission: mission._id, playerName: calleeDetail.custName}, {status: status, callingTime: calleeDetail.lastCallTime, callCount: calleeDetail.callCount}).catch(errorUtils.reportError);
                    proms.push(prom);
                }
            });

            return Promise.all(proms);
        }
    ).then(
        () => {
            return dbconfig.collection_callOutMissionCallee.find({platform: platform._id, admin: admin._id, mission: mission._id}).lean();
        }
    ).then(
        calleeList => {
            let proms = [];
            calleeList.map(callee => {
                let prom = dbconfig.collection_players.findOne({_id: callee.player})
                    .populate({path: "partner", model: dbconfig.collection_partner})
                    .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
                    .lean().then(
                        playerData => {
                            callee.player = playerData;
                            return callee;
                        }
                    );

                proms.push(prom);
            });

            return Promise.all(proms);
        }
    ).then(
        calleeList => {
            let outputData = {};
            // outputData.hasOnGoingMission = Boolean(ctiMissionStatus != constCallOutMissionStatus.FINISHED);
            outputData.hasOnGoingMission = true;
            outputData = Object.assign({}, outputData, mission);
            outputData.callee = calleeList;

            if(outputData.callee && outputData.callee.length){
                console.log(mission.missionName)
                console.log('=CallOutMission= ----->callOutBack total callee: ' + outputData.callee.length);
            }
            if (limit) {
                let total = calleeList.length;
                index = index || 0;
                let calleeShown = calleeList.slice(index, Number(limit) + Number(index));
                let playersData = calleeShown.map(callee => {
                    return callee.player;
                });

                let feedbackPlayerDetail = {
                    data: playersData,
                    index: index,
                    total: total
                };
                if(feedbackPlayerDetail.data && feedbackPlayerDetail.data.length){
                    console.log('=CallOutMission= ------>feedbackPlayerDetail.playersData: ', feedbackPlayerDetail.data.length);
                }

                console.log('=CallOutMission= ------>feedbackPlayerDetail.playersData: ', feedbackPlayerDetail.total);

                outputData.feedbackPlayerDetail = feedbackPlayerDetail;
                return outputData;
            }

            return outputData;
        }
    );
}

function getCalleeList (query, sortCol, selectedPlayers) {
    switch (query.playerType) {
        case 'Test Player':
            query.isRealPlayer = false;
            break;
        case 'Real Player (all)':
            query.isRealPlayer = true;
            break;
        case 'Real Player (Individual)':
            query.isRealPlayer = true;
            query.partner = null;
            break;
        case 'Real Player (Under Partner)':
            query.isRealPlayer = true;
            query.partner = {$ne: null};
    }
    if (query.playerType) {
        delete query.playerType;
    }

    if (query.csOfficer && query.csOfficer.length) {
        query.csOfficer.map(item => {
            return ObjectId(item);
        });
        query.csOfficer = {
            $in: query.csOfficer
        }
    }

    if(selectedPlayers && selectedPlayers.length > 0){
        query = {};
        query.playerId = {$in: selectedPlayers}
    }

    let players;
    return dbconfig.collection_players.find(query, {_id: 1}).sort(sortCol).lean().then(
        playerData => {
            if (!playerData || !playerData.length) {
                return [];
            }

            let proms = [];
            playerData.map(playerIdObj => {
                // to get phone number, findOne is necessary as find is encoded
                let prom = dbconfig.collection_players.findOne({_id: playerIdObj._id}, {name: 1, phoneNumber: 1}).lean();
                proms.push(prom);
            });

            return Promise.all(proms);
        }
    ).then(
        playerData => {
            if (!playerData || !playerData.length) {
                return [];
            }
            players = playerData;

            console.log('=CallOutMission= getCalleeList ---->' + playerData.length);

            return players.map(player => {
                let phoneNumber = player.phoneNumber;
                if (phoneNumber && phoneNumber.length > 20) {
                    try {
                        phoneNo = rsaCrypto.decrypt(phoneNumber);
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
                return {
                    id: player._id,
                    name: player.name,
                    phoneNumber
                }
            });
        }
    );
}

