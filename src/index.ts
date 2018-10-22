import WebSocket from "ws"

type WebSocketExt = WebSocket & { id: number }

console.log('loading...')

const PORT = 3077

let server = new WebSocket.Server({ port: PORT })
server.on('connection', (s: WebSocketExt, r) =>
{
	s.id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
	CLIENTS[s.id] = s
	s.on('message', data =>
	{
		try
		{
			let json = JSON.parse(data.toString())
			if (isCreateSession(json))
			{
				let { offer } = allToObj(json, ['offer'])
				let sid = "session" + Math.random()
				SESSIONS[sid] = {
					sid,
					offer,
					host: s.id
				}
				s.send(jrpca(json.id, { sid }))
			}
			if (isJoinSession(json))
			{
				let { sid } = allToObj(json, ['sid'])
				let session = SESSIONS[sid]
				s.send(jrpca(json.id, { offer: session.offer }))
			}
			if (isSendAnswer(json))
			{
				let { answer } = allToObj(json, ['answer'])
				let session = getSessionByParticipant(s.id)
				if (!session)
					return s.send(jrpce(json.id, "session not found!"))
				
				CLIENTS[session.host].send(jrpc(0, 'answer', { answer }))
			}
			if (isSendIce(json))
			{
				let { ice } = allToObj(json, ['ice'])
				let session = getSessionByParticipant(s.id)
				if (!session)
					return s.send(jrpce(json.id, "session not found!"))
				if (!session.peer)
					return s.send(jrpce(json.id, "peer not connected!"))
				
				CLIENTS[session.peer].send(jrpc(0, 'ice', { ice }))
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
		let session = getSessionByParticipant(s.id)

		if (session && s.id == session.host)
			delete SESSIONS[session.sid]
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
function jrpc<T>(id: string | number, method: string, params: T)
{
	return {
		jsonrpc: "2.0",
		id,
		method,
		params
	}
}
function jrpca<T>(id: string | number, result: T)
{
	return {
		jsonrpc: "2.0",
		id,
		result
	}
}
function jrpce<T>(id: string | number, error: T)
{
	return {
		jsonrpc: "2.0",
		id,
		error
	}
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
	args: TArr | TObj
}

export type JsonCall<T1 = unknown, T2 = unknown, T3 = unknown, T4 = unknown, T5 = unknown, T6 = unknown, T7 = unknown>
	= JsonRpcCall<
		[T1[keyof T1], T2[keyof T2], T3[keyof T3], T4[keyof T4], T5[keyof T5], T6[keyof T6], T7[keyof T7]],
		T1 & T2 & T3 & T4 & T5 & T6 & T7
	>
export function allToObj<TObj>(msg: JsonRpcCall<TObj[keyof TObj][], TObj>, mapping: (keyof TObj)[]): TObj
{
	return Array.isArray(msg.args) ? arrayToObj(msg.args, mapping) : msg.args
}
export function arrayToObj<TArr extends any[], TObj>(args: TArr, mapping: (keyof TObj)[]): TObj
{
	return args.reduce((acc, cur, idx) => (acc[mapping[idx]] = cur, acc), {})
}