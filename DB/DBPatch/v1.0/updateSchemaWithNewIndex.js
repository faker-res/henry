var db = db.getSiblingDB("admindb");

var schemas = ["platform", "game", "gameProvider", "gameType"];
var fieldNames = ["platformId", "gameId", "providerId", "name"];

for( var i = 0; i < schemas.length; i++ ){
    var schemaName = schemas[i];
    var docs = db[schemaName].find().toArray();

    for( var j = 0; j < docs.length; j++ ){
        var doc = docs[j];
        var fieldName = fieldNames[i];
        db[schemaName].update({_id: doc._id}, { $set:{code: doc[fieldName]} });
    }

    db[schemaName].createIndex( { "code": 1 }, { unique: true } )
}


