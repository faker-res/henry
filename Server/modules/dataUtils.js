module.exports = {

    byKey: (array, keyName) => {
        var obj = {};
        array.forEach(
            item => obj[item[keyName]] = item
        );
        return obj;
    },

    pluck: (array, field) => array.map(item => item[field]),

    sum: (array) => array.reduce((a, b) => a + (b === undefined ? 0 : b), 0),

    getTimeIntervalArr: function (startTime, endTime, interval) {
        var retArr = [];
        var getNextTime = function (time) {
            if (isNaN(interval)) {
                var retDate, newDate = new Date(time);
                if (interval == 'Daily') {
                    retDate = newDate.setDate(newDate.getDate() + 1);
                } else if (interval == 'Weekly') {
                    var date = newDate.getDate() - newDate.getDay() + 7
                    retDate = newDate.setDate(date);
                } else if (interval == 'Monthly') {
                    newDate.setMonth(newDate.getMonth() + 1);
                    retDate = newDate.setDate(1);
                }
                return new Date(new Date(retDate).setHours(0, 0, 0, 0));
            } else {
                return new Date(new Date(time).getTime() + interval);
            }
        }
        var curTime = new Date(startTime);
        var nextTime = getNextTime(curTime);
        while (nextTime.getTime() < new Date(endTime).getTime()) {
            retArr.push([curTime, nextTime]);
            curTime = nextTime;
            var nextTime = getNextTime(curTime);
        }
        retArr.push([curTime, endTime]);
        return retArr;
    },

};