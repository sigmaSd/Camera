/**
 * Provides utility functions and constants for interacting with camera capabilities and managing streams.
 *
 * @example
 * ```ts
 * import {
 *   CAPPROPID_EXPOSURE,
 *   CAPPROPID_FOCUS,
 *   CAPPROPID_GAIN,
 *   CAPPROPID_WHITEBALANCE,
 * } from "jsr:@sigma/camera/ffi";
 * import { OpenPnp } from "jsr:@sigma/camera/openpnp";
 *
 * if (import.meta.main) {
 *   console.log("OpenPnp Capture Test Program");
 *   console.log("Version:", OpenPnp.getLibraryVersion());
 *   OpenPnp.setLogLevel(7);
 *
 *   const [deviceID = 0, deviceFormatID = 0] = Deno.args.map((arg) =>
 *     Number.parseInt(arg)
 *   );
 *
 *   const pnp = new OpenPnp();
 *   console.log("Device count:", pnp.getDeviceCount());
 *
 *   for (let i = 0; i < pnp.getDeviceCount(); i++) {
 *     console.log("Device name:", pnp.getDeviceName(i));
 *     console.log("Number of formats:", pnp.getNumFormats(i));
 *
 *     for (let j = 0; j < pnp.getNumFormats(i); j++) {
 *       const info = pnp.getFormatInfo(i, j);
 *       console.log(
 *         `Format ID ${j}: ${info.width} x ${info.height} pixels FOURCC=${info.fourcc}`,
 *       );
 *     }
 *   }
 *
 *   const streamId = pnp.openStream(deviceID, deviceFormatID);
 *   console.log("Stream ID:", streamId);
 *
 *   if (pnp.isOpenStream(streamId)) {
 *     console.log("Stream is open");
 *   } else {
 *     console.log("Stream is not open");
 *   }
 *
 *   pnp.setAutoProperty(streamId, CAPPROPID_EXPOSURE, 0);
 *   pnp.setAutoProperty(streamId, CAPPROPID_FOCUS, 0);
 *   pnp.setAutoProperty(streamId, CAPPROPID_WHITEBALANCE, 1);
 *   pnp.setAutoProperty(streamId, CAPPROPID_GAIN, 0);
 *
 *   const formatInfo = pnp.getFormatInfo(deviceID, deviceFormatID);
 *   const buffer = new Uint8Array(formatInfo.width * formatInfo.height * 3);
 *   let frameWriteCounter = 0;
 *
 *   while (true) {
 *     if (frameWriteCounter === 5) break;
 *     if (pnp.hasNewFrame(streamId)) {
 *       pnp.captureFrame(streamId, buffer);
 *       console.log("Frame captured");
 *       writeBufferAsPPM(
 *         ++frameWriteCounter,
 *         formatInfo.width,
 *         formatInfo.height,
 *         buffer,
 *       );
 *       console.log(`Written frame to frame_${frameWriteCounter}.ppm`);
 *     }
 *     await new Promise((r) => setTimeout(r, 100));
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
 * @module
 */

import * as byte from "@denosaurs/byte-type";
import { LIBRARY } from "./ffi.ts";
import type { FormatInfo, LogLevel } from "./types.ts";
import type { CapPropertyID } from "./types.ts";
import { CAPRESULT_OK } from "./ffi.ts";

/**
 * Represents the OpenPnp class for interacting with the library.
 */
export class OpenPnp {
  #ctx: Deno.PointerValue<unknown>;
  /**
   * Constructs an instance of the OpenPnp class.
   */
  constructor() {
    this.#ctx = LIBRARY.symbols.Cap_createContext();
  }

  /**
   * Retrieves the version of the library.
   * @returns The version of the library.
   */
  static getLibraryVersion(): string {
    const versionPtr = LIBRARY.symbols.Cap_getLibraryVersion();
    if (!versionPtr) throw new Error("getLibraryVersion returned null ptr");
    const version = Deno.UnsafePointerView.getCString(versionPtr);
    return version;
  }

  /**
   * Sets the log level of the library.
   * @param level - The log level to set.
   */
  static setLogLevel(level: LogLevel) {
    LIBRARY.symbols.Cap_setLogLevel(level);
  }

