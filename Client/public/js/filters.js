'use strict';

/* Filters */

angular.module('myApp.filters', []).
    filter('interpolate', function (version) {
        return function (text) {
            return String(text).replace(/\%VERSION\%/mg, version);
        };
    }).
    filter('capFirst', function () {
        //this function is to capitalise a letter in particular position
        // return function (input, char) {
        //    if (isNaN(input)) {
        //        var char = char - 1 || 0;
        //        var letter = input.charAt(char).toUpperCase();
        //        var out = [];
        //        for (var i = 0; i < input.length; i++) {
        //            if (i == char) {
        //                out.push(letter);
        //            } else {
        //                out.push(input[i]);
        //            }
        //        }
        //        return out.join('');
        //    } else {
        //        return input;
        //    }
        //}
        return function (input) {
            return input.charAt(0).toUpperCase() + input.slice(1, input.length);
        }
    }).
    filter('unique', function () {
        return function (items, filterOn) {
            if (filterOn === false) {
                return items;
            }

            if ((filterOn || angular.isUndefined(filterOn)) && angular.isArray(items)) {
                var hashCheck = {}, newItems = [];

                var extractValueToCompare = function (item) {
                    if (angular.isObject(item) && angular.isString(filterOn)) {
                        return item[filterOn];
                    } else {
                        return item;
                    }
                };

                angular.forEach(items, function (item) {
                    var valueToCheck, isDuplicate = false;

                    for (var i = 0; i < newItems.length; i++) {
                        if (angular.equals(extractValueToCompare(newItems[i]), extractValueToCompare(item))) {
                                isDuplicate = true;
                                break;
                        }
                    }

                    if (!isDuplicate) {
                        newItems.push(item);
                    }

                });

                items = newItems;
            }
            return items;
        };
    }).

    //no decimal places if whole number
    filter('noRoundTwoDecimalPlaces', function (){
        return function (value) {
            // let splitString =  value.toString().split(".");
            // let tempNum = splitString[0];
            // if (splitString[1]) {
            //     tempNum += "." + splitString[1].substr(0,2);
            // }
            // tempNum = tempNum.replace(/,/g,"");
            // return parseFloat(tempNum);
            // return Number.isFinite(parseFloat(value)) ? Math.floor(parseFloat(value) * 100 ) / 100 : value;
            if (value == undefined || value == null) {
                return value;
            }
            return cutToTwoDecimal(value);
        }
    }).

    filter('noRoundTwoDecimalToFix', function (){
        return function (value) {
            if (value == undefined || value == null) {
                return value;
            }
            return cutToTwoDecimal(value).toFixed(2);
        }
    }).

    filter('roundToTwoDecimalPlacesString', function (){
        return function (value) {
            if (Number.isInteger(value)){
               return value.toLocaleString() + '.00';
            }
            else{
                let splitString =  value.toLocaleString().split(".");
                if (splitString[1] && splitString[1].length == 1) {
                   return value.toLocaleString() + '0';
                }
                else{
                    return (Number.isFinite(parseFloat(value)) ? Math.floor(parseFloat(value) * 100 ) / 100 : value).toLocaleString();

                }
            }
        }
    }).

    filter('noDecimalPlacesString', function (){
        return function (value) {
            if (Number.isInteger(value)){
                return value.toLocaleString();
            }
            else{
                let splitString =  value.toLocaleString().split(".");
                return splitString[0];
            }
        }
    })




function cutToTwoDecimal (value) {
    let splitString =  value.toString().split(".");
    let tempNum = splitString[0];
    if (splitString[1]) {
        tempNum += "." + splitString[1].substr(0,2);
    }
    tempNum = tempNum.replace(/,/g,"");
    return parseFloat(tempNum);
}