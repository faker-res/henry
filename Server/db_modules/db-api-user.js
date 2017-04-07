var dbConfig = require('./../modules/dbproperties');
var Q = require("q");
var bcrypt = require('bcrypt');
var constServerCode = require('../const/constServerCode');
var dbPlayerApiUser = {

    getApiUserInfo: function (query) {
        return dbConfig.collection_apiUser.findOne(query).exec();
    },
    /**
     * Create an api user
     * @param {json} apiUserData - The data of the apiUser. Refer to apiUser schema.
     */
    addApiUser: function(apiUserData){
        var apiUser = new dbConfig.collection_apiUser(apiUserData);
        return apiUser.save();
    },

    deleteApiUser: function(apiUserObjId){
        return dbConfig.collection_apiUser.remove({_id:apiUserObjId}).exec();
    },

    apiUserLogin: function (apiUserData) {

        var deferred = Q.defer();
        var db_password = null;

        dbConfig.collection_apiUser.findOne({name: apiUserData.name}).then(
            function (data) {
                if (data) {
                    db_password = String(data.password); // hashedPassword from db
                    bcrypt.compare(String(apiUserData.password), db_password, function (err, isMatch) {
                        if (err) {
                            deferred.reject({name: "DataError", message: "Error in matching password", error: err});
                        }
                        if (isMatch) {

                            deferred.resolve(data.name);
                        } else {
                            deferred.reject({
                                name: "DataError",
                                message: "Api Username and password donnot match",
                                code: constServerCode.INVALID_USER_PASSWORD
                            });
                        }
                    });
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        message: "Cannot find api user",
                        code: constServerCode.DOCUMENT_NOT_FOUND
                    });
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting api user", error: error});
            }
        );
        return deferred.promise;
    },
};
module.exports = dbPlayerApiUser;