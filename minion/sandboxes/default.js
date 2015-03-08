'use strict';
let Promise = module.exports.Promise = require('bluebird');

module.exports = function() {

	return {
		require: require,
		os: require('os'),
		dns: require('dns'),
		child_process: Promise.promisifyAll(require('child_process'))
	}
}
