import * as byte from "@denosaurs/byte-type";
import { LIBRARY } from "./ffi.ts";
import type { FormatInfo, LogLevel } from "./types.ts";
import type { CapPropertyID } from "./types.ts";
import { CAPRESULT_OK } from "./ffi.ts";

export class OpenPnp {
  #ctx: Deno.PointerValue<unknown>;
  constructor() {
    this.#ctx = LIBRARY.symbols.Cap_createContext();
  }

  static getLibraryVersion(): string {
    const versionPtr = LIBRARY.symbols.Cap_getLibraryVersion();
    if (!versionPtr) throw new Error("getLibraryVersion returned null ptr");
    const version = Deno.UnsafePointerView.getCString(versionPtr);
    return version;
  }

  static setLogLevel(level: LogLevel) {
    LIBRARY.symbols.Cap_setLogLevel(level);
  }

  getDeviceCount(): number {
    return LIBRARY.symbols.Cap_getDeviceCount(this.#ctx);
  }

  getDeviceName(id: number): string {
    const namePtr = LIBRARY.symbols.Cap_getDeviceName(this.#ctx, id);
    if (!namePtr) throw new Error("getDeviceName returned null ptr");
    const name = Deno.UnsafePointerView.getCString(namePtr);
    return name;
  }

  getNumFormats(id: number): number {
    return LIBRARY.symbols.Cap_getNumFormats(this.#ctx, id);
  }

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

  //TODO: this is not tested
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

  openStream(deviceId: number, deviceFormatId: number): number {
    const res = LIBRARY.symbols.Cap_openStream(
      this.#ctx,
      deviceId,
      deviceFormatId,
    );
    if (res < 0) throw new Error("Cap_openStream failed");
    return res;
  }

  isOpenStream(id: number): boolean {
    return LIBRARY.symbols.Cap_isOpenStream(this.#ctx, id) === 1;
  }

  hasNewFrame(id: number): boolean {
    return LIBRARY.symbols.Cap_hasNewFrame(this.#ctx, id) === 1;
  }

  captureFrame(
    id: number,
    buffer: Uint8Array,
  ) {
    const res = LIBRARY.symbols.Cap_captureFrame(
      this.#ctx,
      id,
      buffer,
      buffer.byteLength,
    );
    if (res !== CAPRESULT_OK) {
      throw new Error("Cap_captureFrame failed");
    }
    return buffer;
  }

  closeStream(id: number) {
    if (LIBRARY.symbols.Cap_closeStream(this.#ctx, id) !== CAPRESULT_OK) {
      throw new Error("Cap_closeStream failed");
    }
  }

  releaseContext() {
    if (LIBRARY.symbols.Cap_releaseContext(this.#ctx) !== CAPRESULT_OK) {
      throw new Error("Cap_releaseContext failed");
    }
  }
}

function fourCCToString(fourccParam: number): string {
  let fourcc = fourccParam;
  let v = "";
  for (let i = 0; i < 4; i++) {
    v += String.fromCharCode(fourcc & 0xFF);
    fourcc >>= 8;
  }
  return v;
}
