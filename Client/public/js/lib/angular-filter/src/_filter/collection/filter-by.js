/**
 * @ngdoc filter
 * @name filterBy
 * @kind function
 *
 * @description
 * filter by specific properties, avoid the rest
 */
angular.module('a8m.filter-by', [])
  .filter('filterBy', ['$parse', function( $parse ) {
    return function(collection, properties, search, strict) {
      var comparator;

      search = (isString(search) || isNumber(search)) ?
        String(search).toLowerCase() : undefined;

      collection = isObject(collection) ? toArray(collection) : collection;

      if(!isArray(collection) || isUndefined(search)) {
        return collection;
      }

      return collection.filter(function(elm) {
        return properties.some(function(prop) {

          /**
           * check if there is concatenate properties
           * example:
           * object: { first: 'foo', last:'bar' }
           * filterBy: ['first + last'] => search by full name(i.e 'foo bar')
           */
          if(!~prop.indexOf('+')) {
            comparator = $parse(prop)(elm)
          } else {
            var propList = prop.replace(/\s+/g, '').split('+');
            comparator = propList
              .map(function(prop) { return $parse(prop)(elm); })
              .join(' ');
          }

          if (!isString(comparator) && !isNumber(comparator)) {
            return false;
          }

          comparator = String(comparator).toLowerCase();

          return strict ? comparator === search : comparator.contains(search);
        });
      });
    }
  }]);
