/**
 * Created by hninpwinttin on 8/12/15.
 */
var jwt = require('jsonwebtoken');
var dbApiUser = require('./../db_modules/db-api-user');
var env = require('./../config/env');
var jwtSecret = env.config().socketSecret;

module.exports.listen = function (io, socket) {

    socket.on("addApiUser", function (data) {
        if (data && data.apiUserId) {
            var profile = {
                apiUser: data.apiUserId

            };

            var token = jwt.sign(profile, jwtSecret, {expiresIn: 60 * 60 * 5});
            data.key = token;

            dbApiUser.addApiUser(data).then(
                function (result) {
                    socket.emit("_addApiUser", {success: true, data: result});
                },
                function (err) {
                    if (err.code == 11000) {
                        socket.emit("_addApiUser", {success: false, error: err.message});
                    } else {
                        socket.emit("_addApiUser", {success: false, error: err});
                    }
                }
            );
        }
        else {
            socket.emit("_addApiUser", {success: false, error: "Data empty"});
        }
    });

};
