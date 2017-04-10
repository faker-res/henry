'use strict';

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
                        console.log('error', error);
                }
            )
        }
};

module.exports = dbPlayerPartner;
