minions connect to the master on the master's websocket / http port

cli connects to the master on the master's websocket / http port (?)

master sends tasks as JSON:

{
	"id": 1,
	"eval": " os.hostname(); "
}

minion returns task results as JSON:

{
	"id": 1,
	"value": "localhost"
}

or

{
	"id": 1,
	"error": "Error"
}