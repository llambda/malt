
/*

Commands run in a sandbox provided by the master.
Sandbox provides the global function 'rr' (think remote runner), which is a function that
takes a function and an array of arguments. The taken function executes remotely on the minion. 
rr tries to return values as Promises, so they can be composed with operations on the master.
Commands are functions that are executed both on the master and a minion.

This allows commands to run in a promise chain on both the master and the minion.

*/ 


// retval argument - return this instead of timing.
module.exports.ping = function (retval) {
	var args = Array.prototype.slice.call(arguments);

	console.log("I'm ping command and on the master now. My arguments are: " + JSON.stringify(args));

	var rrandom = function () {
		var args = Array.prototype.slice.call(arguments);
		console.log("I'm ping command and in the minion now. My arguments are: " + JSON.stringify(args));
		return Math.random(); // return some value to simulate some work done, not strictly necessary.
	};

	var startTime = process.hrtime(); // start couting ping time on the master.

	return rr(rrandom, args).then(function (val) {

		var endTime = process.hrtime(); // end couting time it took the minion to run the fn.
		console.log("I'm ping command on the master, and the minion finished its work.");

		if (retval) {
			return retval; 
		} else {
			return [endTime[0] - startTime[0], endTime[1] - startTime[1]];
		}
	})
}

module.exports.random = function (low, hi) {
	return rr(function (low, hi) { // This function executes in the minions.
			console.log('args are: ' + low + ' ' + hi);
			var random = require("random-js")(); // uses autoload to load the module.
			return random.integer(low, hi);
		}
	, [low, hi]);
}

module.exports.rthrow = function () {
	return rr(function () {
		throw new Error('I am supposed to throw this error on the minion.');
	});
}

module.exports.throw = function () {
	throw new Error('I am supposed to throw this error in the master.');
}


module.exports.slowping = function (multiplier) {

	if (!multiplier) {
		multiplier = 4000;
	}

	var rrandom = function (multiplier) {
		var Promise = require('bluebird');
    	var rando = Math.trunc(Math.random() * multiplier);
    	return Promise.delay(rando).then(function () {
     	   return rando;
    	})
	};

	var startTime = process.hrtime();
	return rr(rrandom, [multiplier])
	.then(function () {
		var endTime = process.hrtime();
		return [endTime[0] - startTime[0], endTime[1] - startTime[1]]
	})
}

module.exports.hostname = function () {
	return rr(function () {
		return os.hostname();
	});
}

module.exports.host = function(hostname) {
	return rr(function (hostname) {
		console.log(hostname);
		return dns.lookupAsync(hostname); 
	}, [hostname]);
}

module.exports.uptime = function () {
	return rr(function() {
	    var os = require('os');
	    return os.uptime();
	})
}

module.exports.osinfo = function (specific) {

	return rr(function(specific) {
	    var os = require('os');

	    if (specific) {
	    	return os[specific]();
	    } else return {
	        'hostname': os.hostname(),
	        'type': os.type(),
	        'platform': os.platform(),
	        'arch': os.arch(),
	        'release': os.release(),
	        'uptime': os.uptime(),
	        'loadavg': os.loadavg(),
	        'totalmem': os.totalmem(),
	        'freemem': os.freemem(),
	        'cpus': os.cpus(),
	        'networkInterfaces': os.networkInterfaces()
	    }
	}, [specific]);
};

module.exports.ifconfig = function () {
	return rr(function () {
		var streamToString = require('stream-to-string')
	    var spawn = require('child_process').spawn;
	    var p = spawn('ifconfig');
	    
	    return streamToString(p.stdout);
	});
}
