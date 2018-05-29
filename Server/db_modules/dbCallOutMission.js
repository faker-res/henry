const dbconfig = require('./../modules/dbproperties');
const dbutility = require('./../modules/dbutility');

const request = require('request');
const rsaCrypto = require('./../modules/rsaCrypto');
const errorUtils = require("./../modules/errorUtils");
const constServerCode = require('./../const/constServerCode');

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

                return addMissionToCti();
            }
        ).then(
            () => {
                let callOutMissionData = {
                    platform: platform._id,
                    admin: admin._id,
                    adminName: admin.adminName,
                    missionName: " ", // todo :: add when mission API resolved
                    searchFields: searchFilter,
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
    //
    // testApi: () => {
    //     // todo :: get url properly later for actual function
    //     let url = "http://jinbailicro.tel400.me/cti/";
    //
    //     let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");
    //
    //     // add mission phone number
    //     // let path = "callOutTaskAddPhonenum.do";
    //     // let phones = [
    //     //     {
    //     //         phoneNum: "18390571077",
    //     //         name: "testRealPhone",
    //     //         customerForeignId: "testRealPhone",
    //     //         remark: "str"
    //     //     },
    //     //     // {
    //     //     //     phoneNum: "13999999998",
    //     //     //     name: "testCalleeB",
    //     //     //     customerForeignId: "testCalleeB",
    //     //     //     remark: "str"
    //     //     // },
    //     // ];
    //     // let param = {
    //     //     token: token,
    //     //     taskName: "testtask0001",
    //     //     phones: JSON.stringify(phones)
    //     // };
    //
    //     // setting task status
    //     let path = "settingTaskStatus.do";
    //     let param = {
    //         token: token,
    //         taskName: "testtask0001",
    //         operation: 2
    //     };
    //
    //     let link = url + path;
    //
    //     return new Promise((resolve, reject) => {
    //         try {
    //             request.post(link, {form: param}, (err, resp, body) => {
    //                 if (err) {
    //                     reject(err);
    //                 }
    //
    //                 console.log('body', body);
    //                 resolve(JSON.parse(body));
    //             })
    //         } catch (e) {
    //             return reject(e);
    //         }
    //     });
    // },

};

module.exports = dbCallOutMission;

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
        query.csOfficer.forEach(item => {
            item = ObjectId(item);
        });
        query.csOfficer = {
            $in: query.csOfficer
        }
    }

    return dbconfig.collection_players.find(query).sort(sortCol).lean().then(
        players => {
            if (!players || !players.length) {
                return [];
            }

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
    platformId = 6;

    let urls = [
        "http://eu.tel400.me/cti/",
        "http://jinbailitw.tel400.me/cti/",
        "http://jinbailicro.tel400.me/cti/",
        "http://b8a.tel400.me/cti/",
        "http://bbet8.tel400.me/cti/",
        "http://xindelitz.tel400.me/cti/",
        "http://buyuhuang.tel400.me/cti/",
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
    } else if (platformId == '8') {
        let jshUrl = urls[3];
        urls[3] = urls[0];
        urls[0] = jshUrl;
    } else if (platformId == '9') {
        let jshUrl = urls[6];
        urls[6] = urls[0];
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
    let urls = getCtiUrls(platform.platformId);
    let token = getCtiToken("POLYLINK_MESSAGE_TOKEN");

    let param = {token};
    param.taskName = admin.adminName + String(new Date().valueOf());
    param.startMode = 1;
    param.transferType = 2;
    param.queuenum = admin.callerQueue || "9994";
    param.calloutType = 0;
    param.calledNumber = platform.callNumberPrefix || "879997";
    // param.
    // todo :: unfinished funcion
}

function callCtiApiWithRetry (platformId, path, param) {
    let urls = getCtiUrls(platformId);

    tryCallCtiApi();

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

                    resolve(JSON.parse(body));
                })
            } catch (err) {
                console.error(err);
                resolve(tryCallCtiApi(nextTriedTimes));
            }
        });
    }

}

