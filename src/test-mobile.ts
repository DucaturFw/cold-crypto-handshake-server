import WebSocket from "ws"
import { RTCHelper } from "./webrtc"

let sid = process.argv[2]
if (!sid)
	throw "please provide sid!"

function limit(str: string, len: number)
{
	if (!str || !str.length)
		return str
	
	if (str.length <= len)
		return str
	
	str = "" + str
	
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
			console.log(`got offer: ${limit(json.result.offer, 30)}`)
			let offer = json.result.offer
			let answer = await rpc.pushOffer({ type: "offer", sdp: offer })
			console.log(`generated answer: ${limit(answer as string, 30)}`)
			ws.send(JSON.stringify({ method: "answer", id: 2, params: { answer: (answer as any).sdp } }))

			rpc.on('ice', ice => ws.send(JSON.stringify({ method: "ice", id: 3, params: { ice } })))
		}
		if (json.method == "ice")
		{
			console.log(`got ice: ${limit(json.params.ice && json.params.ice.candidate, 30)}`)
			if (json.params.ice)
				rpc.pushIceCandidate(json.params.ice)
		}
	})
	ws.send(JSON.stringify({ method: "join", id: 1, params: { sid }}))
	console.log('trying to join...')
})