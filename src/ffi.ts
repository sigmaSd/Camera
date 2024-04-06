/**
 * Provides utility functions and constants for interacting with camera capabilities and managing streams.
 *
 * @example
 * ```ts
 * import * as byte from "@denosaurs/byte-type";
 * import {
 *   CAPPROPID_EXPOSURE,
 *   CAPPROPID_FOCUS,
 *   CAPPROPID_GAIN,
 *   CAPPROPID_WHITEBALANCE,
 *   CAPRESULT_OK,
 *   LIBRARY,
 * } from "jsr:@sigma/camera/ffi";
 *
 * if (import.meta.main) {
 *   console.log("OpenPnp Capture Test Program");
 *   const versionPtr = LIBRARY.symbols.Cap_getLibraryVersion();
 *   if (!versionPtr) throw new Error("getLibraryVersion returned null ptr");
 *   const version = Deno.UnsafePointerView.getCString(versionPtr);
 *   console.log("version:", version);
 *
 *   LIBRARY.symbols.Cap_setLogLevel(7);
 *
 *   const [deviceID = 0, deviceFormatID = 0] = Deno.args.map((arg) =>
 *     Number.parseInt(arg)
 *   );
 *
 *   const ctx = LIBRARY.symbols.Cap_createContext();
 *   const deviceCount = LIBRARY.symbols.Cap_getDeviceCount(ctx);
 *   console.log("devices count:", deviceCount);
 *
 *   for (let i = 0; i < deviceCount; i++) {
 *     const namePtr = LIBRARY.symbols.Cap_getDeviceName(ctx, i);
 *     if (!namePtr) throw new Error("getDeviceName returned null ptr");
 *     const name = Deno.UnsafePointerView.getCString(namePtr);
 *     console.log(`ID ${i} -> ${name}`);
 *
 *     const nFormats = LIBRARY.symbols.Cap_getNumFormats(ctx, i);
 *     console.log("number of foramts is:", nFormats);
 *
 *     for (let j = 0; j < nFormats; j++) {
 *       const infoBuffer = new ArrayBuffer(4  * 5);
 *
 *       const res = LIBRARY.symbols.Cap_getFormatInfo(ctx, i, j, infoBuffer);
 *       if (res !== 0) {
 *         throw new Error("Cap_getNumFormats failed");
 *       }
 *       const formatInfoStruct = new byte.Struct({
 *         width: byte.u32,
 *         height: byte.u32,
 *         fourcc: byte.u32,
 *         fps: byte.u32,
 *         bpp: byte.u32,
 *       });
 *       const formatInfo = formatInfoStruct.read(new DataView(infoBuffer));
 *
 *       console.log(
 *         `Format ID ${j}: ${formatInfo.width} x ${formatInfo.height} pixels FOURCC=${
 *           fourCCToString(formatInfo.fourcc)
 *         }`,
 *       );
 *     }
 *   }
 *
 *   const streamID = LIBRARY.symbols.Cap_openStream(
 *     ctx,
 *     deviceID,
 *     deviceFormatID,
 *   );
 *   console.log(`Stream ID = ${streamID}`);
 *
 *   if (LIBRARY.symbols.Cap_isOpenStream(ctx, streamID) === 1) {
 *     console.log("Stream is open");
 *   } else {
 *     console.log("Stream is closed");
 *   }
 *
 *   const infoBuffer = new ArrayBuffer(8 * 5);
 *   const res = LIBRARY.symbols.Cap_getFormatInfo(
 *     ctx,
 *     deviceID,
 *     deviceFormatID,
 *     infoBuffer,
 *   );
 *   if (res !== 0) {
 *     throw new Error("Cap_getNumFormats failed");
 *   }
 *   const formatInfoStruct = new byte.Struct({
 *     width: byte.u32,
 *     height: byte.u32,
 *     fourcc: byte.u32,
 *     fps: byte.u32,
 *     bpp: byte.u32,
 *   });
 *   const finfo = formatInfoStruct.read(new DataView(infoBuffer));
 *   //disable auto exposure, focus and white balance
 *   LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_EXPOSURE, 0);
 *   LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_FOCUS, 0);
 *   LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_WHITEBALANCE, 1);
 *   LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_GAIN, 0);
 *
 *   const exmax = new ArrayBuffer(4 );
 *   const exmin = new ArrayBuffer(4 );
 *   const edefault = new ArrayBuffer(4 );
 *   if (
 *     LIBRARY.symbols.Cap_getPropertyLimits(
 *       ctx,
 *       streamID,
 *       CAPPROPID_EXPOSURE,
 *       exmin,
 *       exmax,
 *       edefault,
 *     ) === CAPRESULT_OK
 *   ) {
 *     console.log(exmax, exmin, edefault);
 *     //TODO
 *   } else {
 *     console.log("Could not get exposure limits.");
 *   }
 *
 *   const buffer = new Uint8Array(finfo.width * finfo.height * 3).map(() => 1);
 *   let frameWriteCounter = 0;
 *   while (true) {
 *     if (frameWriteCounter === 5) break;
 *     if (LIBRARY.symbols.Cap_hasNewFrame(ctx, streamID) !== 1) {
 *       await new Promise((r) => setTimeout(r, 100));
 *       continue;
 *     }
 *     if (
 *       LIBRARY.symbols.Cap_captureFrame(
 *         ctx,
 *         streamID,
 *         buffer,
 *         buffer.byteLength,
 *       ) ===
 *         CAPRESULT_OK
 *     ) {
 *       console.log("Frame captured");
 *       if (
 *         writeBufferAsPPM(
 *           ++frameWriteCounter,
 *           finfo.width,
 *           finfo.height,
 *           buffer,
 *         )
 *       ) {
 *         console.log(`Written frame to frame_${frameWriteCounter}.ppm`);
 *       } else {
 *         console.log(`Failed to write frame to frame_${frameWriteCounter}.ppm`);
 *       }
 *     }
 *   }
 *
 *   LIBRARY.symbols.Cap_closeStream(ctx, streamID);
 *   const result = LIBRARY.symbols.Cap_releaseContext(ctx);
 *   if (result !== CAPRESULT_OK) {
 *     throw new Error("Cap_releaseContext failed");
 *   }
 * }
 *
 * function fourCCToString(fourccParam: number): string {
 *   let fourcc = fourccParam;
 *   let v = "";
 *   for (let i = 0; i < 4; i++) {
 *     v += String.fromCharCode(fourcc & 0xFF);
 *     fourcc >>= 8;
 *   }
 *   return v;
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

import * as plug from "@denosaurs/plug";

// supported properties:

/**
 * Represents the property ID for exposure.
 */
