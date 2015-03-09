# Master controls minions.

## Minions connect to the master on the master's websocket TCP port.

## Websocket 'minion' subprotocol:
Master sends job requests to minion, as JSON:

{
	"message": "newjob",
	"id": 1,
	"script": " function () { os.hostname(); } ",
	"content-type": "javascript",
	"arguments": [],
	'sandbox': 'name' // maybe. not sure if will be useful.
}

Minions return task results as JSON:

{
	"message": "jobdone",
	"id": 1,
	"value": "localhost"
}

or

{
	"message": "jobdone",
	"id": 1,
	"error": "Error"
}

E.g.

return Promise.all(minions.map(function (minion) {
        var job = runRemotely(minion, command, args);
        job.promise.then(function () {
            jobDone(job);
        });
        return job.promise;
    }))
    .then(updateBrowsers)


## Websocket 'command' subprotocol:

Master --> Browser
Master sends message to browser:

{
	"message": 'jobdone',
	"jobid": 1234,
	"error": null,
	"value": 'value'
}

Browser --> Master

Browser sends job requests to master.

Currently: 'refresh'
Future: 

{
	'message': 'newcommand',
	id: 1,
	command: 'osinfo',
	arguments: [],
	minionFilter: null
}

minionFilter: function name that would filter minions. Optional. Default is to execute on all minions.

