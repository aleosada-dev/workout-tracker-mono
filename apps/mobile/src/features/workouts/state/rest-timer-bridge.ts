type RestTimerHandler = (seconds: number) => void;

let handler: RestTimerHandler | null = null;

export const restTimerBridge = {
  register(fn: RestTimerHandler): () => void {
    handler = fn;
    return () => {
      if (handler === fn) handler = null;
    };
  },
};

export function startRestTimer(seconds: number): void {
  handler?.(seconds);
}
