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
 
setInterval(function () {

    Promise.all(minions.map(function (minion) {
        return runRemotely(minion, commands.getOS);
    })).then(console.log);
       

    // runRemotely(getOS).then(function (x) { console.log(x)});
}, 1000);

/**
 * Takes as minion.
 * Returns a function that takes a command string that will run on that minion.
 */
function runRemotely(connection, command) {
    if (!typeof command === 'string') throw new TypeError();
    
    JOB++;

    let job = {};
    job.id = JOB;
    job.eval = command;

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
    // connection.remoteAddresses.forEach(function (address) {
    //     minions.push(address, connection);
    // })

    debugger;

    // function runRemotely(command /* string*/) {
    //     JOB++;

    //     let job = {};
    //     job.id = JOB;
    //     job.eval = command;

    //     connection.sendUTF(JSON.stringify(job));

    //     job.connection = connection;
    //     job.promise = new Promise(function (resolver, rejecter) {
    //         job.resolver = resolver;
    //         job.rejecter = rejecter;
    //     });

    //     JOBS[job.id] = job;
    //     return job.promise;
    // }

    connection.on('message', function (message) {
        console.log((new Date()) + ' malt Connection accepted.');

        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
        }

        message = JSON.parse(message.utf8Data);

        debugger;

        const job = JOBS[message.id];

        if (message.error) {
            job.rejecter(message.error)
        } else {
            job.resolver(message.value)
        }
    })

    // connection.on('message', function(message) {
    //     if (message.type === 'utf8') {
    //         console.log('Received Message: ' + message.utf8Data);
    //     }
    //     else if (message.type === 'binary') {
    //         console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
    //     }
    // });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });

    function testCommand(fun) {
        const command = {};
        command.id = JOB++;
        command.script = fun.toString();
        command['content-type'] = mime.lookup('.js');

        connection.sendUTF(JSON.stringify(command));
    };

    // function getOS() {
    //     let OS = require('os');
    //     return os.hostname();
    // }

});
