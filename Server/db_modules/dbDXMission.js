var dbUtil = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");

var dbDXMission = {

    /**
     * get a mission
     * @param {json} data - The data of the role. Refer to role schema.
     */
    getDxMission: function (){
      
    },
    createDxMission: function(){

    },
    updateDxMission: function(){

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
    }
};

module.exports = dbDXMission;
