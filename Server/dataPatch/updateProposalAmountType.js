var env = require("../config/env").config();
var dbconfig = require("../modules/dbproperties");

var property = ['amount', 'rewardAmount', "topUpAmount"];

property.forEach(
    pro => {
        var queryParam = "data."+pro;
        var queryObj = {};
        queryObj[queryParam] = {$type: 2};
        const cursor = dbconfig.collection_proposal.find(queryObj).cursor();
        var i = 0;
        cursor.eachAsync(proposalData => {
            if(proposalData.data && proposalData.data.amount != null){
                var updateObj = {};
                updateObj[queryParam] = Number(proposalData.data[pro]);
                // console.log(updateObj);
                dbconfig.collection_proposal.findOneAndUpdate(
                    {_id: proposalData._id, createTime: proposalData.createTime},
                    updateObj
                ).then();
            }
            console.log("index", i, pro);
            i++;
        });
    }
);




