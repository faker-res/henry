const dbconfig = require('./../modules/dbproperties');
const dbutility = require('./../modules/dbutility');
const dbCtiCallOut = require('./../db_modules/dbCtiCallOut');
const dbPlayerFeedback = require('./../db_modules/dbPlayerFeedback');

const constCallOutMissionStatus = require('./../const/constCallOutMissionStatus');
const constCallOutMissionCalleeStatus = require('./../const/constCallOutMissionCalleeStatus');

const request = require('request');
const rsaCrypto = require('./../modules/rsaCrypto');
const errorUtils = require("./../modules/errorUtils");

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

let dbCallOutMission = {
    createCallOutMission: (platformObjId, adminObjId, searchFilter, searchQuery, sortCol, selectedPlayers, backEndQuery) => {
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

                return getCalleeList(searchQuery, sortCol, selectedPlayers, backEndQuery);
            }
        ).then(
            calleeData => {
                if (!calleeData || !calleeData.length) {
                    return Promise.reject({name: "DataError", message: "Player Not Found"});
                }

                calleeList = calleeData;

                let maxRingTime = platform.maxRingTime || 30;
                let redialTimes = platform.redialTimes || 3;
                let minRedialInterval = platform.minRedialInterval || 10;
                let idleAgentMultiple = platform.idleAgentMultiple ? Number(platform.idleAgentMultiple).toFixed(1) : "2.0";

                return addMissionToCti(platform, admin, calleeList, maxRingTime, redialTimes, minRedialInterval, idleAgentMultiple);
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

    toggleCallOutMissionStatus: (platformObjId, missionName, adminObjId) => {
        let platform = {};
        let mission = {};
        let admin = {};
        let operation;
        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platformData => {
                platform = platformData;

                let missionProm = dbconfig.collection_callOutMission.findOne({missionName: missionName}).lean();
                let adminProm = dbconfig.collection_admin.findOne({_id: adminObjId}).lean();
                return Promise.all([missionProm, adminProm]);
            }
        ).then(
            ([missionData, adminData]) => {
                if (!missionData) {
                    return Promise.reject({message: "Call out mission not found."});
                }
                mission = missionData;

                admin = adminData || admin;

                if (mission.status == constCallOutMissionStatus.ON_GOING) {
                    operation = constCallOutMissionStatus.PAUSED;
                } else if (mission.status == constCallOutMissionStatus.PAUSED) {
                    operation = constCallOutMissionStatus.ON_GOING;
                } else {
                    return Promise.reject({message: "This mission is finished."})
                }

                return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, operation, admin.ctiUrl || admin.ctiTsUrl);
            }
        ).then(
            () => {
                return dbconfig.collection_callOutMission.findOneAndUpdate({_id: mission._id}, {status: operation}, {new: true}).lean();
            }
        );
    },

    stopCallOutMission: (platformObjId, missionName, adminObjId) => {
        let platform = {};
        let mission = {};

        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platformData => {
                platform = platformData;

                let missionProm = dbconfig.collection_callOutMission.findOne({missionName: missionName}).lean();
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
                    return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.ON_GOING, admin.ctiUrl || admin.ctiTsUrl).then(
                        () => dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.FINISHED, admin.ctiUrl || admin.ctiTsUrl)
                    );
                }

                return dbCtiCallOut.updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.FINISHED, admin.ctiUrl || admin.ctiTsUrl); //.catch().then(() => deleteCtiMission(platform, missionName));
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

    return dbCtiCallOut.getCtiCallOutMissionDetail(platform, mission.missionName, admin.ctiUrl || admin.ctiTsUrl).then(
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

function getPlayerDetails(players) {
    let proms = [];
    players.map(player => {
        let prom = dbconfig.collection_players.findOne({_id: player._id})
            .populate({path: "partner", model: dbconfig.collection_partner})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .lean();

        proms.push(prom)
    });

    return Promise.all(proms);
}

function getCalleeList (query, sortCol, selectedPlayers, previousBackEndQuery) {
    if(selectedPlayers && selectedPlayers.length > 0){
        query = {};
        query.playerId = {$in: selectedPlayers}
    }
    else if (previousBackEndQuery) {
        query = JSON.parse(previousBackEndQuery);
    } else {
        // deprecated
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
            let noneCSOfficerQuery = {}, csOfficerArr = [];

            query.csOfficer.forEach(item => {
                if (item == "") {
                    noneCSOfficerQuery = {csOfficer: {$exists: false}};
                } else {
                    csOfficerArr.push(ObjectId(item));
                }
            });

            if (Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0 && csOfficerArr.length > 0) {
                query.$or = [noneCSOfficerQuery, {csOfficer: {$in: csOfficerArr}}];
                delete query.csOfficer;

            } else if ((Object.keys(noneCSOfficerQuery) && Object.keys(noneCSOfficerQuery).length > 0) && !csOfficerArr.length) {
                query.csOfficer = {$exists: false};

            } else if (csOfficerArr.length > 0 && !Object.keys(noneCSOfficerQuery).length){
                query.csOfficer = {$in: csOfficerArr};

            }
        }
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
                    player: player._id,
                    playerName: player.name,
                    phoneNumber
                }
            });
        }
    );
}

