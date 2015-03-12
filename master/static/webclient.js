
var style = {};
style.good = {
  style: {color: "green"}
}
style.bad = {
  style: {color: "red"}
}
style.table = {
  style: {
      'border': '1px solid black'
  }
}

var m = require('mithril');
// var _ = require('lodash');

var jobs = {};
jobs.controller = function() {
  this.jobs = [];

  this.get = function() {
    return this.jobs;
  }

  this.add = function (job) {
    this.jobs.unshift(job);
  }
}

function renderJobTd(job) {
  if (!job.error) {
    return m("td", style.good, JSON.stringify(job.value));
  } else {
    return m("td", style.bad,
      [JSON.stringify(job.error), m("br"), m("br"), job.errorstack]);
  }
}

jobs.view = function(ctrl) {

  return m("table",
    style.table,
    m('thead', [
      m('td', 'id'),
      m('td', 'result')
    ]),

    m('tbody', ctrl.get().map(function (job) {
      return m('tr',
        m('td', job.id), renderJobTd(job))
    }))
  )
};

var commands = {};
commands.controller = function() {
  var id = 0;

  this.commands = [];
  this.arguments = [];

  this.get = function() {
    return this.commands;
  }

  this.add = function (commands) {
    this.commands.unshift(commands);
  }

  this.addArgument = function() {
    this.arguments.push('');
  }.bind(this);

  this.removeArgument = function() {
    this.arguments.pop();
  }.bind(this);

  this.setArgument = function(index) {
    return function(value) {
      this.arguments[index] = value;
      console.log(this.arguments);
    }.bind(this);
  }.bind(this);

  this.getArgument = function(index) {
    return this.arguments[index];
  }.bind(this);

  this.getArguments = function() {
    return this.arguments;
  }.bind(this);

  this.command = function(command, event) {
    console.log(event);
    var o = {};
    o.message = 'newcommand';
    o.command = command;
    o.id = id++;
    client.send(JSON.stringify(o));
  }

  this.customRun = m.prop('ping');

  this.run = function() {
    this.command(this.customRun());
  }.bind(this);
}


commands.view = function(controller) {
  var args = 0;

  return [
  m('label', 'Command:'),
  m("input", {
    type: 'text',
    value: controller.customRun(),
    onchange: m.withAttr("value", controller.customRun) 
  }),

  m('br'),
  controller.getArguments().length > 0 ? m('label', 'Arguments:') : null,
  controller.getArguments().map(function (arg, index) {
    return m("input", {
      type: 'text',
      value: controller.getArgument(index),
      onchange: m.withAttr("value", controller.setArgument(index)) 
    })
  }),

  m("br"),
  m("button", { onclick: controller.addArgument }, "Add Argument"),
  m("button", { onclick: controller.removeArgument }, "Remove Argument"),

  m("button", { onclick: controller.run }, "run"),

  m("button", {
    onclick: function() {
      controller.command('osinfo');
    }
  }, "osinfo command"),
  
  m("table", style.table, [
    m("thead", displayCommandHeader()),
    m("tbody", controller.get().map(function (command) {
      return displayCommand(command);
      // return JSON.stringify(command);
    }))
  ])
  ]
};

function renderCommandRow(row) {
  if (!row.error) {
    return m("td", style.good, JSON.stringify(row.response));
  } else {
    return m("td", style.bad,
      [JSON.stringify(row.error), m("br"), m("br"), row.errorstack]);
  }
}

function displayCommand(command) {
  return m("tr", [
      m("td", command.id),
      m("td", command.command),
      renderCommandRow(command),
    ])
}

function displayCommandHeader() {
  return m("tr", [
      m("td", 'id'),
      m("td", 'command'),
      m("td", 'response')
    ])
}

var client;

window.addEventListener('load', function() {
  var cmdctrl =  m.module(document.getElementById('commands'), commands);
  var jobsctrl = m.module(document.getElementById('jobs'), jobs);

  var W3CWebSocket = require('websocket').w3cwebsocket;
  client = new W3CWebSocket('ws://' + location.host, 'command');

  client.onmessage = function(e) {
    try {
      m.startComputation();
      if (typeof e.data === 'string') {
        var o = JSON.parse(e.data);
        console.dir(o);

        if (o.message === 'jobdone') {
          jobsctrl.add(o);
        } else if (o.message === 'commanddone') {
          cmdctrl.add(o);
        } else {
          throw new Error('unknown message ' + o.message);
        }
      }
    } finally {
      m.endComputation();
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