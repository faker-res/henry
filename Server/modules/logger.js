var winston = require('winston');
var MongoDB = require('winston-mongodb').MongoDB;
var env = require('./../config/env').config();

// Logging levels
var config = {
    levels: {
        error: 0,
        debug: 1,
        warn: 2,
        data: 3,
        info: 4,
        verbose: 5,
        silly: 6
    },
    colors: {
        error: 'red',
        debug: 'blue',
        warn: 'yellow',
        data: 'grey',
        info: 'green',
        verbose: 'cyan',
        silly: 'magenta'
    }
};

var emptyLogger = new (winston.Logger)({});

//logger for display log at console
var consoleLogger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            prettyPrint: true,
            silent: false,
            timestamp: false
        })
    ],
    levels: config.levels,
    colors: config.colors
});

//logger for store log into database
// var dbLogger = new (winston.Logger)({
//     transports: [
//         new (winston.transports.MongoDB)({
//             db: 'mongodb://' + env.db.logsDBUrl,
//             collection: 'adminUserActionLogs'
//         })
//     ]
// });

var loggers = {
    //console logger
    conLog: env.mode !== 'production' ? consoleLogger : emptyLogger,
    //database logger
    //dbLog: dbLogger
};

module.exports = loggers;


