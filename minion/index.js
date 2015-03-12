#!/usr/bin/env node
'use strict';
const Promise = require('bluebird');
const WebSocketClient = require('websocket').client;
const vm = require('vm');
const fntools = require('function-serialization-tools')
const client = new WebSocketClient();
const DefaultSandbox = require('./sandboxes/default')();

vm.createContext(DefaultSandbox);

client.on('connectFailed', function(error) {
    console.log('Connection failed: ' + error.toString());
});

const QUEUED_JOBS = [];

client.on('connect', function(connection) {

    function sendResponse(id, value, error, errorstack) {
        if (connection.connected) {
            let send = {};
            send.message = 'jobdone';
            send.id = id;
            send.value = value;
            send.error = error;
            send.errorstack = errorstack;

            connection.sendUTF(JSON.stringify(send));            
        } else {
            QUEUED_JOBS.push({
               id: id,
               value: value,
               error: error,
               errorstack: errorstack 
           })
        }
    }

    QUEUED_JOBS.forEach(function (job) {
        sendResponse(job.id, job, value, job.error);
    });

    console.log('Connected to master.');
    connection.on('error', function(error) {
        console.error("Connection error: " + error.toString());
    });
    connection.on('close', function() {
        console.error('Connection closed');
        connect();
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            let command = JSON.parse(message.utf8Data);

            if (command.message === 'newjob') {
                let id = command.id;
                let fun = fntools.s2f(command.script);
                Promise.try(function () {
                    return vm.runInContext(fntools.apply2s(fun, command.args), DefaultSandbox);
                })
                .reflect()
                .then(function (promiseInspection) {
                    if (promiseInspection.isFulfilled()) {
                        console.log(promiseInspection)
                        sendResponse(id, promiseInspection.value());
                    } else {
                        sendResponse(id, null, promiseInspection.error().toString(), null);
                    }
                })
            } else {
                console.error('Unknown command ' + message);
            }
        } else {
            console.error('Expected a UTF8 command ' + message);
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
