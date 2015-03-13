'use strict';
let Promise = module.exports.Promise = require('bluebird');

/**
 * Perissive sandbox, intended to allow a master to fully control a minion.
 */
module.exports = function() {

	return {
		autoinstall: require('autoinstall'),
		console: console,
		require: require,
		os: require('os'),
		dns: require('dns'),
		child_process: Promise.promisifyAll(require('child_process')),
		fs: Promise.promisifyAll(require('fs')),
		http: Promise.promisifyAll(require('http')),
		path: Promise.promisifyAll(require('path')),
		dgram: Promise.promisifyAll(require('dgram')),
		net: Promise.promisifyAll(require('net')),
		url: Promise.promisifyAll(require('url'))
	}
}
