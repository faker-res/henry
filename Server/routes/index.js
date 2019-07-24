var jwt = require('jsonwebtoken');
var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');

var encrypt = require('./../modules/encrypt');
var dbConfig = require('./../modules/dbproperties');
var dbAdminInfo = require('./../db_modules/dbAdminInfo');
var dbLargeWithdrawal = require('./../db_modules/dbLargeWithdrawal');
var env = require('./../config/env');
var jwtSecret = env.config().socketSecret;
var memCache = require('memory-cache');

var dblog = require('./../modules/dbLogger');
var constSystemLogLevel = require('../const/constSystemLogLevel');
var errorUtils = require("../modules/errorUtils.js");

var env = require("../config/env").config();
var emailer = require('../modules/emailer');
var rsaCrypto = require("../modules/rsaCrypto");

/* GET home page. */
router.get('/', function (req, res, next) {
    //res.render('index', {title: 'Express'});
    res.send('ok');
});

router.post('/login', function (req, res, next) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, error: {name: "DataError", message: "Incorrect login data: username and password are required"}});
        return;
    }

    var username = req.body.username.toLowerCase();
    var userpassword = req.body.password;
    var localIp = req.body.localIp;
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
                            localIp: localIp
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

router.post('/requestPasswordReset', function (req, res, next) {
    var email = req.body.email;

    if (!email) {
        res.json({success: false, error: {name: "DataError", message: "Missing parameter: email"}});
        return;
    }

    // We could do a case-insensitive search, but it is less efficient and cannot use the index.
    // Also this is not entirely secure, because we have not escaped the RegExp!  Someone could supply {email: 'bill.*gates@.*'}
    //var query = {email: {$regex: new RegExp('^' + email.toLowerCase() + '$', 'i')}};

    // A better solution is just to store emails in lower-case in the DB
    var query = {email: email.toLowerCase()};

    dbAdminInfo.getFullAdminInfo(query).then(
        function (doc) {
            if (!doc) {
                res.json({success: false, error: {name: "DataError", message: "No account found with that email address"}});
                return;
            }

            function generateRandomToken () {
                var dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                var token = '';
                for (var i = 0; i < 32; i++) {
                    var j = Math.random() * dict.length;
                    j = (j + Date.now()) % dict.length;
                    token += dict.charAt(j);
                }
                return token;
            }

            var newToken = generateRandomToken();
            var tokenExpiryDate = new Date(Date.now() + 1000 * 60 * 60 * 3);   // 3 hours
            return dbAdminInfo.updateAdminInfo(query, {$set: {resetToken: newToken, resetTokenExpiry: tokenExpiryDate}}).then(
                function () {
                    // @todo Get the target host from env.js instead of guessing
                    // @todo Use https instead of http!
                    //var host = env.messageServerUrl.replace(/.*:\/\/(.*):.*/, '$1');
                    // req.header('Host') returns: 'localhost:9000'
                    var host = req.header('Host').replace(/:.*/, '');
                    var serverRoot = 'http://' + host + ':3000/';

                    var resetURL = serverRoot + 'login#?resetPasswordToken=' + encodeURIComponent(newToken);

                    var contentHTML = `
                        <p>You can reset your password by clicking on the link below:</p>
                        <p><a href="${resetURL}">${resetURL}</a></p>
                        <p>If you did not request a password reset, you may delete this email.</p>
                    `;

                    return emailer.sendEmail({
                        sender: 'NinjaPandaManagement Support <support@ninjapandamanagement.com>',
                        recipient: email,
                        subject: "Reset your password",
                        body: contentHTML,
                        isHTML: true
                    });
                }
            );
        }
    ).then(
        function (emailerInfo) {
            res.json({success: true, message: `An email has been sent to ${email}.  Please check your inbox or your spam folder.`});
        }
    ).catch(
        function (err) {
            errorUtils.reportError(err);
            res.json({success: false, error: {name: "UnexpectedError", message: String(err)}});
        }
    );
});

router.post('/resetPassword', function (req, res, next) {
    var resetPasswordToken = req.body.resetPasswordToken;

    if (!resetPasswordToken) {
        res.json({success: false, error: {name: "DataError", message: "Missing parameter: resetPasswordToken"}});
        return;
    }

    var query = {resetToken: resetPasswordToken};

    dbAdminInfo.getFullAdminInfo(query).then(
        function (doc) {
            if (!doc) {
                res.json({success: false, error: {name: "DataError", message: "No such token exists"}});
                return;
            }

            if (doc && Date.now() > doc.resetTokenExpiry.getTime()) {
                res.json({success: false, error: {name: "DataError", message: "Token has expired.  Please request another email."}});
                return;
            }

            // We will generate a new random password for the admin.
            // The admin can use it to log in.
            // They will then be prompted to set their new password.

            // This is similar to generateRandomPassword in Client/public/js/controller.js
            function generateRandomPassword () {
                // We exclude commonly confused characters: 1 I l 0 O
                var numbers = "23456789";
                var symbols = "#$%@*^&!~:;?/\\[]{}";
                var dict = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" + numbers + symbols;
                var pass = '';
                for (var i = 0; i < 16; i++) {
                    var j = Math.random() * dict.length;
                    j = (j + Date.now()) % dict.length;
                    var c = dict.charAt(j);
                    pass = pass + c;
                }
                return pass;
            }

            var temporaryPassword = generateRandomPassword();

            // This code is based on code in socketActionAdmin.js functions createAdmin() updateAdmin()
            var salt = encrypt.generateSalt();
            var hashpassword = encrypt.createHash(temporaryPassword, salt);
            var updateData = {
                $set: {
                    password: hashpassword,
                    salt: salt,
                    lastPasswordUpdateTime: 0,   /* 1970, to force them to reset their password when they log in */
                    failedLoginAttempts: 0,
                },
                $unset: {resetToken: 1, resetTokenExpiry: 1}
            };

            return dbAdminInfo.updateAdminInfo(query, updateData).then(
                function () {
                    // NOTE: This is only secure if the socket is SSL encrypted.  The socket should be encrypted anyway for login.
                    res.json({success: true, username: doc.adminName, password: temporaryPassword, message: "Password reset, you may now log in."});
                }
            );
        }
    ).catch(
        function (err) {
            errorUtils.reportError(err);
            res.json({success: false, error: {name: "UnexpectedError", message: String(err)}});
        }
    );
});

