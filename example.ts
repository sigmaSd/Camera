import { Hello, type World } from "./src/mod.ts";

const hello = new Hello();
const world: World = { size: 500 };
console.log("The world size is:", world);
const newWorld = hello.hello(world);
console.log("The newWorld size is:", newWorld);
