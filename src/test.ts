import WebSocket from "ws"

console.log('connecting')
// let ws = new WebSocket('ws://18.224.58.189:3077')
let ws = new WebSocket('ws://localhost:3077')
ws.on('open', () =>
{
	console.log('opened!')
	ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "offer", params: { offer: "ofeakfsfasfjakfjaf" } }))
})
ws.on('message', data =>
{
	console.log(`message: ${data.toString()}`)
	let json = JSON.parse(data.toString())
	if (json.id != 1)
		return
	
	let ws2 = new WebSocket('ws://localhost:3077')
	ws2.on('open', () =>
	{
		console.log('opened second')
		ws2.send(JSON.stringify({ method: "join", id: 1, params: { sid: json.result.sid }}))
		ws2.on('message', data =>
		{
			console.log(`ws2 message: ${data.toString()}`)
			if (JSON.parse(data.toString()).id == 1)
				ws.close(), ws2.close()
		})
	})
})