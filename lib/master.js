'use strict';

module.exports = function(program) {

var Promise = require('bluebird');
var WebSocketServer = require('websocket').server;
var http = require('http');
var mime = require('mime-types')
var commands = require('./commands');
var express = require('express');
var _ = require('lodash');
var uuid = require('node-uuid');
var vm = require('vm');
var fntools = require('function-serialization-tools')

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'master', level: 'debug'});

var app = express();
app.use(express.static(__dirname + '/static'));


var port = program.port || 3417;

var server = http.createServer(app).listen(port, '0.0.0.0', function() {
    log.info('malt master listening on port', port);
});

// https://www.npmjs.com/package/websocket


var wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  return true;
}

var JOB = 0;
var COMMAND = 0;
var JOBS = [];

var minions = [];
var browsers = [];

function updateBrowsers(command) {
    browsers.map(function (connection) {
        var o = {};
        o.command = command.name;
        o.message = 'commanddone';
        o.response = command.value;
        o.error = command.error;
        o.errorstack = command.errorstack;
        o.id = command.id;
        connection.sendUTF(JSON.stringify(o));
    })

    return command;
}

function jobDone(job) {
    if (job.promise.isPending()) {
        throw new Error("Job's promise must not be pending.");
    }
    var o = {};
    o.message = 'jobdone';
    o.id = job.id;
    o.command = job.command;
    // o.minion = minion;

    if (job.promise.isRejected()) { // promise failed
        o.error = job.promise.reason();
    } else { 
        o.value = job.promise.value(); // promise succeeded
    }

    browsers.map(function (connection) {
        connection.sendUTF(JSON.stringify(o));
    })

    return job.promise;
}

// fn is a command function,
// e.g. a function that takes a runRemotely function
function runFunctionOnAllMinions(fn, args) {
    var command = {};
    // command.id = uuid.v1();
    command.id = COMMAND++;
    command.jobs = [];
    command.command = fn.name ? fn.name : fn.toString();
    command.args = args;

    return Promise.settle(minions.map(function (minion) {
        // Non-sandbox way:
        // return pfn(newMinionJobRunner(minion, command), args);

        // Sandbox way: (for a little bit of protection)
        var sandbox = require('../sandboxes/restricted.js')();
        vm.createContext(sandbox);

        sandbox.rr = newMinionJobRunner(minion, command);
        sandbox.args = args;
        // return vm.runInContext('this.fn()(runner, args)', sandbox);
        // fntools.apply2s(fun, command.args), DefaultSandbox
        var promise = Promise.try(function () {
            return vm.runInContext(fntools.apply2s(fn, args), sandbox);
        });

        promise.remoteAddress = minion.remoteAddress;
        return promise;
    }))
    .then(function (results) {

        results = results.map(function (r) {
            var o = {};
            debugger
            o.remote = r.minion;

            if (r.isFulfilled()) {
                o.value = r.value();
            } else if (r.isRejected()) {
                o.error = r.reason();
            }

            return o;
        });

        var x = _.zip(minions.map(function (minion) {
            return minion.remoteAddress;
        }), results);

        command.value = x;

        updateBrowsers(command);
        return command;
    })
}

function newMinionJobRunner(minionConnection, command) {
    return function runRemotely(fn, args) {
        return Promise.try(function () {
            var job = startRemoteJob(minionConnection, fn, args);
            command.jobs.push(job);
            return job.promise.reflect().then(function () {
                jobDone(job);
                return job.promise;
            });
        });
    }
}

function startRemoteJob(connection, fn, args) {
    if (typeof fn !== 'function') {
        throw new TypeError('I need a Function!');
    }
    
    JOB++;

    var job = {};
    job.message = 'newjob';
    job.id = JOB;
    job.script = fn.toString();
    job.args = args;

    connection.sendUTF(JSON.stringify(job));

    job.connection = connection;
    job.promise = new Promise(function (resolver, rejecter) {
        job.resolver = resolver;
        job.rejecter = rejecter;
    });

    JOBS[job.id] = job;
    return job;
}

wsServer.on('request', function(request) {

    if (!originIsAllowed(request.origin)) {
      request.reject();
      log.warn('Rejected connection from origin ', request.origin);
      return;
    }

    if (_.contains(request.requestedProtocols, 'command')) {
        var connection = request.accept('command', request.origin);

        var msg = 'browser connected ' + request.remoteAddresses + ' ' + request.httpRequest.headers['user-agent'];
        log.info(msg);
        browsers.map(function (connection) {
            connection.sendUTF(JSON.stringify(msg));
        })

        browsers.push(connection);

        connection.on('message', function (message) {
            var o = JSON.parse(message.utf8Data);
            if (o.message === 'newcommand' && o.command && commands[o.command]) {
                runFunctionOnAllMinions(commands[o.command], o.arguments);
            } else {
                log.error('Unknown command received ', o);
            }
        })

        connection.on('close', function (reasonCode, description) {
            var msg = 'browser disconnected '+ connection.remoteAddresses + ' ' + request.httpRequest.headers['user-agent'];
            log.info(msg);
            _.remove(browsers, connection);

            browsers.map(function (connection) {
                connection.sendUTF(JSON.stringify(msg));
            })
        })

        return;
    }

    if (_.contains(request.requestedProtocols, 'minion')) {
        var connection = request.accept('minion', request.origin);
        minions.push(connection);

        var msg = 'minion connected ' + request.remoteAddresses;
        log.info(msg);
        browsers.map(function (connection) {
            connection.sendUTF(JSON.stringify(msg));
        })


        connection.on('message', function (message) {

            if (message.type !== 'utf8') {
                log.error('Error: Received Message not utf8 type: ' + message);
            }

            message = JSON.parse(message.utf8Data);

            browsers.map(function (connection) {
                connection.sendUTF(JSON.stringify(msg));
            })

            var job = JOBS[message.id];

            if (message.error) {
                job.rejecter(message.error)
            } else {
                job.resolver(message.value)
            }
        })

        connection.on('close', function(reasonCode, description) {
            var msg = 'minion disconnected ' + connection.remoteAddress
            log.info(msg);
            _.remove(minions, connection);

            browsers.map(function (connection) {
                connection.sendUTF(JSON.stringify(msg));
            })
        });
    }

    // var connection = request.accept('minion', request.origin);
    // minions.push(connection);
    

});

}
