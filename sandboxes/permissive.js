'use strict';
var Promise = module.exports.Promise = require('bluebird');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'permissiveSandbox', level: 'debug'});

/**
 * Perissive sandbox, intended to allow a master to fully control a minion.
 */
module.exports = function() {

	return {
		Promise: require('bluebird'),
		log: log,
		autoinstall: require('autoinstall'),
		require: require,
		os: require('os'),
		dns: Promise.promisifyAll(require('dns')),
		child_process: Promise.promisifyAll(require('child_process')),
		fs: Promise.promisifyAll(require('fs')),
		http: Promise.promisifyAll(require('http')),
		path: Promise.promisifyAll(require('path')),
		dgram: Promise.promisifyAll(require('dgram')),
		net: Promise.promisifyAll(require('net')),
		url: Promise.promisifyAll(require('url'))
	}
}
