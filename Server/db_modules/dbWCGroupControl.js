var dbConfig = require('./../modules/dbproperties');
var constWCSessionStatus = require('./../const/constWCGroupControlSessionStatus');

var dbWCGroupControl = {
    sendWCGroupControlSessionToFPMS: (deviceId, csWechatId) => {
        let deviceSettingRecord;

        return dbConfig.collection_wcDevice.findOne({deviceId: deviceId}).lean().then(
            deviceSetting => {
                if (!deviceSetting) {
                    return Promise.reject({name: "DataError", message: "Cannot find wechat group control's setting"});
                }

                deviceSettingRecord = deviceSetting;

                return dbConfig.collection_wcGroupControlSession.findOne({deviceId: deviceSettingRecord.deviceId, platformObjId: deviceSettingRecord.platformObjId}).lean();
            }
        ).then(
            wcGroupControlSessionData => {
                if (!wcGroupControlSessionData) {
                    let newSession = {
                        deviceId: deviceId,
                        csWechatId: csWechatId,
                        status: csWechatId ? constWCSessionStatus.ONLINE : constWCSessionStatus.OFFLINE,
                        platformObjId: deviceSettingRecord.platformObjId
                    };

                    let wcGroupControlSession = new dbConfig.collection_wcGroupControlSession(newSession);
                    return wcGroupControlSession.save();
                } else {
                    return dbConfig.collection_wcGroupControlSession.findOneAndUpdate(
                        {_id: wcGroupControlSessionData._id},
                        {
                            status: csWechatId ? constWCSessionStatus.ONLINE : constWCSessionStatus.OFFLINE,
                            lastUpdateTime: new Date()
                        },
                        {new: true}
                    ).lean();
                }
            }
        );
    },
};
module.exports = dbWCGroupControl;