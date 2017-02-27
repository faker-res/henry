var db = db.getSiblingDB("admin");
db.system.users.remove({"_id": "playerdb.playersinonet"});

var db = db.getSiblingDB("playerdb");
db.createUser({user: "playersinonet", pwd: "passwordsinonet", roles: [{role: "readWrite", db: "playerdb"}]});
db.auth("playersinonet", "passwordsinonet");

db.platform.remove({});
db.gameProvider.remove({});