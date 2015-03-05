#!/usr/bin/env node
var Promise = require('bluebird');
var WebSocketServer = require('websocket').server;

var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(7770, function() {
    console.log((new Date()) + ' Server is listening on port 7770');
});

wsServer = new WebSocketServer({
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

var connections = [];

wsServer.on('request', function(request) {

    console.log(request);

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('malt', request.origin);

    function runRemotely(command /* string*/) {
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
            job.resolver(message.result)
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

    var getOS = `result = os.hostname();`

    var lookup = `result = dns.lookupAsync('yahoo.com'); `

    var ifconfig = `var spawn = child_process.spawn;
    var spawn = spawn('ifconfig');
    var result = '';
    var datums;
    spawn.stdout.on('data', function (data) { datums += data; } );
    
    result = new Promise(function (resolver) {
        spawn.on('close', function() { resolver(datums); } );
    }); 3asdf
    `
    setInterval(function () {
        runRemotely(ifconfig).then(function () { console.log('promises worked!' )});
    }, 1000);
});
