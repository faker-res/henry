var docs = db.playerInfo.aggregate(
    [
        {
            $match: {
                platform: ObjectId("5733e26ef8c8a9355caf49d8")
            }
        },
        {
            $group: {
                _id: {playerId: "$playerId"},   // replace `name` here twice
                uniqueIds: {$addToSet: "$_id"},
                count: {$sum: 1}
            }
        },
        {
            $match: {
                count: {$gte: 2}
            }
        },
        {$sort: {count: -1}},
        {$limit: 10}
    ]
);

for (var i = 0; i < docs._batch.length; i++) {
    var doc = docs._batch[i];
    var playerId = "e" + doc._id.playerId;
    //print(doc);
    //print(doc._id.playerId);
    db.playerInfo.update({_id: doc.uniqueIds[0]}, {$set: {playerId: playerId}});
}