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

const DefaultSandbox = require('./sandboxes/default')();

vm.createContext(DefaultSandbox);

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

const QUEUED_JOBS = [];

client.on('connect', function(connection) {

    function sendResponse(id, value, error) {
        if (connection.connected) {
            let send = {};
            send.message = 'jobdone';
            send.id = id;
            send.value = value;
            send.error = error;

            console.log('Sending response ' + JSON.stringify(send));
            connection.sendUTF(JSON.stringify(send));            
        } else {
            QUEUED_JOBS.push({
               id: id,
               value: value,
               error: error 
           })
        }
    }

    QUEUED_JOBS.forEach(function (job) {
        sendResponse(job.id, job, value, job.error);
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

            if (command.message === 'newjob') {
                let id = command.id;

                let fun = fntools.s2f(command.script);

                Promise.try(function () {
                    return vm.runInContext(
                        fntools.apply2s(fun, command.args)
                        , DefaultSandbox);
                })
                .then(function (value) {
                    sendResponse(id, value);
                }, function (error) {
                    sendResponse(id, null, error);
                })
            } else {
                throw new Error("unknown command");
            }
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
