const rp = require('request-promise');

const extConfig = require('../../config/externalPayment/paymentSystems');

const paymentSystemId = 4;

function getMainDomain (paymentSystemKey) {
    let tempId = paymentSystemKey ? paymentSystemKey : paymentSystemId;

    return extConfig[tempId].mainDomain;
}

function getSubDomain (paymentSystemKey) {
    let tempId = paymentSystemKey ? paymentSystemKey : paymentSystemId;

    return extConfig[tempId].subDomain;
}

function getMainTopupLobbyAddress (paymentSystemKey) {
    let tempId = paymentSystemKey ? paymentSystemKey : paymentSystemId;

    return extConfig[tempId].topUpAPIAddr;
}

function getSubTopupLobbyAddress (paymentSystemKey) {
    let tempId = paymentSystemKey ? paymentSystemKey : paymentSystemId;

    return extConfig[tempId].topUpAPIAddr2;
}

function get3rdTopupLobbyAddress (paymentSystemKey) {
    let tempId = paymentSystemKey ? paymentSystemKey : paymentSystemId;

    return extConfig[tempId].topUpAPIAddr3;
}

function requestWithPromise (domain, paramStr) {
    let url = domain.concat(paramStr);

    return rp(url);
}

function pingDomain (domain) {
    if (!domain) {
        return false;
    }

    let options = {
        method: 'GET',
        uri: domain.concat('fpms-test.txt')
    };

    return rp(options).then(
        () => true,
        () => false
    );
}

function sendRequest (paramStr) {
    return rp(getMainDomain().concat(paramStr)).then(
        data => {
            console.log('retData', data);
            return data;
        }
    ).catch(
        err => {
            console.log('Main domain send request error', err);

            return requestWithPromise(getSubDomain(), paramStr)
        }
    );
}

function postRequest (reqData, urlName, method, paymentSystemKey, logReturn = true) {
    //console.log('reqData ::',urlName, reqData);
    let options = {
        method: method,
        uri: getMainDomain(paymentSystemKey).concat(urlName),
        body: reqData,
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options).then(
        data => {
            if (logReturn) {
                console.log(`${urlName} SUCCESS: ${data ? JSON.stringify(data) : data}`);
            } else {
                console.log(`${urlName} SUCCESS!`);
            }

            return data;
        }
    ).catch(
        err => {
            console.log(`${urlName} 1ST FAILED: ${err}`);

            if (getSubDomain(paymentSystemKey)) {
                options.uri = getSubDomain(paymentSystemKey).concat(urlName);

                return rp(options).then(
                    data => {
                        console.log(`${urlName} 2ND SUCCESS: ${data}`);
                        return data;
                    }
                ).catch(
                    err => {
                        console.log(`${urlName} 2ND FAILED: ${err}`);
                        throw err;
                    }
                );
            } else {
                return Promise.reject({message: "Fail to get sub domain"});
            }

        }
    );
}

function getMinMax (reqData) {
    let paramStr =
        "foundation/payMinAndMax.do?"
        + "platformId=" + reqData.platformId + "&"
        + "username=" + reqData.name + "&"
        + "clientType=" + reqData.clientType;

    console.log('getMinMaxCommonTopupAmount url', paramStr);

    return sendRequest(paramStr);
}

async function getTopupLobbyAddress (paymentSystemKey) {
    if (await pingDomain(getMainTopupLobbyAddress(paymentSystemKey))) {
        return getMainTopupLobbyAddress(paymentSystemKey);
    }

    if (await pingDomain(getSubTopupLobbyAddress(paymentSystemKey))) {
        return getSubTopupLobbyAddress(paymentSystemKey);
    }

    if (await pingDomain(get3rdTopupLobbyAddress(paymentSystemKey))) {
        return get3rdTopupLobbyAddress(paymentSystemKey);
    }

    // If things goes wrong, just return main address
    return getMainTopupLobbyAddress(paymentSystemKey);
}

function postWithdraw (reqData, paymentSystemKey) {
    return postRequest(reqData, 'withdraw-proposal', 'POST', paymentSystemKey);
}

function patchTopupStatus (reqData, paymentSystemKey) {
    return postRequest(reqData, 'playerDepositStatus', 'PATCH', paymentSystemKey);
}

function postBatchTopupStatus (reqData, paymentSystemKey) {
    return postRequest(reqData, 'batch/playerDepositStatus', 'POST', paymentSystemKey);
}

function postCancelTopup (reqData, paymentSystemKey) {
    return postRequest(reqData, 'deposit-proposal/cancel', 'POST', paymentSystemKey);
}

function postDelayTopup (reqData, paymentSystemKey) {
    return postRequest(reqData, 'deposit-proposal/delay', 'POST', paymentSystemKey);
}

function postCreateTopup (reqData, paymentSystemKey) {
    return postRequest(reqData, 'deposit-proposal/create', 'POST', paymentSystemKey);
}

function postBankCardList (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getBankCardList', 'POST', paymentSystemKey, false)
}

function postBankCard (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getBankCard', 'POST', paymentSystemKey);
}

function postBankType (reqData, paymentSystemKey) {
    return postRequest(reqData, 'bankType', 'POST', paymentSystemKey);
}

function postBankTypeList (reqData, paymentSystemKey) {
    return postRequest(reqData, 'bankTypes', 'POST', paymentSystemKey, false)
}

