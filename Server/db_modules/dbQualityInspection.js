var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbUtility = require('./../modules/dbutility');
var mysql = require("mysql");
var errorUtils = require("./../modules/errorUtils.js");
const constQualityInspectionStatus = require('./../const/constQualityInspectionStatus');
const constQualityInspectionRoleName = require('./../const/constQualityInspectionRoleName');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const ObjectId = mongoose.Types.ObjectId;
let env = require("../config/env").config();
const constProposalStatus = require('./../const/constProposalStatus');

var dbQualityInspection = {

    connectTel400CSMysql: function(){
        console.log("checking env.tel400CsIp", env.tel400CsIp)
        var connection = mysql.createConnection({
            host     : env.tel400CsIp,
            user     : 'devtest',
            password : 'devtest123',
            database : 'ctiserver',
            port: '3306',
            queueLimit: 100,
            connectionLimit: 100
        });
        return connection;
    },

    connectTel400JiaBoMysql: function(){
        console.log("checking env.tel400JiaBoIp", env.tel400JiaBoIp)
        var connection = mysql.createConnection({
            host     : env.tel400JiaBoIp,
            user     : 'devtest',
            password : 'devtest123',
            database : 'ctiserver',
            port: '3306',
            queueLimit: 100,
            connectionLimit: 100
        });
        return connection;
    },

    getAudioReportData: function (startDate, endDate, data){
        let index = data.index || 0;
        let limit = data.limit || 50;
        let callerIdStringList = "";

        if (data && data.callerId && data.callerId.length){
            data.callerId.forEach(
                id => {
                    if (id){
                        callerIdStringList += "('" + id + "'),";
                    }
                }
            )
        }
        else{
            return {
                data: [],
                size: 0
            }
        }

        if (startDate && endDate) {
            let connection1 = dbQualityInspection.connectTel400CSMysql();
            let connection2 = dbQualityInspection.connectTel400JiaBoMysql();

            endDate = new Date(endDate);
            endDate = endDate.getTime() - 1000;

            let startTime = dbUtility.getLocalTimeString(startDate);
            let endTime = dbUtility.getLocalTimeString(endDate);

            let queryObj = "SELECT * FROM cti_cdr_agentcall_statis WHERE seasonal_time BETWEEN CAST('"+ startTime + "' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
            callerIdStringList = callerIdStringList && callerIdStringList.length > 0 ? callerIdStringList.substring(0,callerIdStringList.length - 1) : callerIdStringList;

            if (callerIdStringList && callerIdStringList.length > 0){
                queryObj = queryObj + " AND agentnum IN (" + callerIdStringList + ")";
            }

            console.log("checking queryObj", queryObj)

            let sqlCSProm = dbQualityInspection.sqlExecutionAndReturnJsonParse(connection1,queryObj + " ORDER BY seasonal_time desc");
            let sqlJiaBoProm = dbQualityInspection.sqlExecutionAndReturnJsonParse(connection2,queryObj + " ORDER BY seasonal_time desc");

            return Promise.all([sqlCSProm, sqlJiaBoProm]).then(
                retData => {
                    let csData = retData && retData[0] ? retData[0] : [];
                    let jiaBoData = retData && retData[1] ? retData[1] : [];
                    let dataset = [];
                    dataset = dataset.concat(csData, jiaBoData);

                    // process based on time scale
                    if (dataset && dataset.length){
                        dataset = dbQualityInspection.timeScaleProcess(dataset, data.timeScale, startDate, endDate);
                    }

                    // sorting
                    let totalSize = dataset && dataset.length ? dataset.length : 0;
                    console.log("checking process time scale dataset", totalSize);
                    if (dataset && dataset.length) {
                        dataset.sort(function (a, b) {
                            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                        });
                    }

                    if (dataset && dataset.length > limit){
                        dataset = dataset.slice(index, index+limit)
                    }
                    return {
                        data: dataset,
                        size: totalSize
                    }
                }
            )
        }
    },

    timeScaleProcess: function (data, timeScale, startTime, endTime){
        let arrData = [];
        let retData;
        console.log("checking timeScale", timeScale);

        if (timeScale == 1){
            data.forEach(
                detail => {
                    if (detail && detail.agentnum){
                        arrData.push({
                            agentNum:  detail.agentnum,
                            agentGroupName: detail.agent_group_name,
                            startDate: detail.seasonal_time,
                            totalCallTime: detail.total_call_time || 0,
                            totalEavesdroppingTime: detail.total_eavesdroper_time || 0,
                            totalIncallNum: detail.total_incall_num || 0,
                            totalIncallFailedNum: detail.total_incallfailed_num || 0,
                            totalAnswerTime: detail.total_answer_time || 0,
                            totalOutcallNum: detail.total_outcall_num || 0,
                            totalOutcallFailedNum: detail.total_outcallfailed_num || 0,
                            totalCallingTime: detail.calling_time || 0,
                            totalCalloutHangoutNum: detail.total_callout_agent_first_hangup_num || 0,
                            totalCallinHangoutNum: detail.total_callin_agent_first_hangup_num || 0
                        })
                    }
                }
            )
            return arrData
        }
        else{
            let csList = data.map( x => x.agentnum);
            let distinctCsList = csList.filter((x, i, a) => a.indexOf(x) == i);
            let dayStartTime = new Date (startTime);
            switch (timeScale) {
                // every hour
                case '2':
                    let totalHour = dbUtility.getNumberOfHours(startTime, endTime);
                    console.log("checking number of hours", totalHour)
                    retData = dbQualityInspection.processDataBasedOnTimeScale(dayStartTime, totalHour, data, timeScale, distinctCsList);
                    break;
                // every day
                case '3':
                    let totalDay = dbUtility.getNumberOfDays(startTime, endTime);
                    console.log("checking number of totalDay", totalDay)
                    retData = dbQualityInspection.processDataBasedOnTimeScale(dayStartTime, totalDay, data, timeScale, distinctCsList);
                    break;
                case '4':
                    let totalMonth = dbUtility.getNumberOfMonths(startTime, endTime);
                    console.log("checking number of totalMonth", totalMonth)
                    retData = dbQualityInspection.processDataBasedOnTimeScale(dayStartTime, totalMonth, data, timeScale, distinctCsList);
                    break;
            }
            return retData
        }
    },

    processDataBasedOnTimeScale: function (dayStartTime, iteratationNum, data, timeScale, distinctCsList) {
        let iterNum = iteratationNum || 0;
        let timeScaleData = [];
        console.log("checking iteratationNum", iteratationNum)
        let getNextDate = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + 1));
        };

        let getNextHour = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setHours(newDate.getHours() + 1));
        };

        let getNextMonth = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setMonth(newDate.getMonth() + 1));
        };

        for(let x = 0; x < iterNum; x++){
            let dayEndTime;

            if (timeScale && timeScale == 2) {
                dayEndTime = getNextHour.call(this, dayStartTime);
            }
            else if (timeScale && timeScale == 3) {
                dayEndTime = getNextDate.call(this, dayStartTime);
            }
            else if (timeScale && timeScale == 4) {
                dayEndTime = getNextMonth.call(this, dayStartTime);
            }

            console.log("checking dayStartTime", dayStartTime)
            console.log("checking dayEndTime", dayEndTime)

            let preDataList = data.filter(d => new Date(d.seasonal_time) >= new Date(dayStartTime) && new Date(d.seasonal_time) < new Date(dayEndTime) );
            console.log("checking preDataList", preDataList && preDataList.length ? preDataList.length : 'undefined');
            distinctCsList.forEach(
                csAdmin => {
                    let adminData = preDataList.filter(d => d.agentnum == csAdmin);
                    let totalCallTime = 0;
                    let totalEavesdroppingTime = 0;
                    let totalIncallNum = 0;
                    let totalIncallFailedNum = 0;
                    let totalAnswerTime = 0;
                    let totalOutcallNum = 0;
                    let totalOutcallFailedNum = 0;
                    let totalCallingTime = 0;
                    let totalCalloutHangoutNum = 0;
                    let totalCallinHangoutNum = 0;

                    console.log('checking adminData', adminData && adminData.length ? adminData.length : 'undefined');
                    adminData.forEach(
                        detail => {
                            totalCallTime = totalCallTime + (parseInt(detail.total_call_time || 0) );
                            totalEavesdroppingTime = totalEavesdroppingTime + (parseInt(detail.total_eavesdroper_time || 0) );
                            totalIncallNum = totalIncallNum + (parseInt(detail.total_incall_num || 0) );
                            totalIncallFailedNum = totalIncallFailedNum + (parseInt(detail.total_incallfailed_num || 0) );
                            totalAnswerTime = totalAnswerTime + (parseInt(detail.total_answer_time || 0) );
                            totalOutcallNum = totalOutcallNum + (parseInt(detail.total_outcall_num || 0) );
                            totalOutcallFailedNum = totalOutcallFailedNum + (parseInt(detail.total_outcallfailed_num || 0) );
                            totalCallingTime = totalCallingTime + (parseInt(detail.calling_time || 0) );
                            totalCalloutHangoutNum = totalCalloutHangoutNum + (parseInt(detail.total_callout_agent_first_hangup_num || 0) );
                            totalCallinHangoutNum = totalCallinHangoutNum + (parseInt(detail.total_callin_agent_first_hangup_num || 0) );
                        }
                    );

                    if (adminData && adminData.length && adminData[0].agentnum){
                        timeScaleData.push({
                            agentNum:  adminData[0].agentnum,
                            agentGroupName: adminData[0].agent_group_name,
                            startDate: dayStartTime,
                            totalCallTime: totalCallTime,
                            totalEavesdroppingTime: totalEavesdroppingTime,
                            totalIncallNum: totalIncallNum,
                            totalIncallFailedNum: totalIncallFailedNum,
                            totalAnswerTime: totalAnswerTime,
                            totalOutcallNum: totalOutcallNum,
                            totalOutcallFailedNum: totalOutcallFailedNum,
                            totalCallingTime: totalCallingTime,
                            totalCalloutHangoutNum: totalCalloutHangoutNum,
                            totalCallinHangoutNum: totalCallinHangoutNum
                        })
                    }
                }
            );

            dayStartTime = dayEndTime;
        }

        return timeScaleData
    },

    sqlExecutionAndReturnJsonParse: function (connection, query){
        connection.connect();

        return new Promise((resolve,reject)=>{
            connection.query(query, function (error, results, fields) {
                if (error) {
                    console.log(error);
                }

                connection.end();
                resolve(results);

            })
        }).then(results => {
            return results ? JSON.parse(JSON.stringify(results)) : [];
        });
    },

    getAudioRecordData: function (startDate, endDate, data){
        let index = data.index || 0;
        let limit = data.limit || 50;
        let callerIdStringList = "";

        if (data && data.callerId && data.callerId.length){
            data.callerId.forEach(
                id => {
                    if (id){
                        callerIdStringList += "('" + id + "'),";
                    }
                }
            )
        }
        else{
            return {
                data: [],
                size: 0
            }
        }

        if (startDate && endDate) {
            let connection1 = dbQualityInspection.connectTel400CSMysql();
            let connection2 = dbQualityInspection.connectTel400JiaBoMysql();

            endDate = new Date(endDate);
            endDate = endDate.getTime() - 1000;

            let startTime = dbUtility.getLocalTimeString(startDate);
            let endTime = dbUtility.getLocalTimeString(endDate);

            let queryObj = "SELECT A.id, A.agent_group_name, A.exten_num, A.begintime, A.endtime, A.agent_num, B.call_type, B.caller_num, B.billsec, B.recordId FROM cti_record AS A LEFT JOIN cti_cdr_call AS B ON A.record_uuid = B.callleg_uuid WHERE A.begintime BETWEEN CAST('"+ startTime + "' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME) AND A.record_status = '2'";
            let queryCount = "SELECT COUNT(*) AS total FROM cti_record as A LEFT JOIN cti_cdr_call AS B ON A.record_uuid = B.callleg_uuid WHERE A.begintime BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME) AND A.record_status = '2'";
            callerIdStringList = callerIdStringList && callerIdStringList.length > 0 ? callerIdStringList.substring(0,callerIdStringList.length - 1) : callerIdStringList;

            if (callerIdStringList && callerIdStringList.length > 0){
                queryObj = queryObj + " AND A.agent_num IN (" + callerIdStringList + ")";
                queryCount = queryCount + " AND A.agent_num IN (" + callerIdStringList + ")";
            }

            if (data && data.hasOwnProperty('callType')) {
                // call out
                if (data.callType == 2){
                    queryObj = queryObj + " AND A.leg_type IN ('9','10','11','12','13','14') ";
                    queryCount = queryCount + " AND A.leg_type IN ('9','10','11','12','13','14') ";
                }
                // call in
                else if (data.callType == 3){
                    queryObj = queryObj + " AND A.leg_type IN ('4','5','6','7','8') ";
                    queryCount = queryCount + " AND A.leg_type IN ('4','5','6','7','8') ";
                }
            }

            if (data && data.durationOperator && data.hasOwnProperty('durationOne')){
                if (data.durationOperator == '>='){
                    queryObj = queryObj + " AND B.billsec >= " + data.durationOne
                    queryCount = queryCount + " AND B.billsec >= " + data.durationOne
                }
                else if (data.durationOperator == '<='){
                    queryObj = queryObj + " AND B.billsec <= " + data.durationOne
                    queryCount = queryCount + " AND B.billsec <= " + data.durationOne
                }
                else if (data.durationOperator == '='){
                    queryObj = queryObj + " AND B.billsec = " + data.durationOne
                    queryCount = queryCount + " AND B.billsec = " + data.durationOne
                }
                else if (data.durationOperator == 'range'){
                  if (data.hasOwnProperty('durationTwo')){
                      queryObj = queryObj + " AND B.billsec >= " + data.durationOne + " AND B.billsec <= " + data.durationTwo
                      queryCount = queryCount + " AND B.billsec >= " + data.durationOne + " AND B.billsec <= " + data.durationTwo
                  }
                  else{
                      queryObj = queryObj + " AND B.billsec >= " + data.durationOne + " AND B.billsec <= " + data.durationOne + 60
                      queryCount = queryCount + " AND B.billsec >= " + data.durationOne + " AND B.billsec <= " + data.durationOne + 60
                  }
                }
            }

            console.log("checking queryObj", queryObj)
            console.log("checking queryObj", queryCount)

            let sqlCSProm = dbQualityInspection.multipleSqlExecution(connection1, queryCount, queryObj + " ORDER BY A.begintime desc")
            let sqlJiaBoProm = dbQualityInspection.multipleSqlExecution(connection2, queryCount, queryObj + " ORDER BY A.begintime desc")

            return Promise.all([sqlCSProm, sqlJiaBoProm]).then(
                data => {
                    let csData = data && data[0] && data[0].data ? data[0].data : [];
                    let jiaBoData = data && data[1] && data[1].data ? data[1].data : [];
                    let csDataSize = data && data[0] && data[0].size ? data[0].size : 0;
                    let jiaBoDataSize = data && data[1] && data[1].size ? data[1].size : 0;
                    let totalSize = (csDataSize || 0) + (jiaBoDataSize || 0);
                    let dataset = [];
                    dataset = dataset.concat(csData, jiaBoData);

                    if (dataset && dataset.length > limit){
                        dataset = dataset.slice(index, index+limit)
                    }
                    return {
                        data: dataset,
                        size: totalSize
                    }
                }
            )
        }
    },

    connectMysql: function(){
        console.log("checking env.live800Port", env.live800Port)
        var connection = mysql.createConnection({
            host     : 'live800.fpms8.me',
            user     : 'devuse',
            password : 'devuse@321',
            database : 'live800_im',
            // port: '33060',
            port: env.live800Port,
            queueLimit: 100,
            connectionLimit: 100
        });
        return connection;
    },
    getLive800Records: function(startDate, endDate){
        if (startDate && endDate) {
            let retData = Promise.resolve();
            let connection = dbQualityInspection.connectMysql();

            endDate = new Date(endDate);
            endDate.setHours(23, 59, 59, 999);
            endDate.setDate(endDate.getDate() - 1);

            let startTime = dbUtility.getLocalTimeString(startDate);
            let endTime = dbUtility.getLocalTimeString(endDate);
            let queryObj = "SELECT * FROM chat_content WHERE store_time BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";

            console.log("checking queryObj", queryObj)
            let sqlProm = dbQualityInspection.sqlExecution(connection, queryObj);
            let platformProm = dbconfig.collection_platform.find({}, {overtimeSetting: 1, conversationDefinition: 1, live800CompanyId: 1}).lean();

            return Promise.all([sqlProm, platformProm]).then(
                data => {
                    console.log("checking total live800 record data", data && data[0] && data[0].length ? data[0].length: "NONE")
                    if (data && data[0] && data[1]) {

                        let sqlData = data[0];
                        let platformDetails = data[1];

                        // process the data obtained from mySql before saving into DB
                        if (sqlData && sqlData.length && platformDetails && platformDetails.length) {

                            let lengthPerChunk = 500;
                            let numberOfChunk = Math.ceil(sqlData.length/lengthPerChunk);
                            let sqlArray = [];

                            for (let i = 0; i < numberOfChunk; i++){
                                sqlArray.push(sqlData.slice(i*lengthPerChunk, (i+1)*lengthPerChunk));
                            }

                            let partialProcessProm = Promise.resolve();
                            sqlArray.forEach(arr=>{
                                partialProcessProm = partialProcessProm.then(()=>{return dbQualityInspection.insertSqlDataToDB(arr, platformDetails)});
                            });
                            return partialProcessProm;
                        }
                    }
                }
            )
        }
    },

    sqlExecution: function (connection, queryObj) {
        let returnData;
        connection.connect();

        return new Promise((resolve,reject)=>{
            connection.query(queryObj, function (error, results, fields) {
                if (error) {
                    console.log(error);
                }

                returnData = results;
                connection.end();
                resolve(results);

            })
        }).then(results=>{
            return returnData;
        });
    },

    multipleSqlExecution: function (connection, queryCount, query){
        let returnData;
        connection.connect();

        let countProm =  new Promise((resolve, reject)=>{
            connection.query(queryCount, function (error, results, fields) {
                if (error) {
                    console.log(error);
                }

                returnData = results;
                resolve(results);

            })
        }).then(results=>{
            return returnData;
        });

        let prom = new Promise((resolve, reject)=>{
            connection.query(query, function (error, results, fields) {
                if (error) {
                    console.log(error);
                }

                returnData = results;
                resolve(results);

            })
        }).then(results=>{
            return returnData;
        });

        return Promise.all([prom, countProm]).then(
            retData => {
                connection.end();
                return {
                    data: retData && retData[0] ? JSON.parse(JSON.stringify(retData[0])) : [],
                    size: retData && retData[1] ? JSON.parse(JSON.stringify(retData[1]))[0].total : 0
                }
            }
        )
    },

    insertSqlDataToDB: function (arr, platformDetails) {
        let processData = [];
        arr.forEach(item => {
            let live800Chat = {conversation: [], live800Acc: {}};
            live800Chat.messageId = item.msg_id;

            live800Chat.companyId = item.company_id;
            live800Chat.createTime = new Date(item.store_time).toISOString();

            live800Chat.operatorId = item.operator_id;
            live800Chat.operatorName = item.operator_name;
            live800Chat.live800Acc['id'] = item.company_id + '-' + item.operator_name;
            live800Chat.live800Acc['name'] = item.operator_name;
            live800Chat.closeReason = item.close_reason;
            live800Chat.closeName = item.close_name;
            let dom = new JSDOM(item.content);
            let content = [];
            let he = dom.window.document.getElementsByTagName("he");
            let i = dom.window.document.getElementsByTagName("i");
            let file = dom.window.document.getElementsByTagName("file");

            let partI = dbQualityInspection.reGroup(i, 1);
            let partHe = dbQualityInspection.reGroup(he, 2);
            let partFile = dbQualityInspection.reGroup(file, 3);
            content = partI.concat(partHe);
            content = content.concat(partFile);
            content.sort(function (a, b) {
                return a.time - b.time;
            });

            let platformInfo = platformDetails.filter(item => {
                if (item.live800CompanyId && item.live800CompanyId.length > 0) {
                    if (item.live800CompanyId.indexOf(String(live800Chat.companyId)) != -1) {
                        return item;
                    }
                }
            });

            live800Chat.conversation.content = content;
            platformInfo = platformInfo[0] ? platformInfo[0] : [];
            live800Chat.conversation = dbQualityInspection.calculateRate(content, platformInfo, live800Chat.createTime);
            // this is to check the record is an effective conversation or not
            let isValidCV = dbQualityInspection.isValidCV(live800Chat, platformDetails, true);

            live800Chat.status = isValidCV == true ? constQualityInspectionStatus.PENDINGTOPROCESS : constQualityInspectionStatus.NOT_EVALUATED;

            processData.push(dbQualityInspection.createLive800Record(live800Chat));
        })

        return Promise.all(processData);
    },

    createLive800Record: function(live800Chat) {

        if (live800Chat && live800Chat.messageId && live800Chat.createTime){
            let query = {
                messageId: live800Chat.messageId,
                createTime: live800Chat.createTime
            };
            return dbconfig.collection_live800RecordDayRecord.findOne(query, {messageId: 1}).lean().then(
                retData => {
                    if (!retData){
                        let record = new dbconfig.collection_live800RecordDayRecord(live800Chat);
                        return record.save();
                    }
                },
                err => {
                    console.log("checking error for updating Live800 daily record", err)
                }
            );
        }
    },

    searchLive800ByScheduledRecord: function (query){
        let  queryObj = {};
        let limit = query.limit || 10;
        let index = query.index || 0;
        let checkCurrentDateRecordProm = Promise.resolve();
        // check if the end date is > today date; if yes, save the current records into db before query execution
        let currentStartDate = new Date(new Date().setHours(0, 0, 0, 0));

        console.log("checking currentStartDate ----", currentStartDate)
        if (new Date(query.endTime) > currentStartDate){
            // get the available records for the current date
            let currentQuery = {
                createTime: {$gte: currentStartDate, $lt: query.endTime}
            };

            console.log("checking currentQuery", currentQuery)
            checkCurrentDateRecordProm = dbconfig.collection_live800RecordDayRecord.find(currentQuery, {messageId: 1, createTime: 1}).lean();

            // asynchronously saving the summary record
            let localStartTime = dbUtility.getLocalTimeString(currentStartDate);
            let localEndTime = dbUtility.getLocalTimeString(query.endTime);

            console.log("checking local StartTime", localStartTime)
            console.log("checking local localEndTime", localEndTime)
            dbQualityInspection.getSummarizedLive800RecordCount(localStartTime, localEndTime).then(
                summarizedRecordCount => {
                    let summarizedRecord = summarizedRecordCount && summarizedRecordCount[0] ? summarizedRecordCount[0] : null;
                    if(!summarizedRecord || !summarizedRecord.mysqlLive800Record || !summarizedRecord.mongoLive800Record
                        || summarizedRecord.mysqlLive800Record != summarizedRecord.mongoLive800Record){
                        return dbQualityInspection.resummarizeLive800Record(localStartTime, localEndTime).catch(errorUtils.reportError);
                    }
                }
            )
        }

        return checkCurrentDateRecordProm.then(
            currentRecords => {
                let processMySqlDataProm = Promise.resolve();

                if (new Date(query.endTime) > currentStartDate){
                    processMySqlDataProm = processMySqlData(currentRecords, currentStartDate, query.endTime);
                }

                return processMySqlDataProm
            }
        ).then(
            () => {
                // process the query function

                if (query.operatorId && query.operatorId.length > 0) {
                    queryObj["live800Acc.id"] = {$in: query.operatorId};
                }

                if (query.companyId && query.companyId.length){
                    queryObj.companyId = {$in: query.companyId};
                }

                if (query.startTime && query.endTime) {
                    queryObj.createTime = {$gte: query.startTime, $lte: query.endTime}
                }

                if (query.status == 'all'){
                    queryObj.status = {$in: [
                            constQualityInspectionStatus.PENDINGTOPROCESS,
                            constQualityInspectionStatus.COMPLETED_UNREAD,
                            constQualityInspectionStatus.COMPLETED_READ,
                            constQualityInspectionStatus.COMPLETED,
                            constQualityInspectionStatus.APPEALING,
                            constQualityInspectionStatus.APPEAL_COMPLETED,
                            constQualityInspectionStatus.NOT_EVALUATED,
                        ]}
                }
                else{
                    queryObj.status = query.status;
                }

                console.log("checking query for scheduler summary record", queryObj);
                let recordProm = dbconfig.collection_live800RecordDayRecord.find(queryObj)
                    .populate({path: 'qualityAssessor', model: dbconfig.collection_admin})
                    .populate({path: 'fpmsAcc', model: dbconfig.collection_admin})
                    .skip(index).limit(limit).sort({createTime: 1}).lean();

                let countProm = dbconfig.collection_live800RecordDayRecord.find(queryObj).count();

                return Promise.all([recordProm, countProm]).then(
                    retData => {
                        return {record: retData[0], size: retData[1]}
                    }
                )

            }
        ).catch(
            err => {
                console.log("Error: Checking searching Live800 daiy scheduled records", err)
            }
        );

        function processMySqlData (currentRecords, startTime, endTime) {
            endTime = new Date(endTime);
            endTime.setHours(23, 59, 59, 999);
            endTime.setDate(endTime.getDate() - 1);
            startTime = dbUtility.getLocalTimeString(startTime);
            endTime = dbUtility.getLocalTimeString(endTime);

            let connection = dbQualityInspection.connectMysql();
            let mySqlQuery;
            let contentInfoList = "";
            currentRecords.forEach(
                record => {
                    if (record){
                        contentInfoList += "('" + record.messageId + "','" + dbUtility.getLocalTimeString(record.createTime) + "'),";
                    }
                }
            )

            if(contentInfoList && contentInfoList.length > 0){
                contentInfoList = contentInfoList && contentInfoList.length > 0 ? contentInfoList.substring(0,contentInfoList.length - 1) : contentInfoList;
                mySqlQuery = "SELECT * FROM chat_content WHERE (msg_id, store_time) NOT IN (" + contentInfoList
                    + ") AND store_time BETWEEN CAST('" + startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
            }
            else{
                mySqlQuery = "SELECT * FROM chat_content WHERE store_time BETWEEN CAST('" + startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
            }

            let sqlProm = dbQualityInspection.sqlExecution(connection, mySqlQuery);
            let platformProm = dbconfig.collection_platform.find({}, {overtimeSetting: 1, conversationDefinition: 1, live800CompanyId: 1}).lean();

            return Promise.all([sqlProm, platformProm]).then(
                data => {

                    console.log("checking total live800 record data", data && data[0] && data[0].length ? data[0].length: "NONE")
                    if (data && data[0] && data[1]) {

                        let sqlData = data[0];
                        let platformDetails = data[1];
                        // process the data obtained from mySql before saving into DB
                        if (sqlData && sqlData.length && platformDetails && platformDetails.length) {

                            let lengthPerChunk = 500;
                            let numberOfChunk = Math.ceil(sqlData.length/lengthPerChunk);
                            let sqlArray = [];

                            for (let i = 0; i < numberOfChunk; i++){
                                sqlArray.push(sqlData.slice(i*lengthPerChunk, (i+1)*lengthPerChunk));
                            }

                            let partialProcessProm = Promise.resolve();
                            sqlArray.forEach(arr=>{
                                partialProcessProm = partialProcessProm.then(()=>{return dbQualityInspection.insertSqlDataToDB(arr, platformDetails)});
                            });
                            return partialProcessProm;
                        }

                    }
                }
            )
        }
    },

    countLive800: function(query){
        let queryObj = "";
        let operatorId = null;
        let dbResult = null;
        let mongoDataCount = 0;
        console.log(query);

        if (query.operatorId && query.operatorId.length > 0) {
            if(Array.isArray(query.operatorId)){
                operatorId = dbQualityInspection.splitOperatorId(query.operatorId);
                companyId = dbQualityInspection.splitOperatorIdByCompanyId(query.operatorId)
            }else{
                operatorId = query.operatorId;
            }

            if(operatorId!='all'){
                queryObj += " operator_name IN (" + operatorId + ") AND ";
            }

            queryObj += " company_id IN (" + companyId + ") AND ";
            query.companyId = companyId;
        }else{
            if (query.companyId && query.companyId.length > 0) {
                companyId = query.companyId.join(',');
                queryObj += " company_id IN (" + companyId + ") AND ";
            }
        }

        if (query.startTime && query.endTime) {
            let startTime = dbUtility.getLocalTimeString(query.startTime);
            let endTime = dbUtility.getLocalTimeString(query.endTime);
            queryObj += " store_time BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
        }
        if(query.status=='all'||query.status == constQualityInspectionStatus.PENDINGTOPROCESS){
            let connection = dbQualityInspection.connectMysql();
            console.log(query)

            let mysqlCount = dbQualityInspection.countMySQLDB(queryObj, connection);
            if(query.status==constQualityInspectionStatus.PENDINGTOPROCESS){
                let mongoData = dbQualityInspection.countMongoDB(query, mysqlCount);
                dbResult = dbQualityInspection.resolvePromise(mongoData);
                console.log(mongoDataCount);
            }else{
                dbResult = mysqlCount;
            }
            return dbResult;
        }else{
            let queryQA = {};
            delete query.limit;
            delete query.index;

            if (query.status){
                queryQA.status = query.status;
            }
            if (query.startTime && query.endTime) {
                queryQA.createTime = {'$lte':new Date(query.endTime),
                    '$gte': new Date(query.startTime)}
            }

            if (query.operatorId && query.operatorId.length > 0) {
                if(Array.isArray(query.operatorId)){
                    operatorId = dbQualityInspection.splitOperatorIdIntoArray(query.operatorId);
                    companyId = dbQualityInspection.splitOperatorIdByCompanyId(query.operatorId)
                }else{
                    operatorId = query.operatorId;
                }

                if(operatorId!='all'){
                    queryQA['live800Acc.name'] = {
                        $in: operatorId
                    }
                }

                queryQA.companyId = {$in: companyId};
                query.companyId = companyId;
            }else{
                if (query.companyId && query.companyId.length > 0) {
                    queryQA.companyId = {$in: query.companyId};
                }
            }

            return dbconfig.collection_qualityInspection.find(queryQA).count().then(data=>{
                console.log(data);
                return data;
            })
        }
    },
    getTotalNumberOfAppealingRecord: function(){
        return dbconfig.collection_qualityInspection.find({status: constQualityInspectionStatus.APPEALING}).count();

    },
    getTotalNumberOfAppealingRecordByDailyRecord: function(){
        return dbconfig.collection_live800RecordDayRecord.find({status: constQualityInspectionStatus.APPEALING}).count();
    },
    getTotalNumberOfAppealingRecordByCS: function(adminId){
        let query = {
            status: constQualityInspectionStatus.APPEALING,
            fpmsAcc: adminId
        }

        return dbconfig.collection_qualityInspection.find(query).count();
    },
    getTotalNumberOfAppealingRecordByCSInDailyRecord: function(adminId){
        let query = {
            status: constQualityInspectionStatus.APPEALING,
            fpmsAcc: adminId
        }

        return dbconfig.collection_live800RecordDayRecord.find(query).count();
    },
    splitOperatorId:function(operatorIdArr){
        let results = [];
        let resultTXT = '';
        operatorIdArr.forEach(item=>{
            //operatorName with '-' , 700-ewan
            let operator = dbQualityInspection.splitLive800Acc(item);
            results.push("'"+operator+"'");
        });
        resultTXT = results.join(',');
        return resultTXT;
    },
    splitOperatorIdIntoArray:function(operatorIdArr){
        let results = [];
        operatorIdArr.forEach(item=>{
            let operator = dbQualityInspection.splitLive800Acc(item);
            results.push(operator);
        });
        return results;
    },
    splitOperatorIdByCompanyId:function(operatorIdArr){
        let results = [];
        operatorIdArr.forEach(item=>{
            let companyId = dbQualityInspection.splitLive800AccForCompanyID(item);
            results.push(companyId);
        });
        return results;
    },
    splitLive800Acc:function(acc){
        let mysqlAccName = '';
        let accArr = acc.split('-');
        console.log(accArr);
        if(accArr.length >= 1){
            mysqlAccName = String(accArr[1]);
        }else{
            mysqlAccName = String(acc);
        }
        return mysqlAccName
    },
    splitLive800AccForCompanyID:function(acc){
        let mysqlAccName = '';
        let accArr = acc.split('-');

        if(accArr.length  == 2) {
            mysqlCompanyId = String(accArr[0]);

            return mysqlCompanyId
        }
    },
    searchLive800: function (query) {
        let conversationForm = [];
        let queryObj = "";
        let operatorId = null;
        let companyId = null;
        let paginationQuery = '';
        console.log(query);

        if (query.operatorId && query.operatorId.length > 0) {
            if(Array.isArray(query.operatorId)){
                operatorId = dbQualityInspection.splitOperatorId(query.operatorId);
                companyId = dbQualityInspection.splitOperatorIdByCompanyId(query.operatorId)
            }else{
                operatorId = query.operatorId;
            }

            if(operatorId!='all'){
                queryObj += " operator_name IN (" + operatorId + ") AND ";
            }

            queryObj += " company_id IN (" + companyId + ") AND ";
            query.companyId = companyId;
        }else{
            if (query.companyId && query.companyId.length > 0) {
                companyId = query.companyId.join(',');
                queryObj += " company_id IN (" + companyId + ") AND ";
            }
        }

        if (query.startTime && query.endTime) {
            let startTime = dbUtility.getLocalTimeString(query.startTime);
            let endTime = dbUtility.getLocalTimeString(query.endTime);
            queryObj += " store_time BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
        }
        if (query.limit && (query.index || query.index ===0)){
            paginationQuery += " LIMIT " + query.limit + " OFFSET " + query.index;
        }
        console.log(queryObj);
        if(query.status!='all' && query.status != constQualityInspectionStatus.PENDINGTOPROCESS && query.status != constQualityInspectionStatus.NOT_EVALUATED) {

            //get status equal to not 1 & all
            let dbResult = dbQualityInspection.searchMongoDB(query);
            let result = dbQualityInspection.getMySQLConversation(dbResult, query);
            conversationForm = dbQualityInspection.fillContent(result);
        }else if(query.status!='all' && query.status==constQualityInspectionStatus.PENDINGTOPROCESS){

            //get status equal to "1"
            delete query.status;
            let mongoResult = dbQualityInspection.searchMongoDB(query);
            let connection = dbQualityInspection.connectMysql();
            let dbResult = dbQualityInspection.searchPendingMySQL(mongoResult, queryObj, paginationQuery,connection);
            conversationForm = dbQualityInspection.constructCV(dbResult);
            console.log(conversationForm);
        }else{
            //get status equal to "all" OR status equal 7
            let connection = dbQualityInspection.connectMysql();
            let dbResult = dbQualityInspection.searchMySQLDB(queryObj, paginationQuery, connection);

            let noValidCV = false;
            if(query.status == constQualityInspectionStatus.NOT_EVALUATED){
                noValidCV = true;
            }

            let mongoResult = dbQualityInspection.getMongoCV(dbResult, noValidCV);
            conversationForm = dbQualityInspection.resolvePromise(mongoResult);
        }
        return conversationForm;
    },
    constructCV: function(dataResult){
        let deferred = Q.defer();
        let liveChats = [];
        let platformProm = dbconfig.collection_platform.find().lean();
        Q.all([dataResult, platformProm]).then(results=>{

            let sqlData = results[0];
            let platformDetails = results[1];

            sqlData.forEach(item => {
                let live800Chat = {conversation: [],live800Acc:{}};
                live800Chat.messageId = item.msg_id;
                live800Chat.status = item.status;
                live800Chat.qualityAssessor = '';
                live800Chat.fpmsAcc = '';
                live800Chat.processTime = null;
                live800Chat.appealReason = '';
                live800Chat.conversation = item.conversation;
                live800Chat.companyId = item.company_id;
                live800Chat.createTime = new Date(item.store_time).toISOString();

                live800Chat.operatorId = item.operator_id;
                live800Chat.operatorName = item.operator_name;
                live800Chat.live800Acc['id'] = item.company_id+'-'+item.operator_name;
                live800Chat.live800Acc['name'] = item.operator_name;
                live800Chat.closeReason = item.close_reason;
                live800Chat.closeName = item.close_name;
                let dom = new JSDOM(item.content);
                let content = [];
                let he = dom.window.document.getElementsByTagName("he");
                let i = dom.window.document.getElementsByTagName("i");
                let file = dom.window.document.getElementsByTagName("file");

                let partI = dbQualityInspection.reGroup(i, 1);
                let partHe = dbQualityInspection.reGroup(he, 2);
                let partFile = dbQualityInspection.reGroup(file, 3);
                content = partI.concat(partHe);
                content = content.concat(partFile);
                content.sort(function (a, b) {
                    return a.time - b.time;
                });

                let platformInfo = platformDetails.filter(item => {
                    if(item.live800CompanyId && item.live800CompanyId.length > 0){
                        if(item.live800CompanyId.indexOf(String(live800Chat.companyId)) != -1){
                            return item;
                        }
                    }
                });

                platformInfo = platformInfo[0] ? platformInfo[0] : [];
                live800Chat.conversation = dbQualityInspection.calculateRate(content, platformInfo, live800Chat.createTime);
                let isValidCV = dbQualityInspection.isValidCV(live800Chat, platformDetails, true);
                if(isValidCV){
                    liveChats.push(live800Chat);
                }
            });
            deferred.resolve(liveChats);
        });

        return deferred.promise;
    },
    searchMongoDB:function(query){
        let deferred = Q.defer();
        let queryQA = {};
        let operatorRegList = [];
        if (query.status){
            queryQA.status = query.status;
        }
        if (query.startTime && query.endTime) {
            queryQA.createTime = {'$lte':new Date(query.endTime),
            '$gte': new Date(query.startTime)}
        }
        if(query.fpmsAcc && query.fpmsAcc.length > 0){
            if(query.fpmsAcc!='all') {
                queryQA.fpmsAcc = {'$in': query.fpmsAcc};
            }
        }
        if (query.operatorId && query.operatorId.length > 0) {
            if(query.operatorId!='all'){
                query.operatorId.forEach( op => {
                    operatorRegList.push(new RegExp("^" + op, "i"));
                });

                queryQA['live800Acc.id'] = { '$in':operatorRegList}
            }
        }
        if(query.companyId && query.companyId.length > 0 ){
            queryQA.companyId = {'$in':query.companyId};
        }
        if(query.qualityAssessor && query.qualityAssessor.length > 0){
            if(query.qualityAssessor!='all') {
                queryQA.qualityAssessor = {'$in': query.qualityAssessor};
            }
        }
        console.log(queryQA);
        let qaResult =  dbconfig.collection_qualityInspection.find(queryQA)
            .populate({path: 'qualityAssessor', model: dbconfig.collection_admin})
            .populate({path: 'fpmsAcc', model: dbconfig.collection_admin}).lean().sort({createTime: 1})
            .then(results => {
                results.forEach(item => {
                    let live800Chat = {conversation: []};
                    live800Chat.messageId = item.msg_id;
                    live800Chat.status = item.status;
                    live800Chat.qualityAssessor = item.qualityAssessor;
                    live800Chat.fpmsAcc = item.fpmsAcc;
                    live800Chat.processTime = item.processTime;
                    live800Chat.createTime = item.createTime;
                    live800Chat.appealReason = item.appealReason;
                    live800Chat.conversation = item.conversation;
                    live800Chat.companyId = item.companyId;
                    return live800Chat;
                });
                return results;
            });
        Q.all(qaResult).then(data=>{
            deferred.resolve(data);
        })
        return deferred.promise;
    },
    countMongoDB: function(query, mysqlProm){
        let deferred = Q.defer();
        let queryQA = {};
        let live800AccReg = [];
        if (query.startTime && query.endTime) {
            queryQA.createTime = {'$lte':new Date(query.endTime),
                '$gte': new Date(query.startTime)}
        }
        if(query.fpmsAcc && query.fpmsAcc.length > 0){
            if(query.fpmsAcc!='all') {
                queryQA.fpmsAcc = {'$in': query.fpmsAcc};
            }
        }
        if (query.operatorId && query.operatorId.length > 0) {
            if(query.operatorId!='all'){
                query.operatorId.forEach(id => {
                    live800AccReg.push(new RegExp("^" + id + "$", "i"));
                });
                queryQA['live800Acc.id'] = { '$in':live800AccReg}
            }
        }
        if(query.companyId && query.companyId.length > 0 ){
            queryQA.companyId = {'$in':query.companyId};
        }
        if(query.qualityAssessor && query.qualityAssessor.length > 0){
            if(query.qualityAssessor!='all') {
                queryQA.qualityAssessor = {'$in': query.qualityAssessor};
            }
        }
        let countQuery = dbconfig.collection_qualityInspection.find(queryQA).count();
        Q.all([countQuery, mysqlProm]).then(data=>{
            let mongoCount = data[0] || 0;
            let mysqlCount = data[1] || 0;
            let countData = mysqlCount - mongoCount;
            deferred.resolve(countData);
        })
        return deferred.promise;
    },
    fillContent: function(data){
        let deferred = Q.defer();
        let combineData = [];
        Q.all(data).then(results => {
            let mongoData = results.mongo;
            let mysqlData = results.mysql;
            if(results.length == 0){
                deferred.resolve([]);
            }else{
                mongoData.forEach(item => {
                    let cData = {};
                    cData = item;
                    let mysqlCV = mysqlData.filter(sqlItem => {
                        return sqlItem.messageId == item.messageId;
                    });
                    if (mysqlCV.length > 0) {
                        mysqlCV.forEach(conversation => {
                            if(conversation &&  conversation.companyId && conversation.operatorName && item && item.companyId && item.live800Acc && item.live800Acc.name &&
                                conversation.companyId == item.companyId && conversation.operatorName == item.live800Acc.name){
                                item.conversation.forEach(cv => {
                                    let overrideCV = conversation.conversation.filter(mycv => {
                                        return cv.time == mycv.time
                                    })

                                    if(overrideCV.length > 0){
                                        let roles = overrideCV[0].roles;
                                        cv.roleName = roles ? constQualityInspectionRoleName[roles]:'';
                                        cv.content = overrideCV[0].content;
                                    }
                                })
                            }
                        });
                    }
                    combineData.push(item);
                });
                deferred.resolve(combineData);
            }

        })
        return deferred.promise;
    },
    getMySQLConversation: function(sqlResult, queryObj){
        let deferred = Q.defer();
        let platformProm = dbconfig.collection_platform.find().lean();
        Q.all([sqlResult, platformProm]).then(queryResult => {

            let results = queryResult[0];
            let platforms = queryResult[1];
            let msgIds = [];
            if(results.length == 0){
                deferred.resolve([]);
            }
            results.forEach(item => {
                msgIds.push(item.messageId);
            });
            if (msgIds.length > 0) {
                let condition = msgIds.join(',');

                let startTime = dbUtility.getLocalTimeString(queryObj.startTime);
                let endTime = dbUtility.getLocalTimeString(queryObj.endTime);
                let timeQuery = " store_time BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+endTime+"' AS DATETIME)";

                let query = timeQuery + " AND msg_id IN (" + condition + ")";
                console.log(query);
                let connection = dbQualityInspection.connectMysql();
                connection.connect();
                let dbData = dbQualityInspection.searchMySQLDB(query, '', connection);
                return Q.all(dbData).then(dbResult => {
                    let reformatData = [];
                    dbResult.forEach(item => {
                        let dData = {};
                        dData.messageId = item.msg_id;
                        let conversation = dbQualityInspection.conversationReformat(item.content);
                        dData.conversation = conversation;
                        dData.companyId = item.company_id;
                        dData.operatorName = item.operator_name;
                        reformatData.push(dData);
                    });
                    let cv = {
                        mongo: results,
                        mysql: reformatData
                    };
                    deferred.resolve(cv);
                })
            }
        })
        return deferred.promise;
    },
    isValidCV: function(cv, platforms, needValidCV){
        //based on platform's conversationDefinition setting, filter conversation which is
        // not qualified to rate , example: conversation is too fast, less of conversation .
        let result = needValidCV;
        let platform = platforms.filter(item => {
            if (item.live800CompanyId && item.live800CompanyId.length > 0) {
                if(item.live800CompanyId.indexOf(String(cv.companyId)) != -1){
                    return item;
                }
            }
        });
        if (platform.length > 0) {
            platform = platform[0];
        }
        if (platform.conversationDefinition) {
            let conversationDefinition = platform.conversationDefinition;
            let noValidMathCount = 0;
            let dialogTime = 0;

            if (cv.conversation.length >= 2) {
                let firstCV = cv.conversation[0].time;
                let lastCV = cv.conversation[cv.conversation.length - 1].time;
                // time validation
                dialogTime = (lastCV - firstCV) / 1000;
                if (dialogTime < conversationDefinition.totalSec) {
                    noValidMathCount += 1;
                }
            } else {
                noValidMathCount += 1;
            }

            let csCVCount = 0;
            let customerCVCount = 0;
            let firstCV = null;
            var lastCustomerCV = null;

            //calculate each CS/ Customer Conversation
            cv.conversation.forEach(cItem => {

                if(cItem.roles == 1){
                    csCVCount += 1;
                }else if(cItem.roles == 2){
                    customerCVCount += 1;
                }
            });

            if (customerCVCount < conversationDefinition.askingSentence) {
                noValidMathCount += 1;
            }
            if (csCVCount < conversationDefinition.replyingSentence) {
                noValidMathCount += 1;
            }

            // one of these condition error, then this conversation will hide

            if(needValidCV){
                if (noValidMathCount >= 1) {
                    result = false
                }
            }else{
                if (noValidMathCount >= 1) {
                    result = true
                }
            }
        }
        return result;
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
            let he = dom.window.document.getElementsByTagName("he");
            let i = dom.window.document.getElementsByTagName("i");

            partI = dbQualityInspection.reGroup(i, 1);
            partHe = dbQualityInspection.reGroup(he, 2);
            content = partI.concat(partHe);
            content.sort(function (a, b) {
                return a.time - b.time;
            });

            return content;
    },
    searchPendingMySQL:function(mongoData, queryObj, paginationQuery, connection){
        var deferred = Q.defer();
        connection.connect();
        Q.all(mongoData).then(mg=> {
            let mgData = [];
            let excludeMongoQuery = "";
            let contentInfoList = "";
            mg.forEach(item => {
                if(item){
                    contentInfoList += "('" + item.messageId + "','" + item.live800Acc.name + "'),";
                }
            })

            if(contentInfoList && contentInfoList.length > 0){
                contentInfoList = contentInfoList && contentInfoList.length > 0 ? contentInfoList.substring(0,contentInfoList.length - 1) : contentInfoList;
                excludeMongoQuery = " AND (msg_id,operator_name) NOT IN (" + contentInfoList + ")";
            }

            console.log("SELECT * FROM chat_content WHERE " + queryObj + excludeMongoQuery + paginationQuery);
            connection.query("SELECT store_time,company_id,msg_id,operator_id,operator_name,content, close_reason, close_name FROM chat_content WHERE " + queryObj + excludeMongoQuery + " ORDER BY store_time " + paginationQuery, function (error, results, fields) {
                if (error) {
                    console.log(error)
                }
                deferred.resolve(results);
                connection.end();
            });
        })

        return deferred.promise;
    },
    searchMySQLDB:function(queryObj, paginationQuery, connection){
        var deferred = Q.defer();

        connection.query("SELECT * FROM chat_content WHERE " + queryObj + " ORDER BY store_time " + paginationQuery, function (error, results, fields) {
            // if (error) throw error;
            if(error){
                console.log(error);
            }
            deferred.resolve(results);
            connection.end();
        });
        return deferred.promise;
    },
    countMySQLDB:function(queryObj,connection){
        let deferred = Q.defer();
            connection.connect();
            console.log(queryObj);
            connection.query("SELECT COUNT(msg_id) FROM chat_content WHERE" + queryObj, function (error, results, fields) {
                let countNo = 0;
                if(results){
                    if(results[0] && results[0]['COUNT(msg_id)']){
                        countNo = results[0]['COUNT(msg_id)'];
                    }
                    if(error){
                        console.log(error);
                    }
                }
                deferred.resolve(countNo);
                connection.end();
            });
        return deferred.promise;
    },
    getMongoCV:function(dbResult, noValidCV){
        var deferred = Q.defer();

        let platformProm = dbconfig.collection_platform.find().lean();
        let proms = [];
        Q.all([dbResult, platformProm]).then(results => {
            // console.log(results);

            let sqlData = results[0];
            let platformDetails = results[1];
            let isValidCV;
            if (sqlData.length == 0) {
                deferred.resolve([]);
            }
            sqlData.forEach(item => {
                let live800Chat = {conversation: [], live800Acc: {}};
                live800Chat.messageId = item.msg_id;
                live800Chat.status = item.status;
                live800Chat.qualityAssessor = item.qualityAssessor;
                live800Chat.fpmsAcc = item.operator_name;
                live800Chat.processTime = item.processTime;
                live800Chat.appealReason = item.appealReason;
                live800Chat.companyId = item.company_id;
                live800Chat.createTime = new Date(item.store_time).toISOString();

                live800Chat.live800Acc['id'] = item.company_id + '-' + item.operator_name;
                live800Chat.live800Acc['name'] = item.operator_name;
                live800Chat.operatorName = item.operator_name;
                live800Chat.closeReason = item.close_reason;
                live800Chat.closeName = item.close_name;

                let dom = new JSDOM(item.content);
                let content = [];
                let he = dom.window.document.getElementsByTagName("he");
                let i = dom.window.document.getElementsByTagName("i");
                let file = dom.window.document.getElementsByTagName("file");

                partI = dbQualityInspection.reGroup(i, 1);
                partHe = dbQualityInspection.reGroup(he, 2);
                let partFile = dbQualityInspection.reGroup(file, 3);
                content = partI.concat(partHe);
                content = content.concat(partFile);
                content.sort(function (a, b) {
                    return a.time - b.time;
                });
                let platformInfo = platformDetails.filter(item => {
                    if(item.live800CompanyId && item.live800CompanyId.length > 0){
                        if(item.live800CompanyId.indexOf(String(live800Chat.companyId)) != -1){
                            return item;
                        }
                    }
                });
                platformInfo = platformInfo[0] ? platformInfo[0] : [];
                live800Chat.conversation = dbQualityInspection.calculateRate(content, platformInfo, live800Chat.createTime);


                if(noValidCV){
                    // when status = 7, show only un_evaluate data to user;
                    isValidCV = dbQualityInspection.isValidCV(live800Chat, platformDetails, false);
                }else{
                    // only display valid conversation to user
                    isValidCV = dbQualityInspection.isValidCV(live800Chat, platformDetails, true);
                }

                if(isValidCV){
                    let queryQA = {messageId: String(item.msg_id)};
                    let prom = dbconfig.collection_qualityInspection.find(queryQA)
                        .populate({path: 'qualityAssessor', model: dbconfig.collection_admin})
                        .populate({path: 'fpmsAcc', model: dbconfig.collection_admin}).lean()
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
                }
            });
            deferred.resolve(proms);
        });
      return deferred.promise;

    },
    calculateRate: function(conversation, platform, chatClosedTime) {
        let firstCV = null;
        let firstTime = null;
        let lastReply = null;
        let lastCustomerQuestion = null;
        let closedTime = null;
        if (!platform) {
            return conversation;
        }
        if (chatClosedTime) {
            let time = new Date(chatClosedTime);
            closedTime = time.getTime();
        }
        if (platform.overtimeSetting) {
            let overtimeSetting = platform.overtimeSetting;
            overtimeSetting.sort(function (a, b) {
                return a.conversationInterval - b.conversationInterval
            });
            conversation.forEach(item => {
                if (!firstCV && (item.roles == 2 || item.roles == 3)) {
                    // find the first & last customer question
                    firstCV = item;
                    lastCustomerQuestion = item;
                } else {
                    if (item.roles == 2 || item.roles == 3) {
                        // customer keep saying ....
                        // keep the last customer question, to calculate the timeoutRate
                        if (lastReply.roles == 1) {
                            // update the last customer question
                            lastCustomerQuestion = item;
                        }
                    } else if (item.roles == 1 && lastCustomerQuestion) {
                        // if cs reply, calculate the timeout rate
                        let timeStamp = item.time - lastCustomerQuestion.time;
                        let sec = timeStamp / 1000;
                        let rate = 0;
                        if (lastReply.roles == 1) {
                            // if that's cs conversation before it, no need to rate again.
                        } else if (lastReply.roles != 1) {
                            // calculate the timeoutRate
                            item.timeoutRate = dbQualityInspection.rateByCVTime(overtimeSetting, item, sec);
                        }
                    } else {

                    }
                }
                // record the last conversation, to compare whether it's same role with last conversation.
                lastReply = item;
                return item;
            });

            let totalConversation = conversation ? conversation.length : 0;
            let last = totalConversation - 1;

            // execute if the last conversation is not from CS
            if (last > -1 && conversation[last].roles !== 1) {
                let timeStamp = closedTime - conversation[last].time; // from last customer question until chat closed time
                let sec = timeStamp / 1000;

                // automatically add last conversation for CS to display overtime
                conversation[last+1] = {
                    time : closedTime, // chat closed time
                    review: "",
                    content : '"---关闭对话---没有回复访客---"',
                    inspectionRate : 0,
                    timeoutRate : 0,
                    createTime: new Date(closedTime),
                    roles : 3
                };
                conversation[last+1].timeoutRate = dbQualityInspection.rateByCVTime(overtimeSetting, '', sec);
            }
        }
        return conversation;
    },
    rateByCVTime: function(overtimeSetting, cv, sec){
        let timeoutRate = 0;
        let otsLength = overtimeSetting.length - 1;
        overtimeSetting.forEach((ots,i)=>{
            if(i==0){
                if(sec <= overtimeSetting[0].conversationInterval){
                    timeoutRate = overtimeSetting[0].presetMark;
                }
            }else if(i==otsLength){
                if(sec >= overtimeSetting[i - 1].conversationInterval){
                    timeoutRate = overtimeSetting[i].presetMark;
                }
            }else{
                if(sec > overtimeSetting[i-1].conversationInterval && sec <= overtimeSetting[i].conversationInterval){
                    timeoutRate = overtimeSetting[i].presetMark;
                }
            }
        });
        return timeoutRate
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
    getProgressReportByOperator: function (companyId,operatorId,startTime,endTime){

       //var startTime = dbUtility.getLocalTimeString(startTime);
       //var endTime = dbUtility.getLocalTimeString(endTime);

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    companyId: {$in: companyId},
                    "live800Acc.name": {$in: operatorId}
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
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
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Q.reject({name: "DBError", message: error});
        })
    },
    reGroup: function(arrs,type){
        let conversation= [] ;
        for (var t = 0; t < arrs.length; t++) {
            let timeStamp = arrs[t].getAttribute("tm");
            let innerHTML =arrs[t].innerHTML;
            let html = dbQualityInspection.unescapeHtml(arrs[t].innerHTML);
            const dom = new JSDOM(html)
            let conversationInfo = {
                'time':timeStamp ? timeStamp:'' ,
                'roles':type,
                'roleName':constQualityInspectionRoleName[type],
                'createTime':timeStamp ?timeStamp:'' ,
                'timeoutRate':0,
                'inspectionRate':0,
                'review':'',
                'content': type == 3 || type == "3" ? "" : dbQualityInspection.decodeHtml(dom.window.document.querySelector('body').textContent)
            };
            conversation.push(conversationInfo);
        }
        return conversation;
    },

    unescapeHtml:function(str){ var map = {amp: '&', lt: '<', le: '≤', gt: '>', ge: '≥', quot: '"', '#039': "'"};
        return str.replace(/&([^;]+);/g, (m, c) => map[c]|| '')
    },
    decodeHtml:function(str){
        return String(str).replace(/\&#60\;/gi,'').replace(/\&#160\;/gi, ' ').replace(/\&#173\;/gi, '\t')
    },

    getUnreadEvaluationRecord: function (startTime, endTime, index, size, adminId) {
        let query = {
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            status: constQualityInspectionStatus.COMPLETED_UNREAD,
            fpmsAcc: adminId
        }
        let unreadEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            unreadEvaluationData => {
                if(unreadEvaluationData && unreadEvaluationData.length > 0){
                    //let dbResult = dbQualityInspection.searchMongoDB(query);
                    let queryToSearchFromMySQL = {
                        startTime: startTime,
                        endTime: endTime
                    }
                    let result = dbQualityInspection.getMySQLConversation(unreadEvaluationData,queryToSearchFromMySQL);
                    conversationForm = dbQualityInspection.fillContent(result);
                    return conversationForm;
                }
            }
        ).then(
            conversationData => {
                let proms = [];
                if(conversationData){
                    conversationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        ).then(
            finalResult => {
                if(finalResult && finalResult.length > 0){
                    return finalResult;
                }
            }
        );

        let unreadEvaluationRecordCount = dbconfig.collection_qualityInspection.find(query).count();

        return Promise.all([unreadEvaluationRecord,unreadEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getUnreadEvaluationRecordByDailyRecord: function (startTime, endTime, index, size, adminId) {
        let query = {
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            status: constQualityInspectionStatus.COMPLETED_UNREAD,
            fpmsAcc: ObjectId(adminId)
        };

        let proms = [];
        let unreadEvaluationRecord = dbconfig.collection_live800RecordDayRecord.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            unreadEvaluationData => {
                if(unreadEvaluationData && unreadEvaluationData.length > 0){
                    unreadEvaluationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        )

        let unreadEvaluationRecordCount = dbconfig.collection_live800RecordDayRecord.find(query).count();

        return Promise.all([unreadEvaluationRecord,unreadEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getQualityAssessorName: function(unreadEvaluationData){
        if(unreadEvaluationData && unreadEvaluationData.qualityAssessor){
            return dbconfig.collection_admin.findOne({_id: unreadEvaluationData.qualityAssessor}).then(
                adminInfo => {

                    if(adminInfo && adminInfo.adminName){
                        unreadEvaluationData.qualityAssessor = adminInfo.adminName;
                    }

                    return;
                }
            ).then(
                () => {
                    return dbconfig.collection_admin.findOne({_id: unreadEvaluationData.fpmsAcc}).then(
                        fpmsAccInfo => {
                            if(fpmsAccInfo && fpmsAccInfo.adminName){
                                unreadEvaluationData.fpmsAcc = fpmsAccInfo.adminName;
                            }

                            return unreadEvaluationData;
                        }
                    )
                }
            );
        }
    },

    getReadEvaluationRecord: function(startTime, endTime, index, size, adminId){
        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            status: constQualityInspectionStatus.COMPLETED_READ,
            fpmsAcc: adminId
        }
        let readEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            readEvaluationData => {
                if(readEvaluationData && readEvaluationData.length > 0){
                    let queryToSearchFromMySQL = {
                        startTime: startTime,
                        endTime: endTime
                    }
                    let result = dbQualityInspection.getMySQLConversation(readEvaluationData,queryToSearchFromMySQL);
                    conversationForm = dbQualityInspection.fillContent(result);
                    return conversationForm;
                }
            }
        ).then(
            conversationData => {
                let proms = [];
                if(conversationData){
                    conversationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        ).then(
            finalResult => {
                if(finalResult){
                    return finalResult;
                }
            }
        );

        let readEvaluationRecordCount = dbconfig.collection_qualityInspection.find(query).count();

        return Promise.all([readEvaluationRecord,readEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getReadEvaluationRecordByDailyRecord: function(startTime, endTime, index, size, adminId){
        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            status: constQualityInspectionStatus.COMPLETED_READ,
            fpmsAcc: adminId
        }
        let readEvaluationRecord = dbconfig.collection_live800RecordDayRecord.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            readEvaluationData => {
                let proms = [];
                if(readEvaluationData){
                    readEvaluationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        )

        let readEvaluationRecordCount = dbconfig.collection_live800RecordDayRecord.find(query).count();

        return Promise.all([readEvaluationRecord,readEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getAppealEvaluationRecordByConversationDate: function(startTime, endTime, status, index, size, adminId){
        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            fpmsAcc: adminId
        }

        if(status != "all"){
            query.status = status;
        }
        else{
            query.status = {$in: [constQualityInspectionStatus.APPEALING, constQualityInspectionStatus.APPEAL_COMPLETED]};
        }

        let appealEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            appealEvaluationData => {
                if(appealEvaluationData && appealEvaluationData.length > 0){
                    let queryToSearchFromMySQL = {
                        startTime: startTime,
                        endTime: endTime
                    }
                    let result = dbQualityInspection.getMySQLConversation(appealEvaluationData,queryToSearchFromMySQL);
                    conversationForm = dbQualityInspection.fillContent(result);
                    return conversationForm;
                }
            }
        ).then(
            conversationData => {
                let proms = [];
                if(conversationData){
                    conversationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        ).then(
            finalResult => {
                if(finalResult){
                    return finalResult;
                }
            }
        );

        let appealEvaluationRecordCount = dbconfig.collection_qualityInspection.find(query).count();

        return Promise.all([appealEvaluationRecord,appealEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getAppealEvaluationRecordByConversationDateInDailyRecord: function(startTime, endTime, status, index, size, adminId){
        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            fpmsAcc: adminId
        }

        if(status != "all"){
            query.status = status;
        }
        else{
            query.status = {$in: [constQualityInspectionStatus.APPEALING, constQualityInspectionStatus.APPEAL_COMPLETED]};
        }

        let appealEvaluationRecord = dbconfig.collection_live800RecordDayRecord.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            appealEvaluationData => {
                let proms = [];
                if(appealEvaluationData){
                    appealEvaluationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        );

        let appealEvaluationRecordCount = dbconfig.collection_live800RecordDayRecord.find(query).count();

        return Promise.all([appealEvaluationRecord,appealEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getAppealEvaluationRecordByAppealDate: function(startTime, endTime, status, index, size, adminId){

        let query ={
            processTime: {
                $gte: startTime,
                $lt: endTime
            },
            fpmsAcc: adminId
        }

        if(status != "all"){
            query.status = status;
        }
        else{
            query.status = {$in: [constQualityInspectionStatus.APPEALING, constQualityInspectionStatus.APPEAL_COMPLETED]};
        }

        let appealEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            appealEvaluationData => {
                if(appealEvaluationData && appealEvaluationData.length > 0){
                    let queryToSearchFromMySQL = {
                        startTime: startTime,
                        endTime: endTime
                    }
                    let result = dbQualityInspection.getMySQLConversation(appealEvaluationData,queryToSearchFromMySQL);
                    conversationForm = dbQualityInspection.fillContent(result);
                    return conversationForm;
                }
            }
        ).then(
            conversationData => {
                let proms = [];
                if(conversationData){
                    conversationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        ).then(
            finalResult => {
                if(finalResult){
                    return finalResult;
                }
            }
        );

        let appealEvaluationRecordCount = dbconfig.collection_qualityInspection.find(query).count();

        return Promise.all([appealEvaluationRecord,appealEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getAppealEvaluationRecordByAppealDateInDailyRecord: function(startTime, endTime, status, index, size, adminId){
        let query ={
            processTime: {
                $gte: startTime,
                $lt: endTime
            },
            fpmsAcc: adminId
        }

        if(status != "all"){
            query.status = status;
        }
        else{
            query.status = {$in: [constQualityInspectionStatus.APPEALING, constQualityInspectionStatus.APPEAL_COMPLETED]};
        }

        let appealEvaluationRecord = dbconfig.collection_live800RecordDayRecord.find(query).lean().skip(index).limit(size).sort({createTime: -1}).then(
            appealEvaluationData => {
                let proms = [];
                if(appealEvaluationData){
                    appealEvaluationData.forEach(c => {
                        proms.push(dbQualityInspection.getQualityAssessorName(c));
                    })
                }

                return Promise.all(proms);
            }
        );

        let appealEvaluationRecordCount = dbconfig.collection_live800RecordDayRecord.find(query).count();

        return Promise.all([appealEvaluationRecord,appealEvaluationRecordCount]).then(
            result => {
                if(result && result[0] && result[1]){
                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getWorkloadReport: function(startTime, endTime, qaAccount){
        let query ={
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }

        qaAccount = qaAccount.map(q => ObjectId(q))

        if(qaAccount && qaAccount.length > 0){
            query.qualityAssessor = {$in: qaAccount};
        }

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: query
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
                            qaAccount: d._id.qualityAssessor,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });

                return resultArr;
            }

        }).then(resultData => {
           if(resultData && resultData.length > 0){
               let proms = [];
               resultData.map(r => {
                   proms.push(dbQualityInspection.getAdminNameById(r));
               })

               return Promise.all(proms);
           }
        }).then(
            returnedData => {
                if(returnedData && returnedData.length > 0){
                    return returnedData;
                }
            }
        );
    },
    getWorkloadReportByDailyRecord: function(startTime, endTime, qaAccount){
        let query ={
            createTime: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }

        qaAccount = qaAccount.map(q => ObjectId(q))

        if(qaAccount && qaAccount.length > 0){
            query.qualityAssessor = {$in: qaAccount};
        }

        return dbconfig.collection_live800RecordDayRecord.aggregate([
            {
                $match: query
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
                            qaAccount: d._id.qualityAssessor,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });

                return Promise.all(resultArr);
            }

        }).then(resultData => {
           if(resultData && resultData.length > 0){
               let proms = [];
               resultData.map(r => {
                   proms.push(dbQualityInspection.getAdminNameById(r));
               })

               return Promise.all(proms);
           }
        });
    },
    getWorkloadReportByDate: function(startTime, endTime, qaName){

        let proms =[];
        let dayStartTime = new Date (startTime);

        let getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
        }

        while (dayStartTime.getTime() < new Date(endTime).getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);


            let query ={
                createTime: {
                    $gte: dayStartTime,
                    $lt: dayEndTime
                },
            }

            proms.push(dbconfig.collection_admin.findOne({adminName: qaName}).then( adminInfo => {
                if (adminInfo){
                    query.qualityAssessor = ObjectId(adminInfo._id)
                    return dbconfig.collection_qualityInspection.aggregate(
                        {
                            $match: query
                        }, {
                            "$group": {
                                "_id": {
                                    "qualityAssessor": "$qualityAssessor",
                                    "status": "$status"
                                },
                                "count": {"$sum": 1},
                            }
                        }
                    ).read("secondaryPreferred");

                }
            }));

            dayStartTime = dayEndTime;
        }

        return Q.all([Q.all(proms)]).then(data => {

            if (!data[0]) {
                return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
            }

            let tempDate = new Date(startTime);

            let res = [];

            data[0].forEach(item => {
                if (item && item.length > 0){
                    let statusList = [];
                    item.forEach( itemDetail => {
                        if (itemDetail){
                            statusList.push(itemDetail);
                        }
                    });

                    let obj = {
                        date: tempDate,
                        //qaAccount: item[0].qualityAssessor,
                        data: statusList,
                    }

                    res.push(obj);
                }
                tempDate = getNextDate(tempDate);
            });

            return res;
        });
    },

    getWorkloadReportByDateInDailyRecord: function(startTime, endTime, qaName){
        let proms =[];
        let dayStartTime = new Date (startTime);

        let getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
        }

        while (dayStartTime.getTime() < new Date(endTime).getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);


            let query ={
                createTime: {
                    $gte: dayStartTime,
                    $lt: dayEndTime
                },
            }

            proms.push(dbconfig.collection_admin.findOne({adminName: qaName}).then( adminInfo => {
                if (adminInfo){
                    query.qualityAssessor = ObjectId(adminInfo._id)
                    return dbconfig.collection_live800RecordDayRecord.aggregate(
                        {
                            $match: query
                        }, {
                            "$group": {
                                "_id": {
                                    "qualityAssessor": "$qualityAssessor",
                                    "status": "$status"
                                },
                                "count": {"$sum": 1},
                            }
                        }
                    ).read("secondaryPreferred");

                }
            }));

            dayStartTime = dayEndTime;
        }

        return Promise.all([Promise.all(proms)]).then(data => {

            if (!data[0]) {
                return Promise.reject({name: 'DataError', message: 'Can not find proposal record'})
            }

            let tempDate = new Date(startTime);

            let res = [];

            data[0].forEach(item => {
                if (item && item.length > 0){
                    let statusList = [];
                    item.forEach( itemDetail => {
                        if (itemDetail){
                            statusList.push(itemDetail);
                        }
                    });

                    let obj = {
                        date: tempDate,
                        //qaAccount: item[0].qualityAssessor,
                        data: statusList,
                    }

                    res.push(obj);
                }
                tempDate = getNextDate(tempDate);
            });

            return res;
        });
    },

    getAdminNameById: function(workloadResultArr){
        //let returnedAdminData = {};
        return dbconfig.collection_admin.findOne({_id: workloadResultArr.qaAccount}).lean().then(
            adminData => {
                if(adminData){
                    workloadResultArr.qaAccount = adminData.adminName;
                }

                return workloadResultArr;
            }
        );
    },

    markEvaluationRecordAsRead: function(appealRecordArr, status){
        if(appealRecordArr && appealRecordArr.length > 0){

            let updateData = {
                status: constQualityInspectionStatus.COMPLETED_READ
            }

            return appealRecordArr.forEach(a => {

                if(a && a.messageId){
                    let query ={
                        messageId: a.messageId,
                        status: constQualityInspectionStatus.COMPLETED_UNREAD
                    }

                    let updateData = {
                        status: constQualityInspectionStatus.COMPLETED_READ
                    }

                    return dbconfig.collection_qualityInspection.findOneAndUpdate(query,updateData).exec();
                }
            });
        }

    },

    markEvaluationRecordAsReadByDailyRecord: function(appealRecordArr, status){
        let prom = [];
        if(appealRecordArr && appealRecordArr.length > 0){
            let updateData = {
                status: constQualityInspectionStatus.COMPLETED_READ
            }

            appealRecordArr.forEach(a => {
                if(a && a.messageId){
                    let query ={
                        messageId: a.messageId,
                        status: constQualityInspectionStatus.COMPLETED_UNREAD
                    }

                    let updateData = {
                        status: constQualityInspectionStatus.COMPLETED_READ
                    }

                    prom.push(dbconfig.collection_live800RecordDayRecord.findOneAndUpdate(query,updateData).lean())
                }
            });
        }
        return Promise.all(prom);

    },

    appealEvaluation: function(appealRecordArr){
        if(appealRecordArr && appealRecordArr.length > 0){

            let updateData = {
                status: constQualityInspectionStatus.APPEALING
            }

            return appealRecordArr.forEach(a => {
                if(a && a.messageId){
                    let query ={
                        messageId: a.messageId,
                        status: constQualityInspectionStatus.COMPLETED_UNREAD
                    }

                    if(a.appealReason){
                        updateData.appealReason = a.appealReason;
                    }

                    return dbconfig.collection_qualityInspection.findOneAndUpdate(query,updateData).exec();
                }

            });
        }
    },

    appealEvaluationByDailyRecord: function(appealRecordArr){
        let prom = [];
        if(appealRecordArr && appealRecordArr.length > 0){

            let updateData = {
                status: constQualityInspectionStatus.APPEALING
            }

            appealRecordArr.forEach(a => {
                if(a && a.messageId){
                    let query ={
                        messageId: a.messageId,
                        status: constQualityInspectionStatus.COMPLETED_UNREAD
                    }

                    if(a.appealReason){
                        updateData.appealReason = a.appealReason;
                    }

                    prom.push(dbconfig.collection_live800RecordDayRecord.findOneAndUpdate(query,updateData).lean())
                }

            });
        }

        return Promise.all(prom);
    },

    rateBatchConversation: function(cvs, accName) {
        var deferred = Q.defer();
        let proms = [];
        let live800AccReg = null;
        cvs.batchData.forEach(uItem=>{
            if(uItem && uItem.live800Acc && uItem.live800Acc.id && uItem.status != constQualityInspectionStatus.NOT_EVALUATED) {
                live800AccReg = new RegExp("^" + uItem.live800Acc.id + "$", "i")
            }

            let query = { 'live800Acc': live800AccReg};
            let prom = dbconfig.collection_admin.findOne(query).lean().then(
                item=>{
                    let adminName = item ? item._id:null;
                    return adminName
                })
                .then(udata=>{
                    return dbconfig.collection_qualityInspection.find({messageId: uItem.messageId, "live800Acc.name": new RegExp("^" + uItem.live800Acc.name + "$", "i")}).lean().then(qaData => {
                        delete uItem.statusName;
                        uItem.qualityAssessor = accName;
                        uItem.processTime = Date.now();
                        uItem.fpmsAcc = udata;
                        uItem.status = constQualityInspectionStatus.COMPLETED;

                        // calculate a sum of total rating
                        let totalInspectionRate = 0;
                        let totalTimeoutRate = 0;
                        uItem.conversation.forEach(item=>{
                            totalInspectionRate += item.inspectionRate;
                            totalTimeoutRate += item.timeoutRate;
                        });
                        uItem.totalInspectionRate = totalInspectionRate;
                        uItem.totalTimeoutRate = totalTimeoutRate;

                        console.log('uItem', uItem);

                        if (qaData.length == 0) {
                            return dbconfig.collection_qualityInspection(uItem).save();
                        }else{
                            dbconfig.collection_qualityInspection.findOneAndUpdate(
                                {messageId: uItem.messageId},
                                uItem
                            ).lean().then(data=>{
                                console.log(data);
                            })
                        }
                    })
                })
            proms.push(prom);
        });

        return Q.all(proms).then(data=>{
            console.log(data);
        });
        return deferred.promise;
    },
    rateBatchConversationByDailyRecord: function(cvs, accName){
        let proms = [];
        let live800AccReg = null;

        cvs.batchData.forEach(
            uItem => {
                if(uItem && uItem.live800Acc && uItem.live800Acc.id && uItem.status != constQualityInspectionStatus.NOT_EVALUATED) {
                    live800AccReg = new RegExp("^" + uItem.live800Acc.id + "$", "i")
                }

                let query = { 'live800Acc': live800AccReg};
                let prom = dbconfig.collection_admin.findOne(query).then(
                    item => {
                        let adminName = item ? item._id : null;
                        return adminName
                    }).then(
                        udata => {
                            if (uItem && uItem.statusName){
                                delete uItem.statusName;
                            }

                            if (uItem && uItem._id){
                                delete uItem._id;
                            }
                            uItem.qualityAssessor = accName;
                            uItem.processTime = Date.now();
                            uItem.fpmsAcc = udata;
                            uItem.status = constQualityInspectionStatus.COMPLETED;

                            // calculate a sum of total rating
                            let totalInspectionRate = 0;
                            let totalTimeoutRate = 0;
                            uItem.conversation.forEach(item=>{
                                totalInspectionRate += item.inspectionRate;
                                totalTimeoutRate += item.timeoutRate;
                            });
                            uItem.totalInspectionRate = totalInspectionRate;
                            uItem.totalTimeoutRate = totalTimeoutRate

                            return dbconfig.collection_live800RecordDayRecord.findOneAndUpdate(
                                {
                                    messageId: uItem.messageId,
                                    "live800Acc.name": new RegExp("^" + uItem.live800Acc.name + "$", "i"),
                                    createTime: uItem.createTime
                                },
                                uItem, {new: true}
                            )
                        });
                proms.push(prom);
            }
        );

        return Promise.all(proms).then(data=>{
            console.log(data);
        });
    },
    rateCSConversationByDailyRecord: function (data , adminId) {
        let live800Acc = data.live800Acc.id  ? data.live800Acc.id :'xxx';
        let query = { 'live800Acc': {$in: [live800Acc]} };
        let totalInspectionRate = 0;
        let totalTimeoutRate = 0;
        let csAdmin = null;
        data.conversation.forEach(item=>{
            totalInspectionRate += item.inspectionRate;
            totalTimeoutRate += item.timeoutRate;
        });
        data.totalInspectionRate = totalInspectionRate;
        data.totalTimeoutRate = totalTimeoutRate;
        return dbconfig.collection_admin.findOne(query).then(
            item=>{
                if(item){
                    let cs = item ? item._id:null;
                    return cs
                }else{
                    return Promise.reject({name: "DataError", message: "Cannot find related Customer Services Employee"});
                }

            }
        ).then(
            udata=> {
                csAdmin = udata;
                delete data.statusName;
                data.qualityAssessor = adminId;
                data.processTime = Date.now();
                data.fpmsAcc = csAdmin;

                if(data.status == constQualityInspectionStatus.APPEALING){
                    data.status = constQualityInspectionStatus.APPEAL_COMPLETED;
                }else{
                    data.status = constQualityInspectionStatus.COMPLETED_UNREAD;
                }

                if(data && data._id){
                    delete data._id;
                }

                return dbconfig.collection_live800RecordDayRecord.findOneAndUpdate(
                    {messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name, "i"), createTime: data.createTime},
                    data, {new: true}
                );
            }
        )
    },
    rateCSConversation: function (data , adminId) {
        var deferred = Q.defer();
        console.log(data);
        let live800Acc = data.live800Acc.id  ? data.live800Acc.id :'xxx';
        let query = { 'live800Acc': {$in: [live800Acc]} };
        let totalInspectionRate = 0;
        let totalTimeoutRate = 0;
        data.conversation.forEach(item=>{
            totalInspectionRate += item.inspectionRate;
            totalTimeoutRate += item.timeoutRate;
        });
        data.totalInspectionRate = totalInspectionRate;
        data.totalTimeoutRate = totalTimeoutRate;
        return dbconfig.collection_admin.findOne(query).then(
          item=>{
              if(item){
                  let cs = item ? item._id:null;
                  return cs
              }else{
                  return Q.reject({name: "DataError", message: "Cannot find related Customer Services Employee"});
              }

        })
        .then(udata=>{
            return dbconfig.collection_qualityInspection.find({messageId: data.messageId, "live800Acc.name": new RegExp("^" + data.live800Acc.name + "$", "i")}).then(qaData => {
                delete data.statusName;
                data.qualityAssessor = adminId;
                data.processTime = Date.now();
                data.fpmsAcc = udata;

                if(data.status == constQualityInspectionStatus.APPEALING){
                    data.status = constQualityInspectionStatus.APPEAL_COMPLETED;
                }else{
                    data.status = constQualityInspectionStatus.COMPLETED_UNREAD;
                }

                if (qaData.length == 0) {
                    return dbconfig.collection_qualityInspection(data).save();
                }else{
                    if(data && data._id){
                        delete data._id;
                    }

                    console.log("LH TEST QUALITYINSPECTION",data);
                    console.log("LH TEST QUALITYINSPECTION DATA",qaData);
                    console.log("LH TEST QUALITYINSPECTION UPDATE QUERY",{messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name + "$", "i")});
                    console.log("LH TEST QUALITYINSPECTION FIND DATA",dbconfig.collection_qualityInspection.find(
                        {messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name + "$", "i")}
                    ));
                    // dbconfig.collection_qualityInspection.findOneAndUpdate(
                    //     {messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name, "i")},
                    //     data
                    // ).then(data=>{
                    //     console.log("LH TEST return DATA,",data);
                    // })
                    dbconfig.collection_qualityInspection.findOneAndUpdate(
                        {messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name + "$", "i")},
                        {$set: {
                                conversation: data.conversation,
                                status: data.status,
                                processTime: data.processTime,
                                totalInspectionRate: data.totalInspectionRate,
                                totalTimeoutRate: data.totalTimeoutRate
                            }
                        },
                        {new: true}
                    ).then(data=>{
                        console.log("LH TEST return DATA,",data);
                    })
                }
            })
        });

        return deferred.promise;
    },
    getEvaluationRecordYearMonth: function (platformObjId) {
        return dbconfig.collection_qualityInspection.aggregate(
            {
                "$group": {
                    "_id": {"month": {"$month": "$createTime"}, "year": {"$year": "$createTime"}},
                }
            },
            { $sort : { "_id.year" : -1, "_id.month" : -1}, }
        ).exec();

    },

    getEvaluationProgressRecord: function (platformObjId, startDate, endDate) {
        if(startDate && endDate) {
            let proms = [];
            if (platformObjId && platformObjId.length > 0) {
                return dbconfig.collection_platform.find({_id: {$in: platformObjId}}).lean().then(
                    platformDetail => {
                        if (platformDetail && platformDetail.length > 0) {
                            platformDetail.map(p => {

                                if(p && p.live800CompanyId && p.live800CompanyId.length > 0){
                                    let platformName = p.name ? p.name : (p.platformName ? p.platformName : "");
                                    let query = {
                                        createTime: {
                                            $gte: new Date(startDate),
                                            $lt: new Date(endDate)
                                        },
                                        companyId: {$in: p.live800CompanyId}
                                    }

                                    let summarizedData =  dbconfig.collection_live800RecordDaySummary.aggregate([
                                        {
                                            $match: query
                                        },
                                        {
                                            "$group": {
                                                "_id": {
                                                    "date": "$createTime"
                                                },
                                                "sumOfTotalRecord": {$sum: "$effectiveRecord"},
                                            }
                                        }
                                    ]).then(
                                        live800SummarizeRecord => {
                                            if(live800SummarizeRecord && live800SummarizeRecord.length > 0){
                                                let summarizedRecordArr = [];
                                                live800SummarizeRecord.map(l => {
                                                    if(l && l._id && l._id.date){
                                                        let startTime = new Date(l._id.date);
                                                        let endTime = new Date(l._id.date);
                                                        endTime.setHours(23, 59, 59, 999);
                                                        let companyIdList = p.live800CompanyId.map(live800Id => parseFloat(live800Id));
                                                        companyIdList = companyIdList.concat(p.live800CompanyId);

                                                        let queryToGetQIRecord = {
                                                            createTime: {
                                                                $gte: new Date(startTime),
                                                                $lte: new Date(endTime)
                                                            },
                                                            companyId: {$in: companyIdList}
                                                        }

                                                        console.log("LH check QI C -----------------", queryToGetQIRecord);
                                                        
                                                        let calculatedData = dbconfig.collection_qualityInspection.find(queryToGetQIRecord).count().then(
                                                            qualityInspectionCount => {
                                                                let isCompleted = false;
                                                                if(qualityInspectionCount){
                                                                    if(l.sumOfTotalRecord - qualityInspectionCount == 0){
                                                                        isCompleted = true;
                                                                    }
                                                                }

                                                                let result = {
                                                                    platformName: platformName,
                                                                    totalRecord: l.sumOfTotalRecord || 0,
                                                                    isCompleted: isCompleted,
                                                                    totalRecordFromFPMS:qualityInspectionCount ? qualityInspectionCount : 0,
                                                                    date: l._id.date
                                                                };
                                                                return result;
                                                            }
                                                        )
                                                        summarizedRecordArr.push(calculatedData);
                                                    }
                                                })

                                                return Promise.all(summarizedRecordArr);
                                            }
                                    })
                                    proms.push(summarizedData);
                                }
                            })

                            return Promise.all(proms);
                        }
                    }
                )
            }
        }
    },

    getEvaluationProgressRecordByDailyRecord: function (platformObjId, startDate, endDate) {
        if(startDate && endDate) {
            let proms = [];
            if (platformObjId && platformObjId.length > 0) {
                return dbconfig.collection_platform.find({_id: {$in: platformObjId}}).lean().then(
                    platformDetail => {
                        if (platformDetail && platformDetail.length > 0) {
                            platformDetail.map(p => {

                                if(p && p.live800CompanyId && p.live800CompanyId.length > 0){
                                    let platformName = p.name ? p.name : (p.platformName ? p.platformName : "");
                                    let query = {
                                        createTime: {
                                            $gte: new Date(startDate),
                                            $lt: new Date(endDate)
                                        },
                                        companyId: {$in: p.live800CompanyId}
                                    }

                                    let summarizedData =  dbconfig.collection_live800RecordDaySummary.aggregate([
                                        {
                                            $match: query
                                        },
                                        {
                                            "$group": {
                                                "_id": {
                                                    "date": "$createTime"
                                                },
                                                "sumOfTotalRecord": {$sum: "$effectiveRecord"},
                                            }
                                        }
                                    ]).then(
                                        live800SummarizeRecord => {
                                            if(live800SummarizeRecord && live800SummarizeRecord.length > 0){
                                                let summarizedRecordArr = [];
                                                live800SummarizeRecord.map(l => {
                                                    if(l && l._id && l._id.date){
                                                        let startTime = new Date(l._id.date);
                                                        let endTime = new Date(l._id.date);
                                                        endTime.setHours(23, 59, 59, 999);
                                                        let companyIdList = p.live800CompanyId.map(live800Id => parseFloat(live800Id));
                                                        companyIdList = companyIdList.concat(p.live800CompanyId);

                                                        let queryToGetQIRecord = {
                                                            createTime: {
                                                                $gte: new Date(startTime),
                                                                $lte: new Date(endTime)
                                                            },
                                                            companyId: {$in: companyIdList}
                                                        }

                                                        console.log("LH check QI C -----------------", queryToGetQIRecord);

                                                        let calculatedData = dbconfig.collection_live800RecordDayRecord.find(queryToGetQIRecord).count().then(
                                                            qualityInspectionCount => {
                                                                let isCompleted = false;
                                                                if(qualityInspectionCount){
                                                                    if(l.sumOfTotalRecord - qualityInspectionCount == 0){
                                                                        isCompleted = true;
                                                                    }
                                                                }

                                                                let result = {
                                                                    platformName: platformName,
                                                                    totalRecord: l.sumOfTotalRecord || 0,
                                                                    isCompleted: isCompleted,
                                                                    totalRecordFromFPMS:qualityInspectionCount ? qualityInspectionCount : 0,
                                                                    date: l._id.date
                                                                };
                                                                return result;
                                                            }
                                                        )
                                                        summarizedRecordArr.push(calculatedData);
                                                    }
                                                })

                                                return Promise.all(summarizedRecordArr);
                                            }
                                    })
                                    proms.push(summarizedData);
                                }
                            })

                            return Promise.all(proms);
                        }
                    }
                )
            }
        }
    },

    getLive800RecordByMySQL:function(queryString,live800CompanyId, connection){
        var deferred = Q.defer();
        let proms = [];

        if(connection){
            connection.query(queryString, function (error, results, fields) {
                //console.log("live 800 result",results)
                if(error){
                    console.log(error);
                }

                if(results){
                    results.forEach(result => {
                        if(result){
                            let startTime = new Date(result.storeTime);
                            let endTime = new Date();
                            endTime = dbUtility.getISODayEndTime(startTime);
                            proms.push(dbQualityInspection.calEvaluationProgress(startTime, endTime, live800CompanyId, result.totalRecord));
                        }
                    });
                    return Q.all(proms).then(data => {
                        deferred.resolve(data);
                        connection.end();
                    })
                }
            });
            return deferred.promise;
        }else{
            return Q.reject({name: "DBError", message: "Connection to mySQL dropped."});
        }

    },

    calEvaluationProgress: function(startTime, endTime, live800CompanyId, totalRecordFromLive800){

        let platformName = "";
        let query = {
            companyId: {$in: live800CompanyId},
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        }
        return dbconfig.collection_platform.findOne({live800CompanyId: {$in: live800CompanyId}}).lean().then(
            platformDetail => {
                if(platformDetail)
                {
                    if(platformDetail.name){
                        platformName = platformDetail.name;
                    }

                    return dbconfig.collection_qualityInspection.find(query).count()
                }
                else{
                    return Q.reject({name: "DBError", message: "Cannot find platform details by live800 company id"});
                }
            }
        ).then(
            qualityInspectionCount => {
                let isCompleted = false;
                if(qualityInspectionCount){
                    if(totalRecordFromLive800 - qualityInspectionCount == 0){
                        isCompleted = true;
                    }
                }

                let result = {
                    platformName: platformName,
                    totalRecord: totalRecordFromLive800,
                    isCompleted: isCompleted,
                    totalRecordFromFPMS:qualityInspectionCount ? qualityInspectionCount : 0,
                    date: startTime
                };
                return result;
            }
        )

    },
    splitOperatorIdToArray:function(operatorIdArr){
        let operatorRes = [];
        let operatorList = [];
        let companyIdRes = [];
        operatorIdArr.forEach(item=>{
            let operator = dbQualityInspection.splitLive800Acc(item);
            let companyId = dbQualityInspection.splitLive800AccForCompanyID(item);
            if (!operatorList.includes(operator)){
                operatorList.push(operator);
            }
            if (!companyIdRes.includes(companyId)){
                companyIdRes.push(companyId);
            }
        });

        operatorList.forEach( op => {
            operatorRes.push(new RegExp("^" + op, "i"));
        });

        return [operatorRes, companyIdRes];
    },
    searchLive800SettlementRecordByDailyRecord: function (data) {
        if (data) {
            let summaryProm;
            let ProgressStatusProm;
            let ProgressMarkProm;
            let operatorName = [];
            let companyId = [];
            if (data.operatorId && data.operatorId.length > 0) {
                if (Array.isArray(data.operatorId)) {
                    [operatorName, companyId] = dbQualityInspection.splitOperatorIdToArray(data.operatorId);
                }
            }

            if (companyId.length != 0 && operatorName.length != 0) {
                summaryProm = dbQualityInspection.getLive800RecordDaySummary(companyId, operatorName, data.startTime, data.endTime);
                ProgressStatusProm = dbQualityInspection.getProgressReportStatusByOperatorInDailyRecord(companyId, operatorName, data.startTime, data.endTime);
                ProgressMarkProm = dbQualityInspection.getProgressReportMarksByOperatorInDailyRecord(companyId, operatorName, data.startTime, data.endTime);
            }
            else {
                summaryProm = dbQualityInspection.getAllLive800RecordDaySummary(data.startTime, data.endTime);
                ProgressStatusProm = dbQualityInspection.getAllProgressReportStatusByOperatorInDailyRecord( data.startTime, data.endTime);
                ProgressMarkProm = dbQualityInspection.getAllProgressReportMarksByOperatorInDailyRecord( data.startTime, data.endTime);
            }
            return Q.all([summaryProm,ProgressStatusProm,ProgressMarkProm]);
        }
    },
    searchLive800SettlementRecord: function (data) {
        if (data) {
            let summaryProm;
            let ProgressStatusProm;
            let ProgressMarkProm;
            let operatorName = [];
            let companyId = [];
            if (data.operatorId && data.operatorId.length > 0) {
                if (Array.isArray(data.operatorId)) {
                    [operatorName, companyId] = dbQualityInspection.splitOperatorIdToArray(data.operatorId);
                }
            }

            if (companyId.length != 0 && operatorName.length != 0) {
                summaryProm = dbQualityInspection.getLive800RecordDaySummary(companyId, operatorName, data.startTime, data.endTime);
                ProgressStatusProm = dbQualityInspection.getProgressReportStatusByOperator(companyId, operatorName, data.startTime, data.endTime);
                ProgressMarkProm = dbQualityInspection.getProgressReportMarksByOperator(companyId, operatorName, data.startTime, data.endTime);
            }
            else {
                summaryProm = dbQualityInspection.getAllLive800RecordDaySummary(data.startTime, data.endTime);
                ProgressStatusProm = dbQualityInspection.getAllProgressReportStatusByOperator( data.startTime, data.endTime);
                ProgressMarkProm = dbQualityInspection.getAllProgressReportMarksByOperator( data.startTime, data.endTime);
            }
            return Q.all([summaryProm,ProgressStatusProm,ProgressMarkProm]);
        }
    },
    getLive800RecordDaySummary: function (companyId,operatorName,startTime,endTime) {

        return dbconfig.collection_live800RecordDaySummary.aggregate([
                {
                    $match: {
                        createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                        companyId: {$in: companyId},
                        "live800Acc.name": {$in: operatorName}
                    },
                },
                {
                    $group: {
                        "_id": {
                            "companyId": "$companyId",
                            "operatorId": "$live800Acc.id",
                            "operatorName": "$live800Acc.name",
                        },
                        "totalCount": {$sum: "$totalRecord"},
                        "totalEffectiveCount": {$sum:"$effectiveRecord"},
                        "totalNonEffectiveCount":{$sum: "$nonEffectiveRecord"},
                    }
                }
            ]).exec().then(data => {
                let resultArr = [];
                if(data && data.length > 0){
                    data.forEach(d => {
                        if(d){
                            resultArr.push({
                                companyId: d._id.companyId,
                                operatorId: d._id.companyId +"-"+d._id.operatorName,
                                operatorName: d._id.operatorName,
                                totalCount: d.totalCount,
                                totalEffectiveCount: d.totalEffectiveCount,
                                totalNonEffectiveCount: d.totalNonEffectiveCount
                            });
                        }
                    });
                    return resultArr;
                }
            }, error =>{
                return Q.reject({name: "DBError", message: error});
            });
    },
    getProgressReportMarksByOperatorInDailyRecord: function (companyId,operatorId,startTime,endTime) {
        return dbconfig.collection_live800RecordDayRecord.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    companyId: {$in: companyId},
                    "live800Acc.name": {$in: operatorId}
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
                    },
                    "totalOvertimeRate": {$sum: "$totalTimeoutRate"},
                    "totalInspectionRate": {$sum:"$totalInspectionRate"},
                }
            }
        ]).then(data => {
            let resultArr = [];
            if (data && data.length > 0) {
                data.forEach(d => {
                    if (d) {
                        resultArr.push({
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            totalOvertimeRate: d.totalOvertimeRate,
                            totalInspectionRate: d.totalInspectionRate
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Q.reject({name: "DBError", message: error});
        })
    },
    getProgressReportMarksByOperator: function (companyId,operatorId,startTime,endTime) {

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    companyId: {$in: companyId},
                    "live800Acc.name": {$in: operatorId}
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
                    },
                    "totalOvertimeRate": {$sum: "$totalTimeoutRate"},
                    "totalInspectionRate": {$sum:"$totalInspectionRate"},
                }
            }
        ]).then(data => {
            let resultArr = [];
            if (data && data.length > 0) {
                data.forEach(d => {
                    if (d) {
                        resultArr.push({
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            totalOvertimeRate: d.totalOvertimeRate,
                            totalInspectionRate: d.totalInspectionRate
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Q.reject({name: "DBError", message: error});
        })
    },
    getAllProgressReportMarksByOperatorInDailyRecord: function (startTime,endTime) {
        return dbconfig.collection_live800RecordDayRecord.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
                    },
                    "totalOvertimeRate": {$sum: "$totalTimeoutRate"},
                    "totalInspectionRate": {$sum:"$totalInspectionRate"},

                }
            }
        ]).then(data => {
            let resultArr = [];
            if (data && data.length > 0) {
                data.forEach(d => {
                    if (d) {
                        resultArr.push({
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            totalOvertimeRate: d.totalOvertimeRate,
                            totalInspectionRate: d.totalInspectionRate
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Promise.reject({name: "DBError", message: error});
        })
    },
    getAllProgressReportMarksByOperator: function (startTime,endTime) {

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
                    },
                    "totalOvertimeRate": {$sum: "$totalTimeoutRate"},
                    "totalInspectionRate": {$sum:"$totalInspectionRate"},

                }
            }
        ]).then(data => {
            let resultArr = [];
            if (data && data.length > 0) {
                data.forEach(d => {
                    if (d) {
                        resultArr.push({
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            totalOvertimeRate: d.totalOvertimeRate,
                            totalInspectionRate: d.totalInspectionRate
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Q.reject({name: "DBError", message: error});
        })
    },
    getAllLive800RecordDaySummary: function (startTime,endTime) {

        return dbconfig.collection_live800RecordDaySummary.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                },
            },
            {
                $group: {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
                    },
                    "totalCount": {$sum: "$totalRecord"},
                    "totalEffectiveCount": {$sum:"$effectiveRecord"},
                    "totalNonEffectiveCount":{$sum: "$nonEffectiveRecord"},
                }
            }
        ]).exec().then(data => {
            let resultArr = [];
            if(data && data.length > 0){
                data.forEach(d => {
                    if(d){
                        resultArr.push({
                            companyId: d._id.companyId,
                            operatorId: d._id.companyId +"-"+d._id.operatorName,
                            operatorName: d._id.operatorName,
                            totalCount: d.totalCount,
                            totalEffectiveCount: d.totalEffectiveCount,
                            totalNonEffectiveCount: d.totalNonEffectiveCount
                        });
                    }
                });
                return resultArr;
            }
        }, error =>{
            return Q.reject({name: "DBError", message: error});
        });
    },
    getProgressReportStatusByOperatorInDailyRecord: function (companyId, operatorId, startTime, endTime){
        return dbconfig.collection_live800RecordDayRecord.aggregate([
            {
                $match: {
                    companyId: {$in: companyId},
                    "live800Acc.name": {$in: operatorId},
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
                        "status": "$status"
                    },
                    "count": {"$sum": 1},
                }
            }
        ]).read("secondaryPreferred").then(data => {
            let resultArr = [];
            if(data && data.length > 0){
                data.forEach(d => {
                    if(d){
                        resultArr.push({
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Promise.reject({name: "DBError", message: error});
        })
    },
    getProgressReportStatusByOperator: function (companyId, operatorId, startTime, endTime){

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    companyId: {$in: companyId},
                    "live800Acc.name": {$in: operatorId},
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
                        "status": "$status"
                    },
                    "count": {"$sum": 1},
                }
            }
        ]).read("secondaryPreferred").then(data => {
            let resultArr = [];
            if(data && data.length > 0){
                data.forEach(d => {
                    if(d){
                        resultArr.push({
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Q.reject({name: "DBError", message: error});
        })
    },
    getAllProgressReportStatusByOperatorInDailyRecord: function (startTime,endTime){
        return dbconfig.collection_live800RecordDayRecord.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
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
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Promise.reject({name: "DBError", message: error});
        })
    },
    getAllProgressReportStatusByOperator: function (startTime,endTime){

        console.log("LH check QI A ---------------", new Date(startTime));
        console.log("LH check QI B ---------------", new Date(endTime));
        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                },
            },
            {
                "$group": {
                    "_id": {
                        "companyId": "$companyId",
                        "operatorId": "$live800Acc.id",
                        "operatorName": "$live800Acc.name",
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
                            companyId: d._id.companyId,
                            operatorId: d._id.operatorId,
                            operatorName: d._id.operatorName,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });
                return resultArr;
            }
        }, error => {
            return Q.reject({name: "DBError", message: error});
        })
    },

    searchLive800SettlementRecordByDate: function (data) {
        if (data) {
            let summaryProm;
            let ProgressStatusProm;
            let ProgressMarkProm = [];
            let operatorName = [];
            let companyId = [];
            if (data.operatorId && data.operatorId.length > 0) {
                if (Array.isArray(data.operatorId)) {
                    [operatorName, companyId] = dbQualityInspection.splitOperatorIdToArray(data.operatorId);
                }
            }

            if (companyId.length != 0 && operatorName.length != 0) {
                summaryProm = dbQualityInspection.getLive800RecordDaySummaryByDate(companyId, operatorName, data.startTime, data.endTime);
                ProgressStatusProm = dbQualityInspection.getProgressReportStatusByOperatorByDate(companyId, operatorName, data.startTime, data.endTime);
                ProgressMarkProm = dbQualityInspection.getProgressReportMarksByOperatorByDate(companyId, operatorName, data.startTime, data.endTime);
                return Q.all([summaryProm,ProgressStatusProm,ProgressMarkProm]);
            }
            else{
                return Q.reject({name: "DBError", message: "operatorID cannot be found"})
            }

        }
    },
    searchLive800SettlementRecordByDateInDailyRecord: function (data) {
        if (data) {
            let summaryProm;
            let ProgressStatusProm;
            let ProgressMarkProm = [];
            let operatorName = [];
            let companyId = [];
            if (data.operatorId && data.operatorId.length > 0) {
                if (Array.isArray(data.operatorId)) {
                    [operatorName, companyId] = dbQualityInspection.splitOperatorIdToArray(data.operatorId);
                }
            }

            if (companyId.length != 0 && operatorName.length != 0) {
                summaryProm = dbQualityInspection.getLive800RecordDaySummaryByDate(companyId, operatorName, data.startTime, data.endTime);
                ProgressStatusProm = dbQualityInspection.getProgressReportStatusByOperatorByDateInDailyRecord(companyId, operatorName, data.startTime, data.endTime);
                ProgressMarkProm = dbQualityInspection.getProgressReportMarksByOperatorByDateInDailyRecord(companyId, operatorName, data.startTime, data.endTime);
                return Q.all([summaryProm,ProgressStatusProm,ProgressMarkProm]);
            }
            else{
                return Q.reject({name: "DBError", message: "operatorID cannot be found"})
            }

        }
    },
    getLive800RecordDaySummaryByDate: function (companyId,operatorName,startTime,endTime) {

        let proms =[];
        let dayStartTime = new Date (startTime);

        let getNextDate = function (date) {
                    let newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
        }

        while (dayStartTime.getTime() < new Date(endTime).getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);


            let matchObj = {
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                companyId: {$in: companyId},
                "live800Acc.name": {$in: operatorName}
            };

            proms.push(dbconfig.collection_live800RecordDaySummary.aggregate(
                {
                    $match: matchObj
                }, {
                    $group: {
                        "_id": {
                            "companyId": "$companyId",
                            "operatorName": "$live800Acc.name",
                        },
                        "totalCount": {$sum: "$totalRecord"},
                        "totalEffectiveCount": {$sum:"$effectiveRecord"},
                        "totalNonEffectiveCount":{$sum: "$nonEffectiveRecord"},
                    }
                }
            ).read("secondaryPreferred"));

            dayStartTime = dayEndTime;
        }

        return Q.all([Q.all(proms)]).then(data => {

            if (!data[0]) {
                return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
            }

            let tempDate = new Date(startTime);

            let res = [];

            data[0].forEach(item => {
                if (item[0] != null){
                    let obj = {
                        date: tempDate,
                        companyId:  item[0]._id.companyId,
                        operatorId: item[0]._id.companyId + "-" + item[0]._id.operatorName,
                        totalCount: item[0].totalCount,
                        totalEffectiveCount: item[0].totalEffectiveCount,
                        totalNonEffectiveCount: item[0].totalNonEffectiveCount
                    }

                    res.push(obj);
                }
                tempDate = getNextDate(tempDate);
            });

            return res;
        });
    },
    getProgressReportMarksByOperatorByDateInDailyRecord: function (companyId,operatorName,startTime,endTime) {
        let proms =[];
        let dayStartTime = new Date (startTime);

        let getNextDate = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + 1));
        }

        let totalDays = dbUtility.getNumberOfDays(startTime, endTime);

        for(let x = 0; x < totalDays; x++){
            var dayEndTime = getNextDate.call(this, dayStartTime);

            let matchObj = {
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                companyId: {$in: companyId},
                "live800Acc.name": {$in: operatorName}
            };

            proms.push(dbconfig.collection_live800RecordDayRecord.aggregate(
                {
                    $match: matchObj
                }, {
                    "$group": {
                        "_id": {
                            "companyId": "$companyId",
                            "operatorId": "$live800Acc.id",
                            "operatorName": "$live800Acc.name",
                        },
                        "totalOvertimeRate": {$sum: "$totalTimeoutRate"},
                        "totalInspectionRate": {$sum:"$totalInspectionRate"},
                    }
                }
            ).read("secondaryPreferred"));

            dayStartTime = dayEndTime;
        }

        return Q.all([Q.all(proms)]).then(data => {

            if (!data[0]) {
                return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
            }

            let tempDate = new Date(startTime);

            let res = [];

            data[0].forEach(item => {
                if (item[0] != null){
                    let obj = {
                        date: tempDate,
                        companyId:  item[0]._id.companyId,
                        operatorId: item[0]._id.companyId + "-" + item[0]._id.operatorName,
                        totalOvertimeRate: item[0].totalOvertimeRate,
                        totalInspectionRate: item[0].totalInspectionRate,
                    }

                    res.push(obj);
                }
                tempDate = getNextDate(tempDate);
            });

            return res;
        });
    },
    getProgressReportMarksByOperatorByDate: function (companyId,operatorName,startTime,endTime) {
        let proms =[];
        let dayStartTime = new Date (startTime);

        let getNextDate = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + 1));
        }

        while (dayStartTime.getTime() < new Date(endTime).getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);

            let matchObj = {
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                companyId: {$in: companyId},
                "live800Acc.name": {$in: operatorName}
            };

            proms.push(dbconfig.collection_qualityInspection.aggregate(
                {
                    $match: matchObj
                }, {
                    "$group": {
                        "_id": {
                            "companyId": "$companyId",
                            "operatorId": "$live800Acc.id",
                            "operatorName": "$live800Acc.name",
                        },
                        "totalOvertimeRate": {$sum: "$totalTimeoutRate"},
                        "totalInspectionRate": {$sum:"$totalInspectionRate"},
                    }
                }
            ).read("secondaryPreferred"));

            dayStartTime = dayEndTime;
        }

        return Q.all([Q.all(proms)]).then(data => {

            if (!data[0]) {
                return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
            }

            let tempDate = new Date(startTime);

            let res = [];

            data[0].forEach(item => {
                if (item[0] != null){
                    let obj = {
                        date: tempDate,
                        companyId:  item[0]._id.companyId,
                        operatorId: item[0]._id.companyId + "-" + item[0]._id.operatorName,
                        totalOvertimeRate: item[0].totalOvertimeRate,
                        totalInspectionRate: item[0].totalInspectionRate,
                    }

                    res.push(obj);
                }
                tempDate = getNextDate(tempDate);
            });

            return res;
        });
    },
    getProgressReportStatusByOperatorByDateInDailyRecord: function (companyId, operatorName, startTime, endTime){
        let proms =[];
        let dayStartTime = new Date (startTime);

        let getNextDate = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + 1));
        }

        let totalDays = dbUtility.getNumberOfDays(startTime, endTime);

        for(let x = 0; x < totalDays; x++){
            var dayEndTime = getNextDate.call(this, dayStartTime);

            let matchObj = {
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                companyId: {$in: companyId},
                "live800Acc.name": {$in: operatorName}
            };

            proms.push(dbconfig.collection_live800RecordDayRecord.aggregate(
                {
                    $match: matchObj
                }, {
                    "$group": {
                        "_id": {
                            "companyId": "$companyId",
                            "operatorName": "$live800Acc.name",
                            "status": "$status"
                        },
                        "count": {"$sum": 1},
                    }
                }
            ).read("secondaryPreferred") );

            dayStartTime = dayEndTime;
        }

        return Q.all([Q.all(proms)]).then(data => {

            if (!data[0]) {
                return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
            }

            let tempDate = new Date(startTime);

            let res = [];

            data[0].forEach(item => {
                if (item && item.length > 0){
                    let statusList = [];
                    item.forEach( itemDetail => {
                        if (itemDetail){
                            statusList.push(itemDetail);
                        }

                    });

                    let obj = {
                        date: tempDate,
                        companyId:  item[0]._id.companyId,
                        operatorId: item[0]._id.companyId + "-" + item[0]._id.operatorName,
                        data: statusList,
                    }

                    res.push(obj);
                }
                tempDate = getNextDate(tempDate);
            });

            return res;
        });

    },
    getProgressReportStatusByOperatorByDate: function (companyId, operatorName, startTime, endTime){
        let proms =[];
        let dayStartTime = new Date (startTime);

        let getNextDate = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + 1));
        }

        while (dayStartTime.getTime() < new Date(endTime).getTime()) {
            var dayEndTime = getNextDate.call(this, dayStartTime);

            let matchObj = {
                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                companyId: {$in: companyId},
                "live800Acc.name": {$in: operatorName}
            };

            proms.push(dbconfig.collection_qualityInspection.aggregate(
                {
                    $match: matchObj
                }, {
                    "$group": {
                        "_id": {
                            "companyId": "$companyId",
                            "operatorName": "$live800Acc.name",
                            "status": "$status"
                        },
                        "count": {"$sum": 1},
                    }
                }
            ).read("secondaryPreferred") );

            dayStartTime = dayEndTime;
        }

        return Q.all([Q.all(proms)]).then(data => {

            if (!data[0]) {
                return Q.reject({name: 'DataError', message: 'Can not find proposal record'})
            }

            let tempDate = new Date(startTime);

            let res = [];

            data[0].forEach(item => {
                if (item && item.length > 0){
                    let statusList = [];
                    item.forEach( itemDetail => {
                        if (itemDetail){
                            statusList.push(itemDetail);
                        }

                    });

                    let obj = {
                        date: tempDate,
                        companyId:  item[0]._id.companyId,
                        operatorId: item[0]._id.companyId + "-" + item[0]._id.operatorName,
                        data: statusList,
                    }

                    res.push(obj);
                }
                tempDate = getNextDate(tempDate);
            });

            return res;
        });

    },

    summarizeLive800Record: function(startTime, endTime){
        let startDate = new Date();
        let endDate = new Date();
        let queryString;

        if(startTime && endTime){
            startTime = new Date(startTime);
            endTime = new Date(endTime);

            endTime.setHours(23, 59, 59, 999);
            endTime.setDate(endTime.getDate() - 1);

            startDate = dbUtility.getLocalTimeString(startTime);
            endDate = dbUtility.getLocalTimeString(endTime);

            queryString = "SELECT COUNT(*) AS totalRecord, CAST(store_time AS DATE) AS storeTime, company_id, operator_id, operator_name   FROM chat_content " +
                "WHERE store_time BETWEEN CAST('"+ startDate + "' as DATETIME) AND CAST('"+ endDate + "' AS DATETIME) " +
                "GROUP BY FORMAT(CAST(store_time AS DATE),'yyyy-MM-dd'), company_id, operator_id ";
        }else{
            let curTime = new Date();

            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(curTime.getDate() - 1);

            endDate.setHours(23, 59, 59, 999);
            endDate.setDate(curTime.getDate() - 1);

            startDate = dbUtility.getLocalTimeString(startDate);
            endDate = dbUtility.getLocalTimeString(endDate);

            queryString = "SELECT COUNT(*) AS totalRecord, CAST(store_time AS DATE) AS storeTime, company_id, operator_id, operator_name   FROM chat_content " +
                "WHERE store_time BETWEEN CAST('"+ startDate + "' as DATETIME) AND CAST('"+ endDate + "' AS DATETIME) " +
                "GROUP BY company_id, operator_id ";
        }

        let connection = dbQualityInspection.connectMysql();
        connection.connect();
        return dbQualityInspection.getSummarizedLive800Record(queryString, connection)
    },

    resummarizeLive800Record: function(startTime, endTime){
        let startDate = new Date(startTime);
        let endDate = new Date(endTime);

        if(startDate && endDate){

            let query = {
                createTime: {
                    $gte: new Date(startDate),
                    $lt: new Date(endDate)
                }
            }
            return dbconfig.collection_live800RecordDaySummary.remove(query).then(
                () => {
                    return dbQualityInspection.summarizeLive800Record(startDate,endDate);
                }
            )
        }
    },

    getSummarizedLive800Record:function(queryString, connection){
        var deferred = Q.defer();
        let counter = 0;
        let queryList = [];
        let promiseList = [];

        if(connection){
            let promise = new Promise((resolve,reject) => {
                connection.query(queryString, function (error, results, fields) {
                    if(error){
                        console.log(error);
                        return reject(error);
                    }

                    if(results){
                        console.log("LH CHECK QI SCHEDULER AAAAAAAAAAAA",results.length);
                        results.forEach(result => {
                            if(result){
                                let ytdStartTime = new Date(result.storeTime);
                                let ytdEndTime = new Date(result.storeTime);
                                ytdEndTime.setHours(23, 59, 59, 999);

                                ytdStartTime = dbUtility.getLocalTimeString(ytdStartTime);
                                ytdEndTime = dbUtility.getLocalTimeString(ytdEndTime);

                                let query = {
                                    startTime: ytdStartTime,
                                    endTime: ytdEndTime,
                                    operatorId: result.operator_id,
                                    companyId: result.company_id,
                                    createTime: result.storeTime,
                                    totalRecord: result.totalRecord,
                                    operatorName: result.operator_name
                                }

                                queryList.push(query);
                            }
                        });

                        resolve(queryList);
                    }
                });

                connection.end();
            })


            return Q.all([promise]).then( queryData => {
                if(queryData){
                    let subConnection = dbQualityInspection.connectMysql();
                    subConnection.connect();
                    queryData[0].forEach(queryDetail => {
                        if(queryDetail){
                            let query = "SELECT CAST(store_time AS DATE) AS createTime, company_id, operator_id , operator_name, content   FROM chat_content " +
                                "WHERE store_time BETWEEN CAST('"+ queryDetail.startTime + "' as DATETIME) AND CAST('"+ queryDetail.endTime + "' AS DATETIME) " +
                                "AND company_id = '" + queryDetail.companyId + "' AND operator_id = '" + queryDetail.operatorId + "' ";

                            let proms = [];

                            let childPromise = new Promise((resolve,reject) => {

                                subConnection.query(query, function (detailsError, detailsResults, fields) {

                                    if(detailsError){
                                        console.error(detailsError);
                                        reject(detailsError);
                                    }

                                    let live800RecordQuery = {
                                        createTime: {
                                            $gte: new Date(queryDetail.startTime),
                                            $lt: new Date(queryDetail.endTime)
                                        },
                                        companyId: queryDetail.companyId,
                                        'live800Acc.id': queryDetail.operatorId
                                    };

                                    counter += 1;
                                    console.log("LH CHECK QI SCHEDULER BBBBBBBBBBBBBBBBBB",counter);

                                    return dbconfig.collection_live800RecordDaySummary.find(live800RecordQuery).lean().then(
                                        data => {
                                            if(!data || data.length <= 0) {

                                                if(detailsResults){
                                                    let calculatedResult = dbQualityInspection.RestructureConversationContent(detailsResults);
                                                    proms.push(calculatedResult);
                                                }
                                                return Promise.all(proms).then(
                                                    data => {
                                                        if(data && data.length > 0 && data[0] && data[0].length > 0){
                                                            let updateData = {
                                                                live800Acc: {}
                                                            };

                                                            totalInvalidConversation = data[0].filter(d => d.isValidConversation == false).length;
                                                            totalValidConversation = data[0].filter(d => d.isValidConversation == true).length;
                                                            updateData.effectiveRecord = totalValidConversation;
                                                            updateData.nonEffectiveRecord = totalInvalidConversation;

                                                            if(queryDetail.createTime){
                                                                updateData.createTime = queryDetail.createTime;
                                                            }

                                                            if(queryDetail.companyId){
                                                                updateData.companyId = queryDetail.companyId;
                                                            }

                                                            if(queryDetail.totalRecord){
                                                                updateData.totalRecord = queryDetail.totalRecord;
                                                            }

                                                            if(queryDetail.operatorId){
                                                                updateData.live800Acc.id = queryDetail.operatorId;
                                                            }

                                                            if(queryDetail.operatorName){
                                                                updateData.live800Acc.name = queryDetail.operatorName;
                                                            }


                                                            dbconfig.collection_live800RecordDaySummary(updateData).save();
                                                            console.log("LH CHECK QI SCHEDULER CCCCCCCCCCCCCCCCCCCCCCCCCCCC",updateData);
                                                            resolve();

                                                        }
                                                    }
                                                );
                                            }

                                            resolve();
                                        });
                                })

                            });

                            promiseList.push(childPromise);
                        }
                    })
                    subConnection.end();
                    return Promise.all(promiseList);
                }
            });
        }else{
            return Q.reject({name: "DBError", message: "Connection to mySQL dropped."});
        }
    },


    getSummarizedLive800RecordCount: function(startTime, endTime){
        let startDate = new Date()
        let endDate = new Date();
        let queryString;

        if(startTime && endTime){
            startTime = new Date(startTime);
            endTime = new Date(endTime);

            endTime.setHours(23, 59, 59, 999);
            endTime.setDate(endTime.getDate() - 1);

            startDate = dbUtility.getLocalTimeString(startTime);
            endDate = dbUtility.getLocalTimeString(endTime);

            queryString = "SELECT COUNT(*) AS totalRecord, CAST(store_time AS DATE) AS storeTime, company_id, operator_id, operator_name   FROM chat_content " +
                "WHERE store_time BETWEEN CAST('"+ startDate + "' as DATETIME) AND CAST('"+ endDate + "' AS DATETIME) " +
                "GROUP BY FORMAT(CAST(store_time AS DATE),'yyyy-MM-dd'), company_id, operator_id ";
        }

        let connection = dbQualityInspection.connectMysql();
        connection.connect();

        if(connection) {
            let promise = new Promise((resolve, reject) => {
                connection.query(queryString, function (error, results, fields) {
                    if (error) {
                        console.log(error);
                        return reject(error);
                    }

                    if (results) {
                        let mongoRecordQuery = {
                            createTime: {
                                $gte: new Date(startDate),
                                $lt: new Date(endDate)
                            }
                        };
                        let mongoRecordCount =  dbconfig.collection_live800RecordDaySummary.find(mongoRecordQuery).count().then(
                            count => {
                                connection.end();
                                return {mysqlLive800Record: results.length, mongoLive800Record: count};
                            }
                        );
                        resolve(mongoRecordCount);
                    }
                });
            });

            return Q.all([promise]);

        }
    },

    RestructureConversationContent: function(dbResult){
        let proms = [];

        if(dbResult && dbResult.length > 0){
            dbResult.map(
                result => {
                    if(result){
                        let content = [];
                        if(result.content){
                            let dom = new JSDOM(result.content);

                            let he = dom.window.document.getElementsByTagName("he");
                            let i = dom.window.document.getElementsByTagName("i");
                            let file = dom.window.document.getElementsByTagName("file");

                            partI = dbQualityInspection.reGroup(i, 1);
                            partHe = dbQualityInspection.reGroup(he, 2);
                            partFile = dbQualityInspection.reGroup(file, 3);
                            content = partI.concat(partHe);
                            content = content.concat(partFile);
                            content.sort(function (a, b) {
                                return a.time - b.time;
                            });
                        }
                        proms.push(dbQualityInspection.calculateValidityOfConversation(content,result.company_id, result));
                    }
                }
            )

            return Promise.all(proms)
        }
    },

    calculateValidityOfConversation: function(structuredConversation,companyId, live800SummarizedRecords){
        if(structuredConversation && structuredConversation.length > 0) {
            return dbconfig.collection_platform.findOne({live800CompanyId: {$in: [companyId]}}).lean().then(
                platformDetail => {
                    if (platformDetail && platformDetail.conversationDefinition && platformDetail.conversationDefinition.totalSec &&
                        platformDetail.conversationDefinition.askingSentence && platformDetail.conversationDefinition.replyingSentence) {

                        let firstConversationDate = new Date(Number(structuredConversation[0].time));
                        let lastConversationDate = new Date(Number(structuredConversation[structuredConversation.length - 1].time));
                        let isConversationMoreThan40Minutes =  ((lastConversationDate.getTime() - firstConversationDate.getTime()) / 1000) >= platformDetail.conversationDefinition.totalSec;
                        let isCSMoreThanTwo = structuredConversation.filter(s => s.roles == 1).length >= platformDetail.conversationDefinition.askingSentence;
                        let isPlayerMoreThanTwo = structuredConversation.filter(s => s.roles == 2).length >= platformDetail.conversationDefinition.replyingSentence;

                        if(isConversationMoreThan40Minutes && isCSMoreThanTwo && isPlayerMoreThanTwo){
                            live800SummarizedRecords.isValidConversation = true;
                        }
                        else{
                            live800SummarizedRecords.isValidConversation = false;
                        }
                    }else{
                        live800SummarizedRecords.isValidConversation = false;
                    }

                    return live800SummarizedRecords;
                }
            )
        }else{
            live800SummarizedRecords.isValidConversation = false;
        }

        return live800SummarizedRecords;
    },

    getWorkingCSName: function(query){
        let startDate = new Date()
        let endDate = new Date();
        let queryString;
        let queryObj = "";

        if (query.operatorId && query.operatorId.length > 0) {
            if(Array.isArray(query.operatorId)){
                operatorId = dbQualityInspection.splitOperatorId(query.operatorId);
                companyId = dbQualityInspection.splitOperatorIdByCompanyId(query.operatorId)
            }else{
                operatorId = query.operatorId;
            }

            if(operatorId!='all'){
                queryObj += " operator_name IN (" + operatorId + ") AND ";
            }

            queryObj += " company_id IN (" + companyId + ") AND ";
            query.companyId = companyId;
        }else{
            if (query.companyId && query.companyId.length > 0) {
                companyId = query.companyId.join(',');
                queryObj += " company_id IN (" + companyId + ") AND ";
            }
        }

        if (query.startTime && query.endTime) {
            let startTime = dbUtility.getLocalTimeString(query.startTime);
            let endTime = dbUtility.getLocalTimeString(query.endTime);
            queryObj += " store_time BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
        }

        if(query.startTime && query.endTime){
            startDate = new Date(query.startTime);
            endDate = new Date(query.endTime);

            endDate.setHours(23, 59, 59, 999);
            endDate.setDate(endDate.getDate() - 1);

            startDate = dbUtility.getLocalTimeString(startDate);
            endDate = dbUtility.getLocalTimeString(endDate);

            queryString = "SELECT DISTINCT operator_name FROM chat_content WHERE " + queryObj;
        }

        let connection = dbQualityInspection.connectMysql();
        connection.connect();
        if(connection) {
            let promise = new Promise((resolve, reject) => {
                connection.query(queryString, function (error, results, fields) {
                    if (error) {
                        console.log(error);
                        return reject(error);
                    }

                    if (results) {
                        resolve(results);
                    }
                });
            });

            return Q.all([promise]);
        }
    },

    getQQConversationDeviceList: function(platform, deviceNickName, csName, startTime, endTime, content, playerQQRemark, index, limit){
        index = index || 0;
        let csOfficerProm = [];
        let checkCSOfficer = false;
        let deviceList;
        let totalCount = 0;
        let query = {
            csReplyTime: {'$lte':new Date(endTime),
                '$gte': new Date(startTime)}
        };
        let platformQuery = {};

        if (platform && platform.length > 0) {
            query.platformObjId = {$in: platform.map(p => ObjectId(p))};
            platformQuery._id = {$in: platform};
        }

        if (deviceNickName && deviceNickName.length > 0){
            query.deviceNickName = {$in: deviceNickName};
        }

        if (csName && csName.length > 0) {
            csOfficerProm = dbconfig.collection_admin.find({adminName: {$in: csName}}).lean();
            checkCSOfficer = true;
        }

        if (content) {
            query.csReplyContent = new RegExp('.*' + content + '.*');
        }

        if (playerQQRemark) {
            query.playerQQRemark = new RegExp('.*' + playerQQRemark + '.*');
        }

        return Promise.all([csOfficerProm]).then(
            csOfficer => {
                if (csOfficer && csOfficer.length > 0 && csOfficer[0] && csOfficer[0].length > 0) {
                    let csOfficerIdList = [];

                    csOfficer[0].forEach(cs => {
                        if (cs && cs._id) {
                            csOfficerIdList.push(cs._id);
                        }
                    });

                    query.csOfficer = {$in: csOfficerIdList};
                } else if (checkCSOfficer) {
                    query.csOfficer = [];
                }

                return;
            }
        ).then(
            () => {
                let platformProm = dbconfig.collection_platform.find(platformQuery).lean();
                let dataProm = dbconfig.collection_qqConversationLog.aggregate(
                    {$match: query},
                    {
                        "$group": {
                            "_id": {
                                "platformObjId": "$platformObjId",
                                "deviceId": "$deviceId",
                                "deviceNickName": "$deviceNickName",
                                "playerQQRemark": "$playerQQRemark"
                            },
                            "count": {"$sum": 1},
                        }
                    },
                    { $skip: index },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            count: 1
                        }
                    }
                ).read("secondaryPreferred");
                let sizeProm = dbconfig.collection_qqConversationLog.aggregate(
                    {$match: query},
                    {
                        "$group": {
                            "_id": {
                                "platformObjId": "$platformObjId",
                                "deviceId": "$deviceId",
                                "deviceNickName": "$deviceNickName",
                                "playerQQRemark": "$playerQQRemark"
                            },
                            "count": {"$sum": 1},
                        }
                    },
                    {
                        "$group": {
                            "_id": null,
                            "count": {"$sum": 1},
                        }
                    }
                ).read("secondaryPreferred");

                return Promise.all([platformProm, dataProm, sizeProm]);
            }
        ).then(
            result => {
                if(result && result.length > 1){
                    let platformDetails = result[0];
                    deviceList = result[1];
                    totalCount = result[2] && result[2][0] && result[2][0].count ? result[2][0].count : 0;
                    let playerQQRemarkList = [];

                    deviceList.forEach(device => {
                        if (device && device._id && device._id.platformObjId){
                            let platformIndex = platformDetails.findIndex(p => p._id.toString() == device._id.platformObjId.toString());

                            if(platformIndex > -1){
                                device._id.platformName = platformDetails[platformIndex].name || "";
                            }else{
                                device._id.platformName = "";
                            }
                        }

                        if (device && device._id && device._id.playerQQRemark){
                            playerQQRemarkList.push(device._id.playerQQRemark);
                        }
                    });

                    return dbconfig.collection_qqGroupControlPlayerQQ.find({playerQQRemark: {$in: playerQQRemarkList}});
                }
            }
        ).then(
            playerQQList => {
                if(playerQQList && playerQQList.length > 0){
                    deviceList.forEach(device => {
                        if(device && device._id && device._id.platformObjId && device._id.playerQQRemark){
                            let playerQQIndex = playerQQList.findIndex(p => p.playerQQRemark == device._id.playerQQRemark && p.deviceId == device._id.deviceId);

                            if(playerQQIndex > -1){
                                device._id.playerQQId = playerQQList[playerQQIndex].playerQQId || "";
                            }
                        }
                    });
                }

                return {data: deviceList, size: totalCount};
            }
        );
    },

    getQQDeviceNickNameList: function(platformList){
        let query = {};

        if(platformList){
            query.platformObjId = {$in: platformList};
        }

        return dbconfig.collection_qqConversationLog.distinct('deviceNickName', query).lean();
    },

    getQQConversation: function(platform, deviceNickName, csName, startTime, endTime, content, playerQQRemark, index, limit, sortCol){
        let csOfficerProm = [];
        let checkCSOfficer = false;
        let size;
        let conversationList;
        let query = {
            csReplyTime: {'$lte':new Date(endTime),
                '$gte': new Date(startTime)},
        };
        let platformQuery = {};

        if(platform && platform.length > 0){
            platform = Array.isArray(platform) ? platform : [platform];
            query.platformObjId = {$in: platform.map(p => ObjectId(p))};
            platformQuery._id = {$in: platform};
        }

        if(deviceNickName && deviceNickName.length > 0){
            query.deviceNickName = {$in: deviceNickName};
        }

        if(csName && csName.length > 0){
            csOfficerProm = dbconfig.collection_admin.find({adminName: {$in: csName}}).lean();
            checkCSOfficer = true;
        }

        if(content){
            query.csReplyContent = new RegExp('.*' + content + '.*')
        }

        if(playerQQRemark && playerQQRemark.length > 0){
            query.playerQQRemark = {$in: playerQQRemark};
        }

        return Promise.all([csOfficerProm]).then(
            csOfficer => {
                if(csOfficer && csOfficer.length > 0 && csOfficer[0] && csOfficer[0].length > 0){
                    let csOfficerIdList = [];

                    csOfficer[0].forEach(cs => {
                        if(cs && cs._id){
                            csOfficerIdList.push(cs._id);
                        }
                    });

                    query.csOfficer = {$in: csOfficerIdList};
                }else if(checkCSOfficer){
                    query.csOfficer = [];
                }

                return;
            }
        ).then(
            () => {
                if (!sortCol) {
                    sortCol = {platformObjId: 1, deviceNickName: 1, csOfficer: 1, playerQQRemark: 1, csReplyTime: -1}
                } else if (sortCol) {
                    if (typeof sortCol.platformObjId != "undefined") {
                        sortCol.deviceNickName = sortCol.platformObjId;
                        sortCol.csOfficer = sortCol.platformObjId;
                        sortCol.playerQQRemark = sortCol.platformObjId;
                        sortCol.csReplyTime = -1;
                    } else if (typeof sortCol.deviceNickName != "undefined") {
                        sortCol.csOfficer = sortCol.deviceNickName;
                        sortCol.playerQQRemark = sortCol.deviceNickName;
                        sortCol.csReplyTime = -1;
                    } else if (typeof sortCol.csOfficer != "undefined") {
                        sortCol.playerQQRemark = sortCol.csOfficer;
                        sortCol.csReplyTime = -1;
                    } else if (typeof sortCol.playerQQRemark != "undefined") {
                        sortCol.csReplyTime = -1;
                    }
                }

                let dataProm = dbconfig.collection_qqConversationLog.find(query)
                    .populate({path: "platformObjId", model: dbconfig.collection_platform})
                    .populate({path: "csOfficer", model: dbconfig.collection_admin}).skip(index).limit(limit)
                    .sort(sortCol)
                    .lean();
                let sizeProm = dbconfig.collection_qqConversationLog.find(query).count();

                return Promise.all([dataProm, sizeProm]);
            }
        ).then(
            result => {
                if(result && result.length > 1){
                    conversationList = result[0];
                    size = result[1] || 0;
                    let playerQQRemarkList = [];

                    conversationList.forEach(conversation => {
                        if (conversation && conversation.playerQQRemark) {
                            playerQQRemarkList.push(conversation.playerQQRemark);
                        }
                    });

                    return dbconfig.collection_qqGroupControlPlayerQQ.find({playerQQRemark: {$in: playerQQRemarkList}});
                }
            }
        ).then(
            playerQQList => {
                if (playerQQList && playerQQList.length > 0) {
                    conversationList.forEach(conversation => {
                        if (conversation && conversation.platformObjId._id && conversation.playerQQRemark) {
                            let playerQQIndex = playerQQList.findIndex(p => p.playerQQRemark == conversation.playerQQRemark);

                            if (playerQQIndex > -1) {
                                conversation.playerQQId = playerQQList[playerQQIndex].playerQQId || "";
                            }
                        }
                    });
                }

                return {data: conversationList, size: size};
            }
        );
    },

    getQQConversationReport: function(platform, deviceNickName, csName, startTime, endTime, index, limit){
        let csOfficerProm = [];
        let checkCSOfficer = false;
        let deviceList;
        let platformQuery = {};
        let qqQuery = {};
        let qqDetails;
        let query = {
            csReplyTime: {
                '$lte': new Date(endTime),
                '$gte': new Date(startTime)
            }
        };

        if (platform && platform.length > 0){
            query.platformObjId = {$in: platform.map(p => ObjectId(p))};
            platformQuery._id = {$in: platform};
            qqQuery.platformObjId = {$in: platform.map(p => ObjectId(p))};
        }

        if (deviceNickName && deviceNickName.length > 0) {
            query.deviceNickName = {$in: deviceNickName};
        }

        if (csName && csName.length > 0) {
            csOfficerProm = dbconfig.collection_admin.find({adminName: {$in: csName}}).lean();
            checkCSOfficer = true;
        }

        return Promise.all([csOfficerProm]).then(
            csOfficer => {
                if (csOfficer && csOfficer.length > 0 && csOfficer[0] && csOfficer[0].length > 0) {
                    let csOfficerIdList = [];

                    csOfficer[0].forEach(cs => {
                        if (cs && cs._id) {
                            csOfficerIdList.push(cs._id);
                        }
                    });

                    query.csOfficer = {$in: csOfficerIdList};

                } else if (checkCSOfficer) {
                    query.csOfficer = [];
                }

                return;
            }
        ).then(
            () => {
                let platformProm = dbconfig.collection_platform.find(platformQuery).lean();
                let qqDetailsProm = dbconfig.collection_qqGroupControlPlayerQQ.find(qqQuery).lean();
                let csOfficerProm = dbconfig.collection_admin.find().lean();
                let dataProm = dbconfig.collection_qqConversationLog.aggregate(
                    {$match: query},
                    {
                        "$group": {
                            "_id": {
                                "platformObjId": "$platformObjId",
                                "csOfficer": "$csOfficer"
                            },
                            "totalConversation": {"$sum": 1},
                        }
                    },
                    { $sort : { platformObjId : 1} }
                ).read("secondaryPreferred");

                return Promise.all([platformProm, qqDetailsProm, csOfficerProm, dataProm]);
            }
        ).then(
            result => {
                if (result && result.length > 3) {
                    let platformDetails = result[0];
                    qqDetails = result[1];
                    let csOfficerDetails = result[2];
                    let checkNoOfPlayerArrayProm = [];
                    deviceList = result[3];

                    deviceList.forEach(device => {
                        if(device && device._id) {
                            //match platformName with platformObjId
                            if (device._id.platformObjId) {
                                let platformIndex = platformDetails.findIndex(p => p._id.toString() == device._id.platformObjId.toString());

                                if(platformIndex > -1){
                                    device.platformName = platformDetails[platformIndex].name || "";
                                }else{
                                    device.platformName = "";
                                }
                            }

                            if (device._id.csOfficer) {
                                let csOfficerIndex = csOfficerDetails.findIndex(c => c._id.toString() == device._id.csOfficer.toString());

                                if (csOfficerIndex > -1) {
                                    device.csOfficerName = csOfficerDetails[csOfficerIndex].adminName || "";
                                } else {
                                    device.csOfficerName = "";
                                }
                            }

                            let checkNoOfPlayerQuery = {
                                platformObjId: device._id.platformObjId,
                                csOfficer: device._id.csOfficer,
                                csReplyTime: {
                                    '$lte': new Date(endTime),
                                    '$gte': new Date(startTime)
                                }
                            }
                            let checkNoOfPlayerProm = dbconfig.collection_qqConversationLog.find(checkNoOfPlayerQuery).lean();

                            checkNoOfPlayerArrayProm.push(checkNoOfPlayerProm);
                        }
                    });

                    return Promise.all(checkNoOfPlayerArrayProm);
                }
            }
        ).then(
            noOfPlayerResult => {
                let finalizePlayerResult = [];
                // distinct duplicate player
                if (noOfPlayerResult && noOfPlayerResult.length > 0) {
                    noOfPlayerResult.forEach(conversation => {
                        if (conversation && conversation.length > 0) {
                            conversation.forEach(player => {
                                if (player && player.playerQQRemark && player.platformObjId && player.csOfficer) {
                                    let indexNo = finalizePlayerResult.findIndex(x => x && x.playerQQRemark && x.platformObjId && x.csOfficer &&
                                        (x.playerQQRemark.trim() == player.playerQQRemark.trim()) &&
                                        (x.platformObjId.toString() == player.platformObjId.toString()) &&
                                        (x.csOfficer.toString() == player.csOfficer.toString()));

                                    if (indexNo == -1) {
                                        finalizePlayerResult.push({playerQQRemark: player.playerQQRemark, platformObjId: player.platformObjId, csOfficer: player.csOfficer});
                                    }
                                }
                            });
                        }
                    });
                }

                // count total player wechat id that csOfficer liasing with
                if (finalizePlayerResult && finalizePlayerResult.length > 0) {
                    finalizePlayerResult.forEach(player => {
                        let deviceIndexNo = deviceList.findIndex(y => y._id.platformObjId.toString() == player.platformObjId.toString() && y._id.csOfficer.toString() == player.csOfficer.toString());

                        if (deviceIndexNo != -1) {
                            deviceList[deviceIndexNo].totalPlayerQQId = deviceList[deviceIndexNo].totalPlayerQQId ? deviceList[deviceIndexNo].totalPlayerQQId + 1 : 1;
                        }
                    });
                }

                let size = deviceList.length;
                deviceList = deviceList.slice(index, Number(limit) + Number(index));

                deviceList.sort(function(a, b) {
                    return a.platformName > b.platformName;
                });
                return {data: deviceList, size: size};
            }
        );
    },

    getWechatDeviceNickNameList: function(platformList){
        let query = {};

        if(platformList){
            query.platformObjId = {$in: platformList};
        }

        return dbconfig.collection_wcConversationLog.distinct('deviceNickName', query).lean();
    },

    getWechatConversationDeviceList: function(platform, deviceNickName, csName, startTime, endTime, content, playerWechatRemark, index, limit){
        index = index || 0;
        let csOfficerProm = [];
        let checkCSOfficer = false;
        //let size;
        let deviceList;
        let totalCount = 0;
        let query = {
            csReplyTime: {'$lte':new Date(endTime),
                '$gte': new Date(startTime)}
        };
        let platformQuery = {};

        if(platform && platform.length > 0){
            query.platformObjId = {$in: platform.map(p => ObjectId(p))};
            platformQuery._id = {$in: platform};
        }

        if(deviceNickName && deviceNickName.length > 0){
            query.deviceNickName = {$in: deviceNickName};
        }

        if(csName && csName.length > 0){
            csOfficerProm = dbconfig.collection_admin.find({adminName: {$in: csName}}).lean();
            checkCSOfficer = true;
        }

        if(content){
            query.csReplyContent = new RegExp('.*' + content + '.*');
        }

        if(playerWechatRemark){
            query.playerWechatRemark = new RegExp('.*' + playerWechatRemark + '.*');
        }

        return Promise.all([csOfficerProm]).then(
            csOfficer => {
                if(csOfficer && csOfficer.length > 0 && csOfficer[0] && csOfficer[0].length > 0){
                    let csOfficerIdList = [];

                    csOfficer[0].forEach(cs => {
                        if(cs && cs._id){
                            csOfficerIdList.push(cs._id);
                        }
                    });

                    query.csOfficer = {$in: csOfficerIdList};
                }else if(checkCSOfficer){
                    query.csOfficer = [];
                }

                return;
            }
        ).then(
            () => {
                let platformProm = dbconfig.collection_platform.find(platformQuery).lean();
                let dataProm = dbconfig.collection_wcConversationLog.aggregate(
                    {$match: query},
                    {
                        "$group": {
                            "_id": {
                                "platformObjId": "$platformObjId",
                                "deviceId": "$deviceId",
                                "deviceNickName": "$deviceNickName",
                                "playerWechatRemark": "$playerWechatRemark"
                            },
                            "count": {"$sum": 1},
                        }
                    },
                    {   $skip: index },
                    {   $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            count: 1
                        }
                    }
                ).read("secondaryPreferred");
                let sizeProm = dbconfig.collection_wcConversationLog.aggregate(
                    {$match: query},
                    {
                        "$group": {
                            "_id": {
                                "platformObjId": "$platformObjId",
                                "deviceId": "$deviceId",
                                "deviceNickName": "$deviceNickName",
                                "playerWechatRemark": "$playerWechatRemark"
                            },
                            "count": {"$sum": 1},
                        }
                    },
                    {
                        "$group": {
                            "_id": null,
                            "count": {"$sum": 1},
                        }
                    }
                ).read("secondaryPreferred");
                // let sizeProm = dbconfig.collection_wcConversationLog.find(query).count();

                return Promise.all([platformProm, dataProm, sizeProm]);
            }
        ).then(
            result => {
                if(result && result.length > 1){
                    let platformDetails = result[0];
                    deviceList = result[1];
                    totalCount = result[2] && result[2][0] && result[2][0].count ? result[2][0].count : 0;
                    //size = result[2] || 0;
                    let playerWechatRemarkList = [];

                    deviceList.forEach(device => {
                        if(device && device._id && device._id.platformObjId){
                            let platformIndex = platformDetails.findIndex(p => p._id.toString() == device._id.platformObjId.toString());

                            if(platformIndex > -1){
                                device._id.platformName = platformDetails[platformIndex].name || "";
                            }else{
                                device._id.platformName = "";
                            }
                        }

                        if(device && device._id && device._id.playerWechatRemark){
                            playerWechatRemarkList.push(device._id.playerWechatRemark);
                        }
                    });

                    return dbconfig.collection_wcGroupControlPlayerWechat.find({playerWechatRemark: {$in: playerWechatRemarkList}});
                }
            }
        ).then(
            playerWechatList => {
                if(playerWechatList && playerWechatList.length > 0){
                    deviceList.forEach(device => {
                        if(device && device._id && device._id.platformObjId && device._id.playerWechatRemark){
                            let playerWechatIndex = playerWechatList.findIndex(p => p.playerWechatRemark == device._id.playerWechatRemark && p.deviceId == device._id.deviceId);

                            if(playerWechatIndex > -1){
                                device._id.playerWechatId = playerWechatList[playerWechatIndex].playerWechatId || "";
                            }
                        }
                    })
                }

                return {data: deviceList, size: totalCount};
            }
        )
    },

    getWechatConversation: function(platform, deviceNickName, csName, startTime, endTime, content, playerWechatRemark, index, limit, sortCol){
        let csOfficerProm = [];
        let checkCSOfficer = false;
        let size;
        let conversationList;
        let query = {
            csReplyTime: {'$lte':new Date(endTime),
                '$gte': new Date(startTime)},
        };
        let platformQuery = {};

        if(platform && platform.length > 0){
            platform = Array.isArray(platform) ? platform : [platform];
            query.platformObjId = {$in: platform.map(p => ObjectId(p))};
            platformQuery._id = {$in: platform};
        }

        if(deviceNickName && deviceNickName.length > 0){
            query.deviceNickName = {$in: deviceNickName};
        }

        if(csName && csName.length > 0){
            csOfficerProm = dbconfig.collection_admin.find({adminName: {$in: csName}}).lean();
            checkCSOfficer = true;
        }

        if(content){
            query.csReplyContent = new RegExp('.*' + content + '.*')
        }

        if(playerWechatRemark && playerWechatRemark.length > 0){
            query.playerWechatRemark = {$in: playerWechatRemark};
        }

        return Promise.all([csOfficerProm]).then(
            csOfficer => {
                if(csOfficer && csOfficer.length > 0 && csOfficer[0] && csOfficer[0].length > 0){
                    let csOfficerIdList = [];

                    csOfficer[0].forEach(cs => {
                        if(cs && cs._id){
                            csOfficerIdList.push(cs._id);
                        }
                    });

                    query.csOfficer = {$in: csOfficerIdList};
                }else if(checkCSOfficer){
                    query.csOfficer = [];
                }

                return;
            }
        ).then(
            () => {
                if(!sortCol){
                    sortCol = {platformObjId: 1, deviceNickName: 1, csOfficer: 1, playerWechatRemark: 1, csReplyTime: -1}
                }else if(sortCol){
                    if(typeof sortCol.platformObjId != "undefined"){
                        sortCol.deviceNickName = sortCol.platformObjId;
                        sortCol.csOfficer = sortCol.platformObjId;
                        sortCol.playerWechatRemark = sortCol.platformObjId;
                        sortCol.csReplyTime = -1;
                    }else if(typeof sortCol.deviceNickName != "undefined"){
                        sortCol.csOfficer = sortCol.deviceNickName;
                        sortCol.playerWechatRemark = sortCol.deviceNickName;
                        sortCol.csReplyTime = -1;
                    }else if(typeof sortCol.csOfficer != "undefined"){
                        sortCol.playerWechatRemark = sortCol.csOfficer;
                        sortCol.csReplyTime = -1;
                    }else if(typeof sortCol.playerWechatRemark != "undefined"){
                        sortCol.csReplyTime = -1;
                    }
                }

                let dataProm = dbconfig.collection_wcConversationLog.find(query)
                    .populate({path: "platformObjId", model: dbconfig.collection_platform})
                    .populate({path: "csOfficer", model: dbconfig.collection_admin}).skip(index).limit(limit)
                    .sort(sortCol)
                    .lean();
                let sizeProm = dbconfig.collection_wcConversationLog.find(query).count();

                return Promise.all([dataProm, sizeProm]);
            }
        ).then(
            result => {
                if(result && result.length > 1){
                    conversationList = result[0];
                    size = result[1] || 0;
                    let playerWechatRemarkList = [];

                    conversationList.forEach(conversation => {
                        if(conversation && conversation.playerWechatRemark){
                            playerWechatRemarkList.push(conversation.playerWechatRemark);
                        }
                    });

                    return dbconfig.collection_wcGroupControlPlayerWechat.find({playerWechatRemark: {$in: playerWechatRemarkList}});
                }
            }
        ).then(
            playerWechatList => {
                if(playerWechatList && playerWechatList.length > 0){
                    conversationList.forEach(conversation => {
                        if(conversation && conversation.platformObjId._id && conversation.playerWechatRemark){
                            let playerWechatIndex = playerWechatList.findIndex(p => p.playerWechatRemark == conversation.playerWechatRemark);

                            if(playerWechatIndex > -1){
                                conversation.playerWechatId = playerWechatList[playerWechatIndex].playerWechatId || "";
                            }
                        }
                    })
                }

                return {data: conversationList, size: size};
            }
        )
    },

    getWechatConversationReport: function(platform, deviceNickName, csName, startTime, endTime, index, limit){
        let csOfficerProm = [];
        let checkCSOfficer = false;
        let deviceList;
        let platformQuery = {};
        let wechatQuery = {};
        let wechatDetails;
        let query = {
            csReplyTime: {
                '$lte': new Date(endTime),
                '$gte': new Date(startTime)
            }
        };

        if (platform && platform.length > 0){
            query.platformObjId = {$in: platform.map(p => ObjectId(p))};
            platformQuery._id = {$in: platform};
            wechatQuery.platformObjId = {$in: platform.map(p => ObjectId(p))};
        }

        if (deviceNickName && deviceNickName.length > 0){
            query.deviceNickName = {$in: deviceNickName};
        }

        if (csName && csName.length > 0){
            csOfficerProm = dbconfig.collection_admin.find({adminName: {$in: csName}}).lean();
            checkCSOfficer = true;
        }

        return Promise.all([csOfficerProm]).then(
            csOfficer => {
                if (csOfficer && csOfficer.length > 0 && csOfficer[0] && csOfficer[0].length > 0){
                    let csOfficerIdList = [];

                    csOfficer[0].forEach(cs => {
                        if(cs && cs._id){
                            csOfficerIdList.push(cs._id);
                        }
                    });

                    query.csOfficer = {$in: csOfficerIdList};

                } else if (checkCSOfficer){
                    query.csOfficer = [];
                }

                return;
            }
        ).then(
            () => {
                let platformProm = dbconfig.collection_platform.find(platformQuery).lean();
                let wechatDetailsProm = dbconfig.collection_wcGroupControlPlayerWechat.find(wechatQuery).lean();
                let csOfficerProm = dbconfig.collection_admin.find().lean();
                let dataProm = dbconfig.collection_wcConversationLog.aggregate(
                    {$match: query},
                    {
                        "$group": {
                            "_id": {
                                "platformObjId": "$platformObjId",
                                "csOfficer": "$csOfficer"
                            },
                            "totalConversation": {"$sum": 1},
                        }
                    },
                    { $sort : { platformObjId : 1} }
                ).read("secondaryPreferred");

                return Promise.all([platformProm, wechatDetailsProm, csOfficerProm, dataProm]);
            }
        ).then(
            result => {
                if(result && result.length > 3){
                    let platformDetails = result[0];
                    wechatDetails = result[1];
                    let csOfficerDetails = result[2];
                    let checkNoOfPlayerArrayProm = [];
                    deviceList = result[3];

                    deviceList.forEach(device => {
                        if(device && device._id){
                            //match platformName with platformObjId
                            if(device._id.platformObjId){
                                let platformIndex = platformDetails.findIndex(p => p._id.toString() == device._id.platformObjId.toString());

                                if(platformIndex > -1){
                                    device.platformName = platformDetails[platformIndex].name || "";
                                }else{
                                    device.platformName = "";
                                }
                            }

                            if(device._id.csOfficer){
                                let csOfficerIndex = csOfficerDetails.findIndex(c => c._id.toString() == device._id.csOfficer.toString());

                                if(csOfficerIndex > -1){
                                    device.csOfficerName = csOfficerDetails[csOfficerIndex].adminName || "";
                                }else {
                                    device.csOfficerName = "";
                                }
                            }

                            let checkNoOfPlayerQuery = {
                                platformObjId: device._id.platformObjId,
                                csOfficer: device._id.csOfficer,
                                csReplyTime: {
                                    '$lte': new Date(endTime),
                                    '$gte': new Date(startTime)
                                }
                            }
                            let checkNoOfPlayerProm = dbconfig.collection_wcConversationLog.find(checkNoOfPlayerQuery).lean();

                            checkNoOfPlayerArrayProm.push(checkNoOfPlayerProm);
                        }
                    });

                    return Promise.all(checkNoOfPlayerArrayProm);
                }
            }
        ).then(
            noOfPlayerResult => {
                let finalizePlayerResult = [];
                // distinct duplicate player
                if (noOfPlayerResult && noOfPlayerResult.length > 0) {
                    noOfPlayerResult.forEach(conversation => {
                        if (conversation && conversation.length > 0) {
                            conversation.forEach(player => {
                                if (player && player.playerWechatRemark && player.platformObjId && player.csOfficer) {
                                    let indexNo = finalizePlayerResult.findIndex(x => x && x.playerWechatRemark && x.platformObjId && x.csOfficer &&
                                        (x.playerWechatRemark.trim() == player.playerWechatRemark.trim()) &&
                                        (x.platformObjId.toString() == player.platformObjId.toString()) &&
                                        (x.csOfficer.toString() == player.csOfficer.toString()));

                                    if (indexNo == -1) {
                                        finalizePlayerResult.push({playerWechatRemark: player.playerWechatRemark, platformObjId: player.platformObjId, csOfficer: player.csOfficer});
                                    }
                                }
                            });
                        }
                    });
                }

                // count total player wechat id that csOfficer liasing with
                if (finalizePlayerResult && finalizePlayerResult.length > 0) {
                    finalizePlayerResult.forEach(player => {
                        let deviceIndexNo = deviceList.findIndex(y => y._id.platformObjId.toString() == player.platformObjId.toString() && y._id.csOfficer.toString() == player.csOfficer.toString());

                        if(deviceIndexNo != -1){
                            deviceList[deviceIndexNo].totalPlayerWechatId = deviceList[deviceIndexNo].totalPlayerWechatId ? deviceList[deviceIndexNo].totalPlayerWechatId + 1 : 1;
                        }
                    });
                }

                let size = deviceList.length;
                deviceList = deviceList.slice(index, Number(limit) + Number(index));

                deviceList.sort(function (a, b) {
                    return a.platformName > b.platformName;
                });
                return {data: deviceList, size: size};
            }
        )

    },

    getManualProcessRecord: function (data) {
        let adminObjIdList = data.adminObjId;
        let startDate = new Date(data.startDate);
        let endDate = new Date(data.endDate);
        let sort = data.sortCol || {"totalCount": -1};
        let index = data.index || 0;
        let limit = data.limit || 50;

        let adminObjIdArr = [];
        let manualSubmitProm = [];
        let manualApprovalProm = [];
        let manualCancelProm = [];
        let getAdminProm = Promise.resolve();

        console.log("checking startDate", startDate);
        console.log("checking endDate", endDate);
        if (!adminObjIdList || (adminObjIdList && adminObjIdList.length == 0)){
            getAdminProm = dbconfig.collection_platform.find({}, {csDepartment: 1}).populate({
                path: "csDepartment",
                model: dbconfig.collection_department
            }).lean().then(
                platformList => {
                    if (platformList && platformList.length) {
                        platformList.forEach(
                            platform => {
                                if (platform && platform.csDepartment && platform.csDepartment.length){
                                    platform.csDepartment.forEach(
                                        csDepartment => {
                                            if (csDepartment && csDepartment.users && csDepartment.users.length){
                                                csDepartment.users.forEach(
                                                    adminObjId => {
                                                        let index = adminObjIdArr.findIndex(p => p == adminObjId);
                                                        if (index == -1){
                                                            adminObjIdArr.push(adminObjId)
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    )
                                }
                            }
                        )
                    }
                }
            )
        } else {
            adminObjIdArr = adminObjIdList
        }

        return getAdminProm.then(
            () => {
                if (adminObjIdArr && adminObjIdArr.length){
                    manualSubmitProm = dbconfig.collection_proposal.find({
                        'creator.id': {$in: adminObjIdArr.map(adminObjId => {return adminObjId.toString()})},
                        createTime: {$gte: startDate, $lt: endDate}
                    }, {creator: 1, proposalId: 1}).read("secondaryPreferred").lean();

                    manualApprovalProm = dbconfig.collection_proposalProcessStep.find({
                        operationTime: {$gte: startDate, $lt: endDate},
                        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS, constProposalStatus.APPROVE]},
                        operator: {$in: adminObjIdArr.map(adminObjId => {return ObjectId(adminObjId)})}
                    }, {operator: 1}).read("secondaryPreferred").lean();

                    manualCancelProm = dbconfig.collection_proposalProcessStep.find({
                        operationTime: {$gte: startDate, $lt: endDate},
                        status: {$in: [constProposalStatus.REJECTED, constProposalStatus.CANCEL]},
                        operator: {$in: adminObjIdArr.map(adminObjId => {return ObjectId(adminObjId)})}
                    }, {operator: 1}).read("secondaryPreferred").lean();


                }
                return Promise.all([manualSubmitProm, manualApprovalProm, manualCancelProm])
            }
        ).then(
            async retData => {
                if (retData && retData.length && adminObjIdArr && adminObjIdArr.length){
                    let manualSubmitData = retData[0];
                    let manualApprovalData = retData[1];
                    let manualCancelData = retData[2];
                    let result = [];

                    for(let adminObjId of adminObjIdArr) {
                        let adminData = {};
                        let submitData = await manualSubmitCal(adminObjId, manualSubmitData);
                        let approvalData = await manualApprovalOrCancelCal(adminObjId, manualApprovalData);
                        let cancelData = await manualApprovalOrCancelCal(adminObjId, manualCancelData);
                        adminData.totalCount = submitData.count + approvalData.count + cancelData.count;
                        if(!isNaN(adminData.totalCount) && adminData.totalCount > 0) {
                            adminData._id = adminObjId;
                            adminData.submitCount = submitData.count;
                            adminData.submitProposalIdArr = submitData.proposalList;
                            adminData.approvalCount = approvalData.count;
                            adminData.approvalProposalIdArr = approvalData.proposalList;
                            adminData.cancelCount = cancelData.count;
                            adminData.cancelProposalIdArr = cancelData.proposalList;
                            result.push(adminData);
                        }
                    }

                    // sorting
                    let sortKey = Object.keys(sort)[0];
                    let order = Boolean(sort[sortKey] > 0) ? -1 : 1;
                    result.sort((curItem,nextItem)=>{
                        if (curItem[sortKey] > nextItem[sortKey]) {
                            return order;
                        } else if (curItem[sortKey] < nextItem[sortKey]) {
                            return order;
                        } else {
                            return 0;
                        }
                    });
                    // limit
                    let slicedResult = result.splice(index, limit);
                    // size
                    let size = result && result.length ? result.length : 0;

                    return {data: slicedResult, size: size};
                }
            },
            err => {
                console.log("Error when getting manual process record; Error: ", err);
                return Promise.reject({
                    name: "DataError",
                    message: "Error when getting manual process record",
                    error: err
                })
            }
        ).catch(
            err => {
                console.log("Error: When getting daily summary record for manual process", err)
                return Promise.reject({
                    name: "DataError",
                    message: "There is error when getting daily summary record for manual process",
                    error: err
                })
            }
        );

        function manualSubmitCal(adminObjId, manualSubmitData) {
            if (adminObjId && manualSubmitData && manualSubmitData.length){
                let filteredData = manualSubmitData.filter(p => p && p.creator && p.creator.id && p.creator.id == adminObjId)
                let proposalList = [];

                filteredData.forEach(
                    data => {
                        if (data && data.proposalId){
                            proposalList.push(data.proposalId)
                        }
                    }
                )

                return {
                    count: filteredData && filteredData.length ? filteredData.length : 0,
                    proposalList: proposalList
                }
            }
            return {
                count: 0,
                proposalList: []
            }
        }

        function manualApprovalOrCancelCal(adminObjId, manualData) {
            if (adminObjId && manualData && manualData.length) {
                let filteredData = manualData.filter(p => {
                    if (p.operator && adminObjId) {
                        return p.operator.toString() == adminObjId.toString()
                    }
                });
                let proposalList = [];
                let processStepList = [];
                let gettingProposalStepProm = Promise.resolve();
                let gettingProposalProcessProm = Promise.resolve();
                let processList = [];

                filteredData.forEach(
                    data => {
                        if (data && data._id) {
                            processStepList.push(ObjectId(data._id))
                        }
                    }
                );

                if (processStepList && processStepList.length) {
                    gettingProposalStepProm = dbconfig.collection_proposalProcess.find({
                        steps: {$in: processStepList}
                    }).lean();
                }

                return gettingProposalStepProm.then(
                    processStepArr => {
                        if (processStepArr && processStepArr.length){
                            processStepArr.forEach(p => {
                                if (p && p._id) {
                                    processList.push(ObjectId(p._id))
                                }
                            })
                        }

                        if (processList && processList.length){
                            gettingProposalProcessProm = dbconfig.collection_proposal.find({
                                process: {$in: processList}
                            }, {proposalId: 1}).lean();
                        }

                        return gettingProposalProcessProm
                    }
                ).then(
                    proposalArr => {
                        if (proposalArr && proposalArr.length){
                            proposalArr.forEach(
                                proposal => {
                                    if (proposal && proposal.proposalId){
                                        proposalList.push(proposal.proposalId)
                                    }
                                }
                            )
                        }
                    }
                ).then(
                    () => {
                        return {
                            count: filteredData && filteredData.length ? filteredData.length : 0,
                            proposalList: proposalList
                        }
                    }
                )
            }
            else{
                return {
                    count: 0,
                    proposalList: []
                }
            }
        }
    },

    // run on scheduler to get daily summary record of manual approval
    getManualProposalDailySummaryRecord: function (startDate, endDate, adminObjIdList) {
        let adminObjIdArr = [];
        let manualSubmitProm = [];
        let manualApprovalProm = [];
        let manualCancelProm = [];
        let countProm = [];
        let getAdminProm = Promise.resolve();

        console.log("checking startDate", startDate);
        console.log("checking endDate", endDate);
        if (!adminObjIdList || (adminObjIdList && adminObjIdList.length == 0)){
            getAdminProm = dbconfig.collection_platform.find({}, {csDepartment: 1}).populate({
                path: "csDepartment",
                model: dbconfig.collection_department
            }).lean().then(
                platformList => {
                    if (platformList && platformList.length) {
                        platformList.forEach(
                            platform => {
                                if (platform && platform.csDepartment && platform.csDepartment.length){
                                    platform.csDepartment.forEach(
                                        csDepartment => {
                                            if (csDepartment && csDepartment.users && csDepartment.users.length){
                                                csDepartment.users.forEach(
                                                    adminObjId => {
                                                        let index = adminObjIdArr.findIndex(p => p == adminObjId);
                                                        if (index == -1){
                                                            adminObjIdArr.push(adminObjId)
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    )
                                }
                            }
                        )
                    }
                }
            )
        }
        else{
            adminObjIdArr = adminObjIdList
        }

        return getAdminProm.then(
            () => {
                if (adminObjIdArr && adminObjIdArr.length){
                    manualSubmitProm = dbconfig.collection_proposal.find({
                        'creator.id': {$in: adminObjIdArr.map(adminObjId => {return adminObjId.toString()})},
                        createTime: {$gte: startDate, $lt: endDate}
                    }, {creator: 1, proposalId: 1}).lean();

                    manualApprovalProm = dbconfig.collection_proposalProcessStep.find({
                        operationTime: {$gte: startDate, $lt: endDate},
                        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS, constProposalStatus.APPROVE]},
                        operator: {$in: adminObjIdArr.map(adminObjId => {return ObjectId(adminObjId)})}
                    }, {operator: 1}).lean();

                    manualCancelProm = dbconfig.collection_proposalProcessStep.find({
                        operationTime: {$gte: startDate, $lt: endDate},
                        status: {$in: [constProposalStatus.REJECTED, constProposalStatus.CANCEL]},
                        operator: {$in: adminObjIdArr.map(adminObjId => {return ObjectId(adminObjId)})}
                    }, {operator: 1}).lean();


                }
                return Promise.all([manualSubmitProm, manualApprovalProm, manualCancelProm])
            }
        ).then(
            retData => {
                if (retData && retData.length && adminObjIdArr && adminObjIdArr.length){
                    let manualSubmitData = retData[0];
                    let manualApprovalData = retData[1];
                    let manualCancelData = retData[2];

                    // console.log("checking manualSubmitData", manualSubmitData)
                    // console.log("checking manualApprovalData", manualApprovalData)
                    // console.log("checking manualCancelData", manualCancelData)

                    adminObjIdArr.forEach(
                        adminObjId =>{
                            countProm.push(
                                saveManualCountDetailByAdminObjId(adminObjId, manualSubmitData, manualApprovalData, manualCancelData, startDate, endDate)
                            )
                        }
                    )
                    return Promise.all(countProm);
                }
            },
            err => {
                console.log("Error when getting manual process record; Error: ", err);
                return Promise.reject({
                    name: "DataError",
                    message: "Error when getting manual process record",
                    error: err
                })
            }
        );

        function saveManualCountDetailByAdminObjId (adminObjId, manualSubmitData, manualApprovalData, manualCancelData, startDate, endDate) {
            return Promise.all([
                manualSubmitCal(adminObjId, manualSubmitData),
                manualApprovalOrCancelCal(adminObjId, manualApprovalData),
                manualApprovalOrCancelCal(adminObjId, manualCancelData)
            ]).then(
                retData => {
                    // console.log("checking retData", retData, adminObjId)
                    if (retData && retData.length){
                        let manualSubmitData = retData[0];
                        let manualApprovalData = retData[1];
                        let manualCancelData = retData[2];

                        if ((manualSubmitData && manualSubmitData.count) || (manualApprovalData && manualApprovalData.count) || (manualCancelData && manualCancelData.count)){
                            // check if there is existing record
                            return dbconfig.collection_manualProcessDailySummaryRecord.findOne({
                                adminObjId: ObjectId(adminObjId),
                                createTime: {$gte: startDate, $lt: endDate}
                            }).then(
                                record => {
                                    if (record && record._id){
                                        return dbconfig.collection_manualProcessDailySummaryRecord.findOneAndUpdate(
                                            {_id: record._id},
                                            {
                                                manualSubmitCount: manualSubmitData && manualSubmitData.count ? manualSubmitData.count : 0,
                                                manualApprovalCount: manualApprovalData && manualApprovalData.count ? manualApprovalData.count : 0,
                                                manualCancelCount: manualCancelData && manualCancelData.count ? manualCancelData.count : 0,
                                                manualSubmitProposalId: manualSubmitData && manualSubmitData.proposalList ? manualSubmitData.proposalList: null,
                                                manualApprovalProposalId: manualApprovalData && manualApprovalData.proposalList ? manualApprovalData.proposalList: null,
                                                manualCancelProposalId: manualCancelData && manualCancelData.proposalList ? manualCancelData.proposalList: null,
                                            }
                                        ).lean()
                                    }
                                    else{
                                        let saveData = {
                                            adminObjId: adminObjId,
                                            manualSubmitCount: manualSubmitData && manualSubmitData.count ? manualSubmitData.count : 0,
                                            manualApprovalCount: manualApprovalData && manualApprovalData.count ? manualApprovalData.count : 0,
                                            manualCancelCount: manualCancelData && manualCancelData.count ? manualCancelData.count : 0,
                                            manualSubmitProposalId: manualSubmitData && manualSubmitData.proposalList ? manualSubmitData.proposalList: null,
                                            manualApprovalProposalId: manualApprovalData && manualApprovalData.proposalList ? manualApprovalData.proposalList: null,
                                            manualCancelProposalId: manualCancelData && manualCancelData.proposalList ? manualCancelData.proposalList: null,
                                            createTime: startDate
                                        }

                                        let newRecord = new dbconfig.collection_manualProcessDailySummaryRecord(saveData);
                                        return newRecord.save();
                                    }
                                }
                            )

                        }
                    }
                }
            )
        }

        function manualSubmitCal(adminObjId, manualSubmitData) {
            if (adminObjId && manualSubmitData && manualSubmitData.length){
                let filteredData = manualSubmitData.filter(p => p && p.creator && p.creator.id && p.creator.id == adminObjId)
                let proposalList = [];

                filteredData.forEach(
                    data => {
                        if (data && data.proposalId){
                            proposalList.push(data.proposalId)
                        }
                    }
                )

                return {
                    count: filteredData && filteredData.length ? filteredData.length : 0,
                    proposalList: proposalList
                }
            }
            return {
                count: 0,
                proposalList: []
            }
        }

        function manualApprovalOrCancelCal(adminObjId, manualData) {
            if (adminObjId && manualData && manualData.length) {
                let filteredData = manualData.filter(p => {
                    if (p.operator && adminObjId) {
                        return p.operator.toString() == adminObjId.toString()
                    }
                });
                let proposalList = [];
                let processStepList = [];
                let gettingProposalStepProm = Promise.resolve();
                let gettingProposalProcessProm = Promise.resolve();
                let processList = [];

                filteredData.forEach(
                    data => {
                        if (data && data._id) {
                            processStepList.push(ObjectId(data._id))
                        }
                    }
                );

                if (processStepList && processStepList.length) {
                    gettingProposalStepProm = dbconfig.collection_proposalProcess.find({
                        steps: {$in: processStepList}
                    }).lean();
                }

                return gettingProposalStepProm.then(
                    processStepArr => {
                        if (processStepArr && processStepArr.length){
                            processStepArr.forEach(p => {
                                if (p && p._id) {
                                    processList.push(ObjectId(p._id))
                                }
                            })
                        }

                        if (processList && processList.length){
                            gettingProposalProcessProm = dbconfig.collection_proposal.find({
                                process: {$in: processList}
                            }, {proposalId: 1}).lean();
                        }

                        return gettingProposalProcessProm
                    }
                ).then(
                    proposalArr => {
                        if (proposalArr && proposalArr.length){
                            proposalArr.forEach(
                                proposal => {
                                    if (proposal && proposal.proposalId){
                                        proposalList.push(proposal.proposalId)
                                    }
                                }
                            )
                        }
                    }
                ).then(
                    () => {
                        return {
                            count: filteredData && filteredData.length ? filteredData.length : 0,
                            proposalList: proposalList
                        }
                    }
                )
            }
            else{
                return {
                    count: 0,
                    proposalList: []
                }
            }
        }
    },

    getManualProcessProposalDetail: function (data) {
        let index = data.index || 0;
        let limit = data.limit || 50;
        let sort = data.sortCol || {createTime: -1};

        let prom = Promise.resolve();
        let sizeProm = Promise.resolve();
        if (data && data.proposalId && data.proposalId.length){
            prom = dbconfig.collection_proposal.find({
                proposalId: {$in: data.proposalId}
            }).populate({
                path: "type",
                model: dbconfig.collection_proposalType
            }).sort(sort).skip(index).limit(limit).lean();

            sizeProm =  dbconfig.collection_proposal.find({
                proposalId: {$in: data.proposalId}
            }).lean().count();
        }

        return Promise.all([prom, sizeProm]).then(
            retData =>{
                return {
                    data: retData && retData[0] ? retData[0] : [],
                    size: retData && retData[1] ? retData[1] : 0
                }
            }
        )
    },

    summarizeManualProcessRecord: function (startDate, endDate) {
        let adminObjIdArr = [];
        let dayStartTime = new Date (startDate);
        let totalDays = dbUtility.getNumberOfDays(startDate, endDate);
        let getNextDate = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + 1));
        };

        return dbconfig.collection_platform.find({}, {csDepartment: 1}).populate({
            path: "csDepartment",
            model: dbconfig.collection_department
        }).lean().then(
            platformList => {
                if (platformList && platformList.length) {
                    platformList.forEach(
                        platform => {
                            if (platform && platform.csDepartment && platform.csDepartment.length){
                                platform.csDepartment.forEach(
                                    csDepartment => {
                                        if (csDepartment && csDepartment.users && csDepartment.users.length){
                                            csDepartment.users.forEach(
                                                adminObjId => {
                                                    let index = adminObjIdArr.findIndex(p => p == adminObjId);
                                                    if (index == -1){
                                                        adminObjIdArr.push(adminObjId)
                                                    }
                                                }
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    )
                }
            }
        ).then(
            () => {
                if (adminObjIdArr && adminObjIdArr.length){
                    let partialProcessProm = Promise.resolve();
                    for(let x = 0; x < totalDays; x++){
                        let newStartTime = dayStartTime;
                        let dayEndTime = getNextDate.call(this, dayStartTime);
                        partialProcessProm = partialProcessProm.then(() => {return dbQualityInspection.getManualProposalDailySummaryRecord(newStartTime, dayEndTime, adminObjIdArr)});
                        dayStartTime = dayEndTime;
                    }
                    return partialProcessProm;
                }
            }
        ).catch(
            err => {
                console.log("Error when summarizing manual process record; Error: ", err);
                return Promise.reject({
                    name: "DataError",
                    message: "Error when summarizing manual process record",
                    error: err
                })
            }
        )
    },

    getCsByCsDepartment: function (csDepartmentObjIdList) {
        return dbconfig.collection_department.find({
            _id: {$in: csDepartmentObjIdList.map(p => {return ObjectId(p)})}
        }, {users: 1, platforms: 1}).populate({
            path: "users",
            model: dbconfig.collection_admin
        }).populate({
            path: "platforms",
            model: dbconfig.collection_platform
        }).lean();
    },

    getCsRankingReport: function (data) {
        let index = data.index || 0;
        let limit = data.limit || 50;
        let sort = {};

        if (!data.sortCol){
            sort = {_id: 1};
        }
        else if (data.sortCol && data.sortCol.adminName){
            sort._id= data.sortCol.adminName;
        }else{
            sort = data.sortCol
        }

        let prom = Promise.resolve();

        if (data && data.adminObjId && data.adminObjId.length){
            prom = dbconfig.collection_scheduledCsRankingRecord.aggregate(
                {
                    $match: {
                        adminObjId: {$in: data.adminObjId.map(p => {return ObjectId(p)})},
                        createTime: {$gte: new Date(data.startDate), $lt: new Date(data.endDate)}
                    }
                },
                {
                    $group: {
                        _id: "$adminName",
                        live800TotalConversationNumber:  {$sum: "$live800TotalConversationNumber"},
                        live800TotalEffectiveConversationNumber: {$sum: "$live800TotalEffectiveConversationNumber"},
                        live800TotalInspectionMark: {$sum: "$live800TotalInspectionMark"},
                        totalAcceptedCallInNumber: {$sum: "$totalAcceptedCallInNumber"},
                        totalAcceptedCallInTime: {$sum: "$totalAcceptedCallInTime"},
                        totalManualProcessNumber: {$sum: "$totalManualProcessNumber"},
                    }
                }
            ).read("secondaryPreferred").sort(sort);
        }

        return prom.then(
            retData =>{
                let totalSize = retData && retData.length ? retData.length : 0;

                if (retData && retData.length > limit){
                    retData = retData.slice(index, index+limit)
                }
                return {
                    data: retData,
                    size: totalSize
                }
            }
        )
    },

    compileTel400SummarizedData: function (startDate, endDate) {
        console.log("checking startDate in tel400", startDate);
        console.log("checking endDate in tel400", endDate);

        // get all cs detail
        let csDepartmentList = [];
        let csList;
        let getDepartmentProm = Promise.resolve();
        return dbconfig.collection_platform.find({}, {csDepartment: 1}).lean().then(
            platformData => {
                if (!platformData || platformData.length == 0){
                    return Promise.reject({
                        name: "DataError",
                        message: "No platform is found"
                    })
                }

                platformData.forEach(
                    platform => {
                        if (platform && platform.csDepartment){
                            csDepartmentList = csDepartmentList.concat(platform.csDepartment);

                        }
                    }
                );

                if (csDepartmentList && csDepartmentList.length){
                    getDepartmentProm = dbconfig.collection_department.find({
                        _id: {$in: csDepartmentList.map(p =>  {return ObjectId(p)}) }
                    }, {users: 1}).lean();
                }

                return getDepartmentProm
            }
        ).then(
            departmentData => {
                if (!departmentData || departmentData.length == 0){
                    return Promise.reject({
                        name: "DataError",
                        message: "No CS department is found"
                    })
                }

                let adminList = [];

                departmentData.forEach(
                    department => {
                        if (department && department.users && department.users.length){
                            adminList = adminList.concat(department.users);
                        }
                    }
                );

                if (adminList && adminList.length){
                    return dbconfig.collection_admin.find({
                        _id: {$in: adminList.map(p => {return ObjectId(p)})}
                    }, {adminName: 1, callerId: 1}).lean();
                }

                return Promise.resolve();
            }
        ).then(
            adminList => {
                if (!adminList || adminList.length == 0){
                    return Promise.reject({
                        name: "DataError",
                        message: "No cs admin is found"
                    })
                }
                csList = adminList;

                let connection1 = dbQualityInspection.connectTel400CSMysql();
                let connection2 = dbQualityInspection.connectTel400JiaBoMysql();

                let tempEndDate = new Date(endDate);
                tempEndDate = tempEndDate.getTime() - 1000;

                let startTime = dbUtility.getLocalTimeString(startDate);
                let endTime = dbUtility.getLocalTimeString(tempEndDate);

                let queryObj = "SELECT * FROM cti_cdr_agentcall_statis WHERE seasonal_time BETWEEN CAST('"+ startTime + "' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";

                console.log("checking queryObj", queryObj)

                let sqlCSProm = dbQualityInspection.sqlExecutionAndReturnJsonParse(connection1,queryObj + " ORDER BY seasonal_time desc");
                let sqlJiaBoProm = dbQualityInspection.sqlExecutionAndReturnJsonParse(connection2,queryObj + " ORDER BY seasonal_time desc");

                return Promise.all([sqlCSProm, sqlJiaBoProm])
            }
        ).then(
            retData => {
                let csData = retData && retData[0] ? retData[0] : [];
                let jiaBoData = retData && retData[1] ? retData[1] : [];
                let dataset = [];
                dataset = dataset.concat(csData, jiaBoData);

                console.log("checking tel400 dataset.length", dataset && dataset.length ? dataset.length : 0)
                // process based on time scale
                if (dataset && dataset.length){
                    let timeScaleData = dbQualityInspection.timeScaleProcess(dataset, '3', startDate, endDate);
                    console.log("checking tel400 timeScaleData.length", timeScaleData && timeScaleData.length ? timeScaleData.length : 0)
                    if (timeScaleData && timeScaleData.length){
                        let lengthPerChunk = 500;
                        let numberOfChunk = Math.ceil(timeScaleData.length/lengthPerChunk);
                        let sqlArray = [];

                        for (let i = 0; i < numberOfChunk; i++){
                            sqlArray.push(timeScaleData.slice(i*lengthPerChunk, (i+1)*lengthPerChunk));
                        }

                        let partialProcessProm = Promise.resolve();
                        sqlArray.forEach(arr=>{
                            partialProcessProm = partialProcessProm.then(()=>{return dbQualityInspection.insertTel400DataToDB(arr, csList)});
                        });
                        return partialProcessProm;
                    }
                }
            }
        )
    },

    insertTel400DataToDB: function (arr, csList) {
        let saveProm = [];
        console.log("checking tel400 arr", arr && arr.length ? arr.length: 0);
        console.log("checking tel400 csList", csList && csList.length ? csList.length : 0);

        arr.forEach(
            tel400Data =>{
                if (tel400Data && tel400Data.hasOwnProperty('agentNum')){
                    let index = csList.findIndex( p=> p.callerId == tel400Data.agentNum);
                    if (index != -1){
                        let saveData = {
                            adminObjId: csList[index]._id,
                            adminName: csList[index].adminName,
                            totalAcceptedCallInTime: tel400Data.totalAnswerTime || 0,
                            totalAcceptedCallInNumber: (tel400Data.totalIncallNum || 0) - (tel400Data.totalIncallFailedNum || 0),
                            createTime: tel400Data.startDate
                        };

                        let query = {
                            createTime: tel400Data.startDate,
                            adminObjId: ObjectId(csList[index]._id)
                        };

                        saveProm.push(
                            dbconfig.collection_scheduledCsRankingRecord.findOneAndUpdate(query, saveData, {upsert: true}).lean()
                        )
                    }
                }
            }
        )
        return Promise.all(saveProm);
    },

    compileLive800SummarizedData: function (startDate, endDate){
        console.log("checking startDate in live800", startDate);
        console.log("checking endDate in live800", endDate);
        let inspectionCount;
        let inspectionMark;

        let dayRecordProm = dbconfig.collection_live800RecordDaySummary.aggregate(
            {
                $match: {
                    createTime: {$gte: new Date(startDate), $lt: new Date(endDate)}
                }
            },
            {
                $group: {
                    _id: "$live800Acc.name",
                    totalEffectiveRecord: {$sum: "$effectiveRecord"},
                    totalRecord: {$sum: "$totalRecord"},
                }
            }
        ).read("secondaryPreferred");

        // change to collection_qualityInspection if not using "test data" function; else using collection_live800RecordDayRecord
        let summaryProm = dbconfig.collection_qualityInspection.aggregate(
            {
                $match: {
                    createTime: {$gte: new Date(startDate), $lt: new Date(endDate)}
                }
            },
            {
                $group: {
                    _id: "$live800Acc.name",
                    totalInspectionRate: {$sum: "$totalInspectionRate"},
                }
            }
        ).read("secondaryPreferred");

        return Promise.all([dayRecordProm, summaryProm]).then(
            retData => {
                if (retData && retData.length) {
                    inspectionCount = retData[0];
                    inspectionMark = retData[1];
                    return processInspectionMarking(inspectionMark, startDate, endDate)
                }
            }
        ).then(
            () => {
                return processInspectionCounting(inspectionCount, startDate, endDate)
            }
        )

        function processInspectionCounting (countDataArr, startDate, endDate) {
            let prom = [];
            console.log("checking countDataArr.length", countDataArr ? countDataArr.length : 'undefined');
            countDataArr.forEach(
                countDetail => {
                    if (countDetail._id){
                        prom.push(
                            dbconfig.collection_admin.findOne({adminName: {$regex: countDetail._id, $options: "xi"}}).then(
                                admin => {
                                    if (admin){
                                        let query = {
                                            createTime: new Date(startDate),
                                            adminObjId: ObjectId(admin._id)
                                        };

                                        let updateObj = {
                                            $set: {
                                                live800TotalConversationNumber: countDetail.totalRecord,
                                                live800TotalEffectiveConversationNumber: countDetail.totalEffectiveRecord,
                                            }
                                        };

                                        return dbconfig.collection_scheduledCsRankingRecord.findOne(query).then(
                                            record => {
                                                if (!record){
                                                    let newObj = {
                                                        createTime: new Date(startDate),
                                                        adminObjId: ObjectId(admin._id),
                                                        adminName: admin.adminName,
                                                        live800TotalConversationNumber: countDetail.totalRecord,
                                                        live800TotalEffectiveConversationNumber: countDetail.effectiveRecord,
                                                    };
                                                    let newRecord = new dbconfig.collection_scheduledCsRankingRecord(newObj);
                                                    return newRecord.save();
                                                }
                                                else{
                                                    return dbconfig.collection_scheduledCsRankingRecord.findOneAndUpdate(query, updateObj).lean()
                                                }
                                            }
                                        )
                                    }
                                }
                            )
                        )
                    }
                }
            )
            return Promise.all(prom)
        }

        function processInspectionMarking (markDataArr, startDate, endDate) {
            let prom = [];
            console.log("checking markDataArr.length", markDataArr ? markDataArr.length : 'undefined');

            markDataArr.forEach(
                markDetail => {
                    if (markDetail._id){
                        prom.push(
                            dbconfig.collection_admin.findOne({adminName: {$regex: markDetail._id, $options: "xi"}}).then(
                                admin => {
                                    if (admin){
                                        let query = {
                                            createTime: new Date(startDate),
                                            adminObjId: ObjectId(admin._id)
                                        };

                                        let updateObj = {
                                            $set: {
                                                live800TotalInspectionMark: markDetail.totalInspectionRate,
                                            }
                                        };

                                        return dbconfig.collection_scheduledCsRankingRecord.findOne(query).then(
                                            record => {
                                                if (!record){
                                                    let newObj = {
                                                        createTime: new Date(startDate),
                                                        adminObjId: ObjectId(admin._id),
                                                        adminName: admin.adminName,
                                                        live800TotalInspectionMark: markDetail.totalInspectionRate
                                                    };
                                                    let newRecord = new dbconfig.collection_scheduledCsRankingRecord(newObj);
                                                    return newRecord.save();
                                                }
                                                else{
                                                    return dbconfig.collection_scheduledCsRankingRecord.findOneAndUpdate(query, updateObj).lean()
                                                }
                                            }
                                        )
                                    }
                                }
                            )
                        )
                    }
                }
            )
            return Promise.all(prom)
        }
    },

    compileManualProcessSummarizedData: function (startDate, endDate) {
        console.log("checking startDate in manual process record", startDate);
        console.log("checking endDate in manual process record", endDate);
        let prom = [];

        let query = {
            createTime: {$gte: new Date(startDate), $lt: new Date(endDate)}
        }
        return dbconfig.collection_manualProcessDailySummaryRecord.find(query).lean().then(
            manualProcessRecord => {
                console.log("checking manualProcessRecord.length", manualProcessRecord ? manualProcessRecord.length : 'undefined')
                manualProcessRecord.forEach(
                    record => {
                        if (record && record.adminObjId){
                            let totalManualProcessNumber = (record.manualApprovalCount || 0) + (record.manualSubmitCount || 0) + (record.manualCancelCount || 0)
                            prom.push(
                                dbconfig.collection_admin.findOne({_id: ObjectId(record.adminObjId)}).then(
                                    admin => {
                                        if (admin){
                                            let query = {
                                                createTime: new Date(startDate),
                                                adminObjId: ObjectId(admin._id)
                                            };

                                            let updateObj = {
                                                $set: {
                                                    totalManualProcessNumber: totalManualProcessNumber,
                                                }
                                            };

                                            return dbconfig.collection_scheduledCsRankingRecord.findOne(query).then(
                                                record => {
                                                    if (!record){
                                                        let newObj = {
                                                            createTime: new Date(startDate),
                                                            adminObjId: ObjectId(admin._id),
                                                            adminName: admin.adminName,
                                                            totalManualProcessNumber: totalManualProcessNumber
                                                        };
                                                        let newRecord = new dbconfig.collection_scheduledCsRankingRecord(newObj);
                                                        return newRecord.save();
                                                    }
                                                    else{
                                                        return dbconfig.collection_scheduledCsRankingRecord.findOneAndUpdate(query, updateObj).lean()
                                                    }
                                                }
                                            )
                                        }
                                    }
                                )
                            )
                        }
                    }
                )
                return Promise.all(prom)
            }
        )
    },

    summarizeCsRankingData: function (startDate, endDate) {
        let totalDays = dbUtility.getNumberOfDays(startDate, endDate);
        let dayStartTime = new Date (startDate);
        let getNextDate = function (date) {
            let newDate = new Date(date);
            return new Date(newDate.setDate(newDate.getDate() + 1));
        };
        let partialProcessProm = Promise.resolve();
        for(let x = 0; x < totalDays; x++){
            let newStartTime = dayStartTime;
            let dayEndTime = getNextDate.call(this, dayStartTime);
            partialProcessProm = partialProcessProm.then(() => {return dbQualityInspection.compileCsRankingData(newStartTime, dayEndTime)});
            dayStartTime = dayEndTime;
        }
        return partialProcessProm.catch(
            err => {
                console.log("Error when summarizing CS ranking data; Error: ", err);
                return Promise.reject({
                    name: "DataError",
                    message: "Error when summarizing CS ranking data",
                    error: err
                })
            }
        )
    },

    compileCsRankingData: function (startDate, endDate) {
        console.log("checking compileCsRankingData startDate", startDate)
        console.log("checking compileCsRankingData endDate", endDate)
            // get the tel400 data to compile to daily summarized data
            return dbQualityInspection.compileTel400SummarizedData(startDate, endDate).then(
                () => {
                    // get live800 inspection mark to compile to daily summarized data
                    return dbQualityInspection.compileLive800SummarizedData(startDate, endDate);
                }
            ).then(
                () => {
                    // get the daily summary of manual process data
                    return dbQualityInspection.compileManualProcessSummarizedData(startDate, endDate);
                }
            )
    },



};
module.exports = dbQualityInspection;
