var db = db.getSiblingDB("logsdb");
var count = 0;
db.proposal.aggregate([
        {
            $match: {
                type: ObjectId("59539560e52ba1001e29458f"),
                createTime: {$gte: ISODate("2018-01-15T12:27:44.114Z"), $lt: ISODate("2018-01-15T12:35:44.114Z")},
                "data.rewardAmount": {$gt: 0}
            },
        },
        {
            $group: {
                _id: {playerName: "$data.playerName"},
                proposalId: {$first: "$proposalId"}
            }
        }
    ]
).map(function (record, index) {
    count++;
    var pro = db.proposal.findOne({proposalId: record.proposalId});
    var prop = db.proposalProcess.findOne({_id: pro.process});
    var curStep = prop.steps[0];
    db.proposalProcess.update({_id: prop._id}, {$set: {currentStep: curStep, status: "Pending"}});
    db.proposalProcessStep.update({_id: curStep}, {$set: {status: "Pending"}});
});

print(count);
