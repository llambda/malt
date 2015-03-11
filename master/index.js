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
    // debugger;
    browsers.map(function (connection) {
        var o = {};
        o.message = 'commanddone';
        o.response = command.value;
        o.id = command.id;
        o.command = command.command;
        debugger;
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
    if (!job.promise.isFulfilled()) {
        throw new Error("Promise must be fullfilled.");
    }
    var o = {};
    o.message = 'jobdone';
    o.id = job.id;
    o.command = job.command;
    // o.minion = minion;

    if (job.promise.isRejected())
        o.error = job.promise.reason();
    else 
        o.value = job.promise.value();

    browsers.map(function (connection) {
        connection.sendUTF(JSON.stringify(o));
    })
}

// dont use anymore
function runCommandOnAllMinions(command, args) {
    return Promise.all(minions.map(function (minion) {
        return runRemotely(minion, command, args).promise;
    }))
    .then(updateBrowsers)
}

// command is a command name (string)
function runCommandOnAllMinions2(command /* command name :String */, args) {
    var commandO = {};
    commandO.id = uuid.v1();
    commandO.jobs = [];
    commandO.command = command;
    commandO.args = []; // todo.

    return Promise.all(minions.map(function (minion) {
        var job = runRemotely(minion, command, args);
        commandO.jobs.push(job);
        job.promise.then(function () {
            jobDone(job);
        });
        return job.promise;
    }))
    .then(function (value) {
        commandO.value = value;
        updateBrowsers(commandO);
    })
}

// setInterval(function () {
//     runCommandOnAllMinions2(commands.osinfo, ['yahoo.com'])
//     // .then(console.log)
// }, 1000);

/**
 * Takes as minion.
 * Returns a function that takes a command string that will run on that minion.
 */
function runRemotely(connection, command, args) {
    // if (typeof fn !== 'function') {
    //     debugger;
    //     throw new TypeError('I need a Function!');
    // }
    
    JOB++;

    let job = {};
    job.message = 'newjob';
    job.id = JOB;
    job.command = command;
    job.script = commands[command].toString();
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

            // debugger;
            if (o.message === 'newcommand') {
                runCommandOnAllMinions2(o.command, o.arguments);
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
