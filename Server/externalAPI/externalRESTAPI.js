const req = require('request');
const rsaCrypto = require('../modules/rsaCrypto');
const FormData = require('form-data');

const externalRESTAPI = {
    // FUKUAIPAY Services
    payment_FKP_TopUp: function (data) {
        return callFKPAPI(data);
    },
};

module.exports = externalRESTAPI;

function callFKPAPI(data) {
    // MIGHT NEED TO MOVE
    let FKPUrl = 'https://api.fukuaipay.com/gateway/bank';

    if (!data) {
        return Promise.reject(new Error("Invalid data!"));
    }

    data = encryptFKPMsg(data);
    // data = convertJsonToFormData(data);

    req.post(
        {url: FKPUrl, form: data},
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


    data.sign = rsaCrypto.fkpEncrypt(processFKPData(data));
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

function convertJsonToFormData (data) {
    let formData = new FormData();

    Object.keys(data).forEach(key => formData.append(key, data[key]));

    return formData;
}