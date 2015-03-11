module.exports.throws = function () {
	throw new Error('hi')
};

module.exports.random = function () {
    return Math.random();
};

module.exports.slowrandom = function () {
    var Promise = require('bluebird');

    var rando = Math.random() * 2000;

    return Promise.delay(rando).then(function () {
        return rando;
    })
};

module.exports.hostname = function() {
	return os.hostname();
}

module.exports.lookup = function(host) {
	return dns.lookupAsync(host); 
}

module.exports.ifconfig = function() {
	var spawn = child_process.spawn;
    var spawn = spawn('ifconfig');
    var datums;
    spawn.stdout.on('data', function (data) { datums += data; } );
    
    return new Promise(function (resolver) {
        spawn.on('close', function() { resolver(datums); } );
    });
}

module.exports.ifconfig2 = function() {
    var streamToString = require('stream-to-string')
    var spawn = require('child_process').spawn;
    var p = spawn('ifconfig');
    
    return streamToString(p.stdout);
}

module.exports.ifconfig3 = function() {
    var streamToString = require('stream-to-string')
    var spawn = require('child_process').spawn;
    var p = spawn('ifconfig');
    
    return streamToString(p.stdout);
}

module.exports.osinfo = function () {

    var os = require('os');
    return {
        'hostname': os.hostname(),
        'type': os.type(),
        'platform': os.platform(),
        'arch': os.arch(),
        'release': os.release(),
        'uptime': os.uptime(),
        'loadavg': os.loadavg(),
        'totalmem': os.totalmem(),
        'freemem': os.freemem(),
        'cpus': os.cpus(),
        'networkInterfaces': os.networkInterfaces()
    }
};

module.exports.uptime = function () {
    var os = require('os');
    return os.uptime();
};