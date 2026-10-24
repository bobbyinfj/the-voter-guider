"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ConfidenceIndicator from "@/components/quiz/ConfidenceIndicator";
import type { QuizResults } from "@/lib/quiz/types";
import { parseDistrictSelection } from "@/lib/districts";
import { MODULES, parseModules, type QuizModule } from "@/lib/quiz/modules";

interface ModuleInfo {
  module: QuizModule;
  label: string;
  count: number;
}

interface QuestionOption {
  id: string;
  label: string;
  stanceValue: number;
  order: number;
}

interface Question {
  id: string;
  prompt: string;
  helpText?: string;
  order: number;
  options: QuestionOption[];
  // The topic(s) it's about, and the races on this ballot it helps compare
  topics: { slug: string; name: string }[];
  compares: string[];
}

interface QuizState {
  guideId: string;
  question: Question | null;
  results: (QuizResults & { nextQuestionId: string | null }) | null;
  answeredIds: Set<string>;
  selectedOption: string | null;
  // Nothing preselected; an answer saved without one counts as "Somewhat"
  importance: number | null;
  loading: boolean;
  submitting: boolean;
  done: boolean;
}

export default function QuizPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Districts pick the races; ?modules= picks which parts of the quiz to ask (all when absent)
  const districtParams = new URLSearchParams(searchParams.toString());
  districtParams.delete("modules");
  const districtKey = districtParams.toString();
  const chosen = parseModules(searchParams.get("modules"));
  const modulesKey = chosen?.join(",") ?? "";
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  // What the quiz can compare on this ballot
  const [scope, setScope] = useState<{ races: string[]; total: number }>({ races: [], total: 0 });

  const [state, setState] = useState<QuizState>({
    guideId: "",
    question: null,
    results: null,
    answeredIds: new Set(),
    selectedOption: null,
    importance: null,
    loading: true,
    submitting: false,
    done: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize: create or find a guide, then get first question
  useEffect(() => {
    async function init() {
      try {
        // Quiz answers go on the same guide as your ballot picks for this election
        const guideRes = await fetch("/api/guides/default", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            electionId,
            districts: parseDistrictSelection(new URLSearchParams(districtKey)),
          }),
        });
        if (!guideRes.ok) throw new Error("Could not create guide");
        const guide = await guideRes.json();
        const guideId = guide.id;

        // Get first question
        const nextRes = await fetch(`/api/quiz/next?guideId=${guideId}${modulesKey ? `&modules=${modulesKey}` : ""}`);
        if (!nextRes.ok) throw new Error("Could not load quiz");
        const nextData = await nextRes.json();
        setModules(nextData.modules ?? []);
        setScope({ races: nextData.races ?? [], total: nextData.totalQuestions ?? 0 });

        setState((prev) => ({
          ...prev,
          guideId,
          // Resuming: answers already on your guide count toward progress
          answeredIds: new Set((guide.answers ?? []).map((a: { questionId: string }) => a.questionId)),
          question: nextData.question,
          loading: false,
          done: !nextData.question,
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load quiz");
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
    init();
  }, [electionId, districtKey, modulesKey]);

  // Turn a part of the quiz on or off (at least one stays on)
  const toggleModule = (m: QuizModule) => {
    const on = chosen ?? modules.map((x) => x.module);
    const next = on.includes(m) ? on.filter((x) => x !== m) : [...on, m];
    if (!next.length) return;
    const params = new URLSearchParams(districtKey);
    if (next.length < modules.length) params.set("modules", MODULES.filter((x) => next.includes(x)).join(","));
    router.replace(`/elections/${electionId}/quiz${params.toString() ? `?${params}` : ""}`);
  };

  // "Not sure": saved as the middle answer with no weight, so it never moves a match and isn't asked again
  const skip = () => {
    const middle = state.question?.options.find((o) => o.stanceValue === 0);
    if (middle) submitAnswer(middle.id, 0);
  };

  const submitAnswer = async (optionId = state.selectedOption, importance = state.importance ?? 1) => {
    if (!optionId || !state.question || !state.guideId || state.submitting) return;

    setState((prev) => ({ ...prev, submitting: true }));

    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: state.guideId,
          questionId: state.question.id,
          optionId,
          importance,
          modules: modulesKey || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save answer");
      const data: QuizResults & { nextQuestionId: string | null } = await res.json();

      const newAnswered = new Set(state.answeredIds);
      newAnswered.add(state.question.id);

      // Load next question details if there is one
      let nextQuestion: Question | null = null;
      if (data.nextQuestionId) {
        const nextRes = await fetch(`/api/quiz/next?guideId=${state.guideId}${modulesKey ? `&modules=${modulesKey}` : ""}`);
        if (nextRes.ok) {
          const nextData = await nextRes.json();
          nextQuestion = nextData.question;
        }
      }

      setState((prev) => ({
        ...prev,
        question: nextQuestion,
        results: data,
        answeredIds: newAnswered,
        selectedOption: null,
        importance: null,
        submitting: false,
        done: !nextQuestion,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save answer");
      setState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const goToResults = () => {
    router.push(`/elections/${electionId}/quiz/results?guideId=${state.guideId}`);
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">Loading quiz…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href={`/elections/${electionId}`} className="text-blue-600 underline">
            Back to election
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/elections/${electionId}`} className="text-sm text-blue-600 hover:underline">
            ← Back to election
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Voter Quiz</h1>
          {scope.races.length > 0 ? (
            <p className="text-gray-700 text-sm">
              These {scope.total} questions compare the candidates for {scope.races.join(", ")}: the races where
              candidates&apos; sourced positions overlap enough to compare. For everything else on your ballot,{" "}
              <a href={`/elections/${electionId}?view=step`} className="text-blue-700 underline">
                go through it one contest at a time
              </a>
              .
            </p>
          ) : (
            <p className="text-gray-700 text-sm">
              No race on this ballot has enough sourced positions to compare candidates by quiz.{" "}
              <a href={`/elections/${electionId}?view=step`} className="text-blue-700 underline">
                Go through your ballot one contest at a time
              </a>{" "}
              to see each one&apos;s videos, statements and positions.
            </p>
          )}
          {modules.length > 1 && (
            <div className="mt-3 font-sans">
              <p className="mb-1.5 text-sm font-medium text-gray-700">Which parts of your ballot?</p>
              <div role="group" aria-label="Quiz parts" className="flex flex-wrap gap-1.5">
                {modules.map((m) => {
                  const on = !chosen || chosen.includes(m.module);
                  return (
                    <button
                      key={m.module}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleModule(m.module)}
                      className={`rounded-full border px-3 py-1 text-sm ${on ? "border-ballot-ink bg-ballot-bar text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      {m.label} · {m.count}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Questions come from candidates&apos; sourced positions, so some races have few or none. Judges aren&apos;t in
                the quiz: judicial candidates can&apos;t campaign on issues, so see their bar ratings on the ballot instead.
              </p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: question panel */}
          <div className="lg:col-span-3">
            {state.done ? (
              <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-8 text-center">
                <div className="text-5xl mb-4">🗳️</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {state.answeredIds.size === 0 ? "Nothing to ask here" : "That's every question"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {state.answeredIds.size === 0
                    ? "No race on your ballot can be compared by quiz."
                    : chosen && chosen.length < modules.length
                      ? "Turn on more parts above for more questions."
                      : "Your matches now show beside each race as you go through your ballot."}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href={`/elections/${electionId}?view=step`}
                    className="px-6 py-3 bg-ballot-accent text-ballot-accent-ink font-bold hover:brightness-95 transition-colors"
                  >
                    Go through my ballot
                  </a>
                  {state.answeredIds.size > 0 && (
                    <button onClick={goToResults} className="px-6 py-3 border-[1.5px] border-ballot-ink font-semibold hover:bg-ballot-head">
                      How each race compares
                    </button>
                  )}
                </div>
              </div>
            ) : state.question ? (
              <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-6">
                {/* Question number */}
                <div className="text-xs text-gray-500 mb-3 font-medium">
                  Question {Math.min(state.answeredIds.size + 1, Math.max(scope.total, 1))} of {scope.total}
                  {state.question.compares.length > 0 && <> · Compares candidates for {state.question.compares.join(", ")}</>}
                </div>

                {/* Prompt */}
                <h2 className="text-lg font-semibold text-gray-800 mb-2 leading-snug">
                  {state.question.prompt}
                </h2>
                {state.question.helpText && (
                  <p className="text-sm text-gray-600 mb-2">{state.question.helpText}</p>
                )}
                {state.question.topics.length > 0 && (
                  <p className="text-sm mb-4">
                    {state.question.topics.map((t) => (
                      <a key={t.slug} href={`/issues/${t.slug}`} target="_blank" rel="noopener" className="text-blue-700 underline mr-3">
                        What the candidates said: {t.name} ↗
                      </a>
                    ))}
                  </p>
                )}

                {/* Options */}
                <div role="radiogroup" aria-label="Your answer" className="space-y-2 mb-3">
                  {state.question.options.map((opt) => {
                    const on = state.selectedOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setState((prev) => ({ ...prev, selectedOption: opt.id }))}
                        className={`flex w-full cursor-pointer items-center gap-3 text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                          on ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 bg-white text-gray-800"
                        }`}
                      >
                        <span aria-hidden className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-blue-600" : "border-gray-400"}`}>
                          {on && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={skip} disabled={state.submitting} className="mb-6 text-sm text-blue-700 underline disabled:opacity-50">
                  Not sure yet: skip it (it won&apos;t count toward a match)
                </button>

                {/* Importance */}
                {state.selectedOption && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2 font-medium">
                      How much does this topic ({state.question.topics[0]?.name ?? "this question"}) matter to your vote? (optional)
                    </p>
                    <div className="flex gap-2">
                      {[
                        { value: 0, label: "Doesn't matter" },
                        { value: 1, label: "Somewhat" },
                        { value: 2, label: "Important" },
                        { value: 3, label: "Very important" },
                      ].map((imp) => (
                        <button
                          key={imp.value}
                          onClick={() => setState((prev) => ({ ...prev, importance: imp.value }))}
                          className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                            state.importance === imp.value
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {imp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    onClick={() => submitAnswer()}
                    disabled={!state.selectedOption || state.submitting}
                    className="flex-1 py-3 px-6 bg-ballot-accent text-ballot-accent-ink font-bold hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {state.submitting ? "Saving…" : "Next →"}
                  </button>
                  {state.results && (
                    <button
                      onClick={goToResults}
                      className="py-3 px-4 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Stop &amp; view results
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: live results panel */}
          <div className="lg:col-span-2">
            <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Live results</h3>
              {!state.results || state.results.questionsAnswered === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Answer your first question to see results appear here.
                </p>
              ) : (
                <ConfidenceIndicator results={state.results} onStop={goToResults} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