function getCtiUrls (platformId, ctiUrl) {
    if (ctiUrl) {
        return [`http://${ctiUrl}/cti/`];
    }
    platformId = platformId ? String(platformId) : "10";

    // todo :: THIS ONE HAVE TO BE COMMENTED WHEN MERGE TO DEVELOP-1.1
    // platformId = 10; // debug param, use this when testing on local

    let urls = [
        "http://jsh.tel400.me/cti/",
        "http://jinbailinewcro.tel400.me/cti/",
        "http://blb.tel400.me/cti/",
        "http://rb.tel400.me/cti/",
        "http://xbettz.tel400.me/cti/",
    ];

    if (platformId == '6') {
        urls = [
            "http://jinbailinewcro.tel400.me/cti/",
            "http://ruibodl.tel400.me/cti/",
            "http://jbldl.tel400.me/cti/",
            "http://jinbailitw.tel400.me/cti/",
            "http://jinbailitz.tel400.me/cti/",
        ];
    } else if (platformId == '2' || platformId == '7') {
        urls = [
            "http://bbet8dl.tel400.me/cti/",
            "http://bbet8.tel400.me/cti/",
            "http://b8a.tel400.me/cti/",
            "http://xindelitz.tel400.me/cti/",
            "http://jinbailinewcro.tel400.me/cti/",
            "http://xbettz.tel400.me/cti/",
            "http://xbetdx.tel400.me/cti/",
        ];
    } else if (platformId == '8') {
        urls = [
            "http://bbetasiadl.tel400.me/cti/",
            "http://bbetasiatw.tel400.me/cti/",
            "http://buyuhuang.tel400.me/cti/",
            "http://jinbailinewcro.tel400.me/cti/",
        ];
    } else if (platformId == '5') {
        urls = [
            "http://haomendl.tel400.me/cti/",
            "http://hm.tel400.me/cti/",
            "http://jinbailinewcro.tel400.me/cti/",
        ];
    } else if (platformId == '3' || platformId == '9') {
        urls = [
            "http://buyuhuang.tel400.me/cti/",
            "http://jinbailinewcro.tel400.me/cti/",
        ];
    } else if (platformId == '4') {
        urls = [
            "http://eudl.tel400.me/cti/",
            "http://eu.tel400.me/cti/",
            "http://jinbailinewcro.tel400.me/cti/",
        ];
    } else if (platformId == '29') {
        urls = [
            "http://newpj.tel400.me/cti/",
            "http://xinpjdl.tel400.me/cti/",
            "http://jinbailinewcro.tel400.me/cti/"
        ];
    }

    return urls;
}

function getCtiToken(str) {
    let now = new Date();
    let formattedNow = dbutility.getDateYMDStringFormat(now);
    let firstLevelMd5 = dbutility.convertToMD5(str + "");
    return dbutility.convertToMD5(firstLevelMd5 + formattedNow);
}

function addMissionToCti (platform, admin, calleeList) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");
    let sanitizedAdminName = String(admin.adminName).replace(/[^0-9a-z]/gi, '');

    let missionName = sanitizedAdminName + String(new Date().valueOf());
    let param = {token};
    param.taskName = missionName;
    param.startMode = 1;
    param.transferType = 2;
    param.queuenum = admin.callerQueue || "9994";
    param.calloutType = '0';
    param.calledNumber = admin.did || "879997";
    param.maxRingTime = platform.maxRingTime || 30;
    param.redialTimes = platform.redialTimes || 3;
    param.minRedialInterval = platform.minRedialInterval || 10;
    param.idleAgentMultiple = platform.idleAgentMultiple ? Number(platform.idleAgentMultiple).toFixed(1) : "2.0";

    return callCtiApiWithRetry(platform.platformId, "createCallOutTask.do", param, admin.ctiUrl || admin.ctiTsUrl).then(
        apiOutput => {
            if (!apiOutput) {
                console.error("createCallOutTask.do Did not receive result");
                return Promise.reject({message: "Did not receive result"});
            }

            if (apiOutput.result != 1) {
                console.error("CTI API createCallOutTask.do output:", apiOutput, param);
                return Promise.reject({message: "CTI API return error"});
            }

            return addPhoneNumToMission (platform, missionName, calleeList, admin.did || admin.tsDid || "879997", admin.ctiUrl || admin.ctiTsUrl);
        }
    ).then(
        () => {
            return updateCtiMissionStatus (platform, missionName, 1, admin.ctiUrl || admin.ctiTsUrl);
        }
    ).then(
        () => {
            return missionName;
        }
    );
}

