#!/usr/bin/env node
'use strict';

var program = require('commander');
var packagejson = require('./package.json');
var path = require('path');

program
.version(packagejson.version)
.option('-d, --debug', 'Debug')
.option('-h, --host <name>', 'Hostname to connect to')
.option('-p, --port <n>', 'Connect to port', parseInt)
.parse(process.argv);

var Minion = require('./lib/minion')(program);
