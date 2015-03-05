#!/usr/bin/env node
var Promise = require('bluebird');
var WebSocketClient = require('websocket').client;
var vm = require('vm');
var os = Promise.promisifyAll(require('os'));
var dns = Promise.promisifyAll(require('dns'));

var client = new WebSocketClient();

var sandbox = {};
sandbox.os = os;
sandbox.dns = dns;
sandbox.Promise = Promise;
sandbox.child_process = Promise.promisifyAll(require('child_process'));

vm.createContext(sandbox);

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

var JOBS = [];

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");

            var cmd = JSON.parse(message.utf8Data);

            var id = cmd.id;
            JOBS[id] = {};
            var job = JOBS[id];
            job.id = cmd.id;

            try {
                job.promise = vm.runInContext(cmd.eval, sandbox);
                
                if (!Promise.is(job.promise)) {
                    job.promise = Promise.resolve(job.promise);
                }
            } catch (error) {
                job.promise = Promise.reject(error);
            }

            debugger;

            job.promise.then(function (value) {
                sendResponse(job, value);
            }, function (error) {
                sendResponse(job, null, error);
            })
        }
    });

    function sendResponse(job, value, error) {
        if (connection.connected) {

            var send = {};
            send.id = job.id;
            send.value = value;
            send.error = error;

            console.log('Sending response ' + JSON.stringify(send));
            connection.sendUTF(JSON.stringify(send));
            
        }
    }
});

client.connect('ws://localhost:7770/', 'malt');
