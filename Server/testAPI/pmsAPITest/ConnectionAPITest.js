(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ConnectionAPITest = function (service) {
        this._service = service;

        //this.testRecordId = null;

    };
    var proto = ConnectionAPITest.prototype;
    var testApiUserObjId = null;
    var testApiUserId = null;

    const testApiUserData = {
        name: "testApiUser",
        password: "123",
    };

    if (isNode) {

    }

    proto.login = function (callback, requestData) {

        var data = requestData || testApiUserData;
        this._service.login.request(data);
        this._service.login.once(function (data) {

            testApiUserObjId = data && data.data ? data.data._id : null;
            testApiUserId = data && data.data ? data.data.apiUserId : null;

            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.heartBeat = function (callback, requestData) {

        var data = requestData ||  {
                currentTime: 1477633072004
            };
        this._service.heartBeat.request(data);
        this._service.heartBeat.once(function (data) {
            console.log(data);
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };


    if (isNode) {
        module.exports = ConnectionAPITest;
    } else {
        define([], function () {
            return ConnectionAPITest;
        });
    }
})();