#!/usr/bin/env node
'use strict';
const Promise = require('bluebird');
const WebSocketServer = require('websocket').server;
const http = require('http');
const mime = require('mime-types')
const commands = require('./commands2');
const express = require('express');
const _ = require('lodash');
const uuid = require('node-uuid');

const app = express();
app.use(express.static(__dirname + '/static'));

const server = http.createServer(app).listen(7770, function() {
    console.log((new Date()) + ' Server is listening on port 7770');
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
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

let JOB = 0;
const JOBS = [];

const minions = [];
const browsers = [];

// setInterval(function () {
//     console.log('JOB# ' + JOB);
//     if (minions.length > 0)
//         console.log('# of connected minions ' + minions.length);
// }, 5000);
 

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

// function updateBrowsers(data) {
//     browsers.map(function (connection) {
//         connection.sendUTF(JSON.stringify(data));
//     })
// }

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
    command.id = uuid.v1();
    command.jobs = [];
    command.command = fn.name ? fn.name : fn.toString();
    command.args = args;

    return Promise.all(minions.map(function (minion) {
        var pfn = Promise.method(fn);
        // var x = pfn(newMinionJobRunner(minion, command), args);
        return pfn(newMinionJobRunner(minion, command), args);
    }))
    .then(function (value) {
        console.log('**** derp ***** ')
        console.log(command);
        console.log(value);
        console.log('**** derp ***** ')
        command.value = value;
        updateBrowsers(command);

        return command;
    })
    .catch(function (error) {
            console.log(command);

        command.error = error.message;
        command.errorstack = error.stack;
        updateBrowsers(command);

        return command;
    })
}

function newMinionJobRunner(minionConnection, command) {
    return function runRemotely(fn, args) {
        return Promise.try(function () {
            var job = startRemoteJob(minionConnection, fn, args);
            command.jobs.push(job);
            return job.promise.then(function () {
                jobDone(job);
                return job.promise;
            }, function () {
                jobDone(job);
                return job.promise;
            })
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
    // job.command = command;
    // if(!commands[command]) {
    //     throw new Error('no command ' + command);
    // }
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
    // console.log(request.httpRequest);

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    if (_.contains(request.requestedProtocols, 'command')) {
        let connection = request.accept('command', request.origin);

        browsers.push(connection);

        connection.on('message', function (message) {
          console.log((new Date()) + ' ' + JSON.stringify(message) + ' command message received.');

            var o = JSON.parse(message.utf8Data);

            if (o.message === 'newcommand') {
                runFunctionOnAllMinions(commands[o.command], o.arguments);
            } else {
                console.log('unknown command received');
            }
          
          // if (message.utf8Data === 'refresh') {
          //   console.log('REFRESHAHHH');
          // }
        })

        connection.on('close', function (reasonCode, description) {
          console.log((new Date()) + ' command Connection closed '+ reasonCode + ' ' + description);
          _.remove(browsers, connection);
        })

        return;
    }

    let connection = request.accept('minion', request.origin);

    minions.push(connection);

    connection.on('message', function (message) {
        console.log((new Date()) + ' minion connection accepted.');

        if (message.type === 'utf8') {
            // console.log('Received Message: ' + message.utf8Data);
        }

        message = JSON.parse(message.utf8Data);

        const job = JOBS[message.id];

        if (message.error) {
            job.rejecter(message.error)
        } else {
            job.resolver(message.value)
        }
    })

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Minion ' + connection.remoteAddress + ' disconnected.');
        _.remove(minions, connection);
    });
});
