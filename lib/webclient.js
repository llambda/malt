
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

var bunyan = require('bunyan');

function MyRawStream() {}
MyRawStream.prototype.write = function (rec) {
    console.log('[%s] %s: %s',
        rec.time.toISOString(),
        bunyan.nameFromLevel[rec.level],
        rec.msg);
}

var log = bunyan.createLogger({
    name: 'webclient',
    streams: [
        {
            level: 'info',
            stream: new MyRawStream(),
            type: 'raw'
        }
    ]
});


var m = require('mithril');
// var _ = require('lodash');

var messages = {};
messages.controller = function() {
  this.messages = [];
  this.get = function () {
    return this.messages;
  }
  this.add = function (message) {
    this.messages.unshift(message);
    this.messages.length = 2000; // keep only last 2000 messages
  }
}

messages.view = function(ctrl) {
  function renderMsg(message) {
    return m('li', JSON.stringify(message));
  }

  return m('ul', ctrl.get().map(function (message) {
      return renderMsg(message);
    }));
};

var jobs = {};
jobs.controller = function() {
  this.jobs = [];

  this.get = function() {
    return this.jobs;
  }

  this.add = function (job) {
    this.jobs.unshift(job);
    this.jobs.length = 2000;
  }
}


jobs.view = function(ctrl) {

  function renderJobTd(job) {
    if (!job.error) {
      return m("td", style.good, JSON.stringify(job.value, null, 2));
    } else {
      return m("td", style.bad,
        [JSON.stringify(job.error, null, 2), m("br"), m("br"), job.errorstack]);
    }
  }

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

var connection = {}
connection.controller = function () {
  this.connected = m.prop(false);
}

connection.view = function (ctrl)  {
  return m('span', ['Connected: ', ctrl.connected()]);
}


var commands = {};
commands.controller = function() {
  var id = 0;
  var self = this;

  this.commands = [];
  this.args = [];

  this.get = function() {
    return this.commands;
  }

  this.add = function (commands) {
    this.commands.unshift(commands);
  }

  this.addArgument = function() {
    self.args.push('');
  };

  this.removeArgument = function() {
    self.args.pop();
  };

  this.setArgument = function(index) {
    return function(value) {
      self.args[index] = value;
    }
  }

  this.getArgument = function(index) {
    return self.args[index];
  }

  this.getArguments = function() {
    return self.args;
  }

  this.command = function(command, event) {
    log.info(event);
    var o = {};
    o.message = 'newcommand';
    o.command = command;
    o.arguments = self.args;
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
  m("br"),

  m("button", { style: {color:'red'}, onclick: controller.run }, "RUN!"),

  // m("button", {
  //   onclick: function() {
  //     controller.command('osinfo');
  //   }
  // }, "osinfo command"),
  
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
    return m("td", style.good, JSON.stringify(row.response, null, 2));
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

window.addEventListener('load', startApp);

function startApp() {
  var cmdctrl =  m.module(document.getElementById('commands'), commands);
  var jobsctrl = m.module(document.getElementById('jobs'), jobs);
  var msgsctrl = m.module(document.getElementById('messages'), messages);
  var connectionctrl = m.module(document.getElementById('connection'), connection);

  connect(cmdctrl, jobsctrl, msgsctrl, connectionctrl);
}

function connect(cmdctrl, jobsctrl, msgsctrl, connectionctrl) {

  var W3CWebSocket = require('websocket').w3cwebsocket;
  client = new W3CWebSocket('ws://' + location.host, 'command');

  client.onmessage = function(e) {
    try {
      m.startComputation();
      if (typeof e.data === 'string') {
        var o = JSON.parse(e.data);
        log.info('message', o);

        msgsctrl.add(o);

        if (o.message === 'jobdone') {
          jobsctrl.add(o);
        } else if (o.message === 'commanddone') {
          cmdctrl.add(o);
        }
      }
    } finally {
      m.endComputation();
    }
  };

  client.onerror = function() {
    log.error('Connection Error');
  };

  client.onopen = function() {
    m.startComputation();
    log.info('WebSocket Client Connected');
    connectionctrl.connected(true);
    m.endComputation();
  };

  client.onclose = function() {
    m.startComputation();
    log.info('Web Client Closed');
    connectionctrl.connected(false);
    m.endComputation();
    setTimeout(function () {
      startApp()
    }, 1000);
  };
}