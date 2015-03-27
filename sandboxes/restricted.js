'use strict';
var Promise = module.exports.Promise = require('bluebird');

/**
 * Somewhat restricted sandbox, intended to run command code in masters
 * in a somewhat restricted wauy.
 */
module.exports = function() {

	var o = {};
	o.console = console;
	o.process = {};
	o.process.hrtime = process.hrtime;
	o.process.uptime = process.uptime;

	return o;
}
