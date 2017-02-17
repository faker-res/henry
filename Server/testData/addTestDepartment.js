var db = db.getSiblingDB("admindb");

db.department.remove({departmentName: {$ne: "admin"}});
db.role.remove({roleName: {$ne: "AdminRole"}});

db.department.insert(
    {
        "departmentName": "Game Company",
    }
);

var departmentCursor = db.department.find({"departmentName": "Game Company"});
var department = departmentCursor.next();

var level1Departments = ["Operation", "Development", "Maintenance"];
var level2OperationalDept = ["Marketing", "Customer Support"];
var level3CustSupportDept = ["China Support", "SG Support", "US Support", "Thai Support"];


// Creating Departments of level1 and add it's parent dept
for (var i = 0; i < level1Departments.length; i++) {
    db.department.insert(
        {
            "departmentName": level1Departments[i],
            "parent": department._id,
            roles: []
        }
    );
}

// Level 1 - admin staff names
var adminStaffNames = [
    //Operation Staff
    ["Wilson", "Julian Tan", "Stanley See", "Chow Keng Choon"],
    //Development Staff
    ["Judy Wong", "Jimmy Lee", "Wendy Ng", "Sushijan"],
    //Maintenance Staff
    ["Antony", "Happiness", "Alice", "Patricia"]
];

// Adding roles to Level 1 departments and creating an admin user in each role
for (var i = 0; i < level1Departments.length; i++) {

    var name = level1Departments[i];
    var curDeptCursor = db.department.find({"departmentName": name});
    var curDept = curDeptCursor.next();
    var roles = [name + "_Member", name + "_TeamLeader", name + "_Manager", name + "_SuperManager"];
    var roleIds = [];
    for (var k = 0; k < roles.length; k++) {
        db.role.insert(
            {
                "roleName": roles[k],
                "departments": [curDept._id]
            }
        );
        var curRoleCursor = db.role.find({"roleName": roles[k]});
        var curRole = curRoleCursor.next();
        roleIds.push(curRole._id);

        generateAdminUser(adminStaffNames[i][k], curDept._id, curRole._id);
        var adminCursor = db.adminInfo.find({"adminName": adminStaffNames[i][k]});
        var curAdminCursor = adminCursor.next();
        db.department.update({_id: curDept._id}, {$addToSet: {users: curAdminCursor._id}});
        db.role.update({_id: curRole._id}, {$addToSet: {users: curAdminCursor._id}});
    }
    db.department.update({_id: curDept._id}, {$addToSet: {roles: {$each: roleIds}}});

}


// Creating Departments of level2 and add its parent dept
var operationDeptCursor = db.department.find({"departmentName": "Operation"});
var operationDept = operationDeptCursor.next();
for (var i = 0; i < level2OperationalDept.length; i++) {
    db.department.insert(
        {
            "departmentName": level2OperationalDept[i],
            "parent": operationDept._id,
            roles: []
        }
    );
}
// Creating Departments of level3 and add its parent dept
var custSupportCursor = db.department.find({"departmentName": "Customer Support"});
var custSupportDept = custSupportCursor.next();
for (var i = 0; i < level3CustSupportDept.length; i++) {
    db.department.insert(
        {
            "departmentName": level3CustSupportDept[i],
            "parent": custSupportDept._id,
            roles: []
        }
    );

}


// Adding Children to Company Name (Top Level) //
for (var i = 0; i < level1Departments.length; i++) {
    var name = level1Departments[i];
    var curDeptCursor = db.department.find({"departmentName": name});
    var curDept = curDeptCursor.next();

    db.department.update({departmentName: "Game Company"}, {$addToSet: {children: [curDept._id]}});
}


