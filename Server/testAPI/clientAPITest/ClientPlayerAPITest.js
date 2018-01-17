(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    const testPlayerLoginData = {
        name: "testclientplayer",
        password: "123456",
        lastLoginIp: "192.168.3.22"
    };

    var ClientPlayerAPITest = function (playerService) {
        this.playerService = playerService;
        if (!isNode) {
            // comment out this part for now because it will overrite the loggined user
            // In the browser, do an immediate login with the testPlayerName, in order to get a value for testPlayerId
            // if( !window.testPlayer ){
            //     this.login(function (data) {
            //         var testPlayer = data.data;
            //         if (testPlayer) {
            //             window.testPlayer = testPlayer;
            //             window.testPlayerId = testPlayer.playerId;
            //             window.testPlayerObjId = testPlayer._id;
            //             window.testPlatformId = testPlayer.platform;
            //         } else {
            //             console.warn("Failed to log in testPlayer:", testPlayerLoginData);
            //         }
            //     });
            // }
        }
    };
    var proto = ClientPlayerAPITest.prototype;
    var platformId = null;
    var smsCode = null;
    if (isNode) {

        var dbPlatform = require('./../../db_modules/dbPlatform');

        var Q = require('q');

        proto.initGetPlatform = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlatform.getPlatform({
                    name: "testClientPlatform"  // get Platform
                }
            ).then(
                function (data) {
                    platformId = data.platformId;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };

    }


    var date = new Date().getTime();
    var testPlayerObjId = !isNode && window.testPlayerObjId;
    var testPlayerId = !isNode && window.testPlayerId;

    var newTestPlayerObjId = null;
    var newTestPlayerId = null;

    proto.getSMSCode = function (callback, requestData) {
        var data = requestData || {
                phoneNumber: 97787654
            };
        this.playerService.getSMSCode.request(data);
        this.playerService.getSMSCode.once(function (data) {
            smsCode=data.data;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.sendSMSCodeToPlayer = function (callback, requestData) {
        var data = requestData || {
                phoneNumber: 97787654
            };
        this.playerService.sendSMSCodeToPlayer.request(data);
        this.playerService.sendSMSCodeToPlayer.once(function (data) {
            smsCode=data.data;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.verifyPhoneNumberBySMSCode = function (callback, requestData) {
        var data = requestData || {
            smsCode: '123456'
        };
        this.playerService.verifyPhoneNumberBySMSCode.request(data);
        this.playerService.verifyPhoneNumberBySMSCode.once(function (data) {
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.create = function (callback, requestData) {
        date = new Date().getTime();
        //console.log("data:platformId.....", platformId);
        var thisObj = this;
        var data = requestData ||
            {
                "name": "testPlayer" + date,
                "realName": "testPlayerRealName",
                "password": "123456",
                "platformId": platformId,
                "phoneNumber": "97787654",
                "email": "testPlayer123@gmail.com",
                smsCode: smsCode,
                isTestPlayer: true,
                requestId: "testRequestId123"
            };

        thisObj.playerService.create.request(data);
        thisObj.playerService.create.once(function (data) {
            newTestPlayerObjId = data && data.data ? data.data._id : null;
            newTestPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });


    };

    proto.playerQuickReg = function (callback, requestData) {
        date = new Date().getTime();
        //console.log("data:platformId.....", platformId);var thisObj = this;
        var thisObj = this;
        var data = requestData ||
            {
                "name": "testPlayer" + date,
                "email": "testPlayer123@gmail.com",
                "realName": "testPlayerRealName",
                "password": "123456",
                "platformId": platformId,
                "phoneNumber": "97787654",
            };

        thisObj.playerService.playerQuickReg.request(data);
        thisObj.playerService.playerQuickReg.once(function (data) {
            // newTestPlayerObjId = data && data.data ? data.data._id : null;
            // newTestPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });


    };

    proto.createPlayerPartner = function (callback, requestData) {
        date = new Date().getTime();
        let thisObj = this;
        let data = requestData ||
            {
                "name": "testPlayer" + date,
                "realName": "testPlayerRealName",
                "password": "123456",
                "platformId": platformId,
                "phoneNumber": "97787654",
                "email": "testPlayer123@gmail.com",
                smsCode: smsCode,
                isTestPlayer: true,
                requestId: "testRequestId123"
            };

        thisObj.playerService.createPlayerPartner.request(data);
        thisObj.playerService.createPlayerPartner.once(function (data) {
            newTestPlayerObjId = data && data.data ? data.data._id : null;
            newTestPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.get = function (callback, requestData) {
        let data = requestData || {name: 'testclientplayer'};
        this.playerService.get.request(data);
        this.playerService.get.once(function (data) {
            testPlayerObjId = data && data.data ? data.data._id : null;
            testPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getPlayerPartner = function (callback, requestData) {
        let data = requestData || {name: 'testclientplayer'};
        this.playerService.getPlayerPartner.request(data);
        this.playerService.getPlayerPartner.once(function (data) {
            testPlayerObjId = data && data.data ? data.data._id : null;
            testPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.captcha = function (callback, requestData) {
        this.playerService.captcha.request();
        this.playerService.captcha.once(callback);
    };

    proto.login = function (callback, requestData) {

       // console.log("requestData", requestData);
        var data = requestData || testPlayerLoginData;

        if (!isNode) {
            console.log("Not node");
            document.cookie = "username=" + data.name;
            document.cookie = "password=" + data.password;
            document.cookie = "platform=" + data.platformId;
            document.cookie = "expires=" + date + (5 * 60 * 60 * 1000);
        }
        delete data.captcha;
        this.playerService.login.request(data);
        this.playerService.login.once(function (data) {
            testPlayerObjId = data && data.data ? data.data._id : null;
            testPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.loginPlayerPartner = function (callback, requestData) {
        let data = requestData || testPlayerLoginData;

        if (!isNode) {
            console.log("Not node");
            document.cookie = "username=" + data.name;
            document.cookie = "password=" + data.password;
            document.cookie = "platform=" + data.platformId;
            document.cookie = "expires=" + date + (5 * 60 * 60 * 1000);
        }
        this.playerService.loginPlayerPartner.request(data);
        this.playerService.loginPlayerPartner.once(function (data) {
            testPlayerObjId = data && data.data ? data.data._id : null;
            testPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.loginPlayerPartnerWithSMS = function (callback, requestData) {
        let data = requestData || testPlayerLoginData;

        if (!isNode) {
            console.log("Not node");
            document.cookie = "phoneNumber=" + data.phoneNumber;
            document.cookie = "smsCode=" + data.smsCode;
            document.cookie = "platform=" + data.platformId;
            document.cookie = "expires=" + date + (5 * 60 * 60 * 1000);
        }
        this.playerService.loginPlayerPartnerWithSMS.request(data);
        this.playerService.loginPlayerPartnerWithSMS.once(function (data) {
            testPlayerObjId = data && data.data ? data.data._id : null;
            testPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.isLogin = function (callback, requestData) {
        var data = requestData || {
                playerId: testPlayerId
            };
        this.playerService.isLogin.request(data);
        this.playerService.isLogin.once(callback);
    };

    proto.logout = function (callback, requestData) {
        let data = requestData || {
                playerId: testPlayerId
            };

        this.playerService.logout.request(data);
        if (!isNode) {
            document.cookie = "username=;";
            document.cookie = "password=";
            document.cookie = "expires=" + date.toString();
        }
        this.playerService.logout.once(callback);
    };

    proto.logoutPlayerPartner = function (callback, requestData) {
        let data = requestData || {
                playerId: testPlayerId
            };
        this.playerService.logoutPlayerPartner.request(data);
        if (!isNode) {
            document.cookie = "username=;";
            document.cookie = "password=";
            document.cookie = "expires=" + date.toString();
        }
        this.playerService.logoutPlayerPartner.once(callback);
    };

    proto.isValidUsername = function (callback, requestData) {
        var data = requestData || {};
        this.playerService.isValidUsername.request(data);
        this.playerService.isValidUsername.once(callback);
    };

    proto.isValidRealName = function (callback, requestData) {
        let data = requestData || {};
        this.playerService.isValidRealName.request(data);
        this.playerService.isValidRealName.once(callback);
    };

    proto.updatePassword = function (callback, requestData) {
        var data = requestData || {playerId: testPlayerId, oldPassword: "123456", newPassword: "654321"};
        this.playerService.updatePassword.request(data);
        this.playerService.updatePassword.once(callback);
    };

    proto.updatePasswordPlayerPartner = function (callback, requestData) {
        let data = requestData || {playerId: testPlayerId, oldPassword: "123456", newPassword: "654321"};
        this.playerService.updatePasswordPlayerPartner.request(data);
        this.playerService.updatePasswordPlayerPartner.once(callback);
    };

    proto.update = function (callback, requestData) {
        var data = requestData ||
            {
                playerId: testPlayerId,
                nickName: "testPlayer"
            };
        this.playerService.update.request(data);
        this.playerService.update.once(callback);
    };

    proto.updatePlayerQQ = function (callback, requestData) {
        var data = requestData || {};
        this.playerService.updatePlayerQQ.request(data);
        this.playerService.updatePlayerQQ.once(callback);
    };

    proto.updatePlayerWeChat = function (callback, requestData) {
        var data = requestData || {};
        this.playerService.updatePlayerWeChat.request(data);
        this.playerService.updatePlayerWeChat.once(callback);
    };

    proto.updatePlayerEmail = function (callback, requestData) {
        var data = requestData || {};
        this.playerService.updatePlayerEmail.request(data);
        this.playerService.updatePlayerEmail.once(callback);
    };

    proto.updatePhoneNumberWithSMS = function (callback, requestData) {
        let data = requestData || {};
        this.playerService.updatePhoneNumberWithSMS.request(data);
        this.playerService.updatePhoneNumberWithSMS.once(callback);
    };

    proto.updatePlayerPartnerPhoneNumberWithSMS = function (callback, requestData) {
        let data = requestData || {};
        this.playerService.updatePlayerPartnerPhoneNumberWithSMS.request(data);
        this.playerService.updatePlayerPartnerPhoneNumberWithSMS.once(callback);
    };

    proto.updateSmsSetting = function(callback, requestData) {

        var data = requestData ||
            {
                playerId: testPlayerId,
                smsSetting : "mobilePhone"
            };
        this.playerService.updateSmsSetting.request(data);
        this.playerService.updateSmsSetting.once(callback);
    };

    proto.getSmsStatus = function(callback, requestData) {

        let data = requestData || {playerId: testPlayerId};
        this.playerService.getSmsStatus.request(data);
        this.playerService.getSmsStatus.once(callback);
    };

    proto.setSmsStatus = function(callback, requestData) {

        let data = requestData || {playerId: testPlayerId, status:''};
        this.playerService.setSmsStatus.request(data);
        this.playerService.setSmsStatus.once(callback);
    };

    proto.updatePaymentInfo = function (callback, requestData) {
        var data = requestData ||
            {
                playerId: testPlayerId,
                bankType: "testBank",
                bankAccount: "123",
                bankAccountName: "testPlayer",
                bankAccountType: "saving"
            };
        this.playerService.updatePaymentInfo.request(data);
        this.playerService.updatePaymentInfo.once(callback);
    };

    proto.updatePlayerPartnerPaymentInfo = function (callback, requestData) {
        let data = requestData ||
            {
                playerId: testPlayerId,
                bankType: "testBank",
                bankAccount: "123",
                bankAccountName: "testPlayer",
                bankAccountType: "saving"
            };
        this.playerService.updatePlayerPartnerPaymentInfo.request(data);
        this.playerService.updatePlayerPartnerPaymentInfo.once(callback);
    };

    proto.authenticate = function (callback, requestData) {
        var data = requestData || {
                playerId: testPlayerId,
                token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdGNsaWVudHBsYXllciIsInBhc3N3b3JkIjoiJDJhJDEwJG0xd2hheVFhbzFxaW1DT2FYSXFjYmVrOGJWLzJvenN4ZUo1Vko5SnY0RGVLYlh3SDE0SE1xIiwiaWF0IjoxNDYyNDMyNDI5LCJleHAiOjE0NjI0NTA0Mjl9.Ma0lsHrHTST135mBV4A65-YkXYPVwsa-g9sA-NW7dGU"
            };
        this.playerService.authenticate.request(data);
        this.playerService.authenticate.once(callback);
    };

    proto.authenticatePlayerPartner = function (callback, requestData) {
        let data = requestData || {
                playerId: testPlayerId,
                token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdGNsaWVudHBsYXllciIsInBhc3N3b3JkIjoiJDJhJDEwJG0xd2hheVFhbzFxaW1DT2FYSXFjYmVrOGJWLzJvenN4ZUo1Vko5SnY0RGVLYlh3SDE0SE1xIiwiaWF0IjoxNDYyNDMyNDI5LCJleHAiOjE0NjI0NTA0Mjl9.Ma0lsHrHTST135mBV4A65-YkXYPVwsa-g9sA-NW7dGU"
            };
        this.playerService.authenticatePlayerPartner.request(data);
        this.playerService.authenticatePlayerPartner.once(callback);
    };

    proto.getPlayerDayStatus = function(callback, requestData) {
        this.playerService.getPlayerDayStatus.request(requestData);
        this.playerService.getPlayerDayStatus.once(callback);
    };

    proto.getPlayerWeekStatus = function(callback, requestData) {
        this.playerService.getPlayerWeekStatus.request(requestData);
        this.playerService.getPlayerWeekStatus.once(callback);
    };

    proto.getPlayerMonthStatus = function(callback, requestData) {
        this.playerService.getPlayerMonthStatus.request(requestData);
        this.playerService.getPlayerMonthStatus.once(callback);
    };

    proto.updatePhotoUrl = function(callback, requestData) {
        var data = requestData ||
            {
                photoUrl: "http://facebook.com/aaa/bbb"
            };

        this.playerService.updatePhotoUrl.request(data);
        this.playerService.updatePhotoUrl.once(callback);
    };

    proto.getCreditBalance = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.getCreditBalance.request(data);
        this.playerService.getCreditBalance.once(callback);
    };

    proto.getCredit = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.getCredit.request(data);
        this.playerService.getCredit.once(callback);
    };

    proto.getCreditInfo = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.getCreditInfo.request(data);
        this.playerService.getCreditInfo.once(callback);
    };

    proto.getMailList = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.getMailList.request(data);
        this.playerService.getMailList.once(callback);
    };

    proto.deleteAllMail = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.deleteAllMail.request(data);
        this.playerService.deleteAllMail.once(callback);
    };

    proto.readMail = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.readMail.request(data);
        this.playerService.readMail.once(callback);
    };

    proto.deleteMail = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.deleteMail.request(data);
        this.playerService.deleteMail.once(callback);
    };

    proto.getUnreadMail = function(callback, requestData) {
        var data = requestData || {}

        this.playerService.getUnreadMail.request(data);
        this.playerService.getUnreadMail.once(callback);
    };

    proto.sendPlayerMailFromPlayerToPlayer = function(callback, requestData) {
        var data = requestData || {
                recipientPlayerId: '4',
                title: "Hey mate",
                content: "Let's play a game"
            };

        this.playerService.sendPlayerMailFromPlayerToPlayer.request(data);
        this.playerService.sendPlayerMailFromPlayerToPlayer.once(callback);
    };

    proto.sendPlayerMailFromPlayerToAdmin = function(callback, requestData) {
        var data = requestData || {
                recipientAdminObjId: '57579e3987f68123f74f4ec4',
                title: "Thank you but",
                content: "The credits still have not appeared in my account"
            };

        this.playerService.sendPlayerMailFromPlayerToAdmin.request(data);
        this.playerService.sendPlayerMailFromPlayerToAdmin.once(callback);
    };

    proto.notifyNewMail = function (callback, requestData) {
        //var data = requestData || {};
        //this.playerService.notifyNewMail.request(data);
        //var self = this;
        var responseFunc = function(data){
            // if( data.data.runTimeStatus >= 3 ){
            //     self.gameService.notifyProviderStatusUpdate.removeListener(responseFunc);
            // }
            callback(data);
        };
        this.playerService.notifyNewMail.addListener(responseFunc);
    };

    proto.manualPlayerLevelUp = function (callback, requestData) {
        var thisObj = this;
        var data = requestData || {};

        thisObj.playerService.manualPlayerLevelUp.request(data);
        thisObj.playerService.manualPlayerLevelUp.once(function (data) {
            // newTestPlayerObjId = data && data.data ? data.data._id : null;
            // newTestPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });


    };

    proto.getWithdrawalInfo = function (callback, requestData) {
        var thisObj = this;
        var data = requestData || {};

        thisObj.playerService.getWithdrawalInfo.request(data);
        thisObj.playerService.getWithdrawalInfo.once(function (data) {
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getCardTypeList = function (callback, requestData) {
        var thisObj = this;
        var data = requestData || {};

        thisObj.playerService.getCardTypeList.request(data);
        thisObj.playerService.getCardTypeList.once(function (data) {
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getCreditDetail = function (callback, requestData) {
        var thisObj = this;
        var data = requestData || {};

        thisObj.playerService.getCreditDetail.request(data);
        thisObj.playerService.getCreditDetail.once(function (data) {
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.loginJblShow = function (callback, requestData) {
        let data = requestData || {};

        this.playerService.loginJblShow.request(data);
        this.playerService.loginJblShow.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ClientPlayerAPITest;
    } else {
        define([], function () {
            return ClientPlayerAPITest;
        });
    }

})();