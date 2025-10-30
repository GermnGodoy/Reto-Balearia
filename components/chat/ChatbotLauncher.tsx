"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatbotLauncher() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hola! Soy Baleito, tu asistente personal de ventas. ¿Tienes alguna pregunta?.",
    },
  ]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // stay in sync to avoid stale closures
  const messagesRef = useRef<Msg[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages, loading]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const convo = [...messagesRef.current, userMsg];

      const res = await fetch("/api/gemini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt:
            "Eres un ayudante de un equipo técnico de ventas de Balearia. Tu objetivo es tratar de que el personal entienda toda la infromación proporcionada.",
          messages: convo,
        }),
      });

      let data: { reply?: string; error?: string } | null = null;
      const ctype = res.headers.get("content-type") || "";
      if (ctype.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }

      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${msg}` },
        ]);
        return;
      }

      const reply = data?.reply ?? "…";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error de conexión." },
      ]);
    } finally {
      setLoading(false);
    }
  };
  //TODO: Change the text "open chat" with the icon given and change background to white
  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-expanded={open}
          
          className="fixed bottom-4 right-4 z-50 p-0 rounded-full hover:shadow-[0_14px_48px_rgba(0,0,0,0.45)] shadow-lg border bg-white from-black to-neutral-700 text-white dark:from-white dark:to-neutral-200 dark:text-black px-4 py-3 text-sm hover:opacity-90"
        >
          <Image
            src="/baleito.png"   // put baleito.png in /public
            alt="Abrir chat"
            width={90}
            height={90}
            className="h-10 w-10 rounded-full object-cover"
            priority
          />
        </button>
      )}
        {/*TO Do: change upper buton with logo*/ }
      {/* Rounded floating drawer without blocking backdrop */}
      <div
        className={`fixed right-2 md:right-4 top-2 md:top-4 bottom-2 md:bottom-4 z-50
          w-[92vw] sm:w-[420px] md:w-[460px] lg:w-[500px]
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-[120%]"}
          rounded-3xl border border-neutral-200 dark:border-neutral-800
          bg-[#e0efef] dark:bg-neutral-950/90 backdrop-blur-md shadow-[0_12px_50px_rgba(0,0,0,0.2)]
          flex flex-col`}
        role="complementary"
        aria-label="Baleito"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/80 dark:border-neutral-800/80 rounded-t-3xl">
          <div className="font-semibold">Baleito</div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            Cerrar
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ring-1
                ${
                  m.role === "user"
                    ? "ml-auto bg-black text-white dark:bg-white dark:text-black ring-black/10 dark:ring-white/20"
                    : "mr-auto bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 ring-black/5 dark:ring-white/10"
                }`}
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="mr-auto max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-[#e0efef] dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10">
              Pensando…
            </div>
          )}
        </div>

        <form
          onSubmit={sendMessage}
          className="border-t border-neutral-200/80 dark:border-neutral-800/80 p-3 rounded-b-3xl"
        >
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-neutral-950/90 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full px-4 py-2 text-sm bg-black text-white dark:bg-white dark:text-black border border-transparent hover:opacity-90 disabled:opacity-60"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
