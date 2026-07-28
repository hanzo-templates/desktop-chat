import { useEffect, useRef, useState } from "react";
import { Win, NavItem } from "./shell";
import { isNative } from "./native";
import { call } from "./web";

const RELEASES = "https://github.com/hanzo-templates/desktop-chat/releases/latest";
const API = import.meta.env.VITE_HANZO_API ?? "https://api.hanzo.ai/v1";
const MODELS = ["zen-omni", "claude-opus-4", "gpt-5", "llama-4-scout"];

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Thread = { id: string; title: string; model: string; msgs: Msg[] };

export default function App() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [id, setId] = useState("");
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [t, k] = await Promise.all([call("load_threads"), call("load_key")]);
      setThreads(t);
      setId(t[0]?.id ?? "");
      setKey(k);
    })();
  }, []);

  const th = threads.find((t) => t.id === id);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [th?.msgs.length, busy]);

  function write(next: Thread[]) {
    setThreads(next);
    call("save_threads", { threads: next });
  }

  async function send() {
    if (!th || !draft.trim() || busy) return;
    const msgs: Msg[] = [...th.msgs, { role: "user", content: draft.trim() }];
    const title = th.msgs.length === 0 ? draft.trim().slice(0, 40) : th.title;
    write(threads.map((t) => (t.id === id ? { ...t, msgs, title } : t)));
    setDraft("");
    setBusy(true);
    setNote("");

    // Streaming SSE straight to the Hanzo gateway. The key never touches the
    // page in the native build — it lives in the OS config dir via `save_key`.
    let out = "";
    const bump = (s: string) =>
      setThreads((ts) =>
        ts.map((t) =>
          t.id === id
            ? { ...t, msgs: [...msgs, { role: "assistant" as const, content: s }] }
            : t,
        ),
      );
    try {
      const r = await fetch(`${API}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({ model: th.model, messages: msgs, stream: true }),
      });
      if (!r.ok || !r.body) throw new Error(`${r.status} ${r.statusText}`);
      const rd = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          const d = l.slice(5).trim();
          if (d === "[DONE]") continue;
          try {
            out += JSON.parse(d).choices?.[0]?.delta?.content ?? "";
            bump(out);
          } catch { /* keep-alive frame */ }
        }
      }
    } catch (e) {
      setNote(`${(e as Error).message} — add an API key in the sidebar`);
      out ||= "_no response — set an API key, or point VITE_HANZO_API at your own gateway._";
      bump(out);
    }
    setBusy(false);
    setThreads((ts) => {
      call("save_threads", { threads: ts });
      return ts;
    });
  }

  function fresh() {
    const t: Thread = { id: crypto.randomUUID(), title: "New chat", model: th?.model ?? MODELS[0], msgs: [] };
    write([t, ...threads]);
    setId(t.id);
  }

  return (
    <Win
      title="Chat"
      sub={th?.model}
      releases={RELEASES}
      flush
      status={
        <>
          <span>{API}</span>
          <span className="grow" />
          <span>{key ? "key set" : "no key"}</span>
          <span>{isNative ? "OS config dir" : "localStorage"}</span>
        </>
      }
      side={
        <>
          <button className="btn pri" style={{ width: "100%" }} onClick={fresh}>
            new chat
          </button>
          <h2>Threads</h2>
          <nav className="nav">
            {threads.map((t) => (
              <NavItem key={t.id} on={t.id === id} onClick={() => setId(t.id)} tail={t.msgs.length || ""}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              </NavItem>
            ))}
          </nav>
          <h2>Model</h2>
          <select
            className="inp"
            value={th?.model ?? MODELS[0]}
            onChange={(e) => write(threads.map((t) => (t.id === id ? { ...t, model: e.target.value } : t)))}
          >
            {MODELS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <h2>API key</h2>
          <input
            className="inp"
            type="password"
            placeholder="sk-…"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              call("save_key", { key: e.target.value });
            }}
          />
          <p className="dim" style={{ fontSize: 11, padding: "6px 2px 0" }}>
            Stored by the Rust core in the OS config directory, never in the page.
          </p>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateRows: "1fr auto", height: "100%" }}>
        <div style={{ overflow: "auto", padding: "18px 22px" }}>
          {!th || th.msgs.length === 0 ? (
            <div className="empty">
              ask anything — streaming SSE from <span className="mono">{API}/chat/completions</span>
            </div>
          ) : (
            th.msgs.map((m, i) => (
              <div key={i} style={{ margin: "0 0 18px", display: "flex", gap: 12 }}>
                <div
                  className="mono"
                  style={{
                    flex: "none", width: 60, fontSize: 11, paddingTop: 3,
                    color: m.role === "user" ? "var(--accent)" : "var(--accent-2)",
                  }}
                >
                  {m.role}
                </div>
                <div style={{ whiteSpace: "pre-wrap", color: m.role === "user" ? "var(--fg)" : "var(--fg-2)" }}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {busy && <div className="dim mono">…</div>}
          <div ref={end} />
        </div>
        <div style={{ borderTop: "1px solid var(--line)", padding: 12, background: "var(--bg-2)" }}>
          {note && <div className="tag warn" style={{ marginBottom: 8, display: "inline-block" }}>{note}</div>}
          <div className="row">
            <input
              className="inp"
              placeholder="message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            />
            <button className="btn pri" onClick={send} disabled={busy || !draft.trim()}>
              send
            </button>
          </div>
        </div>
      </div>
    </Win>
  );
}
