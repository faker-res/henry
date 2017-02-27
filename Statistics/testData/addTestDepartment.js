var db = db.getSiblingDB("admindb");

db.department.remove({departmentName: {$ne: "admin"}});
db.role.remove({roleName: {$ne: "AdminRole"}});

db.department.insert(
    {
        "departmentName": "NinjaPandaStudio",
    }
);

var departmentCursor = db.department.find({"departmentName": "NinjaPandaStudio"});
var department = departmentCursor.next();

var level1Departments = ["Software", "Sales", "Finance", "HR", "Customer Support", "Operation"];
for(var i = 0; i < level1Departments.length; i++) {
    db.department.insert(
        {
            "departmentName": level1Departments[i],
            "parent": department._id,
            roles: []
        }
    );
}

for(var i = 0; i < level1Departments.length; i++) {
    var name = level1Departments[i];
    var curCursor = db.department.find({"departmentName": name});
    var cur = curCursor.next();

    db.department.update({_id: department._id}, {$addToSet: {children: [cur._id]}});

    var roles = [name+"_Member", name+"_TeamLeader", name+"_Manager", name+"_SuperManager"];
    var roleIds = [];
    for (var k = 0; k < roles.length; k++) {
        db.role.insert(
            {
                "roleName": roles[k],
                "departments": [cur._id]
            }
        );
        var curRoleCursor = db.role.find({"roleName": roles[k]});
        var curRole = curRoleCursor.next();
        roleIds.push(curRole._id);
    }
    db.department.update({_id: cur._id}, {$addToSet: {roles: {$each: roleIds}}});

    var cur1Departments = [name+"1", name+"2", name+"3"];
    for (var j = 0; j < cur1Departments.length; j++) {
        db.department.insert(
            {
                "departmentName": cur1Departments[j],
                "parent": cur._id,
            }
        );

        var newCursor = db.department.find({"departmentName": cur1Departments[j]});
        var newDep = newCursor.next();
        db.department.update({_id: cur._id}, {$addToSet: {children: [newDep._id]}});
    }
}

print("create test department data successfully!");