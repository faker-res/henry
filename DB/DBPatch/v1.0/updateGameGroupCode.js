var db = db.getSiblingDB("admindb");

var docs = db.platformGameGroup.find().toArray();

for( var j = 0; j < docs.length; j++ ){
    var doc = docs[j];
    if (doc.code) {
        if( !isNaN(doc.code) ){
            db.platformGameGroup.update({_id: doc._id}, { $set:{code: Number(doc.code)} });
        }
    }
}