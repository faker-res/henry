const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const encrypt = require('./../modules/encrypt');
const rsaCrypto = require('./../modules/rsaCrypto');

const dbAdminInfo = require('./../db_modules/dbAdminInfo');
const env = require('./../config/env');
const jwtSecret = env.config().socketSecret;
const memCache = require('memory-cache');

const dblog = require('./../modules/dbLogger');
const constSystemLogLevel = require('../const/constSystemLogLevel');
const errorUtils = require("../modules/errorUtils.js");
const dbOtherPayment = require('./../db_modules/externalAPI/dbOtherPayment');
const dbconfig = require('./../modules/dbproperties');
const ObjectId = mongoose.Types.ObjectId;
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbPlayerLoginRecord = require('./../db_modules/dbPlayerLoginRecord');
const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
const dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
const dbPlatform = require('./../db_modules/dbPlatform');
const roleChecker = require('../modules/roleChecker');
const dbUtil = require("../modules/dbutility");


function emit(request, response, dbCall, args, event, isValidData) {
    roleChecker.isValid(request, event).then(
        function (isAllowed) {
            //if admin user has the permission for this socket action
            if (isAllowed) {
                if(dbCall && args && isValidData) {
                    return dbCall.apply(null, args).then(data => {
                        console.log(event);
                        console.log("******************************** data",data);
                        response.json({success:true, data:data});
                    });
                }
            } else {
                return response.json({
                    success: false,
                    message: 'Access Denied. No permission to access.'
                });
            }
        }
    ).catch(err => {console.log("-------------------- err",err)});
}

router.post('/fkpNotify', function(req, res, next) {
    let isValidData = req && req.body && req.body.merchantCode && req.body.orderNo && req.body.payOrderNo && Number.isFinite(Number(req.body.amount))
        && req.body.orderStatus;

    if (isValidData) {
        let msgBody = req.body;
        dbOtherPayment.updateFKPTopupProposal(msgBody.orderNo, msgBody.payOrderNo, msgBody.orderStatus).then(
            () => {
                res.send('SUCCESS');
            }
        )
    } else {
        res.send('Invalid data!');
    }
});

router.get('/', function (req, res, next) {
    res.send('ok');
});
router.post('/login', function (req, res, next) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, error: {name: "DataError", message: "Incorrect login data: username and password are required"}});
        return;
    }

    var username = req.body.username.toLowerCase();
    var userpassword = req.body.password;
    if (username && userpassword) {
        dbAdminInfo.getFullAdminInfo({adminName: username}).then(
            function (doc) {
                if (doc && doc.failedLoginAttempts >= 10) {
                    res.json({
                        success: false,
                        error: {name: "AccountLocked", message: "This user account has been locked. Please reset your password, or contact a system administrator."}
                    });
                }
                else if (!doc) {
                    var message = "user name is not correct!";
                    res.json({
                        success: false,
                        error: {name: "InvalidPassword", message: message}
                    });
                }
                else if (!encrypt.validateHash(doc.password, userpassword)) {
                    return dbAdminInfo.updateAdminInfo({adminName: username}, {$inc: {failedLoginAttempts: 1}}, {new: true}).then(
                        function (newDoc) {
                            var message = "Password or user name is not correct!";
                            var remainingLoginAttempts = 10 - newDoc.failedLoginAttempts;
                            if (remainingLoginAttempts <= 3) {
                                var attemptz = remainingLoginAttempts > 1 ? "attempts" : "attempt";
                                message += " (" + remainingLoginAttempts + " " + attemptz + " remaining)";
                            }
                            res.json({
                                success: false,
                                error: {name: "InvalidPassword", message: message}
                            });
                        }
                    );
                }
                else {
                    //find all the admin user's departments roles
                    if (doc && doc.roles) {
                        var profile = {
                            _id: doc._id,
                            adminName: doc.adminName,
                            password: doc.password,
                            //roles: doc.roles
                        };
                        if( doc.departments && doc.departments.length > 0 ){
                            let platformList = [];

                            doc.departments.forEach(
                                department => {
                                    if(department && department.platforms && department.platforms.length > 0){
                                        department.platforms.forEach(
                                            platform => {
                                                if(platform){
                                                    let indexOfPlatform = platformList.findIndex(p => p.toString() == platform.toString());

                                                    if(indexOfPlatform == -1){
                                                        platformList.push(platform);
                                                    }
                                                }
                                            }
                                        );
                                    }
                                });

                            profile.platforms = platformList;
                            if( doc.departments[0].departmentName == "admin" ){
                                profile.platforms = "admin";
                            }
                        }
                        //store admin user's all roles information to cache
                        memCache.put(doc.adminName, doc.roles, 1000 * 60 * 60 * 5);
                        var token = jwt.sign(profile, jwtSecret, {expiresIn: 60 * 60 * 5});
                        res.json({
                            success: true,
                            token: token,
                            _id: doc._id,
                            adminName: doc.adminName,
                            roles: doc.roles,
                            departments: doc.departments.map(dept => ({_id: dept._id})),
                            language: doc.language
                        });
                        var logData = {
                            adminName: doc.adminName,
                            action: "login",
                            level: constSystemLogLevel.ACTION,
                            data:{
                                success: true,
                                _id: doc._id,
                                adminName: doc.adminName,
                                roles: doc.roles,
                                departments: doc.departments.map(dept => ({_id: dept._id})),
                                language: doc.language
                            }
                        };
                        dblog.createSystemLog(logData);
                        return dbAdminInfo.updateAdminInfo({adminName: username}, {$set: {failedLoginAttempts: 0}});
                    }
                    else {
                        res.json({success: false, error: {name: "DBError", message: "Incorrect DB data"}});
                    }
                }
            }
        ).catch(
            function (err) {
                errorUtils.reportError(err);
                res.json({success: false, error: {name: "UnexpectedError", message: String(err)}});
            }
        );
    }
    else {
        res.json({success: false, error: {name: "DataError", message: "Incorrect data"}});
    }
});

