#!/usr/bin/env node
'use strict';

var program = require('commander');
var packagejson = require('./package.json');
var path = require('path');

program
.version(packagejson.version)
.option('-d, --debug', 'Debug')
.option('-p, --port <n>', 'Listen Port', parseInt)
.parse(process.argv);

var Minion = require('./lib/master')(program);
