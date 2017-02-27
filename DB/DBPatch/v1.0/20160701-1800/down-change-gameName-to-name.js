/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var db = db.getSiblingDB("admindb");

var games = db.game.find({}).toArray();
print('games.length:', games.length);

// TODO: Drop index on 'name'
//       Add index on 'gameName'

for (var i = 0; i < games.length; i++) {
    var game = games[i];
    //print('game._id:', game._id);
    //print('game.gameName:', game.gameName);
    //print('game.name:', game.name);
    if (game.name && !game.gameName) {
        db.game.update({_id: game._id}, {$set: {gameName: game.name}, $unset: {name: ''}});
    }
}
