import { EventEmitter } from 'events'
const webrtc = require("wrtc")

let RTCPeerConnection = webrtc.RTCPeerConnection
declare type RTCSessionDescriptionInit = unknown
declare type RTCIceCandidate = unknown
declare type RTCIceCandidateInit = unknown
declare type RTCPeerConnectionIceEvent = { candidate: RTCIceCandidate }
declare type RTCDataChannelEvent = { channel: RTCDataChannel }
declare type Event = { type: string }
declare type MessageEvent = { type: string, data: unknown }
declare type RTCDataChannel = { onopen: (ev: Event) => void, onmessage: (ev: MessageEvent) => void, send: (str: string) => void }

export class RTCHelper extends EventEmitter {
  public rpc = new RTCPeerConnection()
  public candidates: RTCIceCandidate[] = []
  public dataChannel?: RTCDataChannel
  public offer?: RTCSessionDescriptionInit
  public connected = false
  public tag = ''

  constructor(public name?: string) {
    super()

    if (name) this.tag = `[${name}] `
    this.rpc.onicecandidate = this.onIceCandidate
    this.rpc.ondatachannel = this.onDataChannel
  }
  public onIceCandidate = (ev: RTCPeerConnectionIceEvent) => {
    console.log(`${this.tag}onIceCandidate: ${JSON.stringify(ev.candidate)}`)
    if (ev.candidate)
      this.candidates.push(ev.candidate)
    
    this.emit('ice', ev.candidate)
  }
  public onDataChannel = (ev: RTCDataChannelEvent) => {
    console.log(`${this.tag}onDataChannel: ${JSON.stringify(ev.channel)}`)
    this.setChannel(ev.channel)
  }
  public onDataChannelOpen = (ev: Event) => {
    console.log(`${this.tag}onDataChannelOpen: ${ev.type}`)
    this.connected = true
    this.emit('connected')
  }
  public onMessage = (ev: MessageEvent) => {
    console.log(`${this.tag}${ev.type}: ${ev.data}`)
  }
  public setChannel(c: RTCDataChannel) {
    this.dataChannel = c
    this.dataChannel.onopen = this.onDataChannelOpen
    this.dataChannel.onmessage = this.onMessage
  }
  public async waitConnection(): Promise<void> {
    if (this.connected)
      return Promise.resolve()

    return new Promise<void>((res, rej) => this.on('connected', () => res()))
  }
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    console.log(`${this.tag}createOffer`)
    this.setChannel(this.rpc.createDataChannel('chat'))
    this.offer = await this.rpc.createOffer()
    await this.rpc.setLocalDescription(this.offer)
    return this.offer
  }
  public async pushOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    console.log(`${this.tag}pushOffer: ${JSON.stringify(offer)}`)
    if (this.offer)
      throw new Error('can\'t push offer to already inited rtc connection!')

    await this.rpc.setRemoteDescription(offer)
    const answer = await this.rpc.createAnswer()
    await this.rpc.setLocalDescription(answer)
    return answer
  }
  public async pushAnswer(answer: RTCSessionDescriptionInit) {
    console.log(`${this.tag}pushAnswer: ${JSON.stringify(answer)}`)
    await this.rpc.setRemoteDescription(answer)
  }
  public async pushIceCandidate(candidate: RTCIceCandidateInit | RTCIceCandidate) {
    await this.rpc.addIceCandidate(candidate)
  }
}
