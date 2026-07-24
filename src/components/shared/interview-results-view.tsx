import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";
import type { MockInterviewFeedback } from "@/api/mock-interview";

interface InterviewResultsViewProps {
  result: MockInterviewFeedback;
}

function ScoreCard({ label, score, hero }: { label: string; score: number; hero?: boolean }) {
  return (
    <div className={`border border-grid p-4 ${hero ? "bg-paper-dim" : ""}`}>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">{label}</p>
      <p className={`mt-2 font-display font-extrabold tabular-nums text-ink ${hero ? "text-5xl" : "text-3xl"}`}>
        {score}
        <span className={`font-sans font-normal text-ink-soft ${hero ? "text-xl" : "text-base"}`}>%</span>
      </p>
      <div className="mt-3 h-1.5 w-full bg-paper">
        <div className={`h-1.5 ${hero ? "bg-signal" : "bg-ink"}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

const fadeInUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

/**
 * The AI feedback report itself — score cards, strengths, weaknesses,
 * improvements, and sample better answers — with no page chrome or
 * dialog wrapper of its own, so it can sit inside the Interview Results
 * page (and, previously, inside a Dialog — kept identical in look so
 * nothing changed for anyone who'd already seen the old modal version).
 */
export function InterviewResultsView({ result }: InterviewResultsViewProps) {
  return (
    <div className="space-y-6">
      <motion.div {...fadeInUp} transition={{ duration: 0.3 }} className="grid grid-cols-3 gap-3">
        <ScoreCard label="Overall" score={result.overallScore} hero />
        <ScoreCard label="Technical" score={result.technicalScore} />
        <ScoreCard label="Communication" score={result.communicationScore} />
      </motion.div>

      {result.strengths.length > 0 && (
        <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.06 }}>
          <Section title="Strengths" icon={<CheckCircle2 className="h-3.5 w-3.5 text-meadow" />}>
            <ul className="space-y-1.5">
              {result.strengths.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-meadow" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        </motion.div>
      )}

      {result.weaknesses.length > 0 && (
        <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.12 }}>
          <Section title="Weaknesses" icon={<AlertTriangle className="h-3.5 w-3.5 text-amber" />}>
            <ul className="space-y-1.5">
              {result.weaknesses.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        </motion.div>
      )}

      {result.improvements.length > 0 && (
        <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.18 }}>
          <Section title="Personalized improvements" icon={<TrendingUp className="h-3.5 w-3.5 text-signal" />}>
            <ul className="space-y-1.5">
              {result.improvements.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        </motion.div>
      )}

      {result.sampleBetterAnswers.length > 0 && (
        <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.24 }}>
          <Section title="Suggested better answers" icon={<Lightbulb className="h-3.5 w-3.5 text-signal" />}>
            <ul className="space-y-2.5">
              {result.sampleBetterAnswers.map((item, i) => (
                <li key={i} className="border border-grid bg-paper-dim p-3 text-sm text-ink">
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        </motion.div>
      )}
    </div>
  );
}