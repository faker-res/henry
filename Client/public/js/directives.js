'use strict';

/* Directives */

angular.module('myApp.directives', [])

  .directive('appVersion', function (version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  })

  .directive('match', [function () {
    return {
      require: 'ngModel',
      link: function (scope, elem, attrs, ctrl) {

        scope.$watch('[' + attrs.ngModel + ', ' + attrs.match + ']', function(value){
          ctrl.$setValidity('match', value[0] === value[1] );
        }, true);

      }
    }
  }])

  .directive('uniqueUsername', ['$http', function($http) {
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
        scope.busy = false;
        scope.$watch(attrs.ngModel, function(value) {

          // hide old error messages
          ctrl.$setValidity('isTaken', true);
          ctrl.$setValidity('invalidChars', true);

          if (!value) {
            // don't send undefined to the server during dirty check
            // empty username is caught by required directive
            return;
          }

          //// show spinner
          //scope.busy = true;

          //
          //// send request to server
          //$http.post('/signup/check/username', {username: value})
          //    .success(function(data) {
          //      // everything is fine -> do nothing
          //      scope.busy = false;
          //    })
          //    .error(function(data) {
          //
          //      // display new error message
          //      if (data.isTaken) {
          //        ctrl.$setValidity('isTaken', false);
          //      } else if (data.invalidChars) {
          //        ctrl.$setValidity('invalidChars', false);
          //      }
          //
          //      scope.busy = false;
          //    });
        })
      }
    }
  }])

  .directive("percentage", ['$filter', function($filter){
    return {
      require: 'ngModel',
      link: function(scope, ele, attr, ctrl){
        ctrl.$parsers.unshift(function(viewValue){
          //console.log("percent directive viewValue=%s", viewValue);
          return $filter('number')(parseFloat(viewValue)/100);
        });
        ctrl.$formatters.unshift(function(modelValue){
          //console.log("percent directive modelValue=%s", modelValue);
          var scaledVal = parseFloat(modelValue) * 100;
          if (ele[0].tagName === 'INPUT') {
            // If the value is for an <input>, we should return it raw.
            return scaledVal;
          } else {
            // But for plain visual display, we may want to prettify with ','s
            return $filter('number')(scaledVal);
          }
        });
      }
    };
  }])

    .directive("consumptionreturnpercentage", ['$filter', function($filter){
        //console.log("consumptionReturnPercentage");
        return {
            require: 'ngModel',
            link: function(scope, ele, attr, ctrl){
                //console.log("consumptionReturnPercentage2");
                ctrl.$parsers.unshift(function(viewValue){
                   // console.log("percent directive viewValue=%s", viewValue);
                    let returnedValue= parseFloat(parseFloat(viewValue)/100).toFixed(5);
                    return Number(returnedValue);
                });
                ctrl.$formatters.unshift(function(modelValue){
                   // console.log("percent directive modelValue=%s", modelValue);
                    var scaledVal = parseFloat((parseFloat(modelValue) * 100).toFixed(3));
                    if (ele[0].tagName === 'INPUT') {
                        // If the value is for an <input>, we should return it raw.
                        return scaledVal;
                    } else {
                        // But for plain visual display, we may want to prettify with ','s
                        return Number(scaledVal);
                    }
                });
            }
        };
    }])

  /**
   * An easy way to make list items or table rows or cells selectable.
   *
   * Example using ng-repeat:
   *
   *     tr(ng-repeat="(i, book) in vm.allBooks", sn-selectable-model="vm.currentlySelectedBook", sn-selectable-value="book")
   *
   * or:
   *
   *     tr(ng-repeat="(i, book) in vm.allBooks", sn-selectable-model="vm.currentlySelectedBooks", sn-selectable-value="book", sn-selectable-multi)
   *
   * Plain example:
   *
   *     <table>
   *         <tr sn-selectable-model='selectedAnimals' sn-selectable-value="giraffe" sn-selectable-multi>
   *             <td>{{giraffe.name}}</td>
   *         </tr>
   *         <tr sn-selectable-model='selectedAnimals' sn-selectable-value="octopus" sn-selectable-multi>
   *             <td>{{octopus.name}}</td>
   *         </tr>
   *     </table>
   *
   * Attributes:
   *
   *     sn-selectable-model - The model which will be updated when an element is clicked
   *     sn-selectable-value - The data that will be placed into the model or removed from the model when the element is clicked
   *     sn-selectable-multi - Allows multiple items to be selected, the model will be an array of items (not an item)
   *
   * The sn-selectable-value is evaluated when the element is linked (e.g. during the ng-repeat), and not when the element is clicked/selected.
   *
   * The sn-selectable-model elements must be siblings (i.e. not children of siblings), in order for the classes to be updated properly.
   * In other words, sn-selectable-model should appear on the _same_ element as the ng-repeat, not _below_ it.
   *
   * The class used to highlight selected items is 'sn-selected'.  @consider This could be configurable.
   */
  .directive('snSelectableModel', function ($parse) {
    return {
      restrict: 'AE',

      link: function (scope, elem, attrs) {
        var model = $parse(attrs.snSelectableModel);
        var valueExpr = attrs.snSelectableValue;
        var isMulti = Boolean(attrs.snSelectableMulti);
        var value = scope.$eval(valueExpr);

        elem.bind('click', function () {
          if (isMulti) {
            scope.$apply(function () {
              var selectionList = model(scope);
              if (!(selectionList instanceof Array)) {
                selectionList = [];
              }
              var wasSelected = selectionList.includes(value);
              var isSelected = !wasSelected;
              if (wasSelected) {
                selectionList.splice(selectionList.indexOf(value), 1);
              }
              if (isSelected) {
                selectionList.push(value);
              }
              model.assign(scope, selectionList);

              // Update view
              //elem.toggleClass('sn-selected', isSelected);
            });
          } else {
            scope.$apply(function () {
              var wasSelected = model(scope) === value;
              var isSelected = !wasSelected;
              var newModelValue = isSelected ? value : null;
              model.assign(scope, newModelValue);

              // Update view
              //elem.siblings('[sn-selectable-model]').removeClass('selected');
              //elem.toggleClass('sn-selected', isSelected);
            });
          }
        });

        // Update view automatically from model
        scope.$watch(model, function (modelValue) {
          var isSelected = isMulti
            ? modelValue && modelValue.includes(value)
            : modelValue === value;
          elem.toggleClass('sn-selected', Boolean(isSelected));
        }, isMulti);
      }
    };
  })

    .directive('snTooltip', function ($parse) {
        return {
            restrict: 'AE',
            link: function (scope, elem, attrs) {
                //var model = $parse(attrs.snSelectableModel);
                //elem.addClass('sn-hoverable');
                elem.hover(function () {
                    $(elem).tooltip('show');
                });
            }
        };
    })

  .directive('ezModal', function () {
    return {
      restrict: 'E',
      transclude: {
        extractedHeader: '?ezModalHeader',
        extractedBody: 'ezModalBody',
        extractedFooter: 'ezModalFooter'
      },
      scope: {
        modalId: '@',
        modalTitle: '@'
      },
      template: $('#ezModalTemplate').html()
    };
  })

  .directive('ezConfirmButton', function () {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      //template: '<button class="common-button margin-right-5 btn btn-primary" data-dismiss="modal" ng-transclude></button>'
      template: $('#ezConfirmButtonTemplate').html()
    };
  })

  .directive('ezCancelButton', function () {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      //template: '<button class="common-button margin-right-5 btn btn-danger" data-dismiss="modal" ng-transclude></button>'
      template: $('#ezCancelButtonTemplate').html()
    };
  })

  .directive('bsp', function($timeout){
      return  {
          restrict : 'A',
          link: function(scope, element, attrs){
              if (attrs.ngOptions && / in /.test(attrs.ngOptions)) {
                  scope.$watch(attrs.ngOptions.split(' in ')[1], function() {
                      scope.$applyAsync(function () {
                          $(element).selectpicker('refresh');
                      });
                  }, true);
              }
          }
      };
  })

    .directive('staticBsp', function ($timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                $timeout(() => {
                    $(element).selectpicker('refresh')
                }, 50)

                if (attrs.ngModel) {
                    scope.$watch(attrs.ngModel, function () {
                        $(element).selectpicker('refresh');
                    }, true)
                }
            }
        }
    })

  .directive('rddl', function($timeout){
      return  {
          restrict : 'A',
          link: function(scope, element, attrs){
              if (attrs.ngModel){
                  scope.$watch(attrs.ngModel,function(){
                      $(element).selectpicker('destroy');
                      $(element).selectpicker();
                  },true)
              }
          }
      };
  })

    .directive('ezNormalButton', function () {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      //template: '<button class="common-button margin-right-5 btn btn-primary" data-dismiss="modal" ng-transclude></button>'
      template: $('#ezNormalButtonTemplate').html()
    };
  })

    // read content inside uploaded file
    .directive('onReadFile', function ($parse) {
        return {
            restrict: 'A',
            scope: false,
            link: function(scope, element, attrs) {
                var fn = $parse(attrs.onReadFile);
                element.on('change', function(onChangeEvent) {
                    var reader = new FileReader();
                    reader.onload = function(onLoadEvent) {
                        scope.$apply(function() {
                            fn(scope, {$fileContent:onLoadEvent.target.result});
                        });
                    };
                    reader.readAsText((onChangeEvent.srcElement || onChangeEvent.target).files[0]);
                });
            }
        };
    })
    .directive('conversationform', function(){
        return {
            retrict: 'EA',
            replace: true,
            controllerAs:'vm',
            translude: true,
            scope: {
                cform:'=',
                rateconversation:"&",
                confirmrate:"&"
            },
            template: $('#conversationForm').html(),
            link:function(scope, element, attr){
                scope.rateIt = function(id){
                    scope.rateMsgId = id;
                }

            }
        };
    })
    .directive('qaform', function(){
        return {
            retrict: 'EA',
            replace: true,
            controllerAs:'vm',
            transclude: true,
            scope: {
                qform:'='
            },
            template: $('#QAForm').html(),
            link:function(scope, element, attr){
                console.log(attr);
           }
        };
    })
    // sheetjs.com js-xlsx - spreadsheet parser and writer
    .directive('fileread', [function () {
        return {
            scope: {
                opts: '='
            },
            link: function ($scope, $elm, $attrs) {
                $elm.on('change', function (changeEvent) {
                    let reader = new FileReader();
                    reader.onload = function (evt) {
                        $scope.$apply(function () {
                            var data = evt.target.result;
                            var workbook = XLSX.read(data, {type: 'binary'});
                            var headerNames = XLSX.utils.sheet_to_json( workbook.Sheets[workbook.SheetNames[0]], { header: 1 })[0];
                            var data = XLSX.utils.sheet_to_json( workbook.Sheets[workbook.SheetNames[0]]);
                            $scope.opts.columnDefs = [];
                            headerNames.forEach(function (h) {
                                $scope.opts.columnDefs.push({ field: h });
                            });
                            $scope.opts.data = data;
                            $elm.val(null);
                        });
                    };
                    reader.readAsBinaryString(changeEvent.target.files[0]);
                });
            }
        }
    }])
;
