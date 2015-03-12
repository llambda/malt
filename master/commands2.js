// new command format.
// runRemotely is a function that takes 1 argument, a function,
// which it remotely executes on the minion, and returns a promise. 
// This allows a mix of local and remote code.

module.exports.randomjs = function (runRemotely, args) {
	this.name = 'randomjs';

	return runRemotely(function () {
		var random = require("random-js")(); // uses the nativeMath engine
		return random.integer(1, 100);
	});
}

module.exports.throw = function (runRemotely, args) {
	this.name = 'throw';

	return runRemotely(function () {
		throw new Error('I am supposed to throw this error.');
	});
}

module.exports.ping = function (runRemotely, args) {
	this.name = 'ping';

	var rrandom = function () {
		console.log('hi');
		return Math.random();
	};

	var startTime = process.hrtime();

	return runRemotely(rrandom).then(function (val) {

		var endTime = process.hrtime();
		console.log('hi');

		return [endTime[0] - startTime[0], endTime[1] - startTime[1]];
	})
}

module.exports.slowping = function (runRemotely, args) {
	this.name = 'slowping';

	var rrandom = function () {
		var Promise = require('bluebird');
    	var rando = Math.trunc(Math.random() * 4000);
    	return Promise.delay(rando).then(function () {
     	   return rando;
    	})
	};

	var startTime = process.hrtime();
	return runRemotely(rrandom)
	.then(function () {
		var endTime = process.hrtime();
		return [endTime[0] - startTime[0], endTime[1] - startTime[1]]
	})
}
