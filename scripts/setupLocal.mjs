import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const target = "config/runtime.json";
const source = "config/runtime.example.json";

mkdirSync("config", { recursive: true });
if (existsSync(target)) {
  console.log(`${target} already exists (leaving it as-is).`);
  process.exit(0);
}

copyFileSync(source, target);
console.log(`Created ${target} from ${source}.`);

