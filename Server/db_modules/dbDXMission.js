var dbUtil = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbPlayerInfo = require("./../db_modules/dbPlayerInfo");

var dbDXMission = {

    /**
     * get a mission
     * @param {json} data - The data of the role. Refer to role schema.
     */
    getDxMission: function (id){
        return dbconfig.collection_dxMission.find({'_id':id});
    },
    createDxMission: function(){
        var dxMission = new dbconfig.collection_dxMission(data);
        return dxMission.save();
    },
    updateDxMission: function(){
        return dbconfig.collection_dxMission.findOneAndUpdate(
            {_id: data._id},
            data
        );
    },

    getTeleMarketingOverview: function(platform, query, index, limit, sortCol){
        // limit = limit ? limit : 20;
        // index = index ? index : 0;
        // query = query ? query : {};
        //
        // let startDate = new Date(query.start);
        // let endDate = new Date(query.end);
        // let result = [];
        // let matchObj = {
        //     platform: platform,
        //     createTime: {$gte: startDate, $lt: endDate},
        // };
        //
        // if(query.name){
        //     matchObj.name = query.name;
        // }
        //
        // return dbconfig.collection_dxMission.find(matchObj).then(
        //     missionDetails => {
        //         if(missionDetails){
        //             return missionDetails;
        //         }
        //     }
        // );

        // if ((query.consumptionTimesValue || Number(query.consumptionTimesValue) === 0) && query.consumptionTimesOperator) {
        //     let relevant = true;
        //     switch (query.consumptionTimesOperator) {
        //         case '>=':
        //             relevant = result.consumptionTimes >= query.consumptionTimesValue;
        //             break;
        //         case '=':
        //             relevant = result.consumptionTimes == query.consumptionTimesValue;
        //             break;
        //         case '<=':
        //             relevant = result.consumptionTimes <= query.consumptionTimesValue;
        //             break;
        //         case 'range':
        //             if (query.consumptionTimesValueTwo) {
        //                 relevant = result.consumptionTimes >= query.consumptionTimesValue && result.consumptionTimes <= query.consumptionTimesValueTwo;
        //             }
        //             break;
        //     }
        //
        //     if (!relevant) {
        //         return "";
        //     }
        // }
    },

    createPlayerFromCode: function (code, deviceData, domain) {
        if (!code) {
            return Promise.reject({
                errorMessage: "Invalid code for creating player"
            });
        }
        var dxPhone = {};
        var dxMission = {};

        return dbconfig.collection_dxPhone.findOne({
            code: code,
            bUsed: false,
        }).populate({path: "dxMission", model: dbconfig.collection_dxMission}).lean().then(
            function (phoneDetail) {
                if (!phoneDetail) {
                    return Promise.reject({
                        errorMessage: "Invalid code for creating player"
                    });
                }

                if (!phoneDetail.dxMission) {
                    phoneDetail.dxMission = {
                        loginUrl: "eu99999.com",
                        // creditAmount: "50",
                        // password: "888888",
                        playerPrefix: "test",
                    };
                }

                if (!phoneDetail.dxMission.lastXDigit instanceof Number) {
                    phoneDetail.dxMission.lastXDigit = 5;
                }

                // todo :: handle what happen when player name already exist (e.g. case where another phone number have the same last X digits)
                var playerName = phoneDetail.phoneNumber.slice(-(phoneDetail.dxMission.lastXDigit));

                var playerData = {
                    platform: phoneDetail.platform,
                    name: (phoneDetail.dxMission.prefix || "") + (playerName),
                    password: phoneDetail.dxMission.password || "888888",
                    isTestPlayer: false,
                    isRealPlayer: true,
                    isLogin: true,
                    phoneNumber: phoneDetail.phoneNumber,
                };

                if (deviceData) {
                    playerData = Object.assign({}, playerData, deviceData);
                }

                if (domain) {
                    playerData.domain = domain;
                }

                dxPhone = phoneDetail;
                dxMission = phoneDetail.dxMission;
                return dbPlayerInfo.createPlayerInfo(playerData, true, true);
            }
        ).then(
            function (playerData) {
                var profile = {name: playerData.name, password: playerData.password};
                var token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});

                if (!dxMission.loginUrl) {
                    dxMission.loginUrl = "localhost:3000";
                }

                // todo :: 自动申请优惠，额度和锁定组根据dxMission处理

                // todo :: 发欢迎站内信给此玩家，标题和内容根据dxMission处理

                return {
                    redirect: dxMission.loginUrl + "?token=" + token
                }
            }
        );
    },

};

module.exports = dbDXMission;
