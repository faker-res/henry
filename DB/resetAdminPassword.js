var db = db.getSiblingDB("admindb");

db.adminInfo.update({
    "adminName": "admin",
    "email": "admin@sino.sg",
}, {
    $set: {
        "password": "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
        "salt": "iyK9wBC8V",
    }
});
