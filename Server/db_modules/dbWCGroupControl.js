var dbConfig = require('./../modules/dbproperties');
var constWCSessionStatus = require('./../const/constWCGroupControlSessionStatus');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var dbWCGroupControl = {
    checkAndUpdateWCSessionStatus: () => {
        let second = 1000;
        let minute = 60 * second;
        const maxSessionIdleTime = 3 * minute;
        let now = new Date().getTime();
        let updateProm = [];

        return dbConfig.collection_wcGroupControlSession.find({status: constWCSessionStatus.ONLINE}).lean().then(sessions => {
            if(sessions && sessions.length > 0) {
                sessions.forEach(session => {
                    if(session.lastActiveTime) {
                        let lastActiveTime = new Date(session.lastActiveTime).getTime();
                        let idlePeriod = now - lastActiveTime;
                        if(idlePeriod > maxSessionIdleTime) {
                            updateProm.push(
                                dbConfig.collection_wcGroupControlSession.findOneAndUpdate({
                                    _id: session._id
                                },{
                                    status: constWCSessionStatus.OFFLINE,
                                    lastUpdateTime: new Date()
                                })
                            );
                        }
                    }
                });
                return Promise.all(updateProm);
            }
        })
    },
    sendWCGroupControlSessionToFPMS: (deviceId, adminId, status, connectionAbnormalClickTimes) => {
        let deviceSettingRecord;
        let adminObjId;
        if (adminId) {
            adminId = adminId.trim();
        }

        if (!connectionAbnormalClickTimes) {
            connectionAbnormalClickTimes = 0;
        }

        return dbConfig.collection_admin.findOne({adminName: adminId}, {_id: 1, adminName: 1}).lean().then(
            adminData => {
                if (adminData && adminData._id) {
                    adminObjId = adminData._id;
                }

                return dbConfig.collection_wcDevice.findOne({deviceId: deviceId}).lean();
            }
        ).then(
            deviceSetting => {
                if (!deviceSetting) {
                    return Promise.reject({name: "DataError", message: "Cannot find wechat group control's setting"});
                }

                deviceSettingRecord = deviceSetting;

                return dbConfig.collection_wcGroupControlSession.findOne({deviceId: deviceSettingRecord.deviceId, deviceNickName: deviceSettingRecord.deviceNickName, platformObjId: deviceSettingRecord.platformObjId, lastUpdateTime: {$exists: false}}).lean();
            }
        ).then(
            wcGroupControlSessionData => {
                if (wcGroupControlSessionData) {
                    if (status == constWCSessionStatus.ONLINE) {
                        return dbConfig.collection_wcGroupControlSession.findOneAndUpdate(
                            {_id: wcGroupControlSessionData._id},
                            {
                                $inc: {
                                    connectionAbnormalClickTimes: connectionAbnormalClickTimes
                                },
                                csOfficer: adminObjId,
                                status: status,
                                lastActiveTime: new Date()
                            },
                            {new: true}
                        ).lean();
                    } else if (status == constWCSessionStatus.OFFLINE) {
                        // update lastUpdateTime when status is offline
                        return dbConfig.collection_wcGroupControlSession.findOneAndUpdate(
                            {_id: wcGroupControlSessionData._id},
                            {
                                $inc: {
                                    connectionAbnormalClickTimes: connectionAbnormalClickTimes
                                },
                                csOfficer: adminObjId,
                                status: status,
                                lastUpdateTime: new Date()
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
                            lastActiveTime: new Date()
                        };

                        let wcGroupControlSession = new dbConfig.collection_wcGroupControlSession(newSession);
                        return wcGroupControlSession.save();
                    } else {
                        return Promise.reject({name: "DataError", message: "Cannot find wechat group control's setting"});
                    }
                }
            }
        );
    },

    sendWechatConversationToFPMS: (deviceId, playerWechatRemark, csReplyTime, csReplyContent) => {
        return dbConfig.collection_wcGroupControlSession.findOne({deviceId: deviceId, lastUpdateTime: {$exists: false}}).lean().then(
            wcGroupControlSessionData => {
                if (wcGroupControlSessionData && wcGroupControlSessionData._id) {
                    let conversation = {
                        wcGroupControlSessionId: wcGroupControlSessionData._id,
                        deviceId: wcGroupControlSessionData.deviceId,
                        deviceNickName: wcGroupControlSessionData.deviceNickName,
                        platformObjId: wcGroupControlSessionData.platformObjId,
                        csOfficer: wcGroupControlSessionData.csOfficer,
                        playerWechatRemark: playerWechatRemark.trim(),
                        csReplyTime: csReplyTime,
                        csReplyContent: csReplyContent,
                        createTime: new Date()
                    };

                    let wcConversationLog = new dbConfig.collection_wcConversationLog(conversation);
                    return wcConversationLog.save();
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find this wechat group control device's session"});
                }
            }
        )
    },

    bindPlayerWechatInfo: (deviceId, playerWechatRemark, playerWechatId, playerWechatNickname) => {
        let deviceSettingRecord;

        return dbConfig.collection_wcDevice.findOne({deviceId: deviceId}).lean().then(
            deviceSetting => {
                if (!deviceSetting) {
                    return Promise.reject({name: "DataError", message: "Cannot find wechat group control's setting"});
                }

                deviceSettingRecord = deviceSetting;

                return dbConfig.collection_wcGroupControlPlayerWechat.findOne({deviceId: deviceSettingRecord.deviceId, playerWechatRemark: playerWechatRemark.trim(), platformObjId: deviceSettingRecord.platformObjId}).lean();
            }
        ).then(
            playerWechatData => {
                if (playerWechatData) {
                    if (playerWechatData.playerWechatId == playerWechatId) {
                        return Promise.reject({name: "DataError", message: "Wechat remark and wechat ID duplicate"});
                    }
                    let wechatInfo = {
                        playerWechatId: playerWechatId,
                        playerWechatNickname: playerWechatNickname,
                        lastUpdateTime: new Date()
                    };

                    return dbConfig.collection_wcGroupControlPlayerWechat.update(
                        {deviceId: deviceSettingRecord.deviceId, playerWechatRemark: playerWechatRemark},
                        {$set: wechatInfo},
                        {upsert: true}
                    ).exec()
                } else {
                    let newWechatInfo = {
                        deviceId: deviceSettingRecord.deviceId,
                        platformObjId: deviceSettingRecord.platformObjId,
                        playerWechatRemark: playerWechatRemark.trim(),
                        playerWechatId: playerWechatId,
                        playerWechatNickname: playerWechatNickname,
                        createTime: new Date()
                    };

                    let bindPlayerWechat = new dbConfig.collection_wcGroupControlPlayerWechat(newWechatInfo);
                    return bindPlayerWechat.save();
                }
            }
        )
    },

    updateWechatGroupControlSetting: (platformId, wcGroupControlSettingData, deleteWechatGroupControlSetting, adminInfo) => {
        let proms = [];
        let tempSetting = [];
        let duplicateSetting = [];

        if (wcGroupControlSettingData && wcGroupControlSettingData.length > 0) {
            wcGroupControlSettingData.forEach(setting => {
                if (setting && (setting.isEdit || setting.isNew)) {
                    setting.isDeviceIdExist = false;
                    setting.isDeviceNicknameExist = false;
                    tempSetting.push(setting);
                }
            });
        }

        if (deleteWechatGroupControlSetting && deleteWechatGroupControlSetting.length > 0) {
            deleteWechatGroupControlSetting.forEach(deleteSetting => {
                if (deleteSetting && deleteSetting._id) {
                    proms.push(dbConfig.collection_wcDevice.remove({
                        _id: deleteSetting._id,
                        platformObjId: platformId
                    }));
                }
            })
        }

        return Promise.all(proms).then(() => {
            // execute delete operation first
            // compare with all wechat device data, including other platform
            return dbConfig.collection_wcDevice.find({}).lean()
        }).then(
            wcDevice => {
                let proms = [];
                if (wcDevice && tempSetting && tempSetting.length > 0) {
                    tempSetting.map(setting => {
                        for (let x = 0; x < wcDevice.length; x++) {
                            // don't compare with itself, only compare with other WeChat data
                            if (wcDevice[x]._id && setting._id && wcDevice[x]._id.toString() !== setting._id.toString()) {
                                if (wcDevice[x].deviceId === setting.deviceId) {
                                    setting.isDeviceIdExist = true;
                                }
                                if (wcDevice[x].deviceNickName.toLowerCase() === setting.deviceNickName.toLowerCase()) {
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
                                let newWCGroupControlSetting = {
                                    platformObjId: platformId,
                                    deviceId: setting.deviceId,
                                    deviceNickName: setting.deviceNickName,
                                    lastUpdateTime: new Date(),
                                    lastUpdateAdmin: adminInfo.id
                                };
                                proms.push(new dbConfig.collection_wcDevice(newWCGroupControlSetting).save());
                            } else {
                                let updateWCGroupControlSetting = {
                                    platformObjId: platformId,
                                    deviceId: setting.deviceId,
                                    deviceNickName: setting.deviceNickName,
                                    lastUpdateTime: new Date(),
                                    lastUpdateAdmin: adminInfo.id
                                };

                                if (setting.isEdit) {
                                    proms.push(dbConfig.collection_wcDevice.update(
                                        {platformObjId: platformId, _id: setting._id},
                                        {$set: updateWCGroupControlSetting},
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

    getWechatGroupControlSetting: (platformId) => {
        return dbConfig.collection_wcDevice.find({platformObjId: platformId})
            .populate({path: 'lastUpdateAdmin', model: dbConfig.collection_admin, select: "adminName"}).sort({_id:1}).lean();
    },


    getWechatSessionDeviceNickName: (platformIds) => {
        return dbConfig.collection_wcGroupControlSession.distinct('deviceNickName', {platformObjId: {$in: platformIds}}).lean();
    },

    getWechatSessionCsOfficer: (platformIds, deviceNickNames) => {
        return dbConfig.collection_wcGroupControlSession.distinct('csOfficer', {
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

    getWechatControlSession: (queryData, index, limit, sortObj)=> {
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
                    })
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

                let wcGroupSessionCountProm = dbConfig.collection_wcGroupControlSession.find(sessionQuery).count();
                let wcGroupSessionProm = dbConfig.collection_wcGroupControlSession.find(sessionQuery).sort(sortObj).skip(index).limit(limit)
                    .populate({path: 'csOfficer', select: 'adminName', model: dbConfig.collection_admin})
                    .populate({path: "platformObjId", model: dbConfig.collection_platform}).lean();

                return Promise.all([wcGroupSessionCountProm, wcGroupSessionProm]);

            }
        ).then(
            ([wcGroupSessionCount, wcGroupSession]) => {
                return {data: wcGroupSession, size: wcGroupSessionCount};
            }
        )
    },

    isNewWechatDeviceDataExist: (deviceId, deviceNickName) => {
        let newWechatData = {
            deviceId: deviceId,
            deviceNickName: deviceNickName,
            isDeviceIdExist: false,
            isDeviceNicknameExist: false
        };

        return dbConfig.collection_wcDevice.find({}).lean().then(
            wcDevice => {
                if (wcDevice && wcDevice.length > 0) {
                    for (let x = 0; x < wcDevice.length; x++) {
                        if (wcDevice[x].deviceId === deviceId) {
                            newWechatData.isDeviceIdExist = true;
                        }
                        if (wcDevice[x].deviceNickName === deviceNickName) {
                            newWechatData.isDeviceNicknameExist = true;
                        }
                    }
                } else {
                    return newWechatData;
                }

                if (newWechatData.isDeviceIdExist && newWechatData.isDeviceNicknameExist) {
                    return Promise.reject({name: "DataError", message: "Duplicate Device Id and Device Nickname"});
                } else if (newWechatData.isDeviceIdExist) {
                    return Promise.reject({name: "DataError", message: "Duplicate Device Id"});
                } else if (newWechatData.isDeviceNicknameExist) {
                    return Promise.reject({name: "DataError", message: "Duplicate Device Nickname"});
                }

                return newWechatData;
            }
        );
    },

    getWCGroupControlSessionDeviceNickName: (platformIds) => {
        let plaformObjIds = platformIds.map(x => ObjectId(x));
        return dbConfig.collection_wcGroupControlSession.distinct('deviceNickName', {platformObjId: {$in: plaformObjIds}}).lean();
    },

    getWCGroupControlSessionMonitor: (deviceNickNames, adminIds, index, limit) => {
        index = index || 0;
        let match = {};
        let csOfficerList = [];

        if (deviceNickNames && deviceNickNames.length > 0) {
            match['deviceNickName'] = {$in: deviceNickNames};
        }

        if (adminIds && adminIds.length > 0) {
            adminIds.forEach(x => {
                csOfficerList.push(ObjectId(x));
            });

            if (!deviceNickNames.length) {
                match['csOfficer'] = {$in: csOfficerList};
            } else {
                match['$or'] = [{csOfficer: {$eq: null}},
                    {csOfficer: {$in: csOfficerList}}
                ]
            }
        } else {
            match['csOfficer'] = {$eq: null};
        }

        let adminProm = dbConfig.collection_admin.find({_id: {$in: adminIds}}, {adminName: 1}).lean();
        let platformProm = dbConfig.collection_platform.find({}, {name:1, platformId: 1}).lean();

        let countWCGroupControlSessionMonitorProm = dbConfig.collection_wcGroupControlSession.aggregate([
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
                        count: { $sum: 1 }
                }
            }
        ]).read("secondaryPreferred");

        let wcGroupControlSessionMonitorProm = dbConfig.collection_wcGroupControlSession.aggregate([
            {
                $match: match
            },
            {
                $sort : { createTime : 1}
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
                    lastUpdateTime: 1

                }
            },
        ]).read("secondaryPreferred");

        return Promise.all([countWCGroupControlSessionMonitorProm, wcGroupControlSessionMonitorProm, adminProm, platformProm]).then(
            data => {
                let size = 0;
                let wcGroupSessionRecord = [];
                let adminRecord = [];
                let platformRecord = [];
                let result = []

                if (data) {
                    size = data[0] && data[0][0] && data[0][0].count ? data[0][0].count : 0;
                    wcGroupSessionRecord =  data[1] ? data[1] : [];
                    adminRecord = data[2] ? data[2] : [];
                    platformRecord = data[3] ? data[3] : [];

                    result = rearrangeWCGroupControlSessionPlatformAndAdminInfo(wcGroupSessionRecord, adminRecord, platformRecord);

                }

                return {data: result, size: size};
            });

    },

    getWCGroupControlSessionHistory: (platformObjId, deviceNickName, deviceId, adminIds, startDate, endDate, index, limit) => {
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
            query['csOfficer'] = {$in: csOfficerList};
        } else {
            query['csOfficer'] = {$eq: null};
        }

        let countWCGroupControlSessionHistoryProm = dbConfig.collection_wcGroupControlSession.find(query).count();
        let WCGroupControlSessionHistoryProm = dbConfig.collection_wcGroupControlSession.find(query)
            .populate({path: "platformObjId", model: dbConfig.collection_platform, select: {name: 1, platformId: 1}})
            .populate({path: "csOfficer", model: dbConfig.collection_admin, select: {adminName: 1}}).skip(index).limit(limit);

        return Promise.all([countWCGroupControlSessionHistoryProm, WCGroupControlSessionHistoryProm]).then(
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

function rearrangeWCGroupControlSessionPlatformAndAdminInfo(sessionRecords, adminRecords, platformRecords) {
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

module.exports = dbWCGroupControl;