import { createWorker } from "npm:tesseract.js@5.0.0";
import sharp from "npm:sharp@0.33.3";
import { Camera } from "../src/camera.ts";

if (import.meta.main) {
  const worker = createWorker("eng");

  using cam = new Camera();

  const device = cam.devices().at(0);
  if (!device) throw new Error("no device found");

  const formatInfo = device.formats().sort((a, b) => b.width - a.width).at(0);
  if (!formatInfo) throw new Error("no format found");

  using stream = device.stream(formatInfo);
  if (!stream) throw new Error("no stream found");

  for await (const frame of stream.next()) {
    worker.then(async (worker) => {
      const pngBuf = await sharp(frame, {
        raw: {
          width: formatInfo.width,
          height: formatInfo.height,
          channels: 3,
        },
      }).png().toBuffer();

      const result = await worker.recognize(pngBuf);
      console.log(result.data.text);
    });
    await new Promise((r) => setTimeout(r, 1000));
  }
}
