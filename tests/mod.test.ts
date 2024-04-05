import { Hello } from "../src/mod.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("hello", () => {
  const hello = new Hello();
  assertEquals(hello.hello({ size: 2 }), { size: 3 });
});
