import { OpenPnp } from "./openpnp.ts";
import type { DeviceInfo, FormatInfoWithId, LogLevel } from "./types.ts";

export class Camera {
  #pnp: OpenPnp;
  #devices: Device[];
  constructor() {
    this.#pnp = new OpenPnp();

    const devices = [];
    for (let i = 0; i < this.#pnp.getDeviceCount(); i++) {
      const name = this.#pnp.getDeviceName(i);
      const formats = [];
      for (let j = 0; j < this.#pnp.getNumFormats(i); j++) {
        const info = this.#pnp.getFormatInfo(i, j);
        formats.push({ ...info, id: j });
      }
      devices.push(new Device(this.#pnp, { name, id: i, formats }));
    }

    this.#devices = devices;
  }

  devices(): Device[] {
    return this.#devices;
  }

  [Symbol.dispose]() {
    this.#pnp.releaseContext();
  }

  static getLibraryVersion(): string {
    return OpenPnp.getLibraryVersion();
  }

  static setLogLevel(level: LogLevel) {
    OpenPnp.setLogLevel(level);
  }
}

export class Device {
  #pnp: OpenPnp;
  #deviceInfo: DeviceInfo;
  constructor(pnp: OpenPnp, deivceInfo: DeviceInfo) {
    this.#pnp = pnp;
    this.#deviceInfo = deivceInfo;
  }

  name(): string {
    return this.#deviceInfo.name;
  }

  formats(): FormatInfoWithId[] {
    return this.#deviceInfo.formats;
  }

  stream(formatInfo: FormatInfoWithId): Stream | undefined {
    console.log(this.#deviceInfo.id, formatInfo.id);
    const streamId = this.#pnp.openStream(this.#deviceInfo.id, formatInfo.id);
    if (!this.#pnp.isOpenStream(streamId)) return;
    return new Stream(this.#pnp, streamId, formatInfo);
  }
}

export class Stream {
  #pnp: OpenPnp;
  #streamId: number;
  #formatInfo: FormatInfoWithId;
  #buffer: Uint8Array;
  constructor(pnp: OpenPnp, streamId: number, formatInfo: FormatInfoWithId) {
    this.#pnp = pnp;
    this.#streamId = streamId;
    this.#formatInfo = formatInfo;
    this.#buffer = new Uint8Array(
      this.#formatInfo.width * this.#formatInfo.height * 4,
    );
  }

  async *next({ delay = 100 } = {}) {
    while (true) {
      while (true) {
        if (this.#pnp.hasNewFrame(this.#streamId)) break;
        await new Promise((r) => setTimeout(r, delay));
      }
      this.#pnp.captureFrame(this.#streamId, this.#buffer);
      yield this.#buffer;
    }
  }

  [Symbol.dispose]() {
    this.#pnp.closeStream(this.#streamId);
  }
}
