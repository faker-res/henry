var fs = require("fs");

// getLocationOfCaller() could consider using frame.getFunctionName() instead of parsing the stacktrace.
// For example: http://www.devthought.com/2011/12/22/a-string-is-not-an-error/
// Or for browser compatibility, use https://github.com/stacktracejs/stacktrace.js

// TODO: Alignment should probably handled by caller (enhance_console_log.js) because it prefixes the lines we return
// with '[log]' or '[error]' which have different lengths!

var config = {
	/* Displays the top few function names from the stack trace, to show where the call came from. */
	showFunctionPath: false,

	/* Left pads the output, so that they appear aligned even when the length of filenames change. */
	initialAlignment: 35,

	/* Adapt when the filename grows longer than the initialAlignment. */
	updateAlignment: false,

	/* Truncate the location if it grows too long. */
	/* This is probably a better solution to the alignment problems addressed by the options above. */
	locationMaximumLength: 35

};

// This has become deprecated as a logger in favour of enhance_console_log.js
// But some of its useful functions are being used by that logger, and elsewhere!

function summariseRequest(req) {
	var userinfo = summariseUser(req);
	return req.method+" "+req.path+" ("+userinfo+" @ "+req.ip+") ["+req.header("Accept")+"]";
	// Other interesting properties of req:
	//   req._route_index (indicates the handler function number?)
	//   req.sessionID (could track non-logged-in users between requests, separate those from shared IP)
	//   req.headers (note: an object, not an array)
}

function summariseUser(req) {
	return typeof req.session.user === "undefined" ? "_unknown_" : req.session.user.username + " id:"+req.session.user._id;
}

// I was stupid.  Array.prototype.slice.apply works fine, as long as we give it [0] or nothing.  I was giving it 0 duh.
function argumentsToList(args) {
	/*
	var list = [];
	for (var i=0;i<args.length;i++) {
		list[i] = args[i];   // Apparently faster than .push
	}
	return list;
	*/
	return Array.prototype.slice.apply(args);
}

function simpleDateString(date) {
	date = date || new Date();
	var today = date.getFullYear()+"/"+padLeft(date.getMonth()+1,2,'0')+"/"+padLeft(date.getDate(),2,'0');
	return today + " " + date.toLocaleTimeString();
}

function getStackTrace(linesToDrop) {
	var stack;
	try {
		throw new Error("DUMMY_ERROR_FOR_STACKTRACE");
	} catch (e) {
		stack = e.stack || "no_stacktrace_found for "+err;
		if (typeof linesToDrop == "number") {
			linesToDrop += 2;   // Also drop the error message, and the call to this function.
			var stackElements = (""+stack).split("\n");
			stackElements.splice(0,linesToDrop);
			stack = stackElements.join("\n");
		}
	}
	// Note that this throw-and-catch trick can also be used in browsers, and even in Java, whenever we want to find the filename and line number of the function call which called us.  This can be used by loggers to infuse innocent log or info messages with filenames and line numbers, even if no errors were involved.
	return stack;
}

var longestCodeLocation = config.initialAlignment;
function getLocationOfCaller(linesToDrop) {
	if (typeof linesToDrop != "number") {
		linesToDrop = 0;
	}
	var stack = getStackTrace(linesToDrop+2);
	var lines = stack.split("\n");
	// Sometimes we are deep inside our logging functions.  We can skip some of them.
	lines = lines.filter(function(line){
		return !line.match(/ at (logRequest|logError|Object\.logError) /);
	});
	var firstLine = lines[0];
	var codeLocation;
	//console.log(stack);
	try {
		// codeLocation = firstLine.match(/\((.*)\)$/)[0];   // Pick out just the filename/number
		// codeLocation = firstLine.replace(/^ *at /,'');   // Keep the function name, reject ever-present stuff
		// codeLocation = firstLine.replace(/^ *at (.*) \((.*)\)$/,'($2|$1)');   // Same but switch order and reformat

		// Reduce the length of the string by dropping current folder.
		//var workingFolder = fs.realpathSync(.);
		//codeLocation = codeLocation.replace(workingFolder+"/",'');

		// Extract the bits, minify them, and recombine them.
		//console.log(firstLine);
		// I usually expect lines like this:
		//    at Router._dispatch (/Users/joey/citizenpower/node_modules/express/lib/router/index.js:170:5)
		// But some lines on Mac have no function name, and no brackets around the path:
		//    at /Users/joey/citizenpower/routes/routes.js:182:3
		var match = firstLine.match(/^ *at (.*) \((.*)\)$/);
		var functionPath, filenameAndLinenumber;
		if (match) {
			functionPath = match[1];
			filenameAndLinenumber = match[2];
		} else { // Mac
			match = firstLine.match(/^ *at (.*)$/);
			functionPath = "_unknown_";
			filenameAndLinenumber = match[1];
		}
		filenameAndLinenumber = filenameAndLinenumber.split("/").slice(-2).join("/");
		functionPath = functionPath.split(".").slice(-3).join(".");

		codeLocation =  filenameAndLinenumber + (config.showFunctionPath ? '|' + functionPath : '');

		// If the location string exceeds the maximum allowed length, truncate it
		// We subtract 2 because later we will add '(...)'s.
		if (config.locationMaximumLength && codeLocation.length > config.locationMaximumLength - 2) {
			codeLocation = '..' + codeLocation.substring(codeLocation.length - config.locationMaximumLength + 2 + 2, codeLocation.length);
		}

		codeLocation = '(' + codeLocation + ')';

	} catch (e) {
		// codeLocation = "getLocationOfCaller_FAILED:"+e;
		// codeLocation = "CouldNotFindLocationIn >>"+firstLine+"<<";
		codeLocation = "_no_location_";
	}

	// But let's apply a limit to this. Some locations are very long; these should not affect our padding.
	if (config.updateAlignment && codeLocation.length < 60) {
		// We left-align all log messages (although not pre-emptively).
		longestCodeLocation = Math.max(longestCodeLocation, codeLocation.length);
	}
	codeLocation = padRight(codeLocation,longestCodeLocation);

	return codeLocation;
	// DONE: Some of the reported "function names" can get quite long, e.g.
	//   "module.exports.app.post.projectProvider.update.name"
	//   "Promise.module.exports.app.get.Project.findByName.populate.exec.res.render.project"
	// We may want to reduce them to the last few parts?
	// The same may be considered for filenames too:
	//   node_modules/express/lib/router/index.js
	// (In Java I usually logged the class and method name, but not the class's package!)
}

function padLeft(str,len,padChar) {
	padChar = padChar || ' ';
	str = ""+str;
	while (str.length < len) {
		str = padChar + str;
	}
	return str;
}

function padRight(str,len,padChar) {
	padChar = padChar || ' ';
	str = ""+str;
	while (str.length < len) {
		str += padChar;
	}
	return str;
}


module.exports = {
	summariseRequest: summariseRequest,
	summariseUser: summariseUser,   // NOTE: Accepts a request, not a user!
	argumentsToList: argumentsToList,
	getStackTrace: getStackTrace,
	getLocationOfCaller: getLocationOfCaller,
	simpleDateString: simpleDateString,
	padLeft: padLeft,
	padRight: padRight
};
