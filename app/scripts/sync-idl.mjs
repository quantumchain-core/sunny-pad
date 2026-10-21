import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../program/target/idl/sunny_pad.json");
const destination = resolve(here, "../public/idl/sunny_pad.json");
await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
console.log(`Copied generated Anchor IDL to ${destination}`);
