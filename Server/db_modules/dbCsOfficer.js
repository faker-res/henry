const dbconfig = require('./../modules/dbproperties');
var Q = require("q");

let dbCsOfficer = {

   createOfficer: function(platformId, name){
       return dbconfig.collection_csOfficer.findOne({platform: platformId, name: name}).lean().then(
           function (data) {
               if (data) {
                   return Promise.reject({
                       name: "DataError",
                       message: "Name already existed"
                   });
               }

               let newOfficer = dbconfig.collection_csOfficer({platform: platformId, name: name});
               return newOfficer.save().then().catch(err => errorSavingLog(err, adminActionRecordData));
           }
       );
   }

    ////



};

module.exports = dbCsOfficer;