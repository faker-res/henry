/******************************************************************
 *        Server
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

// Configurable inputs:
var platformId = platformId || arg1;
var gameId = gameId || arg2;
var topUpTimes = Math.max(topUpTimes || arg3, 1);
var playersWithTopUp;   // Default: all players get top up records

var minDate = new Date();
minDate.setHours(0, 0, 0, 0);
minDate.setDate(minDate.getDate() - 1);
var maxDate = new Date();
maxDate.setHours(0, 0, 0, 0);
//maxDate.setDate(maxDate.getDate() + 1);
var delta = maxDate.getTime() - minDate.getTime();

var documentNumber = 0;
var batchNumber = 10 * 1000;

var gameType = ["Card", "Casual"];
var topUpAmount = 25;

var start = new Date();

var batchDocuments = new Array();
var index = 0;

db = db.getSiblingDB("playerdb");
documentNumber = db.playerInfo.find({platform: ObjectId(platformId)}).count();

playersWithTopUp = playersWithTopUp || documentNumber;

while(index < playersWithTopUp * topUpTimes) {
    db = db.getSiblingDB("playerdb");
    var playerName = "testStressPlayer"+Math.floor(index/topUpTimes);
    var playerCursor = db.playerInfo.find({"name": playerName});
    if( playerCursor ){
        var player = playerCursor.next();
        for( var i = 0; i < topUpTimes; i++ ){
            // var date = new Date(minDate.getTime() + Math.random() * delta);
            var date = new Date(minDate.getTime() + delta * ( (i-1) / topUpTimes ));
            var value = Math.random();
            var document = {
                playerId: player._id,
                platformId: ObjectId(platformId),
                amount: topUpAmount,
                createTime: date,
                paymentId: "testPayment",
                currency: "USD",
                topUpType: "VISA"
            };
            batchDocuments[index % batchNumber] = document;
            index++;
            if(index % batchNumber === 0 || index === playersWithTopUp * topUpTimes) {
                db = db.getSiblingDB("logsdb");
                db.playerTopUpRecord.insert(batchDocuments);
                batchDocuments = [];
                print('Inserted ' + index + ' playerTopUpRecords.');
            }
        }

    }
}

print('Inserted ' + index + ' playerTopUpRecords in ' + (new Date() - start)/1000.0 + 's');
