/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

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
                updateObj[queryParam] = parseInt(proposalData.data[pro]);
                dbconfig.collection_proposal.findOneAndUpdate(
                    {_id: proposalData._id, createTime: proposalData.creaeteTime},
                    updateObj
                );
            }
            console.log("index", i, pro);
            i++;
        });
    }
);




