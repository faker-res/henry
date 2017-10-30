/*
 * Util service for common functions
 */

'use strict';

define([], function () {

    var utilService = function () {

        var util = this;
        this.$get = function () {
            return this;
        };

        var $trans = null;

        /////// some common functions //////
        this.initTranslate = function (func) {
            $trans = func ? func : null;
        }
        this.setNDaysAgo = function (inputDate, n) {
            if (!(inputDate instanceof Date) || !Number.isInteger(n)) {
                return;
            }
            return new Date(inputDate.setDate(inputDate.getDate() - n));
        }


        this.$createArray = function (min, max) {
            var newArrayObj = {};
            var upper = 0, lower = 0;
            if (!min) return [];
            if (!max) {
                upper = min;
            } else {
                upper = max;
                lower = min;
            }
            for (var ii = lower; ii < upper; ii++) {
                newArrayObj[ii] = ii;
            }
            return newArrayObj;
        }
        this.$getTimeFromStdTimeFormat = function (time) {
            if (!time) {
                var nowDate = new Date();
                return nowDate.toLocaleString();
            }
            return util.getFormatTime(time);
            // return time.substring(0, 10) + ' ' + time.substring(11, 16);
        };
        this.$getDateFromStdTimeFormat = function (time) {
            if (!time) {
                var nowDate = new Date();
                return nowDate.toLocaleString();
            }
            return time.substring(0, 10);
        };

        this.$getPopoverID = function (a) {
            var ID = $(a).attr('aria-describedby');
            return '#' + ID;
        }

        //////// Popover handling ////////

        this.setupPopover = function (opts) {

            // Since we are manually selecting which elements to create popovers for, we never really needed data-toggle="popup".
            var elems = $(opts.elem, opts.context); //.filter('[data-toggle=popover]');
            //console.log("setupPopover doing setup for " + elems.length + " elements.");

            elems.each(function () {
                var elem = $(this);

                // Do not setup a second time, if we are called twice
                // This was happening because we were selecting elements by classname, but we use the same classname in different tables.
                if (elem.data('has-popup')) {
                    // console.log("setupPopover is skipping repeated setup.");
                    return;
                }
                elem.data('has-popup', true);

                var contentHTML;

                var content = opts.content;
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

                    var aPopoverIsShowing = false;
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
                    var shouldShow = !$(this).data('popoverShowing');
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
                    var callerWillHandleShow = opts.onClickAsync && shouldShow;
                    if (!callerWillHandleShow) {
                        $(this).popover(shouldShow ? 'show' : 'hide');
                    }
                    // No need for this here.  It should now be detected by event listeners above.
                    //$(this).data('popoverShowing', show);
                });
            });

        }

        // This function should be called once each time a fresh page is loaded.
        this.closeAllPopoversWhenClickingOnPage = function () {
            // Automatically hide popovers when clicking elsewhere on the page (outside a popover)
            // This performs behaviour like Bootstrap's data-trigger="focus" even if we haven't set it.

            $('html').on('click', function (e) {
                var clickedTarget = $(e.target);
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

        //////// end Popover handling ///////

        this.getFormatTime = function (data) {
            var option = {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            return new Date(data).toLocaleString('en-US', option).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2')
                .replace(',', ' ');
        }

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
        this.setThisDayStartTime = function (date) {
            if (!date) return null;
            return new Date(date.setHours(0, 0, 0, 0));
        }
        this.getTodayStartTime = function () {
            var todayDate = new Date();
            return new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 0, 0, 0);
        }
        this.getTodayEndTime = function () {
            // var todayDate = new Date();
            // return new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59);
            return new Date(util.getTodayStartTime().getTime() + 24 * 3600 * 1000);
        }
        this.getYesterdayStartTime = function () {
            return new Date(util.getTodayStartTime().getTime() - 24 * 60 * 60 * 1000);
        }
        this.getNdayagoStartTime = function (n) {
            var n = $.isNumeric(n) ? parseInt(n) : 0;
            return new Date(util.getTodayStartTime().getTime() - 24 * 60 * 60 * 1000 * n);
        }
        this.actionAfterLoaded = function (id, func) {
            if ($(id) && $(id)[0] && func) {
                return func();
            } else {
                setTimeout(function () {
                        return util.actionAfterLoaded(id, func);
                    }, 50
                );
            }
        }
        this.actionAfterLoadedDateTimePickers = function (id, func) {

            var datetimePickerStartTimeId = id + "From";
            var datetimePickerEndTimeId = id + "To";

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
                setTimeout(
                    function () {
                        return util.actionAfterLoadedDateTimePickers(id, func);
                    },
                    100
                );
            }
        }
        this.setDataTablePageInput = function (id, tableVar, $translate) {
            var lengthId = '#' + id + '_length';
            var pInput = $('<input>', {
                type: 'number',
                class: id + 'Length',
                width: '60px',
            }).val(10);
            var page = $('<div>').append('<label></label>').append(pInput);
            $(lengthId).html(page);

            $('#' + id + '_previous a').text($translate('PREVIOUS_PAGE'));
            $('#' + id + '_next a').text($translate('NEXT_PAGE'));

            $(lengthId + ' label').html($translate("Length Per Page") + ": ");

            $(lengthId + ' .' + id + 'Length').on('change', function (a) {
                console.log('change');
                var size = $(this).val();
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
            var result;
            option = option || {language: 'en', format: 'yyyy/MM/dd hh:mm:ss', endDate: new Date()}
            var $id = $(id);
            var comp_i = $('<i>', {
                class: "fa fa-calendar",
                "data-time-icon": "fa fa-clock-o",
                "data-date-icon": "fa fa-calendar"
            })
            var comp_span = $('<span>', {class: "add-on"}).append(comp_i);
            var comp_input = $('<input>', {
                style: 'width:calc(100% - 15px)',
                "data-format": "yyyy/MM/dd HH:mm:ss PP",
                type: 'text'
            })
            var comp = $('<div>', {class: "input-append form-control"}).append(comp_input).append(comp_span);
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
        this.clearDatePickerDate = function (id) {
            var $id = $(id);
            $id.find('.input-append input').val('');
            if ($id.data("datetimepicker")) {
                $id.data("datetimepicker").setValue()
            }
        }

        this.assignObjKeys = function (srcObj, keys) {
            var newObj = {};
            for (var i in keys) {
                if (srcObj[keys[i]]) {
                    newObj[keys[i]] = srcObj[keys[i]];
                }
            }
            return newObj;
        }
        this.getDatatableSummary = function (api, keys, prop) {
            //keys are array of class names to calculate per gage summary
            //prop are array of attributes name of original data to calculate total summary.
            var result = {};
            var srcData = api.settings().data();
            var tdVal = function (i) {
                var a = parseFloat(i);
                return $.isNumeric(a) ? a : 0;
            };
            if (api && api.cells() && keys && keys.length > 0) {
                for (var i in keys) {
                    var className = keys[i];
                    result[className] = {};
                    result[className].page = api.cells('.' + className, {page: 'current'}).data()
                        .reduce(function (a, b) {
                            return tdVal(a) + tdVal(b);
                        }, 0);
                }
            }
            if (api && api.cells() && prop && prop.length > 0) {
                for (var i in prop) {
                    var propName = prop[i];
                    result[propName] = result[propName] || {};
                    result[propName].total = 0;
                    $.each(srcData, function (i, v) {
                        result[propName].total += $.isNumeric(v[propName]) ? parseFloat(v[propName]) : 0;
                    })
                }
            }
            return result;
        }

        this.getDifferenceBetweenTwoDays = function (startTime, endTime) {

            var date1_ms = startTime.getLocalDate();
            var date2_ms = endTime.getLocalDate();

            var difference_ms = Math.abs(date1_ms - date2_ms);
            var ONE_DAY = 1000 * 60 * 60 * 24;
            // Convert back to days and return
            var difference = Math.round(difference_ms / ONE_DAY);
            return difference;
        };
        this.createDatatableWithFooter = function (tableId, option, sumData, showPageOnly) {
            function getFloat(i) {
                var a = parseFloat(i);
                return $.isNumeric(a) ? a : 0;
            }

            function getInt(i) {
                var a = parseInt(i);
                return $.isNumeric(a) ? a : 0;
            }

            function gethtmlStr(a, b) {
                a = a || 0, b = b || 0;
                var line1 = $('<label>', {class: 'margin-bottom-5 label-value alignRight'}).text(a);
                var line2 = $('<label>', {class: 'margin-bottom-5 label-value alignRight'}).text(b);
                return showPageOnly ? line1 : line1.append(line2);
            }

            var finalStr = $('<tr>');
            $.each(option.columns, function (i, v) {
                finalStr.append($('<td>'));
            });
            var $tfoot = $('<tfoot>').append(finalStr);
            $(tableId).append($tfoot);
            option.footerCallback = function (row, data, start, end, display) {
                var api = this.api();

                // Special variable for dxNewPlayerReport
                let totalWinLoss = 0;
                let totalConsumption = 0;
                //special variable for playerReport
                let consumptionBonusAmount = 0;
                let validConsumptionAmount = 0;

                api.columns().every(function (i, v) {
                    var classes = (this.nodes() && this.nodes()[0]) ? this.nodes()[0].className : '';
                    var htmlStr = null;
                    var totalValue = null, pageValue = null;
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

                        // Special handling for dxNewPlayerReport
                        if (i == 16) {
                            totalConsumption = pageValue;
                        } else if (i == 17) {
                            totalWinLoss = pageValue;
                        }
                        //special handling for player report
                        if (i == 15) {
                            validConsumptionAmount = pageValue;
                        } else if (i == 16) {
                            consumptionBonusAmount = pageValue;
                        }
                    }else if (classes.indexOf('playerReportProfit') > -1) {
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
                        })
                        htmlStr = gethtmlStr(pageValue, totalValue);
                    } else if (classes.indexOf('sumText') > -1) {
                        htmlStr = gethtmlStr($trans('Page Total'), $trans('All Pages'));
                    } else if (classes.indexOf('sumProfit') > -1) {
                        totalValue = (-totalWinLoss) / totalConsumption * 100;
                        totalValue = getFloat(totalValue).toFixed(2);
                        totalValue = "".concat(totalValue, "%");
                        pageValue = totalValue;
                        htmlStr = gethtmlStr(pageValue, totalValue);
                    } else {
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
            var newD = $(tableId).DataTable(option);
            return newD;
        }
        this.createPageForPagingTable = function (id, tblObj, trans, funcName, removePageSize) {
            $(id).html('');
            var newPage = $('#pagingTableFooter').clone().removeAttr('id').removeClass("collapse");
            //para curPage, maxPage
            var retObj = {
                curPage: 1,
                maxPage: 0,
                pageSize: (tblObj && tblObj.pageSize) ? tblObj.pageSize : 10
            };
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
                        } else if (retObj.pageSize > 2000) {
                            retObj.pageSize = 2000;
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
                var className = event.target.className;
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
        this.format2 = function (number) {
            if (parseFloat(number) !== NaN) {
                return parseFloat(number).toFixed(2);
            } else return number;
        };
        this.fitText = function (ele) {
            var $ele = $(ele) ? $($(ele).first()[0]) : null;
            if (!$ele) {
                return
            }
            var e = $ele.parent();
            var maxWidth = e.width();
            var maxHeight = e.height();
            var sizeX = $ele.width();
            var sizeY = $ele.height();
            if (sizeY <= maxHeight && sizeX <= maxWidth)
                return;
            var fontSize = parseInt($ele.css("font-size"), 10);
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
                case "PlayerPromoCodeReward":
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
                    groupName = "Reward Proposal";
                    break;
                case "UpdatePlayerInfo":
                case "UpdatePlayerBankInfo":
                case "UpdatePlayerEmail":
                case "UpdatePlayerPhone":
                case "UpdatePlayerQQ":
                case "UpdatePlayerWeChat":
                    groupName = "PLAYER_INFORMATION";
                    break;
                case "UpdatePartnerInfo":
                case "UpdatePartnerBankInfo":
                case "UpdatePartnerEmail":
                case "UpdatePartnerPhone":
                case "UpdatePartnerQQ":
                    groupName = "PARTNER_INFORMATION";
                    break;
                case "UpdatePlayerCredit":
                case "FixPlayerCreditTransfer":
                case "UpdatePartnerCredit":
                case "ManualUnlockPlayerReward":
                case "PlayerLevelMigration":
                case "PlayerRegistrationIntention":
                case "PlayerLimitedOfferIntention":
                default:
                    groupName = "Others";
                    break;
            }
            return (performTranslation) ? $trans(groupName) : groupName;
        };

        // this.getProposalGroupValue = function (proposalType) {
        //     switch (proposalType.name) {
        //         case "UpdatePlayerInfo":
        //         case "UpdatePlayerCredit":
        //         case "FixPlayerCreditTransfer":
        //         case "UpdatePlayerEmail":
        //         case "UpdatePlayerQQ":
        //         case "UpdatePlayerPhone":
        //         case "UpdatePlayerBankInfo":
        //         case "AddPlayerRewardTask":
        //         case "UpdatePartnerBankInfo":
        //         case "UpdatePartnerPhone":
        //         case "UpdatePartnerEmail":
        //         case "UpdatePartnerInfo":
        //         case "UpdatePartnerCredit":
        //             return $trans("Player Proposal");
        //         case "ManualPlayerTopUp":
        //         case "PlayerAlipayTopUp":
        //         case "PlayerTopUp":
        //         case "PlayerWechatTopUp":
        //         case "PlayerQuickpayTopUp":
        //             return $trans("Topup Proposal");
        //         case "PlayerBonus":
        //         case "PartnerBonus":
        //             return $trans("Bonus Proposal");
        //         case "PlayerLevelUp":
        //         case "PlatformTransactionReward":
        //         case "PlayerTopUpReturn":
        //         case "PlayerConsumptionIncentive":
        //         case "PartnerTopUpReturn":
        //         case "PlayerTopUpReward":
        //         case "PlayerReferralReward":
        //         case "PlayerConsumptionReturn":
        //         case "FirstTopUp":
        //         case "PlayerRegistrationReward":
        //         case "FullAttendance":
        //         case "PartnerConsumptionReturn":
        //         case "PartnerIncentiveReward":
        //         case "PartnerReferralReward":
        //         case "GameProviderReward":
        //         case "PlayerDoubleTopUpReward":
        //         case "PlayerConsecutiveLoginReward":
        //         case "PlayerEasterEggReward":
        //         case "PlayerTopUpPromo":
        //         case "PlayerPacketRainReward":
        //         case "PlayerConsecutiveConsumptionReward":
        //             return $trans("Reward Proposal");
        //         case "PlayerConsumptionReturnFix":
        //             return $trans("ReturnFix Proposal");
        //         default:
        //             return $trans("Others");
        //     }
        // }
    };


    var servicesApp = angular.module('utilService', []);
    servicesApp.provider('utilService', utilService);
});
