#!/usr/bin/env node
'use strict';
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

var QUEUED_JOBS = [];

client.on('connect', function(connection) {

    function sendResponse(jobId, value, error) {
        if (connection.connected) {
            var send = {};
            send.id = jobId;
            send.value = value;
            send.error = error;

            console.log('Sending response ' + JSON.stringify(send));
            connection.sendUTF(JSON.stringify(send));            
        } else {
            QUEUED_JOBS.push({
             jobId: jobId,
             value: value,
             error: error 
         })
        }
    }

    QUEUED_JOBS.forEach(function (job) {
        sendResponse(job.jobId, job,value, job.error);
    });

    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('Connection Closed');
        connect();
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");

            var cmd = JSON.parse(message.utf8Data);
            var id = cmd.id;
            var promise;
            // JOBS[id] = {};
            // var job = JOBS[id];
            // job.id = cmd.id;

            try {
                promise = vm.runInContext(cmd.eval, sandbox);
                
                if (!Promise.is(promise)) {
                    promise = Promise.resolve(promise);
                }
            } catch (error) {
                promise = Promise.reject(promise);
            }

            promise.then(function (value) {
                sendResponse(id, value);
            }, function (error) {
                sendResponse(id, null, error);
            })
        }
    });
});

function connect() {
    client.connect('ws://localhost:7770/', 'minion');
}

client.on('connectFailed', function () {
    setTimeout(connect, 3000);
});

connect();