export const CAPPROPID_EXPOSURE = 1;

/**
 * Represents the property ID for focus.
 */
export const CAPPROPID_FOCUS = 2;

/**
 * Represents the property ID for zoom.
 */
export const CAPPROPID_ZOOM = 3;

/**
 * Represents the property ID for white balance.
 */
export const CAPPROPID_WHITEBALANCE = 4;

/**
 * Represents the property ID for gain.
 */
export const CAPPROPID_GAIN = 5;

/**
 * Represents the property ID for brightness.
 */
export const CAPPROPID_BRIGHTNESS = 6;

/**
 * Represents the property ID for contrast.
 */
export const CAPPROPID_CONTRAST = 7;

/**
 * Represents the property ID for saturation.
 */
export const CAPPROPID_SATURATION = 8;

/**
 * Represents the property ID for gamma.
 */
export const CAPPROPID_GAMMA = 9;

/**
 * Represents the property ID for hue.
 */
export const CAPPROPID_HUE = 10;

/**
 * Represents the property ID for sharpness.
 */
export const CAPPROPID_SHARPNESS = 11;

/**
 * Represents the property ID for backlight compensation.
 */
export const CAPPROPID_BACKLIGHTCOMP = 12;

/**
 * Represents the property ID for power line frequency.
 */
export const CAPPROPID_POWERLINEFREQ = 13;

/**
 * Represents the last property ID.
 */
export const CAPPROPID_LAST = 14;