router.post('/restartFPMS', function (req, res, next) {
    console.log('restartFPMS');
    let data = req.body;
    let isValidData = Boolean(data && data.privateKey && data.publicKey);

    if (!data || !isValidData) {
        return;
    }

    if (data.privateKey && data.publicKey) {
        rsaCrypto.restartServices();
    }
});

router.post('/updateKeyPair', function (req, res, next) {
    console.log('updateKeyPair');
    let data = req.body;
    let isValidData = Boolean(data && data.privateKey && data.publicKey && data.replPrivateKey && data.replPublicKey);

    if (!data || !isValidData) {
        return;
    }

    if (data.replPrivateKey && data.replPublicKey && data.privateKey && data.publicKey) {
        console.log('data', data);
        dbPlatform.reEncryptPlayerPhoneNumber().then(
            () => {
                console.log('done');
            }
        )
    }
});

//PLATFORM
router.post('/getPlatformByAdminId', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.adminObjId);
    emit(req, res, dbPlatform.getPlatformByAdminId, [data.adminObjId], 'getPlatformByAdminId', isValidData);
});
//DASHBOARD
router.post('/countLoginPlayerAllPlatform', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerLoginRecord.countLoginPlayerbyPlatform, [platform, startTime, endTime, 'day'], 'countLoginPlayerbyPlatform', isValidData);
});
router.post('/countNewPlayerAllPlatform', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerInfo.countDailyNewPlayerByPlatform, [platform, startTime, endTime], 'countNewPlayerAllPlatform', isValidData);
});
router.post('/countPlayerBonusAllPlatform', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerInfo.countDailyPlayerBonusByPlatform, [platform, startTime, endTime], 'countPlayerBonusAllPlatform', isValidData);
});
router.post('/countTopUpAllPlatform', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.platformObjId);
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerInfo.dashboardTopupORConsumptionGraphData, [platform, 'day', 'topup'], 'countTopUpORConsumptionAllPlatform', isValidData);
});
router.post('/countConsumptionAllPlatform', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.platformObjId);
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerInfo.dashboardTopupORConsumptionGraphData, [platform, 'day', 'consumption'], 'countTopUpORConsumptionAllPlatform', isValidData);
});

router.post('/getAllPlatformAvailableProposalsForAdminId', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.adminObjId && data.platformObjId);
    emit(req, res, dbProposal.getAllPlatformAvailableProposalsForAdminId, [data.adminObjId, data.platformObjId], 'getAllPlatformAvailableProposalsForAdminId', isValidData);
});
router.post('/getAllRewardProposal', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.platformObjId);
    emit(req, res, dbProposal.getAllRewardProposal, [data.platformObjId], 'getAllRewardProposal', isValidData);
});

router.post('/countLoginPlayerbyPlatformWeek', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerLoginRecord.countLoginPlayerbyPlatformWeek, [startTime, endTime, platform], 'countLoginPlayerbyPlatformWeek', isValidData);
});
router.post('/getTopUpTotalAmountForAllPlatform', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerTopUpRecord.getTopUpTotalAmountForAllPlatform, [startTime, endTime, platform], 'getTopUpTotalAmountForAllPlatform', isValidData);
});
router.post('/getBonusRequestList', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerInfo.getAllAppliedBonusList, [platform, null, null, startTime, endTime, ['Success','Approved']], 'getBonusRequestList', isValidData);
});
router.post('/getPlayerConsumptionSumForAllPlatform', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerConsumptionRecord.getConsumptionTotalAmountForAllPlatform, [startTime, endTime, platform], 'getPlayerConsumptionSumForAllPlatform', isValidData);
});
router.post('/countNewPlayers', function (req, res, next) {
    let data = req.body;
    let isValidData = Boolean(data && data.startDate && data.endDate && data.platformObjId);
    let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
    let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
    let platform = data.platformObjId ? ObjectId(data.platformObjId) : 'all';
    emit(req, res, dbPlayerInfo.countNewPlayersAllPlatform, [startTime, endTime, platform], 'countNewPlayers', isValidData);
});
//DASHBOARD END

module.exports = router;