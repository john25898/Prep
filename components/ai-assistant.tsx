"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, MessageSquareText, Save, Sparkles, Wand2, X } from "lucide-react";

export type ChartInsight = {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  prompt?: string;
  createdAt?: string;
};

export function PlaygroundPanel({
  charts,
  onRemove,
}: {
  charts: ChartInsight[];
  onRemove: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState(
    "Saved charts stay here for quick follow-up analysis. Ask a question and the assistant will reuse the chart context.",
  );

  const summary = useMemo(() => {
    if (!charts.length) return "No charts saved yet.";
    return `${charts.length} saved chart${charts.length > 1 ? "s" : ""} ready for review.`;
  }, [charts]);

  const handleSubmit = () => {
    const text = prompt.trim();
    if (!text) {
      setResponse("Type a prompt first to generate a quick insight.");
      return;
    }

    const favorite = charts[0];
    const title = favorite?.title ?? "the current dashboard";
    const baseline =
      favorite?.summary ?? "This chart shows the selected performance trend.";
    setResponse(
      `For ${title}, the trend points to ${baseline.toLowerCase()} The prompt "${text}" is now mapped to the saved chart context so the team can keep using it in follow-up reviews.`,
    );
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-24 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg transition hover:border-slate-300 hover:bg-slate-50"
          aria-label="Open playground"
        >
          <Wand2 className="h-4 w-4 text-sky-600" />
          Playground{charts.length ? ` (${charts.length})` : ""}
        </button>
      )}

      {isOpen && (
        <aside className="fixed bottom-6 right-6 z-40 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                Playground
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-800">
                Saved insights
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            {charts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                Use the chart action menu to send a chart to the playground and
                keep it here.
              </div>
            ) : (
              charts.slice(0, 3).map((chart) => (
                <div
                  key={chart.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {chart.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {chart.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(chart.id)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Follow-up prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
              placeholder="Example: Explain the dip in retention and what to watch next"
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Wand2 className="h-4 w-4" />
              Generate insight
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-slate-700">
            {response}
          </div>
        </aside>
      )}
    </>
  );
}

export function AIAssistant({
  chartContext,
  onSaveToPlayground,
}: {
  chartContext?: ChartInsight | null;
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState(
    chartContext?.prompt ??
      "Summarize the key performance signal from this chart.",
  );
  const [answer, setAnswer] = useState(
    "Ask the assistant to explain the trend, compare categories, or suggest the next action.",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (chartContext) {
      setQuestion(
        chartContext.prompt ??
          "Summarize the key performance signal from this chart.",
      );
      setAnswer(
        `The assistant is ready to interpret ${chartContext.title}. Ask a follow-up question or generate an insight for this chart.`,
      );
      setIsOpen(true);
    }
  }, [chartContext?.id, chartContext?.prompt, chartContext?.title]);

  const quickPrompts = useMemo(
    () => [
      "What is the main takeaway from this chart?",
      "Which areas need attention?",
      "What should the team act on next?",
    ],
    [],
  );

  const handleSubmit = () => {
    const text = (question || "").trim();
    if (!text) {
      setAnswer(
        "Type a question first so the assistant can interpret the chart.",
      );
      return;
    }

    setBusy(true);

    const contextTitle = chartContext?.title ?? "the selected dashboard view";
    const contextSummary =
      chartContext?.summary ??
      "This chart shows the current performance trend.";
    const takeaway = contextSummary.replace(/\.$/, "");

    setTimeout(() => {
      const lower = text.toLowerCase();
      const responseText =
        lower.includes("action") || lower.includes("next")
          ? `For ${contextTitle}, the priority is to focus on the weakest segment and tighten follow-up around it. ${takeaway}. The team should check drivers, workload, and reporting delays before the next review.`
          : lower.includes("compare") || lower.includes("difference")
            ? `The comparison in ${contextTitle} shows the gap is concentrated in the lower-performing segments. ${takeaway}. The main story is that the strongest units are ahead, while the weaker ones need targeted support.`
            : lower.includes("risk") || lower.includes("attention")
              ? `The main risk in ${contextTitle} is the decline at the lower end of the performance curve. ${takeaway}. This is the area that requires immediate action and supervision.`
              : `The main signal in ${contextTitle} is that ${takeaway.toLowerCase()}. The chart suggests a clear operational focus: keep the strong performers on track and support the weaker areas with faster follow-up.`;

      setAnswer(responseText);
      setBusy(false);
    }, 250);
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
          aria-label="Open AI assistant"
        >
          <Bot className="h-4 w-4" />
          AI Assist
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                    AI assist
                  </p>
                  <h3 className="text-lg font-bold text-slate-800">
                    Chart insight copilot
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {chartContext && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                    Active chart
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {chartContext.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {chartContext.summary}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Ask a follow-up question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="Explain the trend and tell me what to act on next"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  <Sparkles className="h-4 w-4" />
                  {busy ? "Processing..." : "Generate insight"}
                </button>
                {chartContext && onSaveToPlayground && (
                  <button
                    type="button"
                    onClick={() =>
                      onSaveToPlayground({ ...chartContext, prompt: question })
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Save className="h-4 w-4" />
                    Save to playground
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {answer}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
