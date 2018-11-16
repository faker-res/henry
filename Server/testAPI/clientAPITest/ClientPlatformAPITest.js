(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientPlatformAPITest = function (service) {
        this._service = service;

    };
    var testPlatformId = null;
    var proto = ClientPlatformAPITest.prototype;

    if (isNode)     {

        var dbPlatform = require('./../../db_modules/dbPlatform');
        var Q = require('q');

        dbPlatform.getPlatform({
                name: "testClientPlatform"  // get Platform
            }
        ).then(
            function (data) {
                testPlatformId = data.platformId;
            },
            function (error) {
               // deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
            }
        );
    }

    proto.getPlatformDetails = function (callback, requestData) {
        var data = requestData || {
                platformId: testPlatformId
            };
        this._service.getPlatformDetails.request(data);
        this._service.getPlatformDetails.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getPlatformAnnouncements = function (callback, requestData) {
        var data = requestData || {
                platformId: testPlatformId
            };
        this._service.getPlatformAnnouncements.request(data);
        this._service.getPlatformAnnouncements.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getConfig = function (callback, requestData) {
        var data = requestData || {
            platformId: testPlatformId
        };
        this._service.getConfig.request(data);
        this._service.getConfig.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getLiveStream = function (callback, requestData) {

        this._service.getLiveStream.request(requestData);
        this._service.getLiveStream.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });

    };

    proto.playerPhoneChat = function (callback, requestData) {

        this._service.playerPhoneChat.request(requestData);
        this._service.playerPhoneChat.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });

    };

    proto.searchConsumptionRecord = function (callback, requestData) {

        this._service.searchConsumptionRecord.request(requestData);
        this._service.searchConsumptionRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });

    };

    proto.clickCount = function (callback, requestData) {
        if (requestData.registerClickApp === "false") {
            delete requestData.registerClickApp;
        }
        if (requestData.registerClickWeb === "false") {
            delete requestData.registerClickWeb;
        }
        if (requestData.registerClickH5 === "false") {
            delete requestData.registerClickH5;
        }
        this._service.clickCount.request(requestData);
        this._service.clickCount.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });

    };

    proto.createPlayerFromTel = function (callback, requestData) {
        this._service.createPlayerFromTel.request(requestData);
        this._service.createPlayerFromTel.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.extractUserFromFpms = function (callback, requestData) {
        this._service.extractUserFromFpms.request(requestData);
        this._service.extractUserFromFpms.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getUserInfoFromPopUp = function (callback, requestData) {
        this._service.getUserInfoFromPopUp.request(requestData);
        this._service.getUserInfoFromPopUp.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getPlatformSetting = function (callback, requestData) {
        var data = requestData || {
            platformId: testPlatformId
        };
        this._service.getPlatformSetting.request(data);
        this._service.getPlatformSetting.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.turnUrlToQr = function (callback, requestData) {
        this._service.turnUrlToQr.request(requestData);
        this._service.turnUrlToQr.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getTemplateSetting = function (callback, requestData) {
        this._service.getTemplateSetting.request(requestData);
        this._service.getTemplateSetting.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addIpDomainLog = function (callback, requestData) {
        this._service.addIpDomainLog.request(requestData);
        this._service.addIpDomainLog.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getIDCIpDetail = function (callback, requestData) {
        this._service.getIDCIpDetail.request(requestData);
        this._service.getIDCIpDetail.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getLockedLobbyConfig = function (callback, requestData) {
        this._service.getLockedLobbyConfig.request(requestData);
        this._service.getLockedLobbyConfig.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.saveFrontEndData = function (callback, requestData) {
        this._service.saveFrontEndData.request(requestData);
        this._service.saveFrontEndData.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getFrontEndData = function (callback, requestData) {
        this._service.getFrontEndData.request(requestData);
        this._service.getFrontEndData.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.sendFileFTP = function (callback, requestData) {
        this._service.sendFileFTP.request(requestData);
        this._service.sendFileFTP.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.sendWCGroupControlSessionToFPMS = function (callback, requestData) {
        this._service.sendWCGroupControlSessionToFPMS.request(requestData);
        this._service.sendWCGroupControlSessionToFPMS.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ClientPlatformAPITest;
    } else {
        define([], function () {
            return ClientPlatformAPITest;
        });
    }

})();
