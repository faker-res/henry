/*
 * Util service for common functions
 */

'use strict';

define([], function () {

    let utilService = function () {
        let allPopoverElems = [];

        let util = this;
        this.$get = function () {
            return this;
        };

        let $trans = null;

        /////// some common functions //////
        this.initTranslate = function (func) {
            $trans = func ? func : null;
        }

        this.encodePhoneNum = function (str) {
            str = str || '';
            return str.substring(0, 3) + "****" + str.slice(-4);
        }

        this.encodeQQ = function (str) {
            str = str || '';
            var newStr = str.replace(str, "****");
            return newStr + "@qq.com";
            // return str.substring(0, 3) + "***" + str.slice(-2);
        }

        this.setNDaysAgo = function (inputDate, n) {
            if (!(inputDate instanceof Date) || !Number.isInteger(n)) {
                return;
            }
            return new Date(inputDate.setDate(inputDate.getDate() - n));
        }

        this.setNDaysAfter = function (inputDate, n) {
            if (!(inputDate instanceof Date) || !Number.isInteger(n)) {
                return;
            }
            return new Date(inputDate.setDate(inputDate.getDate() + n));
        }

        this.isAlphaNumeric = function (str) {
            return /^\w+$/.test(str);
        }

        this.getLeftTime = function(date){
            // convert the timestamp to actual time left
            let endTime = new Date(date);
            let now = new Date();
            let sec_num = (endTime - now) / 1000;
            let days    = Math.floor(sec_num / (3600 * 24));
            let hours   = Math.floor((sec_num - (days * (3600 * 24)))/3600);
            let minutes = Math.floor((sec_num - (days * (3600 * 24)) - (hours * 3600)) / 60);
            let seconds = Math.floor(sec_num - (days * (3600 * 24)) - (hours * 3600) - (minutes * 60));

            if (hours   < 10) {hours   = "0"+hours;}
            if (minutes < 10) {minutes = "0"+minutes;}
            if (seconds < 10) {seconds = "0"+seconds;}

            let result =  {
                text:days+'天 '+ hours+':'+minutes+':'+seconds,
                days: days,
                hours: hours,
                minutes: minutes,
                seconds: seconds
            }
            return result;
        }

        this.determineRegistrationDevice = function (data){
          if (data && data.guestDeviceId){
              data.registrationInterface$ = "APP"
          }
          else{
              if (data && data.hasOwnProperty('registrationInterface')){
                  if (data.registrationInterface == 0){
                      data.registrationInterface$ = "BACKSTAGE"
                  }
                  else if (data.registrationInterface == 1 || data.registrationInterface == 2){
                      data.registrationInterface$ = "WEB"
                  }
                  else if (data.registrationInterface == 3 || data.registrationInterface == 4){
                      data.registrationInterface$ = "H5"
                  }// 包壳APP：5 & 6 considered under H5 upon Echo's request
                  else if (data.registrationInterface == 5 || data.registrationInterface == 6){
                      data.registrationInterface$ = "H5"
                  }
              }
              else{
                  // to handle old data that without registrationInterface; categorized under WEB
                  data.registrationInterface$ = "WEB"
              }
          }

          return data;
        }

        this.$createArray = function (min, max) {
            let newArrayObj = {};
            let upper = 0, lower = 0;
            if (!min) return [];
            if (!max) {
                upper = min;
            } else {
                upper = max;
                lower = min;
            }
            for (let ii = lower; ii < upper; ii++) {
                newArrayObj[ii] = ii;
            }
            return newArrayObj;
        }
        this.$getTimeFromStdTimeFormat = function (time) {
            if (!time) {
                let nowDate = new Date();
                return nowDate.toLocaleString();
            }
            return util.getFormatTime(time);
            // return time.substring(0, 10) + ' ' + time.substring(11, 16);
        };
        this.$getDateFromStdTimeFormat = function (time) {
            if (!time) {
                let nowDate = new Date();
                return nowDate.toLocaleString();
            }
            return time.substring(0, 10);
        };

        this.$getPopoverID = function (a) {
            let ID = $(a).attr('aria-describedby');
            return '#' + ID;
        }

        //////// Popover handling ////////

        this.setupPopover = function (opts) {

            // Since we are manually selecting which elements to create popovers for, we never really needed data-toggle="popup".
            let elems = $(opts.elem, opts.context); //.filter('[data-toggle=popover]');
            //console.log("setupPopover doing setup for " + elems.length + " elements.");

            allPopoverElems = allPopoverElems || [];
            elems.each(function () {
                let elem = $(this);
                allPopoverElems.push(elem);

                // Do not setup a second time, if we are called twice
                // This was happening because we were selecting elements by classname, but we use the same classname in different tables.
                if (elem.data('has-popup')) {
                    // console.log("setupPopover is skipping repeated setup.");
                    return;
                }
                elem.data('has-popup', true);

                let contentHTML;

                let content = opts.content;
                if (opts.onClickAsync) {
                    content = function () {
                        // console.log("content was called: returning contentHTML", contentHTML);
                        return contentHTML;
                    };
                }

                // Prepare the popover
                elem.popover({
                    trigger: "manual",
                    html: true,
                    content: content
                    //callback: opts.callback
                });

                // If a callback function is provided, call it when the popover is shown.
                if (opts.callback) {
                    elem.on('inserted.bs.popover', opts.callback);
                }

                // In order to hide a popover if it is clicked a second time, we need to track, for each popover, whether it is currently showing or hidden.
                elem.data('popoverShowing', false);
                elem.on('show.bs.popover', function (e) {
                    $(this).data('popoverShowing', true);
                });
                elem.on('hide.bs.popover', function (e) {
                    $(this).data('popoverShowing', false);
                });

                function showPopup(ele, str, data, spCallback) {
                    contentHTML = $(str).html();

                    // If the user triggers a slow async popover, and then quickly triggers a fast popover, they may
                    // end up with two popovers on screen, because the slow one shows itself after the fast one has
                    // appeared, without checking whether it is still wanted.  We could kill the fast one like this:
                    //hideAllPopoversExcept(ele);
                    // But actually the more desirable behaviour would be to cancel the earlier request (or not show it
                    // when it returns), because the user moved on to other things.
                    // RxJS or CycleJS can help with this sort of thing.

                    // OK we can check, somewhat inefficiently, with aPopoverIsShowing.
                    // The only disadvantage here is if the user triggers a slow popover, then quickly triggers and
                    // dismisses a fast popover, the slow one may arrive afterwards and display itself unexpectedly.

                    let aPopoverIsShowing = false;
                    $('[data-original-title]').each(function () {
                        if ($(this).data('popoverShowing')) {
                            aPopoverIsShowing = true;
                        }
                    });

                    if (!aPopoverIsShowing) {
                        $(ele).popover('show');
                    }
                }

                // Define the action when the popup is clicked
                elem.on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    let shouldShow = !$(this).data('popoverShowing');
                    console.log(shouldShow ? "Showing" : "Hiding");
                    if (shouldShow && opts.onClick) {
                        opts.onClick.call(this, e);
                    }
                    if (shouldShow && opts.onClickAsync) {
                        opts.onClickAsync.call(this, showPopup);

                    }
                    if (shouldShow) {
                        // We must exclude this element, in case we are about to show it.
                        // If we don't exclude it, Bootstrap's hide animation can conflict with the show animation!  (Seems to happen on second show, but not on first.)
                        util.hideAllPopoversExcept(this);
                    }
                    // Do not show if using onClickAsync - he will will do the show himself.
                    // But if hiding, then we will do the hide for him.
                    let callerWillHandleShow = opts.onClickAsync && shouldShow;
                    if (!callerWillHandleShow) {
                        $(this).popover(shouldShow ? 'show' : 'hide');
                    }
                    // No need for this here.  It should now be detected by event listeners above.
                    //$(this).data('popoverShowing', show);
                });

                elem = null;
            });

            elems = null;
        };

        this.convertSecondsToStandardFormat = function (seconds) {
            let h, m, s, result='';
            // HOURs
            h = Math.floor(seconds/3600);
            seconds -= h * 3600;
            if(h){
                result = h <10 ? '0'+ h +':' : h +':';
            }
            else{
                result = '00:';
            }
            // MINUTEs
            m = Math.floor(seconds/60);
            seconds -= m * 60;
            result += m < 10 ? '0' + m + ':' : m + ':';
            // SECONDs
            s = seconds % 60;
            result += s < 10 ? '0'+ s : s;
            return result;
        };

        // This function should be called once each time a fresh page is loaded.
        this.closeAllPopoversWhenClickingOnPage = function () {
            // Automatically hide popovers when clicking elsewhere on the page (outside a popover)
            // This performs behaviour like Bootstrap's data-trigger="focus" even if we haven't set it.

            $('html').on('click', function (e) {
                let clickedTarget = $(e.target);
                if (clickedTarget.closest('.popover').length) {
                    // We clicked inside a popover, do nothing
                } else {
                    util.hideAllPopoversExcept();
                }
            });
        };

        // @param {HTMLElement} [excluded] - Optional element for which popover('hide') will not be called.
        this.hideAllPopoversExcept = function (excluded) {
            // [data-toggle="popover"] will catch everything marked by class as having a popover.
            // But [data-original-title] catches even those which were not marked but were made into popovers manually.
            $('[data-original-title]').each(function () {
                if (this !== excluded) {
                    $(this).popover('hide');
                }
            });
        };

        // clear all pop overs when it isn't needed anymore to prevent memory leak
        this.clearPopovers = function () {
            allPopoverElems = allPopoverElems || [];
            for (let i = 0; i < allPopoverElems.length; i++) {
                if (!allPopoverElems[i]) {
                    continue;
                }

                allPopoverElems[i].off();
                allPopoverElems[i].remove();
            }
            allPopoverElems = [];
            $(".ui-helper-hidden-accessible").remove();
        }

        //////// end Popover handling ///////

        this.getFormatTime = function (data) {
            let option = {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            return new Date(data).toLocaleString('en-US', option).replace(/(\d+)\/(\d+)\/(\d+)/, '$3/$1/$2')
                .replace(',', ' ');
        }

        this.getFormatDate = function (data) {
            let option = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            };
            return new Date(data).toLocaleString('en-US', option).replace(/(\d+)\/(\d+)\/(\d+)/, '$3/$1/$2')
                .replace(',', ' ');
        };

        this.openInNewTab = function (url) {
            Object.assign(document.createElement('a'), { target: '_blank', href: url}).click();
        };

        this.openInNewWindow = function (url) {
            let strWindowFeatures = "location=yes,scrollbars=yes,status=yes";
            window.open(url, "_blank", strWindowFeatures);
        };

        this.getLocalTime = function (date) {
            if (!date) return null;
            return new Date(date.getTime() - new Date().getTimezoneOffset() * 60 * 1000);
        };
        this.getUTCTime = function (date) {
            if (!date) return null;
            return new Date(date.getTime() + new Date().getTimezoneOffset() * 60 * 1000);
        };

        this.setLocalDayStartTime = function (date) {
            if (!date) return null;
            date.setHours(0, 0, 0, 0);
            return new Date(date.getTime() - new Date().getTimezoneOffset() * 60 * 1000);
        }
        this.setLocalDayEndTime = function (date) {
            if (!date) return null;
            date.setHours(23, 59, 59, 999);
            return new Date(date.getTime() + 1 - new Date().getTimezoneOffset() * 60 * 1000);
        }
        this.setLastYearLocalDay = function (date) {
            if (!date) return null;
            date.setHours(0, 0, 0, 0);
            date.setFullYear(date.getFullYear() - 1)
            return new Date(date.getTime() - new Date().getTimezoneOffset() * 60 * 1000);
        }
        this.setThisDayStartTime = function (date) {
            if (!date) return null;
            return new Date(date.setHours(0, 0, 0, 0));
        }
        this.setThisDayEndTime = function (date) {
            if (!date) return null;
            return new Date(date.setHours(23, 59, 59, 999));
        }
        this.getTodayStartTime = function () {
            let todayDate = new Date();
            return new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0);
        }
        this.getTodayEndTime = function () {
            // let todayDate = new Date();
            // return new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59);
            return new Date(util.getTodayStartTime().getTime() + 24 * 3600 * 1000);
        }
        this.getThisMonthStartTime = function () {
            let todayDate = new Date();
            return new Date(todayDate.getFullYear(), todayDate.getMonth(), 1, 0, 0, 0);
        }
        this.getThisMonthEndTime = function () {
            let todayDate = new Date();
            return new Date(todayDate.getFullYear(), todayDate.getMonth()+1, 1, 0, 0, 0);
        }
        this.getYesterdayStartTime = function () {
            return new Date(util.getTodayStartTime().getTime() - 24 * 60 * 60 * 1000);
        }
        this.getNdayagoStartTime = function (n) {
            n = $.isNumeric(n) ? parseInt(n) : 0;
            return new Date(util.getTodayStartTime().getTime() - 24 * 60 * 60 * 1000 * n);
        }
        this.getNdaylaterStartTime = function (n) {
            n = $.isNumeric(n) ? parseInt(n) : 0;
            return new Date(util.getTodayStartTime().getTime() + 24 * 60 * 60 * 1000 * n);
        }
        this.getNumberOfDayThisMonth = function () {
            let todayDate = new Date();
            let startDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1, 0, 0, 0);
            let endDate = new Date(todayDate.getFullYear(), todayDate.getMonth()+1, 1, 0, 0, 0);

            return ((endDate-startDate)/(24 * 60 * 60 * 1000))
        }

        /*
     *  Shuffle array, based on most efficient method shown at https://jsperf.com/array-shuffle-comparator/5
     */
        this.shuffleArray = function (arr) {
            if (!arr || !arr.length) {
                return [];
            }

            let temp, j, i = arr.length;
            while (--i) {
                j = ~~(Math.random() * (i + 1));
                temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }

            return arr;
        }

        this.actionAfterLoaded = function (id, func, times) {
            let count = times || 0;
            if ($(id) && $(id)[0] && func) {
                return func();
            } else {
                count++;
                if(count< 10){
                    setTimeout(function () {
                            return util.actionAfterLoaded(id, func, count);
                        }, 50
                    );
                }
            }
        }
        this.actionAfterLoadedDateTimePickers = function (id, func, times) {
            let count = times || 0;
            let datetimePickerStartTimeId = id + "From";
            let datetimePickerEndTimeId = id + "To";

            if ($(datetimePickerStartTimeId) && $(datetimePickerStartTimeId)[0] &&
                $(datetimePickerEndTimeId) && $(datetimePickerEndTimeId)[0] && func) {

                $(datetimePickerStartTimeId).datetimepicker({
                    language: 'en',
                    format: 'dd/MM/yyyy hh:mm:ss',
                    pickTime: true,
                });
                $(datetimePickerStartTimeId).data('datetimepicker').setLocalDate(this.getNdayagoStartTime(1));

                $(datetimePickerEndTimeId).datetimepicker({
                    language: 'en',
                    format: 'dd/MM/yyyy hh:mm:ss',
                    pickTime: true,
                });
                $(datetimePickerEndTimeId).data('datetimepicker').setLocalDate(this.getTodayEndTime());
                return func();

            } else {
                count++;
                if(count< 10) {
                    setTimeout(
                        function () {
                            return util.actionAfterLoadedDateTimePickers(id, func, count);
                        },
                        100
                    );
                }
            }
        }
        this.setDataTablePageInput = function (id, tableVar, $translate) {
            let lengthId = '#' + id + '_length';
            let pInput = $('<input>', {
                type: 'number',
                class: id + 'Length',
                width: '60px',
            }).val(10);
            let page = $('<div>').append('<label></label>').append(pInput);
            $(lengthId).html(page);

            $('#' + id + '_previous a').text($translate('PREVIOUS_PAGE'));
            $('#' + id + '_next a').text($translate('NEXT_PAGE'));

            $(lengthId + ' label').html($translate("Length Per Page") + ": ");

            $(lengthId + ' .' + id + 'Length').on('change', function (a) {
                console.log('change');
                let size = $(this).val();
                if (size < -1) {
                    size = -1;
                    $(this).val(-1)
                }
                tableVar.page.len(size).draw();
            })
            $('#' + id).one('destroy.dt', function (e, settings) {
                $(lengthId + ' .' + id + 'Length').off('change');
            });
        }
        this.createDatePicker = function (id, option) {
            //create UI component 
            // #{id}.input-append.form-control 
            //  input(style='width:87%',data-format="MM/dd/yyyy HH:mm:ss PP", type='text') 
            //  span.add-on 
            //      i.fa.fa-calendar(data-time-icon='fa fa-clock-o', data-date-icon='fa fa-calendar') 
            let result;
            option = option || {language: 'en', format: 'yyyy/MM/dd hh:mm:ss', endDate: new Date()}
            let $id = $(id);
            let comp_i = $('<i>', {
                class: "fa fa-calendar",
                "data-time-icon": "fa fa-clock-o",
                "data-date-icon": "fa fa-calendar"
            })
            let comp_span = $('<span>', {class: "add-on"}).append(comp_i);
            let comp_input = $('<input>', {
                // style: 'width:calc(100% - 15px)',
                "data-format": "yyyy/MM/dd HH:mm:ss PP",
                type: 'text'
            })
            let comp = $('<div>', {class: "input-append form-control"}).append(comp_input).append(comp_span);
            if ($id) {
                if ($id.data("datetimepicker")) {
                    $id.data("datetimepicker").destroy()
                }
                $id.html(comp);
                result = $id.datetimepicker(option)
                // .on('changeDate', newValue).on('change', newValue);
            }
            // function newValue() {
            //     scope.safeApply();
            // }
            return $(result);
        }
        this.createDatePickerWithoutTime = function (id, option) {
            //create UI component 
            let result;
            option = option || {language: 'en', format: 'yyyy/MM/dd', endDate: new Date()}
            let $id = $(id);
            let comp_i = $('<i>', {
                class: "fa fa-calendar",
                "data-time-icon": "fa fa-clock-o",
                "data-date-icon": "fa fa-calendar"
            })
            let comp_span = $('<span>', {class: "add-on"}).append(comp_i);
            let comp_input = $('<input>', {
                // style: 'width:calc(100% - 15px)',
                "data-format": "yyyy/MM/dd HH:mm:ss PP",
                type: 'text'
            })
            let comp = $('<div>', {class: "input-append form-control"}).append(comp_input).append(comp_span);
            if ($id) {
                if ($id.data("datetimepicker")) {
                    $id.data("datetimepicker").destroy()
                }
                $id.html(comp);
                result = $id.datetimepicker(option)
            }
            return $(result);
        }
        this.clearDatePickerDate = function (id) {
            let $id = $(id);
            $id.find('.input-append input').val('');
            if ($id.data("datetimepicker")) {
                $id.data("datetimepicker").setValue()
            }
        }

        this.assignObjKeys = function (srcObj, keys) {
            let newObj = {};
            for (let i in keys) {
                if (srcObj[keys[i]]) {
                    newObj[keys[i]] = srcObj[keys[i]];
                }
            }
            return newObj;
        }
        this.getDatatableSummary = function (api, keys, prop) {
            //keys are array of class names to calculate per gage summary
            //prop are array of attributes name of original data to calculate total summary.
            let result = {};
            let srcData = api.settings().data();
            let tdVal = function (i) {
                let a = parseFloat(i);
                return $.isNumeric(a) ? a : 0;
            };
            if (api && api.cells() && keys && keys.length > 0) {
                for (let i in keys) {
                    let className = keys[i];
                    result[className] = {};
                    result[className].page = api.cells('.' + className, {page: 'current'}).data()
                        .reduce(function (a, b) {
                            return tdVal(a) + tdVal(b);
                        }, 0);
                }
            }
            if (api && api.cells() && prop && prop.length > 0) {
                for (let i in prop) {
                    let propName = prop[i];
                    result[propName] = result[propName] || {};
                    result[propName].total = 0;
                    $.each(srcData, function (i, v) {
                        result[propName].total += $.isNumeric(v[propName]) ? parseFloat(v[propName]) : 0;
                    })
                }
            }
            return result;
        };

        this.checkExceedPromoCodeMaxRewardAmount = function (type, rowData, maxRewardAmount) {
            if (type && (type == 1 || type == 2) && rowData && rowData.hasOwnProperty('amount') && maxRewardAmount && rowData.amount > maxRewardAmount){
                return true
            }
            else if ( type && type == 3 && rowData && rowData.hasOwnProperty('maxRewardAmount') && maxRewardAmount && rowData.maxRewardAmount > maxRewardAmount){
                return true
            }
            else {
                return false
            }
        };

        this.getDifferenceBetweenTwoDays = function (startTime, endTime) {

            let date1_ms = startTime.getTime();
            let date2_ms = endTime.getTime();

            let difference_ms = Math.abs(date1_ms - date2_ms);
            let ONE_DAY = 1000 * 60 * 60 * 24;
            // Convert back to days and return
            let difference = Math.ceil(difference_ms / ONE_DAY);
            return difference;
        };
        this.createDatatableWithFooter = function (tableId, option, sumData, showPageOnly, showTotalOnly) {
            function getFloat(i) {
                let a = parseFloat(i);
                return $.isNumeric(a) ? a : 0;
            }

            function getInt(i) {
                let a = parseInt(i);
                return $.isNumeric(a) ? a : 0;
            }

            function gethtmlStr(a, b, extraLinesArr, hasExtraLines) {
                a = a || 0, b = b || 0;
                let line1 = $('<label>', {class: 'margin-bottom-5 label-value alignRight'}).text(a);
                let line2 = $('<label>', {class: 'margin-bottom-5 label-value alignRight'}).text(b);
                let sumLines = showPageOnly ? line1 : line1.append(line2);

                // Override showPageOnly
                sumLines = showTotalOnly ? line2 : sumLines;

                if(hasExtraLines) {
                    extraLinesArr.forEach(data=>{
                        sumLines = sumLines.append($('<label>', {class: 'margin-bottom-5 label-value alignRight'}).text(data));
                    })
                }
                return sumLines;
            }

            let finalStr = $('<tr>');
            $.each(option.columns, function (i, v) {
                finalStr.append($('<td>'));
            });
            let $tfoot = $('<tfoot>').append(finalStr);
            $(tableId).append($tfoot);
            option.footerCallback = function (row, data, start, end, display) {
                let api = this.api();

                // Special variable for dxNewPlayerReport
                let totalWinLoss = 0;
                let totalConsumption = 0;
                //special variable for playerReport
                let consumptionBonusAmount = 0;
                let validConsumptionAmount = 0;
                // Special variable for promo code
                let totalPromoCode = 0;
                let totalAcceptedPromoCode = 0;
                //special variable for consumptionModeReport
                let totalBetTypeConsumption = 0;
                let selectedBetTypeConsumption = 0;
                let totalBetTypeCount = 0;
                let selectedBetTypeCount = 0;

                api.columns().every(function (i, v) {
                    let classes = (this.nodes() && this.nodes()[0]) ? this.nodes()[0].className : '';
                    let htmlStr = null;
                    let totalValue = null, pageValue = null;
                    if (classes.indexOf('sumFloat') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getFloat(a) + getFloat(b);
                            })
                        }

                        pageValue = api.column(i, {page: 'current'}).data().reduce(function (a, b) {
                            return getFloat(a) + getFloat(b);
                        })
                        totalValue = getFloat(totalValue).toFixed(2);
                        pageValue = getFloat(pageValue).toFixed(2);
                        htmlStr = gethtmlStr(pageValue, totalValue);

                        //special handling for consumptionModeReport
                        if (i == 2) {
                            selectedBetTypeConsumption = pageValue;
                        } else if (i == 3) {
                            totalBetTypeConsumption = pageValue;
                        }
                        // Special handling for dxNewPlayerReport
                        if (i == 16) {
                            totalConsumption = pageValue;
                        } else if (i == 17) {
                            totalWinLoss = pageValue;
                        }
                        //special handling for player report
                        if (i == 16) {
                            validConsumptionAmount = pageValue;
                        } else if (i == 17) {
                            consumptionBonusAmount = pageValue;
                        }
                        // Special handling for reportController.js drawFeedbackReport()
                        if (i == 18) {
                            totalConsumption = totalValue;
                            validConsumptionAmount = pageValue;
                        } else if (i == 19) {
                            totalWinLoss = totalValue;
                            consumptionBonusAmount = pageValue;
                        }
                    } else if (classes.indexOf('betAmtPercent') > -1) {
                        //consumptionModeReport
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getFloat(a) + getFloat(b);
                            })
                        }
                        pageValue = selectedBetTypeConsumption / totalBetTypeConsumption * 100;
                        if(!isFinite(pageValue) || isNaN(pageValue)) {
                            htmlStr = gethtmlStr("-");
                        }else {
                            totalValue = getFloat(totalValue).toFixed(2);
                            pageValue = getFloat(pageValue).toFixed(2);
                            htmlStr = gethtmlStr(pageValue + "%", totalValue + "%");
                        }
                    } else if (classes.indexOf('betCountPercent') > -1) {
                        //consumptionModeReport
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getFloat(a) + getFloat(b);
                            })
                        }
                        pageValue = selectedBetTypeCount / totalBetTypeCount * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        pageValue = getFloat(pageValue).toFixed(2);
                        htmlStr = gethtmlStr(pageValue + "%", totalValue + "%");
                    } else if (classes.indexOf('playerReportProfit') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getFloat(a) + getFloat(b);
                            })
                        }
                        pageValue = (-consumptionBonusAmount) / validConsumptionAmount * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        pageValue = getFloat(pageValue).toFixed(2);
                        htmlStr = gethtmlStr(pageValue + "%", totalValue + "%");
                    } else if (classes.indexOf('feedbackReportProfit') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = (-totalWinLoss) / totalConsumption * 100;
                        }
                        pageValue = (-consumptionBonusAmount) / validConsumptionAmount * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        pageValue = getFloat(pageValue).toFixed(2);
                        htmlStr = gethtmlStr(pageValue + "%", totalValue + "%");
                    } else if (classes.indexOf('referrralRewardReportProfit') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getFloat(a) + getFloat(b);
                            })
                        }
                        pageValue = (-consumptionBonusAmount) / validConsumptionAmount * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        pageValue = getFloat(pageValue).toFixed(2);
                        htmlStr = gethtmlStr(pageValue + "%", totalValue + "%");
                    } else if (classes.indexOf('dxNewPlayerReportProfit') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getFloat(a) + getFloat(b);
                            })
                        }
                        pageValue = (-validConsumptionAmount) / consumptionBonusAmount * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        pageValue = getFloat(pageValue).toFixed(2);
                        htmlStr = gethtmlStr(pageValue + "%", totalValue + "%");
                    } else if (classes.indexOf('promoCodeAcceptanceRate') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getFloat(a) + getFloat(b);
                            })
                        }
                        pageValue = (totalAcceptedPromoCode / totalPromoCode) * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        pageValue = getFloat(pageValue).toFixed(2);
                        htmlStr = gethtmlStr(pageValue + "%", totalValue + "%");
                    } else if(classes.indexOf("limitedOfferSumLabel") > -1) {
                        htmlStr = gethtmlStr($trans('Page Total'), $trans('All Pages'));
                    } else if(classes.indexOf("AllPagesLabel") > -1) {
                        htmlStr = gethtmlStr($trans('All Pages'), $trans('All Pages'));
                    }  else if(classes.indexOf("limitedOfferClaimStatusLabel") > -1) {
                        htmlStr = gethtmlStr($trans('STILL VALID')+":", $trans('ACCEPTED')+":", [$trans('EXPIRED')+":", $trans('TOTAL_SUM')+":"], true);
                    } else if(classes.indexOf("limitedOfferClaimStatusAmount") > -1) {
                        htmlStr = gethtmlStr(sumData.claimStatus.stillValid, sumData.claimStatus.accepted, [sumData.claimStatus.expired, sumData.total], true);
                    } else if(classes.indexOf("limitedOfferClaimStatusPercentage") > -1) {
                        let stillValidPercentage = "("+parseFloat(sumData.claimStatus.stillValid/sumData.total*100).toFixed(2)+"%)";
                        let acceptedPercentage = "("+parseFloat(sumData.claimStatus.accepted/sumData.total*100).toFixed(2)+"%)";
                        let expiredPercentage = "("+parseFloat(sumData.claimStatus.expired/sumData.total*100).toFixed(2)+"%)";
                        let totalPercentage = "("+parseFloat(100).toFixed(2)+"%)";
                        htmlStr = gethtmlStr(stillValidPercentage, acceptedPercentage, [expiredPercentage, totalPercentage], true);
                    } else if(classes.indexOf("limitedOfferDevice") > -1) {
                        let web = $trans('WEB_PLAYER')+": "+sumData.device.webPlayer+" ("+parseFloat(sumData.device.webPlayer/sumData.total*100).toFixed(2)+"%)";
                        let h5 = $trans('H5_PLAYER')+": "+sumData.device.h5Player+" ("+parseFloat(sumData.device.h5Player/sumData.total*100).toFixed(2)+"%)";
                        let app = $trans('APP_PLAYER')+": "+sumData.device.appPlayer+" ("+parseFloat(sumData.device.appPlayer/sumData.total*100).toFixed(2)+"%)";
                        htmlStr = gethtmlStr(web, h5, [app], true);
                    } else if (classes.indexOf('sumInt') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i]
                        } else {
                            totalValue = api.column(i).data().reduce(function (a, b) {
                                return getInt(a) + getInt(b);
                            })
                        }
                        pageValue = api.column(i, {page: 'current'}).data().reduce(function (a, b) {
                            return getInt(a) + getInt(b);
                        });
                        htmlStr = gethtmlStr(pageValue, totalValue);

                        // Special handling for promo code analysis
                        if (i == 2) {
                            totalPromoCode = pageValue;
                        } else if (i == 3) {
                            totalAcceptedPromoCode = pageValue;
                        }
                        //special handling for consumptionModeReport
                        if (i == 6) {
                            selectedBetTypeCount = pageValue;
                        } else if (i == 7) {
                            totalBetTypeCount = pageValue;
                        }
                    } else if (classes.indexOf('sumText') > -1) {
                        htmlStr = gethtmlStr($trans('Page Total'), $trans('All Pages'));
                    } else if (classes.indexOf('sumProfit') > -1) {
                        totalValue = (-totalWinLoss) / totalConsumption * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        totalValue = "".concat(totalValue, "%");
                        pageValue = totalValue;
                        htmlStr = gethtmlStr(pageValue, totalValue);
                    } else if (classes.indexOf('sumEarning') > -1) {
                        let index = 0;
                        let totalProfit = 0;
                        api.column(i).data().each(function (item) {
                            index += 1;
                            totalProfit += item;
                        })
                        if( totalProfit == 0 ){
                            totalValue = 0;
                        }else{
                            totalValue = totalProfit / index;
                        }
                        totalValue = getFloat(totalValue).toFixed(2) + "%";
                        pageValue = getFloat(totalValue).toFixed(2) + "%";
                        htmlStr = gethtmlStr(pageValue, totalValue);
                    }else if (classes.indexOf('originTXT') > -1) {
                        if (sumData && sumData[i]) {
                            totalValue = sumData[i];
                        }else{
                            totalValue = 0;
                        }
                        totalValue = getInt(totalValue);
                        pageValue = getInt(totalValue);
                        htmlStr = gethtmlStr(pageValue, totalValue);
                    }else {
                        $(this.footer()).html('');
                        return true;
                    }
                    $(this.footer()).html(htmlStr);
                    // $(tableId + ' .dataTables_scrollBody').css({
                    //     'overflow': 'hidden',
                    //     'border': '0'
                    // });
                    // $(tableId + ' .dataTables_scrollFoot').css('overflow', 'auto');
                    // $(tableId + ' .dataTables_scrollFoot').on('scroll', function () {
                    //     $(tableId + ' .dataTables_scrollBody').scrollLeft($(this).scrollLeft());
                    // });
                })
            }
            let newD = $(tableId).DataTable(option);
            return newD;
        }
        this.createPageForPagingTable = function (id, tblObj, trans, funcName, removePageSize) {
            $(id).html('');
            let newPage = $('#pagingTableFooter').clone().removeAttr('id').removeClass("collapse");
            //para curPage, maxPage
            let retObj = {
                curPage: 1,
                maxPage: 0,
                pageSize: (tblObj && tblObj.pageSize) ? tblObj.pageSize : 10
            };
            let maxPageSize = (tblObj && tblObj.maxPageSize) ? tblObj.maxPageSize : 5000;
            $(id).append(newPage.prop('innerHTML'));
            $(id).find(".jumpText").text(trans("Jump to"));
            $(id).find(".first_page").text(1).hide();
            $(id).find(".next_page").text(trans("NEXT_PAGE"));
            $(id).find('.cur_page').text(1);
            $(id).find(".prev_page").text(trans("PREVIOUS_PAGE"));
            $(id).find('.pageSizeText').text(trans("Length Per Page"));
            $(id).find(".last_page").hide();
            $(id).find(".cur_page_b").hide();
            $(id).find(".cur_page_a").hide();

            $(id).find(".bdots").hide();
            $(id).find(".adots").hide();
            // $(id).off('click');

            if (removePageSize) {
                $(id).find('.pageSizeText').parent().remove();
            }

            retObj.init = function (para, resetCurPage) {

                console.log('initing', id, resetCurPage);
                retObj.maxPage = Math.ceil(parseInt(para.maxCount) / retObj.pageSize);
                retObj.curPage = resetCurPage ? 1 : (retObj.curPage || 1);
                $(id).find('.pageSize').val(retObj.pageSize);

                $(id).find('.last_page').text(retObj.maxPage).toggle(retObj.curPage != retObj.maxPage && retObj.maxPage > 0);
                $(id).find(".cur_page").text(retObj.curPage);
                $(id).find('.cur_page_b').text(retObj.curPage - 1).toggle(retObj.curPage > 2);
                $(id).find('.cur_page_a').text(retObj.curPage + 1).toggle(retObj.curPage < retObj.maxPage - 1);

                $(id).find('.bdots').toggle(retObj.curPage > 3);
                $(id).find('.adots').toggle(retObj.curPage < retObj.maxPage - 2);

                $(id).find('.first_page').toggle(retObj.curPage > 1);
                $(id).find(".next_page").toggleClass("disabled", retObj.curPage == retObj.maxPage);
                $(id).find(".prev_page").toggleClass("disabled", retObj.curPage == 1);
                $(id + " .btnPage").off('click');
                $(id + " .btnPage").on('click', function () {
                    retObj.updateCurPage(event);
                });
                $(id).find(".jumpPage").on('keyup', function (event) {
                    if (event.target.valueAsNumber) {
                        retObj.curPage = event.target.valueAsNumber;
                        retObj.jump();
                    }
                });

                $(id).off('focusout', ".pageSize")
                $(id).on('focusout', ".pageSize", function (event) {
                    if (retObj.pageSize != event.target.valueAsNumber && (event.target.valueAsNumber)) {
                        retObj.pageSize = event.target.valueAsNumber;
                        if (retObj.pageSize < 1) {
                            retObj.pageSize = 1
                        } else if (retObj.pageSize > maxPageSize) {
                            retObj.pageSize = maxPageSize;
                        }
                        $(id).find('.pageSize').val(retObj.pageSize);
                        retObj.jump();
                    }
                });

                // $(id).find(".jumpPage").off('keyup');
                // $(id).find(".pageSize").on('keyup', function () {
                //     retObj.pageSize = event.target.valueAsNumber;
                //     if (retObj.pageSize < 1) {
                //         retObj.pageSize = 1
                //     } else if (retObj.pageSize > 2000) {
                //         retObj.pageSize = 2000;
                //     }
                //     $(id).find('.pageSize').val(retObj.pageSize);
                //     retObj.jump();
                // });
            };
            retObj.updateCurPage = function (event) {
                let className = event.target.className;
                if (className.indexOf('jumpPage') > -1) return;
                console.log('event', event);
                if (className.indexOf("first_page") > -1) {
                    retObj.curPage = 1;
                } else if (className.indexOf("last_page") > -1) {
                    retObj.curPage = retObj.maxPage;
                } else if (className.indexOf("prev_page") > -1) {
                    retObj.curPage--;
                } else if (className.indexOf("next_page") > -1) {
                    retObj.curPage++;
                } else if (className.indexOf("cur_page_b") > -1) {
                    retObj.curPage--;
                } else if (className.indexOf("cur_page_a") > -1) {
                    retObj.curPage++;
                }
                if (retObj.curPage < 1) {
                    retObj.curPage = 1;
                } else if (retObj.curPage > retObj.maxPage) {
                    retObj.curPage = retObj.maxPage
                }
                funcName.call(this, retObj.curPage, retObj.pageSize);
            };
            retObj.jump = function () {
                if (retObj.curPage < 1) {
                    retObj.curPage = 1;
                } else if (retObj.curPage > retObj.maxPage) {
                    retObj.curPage = retObj.maxPage
                }
                funcName.call(this, retObj.curPage, retObj.pageSize);
            };
            return retObj;
        };
        this.getDataTablePageSize = function (tablePageId, tblObj, pageSize) {
            let inputPageSize = Number($(tablePageId + " .pageSize").val());
            if (tblObj && !tblObj.limit && tblObj.pageObj) {
                if (inputPageSize) {
                    tblObj.limit = inputPageSize;
                    tblObj.pageObj.pageSize = tblObj.limit;
                } else if (pageSize) {
                    tblObj.limit = pageSize;
                    tblObj.pageObj.pageSize = tblObj.limit;
                }
            }
        };
        this.format2 = function (number) {
            if (parseFloat(number) !== NaN) {
                return parseFloat(number).toFixed(2);
            } else return number;
        };
        this.fitText = function (ele) {
            let $ele = $(ele) ? $($(ele).first()[0]) : null;
            if (!$ele) {
                return
            }
            let e = $ele.parent();
            let maxWidth = e.width();
            let maxHeight = e.height();
            let sizeX = $ele.width();
            let sizeY = $ele.height();
            if (sizeY <= maxHeight && sizeX <= maxWidth)
                return;
            let fontSize = parseInt($ele.css("font-size"), 10);
            while ((sizeX > maxWidth || sizeY > maxHeight) && fontSize > 4) {
                fontSize -= .5;
                sizeX = $ele.width();
                sizeY = $ele.height();
                $ele.css("font-size", fontSize + "px");
            }
            return $ele;
        };

        this.getProposalGroupValue = function (proposalType, performTranslation) {
            let groupName = "";
            performTranslation = performTranslation === false ? false : true;
            switch (proposalType.name) {
                case "PlayerQuickpayTopUp":
                    groupName = "omit";
                    break;
                case "ManualPlayerTopUp":
                case "PlayerAlipayTopUp":
                case "PlayerTopUp":
                case "PlayerWechatTopUp":
                    groupName = "Topup Proposal";
                    break;
                case "PlayerBonus":
                case "PartnerBonus":
                    groupName = "Bonus Proposal";
                    break;
                case "AddPlayerRewardTask":
                case "PlayerLevelUp":
                case "PlayerLevelMaintain":
                case "PlayerPromoCodeReward":
                case "DxReward":
                case "PlatformTransactionReward":
                case "PlayerTopUpReturn":
                case "PlayerConsumptionIncentive":
                case "PartnerTopUpReturn":
                case "PlayerTopUpReward":
                case "PlayerReferralReward":
                case "PlayerConsumptionReturn":
                case "FirstTopUp":
                case "PlayerRegistrationReward":
                case "FullAttendance":
                case "PartnerConsumptionReturn":
                case "PartnerIncentiveReward":
                case "PartnerReferralReward":
                case "GameProviderReward":
                case "PlayerDoubleTopUpReward":
                case "PlayerConsecutiveLoginReward":
                case "PlayerEasterEggReward":
                case "PlayerTopUpPromo":
                case "PlayerPacketRainReward":
                case "PlayerConsecutiveConsumptionReward":
                case "PlayerLimitedOfferReward":
                case "PlayerTopUpReturnGroup":
                case "PlayerFreeTrialRewardGroup":
                case "PlayerRandomRewardGroup":
                case "PlayerLoseReturnRewardGroup":
                case "PlayerConsumptionRewardGroup":
                case "PlayerConsecutiveRewardGroup":
                case "PlayerConsumptionSlipRewardGroup":
                case "PlayerBonusDoubledRewardGroup":
                case "PlayerRetentionRewardGroup":
                case "BaccaratRewardGroup":
                case "ReferralRewardGroup":
                    groupName = "Reward Proposal";
                    break;
                case "UpdatePlayerInfo":
                case "UpdatePlayerBankInfo":
                case "UpdatePlayerEmail":
                case "UpdatePlayerPhone":
                case "UpdatePlayerQQ":
                case "UpdatePlayerWeChat":
                case "PlayerLevelMigration":
                case "UpdatePlayerRealName":
                case "UpdatePlayerInfoPartner":
                case "UpdatePlayerInfoLevel":
                case "UpdatePlayerInfoAccAdmin":
                    groupName = "PLAYER_INFORMATION";
                    break;
                case "UpdatePartnerInfo":
                case "UpdatePartnerBankInfo":
                case "UpdatePartnerEmail":
                case "UpdatePartnerPhone":
                case "UpdatePartnerQQ":
                case "UpdatePartnerWeChat":
                case "UpdatePartnerCommissionType":
                case "CustomizePartnerCommRate":
                case "UpdatePartnerRealName":
                    groupName = "PARTNER_INFORMATION";
                    break;
                case "PlayerAddRewardPoints":
                case "PlayerMinusRewardPoints":
                case "PlayerConvertRewardPoints":
                case "PlayerAutoConvertRewardPoints":
                case "AuctionPromoCode":
                case "AuctionOpenPromoCode":
                case "AuctionRewardPromotion":
                case "AuctionRealPrize":
                case "AuctionRewardPointChange":
                    groupName = "Reward Point Proposal";
                    break;
                case "UpdatePlayerCredit":
                case "FixPlayerCreditTransfer":
                case "UpdatePartnerCredit":
                case "ManualUnlockPlayerReward":
                case "PlayerRegistrationIntention":
                case "PlayerLimitedOfferIntention":
                case "FinancialPointsAdd":
                case "FinancialPointsDeduct":
                default:
                    groupName = "Others";
                    break;
            }
            return (performTranslation) ? $trans(groupName) : groupName;
        };

        this.processProposalType = (typeData) => {
            let allProposalType = typeData;

            // add index to data
            for (let x = 0; x < allProposalType.length; x++) {
                let groupName = this.getProposalGroupValue(allProposalType[x], false);
                switch (allProposalType[x].name) {
                    case "AddPlayerRewardTask":
                        allProposalType[x].seq = 3.01;
                        break;
                    case "PlayerLevelUp":
                        allProposalType[x].seq = 3.02;
                        break;
                    case "PlayerLevelMaintain":
                        allProposalType[x].seq = 3.03;
                        break;
                    case "PlayerPromoCodeReward":
                        allProposalType[x].seq = 3.04;
                        break;
                    case "UpdatePlayerInfo":
                        allProposalType[x].seq = 5.01;
                        break;
                    case "UpdatePlayerBankInfo":
                        allProposalType[x].seq = 5.02;
                        break;
                    case "UpdatePlayerEmail":
                        allProposalType[x].seq = 5.03;
                        break;
                    case "UpdatePlayerPhone":
                        allProposalType[x].seq = 5.04;
                        break;
                    case "UpdatePlayerQQ":
                        allProposalType[x].seq = 5.05;
                        break;
                    case "UpdatePlayerWeChat":
                        allProposalType[x].seq = 5.06;
                        break;
                    case "UpdatePlayerInfoPartner":
                        allProposalType[x].seq = 5.07;
                        break;
                    case "UpdatePlayerInfoLevel":
                        allProposalType[x].seq = 5.08;
                        break;
                    case "UpdatePlayerInfoAccAdmin":
                        allProposalType[x].seq = 5.09;
                        break;
                    case "UpdatePartnerInfo":
                        allProposalType[x].seq = 6.01;
                        break;
                    case "UpdatePartnerBankInfo":
                        allProposalType[x].seq = 6.02;
                        break;
                    case "UpdatePartnerEmail":
                        allProposalType[x].seq = 6.03;
                        break;
                    case "UpdatePartnerPhone":
                        allProposalType[x].seq = 6.04;
                        break;
                    case "UpdatePartnerQQ":
                        allProposalType[x].seq = 6.05;
                        break;
                    case "UpdatePartnerWeChat":
                        allProposalType[x].seq = 6.06;
                        break;
                    case "UpdatePartnerCommissionType":
                        allProposalType[x].seq = 6.07;
                        break;
                    case "UpdatePlayerCredit":
                        allProposalType[x].seq = 7.01;
                        break;
                    case "FixPlayerCreditTransfer":
                        allProposalType[x].seq = 7.02;
                        break;
                    case "UpdatePartnerCredit":
                        allProposalType[x].seq = 7.03;
                        break;
                    case "ManualUnlockPlayerReward":
                        allProposalType[x].seq = 7.04;
                        break;
                    case "PlayerLevelMigration":
                        allProposalType[x].seq = 7.05;
                        break;
                    case "PlayerRegistrationIntention":
                        allProposalType[x].seq = 7.06;
                        break;
                    case "PlayerLimitedOfferIntention":
                        allProposalType[x].seq = 7.07;
                        break;
                }
                if (!allProposalType[x].seq) {
                    switch (groupName) {
                        case "Topup Proposal":
                            allProposalType[x].seq = 1;
                            break;
                        case "Bonus Proposal":
                            allProposalType[x].seq = 2;
                            break;
                        case "Reward Proposal":
                            allProposalType[x].seq = 3.90;
                            break;
                        case "Reward Point Proposal":
                            allProposalType[x].seq = 4.90;
                            break;
                        case "PLAYER_INFORMATION":
                            allProposalType[x].seq = 5.90;
                            break;
                        case "PARTNER_INFORMATION":
                            allProposalType[x].seq = 6.90;
                            break;
                        case "Others":
                            allProposalType[x].seq = 7.90;
                            break;
                    }
                }
            }

            allProposalType.sort(
                function (a, b) {
                    if (a.seq > b.seq) return 1;
                    if (a.seq < b.seq) return -1;
                    return 0;
                }
            );

            return allProposalType;
        };

        this.getPlayerFeedbackResultName = function(allPlayerFeedbackResults, key) {
            let resultName;
            allPlayerFeedbackResults.forEach(feedbackResult => {
                if(feedbackResult.key == key) {
                    resultName = feedbackResult.value;
                }
            });
            return resultName;
        };

        this.createMerGroupList = function (nameObj, listObj) {
            if (!nameObj || !listObj) return [];
            let obj = [];
            $.each(listObj, (name, arr) => {
                obj.push({
                    name: nameObj[name],
                    list: arr.list
                });
            });
            return obj;
        };

        this.retrieveAgent = (agentInfo) => {
            let registrationInterface = '';
            let userAgent = agentInfo;

            if (userAgent == '') {
                registrationInterface = 1;
            } else {
                if (userAgent && userAgent.browser && userAgent.browser.name && (userAgent.browser.name.indexOf("WebKit") !== -1 || userAgent.browser.name.indexOf("WebView") !== -1)) {
                    registrationInterface = 2;
                }
                else if (userAgent && userAgent.os && userAgent.os.name && (userAgent.os.name.indexOf("iOS") !== -1 || userAgent.os.name.indexOf("ndroid") !== -1 || userAgent.browser.name.indexOf("obile") !== -1)) {
                    registrationInterface = 3;
                } else {
                    registrationInterface = 1;
                }
            }
            return registrationInterface;
        }
    };


    let servicesApp = angular.module('utilService', []);
    servicesApp.provider('utilService', utilService);
});
