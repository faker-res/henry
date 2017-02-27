/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var today = new Date();
today.setHours(0, 0, 0, 0);

var documentNumber = 0;
var batchNumber = 5 * 1000;

var platformId = arg1;
var topUpDays = arg2 || 1;

var start = new Date();

var batchDocuments = new Array();
var index = 0;

db = db.getSiblingDB("playerdb");
documentNumber = db.playerInfo.find({platform:  ObjectId(platformId)}).count();

while(index < documentNumber*topUpDays) {
    db = db.getSiblingDB("playerdb");
    var playerName = "testStressPlayer"+Math.floor(index/topUpDays);
    var playerCursor = db.playerInfo.find({"name": playerName});
    if( playerCursor ){
        var player = playerCursor.next();
        for( var i = 0; i < topUpDays; i++ ){
            var curDate = new Date();
            curDate.setHours(0, 0, 0, 0);
            curDate.setDate(today.getDate() - i);
            var value = Math.random();
            var document = {
                playerId: player._id,
                platformId: ObjectId(platformId),
                date: curDate,
                amount: 1000
            };
            batchDocuments[index % batchNumber] = document;
            index++;
            if(index % batchNumber === 0 || index === documentNumber*topUpDays) {
                db = db.getSiblingDB("logsdb");
                db.playerTopUpDaySummary.insert(batchDocuments);
                batchDocuments = [];
                print('Inserted ' + index + ' documents.');
            }
        }
    }
}

print('Inserted ' + documentNumber*topUpDays + ' in ' + (new Date() - start)/1000.0 + 's');