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
    });
