var dbLoggerFunc = function () {
};
module.exports = new dbLoggerFunc();

var dbconfig = require('./dbproperties');
var constSystemLogLevel = require("../const/constSystemLogLevel");
var constSystemParam = require('../const/constSystemParam');
var constPlayerCreditTransferStatus = require('../const/constPlayerCreditTransferStatus')
var Q = require("q");
var errorUtils = require("./errorUtils.js");
var constProposalEntryType = require('./../const/constProposalEntryType');
var constProposalUserType = require('./../const/constProposalUserType');
var pmsAPI = require('../externalAPI/pmsAPI');
const constSMSPurpose = require('../const/constSMSPurpose');

var dbLogger = {

    /**
     * Create the log information of every action operated by Admin user
     * @param {json} adminActionRecordData - The data of the log -  Refer to systemLog schema.
     */
    createSystemLog: function (adminActionRecordData) {
        //only store non-get actions
        if (adminActionRecordData.level === constSystemLogLevel.ACTION && adminActionRecordData.action && adminActionRecordData.action.indexOf("get") >= 0) {
            return;
        }
        var record = new dbconfig.collection_systemLog(adminActionRecordData);
        record.save().then().catch(err => errorSavingLog(err, adminActionRecordData));
    },

    /**
     * Create the log  of credit transfer action to the player
     * @param {objectId} playerId
     * @param {number} amount
     * @param {string} type
     * @param {objectId} operatorId
     * @param {Object} data - details
     */
    createCreditChangeLog: function (playerId, platformId, amount, type, curAmount, operatorId, data) {
        // note: use constPlayerCreditChangeType for the 'type' parameter
        if (curAmount < 0) {
            curAmount = 0;
        }
        var logData = {
            playerId: playerId,
            platformId: platformId,
            amount: amount,
            operationType: type,
            curAmount: curAmount ? curAmount : null,
            operatorId: operatorId ? operatorId : null,
            data: data ? data : null
        };

        // remove extra info on credit change log data
        delete logData.data.devCheckMsg;

        var record = new dbconfig.collection_creditChangeLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    createCreditChangeLogWithLockedCredit: function (playerId, platformId, amount, type, curAmount, lockedAmount, changedLockedAmount, operatorId, data) {
        if (curAmount < 0) {
            curAmount = 0;
        }
        var logData = {
            playerId: playerId,
            platformId: platformId,
            amount: amount,
            operationType: type,
            curAmount: curAmount ? curAmount : null,
            operatorId: operatorId ? operatorId : null,
            lockedAmount: lockedAmount,
            changedLockedAmount: changedLockedAmount,
            data: data ? data : null
        };
        var record = new dbconfig.collection_creditChangeLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },


    /**
     * Create the log  of credit transfer action to the partner
     * @param {objectId} partnerId
     * @param {number} amount
     * @param {string} type
     * @param {objectId} operatorId
     * @param {Object} data - details
     */
    createPartnerCreditChangeLog: function (partnerId, platformId, amount, type, curAmount, operatorId, data) {
        if (curAmount < 0) {
            curAmount = 0;
        }
        var logData = {
            partnerId: partnerId,
            platformId: platformId,
            amount: amount,
            operationType: type,
            curAmount: curAmount ? curAmount : null,
            operatorId: operatorId ? operatorId : null,
            data: data ? data : null
        };
        var record = new dbconfig.collection_partnerCreditChangeLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    queryCreditChangeLog: function (query, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(limit, constSystemParam.MAX_RECORD_NUM);
        sortCol = sortCol || {};
        var a = dbconfig.collection_creditChangeLog
            .find(query)
            .populate({path: "playerId", model: dbconfig.collection_players})
            .sort(sortCol).skip(index).limit(limit).exec();
        var b = dbconfig.collection_creditChangeLog.find(query).count();
        var c = dbconfig.collection_creditChangeLog.aggregate(
            {
                $match: query
            },
            {
                $group: {
                    _id: null,
                    totalAmount: {$sum: "$amount"}
                }
            }
        );
        return Q.all([a, b, c]).then(
            data => {
                var amount = 0;
                if (data[2] && data[2][0]) {
                    amount = data[2][0].totalAmount
                }
                return {
                    data: data[0],
                    size: data[1],
                    summary: {amount: parseFloat(amount).toFixed(2)}
                }
            }
        )
    },

    /**
     * Create the log  info of reward transfer action to the player
     * @param {json} rewardLogData - The data of the log. Refer to rewardLog schema.
     */
    createRewardLog: function (rewardLogData) {
        var record = new dbconfig.collection_rewardLog(rewardLogData);
        record.save().then().catch(err => errorSavingLog(err, record));
    },

    /**
     * Get the log information of an admin action by record _id
     * @param {String} query - Query string
     */
    getAdminActionRecord: function (query) {
        return dbconfig.collection_systemLog.findOne(query).exec();
    },

    /**
     * Create api response time log
     * @param {String} service
     * @param {String} functionName
     * @param {Json} reqData
     * @param {Json} resData
     * @param {number} responseTime
     */
    createAPIResponseTimeLog: function (service, functionName, reqData, resData, responseTime) {
        var logData = {
            service: service,
            functionName: functionName,
            requestData: reqData,
            responseData: resData,
            responseTime: responseTime
        };
        var record = new dbconfig.collection_apiResponseTimeLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    /**
     * Create player credit transfer error log
     * @param {ObjectId} playerObjId
     * @param {String} playerId
     * @param {String} playerName
     * @param {ObjectId} platformObjId
     * @param {String} platformId
     * @param {String} type
     * @param {String} transferId
     * @param {objectId} providerId
     * @param {Number} amount
     * @param lockedAmount
     * @param adminName
     * @param apiRes
     * @param status
     */
    createPlayerCreditTransferStatusLog: function (playerObjId, playerId, playerName, platformObjId, platformId, type, transferId, providerId, amount, lockedAmount, adminName, apiRes, status) {
        var logData = {
            playerObjId: playerObjId,
            playerId: playerId,
            playerName: playerName,
            adminName: adminName,
            platformObjId: platformObjId,
            platformId: platformId,
            type: type,
            transferId: transferId,
            providerId: providerId,
            amount: amount,
            lockedAmount: lockedAmount,
            apiRes: apiRes,
            status: status
        };
        var record = new dbconfig.collection_playerCreditTransferLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    /**
     * Create settlement log
     * @param {String} type
     * @param {String} interval
     * @param {ObjectId} id
     * @param {Date} settlementTime
     * @param {Boolean} result
     * @param {JSON} data
     */
    createSettlementLog: function (type, interval, id, settlementTime, result, data) {
        var logData = {
            type: type,
            interval: interval,
            id: id,
            settlementTime: settlementTime,
            result: result,
            data: data
        };
        var settleData = new dbconfig.collection_settlementLog(logData);
        settleData.save().then().catch(err => errorSavingLog(err, logData));
    },

    createDataMigrationErrorLog: function (service, functionName, data, error) {
        var logData = {
            service: service,
            functionName: functionName,
            data: data,
            error: error
        };
        var errorLog = new dbconfig.collection_dataMigrationErrorLog(logData);
        errorLog.save().then().catch(err => errorSavingLog(err, logData));
    },
    createSMSLog: function (adminObjId, adminName, recipientName, data, sendObj, platform, status, error) {
        var type = data.playerId ? 'player'
            : data.partnerId ? 'partner'
            : 'other';
        // The data object knows which player or partner we queried
        // The sendObj knows the phone number
        // So we combine them
        var logData = Object.assign({}, data, sendObj, {
            admin: adminObjId,
            adminName: adminName,
            recipientName: recipientName,
            type: type,
            platform: platform,
            phoneNumber: sendObj.tel,
            status: status,
            error: error,
        });
        var smsLog = new dbconfig.collection_smsLog(logData);
        smsLog.save().then().catch(err => errorSavingLog(err, logData));
    },

    // this actually create all the validation sms log instead of just for registration
    createRegisterSMSLog: function (type, platformObjId, platformId, tel, message, channel, purpose, inputDevice, status, error) {
        if (Object.values(constSMSPurpose).indexOf(purpose) === -1) {
            purpose = constSMSPurpose.UNKNOWN;
        }

        inputDevice = inputDevice || 0;

        let phoneQuery = {$in: [rsaCrypto.encrypt(tel), tel]};

        dbconfig.collection_players.findOne({phoneNumber: phoneQuery}, {name: 1}).lean().then(
            playerData => {
                var logData = {
                    type: type,
                    message: message,
                    platform: platformObjId,
                    tel: tel,
                    inputDevice: inputDevice,
                    channel: channel,
                    purpose: purpose,
                    status: status,
                    error: error,
                };

                if (playerData && playerData.name) {
                    logData.recipientName = playerData.name;
                }

                var smsLog = new dbconfig.collection_smsLog(logData);
                smsLog.save().then().catch(err => errorSavingLog(err, logData));
            }
        );
    },

    logUsedVerificationSMS: (tel, message) => {
        dbconfig.collection_smsLog.find({tel, message}).sort({createTime:-1}).limit(1).lean().exec().then(
            smsLogArr => {
                if (smsLogArr && smsLogArr[0]) {
                    let smsLog = smsLogArr[0];

                    dbconfig.collection_smsLog.update({_id: smsLog._id}, {used: true});
                }
            }
        )
    },

    getPaymentHistory: function (query) {
        var finalResult = [];

        function getAddr(each) {
            var collectionName = '';
            var returnData = Object.assign({}, each);
            if (each.creatorType == constProposalUserType.PLAYERS) {
                collectionName = "collection_players";
            } else if (each.creatorType == constProposalUserType.SYSTEM_USERS) {
                collectionName = "collection_admin";
            }
            var a = collectionName ? dbconfig[collectionName].findOne({_id: each.creatorObjId}) : null;
            var b = each.bankAccountProvince ? pmsAPI.foundation_getProvince({provinceId: each.bankAccountProvince}).then(data => {
                return data && data.province ? data.province.name : each.bankAccountProvince;
            }) : null;
            var c = each.bankAccountCity ? pmsAPI.foundation_getCity({cityId: each.bankAccountCity}).then(data => {
                return data && data.city ? data.city.name : each.bankAccountCity;
            }) : null;
            var d = each.bankAccountDistrict ? pmsAPI.foundation_getDistrict({districtId: each.bankAccountDistrict}).then(data => {
                return data && data.district ? data.district.name : each.bankAccountDistrict;
            }) : null;
            return Q.all([a, b, c, d]).then(newData => {
                if (each.source == constProposalEntryType.ADMIN) {
                    returnData.sourceStr = "admin";
                } else if (each.source == constProposalEntryType.CLIENT) {
                    returnData.sourceStr = "client";
                }
                returnData.creatorInfo = newData[0];
                returnData.provinceData = newData[1];
                returnData.cityData = newData[2];
                returnData.districtData = newData[3];
                return returnData;
            })
        }

        return dbconfig.collection_bankInfoLog.find(query).lean().then(data => {
            data.map(item => {
                var each = getAddr(item);
                finalResult.push(each);
            })
            return Q.all(finalResult);
        });
    },

    createBankInfoLog: function (logData) {
        var bankLog = new dbconfig.collection_bankInfoLog(logData);
        bankLog.save().then().catch(err => errorSavingLog(err, logData));
    },

    createPaymentAPILog: function (logData) {
        var apiLog = new dbconfig.collection_paymentAPILog(logData);
        apiLog.save().then().catch(err => errorSavingLog(err, logData));
    },

    createSyncDataLog: function (service, functionName, data) {
        var logData = {
            service: service,
            functionName: functionName,
            data: data
        };
        var syncLog = new dbconfig.collection_syncDataLog(logData);
        syncLog.save().then().catch(err => errorSavingLog(err, logData));
    },

};

function errorSavingLog(error, data) {
    errorUtils.reportError(error);

    // If we don't have long stack traces enabled, this is an alternative which can at least show us which function the
    // error was reported from.
    // Although it only works if we call it from within the function, not pass it.
    //   promise.catch(err => errorSavingLog(err))   // works
    //   promise.catch(errorSavingLog)               // does not work
    //console.error("instigated from " + Error().stack);

    console.error("with data:", errorUtils.stringifyIfPossible(data));
}

var proto = dbLoggerFunc.prototype;
proto = Object.assign(proto, dbLogger);

// This make WebStorm navigation work
module.exports = dbLogger;