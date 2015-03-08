module.exports.throws = function () {
	throw new Error('hi')
};

module.exports.hostname = function() {
	return os.hostname();
}


module.exports.lookup = function() {
	return dns.lookupAsync('yahoo.com'); 
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
