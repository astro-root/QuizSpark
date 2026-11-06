import type { Player } from '../types'
import { scoreParts, scoreText } from '../utils/scoreLabel'
import { Icon } from './ui'

/** ルールごとのスコア表示。正解・誤答などのマークは文字ではなく SVG で描き、読み上げ用の文字も添える。 */
export default function Score({ player, ruleId, className }: { player: Player; ruleId: string; className?: string }) {
  return (
    <span className={['qs-score', className].filter(Boolean).join(' ')}>
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {scoreParts(player, ruleId).map((part, i) =>
          part.kind === 'text'
            ? <span key={i}>{part.text}</span>
            : <Icon key={i} name={part.icon} size={13} strokeWidth={2.6} />)}
      </span>
      <span className="qs-sr">{scoreText(player, ruleId)}</span>
    </span>
  )
}
