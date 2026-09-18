function extractRetryDelayMs(error: unknown): number | null {
  if (!error) {
    return null;
  }

  let fullText = "";
  if (typeof error === "string") {
    fullText = error;
  } else if (error instanceof Error) {
    fullText = `${error.message} ${error.stack || ""}`;
  } else if (typeof error === "object") {
    try {
      fullText = JSON.stringify(error);
    } catch {
      fullText = String(error);
    }
  }

  const match = fullText.match(/(?:retry in|retry after)\s+([0-9]+(?:\.[0-9]+)?)\s*s/i);
  if (match?.[1]) {
    const seconds = Number.parseFloat(match[1]);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000) + 500;
    }
  }

  const isRateLimit =
    fullText.includes("too_many_requests") ||
    fullText.includes("RESOURCE_EXHAUSTED") ||
    fullText.includes("quota") ||
    fullText.includes("429");

  if (isRateLimit) {
    return 10000;
  }

  return null;
}

class TaskQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  public async enqueue<T>(task: () => Promise<T>, maxRetries = 5): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let retriesLeft = maxRetries;

      const executeWithRetry = async () => {
        while (true) {
          try {
            const result = await task();
            resolve(result);
            return;
          } catch (error) {
            const delayMs = extractRetryDelayMs(error);
            if (delayMs !== null && retriesLeft > 0) {
              retriesLeft--;
              console.log(
                `[Queue] Rate limit detected. Waiting ${(delayMs / 1000).toFixed(2)}s before retry (${maxRetries - retriesLeft}/${maxRetries})...`,
              );
              await new Promise((r) => setTimeout(r, delayMs));
              continue;
            }
            reject(error);
            return;
          }
        }
      };

      this.queue.push(executeWithRetry);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        try {
          await nextTask();
        } catch (err) {
          console.error("[Queue] Unhandled task rejection:", err);
        }
      }
    }

    this.isProcessing = false;
  }

  public get pendingCount(): number {
    return this.queue.length;
  }
}

export const transcriptionQueue = new TaskQueue();
