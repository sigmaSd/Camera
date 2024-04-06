# Camera

A cross platform video capture library with a focus on machine vision. (Deno ffi
bindings to openpnp-capture)

## Usage

```ts
import { Camera } from "jsr:@sigma/camera";

if (import.meta.main) {
  console.log("OpenPnp Camera Test Program");
  console.log("Using openpnp version:", Camera.getLibraryVersion());
  //Camera.setLogLevel(7);
  using cam = new Camera();

  const device = cam.devices().at(0);
  if (!device) throw new Error("no device found");

  console.log("Device name:", device.name());
  console.log("Device formats:", device.formats());

  // choose the format with the highest resolution
  const formatInfo = device.formats().sort((a, b) => b.width - a.width).at(0);
  if (!formatInfo) throw new Error("no format found");

  using stream = device.stream(formatInfo);
  if (!stream) throw new Error("no stream found");

  let frameNum = 0;
  for await (const frame of stream.next({ delay: 100 })) {
    if (frameNum === 5) break;
    writeBufferAsPPM(++frameNum, formatInfo.width, formatInfo.height, frame);
    console.log(`Written frame to frame_${frameNum}.ppm`);
  }
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
```

This library exports 3 levels of abstractions:

- ffi: raw deno bindings to openpnp
- openpnp: thin javascript wrapper over the raw bidings
- default export: high level javascript api

The default export is the recommended to use.
