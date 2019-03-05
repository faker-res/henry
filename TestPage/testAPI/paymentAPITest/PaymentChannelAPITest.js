(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var PaymentChannelAPITest = function (service) {
        this._service = service;

        this.testChannelId = null;
        this.testChannelName = "testPaymentChannel";
    };
    var proto = PaymentChannelAPITest.prototype;

    proto.add = function (callback, requestData) {
        var date = new Date().getTime();
        var data = requestData ||
            {
                name: "testPaymentChannel" + date,
                code: "testCode",
                key: "testKey",
                status: "1",
                des: "test payment channel"
            };
        this._service.add.request(data);
        var self = this;
        this._service.add.once(function (data) {
            if (data.status == '200') {
                self.testChannelId = data.data.channelId;
            }
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.update = function (callback, requestData) {
        var data = requestData ||
            {
                channelId: this.testChannelId,
                code: "testCode1",
            };
        this._service.update.request(data);
        this._service.update.once(callback);
    };

    proto.delete = function (callback, requestData) {
        var data = requestData ||
            {
                channelId: this.testChannelId,
            };
        this._service.delete.request(data);
        this._service.delete.once(callback);
    };

    proto.changeStatus = function (callback, requestData) {
        var data = requestData ||
            {
                channelId: this.testChannelId,
                status: "2"
            };
        this._service.changeStatus.request(data);
        this._service.changeStatus.once(callback);
    };
    proto.all = function (callback, requestData) {
        this._service.all.request({});
        this._service.all.once(callback);
    };

    if (isNode) {
        module.exports = PaymentChannelAPITest;
    } else {
        define([], function () {
            return PaymentChannelAPITest;
        });
    }

})();
