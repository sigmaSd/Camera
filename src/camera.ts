/**
 * Provides classes for interacting with camera devices, managing device streams, and capturing video frames.
 *
 * @example
 * ```ts
 * import { Camera } from "jsr:@sigma/camera";
 *
 * if (import.meta.main) {
 *   console.log("OpenPnp Camera Test Program");
 *   console.log("Using openpnp version:", Camera.getLibraryVersion());
 *   //Camera.setLogLevel(7);
 *   using cam = new Camera();
 *
 *   const device = cam.devices().at(0);
 *   if (!device) throw new Error("no device found");
 *
 *   console.log("Device name:", device.name());
 *   console.log("Device formats:", device.formats());
 *
 *   // choose the format with the highest resolution
 *   const formatInfo = device.formats().sort((a, b) => b.width - a.width).at(0);
 *   if (!formatInfo) throw new Error("no format found");
 *
 *   using stream = device.stream(formatInfo);
 *   if (!stream) throw new Error("no stream found");
 *
 *   let frameNum = 0;
 *   for await (const frame of stream.next({ delay: 100 })) {
 *     if (frameNum == 5) break;
 *     writeBufferAsPPM(++frameNum, formatInfo.width, formatInfo.height, frame);
 *     console.log(`Written frame to frame_${frameNum}.ppm`);
 *   }
 * }
 *
 * function writeBufferAsPPM(
 *   frameNum: number,
 *   width: number,
 *   height: number,
 *   buffer: Uint8Array,
 * ): boolean {
 *   const ENCODER = new TextEncoder();
 *   const fname = `frame_${frameNum}.ppm`;
 *   const fout = Deno.createSync(fname);
 *   fout.writeSync(ENCODER.encode(`P6 ${width} ${height} 255\n`));
 *   fout.writeSync(buffer);
 *   fout.close();
 *   return true;
 * }
 * ```
 *
 * @module
 */

import { OpenPnp } from "./openpnp.ts";
import type { DeviceInfo, FormatInfoWithId, LogLevel } from "./types.ts";

/**
 * Represents a camera device with associated methods for interaction.
 */
export class Camera {
  #pnp: OpenPnp;
  #devices: Device[];
  /**
   * Constructs an instance of the Camera class.
   */
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

  /**
   * Retrieves the list of devices.
   * @returns An array of Device instances.
   */
  devices(): Device[] {
    return this.#devices;
  }

  /**
   * Releases the context associated with the camera.
   */
  [Symbol.dispose]() {
    this.#pnp.releaseContext();
  }

  /**
   * Retrieves the version of the library.
   * @returns The version of the library.
   */
  static getLibraryVersion(): string {
    return OpenPnp.getLibraryVersion();
  }

  /**
   * Sets the log level of the library.
   * @param level - The log level to set.
   */
  static setLogLevel(level: LogLevel) {
    OpenPnp.setLogLevel(level);
  }
}

/**
 * Represents a camera device with associated methods for interaction.
 */
export class Device {
  #pnp: OpenPnp;
  #deviceInfo: DeviceInfo;
  /**
   * Constructs an instance of the Device class.
   * @param pnp - The OpenPnp instance.
   * @param deviceInfo - Information about the device.
   */
  constructor(pnp: OpenPnp, deviceInfo: DeviceInfo) {
    this.#pnp = pnp;
    this.#deviceInfo = deviceInfo;
  }

  /**
   * Retrieves the name of the device.
   * @returns The name of the device.
   */
  name(): string {
    return this.#deviceInfo.name;
  }

  /**
   * Retrieves the formats supported by the device.
   * @returns An array of FormatInfoWithId instances.
   */
  formats(): FormatInfoWithId[] {
    return this.#deviceInfo.formats;
  }

  /**
   * Opens a stream with the specified format.
   * @param formatInfo - The format information.
   * @returns A Stream instance if successful, undefined otherwise.
   */
  stream(formatInfo: FormatInfoWithId): Stream | undefined {
    console.log(this.#deviceInfo.id, formatInfo.id);
    const streamId = this.#pnp.openStream(this.#deviceInfo.id, formatInfo.id);
    if (!this.#pnp.isOpenStream(streamId)) return;
    return new Stream(this.#pnp, streamId, formatInfo);
  }
}

/**
 * Represents a stream of video frames.
 */
export class Stream {
  #pnp: OpenPnp;
  #streamId: number;
  #formatInfo: FormatInfoWithId;
  #buffer: Uint8Array;
  /**
   * Constructs an instance of the Stream class.
   * @param pnp - The OpenPnp instance.
   * @param streamId - The ID of the stream.
   * @param formatInfo - The format information.
   */
  constructor(pnp: OpenPnp, streamId: number, formatInfo: FormatInfoWithId) {
    this.#pnp = pnp;
    this.#streamId = streamId;
    this.#formatInfo = formatInfo;
    this.#buffer = new Uint8Array(
      this.#formatInfo.width * this.#formatInfo.height * 4,
    );
  }

  /**
   * Retrieves the next frame from the stream.
   * @param options - Options for frame retrieval.
   * @param delay - Delay between frame captures in milliseconds.
   * @returns An asynchronous generator yielding frames.
   */
  async *next({ delay = 100 } = {}): AsyncGenerator<Uint8Array, void, unknown> {
    while (true) {
      while (true) {
        if (this.#pnp.hasNewFrame(this.#streamId)) break;
        await new Promise((r) => setTimeout(r, delay));
      }
      this.#pnp.captureFrame(this.#streamId, this.#buffer);
      yield this.#buffer;
    }
  }

  /**
   * Releases the resources associated with the stream.
   */
  [Symbol.dispose]() {
    this.#pnp.closeStream(this.#streamId);
  }
}
