let dbConfig = require('./../modules/dbproperties');
let constServerCode = require('./../const/constServerCode');
let errorUtils = require("./../modules/errorUtils");
let dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
const constSystemParam = require("../const/constSystemParam.js");

let dbApiLog = {
    createApiLog: function (conn, wsFunc, actionResult) {
        let playerObjId, actionName, ipAddress;
        if (['login','create'].includes(wsFunc.name) &&  wsFunc._service.name === 'player') {
            playerObjId = actionResult._id;
        } else {
            playerObjId = conn.playerObjId;
        }

        if (["create", "update", "add", "delete", "get", "search"].includes(wsFunc.name)) {
            actionName = wsFunc._service.name + " - " + wsFunc.name;
        } else {
            actionName = wsFunc.name;
        }

        ipAddress = conn.upgradeReq.connection["remoteAddress"] || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            ipAddress = forwardedIp[0].trim();
        }

        let logData = {
            player: playerObjId,
            action: actionName,
            operationTime: new Date(),
            ipAddress: ipAddress
        };

        let apiLog = new dbConfig.collection_apiLog(logData);
        apiLog.save().then().catch(errorUtils.reportError);
        console.log('apiLog', apiLog);
    },

    getPlayerApiLog: function (playerObjId, startDate, endDate, action, index, limit, sortCol) {
        index = index || 0;
        let count = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {operationTime: -1};

        let query = {
            player: playerObjId,
            operationTime: {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            }
        };
        if (action) {
            query.action = action;
        }

        let a = dbConfig.collection_apiLog.find(query).count();
        let b = dbConfig.collection_apiLog.find(query).sort(sortCol).skip(index).limit(count).lean();
        return Promise.all([a, b]).then(data => {
            return({total: data[0], data: data[1]});
        });
    }
};

module.exports = dbApiLog;