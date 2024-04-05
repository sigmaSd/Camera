import * as plug from "@denosaurs/plug";
import { version } from "../version.ts";

export interface World {
  size: number;
}

const SYMBOLS = {
  create: { parameters: [], result: "pointer" },
  hello: {
    parameters: ["pointer", "buffer", "buffer"],
    result: "i8",
  },
} satisfies Deno.ForeignLibraryInterface;

export const LIBRARY = await instantiate();
async function instantiate() {
  const name = "hello";
  // NOTE: replace this url with the correct repo url
  const url =
    `https://github.com/sigmaSd/deno-ffi-template/releases/download/${version}`;

  return await plug.dlopen(
    {
      name,
      url: Deno.env.get("RUST_LIB_PATH") || url,
      // reload cache if developping locally
      cache: Deno.env.get("RUST_LIB_PATH") ? "reloadAll" : "use",
      suffixes: {
        darwin: {
          aarch64: "_arm64",
          x86_64: "_x86_64",
        },
      },
    },
    SYMBOLS,
  );
}
