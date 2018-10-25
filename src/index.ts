import WebSocket from "ws"

type WebSocketExt = WebSocket & { id: number, reduced: boolean }

console.log('loading...')

const PORT = 3077

let server = new WebSocket.Server({ port: PORT })
server.on('connection', (s: WebSocketExt, r) =>
{
	s.id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
	CLIENTS[s.id] = s
	console.log(`client #${s.id} connected`)
	s.on('message', data =>
	{
		try
		{
			data = data.toString()
			s.reduced = data[0] != "{"
			if (s.reduced)
				data = data.replace(/^([^|]*)\|([^|]*)\|(.*)$/, '{"method":"$1","id":$2,"params":$3}')
			
			let json = JSON.parse(data)
			if (isCreateSession(json))
			{
				let { offer } = allToObj(json, ['offer'])
				let sid = "session" + Math.random()
				SESSIONS[sid] = {
					sid,
					offer,
					host: s.id
				}
				console.log(`created session ${sid} for #${s.id}`)
				s.send(jrpca(json.id, { sid }, s.reduced))
			}
			if (isJoinSession(json))
			{
				let { sid } = allToObj(json, ['sid'])
				let session = SESSIONS[sid]
				if (!session)
					return s.send(jrpce(json.id, "session not found!"))
				
				console.log(`#${s.id} joined session ${sid} by #${session.host}`)
				session.peer = s.id
				s.send(jrpca(json.id, { offer: session.offer }, s.reduced))
			}
			if (isSendAnswer(json))
			{
				let { answer } = allToObj(json, ['answer'])
				let session = getSessionByParticipant(s.id)
				if (!session)
					return s.send(jrpce(json.id, "session not found!"))
				
				console.log(`got answer from #${s.id} to #${session.host}`)
				let host = CLIENTS[session.host]
				host.send(jrpc(0, 'answer', { answer }, host.reduced))
			}
			if (isSendIce(json))
			{
				let { ice } = allToObj(json, ['ice'])
				let session = getSessionByParticipant(s.id)
				if (!session)
					return s.send(jrpce(json.id, "session not found!"))
				if (!session.peer)
					return s.send(jrpce(json.id, "peer not connected!"))
				
				let peer = session.peer
				if (s.id == peer)
					peer = session.host
				
				console.log(`ice candidate from #${s.id} to #${peer}`)
				CLIENTS[peer].send(jrpc(0, 'ice', { ice }, CLIENTS[peer].reduced))
			}
		}
		catch(e)
		{
			console.error(e)
		}
	})
	s.on('close', () =>
	{
		delete CLIENTS[s.id]
		console.log(`#${s.id} disconnected`)

		let session = getSessionByParticipant(s.id)
		if (session && s.id == session.host)
		{
			delete SESSIONS[session.sid]
			console.log(`session ${session.sid} deleted`)
		}
	})
})
server.on('listening', () =>
{
	console.log(`started server on ${PORT}!`)
})

let CLIENTS: { [wsid: number]: WebSocketExt } = { }
let SESSIONS: { [sid: string]: { sid: string, host: number, peer?: number, offer: string } } = { }

function getSessionByParticipant(id: number)
{
	let sid = Object.keys(SESSIONS).find(key => (SESSIONS[key].host == id) || (SESSIONS[key].peer == id))
	return sid && SESSIONS[sid]
}
function jrpc<T>(id: string | number, method: string, params: T, reduced: boolean = false)
{
	if (reduced)
		return `${method}|${id}|${JSON.stringify(params)}`
	
	return JSON.stringify({
		jsonrpc: "2.0",
		id,
		method,
		params
	})
}
function jrpca<T>(id: string | number, result: T, reduced: boolean = false)
{
	if (reduced)
		return `|${id}|${JSON.stringify(result)}`
	
	return JSON.stringify({
		jsonrpc: "2.0",
		id,
		result
	})
}
function jrpce<T>(id: string | number, error: T)
{
	return JSON.stringify({
		jsonrpc: "2.0",
		id,
		error
	})
}

type U = JsonRpcCall<unknown[], unknown>
let isCreateSession = (json: U): json is JsonCall<{offer: string}> => json.method == "offer"
let isJoinSession = (json: U): json is JsonCall<{sid: string}> => json.method == "join"
let isSendAnswer = (json: U): json is JsonCall<{answer: string}> => json.method == "answer"
let isSendIce = (json: U): json is JsonCall<{ice: {}}> => json.method == "ice"

interface JsonRpcCall<TArr extends (TObj[keyof TObj][] | unknown[]), TObj>
{
	method: string
	id: string | number
	params: TArr | TObj
}

export type JsonCall<T1 = unknown, T2 = unknown, T3 = unknown, T4 = unknown, T5 = unknown, T6 = unknown, T7 = unknown>
	= JsonRpcCall<
		[T1[keyof T1], T2[keyof T2], T3[keyof T3], T4[keyof T4], T5[keyof T5], T6[keyof T6], T7[keyof T7]],
		T1 & T2 & T3 & T4 & T5 & T6 & T7
	>
export function allToObj<TObj>(msg: JsonRpcCall<TObj[keyof TObj][], TObj>, mapping: (keyof TObj)[]): TObj
{
	return Array.isArray(msg.params) ? arrayToObj(msg.params, mapping) : msg.params
}
export function arrayToObj<TArr extends any[], TObj>(args: TArr, mapping: (keyof TObj)[]): TObj
{
	return args.reduce((acc, cur, idx) => (acc[mapping[idx]] = cur, acc), {})
}