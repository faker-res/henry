var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbUtility = require('./../modules/dbutility');
var mysql = require("mysql");
const constQualityInspectionStatus = require('./../const/constQualityInspectionStatus');
const constQualityInspectionRoleName = require('./../const/constQualityInspectionRoleName');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const ObjectId = mongoose.Types.ObjectId;

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
    countLive800: function(query){
        let queryObj = "";
        let operatorId = null;
        let dbResult = null;
        let mongoDataCount = 0;
        console.log(query);
        if (query.companyId&&query.companyId.length > 0) {
            let companyId = query.companyId.join(',');
            queryObj += " company_id IN (" + companyId + ") AND ";
        }
        if (query.operatorId && query.operatorId.length > 0) {
            if(Array.isArray(query.operatorId)){
                operatorId = dbQualityInspection.splitOperatorId(query.operatorId);
            }else{
                operatorId = query.operatorId;
            }
            if(operatorId!='all'){
                queryObj += " operator_name IN (" + operatorId + ") AND ";
            }
        }

        if (query.startTime && query.endTime) {
            let startTime = dbUtility.getLocalTimeString(query.startTime);
            let endTime = dbUtility.getLocalTimeString(query.endTime);
            queryObj += " store_time BETWEEN CAST('"+ startTime +"' as DATETIME) AND CAST('"+ endTime +"' AS DATETIME)";
        }
        if(query.status=='all'||query.status=='1'){
            let connection = dbQualityInspection.connectMysql();
            console.log(query)

            let mysqlCount = dbQualityInspection.countMySQLDB(queryObj, connection);
            if(query.status=='1'){
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
            console.log(queryQA);

            return dbconfig.collection_qualityInspection.find(queryQA).count().then(data=>{
                console.log(data);
                return data;
            })
        }
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
    searchLive800: function (query) {
        let conversationForm = [];
        let queryObj = "";

        let operatorId = null;
        let paginationQuery = '';
        console.log(query);

        if (query.companyId&&query.companyId.length > 0) {
            let companyId = query.companyId.join(',');
            queryObj += " company_id IN (" + companyId + ") AND ";
        }
        if (query.operatorId && query.operatorId.length > 0) {
            if(Array.isArray(query.operatorId)){
                operatorId = dbQualityInspection.splitOperatorId(query.operatorId);
            }else{
                operatorId = query.operatorId;
            }
            if(operatorId!='all'){
                queryObj += " operator_name IN (" + operatorId + ") AND ";
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
        if(query.status!='all' && query.status!=1 && query.status!=7) {

            //get status equal to not 1 & all
            let dbResult = dbQualityInspection.searchMongoDB(query);
            let result = dbQualityInspection.getMySQLConversation(dbResult, query);
            conversationForm = dbQualityInspection.fillContent(result);
        }else if(query.status!='all' && query.status==1){

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
            if(query.status == 7){
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
                let dom = new JSDOM(item.content);
                let content = [];
                let he = dom.window.document.getElementsByTagName("he");
                let i = dom.window.document.getElementsByTagName("i");

                partI = dbQualityInspection.reGroup(i, 1);
                partHe = dbQualityInspection.reGroup(he, 2);
                content = partI.concat(partHe);
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
                live800Chat.conversation = dbQualityInspection.calculateRate(content, platformInfo);
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
                queryQA['live800Acc.id'] = { '$in':query.operatorId}
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
            .populate({path: 'fpmsAcc', model: dbconfig.collection_admin}).lean()
            .lean()
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
                queryQA['live800Acc.id'] = { '$in':query.operatorId}
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
                        let conversation = mysqlCV[0].conversation;
                        item.conversation.forEach(cv => {
                            let overrideCV = conversation.filter(mycv => {
                                return cv.time == mycv.time;
                            });
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
        let platformProm = dbconfig.collection_platform.find().lean();
        Q.all([sqlResult, platformProm]).then(queryResult => {

            results = queryResult[0];
            platforms = queryResult[1];
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
                if (!firstCV && cItem.roles == 2) {
                    firstCV = cItem;
                    lastCustomerCV = cItem;
                    customerCVCount += 1;
                } else {
                    if (cItem.roles == 2) {
                        // keep the last customer question , to calculate the timeoutRate
                        if (lastCV.roles == 1) {
                            lastCustomerCV = cItem;
                            customerCVCount += 1;
                        }
                    } else if (cItem.roles == 1 && lastCustomerCV) {

                        if (lastCV.roles == 1) {
                            // if that's cs conversation before it, no need to rate again.
                        } else if (lastCV.roles != 1) {
                            // calculate the timeoutRate
                            csCVCount += 1;
                        }
                    } else {
                    }
                }
                lastCV = cItem;
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
            mg.forEach(item => {
                mgData.push(item.messageId);
            })
            let mgDataStr = "";
            let excludeMongoQuery = "";
            if(mgData.length > 0){
                mgDataStr = mgData.join(',');
                excludeMongoQuery = " AND msg_id NOT IN ("+mgDataStr+")";

            }
            console.log("SELECT * FROM chat_content WHERE " + queryObj + excludeMongoQuery + paginationQuery);
            connection.query("SELECT store_time,company_id,msg_id,operator_id,operator_name,content FROM chat_content WHERE " + queryObj + excludeMongoQuery + paginationQuery, function (error, results, fields) {
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

        connection.query("SELECT * FROM chat_content WHERE " + queryObj + paginationQuery, function (error, results, fields) {
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

                let dom = new JSDOM(item.content);
                let content = [];
                let he = dom.window.document.getElementsByTagName("he");
                let i = dom.window.document.getElementsByTagName("i");

                partI = dbQualityInspection.reGroup(i, 1);
                partHe = dbQualityInspection.reGroup(he, 2);
                content = partI.concat(partHe);
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
                live800Chat.conversation = dbQualityInspection.calculateRate(content, platformInfo);


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
    calculateRate: function(conversation, platform){
        let firstCV = null;
        let firstTime = null;
        let lastCV = null;
        let lastCustomerCV = null;
        if (!platform) {
            return conversation;
        }

        if (platform.overtimeSetting) {

            let overtimeSetting = platform.overtimeSetting;
            conversation.forEach(item => {
                if (!firstCV && item.roles == 2) {
                    firstCV = item;
                    lastCustomerCV = item;
                } else {
                    if (item.roles == 2) {
                        // keep the last customer question , to calculate the timeoutRate
                        if (lastCV.roles == 1) {
                            lastCustomerCV = item;
                        }
                    } else if (item.roles == 1 && lastCustomerCV) {
                        let timeStamp = item.time - lastCustomerCV.time;
                        let sec = timeStamp / 1000;
                        let rate = 0;

                        if(lastCV.roles == 1){
                            // if that's cs conversation before it, no need to rate again.
                        }else if(lastCV.roles != 1){
                            // calculate the timeoutRate
                            item.timeoutRate = dbQualityInspection.rateByCVTime(overtimeSetting, item, sec);
                        }
                    } else {
                    }
                }
                lastCV = item;
                return item;
            })
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
                if(sec >= overtimeSetting[otsLength].conversationInterval){
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
            let operatorId = dbQualityInspection.splitOperatorId(query.operatorId);

            if(Array.isArray(query.operatorId)){
                operatorId = dbQualityInspection.splitOperatorId(query.operatorId);
                    queryObj += "operator_name IN (" + operatorId + ") AND ";
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
        let mongoResult = dbQualityInspection.getMongoCVConstraint(dbRawResult).catch(error => {  return Q.reject({name: "DBError", message: error}); });
        conversationForm = dbQualityInspection.resolvePromise(mongoResult);
        let progressReport = dbQualityInspection.getProgressReportByOperator(query.companyId,query.operatorId,startTime,endTime);
        return Q.all([conversationForm,progressReport]);
    },
    searchMySQLDBConstraint:function(queryObj,connection){
        var deferred = Q.defer();
        if (connection){
            connection.query("SELECT msg_id, company_id, operator_id, operator_name, content FROM chat_content WHERE " + queryObj, function (error, results, fields) {
                if(error){
                    console.log(error);
                }
                deferred.resolve(results);
                connection.end();
            });
            return deferred.promise;

        }else{
            return Q.reject({name: "DBError", message: "Connection to mySQL dropped."});
        }
    },
    getMongoCVConstraint:function(dbResult){
        var deferred = Q.defer();
        let proms = [];
        let item;
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
                live800Chat.status = item.status || 1;
                let dom = new JSDOM(item.content);
                let content = [];
                let he = dom.window.document.getElementsByTagName("he");
                let i = dom.window.document.getElementsByTagName("i");

                partI = dbQualityInspection.reGroup(i, 1);
                partHe = dbQualityInspection.reGroup(he, 2);
                content = partI.concat(partHe);
                content.sort(function (a, b) {
                    return a.time - b.time;
                });

                live800Chat.conversation = dbQualityInspection.calculateRate(content);

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
            })
            deferred.resolve(proms);
        }, (error) => {
            return Q.reject({name: "DBError", message: error});
        });

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
                'content':dbQualityInspection.decodeHtml(dom.window.document.querySelector('body').textContent)
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
        let unreadEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).then(
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
                if(finalResult){
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
        let readEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).then(
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

        let appealEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).then(
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

        let appealEvaluationRecord = dbconfig.collection_qualityInspection.find(query).lean().skip(index).limit(size).then(
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
    rateBatchConversation: function(cvs, accName){
        var deferred = Q.defer();
        let proms = [];
        cvs.batchData.forEach(uItem=>{
            let query = { 'live800Acc': {$in: [uItem.live800Acc.id]} };
            let prom = dbconfig.collection_admin.findOne(query).then(
                item=>{
                    let adminName = item ? item._id:null;
                    return adminName
                })
                .then(udata=>{
                    return dbconfig.collection_qualityInspection.find({messageId: uItem.messageId}).then(qaData => {
                        delete uItem.statusName;
                        uItem.qualityAssessor = accName;
                        uItem.processTime = Date.now();
                        uItem.fpmsAcc = udata;
                        uItem.status = 4;

                        // calculate a sum of total rating
                        let totalInspectionRate = 0;
                        let totalTimeoutRate = 0;
                        uItem.conversation.forEach(item=>{
                            totalInspectionRate += item.inspectionRate;
                            totalTimeoutRate += item.timeoutRate;
                        });
                        uItem.totalInspectionRate = totalInspectionRate;
                        uItem.totalTimeoutRate = totalTimeoutRate

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
              let cs = item ? item._id:null;
              return cs
        })
        .then(udata=>{
            return dbconfig.collection_qualityInspection.find({messageId: data.messageId}).then(qaData => {
                delete data.statusName;
                data.qualityAssessor = adminId;
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
                            return Q.reject({name: "DBError", message: "Cannot find platform detail"});
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
                                    queryString += "AND company_id IN (" + p.live800CompanyId + ") ";
                                }
                                queryString += "GROUP BY FORMAT(CAST(store_time AS DATE),'yyyy-MM-dd') ";
                                queryArr.push({query: queryString, live800CompanyId: p.live800CompanyId});

                            })
                            return queryArr;

                        }else{
                            return Q.reject({name: "DBError", message: "Cannot find platform detail"});
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

};
module.exports = dbQualityInspection;
