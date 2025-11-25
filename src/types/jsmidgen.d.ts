declare module 'jsmidgen' {
  export interface FileConfig {
    ticks?: number
    tracks?: Track[]
  }

  export class File {
    constructor(config?: FileConfig)
    ticks: number
    tracks: Track[]
    addTrack(track?: Track): File | Track
    toBytes(): string
    toUint8Array(): Uint8Array
    toBlob(genericType?: boolean): Blob
  }

  export class Track {
    constructor()
    events: unknown[]
    addEvent(event: unknown): this
    setTempo(bpm: number, time?: number): this
    setInstrument(channel: number, instrument: number, time?: number): this
    addNoteOn(channel: number, pitch: number | string, time?: number, velocity?: number): this
    addNoteOff(channel: number, pitch: number | string, time?: number, velocity?: number): this
    addNote(
      channel: number,
      pitch: number | string,
      dur: number,
      time?: number,
      velocity?: number,
    ): this
  }

  export const Util: {
    ensureMidiPitch(pitch: number | string): number
    mpqnFromBpm(bpm: number): number[]
    translateTickTime(ticks: number): number[]
    str2Bytes(hex: string, bytes?: number): number[]
    codes2Str(byteArray: number[]): string
  }

  const Midi: {
    File: typeof File
    Track: typeof Track
    Util: typeof Util
  }

  export default Midi
}
