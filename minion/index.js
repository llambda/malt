#!/usr/bin/env node
'use strict';
var Promise = require('bluebird');
var WebSocketClient = require('websocket').client;
var vm = require('vm');
var fntools = require('function-serialization-tools')
var client = new WebSocketClient();
var DefaultSandbox = require('../sandboxes/permissive')();
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'minion', level: 'debug'});

vm.createContext(DefaultSandbox);

client.on('connectFailed', function(error) {
    log.warn('Connection failed: ' + error.toString());
});

var QUEUED_JOBS = [];

client.on('connect', function(connection) {

    function sendResponse(id, value, error, errorstack) {
        if (connection.connected) {
            var send = {};
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

    log.info('Connected to master.');
    connection.on('error', function(error) {
        log.error('Connection error', error);
    });
    connection.on('close', function() {
        log.error('Connection closed');
        connect();
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var command = JSON.parse(message.utf8Data);

            log.debug(command);

            if (command.message === 'newjob') {
                var id = command.id;
                var fun = fntools.s2f(command.script);
                Promise.try(function () {
                    return vm.runInContext(fntools.apply2s(fun, command.args), DefaultSandbox);
                })
                .reflect()
                .then(function (promiseInspection) {
                    if (promiseInspection.isFulfilled()) {
                        sendResponse(id, promiseInspection.value());
                    } else {
                        sendResponse(id, null, promiseInspection.error().toString(), null);
                    }
                })
            } else {
                log.error('Unknown command', message);
            }
        } else {
            log.error('Expected a UTF8 command', message);
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
