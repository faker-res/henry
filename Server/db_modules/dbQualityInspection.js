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
        console.log(query);
        if (query.companyId) {
            queryObj += " company_id=" + query.companyId + " AND ";
        }
        if (query.operatorId) {
            queryObj += " operator_id=" + query.operatorId + " AND ";
        }
        if (query.startTime && query.endTime) {
            queryObj += " store_time BETWEEN CAST('2018-01-16 00:00:00' as DATETIME) AND CAST('2018-01-16 00:05:00' AS DATETIME)";
        }
        if(query.status!='all'){
            conversationForm = dbQualityInspection.searchMongoDB(query);
        }else{
            let connection = dbQualityInspection.connectMysql();
            connection.connect();
            conversationForm = dbQualityInspection.searchMySQLDB(queryObj,connection);
        }
        return conversationForm;
    },
    searchMongoDB:function(query){
        let queryQA = {};
        console.log(query);
        if (query.status) {
            queryQA.status = query.status;
        }
        console.log(queryQA);
        return dbconfig.collection_qualityInspection.find(queryQA)
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
    searchMySQLDB:function(queryObj,connection){
        var deferred = Q.defer();
        let proms = [];
        connection.query("SELECT * FROM chat_content WHERE " + queryObj, function (error, results, fields) {
            console.log('yeah');
            if (error) throw error;
            results.forEach(item => {
                console.log(item);
                let live800Chat = {conversation: []};
                live800Chat.messageId = item.msg_id;
                live800Chat.status = item.status;
                live800Chat.qualityAssessor = '';
                live800Chat.fpmsAcc = item.operator_name;
                live800Chat.processTime = null;
                live800Chat.appealReason = '';
                live800Chat.companyId = item.company_id

                live800Chat.live800Id = item.operator_id;
                live800Chat.live800Name = item.operator_name;

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
                            live800Chat.conversation = qaData[0].conversation;
                            live800Chat.qualityAssessor = qaData[0].qualityAssessor;
                            live800Chat.processTime = qaData[0].processTime;
                            live800Chat.appealReason = qaData[0].appealReason;
                        }
                        return live800Chat;
                    });
                proms.push(prom);
            });
            return Q.all(proms).then(data => {
                deferred.resolve(data);
                connection.end();
            })
        });
        return deferred.promise;
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
        return dbconfig.collection_qualityInspection.find({messageId: data.messageId}).then(qaData => {
            delete data.statusName;
            data.qualityAssessor = adminName;
            data.processTime = Date.now();
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