/**
 * Represents the data type for a device ID.
 */
export const CapDeviceID = "u32";

/**
 * Represents the data type for a format ID.
 */
export const CapFormatId = "u32";

/**
 * Represents the data type for a result of a capability operation.
 */
export const CapResult = "u32";

/**
 * Represents the data type for a stream.
 */
export const CapStream = "i32";

/**
 * Represents the data type for a context.
 */
export const CapContext = "pointer";

/**
 * Represents the property IDs for camera capabilities.
 */
export const CapPropertyID = "u32";

/**
 * Represents the result code indicating successful operation.
 */
export const CAPRESULT_OK = 0;

/**
 * Represents the result code indicating an error.
 */
export const CAPRESULT_ERR = 1;

/**
 * Represents the result code indicating that the device was not found.
 */
export const CAPRESULT_DEVICENOTFOUND = 2;

/**
 * Represents the result code indicating that the format is not supported.
 */
export const CAPRESULT_FORMATNOTSUPPORTED = 3;

/**
 * Represents the result code indicating that the property is not supported.
 */
export const CAPRESULT_PROPERTYNOTSUPPORTED = 4;

/**
 * Represents the context of capability operations.
 */
const SYMBOLS = {
  Cap_createContext: {
    parameters: [],
    result: CapContext,
  },
  Cap_getDeviceCount: {
    parameters: [CapContext],
    result: "u32",
  },
  Cap_getDeviceName: {
    parameters: [CapContext, CapDeviceID],
    result: "pointer",
  },
  Cap_getNumFormats: {
    parameters: [CapContext, CapDeviceID],
    result: "i32",
  },
  Cap_getFormatInfo: {
    parameters: [CapContext, CapDeviceID, CapFormatId, "buffer"],
    result: CapResult,
  },
  Cap_getLibraryVersion: {
    parameters: [],
    result: "pointer",
  },
  Cap_setLogLevel: {
    parameters: ["u32"],
    result: "void",
  },
  Cap_openStream: {
    parameters: [CapContext, CapDeviceID, CapFormatId],
    result: CapStream,
  },
  Cap_isOpenStream: {
    parameters: [CapContext, CapStream],
    result: "u32",
  },
  Cap_setAutoProperty: {
    parameters: [CapContext, CapStream, CapPropertyID, "u32"],
    result: CapResult,
  },
  Cap_getPropertyLimits: {
    parameters: [
      CapContext,
      CapStream,
      CapPropertyID,
      "buffer",
      "buffer",
      "buffer",
    ],
    result: CapResult,
  },
  Cap_captureFrame: {
    parameters: [CapContext, CapStream, "buffer", "u32"],
    result: CapResult,
  },
  Cap_releaseContext: {
    parameters: [CapContext],
    result: CapResult,
  },
  Cap_closeStream: {
    parameters: [CapContext, CapStream],
    result: CapResult,
  },
  Cap_hasNewFrame: {
    parameters: [CapContext, CapStream],
    result: "u32",
  },
} as const;

/**
 * Represents the dynamic library instance.
 */
export const LIBRARY: Deno.DynamicLibrary<typeof SYMBOLS> = await instantiate();

/**
 * Instantiates the dynamic library.
 * @returns A promise resolving to a dynamic library instance.
 */
export async function instantiate(): Promise<
  Deno.DynamicLibrary<typeof SYMBOLS>
> {
  const name = "libopenpnp-capture";
  const version = "v0.0.28";
  const url =
    `https://github.com/openpnp/openpnp-capture/releases/download/${version}`;

  return await plug.dlopen(
    {
      name,
      url,
      suffixes: {
        linux: {
          x86_64: "-ubuntu-20.04-x86_64",
          aarch64: "-ubuntu-20.04-arm64",
        },
        darwin: {
          x86_64: "-macos-latest-x86_64",
          aarch64: "-macos-latest-arm64",
        },
        windows: {
          x86_64: "-windows-latest-x86_64",
        },
      },
      // this line erases the default prefixes
      prefixes: {},
    },
    SYMBOLS,
  );
}
