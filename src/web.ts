import { bridge } from "./native";

/** Browser fallback: localStorage instead of the OS config directory. The key
 *  lives in the page here — which is exactly why the native build keeps it in
 *  Rust and this file is the only place that difference exists. */
const T = "hanzo.chat.threads";
const K = "hanzo.chat.key";

const seed = [
  {
    id: "intro",
    title: "What is this app",
    model: "zen-omni",
    msgs: [
      { role: "user", content: "What is this app?" },
      {
        role: "assistant",
        content:
          "A desktop AI client: Tauri v2 shell, React UI, streaming SSE to the Hanzo gateway at api.hanzo.ai/v1/chat/completions.\n\nThreads and your API key are written by the Rust core into the OS config directory, so they never sit in web storage. Swap the endpoint with VITE_HANZO_API to point at any OpenAI-compatible gateway — including a local one.",
      },
    ],
  },
];

export const call = bridge({
  load_threads: () => {
    const raw = localStorage.getItem(T);
    if (!raw) return seed;
    try {
      return JSON.parse(raw);
    } catch {
      return seed;
    }
  },
  save_threads: ({ threads }: { threads: unknown }) => localStorage.setItem(T, JSON.stringify(threads)),
  load_key: () => localStorage.getItem(K) ?? "",
  save_key: ({ key }: { key: string }) => localStorage.setItem(K, key),
});
