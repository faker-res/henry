var count = 0;
var dbArray = ['admin', 'admindb', 'logsdb', 'playerdb'];
for (var dbName in dbArray) {
    var db = db.getSiblingDB(dbArray[dbName]);
    var collectionNames = db.getCollectionNames();
    for (var i in collectionNames) {
        db[collectionNames[i]].find().forEach(function (data) {
            for (var k in data) {
                var value = String(data[k]).toLowerCase();
                var key = String(k).toLowerCase();
                if (key.indexOf('name') > -1 && value.indexOf('test') > -1) {
                    print('deleting: ', dbArray[dbName], '->', collectionNames[i], '->', '{', key, value, '}');
                    var query = {};
                    query[k] = data[k];
                    db[collectionNames[i]].remove(query);
                    count++;
                }
            }
        });
    }
}

print('total ' + count + ' deleted.');