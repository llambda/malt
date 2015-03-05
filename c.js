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
            JOBS[id].id = cmd.id;

            try {
                var fun = vm.runInContext(cmd.eval, sandbox);
                JOBS[id].result = sandbox.result;
            } catch (error) {
                console.error(error);
                JOBS[id].error = error;
                sendResponse(JOBS[id]);
            }

            if (!Promise.is(JOBS[id].result)) {
                JOBS[id].result = Promise.resolve(JOBS[id].result);
            }

            JOBS[id].result.finally(function (res) {
                JOBS[id].result = res;
                sendResponse(JOBS[id]);
            });
            
        }
    });

    function sendResponse(x) {
        if (connection.connected) {
           connection.sendUTF(JSON.stringify(x));
           delete JOBS.id; 
        }
    }
});

client.connect('ws://localhost:7770/', 'malt');
