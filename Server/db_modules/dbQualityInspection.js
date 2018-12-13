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

var dbQualityInspection = {
    connectMysql: function(){
        var connection = mysql.createConnection({
            host     : 'live800.fpms8.me',
            user     : 'devselect',
            password : '!Q&US3lcT18',
            database : 'live800_im',
            port: '3320',
            queueLimit: 100,
            connectionLimit: 100
        });
        return connection;
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
    getTotalNumberOfAppealingRecordByCS: function(adminId){
        let query = {
            status: constQualityInspectionStatus.APPEALING,
            fpmsAcc: adminId
        }

        return dbconfig.collection_qualityInspection.find(query).count();
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
            .populate({path: 'fpmsAcc', model: dbconfig.collection_admin}).lean()
            .lean().sort({createTime: 1})
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
                    live800AccReg.push(new RegExp("^" + id, "i"));
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
            overtimeSetting.sort(function (a, b) {
                return a.conversationInterval - b.conversationInterval
            })
            conversation.forEach(item => {
                if (!firstCV && (item.roles == 2 || item.roles == 3)) {
                    firstCV = item;
                    lastCustomerCV = item;
                } else {
                    if (item.roles == 2 || item.roles == 3) {
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
        let live800AccReg = null;
        cvs.batchData.forEach(uItem=>{
            if(uItem && uItem.live800Acc && uItem.live800Acc.id && uItem.status != constQualityInspectionStatus.NOT_EVALUATED) {
                live800AccReg = new RegExp("^" + uItem.live800Acc.id, "i")
            }

            let query = { 'live800Acc': live800AccReg};
            let prom = dbconfig.collection_admin.findOne(query).then(
                item=>{
                    let adminName = item ? item._id:null;
                    return adminName
                })
                .then(udata=>{
                    return dbconfig.collection_qualityInspection.find({messageId: uItem.messageId, "live800Acc.name": new RegExp("^" + uItem.live800Acc.name, "i")}).then(qaData => {
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
              if(item){
                  let cs = item ? item._id:null;
                  return cs
              }else{
                  return Q.reject({name: "DataError", message: "Cannot find related Customer Services Employee"});
              }

        })
        .then(udata=>{
            return dbconfig.collection_qualityInspection.find({messageId: data.messageId, "live800Acc.name": new RegExp("^" + data.live800Acc.name, "i")}).then(qaData => {
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
                    console.log("LH TEST QUALITYINSPECTION UPDATE QUERY",{messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name, "i")});
                    console.log("LH TEST QUALITYINSPECTION FIND DATA",dbconfig.collection_qualityInspection.find(
                        {messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name, "i")}
                    ));
                    // dbconfig.collection_qualityInspection.findOneAndUpdate(
                    //     {messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name, "i")},
                    //     data
                    // ).then(data=>{
                    //     console.log("LH TEST return DATA,",data);
                    // })
                    dbconfig.collection_qualityInspection.findOneAndUpdate(
                        {messageId: data.messageId,"live800Acc.name": new RegExp("^" + data.live800Acc.name, "i")},
                        {$set: {conversation: data.conversation,status: data.status, processTime: data.processTime}},
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

                                                        let queryToGetQIRecord = {
                                                            createTime: {
                                                                $gte: new Date(startTime),
                                                                $lt: new Date(endTime)
                                                            },
                                                            companyId: {$in: p.live800CompanyId}
                                                        }
                                                        
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
    getAllProgressReportStatusByOperator: function (startTime,endTime){

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

        if(startTime && endTime){
            startTime = new Date(startTime);
            endTime = new Date(endTime);

            endTime.setHours(23, 59, 59, 999);
            endTime.setDate(endTime.getDate() - 1);

            let query = {
                createTime: {
                    $gte: new Date(startTime),
                    $lt: new Date(endTime)
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


};
module.exports = dbQualityInspection;
