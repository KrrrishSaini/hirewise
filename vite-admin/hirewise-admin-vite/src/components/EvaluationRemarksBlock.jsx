import React from 'react';

const scoreLineRegex = /^(.*?):\s*([0-9]+(?:\.[0-9]+)?)\s*$/;
const sectionRegex = /^([IVX]+)\.\s*(.+)$/i;
const numberedPointRegex = /^\d+\.\s*/;

const isCommentsHeading = (line) => /^comments\s*:/i.test(line);
const isEvaluationHeading = (line) => /^evaluation\s*scores\s*\(1-5\)\s*:/i.test(line);

const RemarksRow = ({ label, score, indented = false }) => (
  <div className="flex items-start gap-3 py-1.5 border-b border-dotted border-gray-300/70 last:border-b-0">
    <span className={`flex-1 text-gray-700 ${indented ? 'pl-4' : ''}`}>{label}</span>
    <span className="min-w-[48px] text-right font-semibold text-gray-900">{score}</span>
  </div>
);

export default function EvaluationRemarksBlock({ remarks }) {
  if (!remarks || typeof remarks !== 'string') return null;

  const lines = remarks
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let commentsMode = false;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="space-y-1 text-sm">
        {lines.map((line, index) => {
          if (isEvaluationHeading(line)) {
            commentsMode = false;
            return (
              <p key={`eval-heading-${index}`} className="font-semibold text-gray-800">
                {line}
              </p>
            );
          }

          if (isCommentsHeading(line)) {
            commentsMode = true;
            const inlineComment = line.split(':').slice(1).join(':').trim();
            return (
              <div key={`comments-heading-${index}`} className="pt-2">
                <p className="font-semibold text-gray-800">Comments:</p>
                {inlineComment ? <p className="mt-1 text-gray-700">{inlineComment}</p> : null}
              </div>
            );
          }

          if (commentsMode) {
            return (
              <p key={`comments-${index}`} className="text-gray-700">
                {line}
              </p>
            );
          }

          const sectionMatch = line.match(sectionRegex);
          if (sectionMatch && !scoreLineRegex.test(line)) {
            return (
              <p key={`section-${index}`} className="pt-2 font-semibold text-gray-800">
                {line}
              </p>
            );
          }

          const scoreMatch = line.match(scoreLineRegex);
          if (scoreMatch) {
            const label = scoreMatch[1].trim();
            const score = scoreMatch[2].trim();
            const indented = numberedPointRegex.test(label) || /^average\s*\(/i.test(label) || /^total\s*score/i.test(label);
            return <RemarksRow key={`score-${index}`} label={label} score={score} indented={indented} />;
          }

          return (
            <p key={`plain-${index}`} className="text-gray-700">
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}
