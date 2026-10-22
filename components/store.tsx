"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { get, set, del, keys } from "idb-keyval";
import {
  StudyState,
  initialState,
  localDate,
  generateTasks,
} from "@/lib/model";
import { stateSchema } from "@/lib/validation";

export const STORAGE_KEY = "ielts-study-os-v1";
export const ASSET_PREFIX = "ielts-asset-";
export async function saveAsset(key: string, blob: Blob) {
  await set(ASSET_PREFIX + key, blob);
}
export async function loadAsset(key: string): Promise<Blob | undefined> {
  return get(ASSET_PREFIX + key);
}
export async function deleteAsset(key: string) {
  await del(ASSET_PREFIX + key);
}
export function assetRefs(state: StudyState) {
  return [
    ...new Set([
      ...state.speaking.flatMap((r) => (r.audioKey ? [r.audioKey] : [])),
      ...state.practices.flatMap((r) =>
        r.attachmentKey ? [r.attachmentKey] : [],
      ),
      ...state.resources.flatMap((r) => [
        r.assetKey,
        ...(r.textKey ? [r.textKey] : []),
      ]),
      ...(state.drafts["speaking-audio"]
        ? [state.drafts["speaking-audio"]]
        : []),
    ]),
  ];
}
export async function clearAssets() {
  for (const key of await keys())
    if (typeof key === "string" && key.startsWith(ASSET_PREFIX)) await del(key);
}
type Store = {
  state: StudyState;
  ready: boolean;
  storageError: string;
  running: string | null;
  update: (fn: (s: StudyState) => StudyState) => void;
  replace: (s: StudyState) => void;
  start: (id: string) => void;
  pause: () => void;
  reset: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudyState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setError] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const runningRef = useRef<string | null>(null);
  const lastTick = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = raw
        ? (stateSchema.parse(JSON.parse(raw)) as StudyState)
        : initialState();
      const today = localDate();
      if (!loaded.days[today])
        loaded.days[today] = generateTasks(loaded, today);
      stateRef.current = loaded;
      setState(loaded);
      setReady(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      } catch {
        setError(
          "浏览器存储已满或不可写。当前数据仅在内存中，请立即导出备份。",
        );
      }
    } catch {
      setError(
        "本地记录无法读取，已保留原始数据。请到设置导出原始备份后，再决定是否清空；当前修改不会覆盖原数据。",
      );
      setReady(true);
    }
  }, []);
  const commit = (value: StudyState) => {
    const next = { ...value, updatedAt: new Date().toISOString() };
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setError("");
    } catch {
      setError("浏览器存储已满或不可写。当前数据仅在内存中，请立即导出备份。");
    }
  };
  const blocked = useRef(false);
  useEffect(() => {
    blocked.current = storageError.startsWith("本地记录无法读取");
  }, [storageError]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = stateSchema.parse(
          JSON.parse(event.newValue),
        ) as StudyState;
        runningRef.current = null;
        setRunning(null);
        stateRef.current = next;
        setState(next);
        setError(
          "另一个标签页更新了记录，已同步本页并暂停计时。请在一个标签页内专注学习。",
        );
      } catch {
        setError("另一个标签页的数据无法校验，本页没有覆盖它。请先导出备份。");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const update = (fn: (s: StudyState) => StudyState) => {
    const next = fn(stateRef.current);
    if (blocked.current) {
      stateRef.current = next;
      setState(next);
    } else commit(next);
  };
  const tick = () => {
    const id = runningRef.current;
    if (!id) return;
    const elapsed = Math.floor((Date.now() - lastTick.current) / 1000);
    if (elapsed <= 0) return;
    lastTick.current += elapsed * 1000;
    update((s) => ({
      ...s,
      days: Object.fromEntries(
        Object.entries(s.days).map(([day, tasks]) => [
          day,
          tasks.map((t) =>
            t.id === id ? { ...t, seconds: t.seconds + elapsed } : t,
          ),
        ]),
      ),
    }));
  };
  const pause = () => {
    tick();
    runningRef.current = null;
    setRunning(null);
  };
  useEffect(() => {
    const interval = setInterval(() => {
      if (runningRef.current && !runningRef.current.startsWith(localDate())) {
        pause();
        return;
      }
      tick();
      const today = localDate();
      if (!stateRef.current.days[today])
        update((s) => ({
          ...s,
          days: { ...s.days, [today]: generateTasks(s, today) },
        }));
    }, 1000);
    const hidden = () => {
      if (document.hidden) pause();
    };
    const blur = () => pause();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", blur);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", blur);
    };
    // Timer deliberately reads refs so saving never duplicates intervals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const start = (id: string) => {
    pause();
    if (!id.startsWith(localDate())) return;
    runningRef.current = id;
    lastTick.current = Date.now();
    setRunning(id);
  };
  const replace = (s: StudyState) => {
    pause();
    blocked.current = false;
    commit(s);
  };
  const reset = async () => {
    pause();
    blocked.current = false;
    const s = initialState();
    s.days[localDate()] = generateTasks(s, localDate());
    commit(s);
    await clearAssets();
  };
  return (
    <Context.Provider
      value={{
        state,
        ready,
        storageError,
        running,
        update,
        replace,
        start,
        pause,
        reset,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStudy() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing StudyProvider");
  return context;
}
