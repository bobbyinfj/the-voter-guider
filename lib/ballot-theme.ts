// Which county ballot each election's pages are styled after (tokens in app/globals.css).
// Fonts and colors were read from the county's official sample-ballot PDF, the same one
// data/research/sample-ballots/parse.py parses. An election without one gets "plain".

export type BallotThemeKey = 'king' | 'larimer' | 'plain'

export interface BallotTheme {
  key: BallotThemeKey
  // Whose ballot the look comes from, for the "styled after" note
  styledAfter: string | null
}

const THEMES: Record<string, BallotTheme> = {
  'wa-general-2026': { key: 'king', styledAfter: 'King County' },
  'co-general-2026': { key: 'larimer', styledAfter: 'Larimer County' },
}

export function ballotThemeFor(electionId: string | null | undefined): BallotTheme {
  return (electionId && THEMES[electionId]) || { key: 'plain', styledAfter: null }
}
