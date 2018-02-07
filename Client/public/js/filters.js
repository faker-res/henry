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
    filter('noRoundTwoDecimalPlaces', function (){
        return function (value) {
            return Number.isFinite(parseFloat(value)) ? Math.floor(parseFloat(value) * 100 ) / 100 : value;
        }
    });
