var db = db.getSiblingDB("admin");

db.system.users.remove({"_id": "admindb.adminsinonet"});

var db = db.getSiblingDB("admindb");

db.createUser({user: "adminsinonet", pwd: "passwordsinonet", roles: [{role: "readWrite", db: "admindb"}]});
db.auth("adminsinonet", "passwordsinonet");

db.adminInfo.remove({});
db.department.remove({});
db.role.remove({});

db.role.remove({"roleName": "AdminRole"});
db.role.insert({"roleName": "AdminRole", views: {"all": true}});
var adminRoleCursor = db.role.find({"roleName": "AdminRole"});
var adminRole = adminRoleCursor.next();

db.department.remove({"departmentName": "admin"});
db.department.insert({"departmentName": "admin", "roles": [adminRole._id]});
var departmentCursor = db.department.find({"departmentName": "admin"});
var department = departmentCursor.next();

db.role.update({_id: adminRole._id}, {$set: {departments: [department._id]}});

db.adminInfo.remove({"adminName": "admin"});
db.adminInfo.insert({
    "adminName": "admin",
    "email": "admin@sino.sg",
    "password": "iyK9wBC8V857164b883c822a8d6e81ef5df11855b",
    "firstName": "admin",
    "lastName": "admin",
    "country": "1",
    "region": "3",
    "salt": "iyK9wBC8V",
    "departments": [department._id],
    "roles": [adminRole._id]
});
var adminUserCursor = db.adminInfo.find({"adminName": "admin"});
var adminUser = adminUserCursor.next();

db.department.update({_id: department._id}, {$set: {users: [adminUser._id]}});
db.role.update({_id: adminRole._id}, {$set: {users: [adminUser._id]}});

db.apiUser.remove({"name":"testApiUser"});
db.apiUser.insert({
    "name": "testApiUser",
    "password": "$2a$10$txa4.CbYMPCT3UF8Zcbbxe6RKai8D5kh0fp5QEh/2U2O995qosMfy"
});