function addPhoneNumToMission (platform, missionName, calleeList, did, ctiUrl) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = missionName;

    let phones = calleeList.map(callee => {
        return {
            phoneNum: String(did) + callee.phoneNumber,
            name: callee.playerName,
            customerForeignId: callee.player,
            remark: ""
        }
    });

    param.phones = JSON.stringify(phones);

    return callCtiApiWithRetry(platform.platformId, "callOutTaskAddPhonenum.do", param, ctiUrl).then(
        apiOutput => {
            if (!apiOutput) {
                console.error("callOutTaskAddPhonenum.do Did not receive result");
                return Promise.reject({message: "Did not receive result"});
            }

            if (apiOutput.result != 1) {
                console.error("CTI API callOutTaskAddPhonenum.do output:", apiOutput);
                return Promise.reject({message: "CTI API return error"});
            }
            return apiOutput;
        }
    );
}

// operation: 1 - Active/Start, 2 - Pause, 3 - Stop/Give up
function updateCtiMissionStatus (platform, missionName, operation, ctiUrl) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = missionName;
    param.operation = operation;

    return callCtiApiWithRetry(platform.platformId, "settingTaskStatus.do", param, ctiUrl).then(
        apiOutput => {
            if (!apiOutput) {
                console.error("settingTaskStatus.do Did not receive result");
                return Promise.reject({message: "Did not receive result"});
            }

            if (apiOutput.result != 1) {
                console.error("CTI API settingTaskStatus.do output:", apiOutput);
                return Promise.reject({message: "CTI API return error"});
            }
            return true;
        }
    );
}

function deleteCtiMission (platform, missionName) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = missionName;

    return callCtiApiWithRetry(platform.platformId, "deleteCallOutTask.do", param).then(
        apiOutput => {
            if (!apiOutput) {
                console.error("deleteCallOutTask.do Did not receive result");
                return Promise.reject({message: "Did not receive result"});
            }

            if (apiOutput.result != 1) {
                console.error("CTI API deleteCallOutTask.do output:", apiOutput);
                return Promise.reject({message: "CTI API return error"});
            }
            return true;
        }
    );
}

function getCtiCallOutMissionDetail (platform, missionName, ctiUrl) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = missionName;

    return callCtiApiWithRetry(platform.platformId, "getCallOutTaskStatus.do", param, ctiUrl).then(
        apiOutput => {
            if (!apiOutput) {
                console.error("getCallOutTaskStatus.do Did not receive result");
                return Promise.reject({message: "Did not receive result"});
            }

            if (apiOutput.result != 1) {
                console.error("CTI API getCallOutTaskStatus.do output:", apiOutput);
                return Promise.reject({message: "CTI API return error"});
            }
            return apiOutput;
        }
    );
}

function callCtiApiWithRetry (platformId, path, param, ctiUrl) {
    let urls = getCtiUrls(platformId, ctiUrl);

    return tryCallCtiApi();

    function tryCallCtiApi (triedTimes, lastBody) {
        triedTimes = triedTimes || 0;
        console.log('CTI API debug log param', path, param);
        if (triedTimes >= urls.length) {
            console.error("CTI API Fail All Tries:", path, param);
            if (lastBody) {
                return JSON.parse(lastBody);
            }
            return Promise.reject({message: "Fail To Connect CTI API."});
        }

        let nextTriedTimes = triedTimes + 1;
        let url = urls[triedTimes];

        let link = url + path;

        return new Promise((resolve) => {
            try {
                request.post(link, {form: param, timeout: 3000}, (err, resp, body) => {
                    if (err || (resp && body && Number(JSON.parse(body).result) != 1)) {
                        console.log("try no.", nextTriedTimes, link);
                        console.error(err || body);
                        resolve(tryCallCtiApi(nextTriedTimes, body));
                        return;
                    }

                    if (!resp) {
                        // throw this to prevent passing undefined to JSON.parse function
                        console.log("try no.", nextTriedTimes, link);
                        console.error('Post request get nothing for ' + link);
                        resolve(tryCallCtiApi(nextTriedTimes, lastBody));
                        return;
                    }

                    resolve(JSON.parse(body));
                });
            } catch (err) {
                console.error(err);
                resolve(tryCallCtiApi(nextTriedTimes, lastBody));
            }
        });
    }
}
