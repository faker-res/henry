(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientRegistrationIntentionAPITest = function(service){
        this._service = service;

        this.testRecordId = null;
    };
    var platformId=null;

    var proto = ClientRegistrationIntentionAPITest.prototype;
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
    proto.add = function(callback, requestData){
        var date = new Date().getTime();
        var data = requestData ||
            {
                name: "abc",
                mobile: "72834569283",
                status: 1,
                platformId: platformId
            };
        this._service.add.request(data);
        var self = this;
        this._service.add.once(function(data){
            //self.testRecordId = data.data._id;
            if( callback && typeof callback === "function" ){
                callback(data);
            }
        });
    };

    proto.update = function(callback, requestData){
        var data = requestData ||
            {
                id: this.testRecordId,
                operationList: ["name: testPlayer"],
            };
        this._service.update.request(data);
        this._service.update.once(callback);
    };

    if(isNode){
        module.exports = ClientRegistrationIntentionAPITest;
    } else {
        define([], function(){
            return ClientRegistrationIntentionAPITest;
        });
    }

})();
