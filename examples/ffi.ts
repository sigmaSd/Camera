import * as byte from "https://deno.land/x/byte_type@0.4.0/mod.ts";
import {
  CAPPROPID_EXPOSURE,
  CAPPROPID_FOCUS,
  CAPPROPID_GAIN,
  CAPPROPID_WHITEBALANCE,
  CAPRESULT_OK,
  LIBRARY,
} from "../src/ffi.ts";

if (import.meta.main) {
  console.log("OpenPnp Capture Test Program");
  const versionPtr = LIBRARY.symbols.Cap_getLibraryVersion();
  if (!versionPtr) throw new Error("getLibraryVersion returned null ptr");
  const version = Deno.UnsafePointerView.getCString(versionPtr);
  console.log("version:", version);

  LIBRARY.symbols.Cap_setLogLevel(7);

  const [deviceID = 0, deviceFormatID = 0] = Deno.args.map((arg) =>
    Number.parseInt(arg)
  );

  const ctx = LIBRARY.symbols.Cap_createContext();
  const deviceCount = LIBRARY.symbols.Cap_getDeviceCount(ctx);
  console.log("devices count:", deviceCount);

  for (let i = 0; i < deviceCount; i++) {
    const namePtr = LIBRARY.symbols.Cap_getDeviceName(ctx, i);
    if (!namePtr) throw new Error("getDeviceName returned null ptr");
    const name = Deno.UnsafePointerView.getCString(namePtr);
    console.log(`ID ${i} -> ${name}`);

    const nFormats = LIBRARY.symbols.Cap_getNumFormats(ctx, i);
    console.log("number of foramts is:", nFormats);

    for (let j = 0; j < nFormats; j++) {
      const infoBuffer = new ArrayBuffer(4 /*u32 bytes*/ * 5);
      const res = LIBRARY.symbols.Cap_getFormatInfo(ctx, i, j, infoBuffer);
      if (res !== 0) {
        throw new Error("Cap_getNumFormats failed");
      }
      const formatInfoStruct = new byte.Struct({
        width: byte.u32,
        height: byte.u32,
        fourcc: byte.u32,
        fps: byte.u32,
        bpp: byte.u32,
      });
      const formatInfo = formatInfoStruct.read(new DataView(infoBuffer));

      console.log(
        `Format ID ${j}: ${formatInfo.width} x ${formatInfo.height} pixels FOURCC=${
          fourCCToString(formatInfo.fourcc)
        }`,
      );
    }
  }

  const streamID = LIBRARY.symbols.Cap_openStream(
    ctx,
    deviceID,
    deviceFormatID,
  );
  console.log(`Stream ID = ${streamID}`);

  if (LIBRARY.symbols.Cap_isOpenStream(ctx, streamID) === 1) {
    console.log("Stream is open");
  } else {
    console.log("Stream is closed");
  }

  const infoBuffer = new ArrayBuffer(8 * 5);
  const res = LIBRARY.symbols.Cap_getFormatInfo(
    ctx,
    deviceID,
    deviceFormatID,
    infoBuffer,
  );
  if (res !== 0) {
    throw new Error("Cap_getNumFormats failed");
  }
  const formatInfoStruct = new byte.Struct({
    width: byte.u32,
    height: byte.u32,
    fourcc: byte.u32,
    fps: byte.u32,
    bpp: byte.u32,
  });
  const finfo = formatInfoStruct.read(new DataView(infoBuffer));
  //disable auto exposure, focus and white balance
  LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_EXPOSURE, 0);
  LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_FOCUS, 0);
  LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_WHITEBALANCE, 1);
  LIBRARY.symbols.Cap_setAutoProperty(ctx, streamID, CAPPROPID_GAIN, 0);

  const exmax = new ArrayBuffer(4 /*i32 byte*/);
  const exmin = new ArrayBuffer(4 /*i32 byte*/);
  const edefault = new ArrayBuffer(4 /*i32 byte*/);
  if (
    LIBRARY.symbols.Cap_getPropertyLimits(
      ctx,
      streamID,
      CAPPROPID_EXPOSURE,
      exmin,
      exmax,
      edefault,
    ) === CAPRESULT_OK
  ) {
    console.log(exmax, exmin, edefault);
    //TODO
  } else {
    console.log("Could not get exposure limits.");
  }

  const buffer = new Uint8Array(finfo.width * finfo.height * 3).map(() => 1);
  let frameWriteCounter = 0;
  while (true) {
    if (frameWriteCounter === 5) break;
    if (LIBRARY.symbols.Cap_hasNewFrame(ctx, streamID) !== 1) {
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }
    if (
      LIBRARY.symbols.Cap_captureFrame(
        ctx,
        streamID,
        buffer,
        buffer.byteLength,
      ) ===
        CAPRESULT_OK
    ) {
      console.log("Frame captured");
      if (
        writeBufferAsPPM(
          ++frameWriteCounter,
          finfo.width,
          finfo.height,
          buffer,
        )
      ) {
        console.log(`Written frame to frame_${frameWriteCounter}.ppm`);
      } else {
        console.log(`Failed to write frame to frame_${frameWriteCounter}.ppm`);
      }
    }
  }

  LIBRARY.symbols.Cap_closeStream(ctx, streamID);
  const result = LIBRARY.symbols.Cap_releaseContext(ctx);
  if (result !== CAPRESULT_OK) {
    throw new Error("Cap_releaseContext failed");
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

function writeBufferAsPPM(
  frameNum: number,
  width: number,
  height: number,
  buffer: Uint8Array,
): boolean {
  const ENCODER = new TextEncoder();
  const fname = `frame_${frameNum}.ppm`;
  const fout = Deno.createSync(fname);
  fout.writeSync(ENCODER.encode(`P6 ${width} ${height} 255\n`));
  fout.writeSync(buffer);
  fout.close();
  return true;
}
