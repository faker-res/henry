/******************************************************************
 *        Server
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

// Configurable inputs:
var totalPlayers = totalPlayers || arg1;
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
var documentNumber = totalPlayers;

db = db.getSiblingDB("admindb");
// If this fails, it is probably because the platform doesn't exist!
//playerLevel = playerLevel && ObjectId(playerLevel);
var playerLevel = playerLevel || db.playerLevel.findOne({platform: ObjectId(platformId)})._id;
print("Using playerLevel: " + playerLevel)
if (!playerLevel) {
    throw new Error("Please provide a valid platformId, which has at least one playerLevel defined.  (So that consumption return may be calculated.)");
}

var start = new Date();

var batchDocuments = new Array();
db = db.getSiblingDB("playerdb");
// We only count testStressPlayers here, because later consumption creation scripts need testStressPlayer{0,...,documentNumber} to exist.
var count = db.playerInfo.find({platform: ObjectId(platformId), name: /testStressPlayer.*/}).count();
var index = count;

// This will always add documentNumber players, regardless of how many we have already.
//documentNumber = index + documentNumber;

//This will ensure there are exactly documentNumber players in the DB.
if (count > documentNumber) {
    // -1 means we remove newer records first
    // That should mean we always have testStressPlayer0 ... testStressPlayer{documentNumber-1}
    var playerIdsToRemove = db.playerInfo.find({platform: ObjectId(platformId), name: /testStressPlayer.*/})
        .sort({registrationTime: -1})
        .limit(count - documentNumber)
        .toArray()
        .map(doc => doc._id);

    print("Removing:", playerIdsToRemove);
    db.playerInfo.remove({_id: {$in: playerIdsToRemove}});
}

var partners = db.partner.find({platform: ObjectId(platformId), partnerName: /testStressPartner.*/}).toArray();

print(partners.length);

while(index < documentNumber) {

    var playerName = "testStressPlayer"+index;

    //var parentName = "testStressPartner" + (index%partners.length);
    //var parent = db.partner.findOne({name: parentName});
    var partnerIndex = index%partners.length;

    var date = new Date(minDate.getTime() + Math.random() * delta);
    var value = Math.random();
    var document = {
        playerId: index,
        name: playerName,
        email: playerName+"@gmail.com",
        password: "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
        realName: playerName,
        registrationTime: new Date(),
        lastAccessTime: date,
        platform: ObjectId(platformId),
        playerLevel: playerLevel,
        validCredit: 0,
        partner: partners[partnerIndex]?partners[partnerIndex]._id:null
    };

    batchDocuments[index % batchNumber] = document;
    index++;
    if((index - count) % batchNumber == 0 || index === documentNumber) {
        db.playerInfo.insert(batchDocuments);
        batchDocuments = [];
        print('Inserted ' + index + ' playerInfos.');
    }
}

print('Inserted ' + (documentNumber-count) + ' / ' + documentNumber + ' players in ' + (new Date() - start)/1000.0 + 's');