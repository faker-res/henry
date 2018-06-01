const dbconfig = require('./../modules/dbproperties');
const dbutility = require('./../modules/dbutility');

const constCallOutMissionStatus = require('./../const/constCallOutMissionStatus');
const constCallOutMissionCalleeStatus = require('./../const/constCallOutMissionCalleeStatus');

const request = require('request');
const rsaCrypto = require('./../modules/rsaCrypto');
const errorUtils = require("./../modules/errorUtils");

let dbCallOutMission = {
    createCallOutMission: (platformObjId, adminObjId, searchFilter, searchQuery, sortCol) => {
        let platform, admin, calleeList, callOutMission;

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

                return getCalleeList(searchQuery, sortCol);
            }
        ).then(
            calleeData => {
                if (!calleeData || !calleeData.length) {
                    return Promise.reject({name: "DataError", message: "Player Not Found"});
                }

                calleeList = calleeData;

                return addMissionToCti(platform, admin, calleeList);
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

                return updateCtiMissionStatus(platform, missionName, operation);
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

                if (mission.status != constCallOutMissionStatus.ON_GOING && mission.status != constCallOutMissionStatus.PAUSED) {
                    return Promise.reject({message: "This mission is finished."})
                }

                return updateCtiMissionStatus(platform, missionName, constCallOutMissionStatus.FINISHED); //.catch().then(() => deleteCtiMission(platform, missionName));
            }
        ).then(
            () => {
                return dbconfig.collection_callOutMission.findOneAndUpdate({_id: mission._id}, {status: constCallOutMissionStatus.CANCELLED}, {new: true}).lean();
            }
        );
    },

    getUpdatedAdminMissionStatusFromCti: (platformObjId, adminObjId) => {
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
                    status: {
                        $in: [
                            constCallOutMissionStatus.CREATED,
                            constCallOutMissionStatus.ON_GOING,
                            constCallOutMissionStatus.PAUSED
                        ]
                    }
                }).lean();
            }
        ).then(
            callOutMissionData => {
                if (!callOutMissionData) {
                    return {hasOnGoingMission: false};
                }

                return getUpdatedMissionDetail(platform, admin, callOutMissionData);
            }
        )
    },
};

module.exports = dbCallOutMission;

function getUpdatedMissionDetail (platform, admin, mission) {
    let apiOutput, ctiMissionStatus;

    return getCtiCallOutMissionDetail(platform, mission.missionName).then(
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
                        status = constCallOutMissionCalleeStatus.FAILED;
                    } else {
                        status = constCallOutMissionCalleeStatus.SUCCEEDED;
                    }

                    let prom = dbconfig.collection_callOutMissionCallee.update({platform: platform._id, admin: admin._id, mission: mission._id, playerName: calleeDetail.custName}, {status: status, callingTime: calleeDetail.lastCallTime}).catch(errorUtils.reportError);
                    proms.push(prom);
                }
            });

            return Promise.all(proms);
        }
    ).then(
        () => {
            return dbconfig.collection_callOutMissionCallee.find({platform: platform._id, admin: admin._id, mission: mission._id}).populate({path: "player", model: dbconfig.collection_players}).lean();
        }
    ).then(
        calleeList => {
            let outputData = {};
            outputData.hasOnGoingMission = Boolean(ctiMissionStatus != constCallOutMissionStatus.FINISHED);
            outputData = Object.assign({}, outputData, mission);
            outputData.callee = calleeList;

            return outputData;
        }
    );
}

function getCalleeList (query, sortCol) {
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
    if ("playerType" in query) {
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

            return players.map(player => {
                let phoneNumber = player.phoneNumber;
                if (phoneNumber.length > 20) {
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

function getCtiUrls (platformId) {
    platformId = platformId ? String(platformId) : "6";

    // todo :: debug used value, delete later
    platformId = 8;

    let urls = [
        "http://eu.tel400.me/cti/",
        "http://jinbailitw.tel400.me/cti/",
        "http://jinbailicro.tel400.me/cti/",
        "http://b8a.tel400.me/cti/",
        "http://bbet8.tel400.me/cti/",
        "http://xindelitz.tel400.me/cti/",
        "http://buyuhuang.tel400.me/cti/",
        "http://hm.tel400.me/cti/",
        "http://jsh.tel400.me/cti/",
    ];

    if (platformId == '6') {
        let jblUrl = urls[2];
        urls[2] = urls[0];
        urls[0] = jblUrl;
    } else if (platformId == '2' || platformId == '7') {
        let bbetUrl = urls[4];
        urls[4] = urls[0];
        urls[0] = bbetUrl;
        let xdlUrl = urls[3];
        urls[3] = urls[1];
        urls[1] = xdlUrl;
    } else if (platformId == '9') {
        let jshUrl = urls[6];
        urls[6] = urls[0];
        urls[0] = jshUrl;
    } else if (platformId == '5') {
        let bylUrl = urls[7];
        urls[7] = urls[0];
        urls[0] = bylUrl;
    } else if (platformId == '8') {
        let jshUrl = urls[8];
        urls[8] = urls[0];
        urls[0] = jshUrl;
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

    let missionName = admin.adminName + String(new Date().valueOf());
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

    return callCtiApiWithRetry(platform.platformId, "createCallOutTask.do", param).then(
        apiOutput => {
            if (!apiOutput) {
                console.error("createCallOutTask.do Did not receive result");
                return Promise.reject({message: "Did not receive result"});
            }

            if (apiOutput.result != 1) {
                console.error("CTI API createCallOutTask.do output:", apiOutput);
                return Promise.reject({message: "CTI API return error"});
            }

            return addPhoneNumToMission (platform, missionName, calleeList);
        }
    ).then(
        () => {
            return updateCtiMissionStatus (platform, missionName, 1);
        }
    ).then(
        () => {
            return missionName;
        }
    );
}

function addPhoneNumToMission (platform, missionName, calleeList) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = missionName;

    let phones = calleeList.map(callee => {
        return {
            phoneNum: callee.phoneNumber,
            name: callee.playerName,
            customerForeignId: callee.player,
            remark: ""
        }
    });

    param.phones = JSON.stringify(phones);

    return callCtiApiWithRetry(platform.platformId, "callOutTaskAddPhonenum.do", param).then(
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
function updateCtiMissionStatus (platform, missionName, operation) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = missionName;
    param.operation = operation;

    return callCtiApiWithRetry(platform.platformId, "settingTaskStatus.do", param).then(
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

function getCtiCallOutMissionDetail (platform, missionName) {
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = missionName;

    return callCtiApiWithRetry(platform.platformId, "getCallOutTaskStatus.do", param).then(
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

function callCtiApiWithRetry (platformId, path, param) {
    let urls = getCtiUrls(platformId);

    return tryCallCtiApi();

    function tryCallCtiApi (triedTimes) {
        triedTimes = triedTimes || 0;
        if (triedTimes >= urls.length) {
            return Promise.reject({message: "Fail To Connect CTI API."});
        }

        let nextTriedTimes = triedTimes + 1;
        let url = urls[triedTimes];

        let link = url + path;

        return new Promise((resolve) => {
            try {
                request.post(link, {form: param}, (err, resp, body) => {
                    if (err) {
                        console.error(err);
                        resolve(tryCallCtiApi(nextTriedTimes));
                    }

                    if (!resp) {
                        // throw this to prevent passing undefined to JSON.parse function
                        throw(new Error('Post request get nothing for ' + link));
                    }

                    resolve(JSON.parse(body));
                })
            } catch (err) {
                console.error(err);
                resolve(tryCallCtiApi(nextTriedTimes));
            }
        });
    }
}

