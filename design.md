minions connect to the master on the master's websocket / http port

cli connects to the master on the master's websocket / http port (?)

Master sends tasks as JSON:

{
	"id": 1,
	"script": " os.hostname(); "
	"content-type": "javascript"
}

Minions return task results as JSON:

{
	"id": 1,
	"value": "localhost"
}

or

{
	"id": 1,
	"error": "Error"
}

Master stores job results in DB and frees up promises. Minions free up resources after notifying master.

