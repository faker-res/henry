var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbUtil = require('./../modules/dbutility');
var mysql = require("mysql");
const constQualityInspectionStatus = require('./../const/constQualityInspectionStatus');

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
    searchLive800: function(){
        var deferred = Q.defer();
        var connection = dbQualityInspection.connectMysql();
        connection.connect();
        connection.query("SELECT * FROM chat_content WHERE store_time BETWEEN CAST('2018-01-16 00:00:00' as DATETIME) AND CAST('2018-01-16 00:5:00' AS DATETIME);", function (error, results, fields) {
            console.log('yeah');
            if (error) throw error;
            console.log('The solution is: ', results);
            // return results;
            deferred.resolve(results);
            connection.end();
        });
        return deferred.promise;
    },

    getUnreadEvaluationRecord: function(startTime, endTime){
        let query ={
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

};

module.exports = dbQualityInspection;