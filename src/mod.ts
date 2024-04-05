import { LIBRARY, type World } from "./ffi.ts";
import { createPtrFromBuffer, decodeCstring } from "./utils.ts";
import { decodeJsonCstring } from "./utils.ts";
import { encodeJsonCstring } from "./utils.ts";

export { type World } from "./ffi.ts";

/** class that increases the world size by saying hello */
export class Hello {
  #this;

  constructor() {
    const ptr = LIBRARY.symbols.create();
    if (!ptr) throw new Error("create failed");
    this.#this = ptr;
  }

  hello(world: World): World {
    const resultBuffer = new Uint8Array(8);
    const result = LIBRARY.symbols.hello(
      this.#this,
      encodeJsonCstring(world),
      resultBuffer,
    );
    const ptr = createPtrFromBuffer(resultBuffer);
    if (result === -1) throw new Error(decodeCstring(ptr));
    return decodeJsonCstring(ptr);
  }
}
