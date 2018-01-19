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
        connection.connect();

        // connection.query('show tables', function (error, results, fields) {
        //     console.log('yeah')
        //     if (error) throw error;
        //     console.log('The solution is: ', results[0].solution);
        // });
        //SELECT * FROM chat_content WHERE store_time BETWEEN CAST('2018-01-16 00:00:00' as DATE) AND CAST('2018-01-16 02:00:00' AS DATE);
        //SELECT * FROM chat_content WHERE store_time BETWEEN CAST('2018-01-16 00:00:00' as DATE) AND CAST('2018-01-16 02:00:00' AS DATE);

        connection.close();
    },

    getUnreadEvaluationRecord: function(createTime){
        let query ={
            createTime: createTime,
            status: constQualityInspectionStatus.COMPLETED_UNREAD
        }
        return dbconfig.collection_qualityInspection.find({query}).lean().then({

        })
    }

};

module.exports = dbQualityInspection;