// The  admin names of Level 2 dept
var adminName = [
    //Marketing Staff
    ["Mike", "James", "Kah Young Sue", "Hari"],
    //Customer Support Staff
    ["Zhihai", "Mary", "Erin Houng", "Sagar"]
];
// Adding Children of level 1 dept (Its children are level2)  and  creating roles and create an admin in each role //
// Add the created adminuser to roles and dept collection
// update the department wih roles created
for (var i = 0; i < level2OperationalDept.length; i++) {
    var name = level2OperationalDept[i];
    var curDeptCursor = db.department.find({"departmentName": name});
    var curDept = curDeptCursor.next();

    db.department.update({departmentName: "Operation"}, {$addToSet: {children: [curDept._id]}});
    var roles = [name + "_Member", name + "_TeamLeader", name + "_Manager", name + "_SuperManager"];

    var roleIds = [];
    for (var k = 0; k < roles.length; k++) {
        db.role.insert(
            {
                "roleName": roles[k],
                "departments": [curDept._id],
                //"actions": {"all": true},
                "views": {"all": true}
            }
        );
        var curRoleCursor = db.role.find({"roleName": roles[k]});
        var curRole = curRoleCursor.next();
        roleIds.push(curRole._id);

        generateAdminUser(adminName[i][k], curDept._id, curRole._id);
        var adminCursor = db.adminInfo.find({"adminName": adminName[i][k]});
        var curAdminCursor = adminCursor.next();
        db.department.update({_id: curDept._id}, {$addToSet: {users: curAdminCursor._id}});
        db.role.update({_id: curRole._id}, {$addToSet: {users: curAdminCursor._id}});

    }
    db.department.update({_id: curDept._id}, {$addToSet: {roles: {$each: roleIds}}});
}


// The  admin names of Level 3 dept (Customer Support)
var adminUserNames = [
    // China Support
    ["Steven Sim", "John Lim", "Ben Lim", "Hoacheng Tan"],
    // SG Support
    ["Shirlynn", "Vincent", "David", "Lizhu"],
    // US Support
    ["Tharana", "Noopur", "Derek", "Huang Xiaoli"],
    // Thai Support
    ["He Tengfei", "Mark Foo", "Theresa", "Melissa"]
];

// Adding Children of level 2 dept (Its children are level3)  and creating roles and create an admin in each role //
// Add the created adminuser to roles and dept collection
// update the department wih roles created
for (var i = 0; i < level3CustSupportDept.length; i++) {
    var name = level3CustSupportDept[i];
    var curDeptCursor = db.department.find({"departmentName": name});
    var curDept = curDeptCursor.next();

    db.department.update({departmentName: "Customer Support"}, {$addToSet: {children: [curDept._id]}});

    var roles = [name + "_Member", name + "_TeamLeader", name + "_Manager", name + "_SuperManager"];
    var roleIds = [];
    for (var k = 0; k < roles.length; k++) {
        db.role.insert(
            {
                "roleName": roles[k],
                "departments": [curDept._id],
                //"actions": {"all": true},
                "views": {"all": true}
            }
        );
        var curRoleCursor = db.role.find({"roleName": roles[k]});
        var curRole = curRoleCursor.next();
        roleIds.push(curRole._id);

        generateAdminUser(adminUserNames[i][k], curDept._id, curRole._id);

        var adminCursor = db.adminInfo.find({"adminName": adminUserNames[i][k]});
        var curAdminCursor = adminCursor.next();
        db.department.update({_id: curDept._id}, {$addToSet: {users: curAdminCursor._id}});
        db.role.update({_id: curRole._id}, {$addToSet: {users: curAdminCursor._id}})

    }
    db.department.update({_id: curDept._id}, {$addToSet: {roles: {$each: roleIds}}});
}


// Generate Admin User
function generateAdminUser(adminName, dept, role) {

    var adminName = adminName;
    db.adminInfo.remove({"adminName": adminName});
    db.adminInfo.insert({
        "adminName": adminName,
        "email": adminName + "@gmail.com",
        "firstName": adminName,
        "password": "cBstx0Upq2d341b07b3ee41691e2512abb291eaf5", // password is 123
        salt: "cBstx0Upq",
        "accountStatus": 1,
        "departments": [dept],
        roles: [role]
    });
}

print("create test department data successfully!")