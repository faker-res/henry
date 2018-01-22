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
        console.log('first step');
        var connection = mysql.createConnection({
            host     : '203.192.151.12',
            user     : 'devselect',
            password : '!Q&US3lcT18',
            database : 'live800_im',
            port: '3320'
        });
        return connection;
        // connection.query('show tables', function (error, results, fields) {
        //     console.log('yeah')
        //     if (error) throw error;
        //     console.log('The solution is: ', results[0].solution);
        // });
        //SELECT * FROM chat_content WHERE store_time BETWEEN CAST('2018-01-16 00:00:00' as DATE) AND CAST('2018-01-16 02:00:00' AS DATE);
        //SELECT * FROM chat_content WHERE store_time BETWEEN CAST('2018-01-16 00:00:00' as DATE) AND CAST('2018-01-16 02:00:00' AS DATE);
        // connection.end();
    },
    searchLive800: function () {
        var deferred = Q.defer();
        var connection = dbQualityInspection.connectMysql();
        connection.connect();
        connection.query("SELECT * FROM chat_content WHERE store_time BETWEEN CAST('2018-01-16 00:00:00' as DATETIME) AND CAST('2018-01-16 00:5:00' AS DATETIME);", function (error, results, fields) {
            console.log('yeah');
            if (error) throw error;
            let conversationForm = [];
            // console.log(results.data);
            results.forEach(item => {
                let live800Chat = {conversation: []};
                live800Chat.messageId = item.msg_id;
                live800Chat.status = item.status;
                live800Chat.qualityAssessor = '';
                live800Chat.fpmsAcc = item.operator_name;
                live800Chat.processTime = null;
                live800Chat.appealReason = '';

                live800Chat.operatorId = item.operator_id;
                live800Chat.operatorName = item.operator_name;

                //console.log(item.content);
                let dom = new JSDOM(item.content);
                // let ccontent = dom.window.document.createElement("cname");
                // ccontent.innerText = item.content;
                let content = [];
                let sys = dom.window.document.getElementsByTagName("sys");
                let he = dom.window.document.getElementsByTagName("he");
                let i = dom.window.document.getElementsByTagName("i");

                partI = dbQualityInspection.reGroup(i, 1);
                partHe = dbQualityInspection.reGroup(he, 2);
                partSYS = dbQualityInspection.reGroup(sys, 3);
                content = partI.concat(partHe, partSYS);
                content.sort(function(a,b){
                    return a.time - b.time;
                })

                live800Chat.conversation = content;
                conversationForm.push(live800Chat);
            });
            deferred.resolve(conversationForm);
            connection.end();
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
            console.log(qaData);
            console.log(data);
            delete data.statusName;
            if (qaData.length == 0) {
                data.qualityAssessor = adminName;
                return dbconfig.collection_qualityInspection(data).save();
            }else{
                deferred.reject({name: "DBError", message: "It's Exist"})
            }
        })
        return deferred.promise;
    }
// ×ValidationError: fpmsAcc: Path `fpmsAcc` is required., qualityAssessor: Path `qualityAssessor` is required., messageId: Path `messageId` is required.

};

module.exports = dbQualityInspection;