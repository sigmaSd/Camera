import {
  CAPPROPID_EXPOSURE,
  CAPPROPID_FOCUS,
  CAPPROPID_GAIN,
  CAPPROPID_WHITEBALANCE,
} from "../src/ffi.ts";
import { OpenPnp } from "../src/openpnp.ts";

if (import.meta.main) {
  console.log("OpenPnp Capture Test Program");
  console.log("Version:", OpenPnp.getLibraryVersion());
  OpenPnp.setLogLevel(7);

  const [deviceID = 0, deviceFormatID = 0] = Deno.args.map((arg) =>
    Number.parseInt(arg)
  );

  const pnp = new OpenPnp();
  console.log("Device count:", pnp.getDeviceCount());

  for (let i = 0; i < pnp.getDeviceCount(); i++) {
    console.log("Device name:", pnp.getDeviceName(i));
    console.log("Number of formats:", pnp.getNumFormats(i));

    for (let j = 0; j < pnp.getNumFormats(i); j++) {
      const info = pnp.getFormatInfo(i, j);
      console.log(
        `Format ID ${j}: ${info.width} x ${info.height} pixels FOURCC=${info.fourcc}`,
      );
    }
  }

  const streamId = pnp.openStream(deviceID, deviceFormatID);
  console.log("Stream ID:", streamId);

  if (pnp.isOpenStream(streamId)) {
    console.log("Stream is open");
  } else {
    console.log("Stream is not open");
  }

  pnp.setAutoProperty(streamId, CAPPROPID_EXPOSURE, 0);
  pnp.setAutoProperty(streamId, CAPPROPID_FOCUS, 0);
  pnp.setAutoProperty(streamId, CAPPROPID_WHITEBALANCE, 1);
  pnp.setAutoProperty(streamId, CAPPROPID_GAIN, 0);

  const formatInfo = pnp.getFormatInfo(deviceID, deviceFormatID);
  const buffer = new Uint8Array(formatInfo.width * formatInfo.height * 3);
  let frameWriteCounter = 0;

  while (true) {
    if (frameWriteCounter === 5) break;
    if (pnp.hasNewFrame(streamId)) {
      pnp.captureFrame(streamId, buffer);
      console.log("Frame captured");
      writeBufferAsPPM(
        ++frameWriteCounter,
        formatInfo.width,
        formatInfo.height,
        buffer,
      );
      console.log(`Written frame to frame_${frameWriteCounter}.ppm`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  pnp.closeStream(streamId);
  pnp.releaseContext();
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
