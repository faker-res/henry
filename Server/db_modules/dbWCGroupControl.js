var dbConfig = require('./../modules/dbproperties');
var constWCSessionStatus = require('./../const/constWCGroupControlSessionStatus');

var dbWCGroupControl = {
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

                return dbConfig.collection_wcGroupControlSession.findOne({deviceId: deviceSettingRecord.deviceId, platformObjId: deviceSettingRecord.platformObjId, lastUpdateTime: {$exists: false}}).lean();
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
                                status: status
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
                    let newSession = {
                        deviceId: deviceId,
                        csOfficer: adminObjId,
                        status: status,
                        platformObjId: deviceSettingRecord.platformObjId,
                        connectionAbnormalClickTimes: connectionAbnormalClickTimes
                    };

                    let wcGroupControlSession = new dbConfig.collection_wcGroupControlSession(newSession);
                    return wcGroupControlSession.save();

                }
            }
        );
    },

    sendWechatConversationToFPMS: (deviceId, playerWechatId, playerWechatName, csReplyTime, csReplyContent) => {
        return dbConfig.collection_wcGroupControlSession.findOne({deviceId: deviceId, lastUpdateTime: {$exists: false}}).lean().then(
            wcGroupControlSessionData => {
                if (wcGroupControlSessionData && wcGroupControlSessionData._id) {
                    let conversation = {
                        wcGroupControlSessionId: wcGroupControlSessionData._id,
                        deviceId: wcGroupControlSessionData.deviceId,
                        platformObjId: wcGroupControlSessionData.platformObjId,
                        csOfficer: wcGroupControlSessionData.csOfficer,
                        playerWechatId: playerWechatId,
                        playerWechatName: playerWechatName,
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

    updateWechatGroupControlSetting: (platformId, wcGroupControlSettingData, deleteWechatGroupControlSetting, adminInfo) => {
        let proms = [];
        let tempSetting = [];

        if (wcGroupControlSettingData && wcGroupControlSettingData.length > 0) {
            wcGroupControlSettingData.forEach(setting => {
                if (setting && (setting.isEdit || setting.isNew)) {
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

        if (tempSetting && tempSetting.length > 0) {
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

        return Promise.all(proms);
    },

    getWechatGroupControlSetting: (platformId) => {
        return dbConfig.collection_wcDevice.find({platformObjId: platformId})
            .populate({path: 'lastUpdateAdmin', model: dbConfig.collection_admin, select: "adminName"}).sort({_id:1}).lean();
    },
};
module.exports = dbWCGroupControl;