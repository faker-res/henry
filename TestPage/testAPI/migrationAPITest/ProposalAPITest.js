(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var proposalAPITest = function (service) {
        this._service = service;

        // this.testChannelObjId = null;
        // this.testChannelName = "testProposal";
    };

    var proto = proposalAPITest.prototype;

    proto.createProposal = function (callback, requestData) {
        var data = requestData || {
                "data" : {
                    //"platformId" : "1",
                    //"platformObjId" : ObjectId("381bf8a5d013d2273382edee"),
                    //"playerShorId" : "u57679",
                    //"playerId" : ObjectId("58453fbacf5fca42c75234fd"),
                    //"playerObjId" : ObjectId("58453fbacf5fca42c75234fd"),
                    "manner" : "个人支付宝（手机）",
                    "cashintime" : "Dec 6, 2016 2:21:15 AM",
                    "remark" : "审核:system存款方式:支付宝存款;收款账号:13265717507;执行:",
                    "accountNo" : "13265717507",
                    "amount" : 48,
                    "aliasName" : "李宗龙",
                    "loginname" : "uboss518",
                    "title" : "MONEY_CUSTOMER",
                    "pno" : "5021612060036"
                },
                "status" : "Success",
                "userType" : 0,
                "entryType" : 0,
                "createTime" : "2016-12-06 02:21:15",
                "creatorType" : "player",
                "creator" : "uboss518",
                "platform" : "4",
                "type" : "ManualPlayerTopUp"
            };
        this._service.createProposal.request(data);
        var self = this;
        this._service.createProposal.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = proposalAPITest;
    } else {
        define([], function () {
            return proposalAPITest;
        });
    }

})();

