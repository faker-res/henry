var dbConfig = require('./../modules/dbproperties');
var constQQSessionStatus = require('./../const/constQQGroupControlSessionStatus');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var dbWCGroupControl = {
    checkAndUpdateQQSessionStatus: () => {
        let second = 1000;
        let minute = 60 * second;
        const maxSessionIdleTime = 3 * minute;
        let now = new Date().getTime();
        let updateProm = [];

        return dbConfig.collection_qqGroupControlSession.find({status: constQQSessionStatus.ONLINE}).lean().then(sessions => {
            if (sessions && sessions.length > 0) {
                sessions.forEach(session => {
                    if (session.lastActiveTime) {
                        let lastActiveTime = new Date(session.lastActiveTime).getTime();
                        let idlePeriod = now - lastActiveTime;
                        if(idlePeriod > maxSessionIdleTime) {
                            updateProm.push(
                                dbConfig.collection_qqGroupControlSession.findOneAndUpdate({
                                    _id: session._id
                                },{
                                    status: constQQSessionStatus.OFFLINE,
                                    lastUpdateTime: new Date()
                                })
                            );
                        }
                    }
                });
                return Promise.all(updateProm);
            }
        });
    },

    sendQQGroupControlSessionToFPMS: (deviceId, adminId, status, connectionAbnormalClickTimes, qqVersion) => {
        let deviceSettingRecord;
        let adminObjId;
        if (adminId) {
            let adminName = adminId.trim();
            adminId = adminName.toLowerCase();
        }

        if (!connectionAbnormalClickTimes) {
            connectionAbnormalClickTimes = 0;
        }

        return dbConfig.collection_admin.findOne({adminName: adminId}, {_id: 1, adminName: 1}).lean().then(
            adminData => {
                if (adminData && adminData._id) {
                    adminObjId = adminData._id;
                }

                return dbConfig.collection_qqDevice.findOne({deviceId: deviceId}).lean();
            }
        ).then(
            deviceSetting => {
                if (!deviceSetting) {
                    return Promise.reject({name: "DataError", message: "Cannot find qq group control's setting"});
                }

                deviceSettingRecord = deviceSetting;

                return dbConfig.collection_qqGroupControlSession.findOne({deviceId: deviceSettingRecord.deviceId, deviceNickName: deviceSettingRecord.deviceNickName, platformObjId: deviceSettingRecord.platformObjId, lastUpdateTime: {$exists: false}}).lean();
            }
        ).then(
            qqGroupControlSessionData => {
                if (qqGroupControlSessionData) {
                    if (status == constQQSessionStatus.ONLINE) {
                        return dbConfig.collection_qqGroupControlSession.findOneAndUpdate(
                            {_id: qqGroupControlSessionData._id},
                            {
                                $inc: {
                                    connectionAbnormalClickTimes: connectionAbnormalClickTimes
                                },
                                csOfficer: adminObjId,
                                status: status,
                                lastActiveTime: new Date(),
                                qqVersion: qqVersion
                            },
                            {new: true}
                        ).lean();
                    } else if (status == constQQSessionStatus.OFFLINE) {
                        // update lastUpdateTime when status is offline
                        return dbConfig.collection_qqGroupControlSession.findOneAndUpdate(
                            {_id: qqGroupControlSessionData._id},
                            {
                                $inc: {
                                    connectionAbnormalClickTimes: connectionAbnormalClickTimes
                                },
                                csOfficer: adminObjId,
                                status: status,
                                lastUpdateTime: new Date(),
                                qqVersion: qqVersion
                            },
                            {new: true}
                        ).lean();
                    }

                } else {
                    // create new session if detect lastUpdateTime being updated
                    if (deviceSettingRecord) {
                        let newSession = {
                            deviceId: deviceId,
                            deviceNickName: deviceSettingRecord.deviceNickName,
                            csOfficer: adminObjId,
                            status: status,
                            platformObjId: deviceSettingRecord.platformObjId,
                            connectionAbnormalClickTimes: connectionAbnormalClickTimes,
                            lastActiveTime: new Date(),
                            qqVersion: qqVersion
                        };

                        let qqGroupControlSession = new dbConfig.collection_qqGroupControlSession(newSession);
                        return qqGroupControlSession.save();
                    } else {
                        return Promise.reject({name: "DataError", message: "Cannot find qq group control's setting"});
                    }
                }
            }
        );
    },

    sendQQConversationToFPMS: (deviceId, playerQQRemark, csReplyTime, csReplyContent) => {
        return dbConfig.collection_qqGroupControlSession.findOne({deviceId: deviceId, lastUpdateTime: {$exists: false}}).lean().then(
            qqGroupControlSessionData => {
                if (qqGroupControlSessionData && qqGroupControlSessionData._id) {
                    let conversation = {
                        qqGroupControlSessionId: qqGroupControlSessionData._id,
                        deviceId: qqGroupControlSessionData.deviceId,
                        deviceNickName: qqGroupControlSessionData.deviceNickName,
                        platformObjId: qqGroupControlSessionData.platformObjId,
                        csOfficer: qqGroupControlSessionData.csOfficer,
                        playerQQRemark: playerQQRemark.trim(),
                        csReplyTime: csReplyTime,
                        csReplyContent: csReplyContent,
                        createTime: new Date()
                    };

                    let qqConversationLog = new dbConfig.collection_qqConversationLog(conversation);
                    return qqConversationLog.save();
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find this qq group control device's session"});
                }
            }
        );
    },

    bindPlayerQQInfo: (deviceId, playerQQRemark, playerQQId, playerQQNickname) => {
        let deviceSettingRecord;

        return dbConfig.collection_qqDevice.findOne({deviceId: deviceId}).lean().then(
            deviceSetting => {
                if (!deviceSetting) {
                    return Promise.reject({name: "DataError", message: "Cannot find qq group control's setting"});
                }

                deviceSettingRecord = deviceSetting;

                return dbConfig.collection_qqGroupControlPlayerQQ.findOne({deviceId: deviceSettingRecord.deviceId, playerQQRemark: playerQQRemark.trim(), platformObjId: deviceSettingRecord.platformObjId}).lean();
            }
        ).then(
            playerQQData => {
                if (playerQQData) {
                    if (playerQQData.playerQQId == playerQQId) {
                        return Promise.reject({name: "DataError", message: "QQ remark and QQ ID duplicate"});
                    }
                    let qqInfo = {
                        playerQQId: playerQQId,
                        playerQQNickname: playerQQNickname,
                        lastUpdateTime: new Date()
                    };

                    return dbConfig.collection_qqGroupControlPlayerQQ.update(
                        {deviceId: deviceSettingRecord.deviceId, playerQQRemark: playerQQRemark},
                        {$set: qqInfo},
                        {upsert: true}
                    ).exec()
                } else {
                    let newQQInfo = {
                        deviceId: deviceSettingRecord.deviceId,
                        platformObjId: deviceSettingRecord.platformObjId,
                        playerQQRemark: playerQQRemark.trim(),
                        playerQQId: playerQQId,
                        playerQQNickname: playerQQNickname,
                        createTime: new Date()
                    };

                    let bindPlayerQQ = new dbConfig.collection_qqGroupControlPlayerQQ(newQQInfo);
                    return bindPlayerQQ.save();
                }
            }
        );
    },

    updateQQGroupControlSetting: (platformId, qqGroupControlSettingData, deleteQQGroupControlSetting, adminInfo) => {
        let proms = [];
        let tempSetting = [];
        let duplicateSetting = [];

        if (qqGroupControlSettingData && qqGroupControlSettingData.length > 0) {
            qqGroupControlSettingData.forEach(setting => {
                if (setting && (setting.isEdit || setting.isNew)) {
                    setting.isDeviceIdExist = false;
                    setting.isDeviceNicknameExist = false;
                    tempSetting.push(setting);
                }
            });
        }

        if (deleteQQGroupControlSetting && deleteQQGroupControlSetting.length > 0) {
            deleteQQGroupControlSetting.forEach(deleteSetting => {
                if (deleteSetting && deleteSetting._id) {
                    proms.push(dbConfig.collection_qqDevice.remove({
                        _id: deleteSetting._id,
                        platformObjId: platformId
                    }));
                }
            });
        }

        return Promise.all(proms).then(() => {
            // execute delete operation first
            // compare with all qq device data, including other platform
            return dbConfig.collection_qqDevice.find({}).lean();
        }).then(
            qqDevice => {
                let proms = [];
                if (qqDevice && tempSetting && tempSetting.length > 0) {
                    tempSetting.map(setting => {
                        for (let x = 0; x < qqDevice.length; x++) {
                            // don't compare with itself, only compare with other QQ data
                            if (qqDevice[x]._id && setting._id && qqDevice[x]._id.toString() !== setting._id.toString()) {
                                if (qqDevice[x].deviceId === setting.deviceId) {
                                    setting.isDeviceIdExist = true;
                                }
                                if (qqDevice[x].deviceNickName.toLowerCase() === setting.deviceNickName.toLowerCase()) {
                                    setting.isDeviceNicknameExist = true;
                                }
                            }
                        }

                    });

                    tempSetting.forEach(setting => {
                        if ((setting.isDeviceIdExist && setting.isDeviceNicknameExist) || (setting.isDeviceIdExist || setting.isDeviceNicknameExist)) {
                            duplicateSetting.push(setting);
                        }
                    });

                    if (duplicateSetting && duplicateSetting.length > 0) {
                        return duplicateSetting;
                    } else {
                        tempSetting.forEach(setting => {
                            if (!setting._id) {
                                let newQQGroupControlSetting = {
                                    platformObjId: platformId,
                                    deviceId: setting.deviceId,
                                    deviceNickName: setting.deviceNickName,
                                    lastUpdateTime: new Date(),
                                    lastUpdateAdmin: adminInfo.id
                                };
                                proms.push(new dbConfig.collection_qqDevice(newQQGroupControlSetting).save());
                            } else {
                                let updateQQGroupControlSetting = {
                                    platformObjId: platformId,
                                    deviceId: setting.deviceId,
                                    deviceNickName: setting.deviceNickName,
                                    lastUpdateTime: new Date(),
                                    lastUpdateAdmin: adminInfo.id
                                };

                                if (setting.isEdit) {
                                    proms.push(dbConfig.collection_qqDevice.update(
                                        {platformObjId: platformId, _id: setting._id},
                                        {$set: updateQQGroupControlSetting},
                                        {upsert: true}
                                    ).exec());
                                }
                            }
                        });
                    }
                }
                return Promise.all(proms);
            }
        );
    },

    getQQGroupControlSetting: (platformId) => {
        return dbConfig.collection_qqDevice.find({platformObjId: platformId})
            .populate({path: 'lastUpdateAdmin', model: dbConfig.collection_admin, select: "adminName"}).sort({_id:1}).lean();
    },

    isNewQQDeviceDataExist: (deviceId, deviceNickName) => {
        let newQQData = {
            deviceId: deviceId,
            deviceNickName: deviceNickName,
            isDeviceIdExist: false,
            isDeviceNicknameExist: false
        };

        return dbConfig.collection_qqDevice.find({}).lean().then(
            qqDevice => {
                if (qqDevice && qqDevice.length > 0) {
                    for (let x = 0; x < qqDevice.length; x++) {
                        if (qqDevice[x].deviceId === deviceId) {
                            newQQData.isDeviceIdExist = true;
                        }
                        if (qqDevice[x].deviceNickName === deviceNickName) {
                            newQQData.isDeviceNicknameExist = true;
                        }
                    }
                } else {
                    return newQQData;
                }

                if (newQQData.isDeviceIdExist && newQQData.isDeviceNicknameExist) {
                    return Promise.reject({name: "DataError", message: "Duplicate Device Id and Device Nickname"});
                } else if (newQQData.isDeviceIdExist) {
                    return Promise.reject({name: "DataError", message: "Duplicate Device Id"});
                } else if (newQQData.isDeviceNicknameExist) {
                    return Promise.reject({name: "DataError", message: "Duplicate Device Nickname"});
                }

                return newQQData;
            }
        );
    },

    getQQSessionDeviceNickName: (platformIds) => {
        return getDeviceIdAndDeviceNickName(platformIds).then(
            data => {
                let deviceIdRecord = data && data[0] ? data[0] : [];
                let deviceNickNameRecord = data && data[1] ? data[1] : [];
                let query = {
                    platformObjId: {$in: platformIds}
                };

                query.$and = [{deviceId: {$in: deviceIdRecord}}, {deviceNickName: {$in: deviceNickNameRecord}}];

                return dbConfig.collection_qqGroupControlSession.distinct('deviceNickName', query).lean();
            }
        );
    },

    getQQSessionCsOfficer: (platformIds, deviceNickNames) => {
        return dbConfig.collection_qqGroupControlSession.distinct('csOfficer', {
            platformObjId: {$in: platformIds},
            deviceNickName: {$in: deviceNickNames}
        }).lean().then(
            deviceNickNamesData => {
                if (!(deviceNickNamesData && deviceNickNamesData.length)) {
                    return Promise.reject({name: "DataError", message: "Cannot find admin"});
                }
                return dbConfig.collection_admin.find({_id: {$in: deviceNickNamesData}}, {adminName: 1}).lean();
            }
        );
    },

    getQQControlSession: (queryData, index, limit, sortObj)=> {
        limit = limit ? limit : 10;
        index = index ? index : 0;
        let platformProm;
        let platformIds;
        if (!(queryData.platformIds && queryData.platformIds.length)) {
            platformProm = dbConfig.collection_admin.findOne({_id: queryData.admin})
                .populate({
                    path: "departments",
                    model: dbConfig.collection_department,
                    select: 'platforms'
                }).lean().then(
                    adminData => {
                        if (!adminData) {
                            return Promise.reject({name: "DataError", message: "Cannot find admin"});
                        }

                        if (adminData.departments && adminData.departments.length) {
                            let departments = adminData.departments;
                            let platformObjIds = [];
                            for (let i = 0; i < departments.length; i++) {
                                if (departments[i].platforms) {
                                    platformObjIds = platformObjIds.concat(departments[i].platforms);
                                }
                            }
                            return dbConfig.collection_platform.distinct('_id', {_id: {$in: platformObjIds}}).lean();
                        } else {
                            return Promise.reject({name: "DataError", message: "Cannot find departments"});
                        }
                    });
        } else {
            platformProm = Promise.resolve(queryData.platformIds)
        }

        return platformProm.then(
            (platformData) => {
                if (!(platformData && platformData.length)) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                platformIds = platformData;
                let sessionQuery = {
                    platformObjId: {$in: platformIds},
                    createTime: {$gte: new Date(queryData.startTime)},
                    $or: [{lastUpdateTime: {$lt: new Date(queryData.endTime)}}, {lastUpdateTime: null}]
                }

                if (queryData.deviceNickNames && queryData.deviceNickNames.length) {
                    sessionQuery.deviceNickName = {$in: queryData.deviceNickNames};
                }
                if (queryData.csOfficer && queryData.csOfficer.length) {
                    sessionQuery.csOfficer = {$in: queryData.csOfficer};
                }

                let qqGroupSessionCountProm = dbConfig.collection_qqGroupControlSession.find(sessionQuery).count();
                let qqGroupSessionProm = dbConfig.collection_qqGroupControlSession.find(sessionQuery).sort(sortObj).skip(index).limit(limit)
                    .populate({path: 'csOfficer', select: 'adminName', model: dbConfig.collection_admin})
                    .populate({path: "platformObjId", model: dbConfig.collection_platform}).lean();

                return Promise.all([qqGroupSessionCountProm, qqGroupSessionProm]);

            }
        ).then(
            ([qqGroupSessionCount, qqGroupSession]) => {
                return {data: qqGroupSession, size: qqGroupSessionCount};
            }
        );
    },

    getQQGroupControlSessionMonitor: (platformIds, deviceNickNames, adminIds, index, limit, sortCol) => {
        index = index || 0;
        let match = {};
        let platformList = [];
        let csOfficerList = [];
        let adminQuery = {};
        let size = 0;
        let qqGroupSessionRecord = [];
        let adminRecord = [];
        let platformRecord = [];
        let deviceRecord = [];
        let deviceNickNameRecord = [];
        let result = [];

        if (platformIds && platformIds.length > 0) {
            platformIds.forEach(x => {
                platformList.push(ObjectId(x));
            });
            match['platformObjId'] = {$in: platformList};
        }

        if (deviceNickNames && deviceNickNames.length > 0) {
            match['deviceNickName'] = {$in: deviceNickNames};
        }

        if (adminIds && adminIds.length > 0) {
            adminIds.forEach(x => {
                csOfficerList.push(ObjectId(x));
            });

            match['$or'] = [{csOfficer: {$eq: null}},
                {csOfficer: {$in: csOfficerList}}
            ]
        }

        if (adminIds && adminIds.length > 0) {
            adminQuery = {
                _id: {$in: adminIds}
            };
        }

        let adminProm = dbConfig.collection_admin.find(adminQuery, {adminName: 1}).lean();
        let platformProm = dbConfig.collection_platform.find({}, {name:1, platformId: 1}).lean();
        let deviceProm = getDeviceIdAndDeviceNickName(platformList);

        return Promise.all([adminProm, platformProm, deviceProm]).then(
            data => {
                adminRecord = data && data[0] ? data[0] : [];
                platformRecord = data && data[1] ? data[1] : [];
                deviceRecord = data && data[2] && data[2][0] ? data[2][0] : [];
                deviceNickNameRecord = data && data[2] && data[2][1] ? data[2][1] : [];

                match.$and = [{deviceId: {$in: deviceRecord}}, {deviceNickName: {$in: deviceNickNameRecord}}];

                let countQQGroupControlSessionMonitorProm = dbConfig.collection_qqGroupControlSession.aggregate([
                    {
                        $match: match
                    },
                    {
                        $group: {
                            _id: {platformObjId:'$platformObjId', deviceId: '$deviceId', deviceNickName: '$deviceNickName'},
                            csOfficer: {$last: '$csOfficer'},
                            connectionAbnormalClickTimes: {$last: '$connectionAbnormalClickTimes'},
                            status: {$last: '$status'},
                            createTime: {$last: '$createTime'},
                            lastUpdateTime: {$last: '$lastUpdateTime'}
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count: {$sum: 1}
                        }
                    }
                ]).read("secondaryPreferred");

                let qqGroupControlSessionMonitorProm = dbConfig.collection_qqGroupControlSession.aggregate([
                    {
                        $match: match
                    },
                    {
                        $sort : { _id : 1}
                    },
                    {
                        $group: {
                            _id: {platformObjId:'$platformObjId', deviceId: '$deviceId', deviceNickName: '$deviceNickName'},
                            csOfficer: {$last: '$csOfficer'},
                            connectionAbnormalClickTimes: {$last: '$connectionAbnormalClickTimes'},
                            status: {$last: '$status'},
                            createTime: {$last: '$createTime'},
                            lastUpdateTime: {$last: '$lastUpdateTime'},
                            qqVersion: {$last: '$qqVersion'}
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            csOfficer: 1,
                            status: 1,
                            connectionAbnormalClickTimes: 1,
                            createTime: 1,
                            lastUpdateTime: 1,
                            duration: {$divide:[ {$subtract: [ {$ifNull: [ "$lastUpdateTime", new Date()]}, "$createTime" ]}, 60000]},
                            qqVersion: 1
                        }
                    },
                    {   $sort: sortCol },
                    {   $skip: index },
                    {   $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            platformObjId: "$_id.platformObjId",
                            deviceNickName: "$_id.deviceNickName",
                            deviceId: "$_id.deviceId",
                            csOfficer: 1,
                            status: 1,
                            connectionAbnormalClickTimes: 1,
                            createTime: 1,
                            lastUpdateTime: 1,
                            duration: 1,
                            qqVersion: 1
                        }
                    }
                ]).read("secondaryPreferred");

                return Promise.all([countQQGroupControlSessionMonitorProm, qqGroupControlSessionMonitorProm]).then(
                    data => {
                        if (data) {
                            size = data[0] && data[0][0] && data[0][0].count ? data[0][0].count : 0;
                            qqGroupSessionRecord =  data[1] ? data[1] : [];

                            result = rearrangeQQGroupControlSessionPlatformAndAdminInfo(qqGroupSessionRecord, adminRecord, platformRecord);
                        }

                        return {data: result, size: size};
                    });
            }
        );
    },

    getQQGroupControlSessionHistory: (platformObjId, deviceNickName, deviceId, adminIds, startDate, endDate, index, limit, sortCol) => {
        platformObjId = ObjectId(platformObjId);
        index = index || 0;
        let csOfficerList = [];

        if (adminIds && adminIds.length > 0) {
            adminIds.forEach(x => {
                csOfficerList.push(ObjectId(x));
            });
        }

        let query = {
            platformObjId: platformObjId,
            deviceNickName: deviceNickName,
            deviceId: deviceId,
            createTime: {$gte: startDate, $lt: endDate},
        };

        if (csOfficerList && csOfficerList.length > 0) {
            query['$or'] = [{csOfficer: {$eq: null}},
                {csOfficer: {$in: csOfficerList}}
            ];
        }

        let countQQGroupControlSessionHistoryProm = dbConfig.collection_qqGroupControlSession.find(query).count();
        let QQGroupControlSessionHistoryProm = dbConfig.collection_qqGroupControlSession.find(query)
            .populate({path: "platformObjId", model: dbConfig.collection_platform, select: {name: 1, platformId: 1}})
            .populate({path: "csOfficer", model: dbConfig.collection_admin, select: {adminName: 1}}).sort(sortCol).skip(index).limit(limit);

        return Promise.all([countQQGroupControlSessionHistoryProm, QQGroupControlSessionHistoryProm]).then(
            data => {
                let size = 0;
                let result = [];

                if (data) {
                    size = data[0] ? data[0] : 0;
                    result = data[1] ? data[1] : [];
                }

                return {data: result, size: size};
            }
        );
    },
};

