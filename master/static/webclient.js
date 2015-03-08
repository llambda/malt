
var m = require('mithril');

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
  minion.vm.init()

  this.changeGreeting = function (greet) {
    minion.vm.greeting = greet;
  }
  minion.vm.greeting = 'hi';
}

minion.view = function() {
  return m("html", [
    m("p", minion.vm.greeting),
    m("body", [
      m("table", [
        minion.vm.list.map(function(minion, index) {
          return m("tr", [
            m("td", {style: {textDecoration: "none"}}, minion.description()),
            ])
        })
        ])
      ])
    ]);
};

var ctrl =  m.module(document, {controller: minion.controller, view: minion.view});
ctrl.changeGreeting('hello there');

var W3CWebSocket = require('websocket').w3cwebsocket;
var client = new W3CWebSocket('ws://' + location.host, 'web');

client.onmessage = function(e) {
  if (typeof e.data === 'string') {
    console.log("Received: '" + e.data + "'");
    var o = JSON.parse(e.data);

    ctrl.changeGreeting(e.data)

    m.redraw(true);
  }
};


client.onerror = function() {
  console.log('Connection Error');
};

client.onopen = function() {
  console.log('WebSocket Client Connected');

    // function sendNumber() {
    //     if (client.readyState === client.OPEN) {
    //         var number = Math.round(Math.random() * 0xFFFFFF);
    //         client.send(number.toString());
    //         setTimeout(sendNumber, 1000);
    //     }
    // }
    // sendNumber();
};

client.onclose = function() {
  console.log('Web Client Closed');
};