  /**
   * Retrieves the number of available devices.
   * @returns The number of available devices.
   */
  getDeviceCount(): number {
    return LIBRARY.symbols.Cap_getDeviceCount(this.#ctx);
  }

  /**
   * Retrieves the name of a device.
   * @param id - The ID of the device.
   * @returns The name of the device.
   */
  getDeviceName(id: number): string {
    const namePtr = LIBRARY.symbols.Cap_getDeviceName(this.#ctx, id);
    if (!namePtr) throw new Error("getDeviceName returned null ptr");
    const name = Deno.UnsafePointerView.getCString(namePtr);
    return name;
  }

  /**
   * Retrieves the number of formats supported by a device.
   * @param id - The ID of the device.
   * @returns The number of supported formats.
   */
  getNumFormats(id: number): number {
    return LIBRARY.symbols.Cap_getNumFormats(this.#ctx, id);
  }

  /**
   * Retrieves information about a specific format.
   * @param id - The ID of the device.
   * @param formatId - The ID of the format.
   * @returns Information about the format.
   */
  getFormatInfo(
    id: number,
    formatId: number,
  ): FormatInfo {
    const infoBuffer = new ArrayBuffer(4 /*u32 bytes*/ * 5);
    const res = LIBRARY.symbols.Cap_getFormatInfo(
      this.#ctx,
      id,
      formatId,
      infoBuffer,
    );
    if (res !== 0) {
      throw new Error("Cap_getNumFormats failed");
    }

    const rawFormatInfo = new byte.Struct({
      width: byte.u32,
      height: byte.u32,
      fourcc: byte.u32,
      fps: byte.u32,
      bpp: byte.u32,
    })
      .read(new DataView(infoBuffer));
    const formatInfo = {
      ...rawFormatInfo,
      fourcc: fourCCToString(rawFormatInfo.fourcc),
    };

    return formatInfo;
  }

  /**
   * Sets the automatic property for a device.
   * @param id - The ID of the device.
   * @param propertyId - The ID of the property.
   * @param value - The value to set.
   */
  setAutoProperty(
    id: number,
    propertyId: CapPropertyID,
    value: number,
  ) {
    LIBRARY.symbols.Cap_setAutoProperty(
      this.#ctx,
      id,
      propertyId,
      value,
    );
  }

  /**
   * Retrieves the limits of a property.
   * @param id - The ID of the device.
   * @param propertyId - The ID of the property.
   * @returns The limits of the property.
   */
  getPropertyLimits(
    id: number,
    propertyId: CapPropertyID,
  ): { exmax: number; exmin: number; edefault: number } {
    const exmax = new ArrayBuffer(4 /*i32 byte*/);
    const exmin = new ArrayBuffer(4 /*i32 byte*/);
    const edefault = new ArrayBuffer(4 /*i32 byte*/);
    if (
      LIBRARY.symbols.Cap_getPropertyLimits(
        this.#ctx,
        id,
        propertyId,
        exmax,
        exmin,
        edefault,
      ) !== 0
    ) {
      throw new Error("Cap_getPropertyLimits failed");
    }
    return {
      exmax: byte.u32.read(new DataView(exmax)),
      exmin: byte.u32.read(new DataView(exmin)),
      edefault: byte.u32.read(new DataView(edefault)),
    };
  }

  /**
   * Opens a stream for capturing frames.
   * @param deviceId - The ID of the device.
   * @param deviceFormatId - The ID of the device format.
   * @returns The ID of the opened stream.
   */
  openStream(deviceId: number, deviceFormatId: number): number {
    const res = LIBRARY.symbols.Cap_openStream(
      this.#ctx,
      deviceId,
      deviceFormatId,
    );
    if (res < 0) throw new Error("Cap_openStream failed");
    return res;
  }

  /**
   * Checks if a stream is open.
   * @param id - The ID of the stream.
   * @returns A boolean indicating if the stream is open.
   */
  isOpenStream(id: number): boolean {
    return LIBRARY.symbols.Cap_isOpenStream(this.#ctx, id) === 1;
  }

  /**
   * Checks if a new frame is available.
   * @param id - The ID of the stream.
   * @returns A boolean indicating if a new frame is available.
   */
  hasNewFrame(id: number): boolean {
    return LIBRARY.symbols.Cap_hasNewFrame(this.#ctx, id) === 1;
  }

  /**
   * Captures a frame from the stream.
   * @param id - The ID of the stream.
   * @param buffer - The buffer to store the frame.
   */
  captureFrame(
    id: number,
    buffer: Uint8Array,
  ): void {
    const res = LIBRARY.symbols.Cap_captureFrame(
      this.#ctx,
      id,
      buffer,
      buffer.byteLength,
    );
    if (res !== CAPRESULT_OK) {
      throw new Error("Cap_captureFrame failed");
    }
  }

  /**
   * Closes a stream.
   * @param id - The ID of the stream.
   */
  closeStream(id: number) {
    if (LIBRARY.symbols.Cap_closeStream(this.#ctx, id) !== CAPRESULT_OK) {
      throw new Error("Cap_closeStream failed");
    }
  }

  /**
   * Releases the context.
   */
  releaseContext() {
    if (LIBRARY.symbols.Cap_releaseContext(this.#ctx) !== CAPRESULT_OK) {
      throw new Error("Cap_releaseContext failed");
    }
  }
}

/**
 * Converts a four-character code to a string.
 * @param fourccParam - The four-character code.
 * @returns The string representation of the four-character code.
 */
function fourCCToString(fourccParam: number): string {
  let fourcc = fourccParam;
  let v = "";
  for (let i = 0; i < 4; i++) {
    v += String.fromCharCode(fourcc & 0xFF);
    fourcc >>= 8;
  }
  return v;
}
