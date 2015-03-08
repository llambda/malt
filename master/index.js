#!/usr/bin/env node
'use strict';
const Promise = require('bluebird');
const WebSocketServer = require('websocket').server;
const http = require('http');
const mime = require('mime-types')
const commands = require('./commands');

const server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(7770, function() {
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

setInterval(function () {
    console.log('JOB# ' + JOB);
    if (minions.length > 0)
        console.log('# of connected minions ' + minions.length);
}, 5000);
 

function runCommandOnAllMinions(command, args) {
    return Promise.all(minions.map(function (minion) {
        return runRemotely(minion, command, args);
    }));
}

setInterval(function () {
    runCommandOnAllMinions(commands.ifconfig2);
}, 1000);

/**
 * Takes as minion.
 * Returns a function that takes a command string that will run on that minion.
 */
function runRemotely(connection, fn, args) {
    debugger;
    if (typeof fn !== 'function') throw new TypeError('I need a Function!');
    
    JOB++;

    let job = {};
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
    return job.promise;
}

wsServer.on('request', function(request) {

    // console.log(request.httpRequest);

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    let connection = request.accept('minion', request.origin);

    minions.push(connection);

    connection.on('message', function (message) {
        console.log((new Date()) + ' malt Connection accepted.');

        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
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
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});
