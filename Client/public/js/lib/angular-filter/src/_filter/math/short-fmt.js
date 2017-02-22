/**
 * @ngdoc filter
 * @name formatBytes
 * @kind function
 *
 * @description
 * Convert number into abbreviations.
 * i.e: K for one thousand, M for Million, B for billion
 * e.g: number of users:235,221, decimal:1 => 235.2 K
 */
angular.module('a8m.math.shortFmt', [])
  .filter('shortFmt', function () {
    return function (number, decimal) {
      if(isNumber(decimal) && isFinite(decimal) && decimal%1===0 && decimal >= 0 &&
        isNumber(number) && isFinite(number)){
        if(number < 1e3) {
          return '' + number;  // Coerce to string
        } else if(number < 1e6) {
          return convertToDecimal((number / 1e3), decimal) + ' K';
        } else if(number < 1e9){
          return convertToDecimal((number / 1e6), decimal) + ' M';
        } else {
          return convertToDecimal((number / 1e9), decimal) + ' B';
        }

      }
      return 'NaN';
    }
  });