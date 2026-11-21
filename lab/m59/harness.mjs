// Mac-side IPC to the already running, network-none disposable guest harness.
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
export const root = process.env.PIDP551_WORK ?? ".research/m59/guest";
export async function harness(op, data = "", wait = 1) {
  const id = randomBytes(8).toString("hex");
  writeFileSync(`${root}/request.tmp`, JSON.stringify({ id, op, data, wait }));
  renameSync(`${root}/request.tmp`, `${root}/request.json`);
  for (let i = 0; i < 300; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (existsSync(`${root}/response.json`)) {
      // Older Python harnesses replace the file contents in place. A read can
      // straddle that write; keep waiting for this ID without resending input.
      try {
        const reply = JSON.parse(readFileSync(`${root}/response.json`, "utf8"));
        if (reply.id === id) return reply.output;
      } catch (error) {
        if (!(error instanceof SyntaxError) && error.code !== "ENOENT")
          throw error;
      }
    }
  }
  throw Error("Disposable guest harness timed out; inspect before continuing");
}
