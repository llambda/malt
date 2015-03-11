
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

    // if (this.jobs.length > 3) {
    //   this.jobs = this.jobs.slice(0, 3);
    // }
  }
}

var tablestyle = {
      'border': '1px solid black'
    }

jobs.view = function(ctrl) {

  return m("table",
    {style: tablestyle},
    m('thead', [
      m('td', 'id'),
      m('td', 'value'),
      m('td', 'error')
    ]),

    m('tbody', ctrl.get().map(function (item) {
      return m('tr',
        m('td', item.id), m('td', JSON.stringify(item.value)), m('td', JSON.stringify(item.error)))
    }))
  )
};

var commands = {};
commands.controller = function() {
  var id = 0;

  this.commands = [];

  this.get = function() {
    return this.commands;
  }

  this.add = function (commands) {

    this.commands.unshift(commands);

    // this.commands = this.commands.sort(function (a, b) {
    //   return b.id - a.id;
    // })

    // if (this.jobs.length > 3) {
    //   this.jobs = this.jobs.slice(0, 3);
    // }
  }

  this.command = function(command, event) {
    console.log(event);
    var o = {};
    o.message = 'newcommand';
    o.command = command;
    o.id = id++;
    client.send(JSON.stringify(o));
  }

  this.customRun = m.prop('random');

  this.run = function() {
    this.command(this.customRun());
  }.bind(this);
}


commands.view = function(controller) {
  return [
  m("input", {
    type: 'text',
    value: controller.customRun(),
    onchange: m.withAttr("value", controller.customRun) 
  }),

  m("button", { onclick: controller.run }, "run"),

  m("button", {
    onclick: function() {
      controller.command('osinfo');
    }
  }, "osinfo command"),
  
  m("table", {style: tablestyle}, [
    m("thead", displayCommandHeader()),
    m("tbody", controller.get().map(function (command) {
      return displayCommand(command);
      // return JSON.stringify(command);
    }))
  ])
  ]
};

function displayCommand(command) {
  return m("tr", [
      m("td", {style: {color: "red"}}, command.command),
      m("td", JSON.stringify(command.response))
    ])
}

function displayCommandHeader() {
  return m("tr", [
      m("td", {style: {color: "red"}}, 'command name'),
      m("td", 'response')
    ])
}

var client;

window.addEventListener('load', function() {
  var cmdctrl =  m.module(document.getElementById('commands'), {controller: commands.controller, view: commands.view});
  var jobsctrl = m.module(document.getElementById('jobs'), jobs);

  var W3CWebSocket = require('websocket').w3cwebsocket;
  client = new W3CWebSocket('ws://' + location.host, 'command');

  client.onmessage = function(e) {
    if (typeof e.data === 'string') {
      var o = JSON.parse(e.data);

      if (o.message === 'jobdone') {
        console.log('jobdone');
        jobsctrl.add(o);
      } else if (o.message === 'commanddone') {
        console.log('commanddone');
        cmdctrl.add(o);
      } else {
        throw new Error('unknown message ' + o.message);
      }

      m.redraw();
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