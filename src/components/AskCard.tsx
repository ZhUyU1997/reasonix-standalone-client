/**
 * AskCard.tsx — renders an ask/question card.
 * Matches original: each question rendered with own submit button.
 */
import { useEffect, useState } from "react";
import { __ } from "../lib/i18n";
import { post } from "../lib/api";
import type { WireAsk } from "../lib/types";

interface Props {
  ask: WireAsk;
  onDone: () => void;
}

function QuestionBlock({ q, onAnswer }: { q: WireAsk["questions"][0]; onAnswer: (selected: string[]) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(selected.size > 0); }, [selected]);

  const toggle = (i: number) => {
    if (q.multi) {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(i) ? next.delete(i) : next.add(i);
        return next;
      });
    } else {
      setSelected(new Set([i]));
    }
  };

  return (
    <div>
      {q.header && <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>{q.header}</div>}
      <div className="ask__prompt">{q.prompt}</div>
      <div className="ask__options">
        {q.options.map((o, i) => (
          <button
            key={i}
            className={"ask__opt" + (selected.has(i) ? " ask__opt--selected" : "")}
            onClick={() => toggle(i)}
          >
            <div>
              <div className="ask__opt-label">{o.label}</div>
              {o.description && <div className="ask__opt-desc">{o.description}</div>}
            </div>
          </button>
        ))}
      </div>
      <button className="ask__submit" disabled={!ready} onClick={() => onAnswer(Array.from(selected).map(i => q.options[i].label))}>
        {__("submit")}
      </button>
    </div>
  );
}

export function AskCard({ ask, onDone }: Props) {
  const handleAnswer = (selected: string[]) => {
    const answers = ask.questions.map(q => ({
      questionId: q.id,
      selected, // matches original: uses LAST question's selection for ALL
    }));
    post("/answer", { id: ask.id, answers });
    onDone();
  };

  return (
    <div className="ask" style={{ margin: "8px 0" }}>
      {ask.questions.map((q, i) => (
        <QuestionBlock key={i} q={q} onAnswer={handleAnswer} />
      ))}
    </div>
  );
}
