(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var paymentDataAPITest = function (service) {
        this._service = service;

        // this.testChannelObjId = null;
        // this.testChannelName = "testProposal";
    };

    var proto = paymentDataAPITest.prototype;

    var platformObjId = null;
    var proposalTypeId = null;
    var proposalId = null;

    //////////////////////////////// Init Proposal Data - Start ///////////////////////

    //////////////////////////////// Init Proposal Data - Just to run on server site ///////////////////////

    proto.deleteMerchant = function (callback, requestData) {
        var data = requestData;
        this._service.deleteMerchant.request(data);
        var self = this;
        this._service.deleteMerchant.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.deleteBankcard = function (callback, requestData) {
        var data = requestData;
        this._service.deleteBankcard.request(data);
        var self = this;
        this._service.deleteBankcard.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.deleteAlipay = function (callback, requestData) {
        var data = requestData;
        this._service.deleteAlipay.request(data);
        var self = this;
        this._service.deleteAlipay.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };
    if (isNode) {
        module.exports = paymentDataAPITest;
    } else {
        define([], function () {
            return paymentDataAPITest;
        });
    }

})();
