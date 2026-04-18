import { spawn } from "node:child_process";
/**
 * Spawn a subprocess and forward its output.
 * - If `forward` is provided: stdio is "pipe", each line of stdout/stderr
 *   is passed to forward(line). Used for listr2-managed output.
 * - If not: stdio is "inherit". Used when the caller wants native streaming.
 */
export async function spawnWithForward(cmd, args, opts = {}) {
    const { forward, ...rest } = opts;
    return await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(cmd, args, {
            ...rest,
            stdio: forward ? ["ignore", "pipe", "pipe"] : "inherit",
        });
        if (forward && child.stdout && child.stderr) {
            let outBuf = "";
            let errBuf = "";
            const onOut = (chunk) => {
                outBuf += chunk.toString("utf8");
                let idx;
                while ((idx = outBuf.indexOf("\n")) >= 0) {
                    forward(outBuf.slice(0, idx));
                    outBuf = outBuf.slice(idx + 1);
                }
            };
            const onErr = (chunk) => {
                errBuf += chunk.toString("utf8");
                let idx;
                while ((idx = errBuf.indexOf("\n")) >= 0) {
                    forward(errBuf.slice(0, idx));
                    errBuf = errBuf.slice(idx + 1);
                }
            };
            child.stdout.on("data", onOut);
            child.stderr.on("data", onErr);
            child.on("close", () => {
                if (outBuf)
                    forward(outBuf);
                if (errBuf)
                    forward(errBuf);
            });
        }
        child.on("error", rejectPromise);
        child.on("exit", (code) => resolvePromise({ exitCode: code ?? 0 }));
    });
}
