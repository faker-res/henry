"use strict";

const dbutility = require('./../modules/dbutility');
const request = require('request');

let dbCtiCallOut = {
    getCtiUrls: function getCtiUrls (platformId) {
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
        }

        return urls;
    },

    getCtiToken: function getCtiToken(str) {
        let now = new Date();
        let formattedNow = dbutility.getDateYMDStringFormat(now);
        let firstLevelMd5 = dbutility.convertToMD5(str + "");
        return dbutility.convertToMD5(firstLevelMd5 + formattedNow);
    },

    addMissionToCti: function addMissionToCti (platform, admin, calleeList, maxRingTime, redialTimes, minRedialInterval, idleAgentMultiple) {
        let token = dbCtiCallOut.getCtiToken("POLYLINK_MESSAGE_TOKEN");
        let sanitizedAdminName = String(admin.adminName).replace(/[^0-9a-z]/gi, '');

        let missionName = sanitizedAdminName + String(new Date().valueOf());
        let param = {token};
        param.taskName = missionName;
        param.startMode = 1;
        param.transferType = 2;
        param.queuenum = admin.callerQueue || "9994";
        param.calloutType = '0';
        param.calledNumber = admin.did || "879997";
        param.maxRingTime = maxRingTime || 30;
        param.redialTimes = redialTimes || 3;
        param.minRedialInterval = minRedialInterval || 10;
        param.idleAgentMultiple = idleAgentMultiple ? Number(idleAgentMultiple).toFixed(1) : "2.0";

        return dbCtiCallOut.callCtiApiWithRetry(platform.platformId, "createCallOutTask.do", param).then(
            apiOutput => {
                if (!apiOutput) {
                    console.error("createCallOutTask.do Did not receive result");
                    return Promise.reject({message: "Did not receive result"});
                }

                if (apiOutput.result != 1) {
                    console.error("CTI API createCallOutTask.do output:", apiOutput, param);
                    switch(Number(apiOutput.result)) {
                        case -1:
                            return Promise.reject({message: "参数输入不合法"});
                        case -2:
                            return Promise.reject({message: "token错误"});
                        case -3:
                            return Promise.reject({message: "CTI任务名重复或不合法"});
                        case -4:
                            return Promise.reject({message: "ivrnum不存在"});
                        case -5:
                            return Promise.reject({message: "队列号错误"});
                        case -6:
                            return Promise.reject({message: "ivrProfile不存在"});
                        case -7:
                            return Promise.reject({message: "呼出号码错误"});
                        case -8:
                            return Promise.reject({message: "CTI系统错误"});
                        case -9:
                            return Promise.reject({message: "CTI路由组ID不存在"});
                        default:
                            return Promise.reject({message: "CTI API return error"});
                    }
                }

                return dbCtiCallOut.addPhoneNumToMission (platform, missionName, calleeList, admin.did || "879997");
            }
        ).then(
            () => {
                return dbCtiCallOut.updateCtiMissionStatus (platform, missionName, 1);
            }
        ).then(
            () => {
                return missionName;
            }
        );
    },

    addPhoneNumToMission: function addPhoneNumToMission (platform, missionName, calleeList, did) {
        let token = dbCtiCallOut.getCtiToken("POLYLINK_MESSAGE_TOKEN");

        let param = {token};
        param.taskName = missionName;

        let phones = calleeList.map(callee => {
            return {
                phoneNum: String(did) + callee.phoneNumber,
                name: callee.name,
                customerForeignId: callee.id,
                remark: ""
            }
        });

        param.phones = JSON.stringify(phones);

        return dbCtiCallOut.callCtiApiWithRetry(platform.platformId, "callOutTaskAddPhonenum.do", param).then(
            apiOutput => {
                if (!apiOutput) {
                    console.error("callOutTaskAddPhonenum.do Did not receive result");
                    return Promise.reject({message: "Did not receive result"});
                }

                if (apiOutput.result != 1) {
                    console.error("CTI API callOutTaskAddPhonenum.do output:", apiOutput);
                    switch(Number(apiOutput.result)) {
                        case -1:
                            return Promise.reject({message: "参数输入不合法"});
                        case -2:
                            return Promise.reject({message: "token错误"});
                        case -3:
                            return Promise.reject({message: "CTI任务不存在"});
                        case -4:
                            return Promise.reject({message: "CTI接口电话输入格式不正确"});
                        case -5:
                            return Promise.reject({message: "CTI任务状态不能添加客户"});
                        case -6:
                            return Promise.reject({message: "CTI系统错误"});
                        default:
                            return Promise.reject({message: "CTI API return error"});
                    }
                }
                return apiOutput;
            }
        );
    },

    // operation: 1 - Active/Start, 2 - Pause, 3 - Stop/Give up
    updateCtiMissionStatus: function updateCtiMissionStatus (platform, missionName, operation) {
        let token = dbCtiCallOut.getCtiToken("POLYLINK_MESSAGE_TOKEN");

        let param = {token};
        param.taskName = missionName;
        param.operation = operation;

        return dbCtiCallOut.callCtiApiWithRetry(platform.platformId, "settingTaskStatus.do", param).then(
            apiOutput => {
                if (!apiOutput) {
                    console.error("settingTaskStatus.do Did not receive result");
                    return Promise.reject({message: "Did not receive result"});
                }

                if (apiOutput.result != 1) {
                    console.error("CTI API settingTaskStatus.do output:", apiOutput);
                    switch(Number(apiOutput.result)) {
                        case -1:
                            return Promise.reject({message: "参数输入不合法"});
                        case -2:
                            return Promise.reject({message: "token错误"});
                        case -3:
                            return Promise.reject({message: "CTI任务不存在"});
                        case -4:
                            return Promise.reject({message: "CTI执行操作不合法（是否有在CTI后台修改过任务状态？）"});
                        case -5:
                            return Promise.reject({message: "CTI系统错误"});
                        default:
                            return Promise.reject({message: "CTI API return error"});
                    }
                }
                return true;
            }
        );
    },

    deleteCtiMission: function deleteCtiMission (platform, missionName) {
        let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

        let param = {token};
        param.taskName = missionName;

        return dbCtiCallOut.callCtiApiWithRetry(platform.platformId, "deleteCallOutTask.do", param).then(
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
    },

    getCtiCallOutMissionDetail: function getCtiCallOutMissionDetail (platform, missionName) {
        let token = dbCtiCallOut.getCtiToken("POLYLINK_MESSAGE_TOKEN");

        let param = {token};
        param.taskName = missionName;

        return dbCtiCallOut.callCtiApiWithRetry(platform.platformId, "getCallOutTaskStatus.do", param).then(
            apiOutput => {
                if (!apiOutput) {
                    console.error("getCallOutTaskStatus.do Did not receive result");
                    return Promise.reject({message: "Did not receive result"});
                }

                if (apiOutput.result != 1) {
                    console.error("CTI API getCallOutTaskStatus.do output:", apiOutput);
                    switch(Number(apiOutput.result)) {
                        case -1:
                            return Promise.reject({message: "参数输入不合法"});
                        case -2:
                            return Promise.reject({message: "token错误"});
                        case -3:
                            return Promise.reject({message: "CTI任务不存在"});
                        case -4:
                            return Promise.reject({message: "CTI系统错误"});
                        default:
                            return Promise.reject({message: "CTI API return error"});
                    }
                }
                return apiOutput;
            }
        );
    },

    callCtiApiWithRetry: function callCtiApiWithRetry (platformId, path, param) {
        let urls = dbCtiCallOut.getCtiUrls(platformId);

        return tryCallCtiApi();

        function tryCallCtiApi (triedTimes, mostRelevantError) {
            triedTimes = triedTimes || 0;
            if (triedTimes >= urls.length) {
                console.error("CTI API Fail All Tries:", path, param, mostRelevantError);
                if (mostRelevantError) {
                    return {result: mostRelevantError};
                }
                return Promise.reject({message: "Fail To Connect CTI API.", errorCode: mostRelevantError});
            }

            let nextTriedTimes = triedTimes + 1;
            let url = urls[triedTimes];

            let link = url + path;

            return new Promise((resolve) => {
                try {
                    request.post(link, {form: param, timeout: 3000}, (err, resp, body) => {
                        if (err || (resp && body && Number(JSON.parse(body).result) != 1)) {
                            console.log("CTI try no.", nextTriedTimes, link, body, err);

                            if (body) {
                                let currentCtiError = JSON.parse(body).result;

                                if (mostRelevantError) {
                                    mostRelevantError = Number(mostRelevantError) < Number(currentCtiError) ? mostRelevantError : currentCtiError;
                                }
                                else {
                                    mostRelevantError = currentCtiError;
                                }
                            }

                            resolve(tryCallCtiApi(nextTriedTimes, mostRelevantError));
                            return;
                        }

                        if (!resp) {
                            // throw this to prevent passing undefined to JSON.parse function
                            console.log("CTI try no.", nextTriedTimes, link);
                            console.error('CTI Post request get nothing for ' + link);
                            resolve(tryCallCtiApi(nextTriedTimes, mostRelevantError));
                            return;
                        }

                        resolve(JSON.parse(body));
                    });
                } catch (err) {
                    console.error(err);
                    resolve(tryCallCtiApi(nextTriedTimes, mostRelevantError));
                }
            });
        }
    },

    callCtiApiWithAllTry: (platformId, path, param) => {
        let urls = dbCtiCallOut.getCtiUrls(platformId);

        let proms = urls.map(url => {
            return tryCallCtiApi(url).catch(error => {error});
        });

        return Promise.all(proms).then(
            output => {
                if (!(output instanceof Array)) {
                    return;
                }

                let mostRelevantError, errorObj;
                for (let i = 0; i < output.length; i++) {
                    if (output[i].result == 1) {
                        return output;
                    }

                    if (output[i].result) {
                        if (mostRelevantError) {
                            mostRelevantError = Number(mostRelevantError) < Number(output[i].result) ? mostRelevantError : output[i].result;
                        }
                        else {
                            mostRelevantError = output[i].result;
                        }
                    }

                    if (!errorObj || output[i].error) {
                        errorObj = output[i].error;
                    }
                }

                if (mostRelevantError) {
                    return {result: mostRelevantError};
                }

                return Promise.reject(errorObj);
            }
        );

        function tryCallCtiApi(url) {
            let link = url + path;
            return new Promise((resolve, reject) => {
                try {
                    request.post(link, {form: param, timeout: 5000}, (err, resp, body) => {
                        if (err || (resp && body && Number(JSON.parse(body).result) != 1)) {
                            console.log("CTI try no.", link, body, err);

                            if (body) {
                                resolve({result: JSON.parse(body).result});
                                return;
                            }

                            resolve(Promise.reject(err));
                            return;
                        }

                        if (!resp) {
                            // throw this to prevent passing undefined to JSON.parse function
                            console.log("CTI try no.", link);
                            console.error('CTI Post request get nothing for ' + link);
                            reject({error: "empty response"});
                            return;
                        }

                        resolve(JSON.parse(body));
                    });
                } catch (err) {
                    console.error(err);
                    reject(err);
                }
            });
        }
    },


};

module.exports = dbCtiCallOut;