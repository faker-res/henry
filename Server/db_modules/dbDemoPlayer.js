let dbconfig = require('./../modules/dbproperties');
let dbUtility = require('./../modules/dbutility');
let rsaCrypto = require("./../modules/rsaCrypto");

const constPlayerRegistrationInterface = require('./../const/constPlayerRegistrationInterface');
const constDemoPlayerLogStatus = require('./../const/constDemoPlayerLogStatus');

let dbDemoPlayer = {
    createDemoPlayerLog: (playerData, phoneNumber, deviceData, isBackStageGenerated) => {
        let platformObjId = playerData.platform;
        let inputDevice = isBackStageGenerated ? constPlayerRegistrationInterface.BACKSTAGE : dbUtility.getInputDevice(deviceData);
        let demoPlayerStatus = isBackStageGenerated ? constDemoPlayerLogStatus.FROM_BACKSTAGE : constDemoPlayerLogStatus.PRE_CONVERT;
        let encryptedPhoneNumber;

        let realPlayerProm = Promise.resolve();
        if (phoneNumber && !isBackStageGenerated) {
            encryptedPhoneNumber = rsaCrypto.encrypt(phoneNumber);
            let encryptedOldPhoneNumber = rsaCrypto.oldEncrypt(phoneNumber);
            let phoneNumberQuery = {$in: [encryptedPhoneNumber, phoneNumber, encryptedOldPhoneNumber]};
            realPlayerProm = dbconfig.collection_players.findOne({platform: platformObjId, phoneNumber: phoneNumberQuery, isRealPlayer: true}).lean();
        }

        return realPlayerProm.then(
            realPlayer => {
                if (realPlayer) {
                    demoPlayerStatus = constDemoPlayerLogStatus.OLD_PLAYER;
                }

                let log = {
                    platform: platformObjId,
                    name: playerData.name,
                    device: inputDevice,
                    status: demoPlayerStatus,
                    phoneNumber: encryptedPhoneNumber,
                };

                return dbconfig.collection_createDemoPlayerLog(log).save();
            }
        );
    },

    updatePlayerConverted: (platform, encryptedPhoneNumber) => {
        return dbconfig.collection_createDemoPlayerLog.update({
            platform: platform,
            phoneNumber: encryptedPhoneNumber,
            status: constDemoPlayerLogStatus.PRE_CONVERT
        }, {
            status: constDemoPlayerLogStatus.POST_CONVERT
        }, {
            multi: true
        });
    },

    getDemoPlayerAnalysis: (platformId, startDate, endDate, period) => {
        let deviceGroupProms = [];
        let statusGroupProms = [];
        let calculation = {$sum: 1};
        let dayStartTime = startDate;
        let getNextDate;

        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                };
                break;
            case 'week':
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                };
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                };
        }

        while (dayStartTime.getTime() < endDate.getTime()) {
            let dayEndTime = getNextDate.call(this, dayStartTime);
            let matchObj = {
                createTime: {$gte: dayStartTime, $lt: dayEndTime}
            };
            let dayStartTimeStr = dayStartTime.toString();
            if (platformId != 'all') {
                matchObj.platform = platformId;
            }

            let deviceGroupProm = dbconfig.collection_createDemoPlayerLog.aggregate(
                {$match: matchObj},
                {
                    $group: {
                        _id: {"device": "$device"},
                        calc: calculation
                    }
                }
            ).read("secondaryPreferred").then(
                 data => {
                     return {
                         date: new Date(dayStartTimeStr),
                         data: data
                     }
                 }
            );

            let statusGroupProm = dbconfig.collection_createDemoPlayerLog.aggregate(
                {$match: matchObj},
                {
                    $group: {
                        _id: {"status": "$status"},
                        calc: calculation
                    }
                }
            ).read("secondaryPreferred").then(
                data => {
                    return {
                        date: new Date(dayStartTimeStr),
                        data: data
                    }
                }
            );

            deviceGroupProms.push(deviceGroupProm);
            statusGroupProms.push(statusGroupProm);
            dayStartTime = dayEndTime;
        }

        return Promise.all([Promise.all(deviceGroupProms), Promise.all(statusGroupProms)]).then(
            data => {
                let deviceGroup = [];
                let statusGroup = [];

                if (data && data[0] instanceof Array) {
                    deviceGroup = data[0];
                }

                if (data && data[1] instanceof Array) {
                    statusGroup = data[1];
                }

                return {deviceGroup, statusGroup};
            }
        );
    },
    getDemoPlayerLog: (platformId, period, status, selectedDate, index, limit, sortCol) => {
        index = index || 0;
        sortCol = sortCol || {createTime: 1};
        let getNextDate;
        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                };
                break;
            case 'week':
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                };
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                };
        }

        let dayEndTime = getNextDate.call(this, selectedDate);
        let matchObj = {
            createTime: {$gte: selectedDate, $lt: dayEndTime},
            status: status
        };
        if (platformId != 'all') {
            matchObj.platform = platformId;
        }

        let a = dbconfig.collection_createDemoPlayerLog.find(matchObj).count();
        let b = dbconfig.collection_createDemoPlayerLog.find(matchObj).sort(sortCol).skip(index).limit(limit).lean();

        return Promise.all([a, b]).then(data => {
            return({total: data[0], data: data[1]});
        });
    },
};

module.exports = dbDemoPlayer;