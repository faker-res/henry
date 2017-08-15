'use strict';

define([], function () {

    var socketService = function () {
        var servi = this;
        this.authService = null;
        this.curScope = null;

        this.$get = function () {
            return this;
        };
        var $trans = null;
        this.initTranslate = function (func) {
            $trans = func ? func : null;
        }

        this.appSocket = null;
        this.setAppSocket = function (socket) {
            this.appSocket = socket;
        }
        this.getAppSocket = function () {
            return this.appSocket
        };

        //////////////////////////message handler//////////////////////////////////
        this.showErrorMessage = function (message) {
            console.error(message);
            if (this.curScope && this.curScope.errorMessages) {
                // console.log('errors', message, this.curScope.errorMessages.indexOf(message), this.curScope.errorMessages);
                if (this.curScope.errorMessages.indexOf(message) == -1) {
                    this.curScope.errorMessages.push(message);
                    var self = this;
                    //auto close the error message after 5 seconds
                    setTimeout(function () {
                        self.curScope.errorMessages.pop();
                        self.curScope.safeApply();
                    }, 10000);
                    self.curScope.safeApply();
                }
            }
        };

        this.showProposalStepInfo = function (data, translate) {
            if (!data || !data.department || !data.role) {
                return
            }
            var departName = data.department.departmentName;
            var roleName = data.role.roleName;
            var str = translate('proposalStepShow') + departName + ', ' + translate('ROLE') + ': ' + roleName;
            servi.showConfirmMessage(str, 10000);
        }

        this.showConfirmMessage = function (message, time) {
            console.info(message);
            //disable confirm meesage for now
            if (!time) return;
            if (this.curScope && this.curScope.confirmMessages) {
                this.curScope.confirmMessages.push(message);
                var self = this;
                //auto close the message after 5 seconds
                setTimeout(function () {
                    self.curScope.confirmMessages.pop();
                    self.curScope.safeApply();
                }, time || 10000);
                self.curScope.safeApply();
            }
        };

        // There was an occasional problem that when the server restarted, many API requests would make many
        // reconnections, so many that the server reported "Resources Exceeded" and no reconnect ever succeeded!
        //
        // Calling reconnectSocket() is safer.  The setTimeout ensures that only one reconnect attempt is made
        // in any 15 second period.

        var socketReconnectInProgress = false;

        var reconnectSocket = function () {
            // If the timer indicates that a reconnection was attempted recently, then we will not try now.
            if (!socketReconnectInProgress) {
                this.curScope.connectSocket();
                socketReconnectInProgress = true;
                setTimeout(function () {
                    socketReconnectInProgress = false;
                }, 15000);
            }
        }.bind(this);

        /////////////////////////Socket functions///////////////////////////
        //common function for socket action handler
        this.$socket = function ($skt, key, sendData, successFunc, failFunc, showConfirm) {
            //if socket is disconnect, try to reconnect and show error message
            if (!$skt.connected) {
                reconnectSocket();
                // @consider: Rather than failing immediately, it may be preferable to queue the request until the reconnection succeeds, or until a timeout is reached.
                servi.showErrorMessage("Server can't be connected, please try again! 伺服器连接失败，请再度尝试！");
                if (failFunc && typeof(failFunc) === 'function') {
                    return failFunc();
                }
                return;
            }
            //var t = setTimeout(fnNoData, 1000 * 60);
            if (!servi.authService.checkActionPermission(key)) {
                console.error("You don't have permission for " + key + " action!");
                //this.showErrorMessage("You don't have permission for " + key + " action!");
                if (failFunc && typeof(failFunc) === 'function') {
                    return failFunc();
                }
                return;
            }
            var self = servi;
            var retKey = '_' + key;


            //remove some key start
            var stack = [];

            stack.push(sendData);
            while (stack.length && stack.length < 1000) {
                for (var j in stack[0]) {
                    if (typeof stack[0][j] === 'object') {
                        stack.push(stack[0][j]);
                    } else {
                        // console.log('%s: %s', j, stack[0][j]);
                        if (j == '$$hashKey') {
                            delete stack[0][j];
                        }

                    }
                }
                stack.shift();
            }
            // console.log('final sendData',sendData);
            // remove some key end


            $skt.emit(key, sendData);
            //$skt.removeAllListeners(retKey);
            $skt.once(retKey, function (data) {
                //$skt.removeAllListeners(retKey);
                //clearTimeout(t);
                if (data.success) {
                    //show confirmation message for all non-get actions
                    if (showConfirm || (key.indexOf("get") < 0 && key.indexOf("search") < 0)) {
                        self.showConfirmMessage(key + " action done!");
                    }
                    if (successFunc && typeof(successFunc) === 'function') {
                        return successFunc(data);
                    }
                } else {
                    if (data.error && (data.error.message || data.error.errorMessage)) {
                        console.error(retKey, data.error);
                        self.showErrorMessage($trans(data.error.message || data.error.errorMessage));
                        if (data.error.message) {
                            data.error.originalMessage = data.error.message;
                            data.error.message = $trans(data.error.message);
                        }
                        if (data.error.errorMessage) {
                            data.error.originalMessage = data.error.errorMessage;
                            data.error.errorMessage = $trans(data.error.errorMessage);
                        }
                    }
                    if (failFunc && typeof(failFunc) === 'function') {
                        return failFunc(data);
                    }
                }
            });
            //function fnNoData() {
            //    var answer = confirm("Data has not been received. Click 'OK' to continue waiting, or 'Cancel' to give up.");
            //    if (answer) {
            //        clearTimeout(t);
            //        t = setTimeout(fnNoData, 1000 * 60);
            //    }
            //    else {
            //        clearTimeout(t);
            //        $skt.removeAllListeners(retKey);
            //        return failFunc({error: "connection timed out"});
            //    }
            //}
        };


        // set a common storage start===================================
        var storage = {};
        this.clearValue = function () {
            storage = {};
        }
        this.setValue = function (para, value) {
            if (this.curScope.$parent.$$phase != '$apply' && this.curScope.$parent.$$phase != '$digest') {
                this.curScope.$apply(function () {
                    storage[para] = value;
                });
            }
            else {
                storage[para] = value;
            }
        }
        this.getValue = function (para) {
            if (storage.hasOwnProperty(para)) {
                return storage[para];
            } else return null;
        };
        // set a common storage end===========================================

        var proposalNodeData = {};
        this.getProposalNodeData = function () {
            return proposalNodeData;
        };

        this.setProposalNodeData = function (data) {
            proposalNodeData = data;
        };

        this.$compareObj = function (pre, after) {
            if (!pre || !after) {
                return {};
            }
            var result = {before: {}, after: {}};
            $.each(after, function (key, value) {
                if (pre.hasOwnProperty(key) && (pre[key] == after[key])) {

                } else {
                    result.before[key] = pre[key];
                    result.after[key] = value;
                }
            })
            return result;
        }

        this.$getIconList = function () {
            var iconArray = [
                "fa fa-adjust", "fa fa-adn", "fa fa-amazon", "fa fa-ambulance", "fa fa-anchor", "fa fa-android", "fa fa-angellist", "fa fa-apple", "fa fa-archive", "fa fa-area-chart", "fa fa-asterisk", "fa fa-at", "fa fa-automobile", "fa fa-backward", "fa fa-balance-scale", "fa fa-ban", "fa fa-bank", "fa fa-bar-chart", "fa fa-bar-chart-o", "fa fa-barcode", "fa fa-bars", "fa fa-battery-0", "fa fa-battery-1", "fa fa-battery-2", "fa fa-battery-3", "fa fa-battery-4", "fa fa-battery-empty", "fa fa-battery-full", "fa fa-battery-half", "fa fa-battery-quarter", "fa fa-battery-three-quarters", "fa fa-bed", "fa fa-beer", "fa fa-behance", "fa fa-behance-square", "fa fa-bell", "fa fa-bell-o", "fa fa-bell-slash", "fa fa-bell-slash-o", "fa fa-bicycle", "fa fa-binoculars", "fa fa-birthday-cake", "fa fa-bitbucket", "fa fa-bitbucket-square", "fa fa-bitcoin", "fa fa-black-tie", "fa fa-bluetooth", "fa fa-bluetooth-b", "fa fa-bold", "fa fa-bolt", "fa fa-bomb", "fa fa-book", "fa fa-bookmark", "fa fa-bookmark-o", "fa fa-briefcase", "fa fa-btc", "fa fa-bug", "fa fa-building", "fa fa-building-o", "fa fa-bullhorn", "fa fa-bullseye", "fa fa-bus", "fa fa-buysellads", "fa fa-cab", "fa fa-calculator", "fa fa-camera", "fa fa-camera-retro", "fa fa-car", "fa fa-cart-arrow-down", "fa fa-cart-plus", "fa fa-certificate", "fa fa-chain", "fa fa-chain-broken", "fa fa-child", "fa fa-chrome", "fa fa-circle", "fa fa-circle-o", "fa fa-circle-o-notch", "fa fa-circle-thin", "fa fa-clipboard", "fa fa-clock-o", "fa fa-clone", "fa fa-close", "fa fa-cloud", "fa fa-cloud-download", "fa fa-cloud-upload", "fa fa-cny", "fa fa-code", "fa fa-code-fork", "fa fa-codepen", "fa fa-codiepie", "fa fa-coffee", "fa fa-cog", "fa fa-cogs", "fa fa-columns", "fa fa-comment", "fa fa-comment-o", "fa fa-commenting", "fa fa-commenting-o", "fa fa-comments", "fa fa-comments-o", "fa fa-compass", "fa fa-compress", "fa fa-connectdevelop", "fa fa-contao", "fa fa-copy", "fa fa-copyright", "fa fa-creative-commons", "fa fa-credit-card", "fa fa-credit-card-alt", "fa fa-crop", "fa fa-crosshairs", "fa fa-css3", "fa fa-cube", "fa fa-cubes", "fa fa-cut", "fa fa-cutlery", "fa fa-dashboard", "fa fa-dashcube", "fa fa-database", "fa fa-dedent", "fa fa-delicious", "fa fa-desktop", "fa fa-deviantart", "fa fa-diamond", "fa fa-digg", "fa fa-dollar", "fa fa-dot-circle-o", "fa fa-download", "fa fa-dribbble", "fa fa-dropbox", "fa fa-drupal", "fa fa-edge", "fa fa-edit", "fa fa-eject", "fa fa-ellipsis-h", "fa fa-ellipsis-v", "fa fa-empire", "fa fa-envelope", "fa fa-envelope-o", "fa fa-envelope-square", "fa fa-eraser", "fa fa-eur", "fa fa-euro", "fa fa-exchange", "fa fa-exclamation", "fa fa-exclamation-circle", "fa fa-exclamation-triangle", "fa fa-expand", "fa fa-expeditedssl", "fa fa-external-link", "fa fa-external-link-square", "fa fa-eye", "fa fa-eye-slash", "fa fa-eyedropper", "fa fa-fax", "fa fa-feed", "fa fa-female", "fa fa-fighter-jet", "fa fa-film", "fa fa-filter", "fa fa-fire", "fa fa-fire-extinguisher", "fa fa-flag", "fa fa-flag-checkered", "fa fa-flag-o", "fa fa-flash", "fa fa-flask", "fa fa-flickr", "fa fa-floppy-o", "fa fa-folder", "fa fa-folder-o", "fa fa-folder-open", "fa fa-folder-open-o", "fa fa-font", "fa fa-fonticons", "fa fa-fort-awesome", "fa fa-forumbee", "fa fa-forward", "fa fa-foursquare", "fa fa-frown-o", "fa fa-futbol-o", "fa fa-gamepad", "fa fa-gavel", "fa fa-gbp", "fa fa-ge", "fa fa-gear", "fa fa-gears", "fa fa-genderless", "fa fa-get-pocket", "fa fa-gg", "fa fa-gg-circle", "fa fa-gift", "fa fa-glass", "fa fa-globe", "fa fa-graduation-cap", "fa fa-gratipay", "fa fa-group", "fa fa-h-square", "fa fa-hacker-news", "fa fa-hashtag", "fa fa-hdd-o", "fa fa-header", "fa fa-headphones", "fa fa-heart", "fa fa-heart-o", "fa fa-heartbeat", "fa fa-history", "fa fa-home", "fa fa-hospital-o", "fa fa-hotel", "fa fa-hourglass", "fa fa-hourglass-1", "fa fa-hourglass-2", "fa fa-hourglass-3", "fa fa-hourglass-end", "fa fa-hourglass-half", "fa fa-hourglass-o", "fa fa-hourglass-start", "fa fa-houzz", "fa fa-html5", "fa fa-i-cursor", "fa fa-image", "fa fa-inbox", "fa fa-indent", "fa fa-industry", "fa fa-info", "fa fa-info-circle", "fa fa-inr", "fa fa-instagram", "fa fa-institution", "fa fa-internet-explorer", "fa fa-intersex", "fa fa-ioxhost", "fa fa-italic", "fa fa-joomla", "fa fa-jpy", "fa fa-jsfiddle", "fa fa-key", "fa fa-keyboard-o", "fa fa-krw", "fa fa-language", "fa fa-laptop", "fa fa-lastfm", "fa fa-lastfm-square", "fa fa-leaf", "fa fa-leanpub", "fa fa-lemon-o", "fa fa-level-down", "fa fa-level-up", "fa fa-life-saver", "fa fa-lightbulb-o", "fa fa-line-chart", "fa fa-link", "fa fa-location-arrow", "fa fa-lock", "fa fa-long-arrow-down", "fa fa-long-arrow-left", "fa fa-long-arrow-right", "fa fa-long-arrow-up", "fa fa-magic", "fa fa-magnet", "fa fa-mail-forward", "fa fa-mail-reply", "fa fa-mail-reply-all", "fa fa-male", "fa fa-map", "fa fa-map-marker", "fa fa-map-o", "fa fa-map-pin", "fa fa-map-signs", "fa fa-mars", "fa fa-mars-double", "fa fa-mars-stroke", "fa fa-mars-stroke-h", "fa fa-mars-stroke-v", "fa fa-maxcdn", "fa fa-meanpath", "fa fa-medium", "fa fa-medkit", "fa fa-meh-o", "fa fa-mercury", "fa fa-microphone", "fa fa-microphone-slash", "fa fa-minus", "fa fa-minus-circle", "fa fa-minus-square", "fa fa-minus-square-o", "fa fa-mixcloud", "fa fa-mobile", "fa fa-mobile-phone", "fa fa-modx", "fa fa-money", "fa fa-moon-o", "fa fa-mortar-board", "fa fa-motorcycle", "fa fa-mouse-pointer", "fa fa-music", "fa fa-navicon", "fa fa-neuter", "fa fa-newspaper-o", "fa fa-object-group", "fa fa-object-ungroup", "fa fa-odnoklassniki", "fa fa-odnoklassniki-square", "fa fa-opencart", "fa fa-openid", "fa fa-opera", "fa fa-optin-monster", "fa fa-outdent", "fa fa-pagelines", "fa fa-paint-brush", "fa fa-paper-plane", "fa fa-paper-plane-o", "fa fa-paperclip", "fa fa-paragraph", "fa fa-paste", "fa fa-pause", "fa fa-pause-circle", "fa fa-pause-circle-o", "fa fa-paw", "fa fa-paypal", "fa fa-pencil", "fa fa-pencil-square", "fa fa-pencil-square-o", "fa fa-percent", "fa fa-phone", "fa fa-phone-square", "fa fa-photo", "fa fa-picture-o", "fa fa-pie-chart", "fa fa-pied-piper", "fa fa-pied-piper-alt", "fa fa-pinterest", "fa fa-pinterest-p", "fa fa-pinterest-square", "fa fa-plane", "fa fa-play", "fa fa-play-circle", "fa fa-play-circle-o", "fa fa-plug", "fa fa-plus", "fa fa-plus-circle", "fa fa-plus-square", "fa fa-plus-square-o", "fa fa-power-off", "fa fa-print", "fa fa-product-hunt", "fa fa-puzzle-piece", "fa fa-qrcode", "fa fa-question", "fa fa-question-circle", "fa fa-quote-left", "fa fa-quote-right", "fa fa-random", "fa fa-recycle", "fa fa-refresh", "fa fa-registered", "fa fa-remove", "fa fa-reorder", "fa fa-repeat", "fa fa-reply", "fa fa-reply-all", "fa fa-retweet", "fa fa-rmb", "fa fa-road", "fa fa-rocket", "fa fa-rotate-left", "fa fa-rotate-right", "fa fa-rouble", "fa fa-save", "fa fa-scissors", "fa fa-scribd", "fa fa-search", "fa fa-search-minus", "fa fa-search-plus", "fa fa-sellsy", "fa fa-send", "fa fa-send-o", "fa fa-server", "fa fa-share", "fa fa-share-alt", "fa fa-share-alt-square", "fa fa-share-square", "fa fa-share-square-o", "fa fa-shield", "fa fa-ship", "fa fa-shirtsinbulk", "fa fa-shopping-bag", "fa fa-shopping-basket", "fa fa-shopping-cart", "fa fa-sign-in", "fa fa-sign-out", "fa fa-signal", "fa fa-simplybuilt", "fa fa-sitemap", "fa fa-skyatlas", "fa fa-skype", "fa fa-slack", "fa fa-sliders", "fa fa-slideshare", "fa fa-smile-o", "fa fa-soccer-ball-o", "fa fa-soundcloud", "fa fa-space-shuttle", "fa fa-spinner", "fa fa-spoon", "fa fa-spotify", "fa fa-square", "fa fa-square-o", "fa fa-stack-exchange", "fa fa-stack-overflow", "fa fa-star", "fa fa-star-half", "fa fa-star-half-empty", "fa fa-star-half-full", "fa fa-star-half-o", "fa fa-star-o", "fa fa-stethoscope", "fa fa-sticky-note", "fa fa-sticky-note-o", "fa fa-stop", "fa fa-stop-circle", "fa fa-stop-circle-o", "fa fa-street-view", "fa fa-strikethrough", "fa fa-stumbleupon", "fa fa-stumbleupon-circle", "fa fa-subscript", "fa fa-subway", "fa fa-suitcase", "fa fa-sun-o", "fa fa-superscript", "fa fa-support", "fa fa-table", "fa fa-tablet", "fa fa-tachometer", "fa fa-tag", "fa fa-tags", "fa fa-tasks", "fa fa-taxi", "fa fa-television", "fa fa-tencent-weibo", "fa fa-terminal", "fa fa-th", "fa fa-th-large", "fa fa-th-list", "fa fa-thumb-tack", "fa fa-thumbs-down", "fa fa-thumbs-o-down", "fa fa-thumbs-o-up", "fa fa-thumbs-up", "fa fa-ticket", "fa fa-times", "fa fa-times-circle", "fa fa-times-circle-o", "fa fa-tint", "fa fa-toggle-down", "fa fa-toggle-left", "fa fa-toggle-off", "fa fa-toggle-on", "fa fa-toggle-right", "fa fa-toggle-up", "fa fa-trademark", "fa fa-train", "fa fa-transgender", "fa fa-transgender-alt", "fa fa-trash", "fa fa-trash-o", "fa fa-tree", "fa fa-trello", "fa fa-tripadvisor", "fa fa-trophy", "fa fa-truck", "fa fa-try", "fa fa-tty", "fa fa-tumblr", "fa fa-tumblr-square", "fa fa-turkish-lira", "fa fa-tv", "fa fa-twitch", "fa fa-twitter", "fa fa-twitter-square", "fa fa-umbrella", "fa fa-underline", "fa fa-undo", "fa fa-university", "fa fa-unlink", "fa fa-unlock", "fa fa-unlock-alt", "fa fa-unsorted", "fa fa-upload", "fa fa-usb", "fa fa-usd", "fa fa-user-md", "fa fa-user-secret", "fa fa-user-times", "fa fa-users", "fa fa-venus", "fa fa-venus-double", "fa fa-venus-mars", "fa fa-viacoin", "fa fa-video-camera", "fa fa-vimeo", "fa fa-vimeo-square", "fa fa-vine", "fa fa-vk", "fa fa-volume-down", "fa fa-volume-off", "fa fa-volume-up", "fa fa-warning", "fa fa-whatsapp", "fa fa-wheelchair", "fa fa-wifi", "fa fa-wikipedia-w", "fa fa-windows", "fa fa-won", "fa fa-wordpress", "fa fa-wrench", "fa fa-xing", "fa fa-xing-square", "fa fa-y-combinator", "fa fa-y-combinator-square", "fa fa-yelp", "fa fa-yen", "fa fa-youtube-play"
            ];
            return iconArray;
        };

        this.$getPropertyValueLength = function (obj, val, num_layer) {
            var count = 0;
            if (!obj) {
                return 0;
            }
            switch (num_layer) {
                case 1:
                    $.each(obj, function (i, v) {
                        if (v === val) {
                            count++;
                        }
                    });
                    break;
                case 2:
                    $.each(obj, function (i, v) {
                        if (!(v && typeof v === 'object')) {
                            return 0;
                        }
                        $.each(v, function (i, v) {
                            if (v === val) {
                                count++;
                            }
                        });
                    });
                    break;

            }
            return count;
        };

        this.$plotLine = function (id, data, newOption, clickData) {
            newOption = newOption || {};
            var togglePlot = function (seriesIdx) {
                var someData = somePlot.getData();
                someData[seriesIdx].lines.show = !someData[seriesIdx].lines.show;
                somePlot.setData(someData);
                somePlot.draw();
            };
            var options = {
                legend: {
                    show: true,
                    noColumns: 1, // number of colums in legend table
                    legend: {
                        labelFormatter: function (label, series) {
                            return '<a href="#" onClick="togglePlot(' + series.idx + '); return false;">' + label + '</a>';
                        }
                    }, // fn: string -> string
                    labelBoxBorderColor: "#ccc", // border color for the little label boxes
                    container: null, // container (as jQuery object) to put legend in, null means default on top of graph
                    position: "ne", // position of default legend container within plot
                    margin: 5, // distance from grid edge to default legend container within plot
                    backgroundColor: null, // null means auto-detect
                    backgroundOpacity: 0.85, // set to 0 to avoid background
                    sorted: null    // default to no legend sorting
                },
                series: {
                    lines: {
                        show: true,
                        lineWidth: 2, // in pixels
                        fill: false,
                        fillColor: null,
                        steps: false,
                        numbers: {show: true}
                    },
                    points: {
                        radius: 1,
                        show: true
                    }
                },
                axisLabels: {
                    show: true
                },
                xaxis: newOption.xaxis || {
                    tickLength: 0,
                    tickDecimals: 0
                },
                yaxis: {
                    minTickSize: 1,
                    tickDecimals: 0
                },
                xaxes: [{
                    position: 'bottom',
                    axisLabel: 'Time',
                }],
                yaxes: [{
                    position: 'left',
                    axisLabel: 'Number',
                }],
                //xaxis: {
                //    ticks: [[0, "One"], [2, "Two"],
                //        [4, "Three"], [6, "Four"], [8, "sdfg"], [10, "sdfgsdf"],
                //        [12, "sdfgsd"], [14, "sdfgsdf"], [16, "sdfgsd"], [18, "sdfgsdf"],
                //        [20, "sdfg"], [22, "sdfg"]]
                //},
                //yaxis: {
                //    ticks: [[0, "One"], [2, "Two"],
                //        [4, "Three"], [6, "Four"], [8, "sdfg"], [10, "sdfgsdf"],
                //        [12, "sdfgsd"], [14, "sdfgsdf"], [40, "sdfgsd"], [60, "sdfgsdf"],
                //        [80, "sdfg"], [100, "sdfg"]]
                //},
                grid: {
                    hoverable: true,
                    clickable: true
                }
            };
            var finalOption = $.extend({}, options, newOption);
            var item = $(id);
            var graph = null;
            if (item[0]) {
                graph = $.plot(item, data, finalOption);
            }
            return graph;
        };
        this.$getSpinnerString = function () {
            return '<i class="fa fa-spin fa-spinner fa-pulse fa-3x fa-fw margin-bottom"></i>';
        };

        this.$plotPie = function (id, data, newOption, clickData) {
            // console.log(id, data, newOption, clickData);
            if (data.length == 0) {
                $(id).text($trans('No data was found for current query.'));
                return;
            }
            $(id).text('');
            $(id).unbind();
            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            var options = {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        //tilt: 0.5,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.8
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0.05
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };

            var finalOption = $.extend({}, options, newOption);

            var item = $(id);
            if (item[0]) {
                $.plot(item, data, finalOption);
            }
            $(id).bind("plotclick", function (event, pos, obj) {
                if (!obj) {
                    return;
                }
                var percent = parseFloat(obj.series.percent).toFixed(2);
                servi.setValue(clickData, obj);
            });


        };
        this.$plotSingleBar = function (id, data, newOption, xLabel) {
            //console.log(id, data, showValue, xLabel);
            if (data.length == 0) {
                $(id).text($trans('No data was found for current query.'));
                return;
            }
            $(id).text('');
            var options = {
                xaxis: {
                    tickLength: 0,
                    ticks: xLabel
                },
                series: {
                    bars: {
                        show: true,
                        barWidth: .7,
                        align: "center",
                        numbers: {
                            show: true,
                            xAlign: function (x) {
                                return x;
                            },//align top
                            yAlign: function (y) {
                                return y;
                            }
                        }
                    },
                    points: {
                        radius: 2,
                        show: false
                    }
                },
                yaxis: {
                    minTickSize: 1,
                    tickDecimals: 0
                },
                grid: {
                    hoverable: true
                }
            };
            var finalOption = $.extend({}, options, newOption);
            $.plot($(id), [data], finalOption);//,
        };
        this.$plotOrderbars = function (id, data, showlabel) {
            var barWidth = 1 / (data.length + 5);
            var options = {
                legend: {
                    show: true,
                    noColumns: 1, // number of colums in legend table
                    labelFormatter: null, // fn: string -> string
                    labelBoxBorderColor: "#ccc", // border color for the little label boxes
                    container: null, // container (as jQuery object) to put legend in, null means default on top of graph
                    position: "ne", // position of default legend container within plot
                    margin: 5, // distance from grid edge to default legend container within plot
                    backgroundColor: null, // null means auto-detect
                    backgroundOpacity: 0.85, // set to 0 to avoid background
                    sorted: null    // default to no legend sorting
                },
                series: {
                    bars: {
                        show: true,
                        barWidth: barWidth,
                        order: 1
                    },
                    points: {
                        radius: 0,
                        show: true
                    },
                    numbers: {
                        show: true,
                        xAlign: function (x) {
                            return x;
                        },//align top
                        yAlign: function (y) {
                            return y + 3;
                        }
                        //yAlign: function(y) { return y+ 1; } //upside of bars
                    }
                },
                grid: {
                    hoverable: true
                }

            };
            var graph = $.plot($(id), data, options);
            if (showlabel) {
                var a = graph.getData().length;
                var barWidthInPixels = barWidth * graph.getXAxes()[0].scale;
                if (a > 0) {
                    for (var i = 0; i < a; i++) {
                        $.each(graph.getData()[i].data, function (x, val) {
                            var o = graph.pointOffset({x: val[0], y: val[1]});
                            $('<div class="data-point-label">' + val[1] + '</div>').css({
                                position: 'absolute',
                                left: o.left + (1.4 * i - a / 2 - 1) * barWidthInPixels,
                                top: o.top - 20,
                                display: 'none'
                            }).appendTo(graph.getPlaceholder()).fadeIn('slow');
                        })
                    }
                }
            }
        };
        this.$plotStack = function (id, data) {
            var options = {
                legend: {
                    show: true,
                    noColumns: 1, // number of colums in legend table
                    labelFormatter: null, // fn: string -> string
                    labelBoxBorderColor: "#ccc", // border color for the little label boxes
                    container: null, // container (as jQuery object) to put legend in, null means default on top of graph
                    position: "nw", // position of default legend container within plot
                    margin: 5, // distance from grid edge to default legend container within plot
                    backgroundColor: null, // null means auto-detect
                    backgroundOpacity: 0.85, // set to 0 to avoid background
                    sorted: null    // default to no legend sorting
                },
                series: {
                    stack: true,
                    bars: {
                        show: true, barWidth: 0.7, align: "center",
                        numbers: {
                            show: true,
                            xAlign: function (x) {
                                return x;
                            },//align top
                            yAlign: function (y) {
                                return y + 3;
                            }
                            //yAlign: function(y) { return y+ 1; } //upside of bars
                        }
                    },
                    points: {
                        radius: 0,
                        show: true
                    }

                },
                grid: {
                    hoverable: true
                }
            };
            $.plot($(id), data, options);
        }
    };
    var socketApp = angular.module('socketService', []);
    socketApp.provider('socketService', socketService);
});
