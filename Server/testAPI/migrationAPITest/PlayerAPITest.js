(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var playerAPITest = function (service) {
        this._service = service;
    };

    var proto = playerAPITest.prototype;


    proto.createPlatform = function (callback, requestData) {
        var data = requestData;
        this._service.createPlatform.request(data);
        var self = this;
        this._service.createPlatform.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayer = function (callback, requestData) {
        var data = requestData;
        this._service.createPlayer.request(data);
        var self = this;
        this._service.createPlayer.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.removePlayerRewardPointsRecord = function (callback, requestData) {
        var data = requestData;
        this._service.removePlayerRewardPointsRecord.request(data);
        var self = this;
        this._service.removePlayerRewardPointsRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayerTopUpRecord = function (callback, requestData) {
        var data = requestData;
        this._service.createPlayerTopUpRecord.request(data);
        var self = this;
        this._service.createPlayerTopUpRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayerConsumptionRecord = function (callback, requestData) {
        var data = requestData;
        this._service.createPlayerConsumptionRecord.request(data);
        var self = this;
        this._service.createPlayerConsumptionRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayerFeedback = function (callback, requestData) {
        var data = requestData;
        this._service.createPlayerFeedback.request(data);
        var self = this;
        this._service.createPlayerFeedback.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayerRewardTask = function (callback, requestData) {
        var data = requestData;
        this._service.createPlayerRewardTask.request(data);
        var self = this;
        this._service.createPlayerRewardTask.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayerLoginRecord = function (callback, requestData) {
        var data = requestData;
        this._service.createPlayerLoginRecord.request(data);
        var self = this;
        this._service.createPlayerLoginRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayerCreditTransferLog = function (callback, requestData) {
        var data = requestData;
        this._service.createPlayerCreditTransferLog.request(data);
        var self = this;
        this._service.createPlayerCreditTransferLog.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addPlayerPartner = function (callback, requestData) {
        var data = requestData;
        this._service.addPlayerPartner.request(data);
        var self = this;
        this._service.addPlayerPartner.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addPlayerReferral = function (callback, requestData) {
        var data = requestData;
        this._service.addPlayerReferral.request(data);
        var self = this;
        this._service.addPlayerReferral.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPlayerCreditChangeLog = function (callback, requestData) {
        var data = requestData || {
                "playerName": "uzhoudada ",
                "platform": "1",
                "operationType": "UpdatePlayerCredit",
                "amount": -21.0,
                "curAmount": 0.0,
                "operationTime": "2016-11-20T17:16:31Z",
                "data": {"pno": "5121611210043"}
            };
        this._service.createPlayerCreditChangeLog.request(data);
        var self = this;
        this._service.createPlayerCreditChangeLog.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.updateLastPlayedProvider = function (callback, requestData) {
        var data = requestData;
        this._service.updateLastPlayedProvider.request(data);
        var self = this;
        this._service.updateLastPlayedProvider.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.updatePlayerCredit = function (callback, requestData) {
        var data = requestData;
        this._service.updatePlayerCredit.request(data);
        var self = this;
        this._service.updatePlayerCredit.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.updatePlayerLevel = function (callback, requestData) {
        var data = requestData;
        this._service.updatePlayerLevel.request(data);
        var self = this;
        this._service.updatePlayerLevel.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.updatePlayer = function (callback, requestData) {
        var data = {
            playerName: "yunvincevince80",
            platform: 1,
            updateData: {
                playerLevelName: "普通会员",
                partnerName: "",
                validCredit: 100,
                realName: "testvince"
            }
        };
        this._service.updatePlayer.request(data);
        var self = this;
        this._service.updatePlayer.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = playerAPITest;
    } else {
        define([], function () {
            return playerAPITest;
        });
    }

})();


