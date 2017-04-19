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

            return Promise.all([plyProm, partnerProm]).then(
                promsData => {
                    //todo:: add the binding later
                    // return dbPartner.bindPartnerPlayer(promsData[1].partnerId, promsData[0].name).then(
                    //     () => {
                    //         return promsData;
                    //     }
                    // )
                    return promsData;
                }
            )
            .catch(
                error => {
                    return Q.reject({
                        status: constServerCode.DB_ERROR,
                        name: "DBError",
                        message: error.message
                    });
                }
            )
        },

    loginPlayerPartnerAPI:
        (loginData, ua) => {
            let plyProm = dbPlayerInfo.playerLogin(loginData, ua);
            let partnerProm = dbPartner.partnerLoginAPI(loginData, ua);

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
        },

    logoutPlayerPartnerAPI:
        (logoutData) => {
            let plyProm = dbPlayerInfo.playerLogout(logoutData);
            let partnerProm = dbPartner.partnerLogout(logoutData);

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
        },

    getPlayerPartnerAPI:
        data => {
            let plyProm = dbPlayerInfo.getPlayerInfoAPI({playerId: data.playerId});
            let partnerProm = dbPartner.getPartner({partnerId: data.partnerId});

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
        },

    authenticatePlayerPartner:
        (playerId, partnerId, token, playerIp, conn) => {
            let plyProm = dbPlayerInfo.authenticate(playerId, token, playerIp, conn);
            let partnerProm = dbPartner.authenticate(partnerId, token, playerIp, conn);

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
