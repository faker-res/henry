/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var db = db.getSiblingDB("admindb");

var docs = db.platform.find().toArray();

for( var j = 0; j < docs.length; j++ ){
    var doc = docs[j];
    if (!doc.name) {
        var name = doc.platformName || 'Platform ' + Math.round(Math.random() * 100000);
        db.platform.update({_id: doc._id}, { $set:{name: name} });
    }
}

db.platform.dropIndex("platformName");
db.platform.dropIndex("platformName_1");
db.platform.createIndex( { "name": 1 }, { unique: true } );
