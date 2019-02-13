let dbConfig = require('./../modules/dbproperties');
let constServerCode = require('./../const/constServerCode');
let errorUtils = require("./../modules/errorUtils");
let dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
const constSystemParam = require("../const/constSystemParam.js");
const uaParser = require('ua-parser-js');
const dbUtility = require('./../modules/dbutility');
const mobileDetect = require('mobile-detect');

let dbApiLog = {
    createApiLog: function (conn, wsFunc, actionResult, reqData, playerData) {
        let playerObjId, actionName, ipAddress, platform;
        let geoIpProm = Promise.resolve();
        let actionToLog = [
            "player - create",
            "login",
            "createPlayerPartner",
            "loginPlayerPartner",
            "updatePaymentInfo",
            "updatePlayerPartnerPaymentInfo",
            "updatePassword",
            "updatePasswordPlayerPartner",
            "updateSmsSetting",
            "player - update",
            "updatePhotoUrl",
            "getLoginURL",
            "modifyGamePassword",
            "topUpIntention - add",
            "topUpIntention - update",
            "requestConsumeRebate",
            "createFirstTopUpRewardProposal",
            "applyProviderReward",
            "applyRewardEvent",
            "submitDXCode"
        ];

        if (wsFunc.name == 'submitDXCode' && playerData && playerData._id && playerData.platform) {
            playerObjId = playerData._id;
            platform = playerData.platform;
        } else {
            if (['login', 'create'].includes(wsFunc.name) && wsFunc._service.name === 'player') {
                playerObjId = actionResult._id;
                platform = actionResult.platform;
            } else {
                playerObjId = conn.playerObjId;
            }
        }

        if (["create", "update", "add", "delete", "get", "search"].includes(wsFunc.name)) {
            actionName = wsFunc._service.name + " - " + wsFunc.name;
        } else {
            actionName = wsFunc.name;
        }

        if (!actionToLog.includes(actionName)) {
            // do not log if the action is not in the list
            return;
        }

        ipAddress = conn.upgradeReq.connection["remoteAddress"] || '';
        let forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                ipAddress = forwardedIp[0].trim();
            }
        }

        let logData = {
            platform: platform,
            player: playerObjId,
            action: actionName,
            operationTime: new Date(),
            ipAddress: ipAddress
        };
        logData.inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);

        var uaString = conn.upgradeReq.headers['user-agent'];
        var ua = uaParser(uaString);
        var md = new mobileDetect(uaString);
        logData.userAgent = [{
            browser: ua.browser.name || '',
            device: ua.device.name || (md && md.mobile()) ? md.mobile() : 'PC',
            os: ua.os.name || ''
        }];

        if(reqData && reqData.clientDomain){
            logData.domain = reqData.clientDomain;
        }

        if(ipAddress && ipAddress != "undefined"){
            var ipData = dbUtility.getIpLocationByIPIPDotNet(ipAddress);

            if(ipData){
                logData.ipArea = ipData;
            }else{
                logData.ipArea = {'province':'', 'city':''};
            }
        }

        if (playerObjId) {
            let apiLog = new dbConfig.collection_apiLog(logData);
            apiLog.save().then().catch(errorUtils.reportError);
            if (actionName === "login" || actionName === "player - create" || actionName === "submitDXCode") {
                let actionLog = new dbConfig.collection_actionLog(logData);
                actionLog.save().then().catch(errorUtils.reportError);
            }

            return Promise.resolve();
        }
        else {
            console.error('There are item that should be logged but playerObjId not found.');
            console.error('actionName', actionName);
            console.error('actionResult',JSON.stringify(actionResult, null, 2));
            return Promise.reject({message: "There are item that should be logged but playerObjId not found."});
        }
    },

    createProviderLoginActionLog: function (platform, playerObjId, providerId, ipAddress, domain, userAgent, inputDevice, gameObjId) {
        let geoIpProm = Promise.resolve();

        let logData = {
            platform: platform,
            player: playerObjId,
            action: "login",
            operationTime: new Date(),
            providerId: providerId,
            ipAddress: ipAddress,
            userAgent: userAgent,
            domain: domain,
            inputDevice: inputDevice
        };

        if(ipAddress && ipAddress != "undefined"){
            var ipData = dbUtility.getIpLocationByIPIPDotNet(ipAddress);

            if(ipData){
                logData.ipArea = ipData;
            }else{
                logData.ipArea = {'province':'', 'city':''};
            }
        }

        if (gameObjId) {
            logData.gameObjId = gameObjId;
        }

        if (playerObjId) {
            let actionLog = new dbConfig.collection_actionLog(logData);
            actionLog.save().then().catch(errorUtils.reportError);

            return Promise.resolve();
        }
        else {
            console.error('There are item that should be logged but playerObjId not found.');
            console.error('actionName', actionName);
            console.error('actionResult',JSON.stringify(actionResult, null, 2));
            return Promise.reject({message: "There are item that should be logged but playerObjId not found."});
        }
    },

    getPlayerApiLog: function (playerObjId, startDate, endDate, ipAddress, action, index, limit, sortCol) {
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

        if(action) {
            query.action = action;
        }

        let a = dbConfig.collection_apiLog.find(query).count();
        let b = dbConfig.collection_apiLog.find(query).sort(sortCol).skip(index).limit(count).lean();
        return Promise.all([a, b]).then(data => {
            return({total: data[0], data: data[1]});
        });
    },

    getPlayerActionLog: function (platform, playerObjId, playerName, startDate, endDate, ipAddress, action, index, limit, sortCol) {
        index = index || 0;
        let count = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {operationTime: -1};

        let query = {
            platform: platform,
            operationTime: {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            }
        };
        let playerProm = Promise.resolve();

        if(playerObjId){
            query.player = playerObjId;
        }

        if (action) {
            if(action == "main site") {
                query.providerId = {$exists: false};
            }else{
                query.providerId = action;
            }
        }

        if(ipAddress){
            query.ipAddress = ipAddress;
        }

        if(playerName){
            playerProm = dbConfig.collection_players.findOne({name: playerName});
        }

        return Promise.all([playerProm]).then(
            playerDetail => {
                if(playerDetail[0] && playerDetail[0]._id){
                    query.player = playerDetail[0]._id;
                }

                let a = dbConfig.collection_actionLog.find(query).count();
                let b = dbConfig.collection_actionLog.find(query).populate({
                    path: "player",
                    model: dbConfig.collection_players
                }).populate({
                    path: "providerId",
                    model: dbConfig.collection_gameProvider
                }).sort(sortCol).skip(index).limit(count).lean();
                return Promise.all([a, b]).then(data => {
                    return({total: data[0], data: data[1]});
                });
            }
        )
    },

    getPartnerApiLog: function (partnerObjId, startDate, endDate, index, limit, sortCol) {
        index = index || 0;
        let count = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);
        sortCol = sortCol || {loginTime: -1};
        
        let query = {
            partner: partnerObjId,
            loginTime: {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            }
        };

        let a = dbConfig.collection_partnerLoginRecord.find(query).count();
        let b = dbConfig.collection_partnerLoginRecord.find(query).sort(sortCol).skip(index).limit(count).lean();
        return Promise.all([a, b]).then(data => {
            return {total: data[0], data: data[1]};
        });
    }
};

module.exports = dbApiLog;