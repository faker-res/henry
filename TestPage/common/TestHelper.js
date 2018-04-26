(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);
    if (isNode) {
        WebSocket = require("ws");
    }

    var extractQueryFromInputs = function (context) {
        var obj = {};
        $('input, select, textarea', context).each(function () {
            var key = this.name || this.id;
            if (!key) {
                return;
            }
            var value = $(this).val();
            if (value) {
                obj[key] = value;

                if ($(this).attr('type') === 'number') {
                    obj[key] = Number(value);
                }
            }
        });
        return obj;
    };

    var parametersAreEmpty = function (obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
                    return false;
                }
            }
        }
        return true;
    };

    var displayDataInTextArea = function (obj, textArea) {
        // We do `"" +` to catch the case when obj===undefined and JSON.stringify returns undefined.
        var json = "" + JSON.stringify(obj, null, 2);
        $(textArea).text(json);

        // Now being ignored; overriden by jQuery settings element.style.width
        //var MAX_COLUMNS = 80;
        //var MAX_ROWS = 20;
        var MAX_COLUMNS = Infinity;
        var MAX_ROWS = Infinity;
        var rowCount = json.split('\n').length + 1;
        var displayRows = Math.min(MAX_ROWS, rowCount);
        var lineLengths = json.split('\n').map(function (line) {
            return line.length;
        });
        var longestLine = Math.max.apply(Math, lineLengths);
        var displayColumns = Math.min(MAX_COLUMNS, longestLine);
        $(textArea).attr({
            cols: displayColumns,
            rows: displayRows
        }).val(json);
    };

    var setAPIName = function (apiName) {
        displayFunctionNames(apiName);
        // Just in case we need it in future
        $('body').attr('data-api-service-name', apiName);
    };

    function displayFunctionNames(apiServiceName) {
        var serviceName = apiServiceName.replace(/^[^.]*\./, '');
        $('#pageContent [data-api-name]').each(function () {
            var $button = $(this);
            var functionName = $button.attr('data-api-name');
            //$button.text(apiName);
            //var $apiNameView = $button.next('.api-name-view');
            var $apiNameView = $button.closest('.test-container').find('.api-name-view');
            if ($apiNameView.length === 0) {
                $apiNameView = $('<div class="api-name-view">');
                //$button.after($apiNameView);
                var $testHeader = $button.closest('.test-container').prev('h3');
                $testHeader.after($apiNameView);
            }
            $apiNameView.empty()
                .append("<span>Service:&nbsp;</span>")
                .append($("<span class='api-service-name'>").text(serviceName))
                .append("<span>&nbsp;Function name:&nbsp;</span>")
                .append($("<span class='api-function-name'>").text(functionName));
        });
    }

    var attachListeners = function (whichAPI, where) {
        // Prettify
        $('.test-container', where).addClass('well');

        $("button[data-api-name]", where).each(function () {
            var button = $(this);
            var requestMessageBox = $('<textarea class="show" readonly>');
            var requestMessagePanel = $('<div>').append(requestMessageBox);
            var responseMessageBox = $('<textarea class="show" readonly>');
            var responseMessagePanel = $('<div>').append(responseMessageBox);
            // If button is all alone in a div, put the textareas before/after the parent div, not before/after the button
            //var putItWhere = button.parent().is('.test-container') ? button : button.parent();
            var putItWhere = button.parent().children().length === 1 ? button.parent() : button;
            putItWhere.before(requestMessagePanel);
            putItWhere.after(responseMessagePanel);

            $(this).on('click', function () {
                var element = $(this);
                var container = element.closest('.test-container');
                if (container.length === 0) {
                    console.warn("This element should be contained inside a .test-container:", this);
                    alert("Cannot gather query parameters because data-api-name element has no ancestor .test-container");
                }
                var queryParameters = extractQueryFromInputs(container);
                if (parametersAreEmpty(queryParameters)) {
                    queryParameters = null;
                }
                var apiFunctionName = element.attr('data-api-name');
                var apiFunction = whichAPI[apiFunctionName];
                if (!apiFunction) {
                    alert("There is no api function matching data-api-name='" + apiFunctionName + "'");
                    return;
                }
                // Might be empty
                displayDataInTextArea(queryParameters, requestMessageBox);
                // Show the player that the request is being made
                responseMessageBox.val("...");
                window.textareaToDisplayRequest = requestMessageBox;
                window.TestHelper = TestHelper;
                //console.log("Sending queryParameters to %s: %o", apiFunctionName, queryParameters);
                apiFunction.call(whichAPI, function (data) {
                    console.log("Response from %s: %o", apiFunctionName, data);
                    var displayDiv = $("textarea", container).last();
                    if (displayDiv.length === 0) {
                        console.warn("There should be a textarea below container:", container[0]);
                        alert("Response received but nowhere to display it!");
                    }
                    displayDataInTextArea(data, displayDiv);
                    displayDataInTextArea(data, '#responseMessage');
                    displayDataInTextArea(data, responseMessageBox);

                    if(data && data.data && data.data.noOfAttempt >3){
                        $('.playerCaptcha').show();
                    } else {
                        $('.playerCaptcha').hide();
                    }
                    element.trigger("received_response", data);
                }, queryParameters);
            });

            // Optional: Update the displayed request while the user is typing
            var testContainer = button.closest('.test-container');
            $(testContainer).find('input, select, textarea').filter('[name]').on('input', function () {
                var queryParameters = extractQueryFromInputs(testContainer);
                if (parametersAreEmpty(queryParameters)) {
                    queryParameters = null;
                }

                displayDataInTextArea(queryParameters, requestMessageBox);
            });
        });

        $('input, select, textarea', where).filter('[name]').each(function () {
            var $inputElem = $(this);
            var key = getStorageKeyForInput($inputElem);

            if (!key && this.tagName !== 'TEXTAREA') {
                console.warn("Unexpected: Could not generate storage key for input element:", this);
            }

            if (!key) return;

            // If we have a previously stored value for this parameter, then set the input
            if (window.localStorage && localStorage[key] !== undefined) {
                // But only set it if the input is currently empty (or on its default value).
                // In the case of selects, we just assume they are on their default.  It would be better to check, but more complicated.
                var currentValueIsDefault = $inputElem.val() === "" || $inputElem[0].tagName === 'SELECT';

                if (currentValueIsDefault) {
                    $inputElem.val(localStorage[key]);
                }
            }

            // After this input is edited, store the parameter in localStorage
            $inputElem.on('change', function () {
                var val = $inputElem.val();

                //console.log("%s => %s", key, val);

                if (window.localStorage) {
                    localStorage[key] = val;
                }
            });
        });
    };

    function getStorageKeyForInput ($inputElem) {
        var serviceName = $('body').attr('data-api-service-name');
        var apiName = $inputElem.closest('.test-container').find('button[data-api-name]').attr('data-api-name');
        var paramName = $inputElem.attr('name');

        if (serviceName && apiName && paramName) {
            return 'StoredParam:' + serviceName + '/' + apiName + ':' + paramName;
        } else {
            return null;
        }
    }

    var loginCookiePlayer = function(client, ClientPlayerAPITest){
        if(document.cookie && document.cookie.split("username=").length > 1) {
            var cookie_name = null;
            var cookie_password = null;

            var name = "username=";
            var password = "password=";
            var platform = "platform=";

            var getCookieParam = (param) => {
                var split = document.cookie.split(param);
                if (split && split[1]) {
                    return split[1].split(";")[0];
                }
            };

            var cookie_name = getCookieParam(name);
            var cookie_password = getCookieParam(password);
            var cookie_platform = getCookieParam(platform);

            var playerService = client.getService("player");
            var clientPlayerAPITest = new ClientPlayerAPITest(playerService);
            clientPlayerAPITest.login(function (data) {}, {
                platformId: cookie_platform,
                name: cookie_name,
                password: cookie_password,
                captcha: "testCaptcha"
            });
        }
    };

    function addReconnectOnCloseListener (client) {
        // Remove this later
        incrementClientCount();

        addCloseListener();

        // We use this to avoid creating a new timer if one is already set.
        var reconnectTimer = null;

        function addCloseListener () {
            client.addEventListener('close', function () {
                // We are getting a message from WebSocketClient these days anyway.
                //console.log("WebSocket closed.");
                // There may be a timer already waiting to check.  In that case there is no need to create another.
                if (!reconnectTimer) {
                    reconnectTimer = setTimeout(considerReconnect, 2000);
                }
            });
        }

        // Keeps trying to reconnect until successful
        function considerReconnect() {
            reconnectTimer = null;
            if (client._connection.readyState === client._connection.CLOSED) {
                console.log("Reconnecting...");
                client.connect();
                // Each connect() creates a new _connection, so we need a new listener
                addCloseListener();
                // Sometimes a 'close' event will be fired if connect() fails.  But sometimes not.  So sometimes we need this.
                reconnectTimer = setTimeout(considerReconnect, 5000);
            }
            else if (client._connection.readyState === client._connection.OPEN) {
                console.log("Reconnected.  You may need to log in again.");
            }
        }
    }

    // Currently each client we create is never destroyed.
    // If we switch between the same two pages 10 times, we will have 20 sockets open!
    // When we fix that, you can revert the commit that added this counter warning.
    var clientCount = 0;
    function incrementClientCount () {
        clientCount++;
        if (clientCount >= 40) {
            $('#clientCounter').removeClass('hide').html(clientCount + " sockets open!<p></p>Please refresh the page soon.");
        }
    }

    var TestHelper = {
        // This is the default.  It may be overridden below if we are running in development
        websocketIP: "101.78.133.210",
        wsMigration: "101.78.133.210",
        // This will be set later, based on WebSocketIP
        websocketURL: null,
        //
        cpmsWSURL: "ws://gameapi-server.neweb.me/websocketapi",
        pmsWSURL: "ws://203.192.151.11:8330/acc",
        smsWSURL: "ws://203.192.151.12:8560/sms",

        setAPIName: setAPIName,
        attachListeners: attachListeners,
        displayDataInTextArea: displayDataInTextArea,
        loginCookiePlayer: loginCookiePlayer,
        addReconnectOnCloseListener: addReconnectOnCloseListener,
    };

    // For development: If we are running the Test Page in a browser pointing at localhost, then point the sockets at localhost too
    if (!isNode && typeof window !== 'undefined') {
        var localNames = ['localhost', '127.0.0.1', '127.0.1.1', '0.0.0.0'];
        if (localNames.indexOf(window.location.hostname) >= 0) {
            TestHelper.websocketIP = window.location.hostname;
            TestHelper.wsMigration = window.location.hostname;
        }
    }

    TestHelper.websocketURL = "ws://" + TestHelper.websocketIP + ":9280";

    if (isNode) {
        module.exports = TestHelper;
    } else {
        define([], function () {
            return TestHelper;
        });
    }
})();



