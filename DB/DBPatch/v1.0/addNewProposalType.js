/*
 * how to use:
 * mongo --eval "var type='PlayerTopUpReturnGroup';" addNewProposalType.js
 */

var db = db.getSiblingDB("admindb");

var typeName = type || arg1;

var platforms = db.platform.find().toArray();

for (var i = 0; i < platforms.length; i++) {
    var processData = {
        platformId: platforms[i]._id,
        name: typeName,
        steps: []
    };

    db.proposalTypeProcess.insert(processData);
}

for (var i = 0; i < platforms.length; i++) {
    var processId = db.proposalTypeProcess.findOne({platformId: platforms[i]._id, name: typeName})._id;
    var typeData = {
        platformId: platforms[i]._id,
        name: typeName,
        process: processId,
        executionType: "execute" + typeName,
        rejectionType: "reject" + typeName
    };

    db.proposalType.insert(typeData);
}







