#!/usr/bin/env node
'use strict';
const Promise = require('bluebird');
const WebSocketClient = require('websocket').client;
const vm = require('vm');
const os = Promise.promisifyAll(require('os'));
const dns = Promise.promisifyAll(require('dns'));
const npm = require('npm');
const fntools = require('function-serialization-tools')

const client = new WebSocketClient();

let sandbox = {};
sandbox.require = require;
sandbox.os = os;
sandbox.dns = dns;
sandbox.Promise = Promise;
sandbox.child_process = Promise.promisifyAll(require('child_process'));
vm.createContext(sandbox);

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

const QUEUED_JOBS = [];

client.on('connect', function(connection) {

    function sendResponse(jobId, value, error) {
        if (connection.connected) {
            let send = {};
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

            let command = JSON.parse(message.utf8Data);
            let id = command.id;

            let fun = fntools.s2f(command.script);

            Promise.try(function () {
                return vm.runInContext(
                    fntools.apply2s(fun, command.args)
                    , sandbox);
            })
            .then(function (value) {
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
