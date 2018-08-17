var db = db.getSiblingDB("admindb");

var idcIps = db.idcIp.find().toArray();

for (var i = 0; i < idcIps.length; i++) {
    var thisObj = idcIps[i];
    var thisObjId = thisObj._id;
    thisObj.ip_start_num = ip2int(thisObj.ip_start);
    thisObj.ip_end_num = ip2int(thisObj.ip_end);
    delete thisObj._id;

    db.idcIp.update({_id: thisObjId}, thisObj);
}

function ip2int(ip) {
    return ip.split('.').reduce(function(ipInt, octet) { return (ipInt<<8) + parseInt(octet, 10)}, 0) >>> 0;
}