function rearrangeQQGroupControlSessionPlatformAndAdminInfo(sessionRecords, adminRecords, platformRecords) {
    if (sessionRecords && sessionRecords.length > 0) {
        return sessionRecords.map(session => {
            let adminIndexNo = adminRecords.findIndex(x => x && x._id && session && session.csOfficer && (x._id.toString() == session.csOfficer.toString()));
            let platformIndexNo = platformRecords.findIndex(y => y && y._id && session && session.platformObjId && (y._id.toString() == session.platformObjId.toString()))

            if (adminIndexNo != -1) {
                session.adminName = adminRecords[adminIndexNo].adminName;
            }

            if (platformIndexNo != -1) {
                session.platformName = platformRecords[platformIndexNo].name;
                session.platformId = platformRecords[platformIndexNo].platformId;
            }

            return session;
        });
    }
}

function getDeviceIdAndDeviceNickName(platformList) {
    return dbConfig.collection_qqDevice.find({platformObjId: {$in: platformList}}, {deviceId: 1, deviceNickName: 1}).lean().then(
        deviceData => {
            let deviceIdList = [];
            let deviceNickNameList = [];

            if (deviceData && deviceData.length > 0) {
                deviceData.forEach(device => {
                    if (device && device.deviceId) {
                        deviceIdList.push(device.deviceId);
                    }

                    if (device && device.deviceNickName) {
                        deviceNickNameList.push(device.deviceNickName);
                    }
                });
            }

            return [deviceIdList, deviceNickNameList];
        }
    )
}

module.exports = dbWCGroupControl;