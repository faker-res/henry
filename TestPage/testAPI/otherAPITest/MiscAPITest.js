(function () {
    let isNode = (typeof module !== 'undefined' && module.exports);

    let MiscAPITest = function (service) {
        this._service = service;
    };

    let proto = MiscAPITest.prototype;

    proto.encryptMessage = function (callback, requestData) {
        this._service.encryptMessage.request(requestData);
        this._service.encryptMessage.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = MiscAPITest;
    } else {
        define([], function () {
            return MiscAPITest;
        });
    }

})();