module.exports.throws = function () {
	throw new Error('hi')
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