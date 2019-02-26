const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const encrypt = require('./../modules/encrypt');
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
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlayerLoginRecord = require('./../db_modules/dbPlayerLoginRecord');

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
    console.log(req);
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

router.post('/countLoginPlayerbyPlatformWeek', function (req, res, next) {
    let startDate = req.body.startDate;
    let endDate = req.body.endDate;
    let platform = req.body.platform;
    dbPlayerLoginRecord.countLoginPlayerbyPlatformWeek(startDate, endDate, platform).then(
        data=>{
            res.json({success:true, data:data});

    })
});

router.post('/countNewPlayerAllPlatform', function (req, res, next) {
    let startDate = new Date(req.body.startDate);
    let endDate = new Date(req.body.endDate);
    let platform = req.body.platform;
    dbPlayerInfo.countDailyNewPlayerByPlatform(platform, startDate, endDate).then(
        data=>{
            res.json({success:true, data:data});
    })
});

module.exports = router;
