var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbUtility = require('./../modules/dbutility');
var mysql = require("mysql");
const constQualityInspectionStatus = require('./../const/constQualityInspectionStatus');
const constQualityInspectionRoleName = require('./../const/constQualityInspectionRoleName');
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

        let operatorId = null;

        console.log(query);
        if (query.companyId&&query.companyId.length > 0) {
            let companyId = query.companyId.join(',');
            queryObj += " company_id IN (" + companyId + ") AND ";
        }
        if (query.operatorId && query.operatorId.length > 0) {
            if(Array.isArray(query.operatorId)){
                operatorId = query.operatorId.join(',');
            }else{
                operatorId = query.operatorId;
            }
            console.log(operatorId)
            if(operatorId!='all'){
                queryObj += " operator_id IN (" + operatorId + ") AND ";
            }
        }
        if (query.startTime && query.endTime) {
            let startTime = dbUtility.getLocalTimeString(query.startTime);
            let endTime = dbUtility.getLocalTimeString(query.endTime);
            // queryObj += " store_time BETWEEN CAST('2018-01-16 00:00:00' as DATETIME) AND CAST('2018-01-16 00:05:00' AS DATETIME)";
            queryObj += " store_time BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
        }
        console.log(queryObj);
        if(query.status!='all'&&query.status!=1) {
            //get status equal to not 1 & all
            let dbResult = dbQualityInspection.searchMongoDB(query);
            let result = dbQualityInspection.getMySQLConversation(dbResult, query);
            conversationForm = dbQualityInspection.fillContent(result);
        }else if(query.status!='all' && query.status==1){

            //get status equal to "1"
            delete query.status;
            let mongoResult = dbQualityInspection.searchMongoDB(query);
            let connection = dbQualityInspection.connectMysql();
            connection.connect();
            let dbResult = dbQualityInspection.searchPendingMySQL(mongoResult, queryObj,connection);
            conversationForm = dbQualityInspection.constructCV(dbResult);
            console.log(conversationForm);
        }else{
            //get status equal to "all"
            let connection = dbQualityInspection.connectMysql();
            connection.connect();
            let dbResult = dbQualityInspection.searchMySQLDB(queryObj,connection);
            let mongoResult = dbQualityInspection.getMongoCV(dbResult);
            conversationForm = dbQualityInspection.resolvePromise(mongoResult);
        }
        return conversationForm;
    },
    constructCV: function(dataResult){
        let deferred = Q.defer();
        let liveChats = [];

        Q.all(dataResult).then(results=>{

            results.forEach(item => {
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
                live800Chat.live800Acc['id'] = item.operator_id;
                live800Chat.live800Acc['name'] = item.operator_name;
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

                liveChats.push(live800Chat);
            });
            deferred.resolve(liveChats);
        });

        return deferred.promise;
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
            if(query.fpmsAcc!='all') {
                queryQA.fpmsAcc = {'$in': query.fpmsAcc};
            }
        }
        if (query.operatorId && query.operatorId.length > 0) {
            if(query.operatorId!='all'){
                queryQA.live800Acc = { id:{ '$in':query.operatorId}}
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
                    live800Chat.createTime = item.createTime;
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
            if(results.length == 0){
                deferred.resolve([]);
            }else{
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
                                let roles = overrideCV[0].roles;
                                cv.roleName = roles ? constQualityInspectionRoleName[roles]:'';
                                cv.content = overrideCV[0].content;
                            }
                        })
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

        Q.all(sqlResult).then(results => {
            let msgIds = []
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

                let query = timeQuery + " AND msg_id IN (" + condition + ")"
                console.log(query);
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
    searchPendingMySQL:function(mongoData, queryObj,connection){
        var deferred = Q.defer();

        Q.all(mongoData).then(mg=> {
            let mgData = []
            mg.forEach(item => {
                mgData.push(item.messageId);
            })
            console.log(mgData);
            let mgDataStr = "";
            let excludeMongoQuery = "";
            if(mgData.length > 0){
                mgDataStr = mgData.join(',');
                excludeMongoQuery = " AND msg_id NOT IN ("+mgDataStr+")";

            }
            console.log(queryObj + excludeMongoQuery);
            connection.query("SELECT * FROM chat_content WHERE " + queryObj + excludeMongoQuery, function (error, results, fields) {
                console.log('yeah');
                if (error) {
                    console.log(error)
                    // throw error;
                }
                // console.log(results);
                deferred.resolve(results);
                connection.end();
            });
        })

        // connection.query("SELECT * FROM chat_content WHERE " + queryObj, function (error, results, fields) {
        //     console.log('yeah');
        //     if (error) throw error;
        //     deferred.resolve(results);
        //     connection.end();
        // });
        return deferred.promise;
    },
    searchMySQLDB:function(queryObj,connection){
        var deferred = Q.defer();
        connection.query("SELECT * FROM chat_content WHERE " + queryObj, function (error, results, fields) {
            // console.log('result',results);
            // if (error) throw error;
            if(error){
                console.log(error);
            }
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
        if(results.length == 0){
            deferred.resolve([]);
        }
        results.forEach(item => {
            //console.log(item);
            let live800Chat = {conversation: [], live800Acc:{}};
            live800Chat.messageId = item.msg_id;
            live800Chat.status = item.status;
            live800Chat.qualityAssessor = item.qualityAssessor;
            live800Chat.fpmsAcc = item.operator_name;
            live800Chat.processTime = item.processTime;
            live800Chat.appealReason = item.appealReason;
            live800Chat.companyId = item.company_id;
            live800Chat.createTime = new Date(item.store_time).toISOString();

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

            live800Chat.conversation = dbQualityInspection.drawColor(content);

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
    drawColor: function(conversation){
        let firstCV = null;
        let firstTime = null;
        let lastCV = null;
        let lastCustomerCV = null;
        conversation.forEach(item=>{
            if(!firstCV && item.roles == 2){
                firstCV = item;
                lastCustomerCV = item;
            }else{
                if(item.roles==2){
                    if(lastCV != 2){
                        lastCustomerCV = item;
                    }
                }else if(item.roles==1 && (lastCV.roles!=1) && lastCustomerCV){
                    let timeStamp = item.time - lastCustomerCV.time;
                    let min = timeStamp / (60*60*24);
                    let sec = min * 60;
                    console.log(item.content);
                    console.log(item.roles);
                    console.log(lastCustomerCV.time +'-'+ item.time + '=' +timeStamp);
                    console.log(min);
                    console.log(sec);
                    console.log('-------')
                    let rate = 0;
                    if(sec <= 30){
                        rate = 1;
                    }else if(sec > 30 && sec <=60){
                        rate = 0;
                    }else if(sec > 90 && sec <=120){
                        rate = -1.5;
                    }else{
                        rate = -2;
                    }
                    item.timeoutRate = rate;
                }else{

                }
            }
            lastCV = item;
            return item;
        })
        return conversation;
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

    searchLive800Record: function (query) {
       let conversationForm = [];
        let queryObj = "";
        console.log(query);
        if (query.companyId && query.companyId.length>0) {
           if (query.companyId.length>1 ){
                queryObj += "company_id IN ('" ;
                for (let i=0; i< query.companyId.length; i++){
                    if (i == query.companyId.length-1){
                        queryObj +=  query.companyId[i] + "')" + " AND "
                    }else{
                        queryObj +=   query.companyId[i] + "','"
                    }
                }
            }else{
                queryObj += "company_id=" + query.companyId + " AND ";
            }
        }
        if (query.operatorId && query.operatorId.length > 0) {
            if (query.operatorId.length > 1 ){
                queryObj += "operator_id IN ('" ;
                for (let i=0; i< query.operatorId.length; i++){
                    if (i == query.operatorId.length-1){
                        queryObj +=  query.operatorId[i] + "')" + " AND "
                    }else{
                        queryObj +=   query.operatorId[i] + "','"
                    }
                }
            }else{
                queryObj += "operator_id=" + query.operatorId + " AND ";
            }
        }
        if (query.startTime && query.endTime) {
            var startTime = dbUtility.getLocalTimeString(query.startTime);
            var endTime = dbUtility.getLocalTimeString(query.endTime);

          //  queryObj += "store_time BETWEEN CAST('2018-01-16 00:10:00' as DATETIME) AND CAST('2018-01-16 00:30:00' AS DATETIME)";
            console.log(query.startTime);
            queryObj += "store_time BETWEEN CAST('"+startTime+"' as DATETIME) AND CAST('"+endTime+"' AS DATETIME)";
        }

        let connection = dbQualityInspection.connectMysql();
        connection.connect();

        let dbRawResult = dbQualityInspection.searchMySQLDBConstraint(queryObj,connection);
        let mongoResult = dbQualityInspection.getMongoCVConstraint(dbRawResult);
        conversationForm = dbQualityInspection.resolvePromise(mongoResult);
        let progressReport = dbQualityInspection.getProgressReportByOperator(query.companyId,query.operatorId,startTime,endTime);


        return Q.all([conversationForm,progressReport]);
    },
    searchMySQLDBConstraint:function(queryObj,connection){
        var deferred = Q.defer();
        connection.query("SELECT msg_id, company_id, operator_id, operator_name, content FROM chat_content WHERE " + queryObj, function (error, results, fields) {

            if(error){
                console.log(error);
            }
            deferred.resolve(results);
            connection.end();
        });
        return deferred.promise;
    },
    getMongoCVConstraint:function(dbResult){
        var deferred = Q.defer();
        let proms = [];
        Q.all(dbResult).then(results=>{
            console.log(results);
            if(results.length == 0){
                deferred.resolve([]);
            }
            results.forEach(item => {
                console.log(item);
                let live800Chat = {conversation: [], live800Acc:{}};
                live800Chat.fpmsAcc = item.operator_name ;
                live800Chat.companyId = item.company_id || "";
                live800Chat.live800Acc['id'] = item.operator_id;
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

                live800Chat.conversation = dbQualityInspection.drawColor(content);

                let queryQA = {messageId: String(item.msg_id)};
                let prom = dbconfig.collection_qualityInspection.find(queryQA)
                    .then(qaData => {
                        if (qaData.length > 0) {
                            //live800Chat.status = qaData[0].status;
                            live800Chat.conversation = dbQualityInspection.reformatCV(live800Chat.conversation, qaData[0].conversation);
                            //live800Chat.processTime = qaData[0].processTime;
                        }
                        return live800Chat;
                    });
                proms.push(prom);
            });
            deferred.resolve(proms);
        })
        return deferred.promise;

    },
    getProgressReportByAdmin: function (companyId,operatorId,startTime,endTime){

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    companyId: {$in: companyId},
                    "live800Acc.id": {$in: operatorId}
                },
            },
            {
                "$group": {
                    "_id": {
                        "fpmsAcc": "$fpmsAcc",
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
                            fpmsAcc: d._id.fpmsAcc,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });
                return resultArr;
            }
        })
    },
    getProgressReportByOperator: function (companyId,operatorId,startTime,endTime){

       //var startTime = dbUtility.getLocalTimeString(startTime);
       //var endTime = dbUtility.getLocalTimeString(endTime);

        return dbconfig.collection_qualityInspection.aggregate([
            {
                $match: {
                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    companyId: {$in: companyId},
                    "live800Acc.id": {$in: operatorId}
                },
            },
            {
                "$group": {
                    "_id": {
                        "operatorId": "$live800Acc.id",
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
                            operatorId: d._id.operatorId,
                            status: d._id.status,
                            count: d.count
                        });
                    }
                });
                return resultArr;
            }
        })
    },
    reGroup: function(arrs,type){
        let conversation= [] ;
        for (var t = 0; t < arrs.length; t++) {
            let timeStamp = arrs[t].getAttribute("tm");
            let innerHTML =arrs[t].innerHTML;
            //let innerHTML = dbQualityInspection.unescapeHtml(arrs[t].textContent);
            // let info = new JSDOM(`document.createElement('`+timeStamp+`')`);
            let info = dbQualityInspection.decodeHtml(arrs[t].innerHTML);
            //info.window.document.getElementById(timeStamp) = arrs[t].innerHTML;
            //info.innerHTML = arrs[t].textContent
            let conversationInfo = {
                'time':timeStamp ? timeStamp:'' ,
                'roles':type,
                'roleName':constQualityInspectionRoleName[type],
                'createTime':timeStamp ?timeStamp:'' ,
                'timeoutRate':0,
                'inspectionRate':0,
                'review':'',
                'content':info? info:''
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
    getUnreadEvaluationRecord: function (startTime, endTime) {
        let query = {
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            status: constQualityInspectionStatus.COMPLETED_UNREAD
        }
        return dbconfig.collection_qualityInspection.find(query).lean().then(
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
        );
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

    getWorkloadReport: function(startTime, endTime, qaAccount){

        let query ={
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
            //status: constQualityInspectionStatus.COMPLETED_READ
        }

        if(qaAccount && qaAccount != "all"){
            query.qaAccount = qaAccount;
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
                   console.log("11111111111111111111111111111",r)
                   proms.push(dbQualityInspection.getAdminNameById(r));
               })

               return Promise.all(proms);
           }
        }).then(
            returnedData => {
                if(returnedData && returnedData.length > 0){
                    console.log("AAAAAAAAAAAAAAAAAAAAAAa",returnedData);
                    return returnedData;
                }
            }
        );
    },

    getAdminNameById: function(workloadResultArr){
        //let returnedAdminData = {};
        console.log("BBBBBBBBBBBBBBBBBBBBBBBBBB",workloadResultArr);
        return dbconfig.collection_admin.findOne({_id: workloadResultArr.qaAccount}).lean().then(
            adminData => {
                console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCCC",adminData);
                if(adminData){
                    workloadResultArr.qaAccount = adminData.adminName;
                }

                return workloadResultArr;
            }
        );
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
    rateBatchConversation: function(cvs, accName){
        var deferred = Q.defer();
        let proms = [];
        console.log(cvs)
        cvs.batchData.forEach(uItem=>{
            console.log(uItem.live800Acc);
            let query = { 'live800Acc': {$in: [uItem.live800Acc.id]} };
            let prom = dbconfig.collection_admin.findOne(query).then(
                item=>{
                    console.log(item);
                    let adminName = item ? item.adminName:'x';
                    return adminName
                })
                .then(udata=>{
                    return dbconfig.collection_qualityInspection.find({messageId: uItem.messageId}).then(qaData => {
                        delete uItem.statusName;
                        uItem.qualityAssessor = accName;
                        uItem.processTime = Date.now();
                        uItem.fpmsAcc = udata;
                        uItem.status = 7;
                        if (qaData.length == 0) {
                            return dbconfig.collection_qualityInspection(uItem).save();
                        }else{
                            dbconfig.collection_qualityInspection.findOneAndUpdate(
                                {messageId: uItem.messageId},
                                uItem
                            ).then(data=>{
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
    rateCSConversation: function (data , adminName) {
        var deferred = Q.defer();
        console.log(data);
        let live800Acc = data.live800Acc.id  ? data.live800Acc.id :'xxx';
        let query = { 'live800Acc': {$in: [live800Acc]} };
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
        return dbconfig.collection_qualityInspection.aggregate(
            {
                "$group": {
                    "_id": {"month": {"$month": "$createTime"}, "year": {"$year": "$createTime"}},
                }
            },
            { $sort : { "_id.year" : -1, "_id.month" : -1}, }
        ).exec();

    },
    // getEvaluationProgressRecord: function (platformObjId, startDate, endDate) {
    //     // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",startDate)
    //     // console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",endDate)
    //     if(startDate && endDate){
    //         let startTime = dbUtility.getLocalTimeString(startDate);
    //         let endTime = dbUtility.getLocalTimeString(endDate);
    //
    //         let queryString = "SELECT COUNT(*) AS totalRecord, CAST(store_time AS DATE) AS storeTime ,company_id  FROM chat_content WHERE store_time BETWEEN CAST('"+ startTime + "' as DATETIME) AND CAST('"+ endTime + "' AS DATETIME) ";
    //
    //         if(platformObjId && platformObjId != "all"){
    //             return dbconfig.collection_platform.findOne({_id: platformObjId}).then(
    //                 platformDetail => {
    //                     if(platformDetail && platformDetail.companyId){
    //                         queryString += "AND company_id=" + platformDetail.companyId + " "
    //                     }
    //
    //                     queryString += "GROUP BY FORMAT(CAST(store_time AS DATE),'yyyy-MM-dd'),company_id "
    //
    //                     return queryString;
    //                 }
    //             ).then(
    //                 query => {
    //                     if(query){
    //                         let connection = dbQualityInspection.connectMysql();
    //                         connection.connect();
    //                         return dbQualityInspection.getLive800RecordByMySQL(query, connection)
    //                     }
    //                 }
    //             );
    //         }
    //         else {
    //             queryString += "GROUP BY FORMAT(CAST(store_time AS DATE),'yyyy-MM-dd'),company_id "
    //             let connection = dbQualityInspection.connectMysql();
    //             connection.connect();
    //             return dbQualityInspection.getLive800RecordByMySQL(queryString, connection)
    //         }
    //     }
    // },

    getEvaluationProgressRecord: function (platformObjId, startDate, endDate) {
        if(startDate && endDate){
            let startTime = dbUtility.getLocalTimeString(startDate);
            let endTime = dbUtility.getLocalTimeString(endDate);

            if(platformObjId && platformObjId.length > 0){
                let queryArr = [];
                let proms = [];
                return dbconfig.collection_platform.find({_id: {$in: platformObjId}}).lean().then(
                    platformDetail => {
                        if(platformDetail && platformDetail.length > 0){

                            platformDetail.map(p => {
                                let queryString = "SELECT COUNT(*) AS totalRecord, CAST(store_time AS DATE) AS storeTime  FROM chat_content WHERE store_time BETWEEN CAST('"+ startTime + "' as DATETIME) AND CAST('"+ endTime + "' AS DATETIME) ";
                                if(p.live800CompanyId){
                                    queryString += "AND company_id IN (" + p.live800CompanyId + ") ";
                                }
                                queryString += "GROUP BY FORMAT(CAST(store_time AS DATE),'yyyy-MM-dd') ";
                                queryArr.push({query: queryString, live800CompanyId: p.live800CompanyId});

                            })
                            return queryArr;

                        }else{

                        }
                    }
                ).then(
                    query => {
                        if(query && query.length > 0){

                                query.map(q => {
                                    if(q.query.length > 0 && q.live800CompanyId){
                                        let connection = dbQualityInspection.connectMysql();
                                        connection.connect();
                                        proms.push(dbQualityInspection.getLive800RecordByMySQL(q.query, q.live800CompanyId, connection));
                                    }
                                })

                                return Promise.all(proms);
                        }
                    }
                );
            }
            else {
                let queryArr = [];
                let proms = [];
                return dbconfig.collection_platform.find({live800CompanyId: {$exists: true}}).lean().then(
                    platformDetail => {
                        if(platformDetail && platformDetail.length > 0){

                            platformDetail.map(p => {
                                let queryString = "SELECT COUNT(*) AS totalRecord, CAST(store_time AS DATE) AS storeTime  FROM chat_content WHERE store_time BETWEEN CAST('"+ startTime + "' as DATETIME) AND CAST('"+ endTime + "' AS DATETIME) ";
                                if(p.live800CompanyId){
                                    //queryString += "AND company_id IN ('" + p.live800CompanyId + "') ";
                                    queryString += "AND company_id IN (" + p.live800CompanyId + ") ";
                                }
                                queryString += "GROUP BY FORMAT(CAST(store_time AS DATE),'yyyy-MM-dd') ";
                                queryArr.push({query: queryString, live800CompanyId: p.live800CompanyId});

                            })
                            return queryArr;

                        }else{

                        }
                    }
                ).then(
                    query => {
                        if(query && query.length > 0){

                            query.map(q => {
                                if(q.query.length > 0 && q.live800CompanyId){
                                    let connection = dbQualityInspection.connectMysql();
                                    connection.connect();
                                    proms.push(dbQualityInspection.getLive800RecordByMySQL(q.query, q.live800CompanyId, connection));
                                }
                            })

                            return Promise.all(proms);
                        }
                    }
                );
            }
        }
    },

    getLive800RecordByMySQL:function(queryString,live800CompanyId, connection){
        var deferred = Q.defer();
        let proms = [];

        if(connection){
            connection.query(queryString, function (error, results, fields) {
                //console.log("live 800 result",results)
                if (error) throw error;

                results.forEach(result => {
                    let startTime = new Date(result.storeTime);
                    let endTime = new Date();
                    endTime = dbUtility.getISODayEndTime(startTime);

                    proms.push(dbQualityInspection.calEvaluationProgress(startTime, endTime, live800CompanyId, result.totalRecord));
                });
                return Q.all(proms).then(data => {
                    deferred.resolve(data);
                    connection.end();
                })
            });
            return deferred.promise;
        }else{

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
                    //companyId: companyId,
                    totalRecord: totalRecordFromLive800,
                    isCompleted: isCompleted,
                    totalRecordFromFPMS:qualityInspectionCount ? qualityInspectionCount : 0,
                    date: startTime
                };
                return result;
            }
        )

    },
    searchMySQLDB1:function(queryObj,connection){
        var deferred = Q.defer();
        let proms = [];
        //connection.query("SELECT * FROM chat_content WHERE " + queryObj, function (error, results, fields) {
        connection.query(queryObj, function (error, results, fields) {
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

                live800Chat.operatorId = item.operator_id;
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




};
module.exports = dbQualityInspection;
