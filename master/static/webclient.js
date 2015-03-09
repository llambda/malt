
var m = require('mithril');
// var _ = require('lodash');

var jobs = {};
jobs.controller = function() {
  this.jobs = [];

  this.get = function() {
    return this.jobs;
  }

  this.add = function (job) {

    this.jobs.push(job);

    this.jobs = this.jobs.sort(function (a, b) {
      return b.id - a.id;
    })

    if (this.jobs.length > 3) {
      this.jobs = this.jobs.slice(0, 3);
    }
  }
}

jobs.view = function(ctrl) {

  return m("p", [ctrl.get().map(function (item) {
    return m('p', JSON.stringify(item))
  })
  ])
};


var minion = {};
minion.MinionList = Array;
minion.Minion = function(data) {
  this.description = m.prop(data.description);
};

minion.vm = (function() {
  var vm = {}
  vm.init = function() {
    vm.list = new minion.MinionList();
    vm.description = m.prop("");
    vm.add = function() {
      if (vm.description()) {
        vm.list.push(new minion.Minion({description: vm.description()}));
        vm.description("");
      }
    };
  }
  return vm
}())

minion.controller = function() {
  var id = 0;

  // minion.vm.init()
  minion.vm.greeting = [];
  minion.vm.minions = [];

  this.changeGreeting = function (greet) {
    minion.vm.greeting.push(greet);
  }

  this.get = function() {
    return minion.vm.greeting;
  }

  this.loadMinions = function(minions) {
    minion.vm.minions = minions;
  }

  this.getMinions = function() {
    return minion.vm.minions;
  }

  this.command = function(command, event) {
    console.log(event);
    var o = {};
    o.message = 'newcommand';
    o.command = command;
    o.id = id++;
    client.send(JSON.stringify(o));
  }
}

function displayMinion(minion) {
  return m("tr", [
      m("td", {style: {color: "red"}}, minion.hostname),
      m("td", minion.uptime),
      m("td", minion.totalmem),
      m("td", minion.freemem),
      m("td", minion.cpus.length),
      m("td", minion.loadavg[0]),
      m("td", minion.loadavg[1]),
      m("td", minion.loadavg[2]),
      m("td", minion.arch),
      m("td", minion.platform),
      m('td', minion.release)
    ])
}

function displayMinionHeader() {
  return m("tr", [
      m("td", {style: {color: "red"}}, 'hostname'),
      m("td", 'uptime'),
      m("td", 'totalmem'),
      m("td", 'freemem'),
      m("td", 'cpus'),
      m("td", 'loadavg0'),
      m("td", 'loadavg1'),
      m("td", 'loadavg2'),
      m("td", 'arch'),
      m('td', 'platform'),
      m('td', 'release')
    ])
}

minion.view = function(controller) {
  return [m("h1", "minions"),
  m("button", {
    onclick: function() {
      controller.command('osinfo');
    }
  }, "osinfo command"),
  
  m("table", [
    m("thead", displayMinionHeader()),
    m("tbody", controller.getMinions().map(function (item) {
      return displayMinion(item);
    }))
  ])
  ]
};

// ctrl.changeGreeting('hello there');

var client;

window.addEventListener('load', function() {
  var ctrl =  m.module(document.getElementById('status'), {controller: minion.controller, view: minion.view});
  var jobsctrl = m.module(document.getElementById('jobs'), jobs);

  var W3CWebSocket = require('websocket').w3cwebsocket;
  client = new W3CWebSocket('ws://' + location.host, 'command');

  client.onmessage = function(e) {
    if (typeof e.data === 'string') {
      // console.log("Received: '" + e.data + "'");
      var o = JSON.parse(e.data);

      console.dir(o);

      // if ()

      // ctrl.changeGreeting(o )
      // o.map(ctrl.changeGreeting);

      if (o.message === 'jobdone') {
        // debugger;
        console.log('jobdone');
        jobsctrl.add(o);
      } else if (o.mesage === ' status') {
        console.log('minions');
        ctrl.loadMinions(o);
      } else {
        // debugger;
        // throw new Error('unknown message ' + o.message);
        ctrl.loadMinions(o);
      }

    }
  };


  client.onerror = function() {
    console.log('Connection Error');
  };

  client.onopen = function() {
    console.log('WebSocket Client Connected');
  };

  client.onclose = function() {
    console.log('Web Client Closed');
  };

});