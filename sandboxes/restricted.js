'use strict';
var Promise = module.exports.Promise = require('bluebird');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'restrictedSandbox', level: 'debug'});

/**
 * Somewhat restricted sandbox, intended to run command code in masters
 * in a somewhat restricted wauy.
 */
module.exports = function() {

	var o = {};
	o.log = log;
	o.process = {};
	o.process.hrtime = process.hrtime;
	o.process.uptime = process.uptime;

	return o;
}
