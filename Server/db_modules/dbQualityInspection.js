var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbUtil = require('./../modules/dbutility');
var mysql = require("mysql");
const constQualityInspectionStatus = require('./../const/constQualityInspectionStatus');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var dbQualityInspection = {
    connectMysql: function(){
        var connection = mysql.createConnection({
            host     : '203.192.151.12',
            user     : 'devselect',
            password : '!Q&US3lcT18',
            database : 'live800_im',
            port: '3320'
        });
        return connection;
    },
    searchLive800: function (query) {
        let conversationForm = [];
        let queryObj = "";
        //companyIds;
        //live800Accs
        console.log(query);
        if (query.companyId&&query.companyId.length > 0) {
           let companyId = query.companyId.join(',');
            // queryObj += " company_id=" + query.companyId + " AND ";
            queryObj += " company_id IN ('" + companyId + "') AND ";
        }
        if (query.operatorId) {
            let operatorId = query.operatorId.join(',');
            queryObj += " operator_id IN ('" + operatorId + "') AND ";
        }
        if (query.startTime && query.endTime) {
            // queryObj += " store_time BETWEEN CAST('2018-01-16 00:00:00' as DATETIME) AND CAST('2018-01-16 00:05:00' AS DATETIME)";
            queryObj += " store_time BETWEEN CAST('"+query.startTime+"' as DATETIME) AND CAST('"+query.endTime+"' AS DATETIME)";
        }
        console.log(queryObj);
        if(query.status!='all'){
            let dbResult = dbQualityInspection.searchMongoDB(query);
            let result = dbQualityInspection.getMySQLConversation(dbResult,query);
            conversationForm = dbQualityInspection.fillContent(result);
        }else{
            let connection = dbQualityInspection.connectMysql();
            connection.connect();
            let dbResult = dbQualityInspection.searchMySQLDB(queryObj,connection);
            let mongoResult = dbQualityInspection.getMongoCV(dbResult);
            conversationForm = dbQualityInspection.resolvePromise(mongoResult);
        }
        return conversationForm;
    },
    searchMongoDB:function(query){
        let queryQA = {};
        if (query.status){
            queryQA.status = query.status;
        }
        if (query.startTime && query.endTime) {
            queryQA.createTime = {'$lte':new Date(query.endTime),
            '$gte': new Date(query.startTime)}
        }
        if(query.fpmsAcc && query.fpmsAcc.length > 0){
            queryQA.fpmsAcc = {'$in':query.fpmsAcc};
        }
        if (query.operatorId && query.operatorId.length > 0) {
            queryQA.live800Acc = { id:{ '$in':query.operatorId}}
        }
        if(query.companyId && query.companyId.length > 0 ){
            queryQA.companyId = {'$in':query.companyId};
        }
        return dbconfig.collection_qualityInspection.find(queryQA).lean()
            .then(results => {
                console.log(results);
                results.forEach(item => {
                    let live800Chat = {conversation: []};
                    live800Chat.messageId = item.msg_id;
                    live800Chat.status = item.status;
                    live800Chat.qualityAssessor = item.qualityAssessor;
                    live800Chat.fpmsAcc = item.fpmsAcc;
                    live800Chat.processTime = item.processTime;
                    live800Chat.appealReason = item.appealReason;
                    live800Chat.conversation = item.conversation;
                    live800Chat.companyId = item.companyId;
                    return live800Chat;
                });
                return results;
            })
    },
    fillContent: function(data){
        let deferred = Q.defer();
        let combineData = [];

        Q.all(data).then(results => {
            let mongoData = results.mongo;
            let mysqlData = results.mysql;

            mongoData.forEach(item => {
                let cData = {}
                cData = item;
                let mysqlCV = mysqlData.filter(sqlItem => {
                    return sqlItem.messageId == item.messageId;
                })
                if (mysqlCV.length > 0) {
                    let conversation = mysqlCV[0].conversation;
                    item.conversation.forEach(cv => {
                        let overrideCV = conversation.filter(mycv => {
                            return cv.time == mycv.time;
                        })
                        if (overrideCV.length > 0) {
                            cv.content = overrideCV[0].content;
                        }
                    })
                }

                combineData.push(item);
            });
            deferred.resolve(combineData);
        })
        return deferred.promise;
    },
    getMySQLConversation: function(sqlResult, queryObj){
        let deferred = Q.defer();

        Q.all(sqlResult).then(results => {
            let msgIds = []
            results.forEach(item => {
                msgIds.push(item.messageId);
            });
            if (msgIds.length > 0) {
                let condition = msgIds.join(',');
                let timeQuery = " store_time BETWEEN CAST('"+queryObj.startTime+"' as DATETIME) AND CAST('"+queryObj.endTime+"' AS DATETIME)";
                let query = timeQuery + " AND msg_id IN (" + condition + ")"
                let connection = dbQualityInspection.connectMysql();
                connection.connect();
                let dbData = dbQualityInspection.searchMySQLDB(query, connection);
                return Q.all(dbData).then(dbResult => {
                    let reformatData = [];
                    dbResult.forEach(item => {
                        let dData = {};
                        dData.messageId = item.msg_id;
                        let conversation = dbQualityInspection.conversationReformat(item.content);
                        dData.conversation = conversation;
                        reformatData.push(dData);
                    })
                    let cv = {
                        mongo: results,
                        mysql: reformatData
                    }
                    deferred.resolve(cv);
                })
            }
        })
        return deferred.promise;
    },
    resolvePromise: function(results){
      let deferred = Q.defer();
      Q.all(results).then(data=>{
        deferred.resolve(data);
      })
      return deferred.promise;
    },
    conversationReformat:function(myContent){
            let dom = new JSDOM(myContent);
            let content = [];
            let sys = dom.window.document.getElementsByTagName("sys");
            let he = dom.window.document.getElementsByTagName("he");
            let i = dom.window.document.getElementsByTagName("i");

            partI = dbQualityInspection.reGroup(i, 1);
            partHe = dbQualityInspection.reGroup(he, 2);
            partSYS = dbQualityInspection.reGroup(sys, 3);
            content = partI.concat(partHe, partSYS);
            content.sort(function (a, b) {
                return a.time - b.time;
            });

            return content;
    },
    searchMySQLDB:function(queryObj,connection){
        var deferred = Q.defer();
        connection.query("SELECT * FROM chat_content WHERE " + queryObj, function (error, results, fields) {
            console.log('yeah');
            if (error) throw error;
            deferred.resolve(results);
            connection.end();
        });
        return deferred.promise;
    },
    getMongoCV:function(dbResult){
      var deferred = Q.defer();
      let proms = [];
      Q.all(dbResult).then(results=>{
        console.log(results);
        results.forEach(item => {
            //console.log(item);
            let live800Chat = {conversation: [], live800Acc:{}};
            live800Chat.messageId = item.msg_id;
            live800Chat.status = item.status;
            live800Chat.qualityAssessor = '';
            live800Chat.fpmsAcc = item.operator_name;
            live800Chat.processTime = null;
            live800Chat.appealReason = '';
            live800Chat.companyId = item.company_id;
            live800Chat.createTime = item.store_time;

            live800Chat.live800Acc['id'] = item.operator_id;
            live800Chat.live800Acc['name'] = item.operator_name;
            live800Chat.operatorName = item.operator_name;
            let dom = new JSDOM(item.content);
            let content = [];
            let sys = dom.window.document.getElementsByTagName("sys");
            let he = dom.window.document.getElementsByTagName("he");
            let i = dom.window.document.getElementsByTagName("i");

            partI = dbQualityInspection.reGroup(i, 1);
            partHe = dbQualityInspection.reGroup(he, 2);
            partSYS = dbQualityInspection.reGroup(sys, 3);
            content = partI.concat(partHe, partSYS);
            content.sort(function (a, b) {
                return a.time - b.time;
            });

            live800Chat.conversation = content;

            let queryQA = {messageId: String(item.msg_id)};
            let prom = dbconfig.collection_qualityInspection.find(queryQA)
                .then(qaData => {
                    if (qaData.length > 0) {
                        live800Chat.status = qaData[0].status;
                        live800Chat.conversation = dbQualityInspection.reformatCV(live800Chat.conversation, qaData[0].conversation);
                        live800Chat.qualityAssessor = qaData[0].qualityAssessor;
                        live800Chat.processTime = qaData[0].processTime;
                        live800Chat.appealReason = qaData[0].appealReason;
                    }
                    return live800Chat;
                });
            proms.push(prom);

        });
        deferred.resolve(proms);
      })
      return deferred.promise;

    },
    reformatCV: function(cvs,mongoCVS ){

        cvs.forEach(item=>{
            let currentCV = mongoCVS.filter(mItem=>{
                return mItem.time == item.time;
            });
            if(currentCV.length > 0){
                item.timeoutRate = currentCV[0].timeoutRate;
                item.inspectionRate = currentCV[0].inspectionRate;
                item.review = currentCV[0].review;
            }
            return item;
        });
        return cvs;


    },
    reGroup: function(arrs,type){
        let conversation= [] ;
        for (var t = 0; t < arrs.length; t++) {
            let timeStamp = arrs[t].getAttribute("tm");
            let innerHTML = arrs[t].innerHTML;
            let conversationInfo = {
                'time':timeStamp ? timeStamp:'' ,
                'roles':type,
                'roleName':type,
                'createTime':timeStamp ?timeStamp:'' ,
                'timeoutRate':0,
                'inspectionRate':0,
                'review':'',
                'content':innerHTML ? innerHTML :''
            };
            conversation.push(conversationInfo);
        }
        return conversation;
    },
    getUnreadEvaluationRecord: function (startTime, endTime) {
        let query = {
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            status: constQualityInspectionStatus.COMPLETED_UNREAD
        }
        return dbconfig.collection_qualityInspection.find(query).lean();
    },

    getReadEvaluationRecord: function(startTime, endTime){
        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            status: constQualityInspectionStatus.COMPLETED_READ
        }
        return dbconfig.collection_qualityInspection.find(query).lean();
    },

    getAppealEvaluationRecordByConversationDate: function(startTime, endTime, status){


        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
            //status: constQualityInspectionStatus.COMPLETED_READ
        }

        if(status != "all"){
            query.status = status;
        }
        else{
            query.status = {$in: [constQualityInspectionStatus.APPEALING, constQualityInspectionStatus.APPEAL_COMPLETED]};
        }

        return dbconfig.collection_qualityInspection.find(query).lean();
    },

    getAppealEvaluationRecordByAppealDate: function(startTime, endTime, status){

        let query ={
            processTime: {
                $gte: startTime,
                $lt: endTime
            }
            //status: constQualityInspectionStatus.COMPLETED_READ
        }

        if(status != "all"){
            query.status = status;
        }
        else{
            query.status = {$in: [constQualityInspectionStatus.APPEALING, constQualityInspectionStatus.APPEAL_COMPLETED]};
        }

        return dbconfig.collection_qualityInspection.find(query).lean();
    },

    getWorkloadReport: function(startTime, endTime, qcAccount){

        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
            //status: constQualityInspectionStatus.COMPLETED_READ
        }

        if(qcAccount != "all"){
            query.qcAccount = qcAccount;
        }

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    //qualityAssessor: qcAccount
                },
            },
            {
                "$group": {
                    "_id": {
                        "qualityAssessor": "$qualityAssessor",
                        "status": "$status"
                    },
                    "count": {"$sum": 1},
                }
            }
        ]).then(data => {
            let resultArr = [];
            if(data && data.length > 0){
                data.forEach(d => {
                    if(d){
                        resultArr.push({
                            qcAccount: d._id.qualityAssessor,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });

                return resultArr;
            }

        })

        //return dbconfig.collection_qualityInspection.find(query).lean();
    },

    markEvaluationRecordAsRead: function(appealRecordArr, status){
        if(appealRecordArr && appealRecordArr.length > 0){
            let messageIdArr = [];

            appealRecordArr.forEach(a => {
                messageIdArr.push(a.messageId);
            })

            let query ={
                messageId: {$in: messageIdArr},
                status: constQualityInspectionStatus.COMPLETED_UNREAD
            }

            let updateData = {
                status: constQualityInspectionStatus.COMPLETED_READ
            }

            return dbconfig.collection_qualityInspection.findOneAndUpdate(query,updateData);
        }

    },

    appealEvaluation: function(appealRecordArr){
        if(appealRecordArr && appealRecordArr.length > 0){

            return appealRecordArr.forEach(a => {
                let query ={
                    //messageId: appealRecordArr.messageId ? ,
                    status: constQualityInspectionStatus.COMPLETED_UNREAD
                }

                if(a.messageId){
                    query.messageId = a.messageId;
                }

                let updateData = {
                    status: constQualityInspectionStatus.APPEALING
                }

                if(a.appealReason){
                    updateData.appealReason = a.appealReason;
                }


                return dbconfig.collection_qualityInspection.findOneAndUpdate(query,updateData).exec();
            });

        }

    },
    rateCSConversation: function (data , adminName) {
        var deferred = Q.defer();
        console.log(data);
        let query = { 'live800Acc': {$in: [data.live800Acc.id]} };
        console.log(data.live800Acc)
        return dbconfig.collection_admin.findOne(query).then(
          item=>{
              console.log(item);
              let adminName = item ? item.adminName:'x';
              return adminName
        })
        .then(udata=>{
            return dbconfig.collection_qualityInspection.find({messageId: data.messageId}).then(qaData => {
                delete data.statusName;
                data.qualityAssessor = adminName;
                data.processTime = Date.now();
                data.fpmsAcc = udata;
                data.status = 2;
                if (qaData.length == 0) {
                    return dbconfig.collection_qualityInspection(data).save();
                }else{
                    dbconfig.collection_qualityInspection.findOneAndUpdate(
                        {messageId: data.messageId},
                        data
                    ).then(data=>{
                        console.log(data);
                    })
                }
            })


        })

        return deferred.promise;
    },
    getEvaluationRecordYearMonth: function (platformObjId) {
        return dbconfig.collection_platform.findOne({_id: platformObjId}).then(
            platformDetail => {
                if(platformDetail){

                }
            }
        )
    }
};
module.exports = dbQualityInspection;
