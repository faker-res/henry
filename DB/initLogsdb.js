var db = db.getSiblingDB("admin");
db.system.users.remove({"_id": "logsdb.logsinonet"});

var db = db.getSiblingDB("logsdb");
db.createUser({user: "logsinonet", pwd: "passwordsinonet", roles: [{role: "readWrite", db: "logsdb"}]});
db.auth("logsinonet", "passwordsinonet");
