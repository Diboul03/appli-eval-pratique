import { useCallback, useEffect, useRef, useState } from "react";

interface ExamTimerResult {
  elapsedMs: number;
  remainingMs: number;
  isRunning: boolean;
  isOvertime: boolean;
  start: () => void;
  reset: () => void;
}

export function useExamTimer(examDurationMinutes: number): ExamTimerResult {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const durationMs = examDurationMinutes > 0 ? examDurationMinutes * 60_000 : 0;

  const clearIntervalSafe = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearIntervalSafe();
    setElapsedMs(0);
    setIsRunning(false);
    startTimeRef.current = null;
  }, [clearIntervalSafe]);

  const start = useCallback(() => {
    if (durationMs <= 0) {
      reset();
      return;
    }

    clearIntervalSafe();
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setIsRunning(true);

    intervalRef.current = window.setInterval(() => {
      if (startTimeRef.current == null) return;
      const diff = Date.now() - startTimeRef.current;
      setElapsedMs(diff);
    }, 1000);
  }, [clearIntervalSafe, durationMs, reset]);

  useEffect(() => {
    return () => {
      clearIntervalSafe();
    };
  }, [clearIntervalSafe]);

  const remainingMs = durationMs > 0 ? durationMs - elapsedMs : 0;
  const isOvertime = durationMs > 0 && elapsedMs > durationMs;

  return {
    elapsedMs,
    remainingMs,
    isRunning,
    isOvertime,
    start,
    reset,
  };
}
