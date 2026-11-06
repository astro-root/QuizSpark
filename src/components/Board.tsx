import type { Player } from '../types'
import Score from './Score'
import { Icon } from './ui'

export default function Board({ players, myId, ruleId }: { players: Player[]; myId: string; ruleId: string }) {
  return (
    <ol className="qs-board" style={{ listStyle: 'none', maxWidth: 400 }} aria-label="スコアボード">
      {players.map((p, i) => {
        const win = p.status === 'WIN', lose = p.status === 'LOSE'
        const cls = ['qs-board__row', p.id === myId && 'qs-board__row--me', win && 'qs-board__row--win', lose && 'qs-board__row--lose'].filter(Boolean).join(' ')
        return (
          <li key={p.id} className={cls}>
            <span className={`qs-board__rank${i === 0 ? ' qs-board__rank--first' : ''}`}>
              {i === 0 ? <Icon name="chevron-up" size={16} strokeWidth={3} label="1位" /> : <span aria-label={`${i + 1}位`}>{i + 1}</span>}
            </span>
            <span className={`qs-board__name${win ? ' is-win' : lose ? ' is-lose' : ''}`}>
              {p.name}
              {p.isHost && <Icon name="crown" size={14} label="ホスト" />}
            </span>
            {(win || lose) && <span className={win ? 'is-win' : 'is-lose'} style={{ fontSize: 11, fontWeight: 700 }}>{win ? '勝抜' : '失格'}</span>}
            <Score player={p} ruleId={ruleId} />
          </li>
        )
      })}
    </ol>
  )
}
