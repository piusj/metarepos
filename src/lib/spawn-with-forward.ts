import { type SpawnOptions, spawn } from "node:child_process";

export type ForwardFn = (line: string) => void;

export type SpawnWithForwardOptions = SpawnOptions & {
  forward?: ForwardFn;
};

/**
 * Spawn a subprocess and forward its output.
 * - If `forward` is provided: stdio is "pipe", each line of stdout/stderr
 *   is passed to forward(line). Used for listr2-managed output.
 * - If not: stdio is "inherit". Used when the caller wants native streaming.
 */
export async function spawnWithForward(
  cmd: string,
  args: string[],
  opts: SpawnWithForwardOptions = {},
): Promise<{ exitCode: number }> {
  const { forward, ...rest } = opts;
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      ...rest,
      stdio: forward ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let exitCodeCapture = 0;
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      exitCodeCapture = code ?? 0;
    });

    if (forward && child.stdout && child.stderr) {
      let outBuf = "";
      let errBuf = "";
      const onOut = (chunk: Buffer) => {
        outBuf += chunk.toString("utf8");
        while (true) {
          const idx = outBuf.indexOf("\n");
          if (idx < 0) break;
          forward(outBuf.slice(0, idx));
          outBuf = outBuf.slice(idx + 1);
        }
      };
      const onErr = (chunk: Buffer) => {
        errBuf += chunk.toString("utf8");
        while (true) {
          const idx = errBuf.indexOf("\n");
          if (idx < 0) break;
          forward(errBuf.slice(0, idx));
          errBuf = errBuf.slice(idx + 1);
        }
      };
      child.stdout.on("data", onOut);
      child.stderr.on("data", onErr);
      child.on("close", () => {
        if (outBuf) forward(outBuf);
        if (errBuf) forward(errBuf);
        resolvePromise({ exitCode: exitCodeCapture });
      });
    } else {
      child.on("close", () => resolvePromise({ exitCode: exitCodeCapture }));
    }
  });
}
