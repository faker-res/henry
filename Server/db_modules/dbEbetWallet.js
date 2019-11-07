"use strict";
const dbconfig = require('../modules/dbproperties');

var dbEbetWalletFunc = function () {
};
module.exports = new dbEbetWalletFunc();

const dbEbetWallet = {
    EBETWalletPlatformNames: [ // is provider code
        "EBET",
        "EBETSLOTS",
        "EBETBOARD",
    ],
    V68WalletPlatformNames: [ // is provider code
        "V68LIVE",
        "V68SLOT",
        "V68BOARD"
    ],
    getWalletPlatformNames: () => { // is provider code
        return [].concat(
            // note:: add here when there is new wallet channel
            dbEbetWallet.EBETWalletPlatformNames,
            dbEbetWallet.V68WalletPlatformNames,
        );
    },
    getEBETWalletStringProviderObjIds: async () => {
        let providers = await dbconfig.collection_gameProvider.find({code: {$in: dbEbetWallet.EBETWalletPlatformNames}}, {_id: 1}).lean();
        return providers.map(provider => String(provider._id));
    },
    getV68WalletStringProviderObjIds: async () => {
        let providers = await dbconfig.collection_gameProvider.find({code: {$in: dbEbetWallet.V68WalletPlatformNames}}, {_id: 1}).lean();
        return providers.map(provider => String(provider._id));
    },
    getAllWalletStringPOIDInArray: async () => {
        return [
            // note:: add here when there is new wallet channel
            (await dbEbetWallet.getEBETWalletStringProviderObjIds()),
            (await dbEbetWallet.getV68WalletStringProviderObjIds()),
        ];
    },
    getRelevantPOIDsFromPOID: async (providerObjId) => {
        let poids = await dbEbetWallet.getAllWalletStringPOIDInArray();
        for (let i = 0; i < poids.length; i++) {
            let poidArr = poids[i];
            if (poidArr && poidArr.includes(String(providerObjId))) {
                return poidArr;
            }
        }
        return [];
    },

};

var proto = dbEbetWalletFunc.prototype;
proto = Object.assign(proto, dbEbetWallet);

// This make WebStorm navigation work
module.exports = dbEbetWallet;