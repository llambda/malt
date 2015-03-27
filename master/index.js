#!/usr/bin/env node
'use strict';
const Promise = require('bluebird');
const WebSocketServer = require('websocket').server;
const http = require('http');
const mime = require('mime-types')
const commands = require('./commands');
const express = require('express');
const _ = require('lodash');
const uuid = require('node-uuid');
const vm = require('vm');
const fntools = require('function-serialization-tools')

const app = express();
app.use(express.static(__dirname + '/static'));

const server = http.createServer(app).listen(7770, '0.0.0.0', function() {
    console.log((new Date()) + ' Malt master is listening on port 7770');
});

// https://www.npmjs.com/package/websocket


const wsServer = new WebSocketServer({
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

let JOB = 0;
let COMMAND = 0;
const JOBS = [];

const minions = [];
const browsers = [];

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

    return Promise.all(minions.map(function (minion) {
        // Non-sandbox way:
        // return pfn(newMinionJobRunner(minion, command), args);

        // Sandbox way: (for a little bit of protection)
        var sandbox = require('../sandboxes/restricted.js')();
        vm.createContext(sandbox);

        sandbox.rr = newMinionJobRunner(minion, command);
        sandbox.args = args;
        // return vm.runInContext('this.fn()(runner, args)', sandbox);
        // fntools.apply2s(fun, command.args), DefaultSandbox
        return Promise.try(function () {
            return vm.runInContext(fntools.apply2s(fn, args), sandbox);
        });
    }))
    .reflect()
    .then(function (promiseInspection) {
        if (promiseInspection.isFulfilled()) {
            command.value = promiseInspection.value();     
        } else {
            command.error = promiseInspection.error().toString();
        }
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

    let job = {};
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
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    if (_.contains(request.requestedProtocols, 'command')) {
        let connection = request.accept('command', request.origin);

        var msg = 'browser connected ' + request.remoteAddresses;
        browsers.map(function (connection) {
            connection.sendUTF(JSON.stringify(msg));
        })

        browsers.push(connection);

        connection.on('message', function (message) {
            var o = JSON.parse(message.utf8Data);
            if (o.message === 'newcommand' && o.command && commands[o.command]) {
                runFunctionOnAllMinions(commands[o.command], o.arguments);
            } else {
                console.error('Unknown command received');
            }
        })

        connection.on('close', function (reasonCode, description) {
            var msg = 'browser disconnected '+ connection.remoteAddresses;
            console.log(msg);
            _.remove(browsers, connection);

            browsers.map(function (connection) {
                connection.sendUTF(JSON.stringify(msg));
            })
        })

        return;
    }

    if (_.contains(request.requestedProtocols, 'minion')) {
        let connection = request.accept('minion', request.origin);
        minions.push(connection);

        var msg = 'minion connected ' + request.remoteAddresses;
        browsers.map(function (connection) {
            connection.sendUTF(JSON.stringify(msg));
        })

        connection.on('message', function (message) {

            if (message.type !== 'utf8') {
                console.error('Error: Received Message not utf8 type: ' + message);
            }

            message = JSON.parse(message.utf8Data);

            browsers.map(function (connection) {
                connection.sendUTF(JSON.stringify(msg));
            })

            const job = JOBS[message.id];

            if (message.error) {
                job.rejecter(message.error)
            } else {
                job.resolver(message.value)
            }
        })

        connection.on('close', function(reasonCode, description) {
            var msg = 'minion disconnected ' + connection.remoteAddress
            console.log(msg);
            _.remove(minions, connection);

            browsers.map(function (connection) {
                connection.sendUTF(JSON.stringify(msg));
            })
        });
    }

    // let connection = request.accept('minion', request.origin);
    // minions.push(connection);
    

});
