// Evidence classification only: a missing downstream observation is not proof
// that an earlier boundary failed. The first unproven boundary stays explicit.
export function classifyPlot(evidence) {
  if (evidence.beginObserved !== true) return 'guest-dispatch-unconfirmed';
  if (evidence.endObserved !== true) return 'guest-pipeline-incomplete-or-console-observation-missing';
  if (!positiveCount(evidence.serialBytes)) return 'guest-tty-or-simh-output-unobserved';
  if (!positiveCount(evidence.websocketBytes)) return 'bridge-or-websocket-output-unobserved';
  if (evidence.parserError) return 'parser-rejected-observed-stream';
  if (!Number.isSafeInteger(evidence.parserLines)) return 'parser-result-unobserved';
  if (evidence.parserLines <= 10) return 'observed-stream-lacks-expected-vectors';
  if (!Number.isSafeInteger(evidence.renderedLines)) return 'browser-rendering-unobserved';
  if (evidence.renderedLines !== evidence.parserLines) return 'browser-rendering-differs-from-stream';
  if (evidence.failure) return 'browser-assertion-failed';
  return 'pass';
}

function positiveCount(value) {
  return Number.isSafeInteger(value) && value > 0;
}
