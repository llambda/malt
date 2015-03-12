
/**
 * Commands are functions that can be executed on the master as well as minions.
 * @param rr :Function . Executes function on the minion.
 * @param arguments :Array. Arguments given to the command by the user.
 */ 
module.exports.randomjs = function (rr, args) {
	// Here we are executing in the master.
	this.name = 'randomjs';

	return rr( // rr = remoteRunner
		function (args) { // This function executes in the minions.
			console.log('args are: ' + args);
			var random = require("random-js")(); // uses autoload to load the module.
			return random.integer(1, 100);
		}
	, args);
}

module.exports.throw = function (rr, args) {
	this.name = 'throw';

	return rr(function () {
		throw new Error('I am supposed to throw this error.');
	});
}

module.exports.ping = function (rr, args) {
	this.name = 'ping';

	var rrandom = function () {
		console.log('hi');
		return Math.random();
	};

	var startTime = process.hrtime();

	return rr(rrandom).then(function (val) {

		var endTime = process.hrtime();
		console.log('hi');

		return [endTime[0] - startTime[0], endTime[1] - startTime[1]];
	})
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
