const ObjectId = require('mongoose').Types.ObjectId;
const dbconfig = require('./../modules/dbproperties');
const cursor = dbconfig.collection_proposal.find({"data.playerObjId": {$exists: true}}).cursor();

let i = 0;
cursor.eachAsync(
    proposalData => {
        if (proposalData.data && proposalData.data.playerObjId && typeof proposalData.data.playerObjId === 'string') {
            dbconfig.collection_proposal.findOneAndUpdate(
                {_id: proposalData._id, createTime: proposalData.createTime},
                {$set: {"data.playerObjId": ObjectId(proposalData.data.playerObjId)}}
            ).then();
        }
        console.log("index", i);
        i++;
    }
);




