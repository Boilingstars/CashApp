import { Fragment, createElement } from 'react'

const HEADING_RE = [
  { level: 1, re: /^#\s+(.+)$/ },
  { level: 2, re: /^##\s+(.+)$/ },
  { level: 3, re: /^###\s+(.+)$/ },
]

const UL_LINE_RE = /^[-*•]\s+(.+)$/
const OL_LINE_RE = /^\d+\.\s+(.+)$/

function parseInline(text, keyPrefix) {
  const nodes = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let match
  let key = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index))
    }
    if (match[1] != null) {
      nodes.push(createElement('strong', { key: `${keyPrefix}-s-${key++}` }, match[1]))
    } else if (match[2] != null) {
      nodes.push(createElement('em', { key: `${keyPrefix}-e-${key++}` }, match[2]))
    }
    last = match.index + match[0].length
  }

  if (last < text.length) {
    nodes.push(text.slice(last))
  }

  return nodes.length > 0 ? nodes : [text]
}

function matchHeading(line) {
  for (const { level, re } of HEADING_RE) {
    const m = re.exec(line)
    if (m) return { level, text: m[1] }
  }
  return null
}

function parseList(lines, index, styles, ordered) {
  const tag = ordered ? 'ol' : 'ul'
  return createElement(
    tag,
    { key: `list-${index}`, className: styles.mdList },
    lines.map((line, i) => {
      const m = ordered ? OL_LINE_RE.exec(line.trim()) : UL_LINE_RE.exec(line.trim())
      const content = m ? m[1] : line.trim()
      return createElement(
        'li',
        { key: `li-${index}-${i}`, className: styles.mdListItem },
        ...parseInline(content, `li-${index}-${i}`),
      )
    }),
  )
}

function parseParagraphLines(lines, index, styles) {
  return createElement(
    'p',
    { key: `p-${index}`, className: styles.mdParagraph },
    lines.flatMap((line, li) => {
      const parts = parseInline(line.trim(), `p-${index}-${li}`)
      if (li < lines.length - 1) {
        return [...parts, createElement('br', { key: `br-${index}-${li}` })]
      }
      return parts
    }),
  )
}

function parseLineGroup(lines, index, styles) {
  if (lines.length === 0) return null

  const trimmed = lines.map((l) => l.trim()).filter(Boolean)
  if (trimmed.length === 0) return null

  if (trimmed.every((line) => UL_LINE_RE.test(line))) {
    return parseList(trimmed, index, styles, false)
  }

  if (trimmed.every((line) => OL_LINE_RE.test(line))) {
    return parseList(trimmed, index, styles, true)
  }

  return parseParagraphLines(trimmed, index, styles)
}

function parseBlock(block, index, styles) {
  const lines = block.split('\n')
  const trimmed = lines.map((l) => l.trimEnd())
  const nonEmpty = trimmed.filter((l) => l.trim().length > 0)

  if (nonEmpty.length === 0) return null

  const heading = matchHeading(nonEmpty[0].trim())
  if (heading) {
    const headingClass =
      heading.level === 1
        ? styles.mdH1
        : heading.level === 2
          ? styles.mdH2
          : styles.mdH3
    const headingEl = createElement(
      `h${heading.level}`,
      { key: `h-${index}`, className: headingClass },
      ...parseInline(heading.text, `h-${index}`),
    )

    if (nonEmpty.length === 1) {
      return headingEl
    }

    const rest = parseLineGroup(nonEmpty.slice(1), `${index}-rest`, styles)
    return createElement(Fragment, { key: `block-${index}` }, headingEl, rest)
  }

  return parseLineGroup(nonEmpty, index, styles)
}

/**
 * Базовый Markdown для ответов Cash Ask (без внешних зависимостей).
 * Поддержка: # ## ###, **bold**, *italic*, списки - / 1., абзацы.
 */
export function ChatMarkdown({ text, styles }) {
  if (!text?.trim()) {
    return null
  }

  const blocks = text.trim().split(/\n{2,}/)
  const children = blocks
    .map((block, index) => parseBlock(block, index, styles))
    .filter(Boolean)

  return createElement('div', { className: styles.mdRoot }, children)
}