function postSyncPlatform (reqData, paymentSystemKey) {
    return postRequest(reqData, 'sync-platform', 'POST', paymentSystemKey);
}

function postTopupForceMatch (reqData, paymentSystemKey) {
    return postRequest(reqData, 'deposit-proposal/force-match', 'POST', paymentSystemKey)
}

function postMerchantList (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getMerchantList', 'POST', paymentSystemKey, false)
}

function postMerchantTypeList (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getMerchantTypeList', 'POST', paymentSystemKey, false)
}

function postPaymentGroup (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getPlayerRankByType', 'POST', paymentSystemKey)
}

function postPaymentGroupByPlayer (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getPlayerRankByPlayer', 'POST', paymentSystemKey)
}

function postProvince (reqData) {
    return postRequest(reqData, 'getProvince', 'POST')
}

function postProvinceList (reqData) {
    return postRequest(reqData, 'getProvinceList', 'POST')
}

function postCity (reqData) {
    return postRequest(reqData, 'getCity', 'POST')
}

function postCityList (reqData) {
    return postRequest(reqData, 'getCityList', 'POST')
}

function postDistrict (reqData) {
    return postRequest(reqData, 'getDistrict', 'POST')
}

function postDistrictList (reqData) {
    return postRequest(reqData, 'getDistrictList', 'POST')
}

function postPlatformAdd (reqData, paymentSystemKey) {
    return postRequest(reqData, 'platform', 'POST', paymentSystemKey)
}

function deletePlatformDelete (reqData, paymentSystemKey) {
    return postRequest(reqData, 'platform', 'DELETE', paymentSystemKey)
}

function patchPlatformUpdate (reqData, paymentSystemKey) {
    return postRequest(reqData, 'platform', 'PATCH', paymentSystemKey)
}

function postOnlineTopupType (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getOnlineTopupType', 'POST', paymentSystemKey)
}

function postMerchantInfo (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getMerchantInfo', 'POST', paymentSystemKey)
}

function postCreateOnlineTopup (reqData, paymentSystemKey) {
    return postRequest(reqData, 'requestOnlineMerchant', 'POST', paymentSystemKey)
}

function postDepositTypeByUsername (reqData, paymentSystemKey) {
    return postRequest(reqData, 'requestDepositTypeByUsername', 'POST', paymentSystemKey)
}

function postOnlineCashinList (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getOnlineCashinList', 'POST', paymentSystemKey)
}

function postCashinList (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getCashinList', 'POST', paymentSystemKey)
}

function postCashoutList (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getCashoutList', 'POST', paymentSystemKey)
}

function patchSubTopupTypePermission (reqData, paymentSystemKey) {
    return postRequest(reqData, 'playerTopupTypePermission', 'PATCH', paymentSystemKey);
}

function postBatchSubTopupTypePermission (reqData, paymentSystemKey) {
    return postRequest(reqData, 'batch/playerTopupTypePermission', 'POST', paymentSystemKey);
}

function postPMSWithdrawalProposal (reqData, paymentSystemKey) {
    return postRequest(reqData, 'getCashOutListByProposal', 'POST', paymentSystemKey);
}

function postCreateFixedTopUpProposal (reqData, paymentSystemKey) {
    return postRequest(reqData, 'requestFixedAmountMerchant', 'POST', paymentSystemKey);
}

module.exports = {
    getMinMax: getMinMax,
    getTopupLobbyAddress: getTopupLobbyAddress,
    postWithdraw: postWithdraw,
    patchTopupStatus: patchTopupStatus,
    postBatchTopupStatus: postBatchTopupStatus,
    postCancelTopup: postCancelTopup,
    postDelayTopup: postDelayTopup,
    postCreateTopup: postCreateTopup,
    postBankCardList: postBankCardList,
    postBankCard: postBankCard,
    postBankType: postBankType,
    postBankTypeList: postBankTypeList,
    postSyncPlatform: postSyncPlatform,
    postTopupForceMatch: postTopupForceMatch,
    postMerchantList: postMerchantList,
    postMerchantTypeList: postMerchantTypeList,
    postPaymentGroup: postPaymentGroup,
    postPaymentGroupByPlayer: postPaymentGroupByPlayer,
    postProvince: postProvince,
    postProvinceList: postProvinceList,
    postCity: postCity,
    postCityList: postCityList,
    postDistrict: postDistrict,
    postDistrictList: postDistrictList,
    postPlatformAdd: postPlatformAdd,
    deletePlatformDelete: deletePlatformDelete,
    patchPlatformUpdate: patchPlatformUpdate,
    postOnlineTopupType: postOnlineTopupType,
    postMerchantInfo: postMerchantInfo,
    postCreateOnlineTopup: postCreateOnlineTopup,
    postDepositTypeByUsername: postDepositTypeByUsername,
    postOnlineCashinList: postOnlineCashinList,
    postCashinList: postCashinList,
    postCashoutList: postCashoutList,
    patchSubTopupTypePermission: patchSubTopupTypePermission,
    postBatchSubTopupTypePermission: postBatchSubTopupTypePermission,
    postPMSWithdrawalProposal: postPMSWithdrawalProposal,
    postCreateFixedTopUpProposal: postCreateFixedTopUpProposal
};
