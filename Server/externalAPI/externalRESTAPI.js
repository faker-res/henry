const externalRESTAPI = {
    // FUKUAIPAY Services
    payment_FKP_TopUp: function (data) {
        return callFKPAPI("connection", "login", data);
    },
};

module.exports = externalRESTAPI;

function callFKPAPI(data) {
    // MIGHT NEED TO MOVE
    let FKPUrl = 'https://api.fukuaipay.com/gateway/bank';

    if (!data) {
        return Promise.reject(new Error("Invalid data!"));
    }

    $.ajax(
        {
            type: 'post',
            data: data,
            url: FKPUrl,
            timeout: 5000
        }
    ).done(
        data => {
            console.log('callFKPAPI data', data);
        }
    ).fail(
        error => {
            console.log('callFKPAPI error', error);
        }
    );
};