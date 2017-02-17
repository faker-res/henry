/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var db = db.getSiblingDB("admindb");

db.counter.remove({_id: "playerId"});
db.counter.insert(
    {
        _id: "playerId",
        seq: Math.floor(100000 + Math.random()*900000)
    }
);

db.counter.remove({_id: "platformId"});
db.counter.insert(
    {
        _id: "platformId",
        seq: 1
    }
);

db.counter.remove({_id: "providerId"});
db.counter.insert(
    {
        _id: "providerId",
        seq: 1
    }
);

db.counter.remove({_id: "gameId"});
db.counter.insert(
    {
        _id: "gameId",
        seq: 1
    }
);

db.counter.remove({_id: "partnerId"});
db.counter.insert(
    {
        _id: "partnerId",
        seq: 1
    }
);

db.counter.remove({_id: "proposalId"});
db.counter.insert(
    {
        _id: "proposalId",
        seq: 1
    }
);

db.counter.remove({_id: "apiUserId"});
db.counter.insert(
    {
        _id: "apiUserId",
        seq: 1
    }
);

db.counter.remove({_id: "channelId"});
db.counter.insert(
    {
        _id: "channelId",
        seq: 1
    }
);

db.counter.remove({_id: "manualTopUpRequestId"});
db.counter.insert(
    {
        _id: "manualTopUpRequestId",
        seq: 5    // Date.now()
    }
);

db.counter.remove({_id: "transferId"});
db.counter.insert(
    {
        _id: "transferId",
        seq: 1000000000000000000
    }
);