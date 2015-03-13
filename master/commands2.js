
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
		console.log("I'm ping command and in the minion now. My arguments are: "
		 + JSON.stringify(args);
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

module.exports.randomjs = function (rr, args) {
	// Here we are executing in the master.
	this.name = 'randomjs';

	return rr( // rr = remoteRunner
		function (low, hi) { // This function executes in the minions.
			console.log('args are: ' + low + ' ' + hi);
			var random = require("random-js")(); // uses autoload to load the module.
			return random.integer(low, hi);
		}
	, args);
}

module.exports.throw = function (rr, args) {
	this.name = 'throw';

	return rr(function () {
		throw new Error('I am supposed to throw this error.');
	});
}


module.exports.slowping = function (rr, args) {
	this.name = 'slowping';

	var rrandom = function () {
		var Promise = require('bluebird');
    	var rando = Math.trunc(Math.random() * 4000);
    	return Promise.delay(rando).then(function () {
     	   return rando;
    	})
	};

	var startTime = process.hrtime();
	return rr(rrandom)
	.then(function () {
		var endTime = process.hrtime();
		return [endTime[0] - startTime[0], endTime[1] - startTime[1]]
	})
}
