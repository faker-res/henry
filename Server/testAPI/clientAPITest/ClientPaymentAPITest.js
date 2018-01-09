(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var testPlayerId = !isNode && window.testPlayerId;

    var ClientPaymentAPITest = function (service) {
        this._service = service;

        // this.testPaymentIntentionId = null;
    };
    var testPlatformId = null;
    var proto = ClientPaymentAPITest.prototype;

    if (isNode) {

        // var dbPlayer = require('./../../db_modules/dbPlayerInfo');
        // var playerName = "testclientplayer";
        // var Q = require('q');
        //
        // var a = function (callback, requestData) {
        //     var deferred = Q.defer();
        //     dbPlayer.getPlayerInfo({name: playerName})
        //         .then(
        //             function (data) {
        //                 testPlayerId = data.playerId;
        //                 deferred.resolve(data);
        //             },
        //             function (error) {
        //                 deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
        //             }
        //         );
        //     return deferred.promise;
        // };
        // a();

        var dbPlatform = require('./../../db_modules/dbPlatform');
        var Q = require('q');
        proto.initGetPlatform = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlatform.getPlatform({
                    name: "testClientPlatform"  // get Platform
                }
            ).then(
                function (data) {
                    testPlatformId = data.platformId;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };

    }

    proto.createOnlineTopupProposal = function (callback, requestData) {
        var data = requestData ||
            {
                playerId: testPlayerId,
                topUpAmount: 10,
                topupChannel: '2'
            };
        this._service.createOnlineTopupProposal.request(requestData);
        this._service.createOnlineTopupProposal.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getTopupList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getTopupList.request(data);
        this._service.getTopupList.once(function (data) {
            if (callback && typeof callback === "function") {
                callback (data);
            }
        });
    };

    proto.getTopupHistory = function (callback, requestData) {
        var data = requestData || {};
        this._service.getTopupHistory.request(data);
        this._service.getTopupHistory.once(function (data) {
            if (callback && typeof callback === "function") {
                callback (data);
            }
        });
    };

    proto.requestManualTopup = function (callback, requestData) {
        var data = requestData || {
                playerId: testPlayerId,
                depositType: "gdfgf",
                depositBank: "DBS",
                depositAccountLastThreeNr: "678",
                depositName: "TestClientPlayer",
                depositDistrict: "SG",
                depositMoney:400,
                remark: "Test",
                platformId: testPlatformId,
                startIndex : 0,
                captcha : 'testCaptcha'
            };
        this._service.requestManualTopup.request(data);
        this._service.requestManualTopup.once(function (data) {
            if (callback && typeof callback === "function") {
                callback (data);
            }
        });
    };

    proto.getCashRechargeStatus = function (callback, requestData) {
        let data = requestData || {
            playerId: testPlayerId,
        };
        this._service.getCashRechargeStatus.request(data);
        this._service.getCashRechargeStatus.once(callback);
    };

    proto.requestAlipayTopup = function (callback, requestData) {
        var data = requestData || {
                playerId: testPlayerId,
                amount: 100
            };
        this._service.requestAlipayTopup.request(data);
        this._service.requestAlipayTopup.once(function (data) {
            if (callback && typeof callback === "function") {
                callback (data);
            }
        });
    };

    proto.requestWechatTopup = function (callback, requestData) {
        var data = requestData || {
                playerId: testPlayerId,
                amount: 100
            };
        this._service.requestWechatTopup.request(data);
        this._service.requestWechatTopup.once(function (data) {
            if (callback && typeof callback === "function") {
                callback (data);
            }
        });
    };

    proto.getBonusList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getBonusList.request(data);
        this._service.getBonusList.once(callback);
    };

    proto.applyBonus = function (callback, requestData) {
        var data = requestData || {
                playerId: testPlayerId,
                bonusId: 1,
                amount: 40
            };
        this._service.applyBonus.request(data);
        this._service.applyBonus.once(callback);
    };

    proto.getBonusRequestList = function (callback, requestData) {
        var data = requestData || {
            //startTime: Date.now() - 1000 * 60 * 60 * 24 * 30,
            //endTime: Date.now(),
            //proposalStatus: 5
        };
        this._service.getBonusRequestList.request(data);
        this._service.getBonusRequestList.once(callback);
    };

    proto.cancelBonusRequest = function (callback, requestData) {
        var data = requestData || {};
        this._service.cancelBonusRequest.request(data);
        this._service.cancelBonusRequest.once(callback);
    };

    proto.cancelManualTopupRequest = function (callback, requestData) {
        var data = requestData || {};
        this._service.cancelManualTopupRequest.request(data);
        this._service.cancelManualTopupRequest.once(callback);
    };

    proto.cancelAlipayTopup = function (callback, requestData) {
        var data = requestData || {};
        this._service.cancelAlipayTopup.request(data);
        this._service.cancelAlipayTopup.once(callback);
    };

    proto.cancelWechatTopup = function (callback, requestData) {
        var data = requestData || {};
        this._service.cancelWechatTopup.request(data);
        this._service.cancelWechatTopup.once(callback);
    };

    proto.cancelQuickpayTopup = function (callback, requestData) {
        var data = requestData || {};
        this._service.cancelQuickpayTopup.request(data);
        this._service.cancelQuickpayTopup.once(callback);
    };

    proto.delayManualTopupRequest = function (callback, requestData) {
        var data = requestData || {};
        this._service.delayManualTopupRequest.request(data);
        this._service.delayManualTopupRequest.once(callback);
    };

    proto.modifyManualTopupRequest = function (callback, requestData) {
        var data = requestData || {};
        this._service.modifyManualTopupRequest.request(data);
        this._service.modifyManualTopupRequest.once(callback);
    };

    proto.getManualTopupRequestList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getManualTopupRequestList.request(data);
        this._service.getManualTopupRequestList.once(callback);
    };

    proto.getAlipayTopupRequestList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getAlipayTopupRequestList.request(data);
        this._service.getAlipayTopupRequestList.once(callback);
    };

    proto.getWechatTopupRequestList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getWechatTopupRequestList.request(data);
        this._service.getWechatTopupRequestList.once(callback);
    };

    proto.getOnlineTopupType = function (callback, requestData) {
        var data = requestData || {};
        this._service.getOnlineTopupType.request(data);
        this._service.getOnlineTopupType.once(callback);
    };

    proto.manualTopupStatusNotify = function (callback, requestData) {
        var responseFunc = function(data){
            callback(data);
        };
        this._service.manualTopupStatusNotify.addListener(responseFunc);
    };

    proto.onlineTopupStatusNotify = function (callback, requestData) {
        var responseFunc = function(data){
            callback(data);
        };
        this._service.onlineTopupStatusNotify.addListener(responseFunc);
    };

    proto.getProvinceList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getProvinceList.request(data);
        this._service.getProvinceList.once(callback);
    };

    proto.getCityList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getCityList.request(data);
        this._service.getCityList.once(callback);
    };

    proto.getDistrictList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getDistrictList.request(data);
        this._service.getDistrictList.once(callback);
    };

    proto.getBankTypeList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getBankTypeList.request(data);
        this._service.getBankTypeList.once(callback);
    };

    proto.checkExpiredManualTopup = function (callback, requestData) {
        var data = requestData || {};
        this._service.checkExpiredManualTopup.request(data);
        this._service.checkExpiredManualTopup.once(callback);
    };

    proto.getValidFirstTopUpRecordList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getValidFirstTopUpRecordList.request(data);
        this._service.getValidFirstTopUpRecordList.once(callback);
    };

    proto.getValidTopUpReturnRecordList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getValidTopUpReturnRecordList.request(data);
        this._service.getValidTopUpReturnRecordList.once(callback);
    };

    proto.getValidTopUpRewardRecordList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getValidTopUpRewardRecordList.request(data);
        this._service.getValidTopUpRewardRecordList.once(callback);
    };

    proto.getPlayerWechatPayStatus = function (callback, requestData) {
        let data = requestData || {};
        this._service.getPlayerWechatPayStatus.request(data);
        this._service.getPlayerWechatPayStatus.once(callback);
    };

    proto.getPlayerAliPayStatus = function (callback, requestData) {
        let data = requestData || {};
        this._service.getPlayerAliPayStatus.request(data);
        this._service.getPlayerAliPayStatus.once(callback);
    };

    proto.getAlipaySingleLimit = function (callback, requestData) {
        let data = requestData || {};
        this._service.getAlipaySingleLimit.request(data);
        this._service.getAlipaySingleLimit.once(callback);
    };

    proto.requestQuickpayTopup = function (callback, requestData) {
        let data = requestData || {};
        this._service.requestQuickpayTopup.request(data);
        this._service.requestQuickpayTopup.once(callback);
    };

    proto.getQuickpayTopupRequestList = function (callback, requestData) {
        let data = requestData || {};
        this._service.getQuickpayTopupRequestList.request(data);
        this._service.getQuickpayTopupRequestList.once(callback);
    };

    proto.isFirstTopUp = function (callback, requestData) {
        let data = requestData || {};
        this._service.isFirstTopUp.request(data);
        this._service.isFirstTopUp.once(callback);
    };


    if (isNode) {
        module.exports = ClientPaymentAPITest;
    } else {
        define([], function () {
            return ClientPaymentAPITest;
        });
    }

})();

