var db = db.getSiblingDB("admindb");

var games = db.game.find({}).toArray();
print('games.length:', games.length);

// TODO: Drop index on 'gameName'
//       Add index on 'name'

for (var i = 0; i < games.length; i++) {
    var game = games[i];
    //print('game._id:', game._id);
    //print('game.gameName:', game.gameName);
    //print('game.name:', game.name);
    if (game.gameName && !game.name) {
        db.game.update({_id: game._id}, {$set: {name: game.gameName}, $unset: {gameName: ''}});
    }
}
