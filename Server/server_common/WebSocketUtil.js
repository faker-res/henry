'use strict';

var Q = require("q");
var constServerCode = require("../const/constServerCode");
var errorUtils = require("../modules/errorUtils.js");
const serverInstance = require("../modules/serverInstance");
const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const localization = require("../modules/localization").localization;
const lang = require("../modules/localization").lang;
const mongoose = require('mongoose');
let dbApiLog = require("../db_modules/dbApiLog");
const dbconfig = require('./../modules/dbproperties');
const constSystemParam = require('./../const/constSystemParam');

var WebSocketUtility = {

    /**
     * performAction is a common function that calls responsePromise, but also handles errors for you.
     *
     * Provided you do not need to 'then' the promise, then it is preferable to use:
     *
     *     WebSocketUtil.performAction(...);
     *
     * instead of the old pattern:
     *
     *     WebSocketUtil.responsePromise(...).catch(WebSocketUtil.errorHandler);
     *
     * Why?  Because, if an error occurs, performAction has the context data to log the action and arguments that led to the error.
     *
     * If you *do* need to 'then' the promise, then you will need to use WebSocketUtil.responsePromise().
     */
    performAction: async function (conn, wsFunc, reqData, dbCall, args, isValidData, customResultHandler, customErrorHandler, noAuth, limitCall = false) {
        let startTime = new Date().getTime();
        let currentSecond = new Date().getSeconds();

        if (!conn.currentSecond || currentSecond !== conn.currentSecond) {
            conn.currentSecond = currentSecond;
            conn.thisSecondAPICall = 0;
        } else {
            conn.thisSecondAPICall++;
        }

        if (!limitCall || conn.thisSecondAPICall < constSystemParam.MAX_API_CALL_PER_SEC) {
            await WebSocketUtility.responsePromise(
                conn, wsFunc, reqData, dbCall, args, isValidData, customResultHandler, customErrorHandler, noAuth, startTime
            ).catch(
                function (error) {
                    // Do not log authentication failures or invalid requests.
                    // The client should have enough information to solve those.
                    if (error === false || error === localization.translate("INVALID_DATA", conn.lang) || error.status, conn.platformId) {
                        return;
                    }
                    // Log the error in detail, so a developer can reproduce it and resolve it.
                    if( wsFunc && wsFunc.name != "authenticate" ){
                        console.error("Error while performing action '" + (wsFunc && wsFunc.name) + "' with args:", errorUtils.stringifyIfPossible(args));
                        WebSocketUtility.errorHandler(error);
                    }
                }
            );
        }
    },

    /**
     * Common function to emit socket event after db operation without check user's role permissions
     *
     * Only call this directly if you need to 'then' the promise.
     *
     * If you do not need to 'then' the promise, then use WebSocketUtil.performAction().  See its docs for why.
     *
     * If you *do* need to 'then' the promise, then you should report errors something like this:
     *
     *     WebSocketUtil.responsePromise(...).then(
     *         function (result) {
     *             // work
     *         }
     *     ).catch(
     *         function (error) {
     *             console.error("Error while processing action '" + wsFunc + "' with data:", data);
     *             WebSocketUtil.errorHandler(error);
     *         }
     *     );
     *
     * @param {WebSocketServer} conn - The connection
     * @param {function} dbCall - Function for db operation
     * @param {json} reqData - request data sent from client
     * @param {array} args - array for dbCall function arguments
     * @param {WebSocketFunction} wsFunc - websocket function used to respond
     * @param {Boolean} isValidData - flag for data validation
     * @param {Boolean} customResultHandler - if handle error status after promise
     * @param {Boolean} customErrorHandler - if handle result status after promise
     * @param {Boolean} noAuth - no need auth check
     * @param {number} callTime - the time when this is called
     */
    responsePromise: function (conn, wsFunc, reqData, dbCall, args, isValidData, customResultHandler, customErrorHandler, noAuth, callTime = new Date().getTime()) {

        //todo::need to update expacts data properly for each service function first then enable the check below
        // if (wsFunc && wsFunc.expectsData) {
        //     var checkResults = WebSocketUtility.checkExpectedData(reqData, wsFunc.expectsData, $translate, `expectsData of wsFunc '${wsFunc.name}'`);
        //     if (!checkResults.passed) {
        //         //WebSocketUtility.invalidDataResponse(conn, wsFunc, reqData, checkResults.reason);
        //         //return Q.reject(localization.translate("INVALID_DATA", conn.lang));
        //         //put the parameter check result into log for now
        //         console.error(checkResults.reason);
        //     }
        // }

        let $translate = text => localization.translate(text, conn.lang, conn.platformId);
        let isValid = typeof isValidData === "undefined" ? true : isValidData;

        if (!noAuth && conn && !conn.isAuth) {
            let errorCode = constServerCode.INVALID_API_USER;

            // Hard code return message
            let returnMsg = "Authentication Fails";

            wsFunc.response(conn, {
                status: errorCode,
                errorMessage: $translate(returnMsg),
                data: serverInstance.getServerType() === "dataMigration" ? reqData : null
            }, reqData);

            return Promise.reject(false);
        }

        if (conn && wsFunc && dbCall && args && isValid) {
            return dbCall.apply(null, args).then(
                result => {
                    // Log this call
                    let apiToLog = [
                        'login','create', 'createGuestPlayer', 'playerLoginOrRegisterWithSMS',
                        'registerByPhoneNumberAndPassword', 'loginByPhoneNumberAndPassword'
                    ];

                    if (
                        (apiToLog.includes(wsFunc.name) && wsFunc._service.name === 'player')
                        || conn.playerId && wsFunc.name !== 'getCredit'
                    ) {
                        dbApiLog.createApiLog(conn, wsFunc, result, reqData);
                    }

                    // Benchmark time needed for this call
                    let totalSecond = (new Date().getTime() - callTime) / 1000;
                    if (totalSecond > 1) {
                        let serviceName = wsFunc && wsFunc._service && wsFunc._service.name;
                        let functionName = wsFunc && wsFunc.name;

                        dbconfig.collection_apiResponseLog({
                            serviceName: serviceName,
                            functionName: functionName,
                            totalSecond: totalSecond
                        }).save().catch(errorUtils.reportError);

                        console.log("Slow response time from service " + serviceName + ", function " + String(functionName) + ": " + totalSecond + " sec");
                    }

                    //send result as response
                    if (!customResultHandler) {
                        let resObj = {status: constServerCode.SUCCESS, data: result};
                        //for cp api response
                        if (serverInstance.getServerType() === constMessageClientTypes.PROVIDER && result && result.code) {
                            resObj.code = result.code;
                        }
                        wsFunc.response(conn, resObj, reqData);
                        return Promise.resolve(true);
                    }
                    else {
                        return Promise.resolve(result);
                    }
                },
                err => {
                    if (!customErrorHandler) {
                        if (err && err.status) {
                            if (err.errorMessage || err.message) {
                                let msg = err.errorMessage || err.message;
                                err.errorMessage = $translate(msg);
                            }
                            wsFunc.response(conn, err, reqData);
                        }
                        else {
                            let errorCode = err && err.code || constServerCode.COMMON_ERROR;
                            let resObj = {
                                status: errorCode,
                                errorMessage: $translate(err.message || err.errorMessage),
                                data: serverInstance.getServerType() === "dataMigration" ? reqData : null,
                            };
                            resObj.errorMessage = err.errMessage || resObj.errorMessage;
                            wsFunc.response(conn, resObj, reqData);
                        }
                    }
                    return Promise.reject(err);
                }
            );
        }
        else {
            WebSocketUtility.invalidDataResponse(conn, wsFunc, reqData);
            return Promise.reject($translate("INVALID_DATA"));
        }


    },

    /*
     * Common function to send invalid data error to client
     * @param {Object} conn - The websocket connection
     * @param {function} wsFunc - The websocket callback function
     * @param {Object} [reqData] - The request data.  On the data migration server, this will be passed to the client.
     * @param {String} [reason] - A detailed explanation of the failure.  Should be translated already.
     */
    invalidDataResponse: function (conn, wsFunc, reqData, reason) {
        wsFunc.response(conn, {
            status: constServerCode.INVALID_PARAM,
            errorMessage: reason || localization.translate("Invalid Data", conn.lang, conn.platformId),
            data: serverInstance.getServerType() == "dataMigration" ? reqData : null
        }, reqData);
    },

    /*
     * Common function for error handling
     * @param {Object} error - The error object
     */
    errorHandler: function (error) {
        // Do not log authentication failures (false) or invalid requests ("INVALID_DATA").
        // They would clutter up our logs, and the client should be given enough information to solve them themself.
        if (error === false || error === "INVALID_DATA" || error === localization.translate("INVALID_DATA", lang.ch_SP)) {
            return;
        }
        errorUtils.reportError(error);
    },

    checkExpectedData: function (reqData, paramsAndTypes, $translate, context) {
        const validatorsByType = {
            // This is the default if the parameter is specified but no type is provided (no ':')
            // We could say that this parameter is "present" or "provided" or "defined" or "not forgotten"
            '*': val => val !== undefined,

            // Currently I am using '?' to indicate that I don't know what type this parameter is, so I would like
            // someone else to fill it out!  It acts just like '*'.
            '?': val => val !== undefined,

            // These are currently unused, but could be introduced if needed:
            // 'exists':    val => val !== undefined && val !== null,
            // '+':         val => Boolean(val),

            'String?': val => typeof val === 'string',
            'String': val => typeof val === 'string' && val.length > 0,

            'Number': val => typeof val === 'number',
            'Number+': val => typeof val === 'number' && val > 0,

            'Boolean': val => typeof val === 'boolean',

            'Array': val => val && Array.isArray(val),
            '[]': val => val && Array.isArray(val),
            '[]+': val => val && Array.isArray(val) && val.length > 0,

            'Object': val => (typeof val === 'object') && val !== null,
            '{}': val => (typeof val === 'object') && val !== null,

            'ObjectId': val => mongoose.Types.ObjectId.isValid(val),

            'Date': val => (val instanceof Date) || (typeof val === 'number' && val >= 0) || (typeof val === 'string' && !isNaN(new Date(val).getTime())),
        };

        const requirementByType = {
            '*': "should be provided",
            '?': "should be provided",
            //'exists': "should be provided and not null",
            //'+': "should be truthy",
            'String?': "string",
            'String': "non-empty string",
            '[]': "array",
            '[]+': "non-empty array",
            '{}': "object",
        };

        const validationFailures = [];

        paramsAndTypes.split(',').forEach(paramAndTypeSpec => {
            const typeSpecSplit = paramAndTypeSpec.split(':');

            let paramName = typeSpecSplit[0].trim();
            const typeSpec = typeSpecSplit[1] ? typeSpecSplit[1].trim() : '*';

            if (paramName === '') {
                return;   // There were no conditions for this param (or there were no params specified at all)
            }

            if (paramName.slice(0, 1) === '[' && paramName.slice(-1) === ']') {
                // This param is optional
                paramName = paramName.slice(1, -1);
                if (reqData[paramName] === undefined) {
                    return;   // Param was not set, so condition is met
                }
            }

            //console.log(`Checking paramName '${paramName}' against paramTypeSpec '${typeSpec}'`);
            const val = reqData[paramName];

            // Some type specs are made of multiple types
            const validTypes = typeSpec.split('|').map(type => type.trim());

            const conditionIsMet = validTypes.some(paramType => {
                const validator = validatorsByType[paramType];
                if (!validator) {
                    // This is a developer error.
                    // During development we probably want to pass it to the caller, so it can be seen and fixed:
                    //throw Error(`Unrecognised type '${paramType}' in ${context}.`);
                    // But during production we may prefer to let the value pass, and just log a warning:
                    console.warn(`Unrecognised type '${paramType}' in ${context}.`);
                    return true;
                }
                return validator(val);
            });

            if (!conditionIsMet) {
                const customRequirementDescription = requirementByType[typeSpec];
                const requirementDescription = customRequirementDescription
                    ? $translate(customRequirementDescription)
                    : $translate("should be a") + ' ' + typeSpec;

                validationFailures.push(`'${paramName}' ${requirementDescription}`);
                //validationFailures.push(`'${paramName}' ${requirementDescription} ${$translate("but it was")}: ${JSON.stringify(val)}`);
            }
        });

        return (validationFailures.length > 0)
            ? {passed: false, reason: $translate("Invalid request") + ": " + validationFailures.join(', ')}
            : {passed: true};
    },

    /*
     * Web socket provider api wrapper function
     */
    performProviderAction: function (conn, wsFunc, reqData, dbCall, args, isValidData, data) {
        WebSocketUtility.responsePromise(conn, wsFunc, reqData, dbCall, args, isValidData, true, true).then(
            res => {
                if (res) {
                    var resObj = {status: constServerCode.SUCCESS, data: res};
                    if (res.providerId) {
                        resObj.providerId = res.providerId;
                    }
                    // if (res.gameId) {
                    //     resObj.gameId = res.gameId;
                    // }
                    if (res.gameTypeId) {
                        resObj.gameTypeId = res.gameTypeId;
                    }
                    resObj.errorMsg = "";
                    wsFunc.response(conn, resObj, reqData);
                }
                else {
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_DATA,
                        errorMessage: localization.translate("Invalid Data", conn.lang, conn.platformId),
                        errorMsg: localization.translate("Invalid Data", conn.lang, conn.platformId),
                        code: data.code
                    }, reqData);
                }
            },
            err => {
                return wsFunc.response(conn, {
                    status: constServerCode.COMMON_ERROR,
                    errorMessage: localization.translate(err.message, conn.lang, conn.platformId),
                    errorMsg: localization.translate(err.message, conn.lang, conn.platformId),
                    code: data.code
                }, reqData);
            }
        ).catch(WebSocketUtility.errorHandler);
    },

    notifyEBETLuZhuClient: function (service, functionName, data, clientAPIServerNo) {
        if (service._wss && service._wss._wss && service._wss._wss.clients) {
            var wss = service._wss._wss;
            if (clientAPIServerNo && clientAPIServerNo == global.clientAPIServerNo) { // production have 4 clientAPIServer instances, this checking to prevent duplicate data send to websocket
                wss.clients.forEach(
                    client => {
                        if (service[functionName] && client.EBETNotify == true) {
                            service[functionName].response(client, {status: 200, data: data});
                        }
                    }
                );
            }
        }
    },

    /*
     * Send notification message to message client
     * @param {Object} service
     * @param {String} functionName
     * @param {Object} data
     */
    notifyMessageClient: function (service, functionName, data) {
        if (service._wss && service._wss._wss && service._wss._wss.clients) {
            var wss = service._wss._wss;
            wss.clients.forEach(
                client => {
                    if (client && ((client.playerId && String(client.playerId) == String(data.playerId)) ||
                        (client.playerId && String(client.playerId) == String(data.recipientId)) ||
                        (client.playerObjId && String(client.playerObjId) == String(data.playerId)) ||
                        (client.playerObjId && String(client.playerObjId) == String(data.recipientId)))
                    ) {
                        if (service[functionName]) {
                            service[functionName].response(client, {status: 200, data: data});
                        }
                    }
                }
            );
        }
    },

    notifyMessagePartner: function (service, functionName, data) {
        if (service._wss && service._wss._wss && service._wss._wss.clients) {
            var wss = service._wss._wss;
            wss.clients.forEach(
                client => {
                    if (client && ((client.partnerId && String(client.partnerId) == String(data.partnerId)) ||
                        (client.partnerId && String(client.partnerId) == String(data.recipientId)) ||
                        (client.partnerObjId && String(client.partnerObjId) == String(data.partnerId)) ||
                        (client.partnerObjId && String(client.partnerObjId) == String(data.recipientId)))
                    ) {
                        if (service[functionName]) {
                            service[functionName].response(client, {status: 200, data: data});
                        }
                    }
                }
            );
        }
    }

};

module.exports = WebSocketUtility;
