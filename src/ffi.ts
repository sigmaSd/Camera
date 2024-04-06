import * as plug from "https://deno.land/x/plug@1.0.4/mod.ts";

export const CapDeviceID = "u32";
export const CapFormatId = "u32";
export const CapResult = "u32";
export const CapStream = "i32";
export const CapContext = "pointer";
export const CapPropertyID = "u32";

export const CAPRESULT_OK = 0;
export const CAPRESULT_ERR = 1;
export const CAPRESULT_DEVICENOTFOUND = 2;
export const CAPRESULT_FORMATNOTSUPPORTED = 3;
export const CAPRESULT_PROPERTYNOTSUPPORTED = 4;

// supported properties:
export const CAPPROPID_EXPOSURE = 1;
export const CAPPROPID_FOCUS = 2;
export const CAPPROPID_ZOOM = 3;
export const CAPPROPID_WHITEBALANCE = 4;
export const CAPPROPID_GAIN = 5;
export const CAPPROPID_BRIGHTNESS = 6;
export const CAPPROPID_CONTRAST = 7;
export const CAPPROPID_SATURATION = 8;
export const CAPPROPID_GAMMA = 9;
export const CAPPROPID_HUE = 10;
export const CAPPROPID_SHARPNESS = 11;
export const CAPPROPID_BACKLIGHTCOMP = 12;
export const CAPPROPID_POWERLINEFREQ = 13;
export const CAPPROPID_LAST = 14;

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
} satisfies Deno.ForeignLibraryInterface;

export const LIBRARY = await instantiate();
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
