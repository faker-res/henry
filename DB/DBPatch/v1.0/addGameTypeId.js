var db = db.getSiblingDB("admindb");

var docs = db.gameType.find().toArray();

for( var j = 0; j < docs.length; j++ ){
    var doc = docs[j];
    db.gameType.update({_id: doc._id}, { $set:{gameTypeId: doc.name} });
}

db.gameType.createIndex( { "gameTypeId": 1 }, { unique: true } );

