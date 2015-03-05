module.exports.throws = `throw new Error('hi') `;
module.exports.getOS = `os.hostname();`
module.exports.lookup = `dns.lookupAsync('yahoo.com'); `
module.exports.ifconfig = `var spawn = child_process.spawn;
    var spawn = spawn('ifconfig');
    var datums;
    spawn.stdout.on('data', function (data) { datums += data; } );
    
    new Promise(function (resolver) {
        spawn.on('close', function() { resolver(datums); } );
    });
    `

    