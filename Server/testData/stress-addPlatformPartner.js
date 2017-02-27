/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

// Configurable inputs:
var totalPartners = totalPartners || arg1;
var platformId = platformId || arg2;
//var arg3;
//var playerLevel = playerLevel || arg3;

var minDate = new Date();
minDate.setHours(0, 0, 0, 0);
minDate.setDate(minDate.getDate() - 1);
var maxDate = new Date();
maxDate.setHours(0, 0, 0, 0);
var delta = maxDate.getTime() - minDate.getTime();

var batchNumber = 5*1000;

db = db.getSiblingDB("admindb");
// If this fails, it is probably because the platform doesn't exist!
var partnerLevel = partnerLevel || db.partnerLevel.findOne({platform: ObjectId(platformId)})._id;
print("Using partnerLevel: " + partnerLevel)
if (!partnerLevel) {
    throw new Error("Please provide a valid platformId, which has at least one partnerLevel defined.  (So that consumption return may be calculated.)");
}

var start = new Date();

var batchDocuments = new Array();
db = db.getSiblingDB("playerdb");
// We only count testStressPlayers here, because later consumption creation scripts need testStressPlayer{0,...,documentNumber} to exist.
var count = 0;//db.partner.find({platform: ObjectId(platformId), name: /testStressPartnerLevel1.*/}).count();
var index = count;

var childrenNum = 3;

//create level 1 partner
var level1Count = index + totalPartners;
while(index < level1Count) {
    var partnerName = "testStressPartner"+index;

    var date = new Date(minDate.getTime() + Math.random() * delta);
    var value = Math.random();
    var document = {
        partnerId: index,
        partnerName: partnerName,
        email: partnerName+"@gmail.com",
        password: "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
        realName: partnerName,
        platform: ObjectId(platformId),
        level: partnerLevel,
        credits: 0
    };

    batchDocuments[index % batchNumber] = document;
    index++;
    if((index - count) % batchNumber == 0 || index === level1Count) {
        db.partner.insert(batchDocuments);
        batchDocuments = [];
        print('Inserted ' + index + ' testStressPartner level1');
    }
}

//create level 2 partner
var level2Count = index + totalPartners*childrenNum;
var level1Index = 0;
while(index < level2Count) {

    var parentName = "testStressPartner" + level1Index;
    var parentId = db.partner.findOne({partnerName: parentName})._id;

    for( var i = 0; i < childrenNum; i++ ) {
        var partnerName = "testStressPartner" + index;
        var date = new Date(minDate.getTime() + Math.random() * delta);
        var value = Math.random();
        var document = {
            partnerId: index,
            partnerName: partnerName,
            email: partnerName + "@gmail.com",
            password: "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
            realName: partnerName,
            platform: ObjectId(platformId),
            level: partnerLevel,
            credits: 0,
            parent: parentId
        };

        batchDocuments[index % batchNumber] = document;
        index++;

        if ((index - level1Count) % batchNumber == 0 || index === level2Count) {
            db.partner.insert(batchDocuments);
            batchDocuments = [];
            print('Inserted ' + index + ' testStressPartner level2');
        }
    }

    level1Index++;
}

for(var i = 0; i < level1Count; i++){
    var parentName = "testStressPartner" + i;
    var parent = db.partner.findOne({partnerName: parentName});

    var childrenId = db.partner.find({parent: parentId}, {_id: 1}).toArray();
    var children = [];
    for( var j = 0; j < childrenId.length; j++ ){
        children.push( childrenId[j]._id );
    }
    //print(parent._id, partner.platform);
    //print(children.length);
    db.partner.findOneAndUpdate( {_id: parent._id, platform: parent.platform}, {$set:{children: children}} );
}



