"use strict";
const request = require('request');
const env = require("../config/env").config();
const hostUrl = env.m1chatApiUrl;
const appId = env.m1chatAppId;
const recipients = env.providerTimeoutNotificationM1chatUserRecipient;

let getToken = function () {
    let corpId = env.m1chatCorpId;
    let corpSecret = env.m1chatCorpSecret;
    return new Promise((resolve,reject)=>{
        let requestUrl = `${hostUrl}gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
        request(requestUrl, { json: true}, (err, res, body) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            if (body) {
                resolve(body);
            }
        })
    });
};
let m1chatAPI = {
    send: function(message)
    {
        return getToken().then(data => {
            let token = data.access_token;
            let requestUrl = `${hostUrl}message/send?access_token=${token}`;
            let sendQuery = {
                access_token: token,
                appid: appId,
                to_users: recipients,
                // to_depts:['268436041'],
                type: 'text',
                message: message
            };
            request.post({url: requestUrl, body: sendQuery, json: true}, (err, res, body) => {
                if (err) {
                }
            })
        });
    }
};

module.exports = m1chatAPI;