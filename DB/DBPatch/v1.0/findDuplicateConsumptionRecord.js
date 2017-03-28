/******************************************************************
 *        fpms-vin
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var db = db.getSiblingDB("logsdb");

var docs = db.playerConsumptionRecord.aggregate(
    [
        {
            $match: {
                createTime: {
                    $gte: new Date("2017-03-22T00:00:00.000+08:00"),
                    $lt: new Date("2017-03-23T00:00:00.000+08:00")
                }
            }
        },
        { $group: {
            _id: { orderNo: "$orderNo" },   // replace `name` here twice
            uniqueIds: { $addToSet: "$_id" },
            count: { $sum: 1 }
        } },
        { $match: {
            count: { $gte: 2 }
        } },
        { $sort : { count : -1} },
        { $limit : 10 }
    ]
);
