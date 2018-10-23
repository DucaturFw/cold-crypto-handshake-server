import WebSocket from "ws"
import { RTCHelper } from "./webrtc"

let sid = process.argv[2]
if (!sid)
	throw "please provide sid!"

function limit(str: string, len: number)
{
	if (str.length <= len)
		return str
	
	return str.substring(0, len) + '...'
}

console.log(`connecting with sid = "${sid}"`)
let ws = new WebSocket('ws://localhost:3077')
let rpc = new RTCHelper()
rpc.on('connected', () =>
{
	console.log(`webrtc connected!`)
	ws.close()
	rpc.dataChannel!.send(`{"jsonrpc":"2.0","id":1,"method":"hi"}`)
})
ws.on('open', () =>
{
	console.log('connected to handshake server')
	ws.on('message', async data =>
	{
		console.log(`got message: ${data.toString()}`)
		let json = JSON.parse(data.toString())
		console.log(json)
		if (json.id == 1)
		{
			console.log(`got offer: ${limit(json.result, 30)}`)
			let offer = json.result
			let answer = await rpc.pushOffer(offer)
			console.log(`generated answer: ${limit(answer as string, 30)}`)
			ws.send(JSON.stringify({ method: "answer", id: 2, params: { answer } }))
		}
		if (json.method == "ice")
		{
			console.log(`got ice: ${limit(json.result, 30)}`)
			rpc.pushIceCandidate(json.result)
		}
	})
	ws.send(JSON.stringify({ method: "join", id: 1, params: { sid }}))
	console.log('trying to join...')
})