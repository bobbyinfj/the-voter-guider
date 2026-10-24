// "Ask Claude about this" on a quiz question: opens claude.ai with a neutral prompt about the
// statement, so a voter who isn't sure what it means can look into it before answering. The
// answer is Claude's, not ours, and the link says so.
export function askClaudeUrl(statement: string, races: string[]): string {
  const prompt = [
    `I'm taking a voter guide quiz and I'm not sure what this statement means: "${statement}"`,
    'Please explain it in plain, neutral language: what it means, what would change if it happened, and the strongest arguments on each side.',
    races.length ? `Which of these offices could actually act on it, and how: ${races.join(', ')}?` : '',
    "Point me to sources I can check, and don't tell me how to vote.",
  ]
    .filter(Boolean)
    .join(' ')
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`
}
