# malt

## Overview

Malt Stack. Salt Stack like thingy in node.js or io.js. The whole thing does work, however it is not yet a finished product and the design may change as it evolves. So for the time being you have to git clone the repository and manually run the master and minions.

The purpose of this software is to control a bunch of computers from one computer. The computers you want to control are called minions, and the computer doing the controlling is called the master. You might want to do this if, for instance, you had a bunch of Linux boxes and needed to install software on them, run commands, start and stop services, etc.

## Technical Design

Similar in design to salt stack, the master listens on a TCP port, and the minions connect to the master. (This means the minions don't need to listen on a TCP port, which is good for security.)

Websocket is used to send messages between master and minions, and between master and web browser clients. This allows TLS and other security to be layered in if desired.

The master also serves up a web interface, and websocket is used to send messages between the master and web clients. The web interface uses Mithril.js, a high performance MVC library.

Commands are simply io.js functions that run sandboxed on the master and the minions. The sandbox contains a remote executor function that allows running code on the minions. Commands can have arguments and run code both remotely on the minions, as well as on the master. Remote code returns promises or values that are automatically converted to promises, which can be combined with promises on the master. This allows maximum parallellism horizontally across minions, as well as vertically within the minion. Remote code runs as jobs which are shown in the web interface.

Remote code Functions are convered to Strings via Function.toString(), sent as a String to the minions, then reconstitued (deserialized) at the other end back into a JavaScript Function via [function-serialization-tools](https://www.npmjs.com/package/function-serialization-tools).

For example, the ping command is designed to first get the current time on the master, then run a function remotely on the minion that returns any value (which is unused). Then, when that is done, the current time on the master is obtained again, and finally the difference is returned as the command's return value.

Code is sandboxed on the master and minions to prevent it from affecting internal application state. The same is true on the minion; however, the sandbox is primarily to prevent command code from affecting internal application state. Since the purpose of the software is to allow full contorl, the default sandbox on minions is very permissive. 

The default sandbox Promisifies most of io.js API via Bluebird, as well as providing autorequire. This likely will need to be improved to provide full package.json npm support in commands.

## Installation and usage

1. Add ```127.0.0.1 malt``` to your ```/etc/hosts``` file.

2. Clone the source code:

  ```git clone https://github.com/llambda/malt.git```
  
3. change directories into the cloned repo

  ```cd malt```
  
4. Run the malt master:

  ```
  ./mastercli.js
  ```
  
5. Run the malt minion:

  ```
  ./minioncli.js
  ```

  Running with the ```--help``` argument shows usage. You can run minions on other machines and use the ```-h``` to tell them which machine to connect to. By default, they will connect to the host named 'malt'.
  
6. Open Chrome or Safari to [http://localhost:3417]
  (Firefox is currently broken)

7. Run a test ping. With 'ping' as the command, click the 'run' button. You should see a response time from each minion.



