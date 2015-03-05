#!/usr/bin/env node
'use strict';
var Promise = require('bluebird');
var WebSocketServer = require('websocket').server;

var http = require('http');

var commands = require('./commands');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(7770, function() {
    console.log((new Date()) + ' Server is listening on port 7770');
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
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

var JOB = 0;
var JOBS = [];

var minions = [];
 
setInterval(function () {

    minions.map(runRemotely).map(function (x) {
        return x(commands.getOS);
    })

    // runRemotely(getOS).then(function (x) { console.log(x)});
}, 1000);

/**
 * Takes as minion.
 * Returns a function that takes a command string that will run on that minion.
 */
function runRemotely(connection) {
    return function(command) {
        if (!typeof command === 'string') throw new TypeError();
        
        JOB++;

        var job = {};
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
}

wsServer.on('request', function(request) {

    // console.log(request.httpRequest);

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('minion', request.origin);

    minions.push(connection);
    // connection.remoteAddresses.forEach(function (address) {
    //     minions.push(address, connection);
    // })

    debugger;

    // function runRemotely(command /* string*/) {
    //     JOB++;

    //     var job = {};
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

        var job = JOBS[message.id];

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
        var cmd = {};
        cmd.id = JOB++;
        cmd.eval = fun.toString();

        connection.sendUTF(JSON.stringify(cmd));
    };

    // function getOS() {
    //     var OS = require('os');
    //     return os.hostname();
    // }

});