router.post('/getPlayerInfoByPhoneNumber', function (req, res, next) {
    let phoneNumber = req.body.phoneNumber;
    let platformId = (req.body.platformId) ? JSON.parse(req.body.platformId) : null;

    if (!phoneNumber || !platformId) {
        res.json({success: false, error: {name: "DataError", message: "Missing parameter: phoneNumber or platformId"}});
        return;
    }

    dbConfig.collection_platform.find({platformId: {$in:platformId}}, {_id:true}).lean().then(
        function (doc) {
            if (doc.length == 0) {
                res.json({success: false, error: {name: "DataError", message: "No such platform"}});
                return;
            }
            var docIds = [];
            doc.forEach(function(obj){
                docIds.push(obj._id);
            })
            let encryptPhoneNumber = phoneNumber;
            let enOldPhoneNumber = phoneNumber;
            try {
                encryptPhoneNumber = rsaCrypto.encrypt(phoneNumber);
                enOldPhoneNumber = rsaCrypto.oldEncrypt(phoneNumber);
            }
            catch (error) {
                console.log(error);
            }
            return dbConfig.collection_players.find({platform: {$in:docIds}, phoneNumber: {$in: [encryptPhoneNumber, enOldPhoneNumber, phoneNumber]}}).then(
                function (playerData) {
                    if( playerData && playerData.length > 0){
                        let resData = playerData.map(
                            player => {
                                return {loginname: player.name, phone: player.phoneNumber, createTime: player.registrationTime};
                            }
                        );
                        res.json({success: true, data: resData});
                    }
                    else{
                        res.json({success: false, error: {name: "InvalidData", message: "Can not find player data"}});
                    }
                }
            );
        }
    ).catch(
        function (err) {
            errorUtils.reportError(err);
            res.json({success: false, error: {name: "UnexpectedError", message: String(err)}});
        }
    );
});

router.get('/auditLargeWithdrawalProposal', function (req, res, next) {
    // hash = "largeWithdrawal" + propopsalId + adminObjId + "approve"/"reject"

    let proposalId = req.query.proposalId;
    let adminObjId = req.query.adminObjId;
    let decision = req.query.decision;
    let hash = req.query.hash;

    if (decision != "approve" && decision != "reject" || !hash) {
        res.send({success: false});
        return;
    }

    let hashedContent = "largeWithdrawalSnsoft" + proposalId + adminObjId + decision;
    console.log(`email large withdrawal ${decision} ${proposalId} received`);

    bcrypt.compare(hashedContent, hash, function (err, isMatch) {
        if (err) {
            res.send({success: false});
        } else if (isMatch) {
            // what happened when success
            dbLargeWithdrawal.largeWithdrawalAudit(proposalId, adminObjId, decision, true).then(
                data => {
                    res.send({success: true, data});
                    console.log(`email large withdrawal ${decision} ${proposalId} succeeded`);
                },
                error => {
                    res.send({success: false, error});
                    console.log(`email large withdrawal ${decision} ${proposalId} failed`, JSON.stringify(error));
                }
            );
        } else {
            console.log('auditLargeWithdrawalProposal hash matching failed, ip:', req.headers['x-forwarded-for'] || req.connection.remoteAddress, "req.query:", req.query);
            res.send({success: false});
        }
    });
});

router.get('/auditPartnerLargeWithdrawalProposal', function (req, res, next) {
    // hash = "largeWithdrawal" + propopsalId + adminObjId + "approve"/"reject"

    let proposalId = req.query.proposalId;
    let adminObjId = req.query.adminObjId;
    let decision = req.query.decision;
    let hash = req.query.hash;

    if (decision != "approve" && decision != "reject" || !hash) {
        res.send({success: false});
        return;
    }

    let hashedContent = "largeWithdrawalSnsoftPartner" + proposalId + adminObjId + decision;
    console.log(`email p large withdrawal ${decision} ${proposalId} received`);

    bcrypt.compare(hashedContent, hash, function (err, isMatch) {
        if (err) {
            res.send({success: false});
        } else if (isMatch) {
            // what happened when success
            dbLargeWithdrawal.largeWithdrawalAudit(proposalId, adminObjId, decision, true, true).then(
                data => {
                    res.send({success: true, data});
                    console.log(`email p large withdrawal ${decision} ${proposalId} succeeded`);
                },
                error => {
                    res.send({success: false, error})
                    console.log(`email p large withdrawal ${decision} ${proposalId} failed`, JSON.stringify(error));
                }
            );
        } else {
            console.log('auditLargeWithdrawalProposal hash matching failed, ip:', req.headers['x-forwarded-for'] || req.connection.remoteAddress, "req.query:", req.query);
            res.send({success: false});
        }
    });
});


module.exports = router;
