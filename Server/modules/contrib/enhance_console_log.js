// enhance_console_log
// Replaces console.log .info .warn and .error with our own custom versions.
// So ALL future calls to console.log etc. will go through here.
// Adds the location-of-caller (file and line number), and the date.

// Oh look, someone else did something pretty similar: https://github.com/itadakimasu/console-plus/blob/master/console-plus.js

//var Logger = require('devnull');
//var logger = new Logger({namespacing : 0});
var sunlogger = require('./sunlogger');
var tty = require("tty");
var colors = require("colors/safe");

var config = {
	// Display the date and time of the log
	dateOnLeft: false,

	// Display the filename and line number of the call to console.log, and also stack functions.
	locationOnLeft: true,
	locationOnRight: false
};

// We don't need to decide whether to add colors or not.
// This is already decided by supports-colors.js, which can be configured by passing --color or --no-color
//var outputColors = tty.isatty(process.stdout.fd) || process.env.LOG_COLORS;

// // For aligning postfix to the right of the terminal
// var rightColumn = 80;
// // Be careful, we might not be running in Node!
// try {
// 	rightColumn = Number( process.stdout.columns || 80 );
// } catch (e) {}
// // That worked, but we can't really do anything with it, since we don't know the length of the line that will appear, because it is rendered by realLogFunctions.log
// // If we are in Node, we could format the string ourselves, by calling util.format(), which is what console.log() uses under the hood.

var realLogFunctions = {};

// Export them in case anyone else needs them...?
//console.realLogFunctions = realLogFunctions;

var toAdapt = ["log", "info", "warn", "error"];

toAdapt.forEach(function(level){
	realLogFunctions[level] = console[level];
	global.console[level] = adapted(level);
});

function adapted(level) {
	return function() {
		var args = sunlogger.argumentsToList(arguments);

		// The level or channel is actually redundant information if we are using colour to represent it.
		var prefix = '[' + level + ']';
		// Add the date
		if (config.dateOnLeft) {
			prefix = sunlogger.simpleDateString() + ' ' + prefix;
		}
		if (config.locationOnLeft) {
			prefix += ' ' + colors.grey(sunlogger.getLocationOfCaller());
		}

		prefix = addColorTo(prefix, level);

		// Remember that console functions do special things if the first argument is a string containing '%'s
		// So we escape any '%'s that we add, and if the first argument is a string, we add to it, rather than unshift it.
		prefix = prefix.replace(/%/g, '%%');
		if (typeof args[0] === 'string') {
			args[0] = prefix + ' ' + args[0];
		} else {
			args.unshift(prefix);
		}

		if (config.locationOnRight) {
			var postfix = sunlogger.getLocationOfCaller();
			postfix = '   ' + colors.blue(postfix);
			args.push(postfix);
		}

		realLogFunctions[level].apply(null,args);
	};
}

function addColorTo(str, level) {
	// If you want colours even when tee-ing to a file during development, then add the following, to ensure we aren't in production:
	//
	//     || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === ''
	//
	var col = levelsToColor[level] || "magenta";
	if (col) {
		str = colors[col](str);
	}
	if (level === 'warn' || level === 'error') {
		str = colors.bold(str);
	}
	return str;
}

var levelsToColor = {
	debug: "grey",
	log:   "blue",
	info:  "cyan",
	warn:  "yellow",
	error: "red"
};
