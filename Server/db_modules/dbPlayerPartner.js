'use strict';

let Q = require("q");

let constServerCode = require('../const/constServerCode');

let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbPartner = require('./../db_modules/dbPartner');

let dbPlayerPartner = {
    createPlayerPartnerAPI:
        registerData => {
            let plyProm = dbPlayerInfo.createPlayerInfoAPI(registerData);
            let partnerProm = dbPartner.createPartnerAPI(registerData);

            return Promise.all([plyProm, partnerProm])
                .catch(
                    error => {
                        return Q.reject({
                            status: constServerCode.DB_ERROR,
                            name: "DBError",
                            message: error.message
                        });
                }
            )
        }
};

module.exports = dbPlayerPartner;
