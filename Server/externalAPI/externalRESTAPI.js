const crypto = require('crypto');
const req = require('request');
const rsaCrypto = require('../modules/rsaCrypto');

const extConfig = require('../config/externalPayment/config');

const FKPWithdrawUrl = extConfig.fukuaipay.withdrawAPIAddr;

const externalRESTAPI = {
    // FUKUAIPAY Services
    payment_FKP_Withdraw: function (data) {
        return callFKPAPI(data, FKPWithdrawUrl);
    },
};

module.exports = externalRESTAPI;

function callFKPAPI(data, url) {
    if (!data) {
        return Promise.reject(new Error("Invalid data!"));
    }

    data = encryptFKPMsg(data);

    req.post(
        {url: url, form: data},
        (error, response, body) => {
            if (error) {
                console.log('error', error);
            }

            if (!error && response.statusCode == 200) {
                console.log(body)
            }

            console.log('other', body);
        }
    );
}

function encryptFKPMsg (data) {
    let toEncrypt = processFKPData(data);

    data.sign = rsaCrypto.signFKP(toEncrypt);
    data.signType = "RSA";

    return data;
}

function processFKPData (data) {
    let toEncrypt = '';

    Object.keys(data).forEach(key => {
        toEncrypt += key;
        toEncrypt += '=';
        toEncrypt += data[key] ? data[key].toString() : '';
        toEncrypt += '&'
    });

    // remove the last & character
    toEncrypt = toEncrypt.slice(0, -1);

    return toEncrypt;
}