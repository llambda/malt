var vm = require('vm');
var util = require('util');
var sandbox = {
	global: 'asdf'
};
// sandbox.os = os;
// sandbox.dns = dns;
// sandbox.Promise = Promise;
// sandbox.child_process = Promise.promisifyAll(require('child_process'));

vm.createContext(sandbox);


var x = function () {
	return (function() {
		global = 7;
		return 7*7;
	})();
}

var y = function () {
	global = 7;
	return 7*7;
};

console.log(x);
console.log(x.toString());
console.log(x());
vm.runInContext(new Function(x().toString()), sandbox);
console.log(sandbox);

console.log(y);
console.log(y.toString());
console.log(y());

vm.runInContext(new Function(y().toString()), sandbox);

console.log(util.inspect(sandbox));
