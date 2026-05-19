import AppHeader from '../components/AppHeader'

const SECTIONS = [
  {
    title: 'はじめに',
    content: `QuizSparkはリアルタイム早押しクイズ対戦アプリです。フリーマッチで友達と、ランダムマッチで見知らぬ相手と対戦できます。`
  },
  {
    title: 'フリーマッチ',
    items: [
      '「ルームを作る」でルームIDを発行し、友達に共有する',
      '参加者が揃ったらホストが「ゲーム開始」を押す',
      'ルームIDを受け取った側はホーム画面で入力して参加',
      '公開ルームにするとルーム一覧に表示され、誰でも参加できる',
    ]
  },
  {
    title: 'ランダムマッチ',
    items: [
      'ホーム画面の「ランダムマッチ」からレートが近い相手と自動マッチング',
      '初期はレート差±200以内。待機が長いと自動で範囲が広がる',
      '勝利+30 / 敗北−20（下限0）でレートが変動',
      '両プレイヤーの直近20戦で出た問題は出題されない',
    ]
  },
  {
    title: '対戦中の操作',
    items: [
      '問題が表示されたら早押しボタン（画面下の大きいボタン）をタップ',
      '一番早く押したプレイヤーだけが回答できる',
      'ひらがな・カタカナ・アルファベットで回答。記号・長音符は無視される',
      '誰も押さないと時間切れでスルーになる',
      '画面右のスタンプボタンで絵文字を送り合える（👍👏🔥💪😲🤔😭🎉）',
    ]
  },
  {
    title: 'ゲームルール',
    table: [
      ['m◯n×', 'm回正解で勝ち抜け、n回誤答で失格。最もスタンダード'],
      ['Free', '制限なし。練習や交流向け'],
      ['NewYork', '正解加点・誤答減点のポイント制'],
      ['Freeze', '1問の誤答で通算誤答数分休み'],
      ['m◯n休', '1問の誤答でn問休み'],
      ['Swedish', 'ポイントが増えるにつれ誤答ペナルティが大きくなる'],
      ['Lucky Shot', '加点・減点がランダム'],
      ['連答付き', '連続正解で+1pt'],
      ['連誤答付き', '連続誤答で2×'],
    ]
  },
  {
    title: 'オリジナル問題セット',
    items: [
      '作問ページから自分だけの問題セットを作成できる',
      'フリーマッチのゲーム設定で選択して使用（カスタム問題は重複排除の対象外）',
      'CSVファイルでまとめてインポートも可能',
      'CSVフォーマット：問題文, 答え(ひらがな), 表示用答え, ジャンル, 別解1, 別解2…',
    ]
  },
  {
    title: 'マイページ',
    items: [
      '「戦績」タブ — 勝率・正解数・対戦履歴',
      '「問題履歴」タブ — 直近10問の出題・正誤・回答内容',
      '「ジャンル」タブ — ジャンル別正答率レーダーチャート',
      '「称号」タブ — 獲得称号の確認と設定',
    ]
  },
  {
    title: '問題を報告する',
    items: [
      '対戦中：解答発表時に「問題を報告」ボタンをタップ',
      '問題履歴から：マイページ →「問題履歴」→「🚩 報告」',
      '理由：事実の誤り / 誤字・脱字 / 解答が不正確 / その他',
      '同じ問題への重複報告はできない',
    ]
  },
  {
    title: 'レート・段位',
    table: [
      ['🥉 ブロンズ', '〜499'],
      ['🥈 シルバー', '500〜999'],
      ['🥇 ゴールド', '1000〜1499'],
      ['💎 プラチナ', '1500〜1999'],
      ['💠 ダイヤ', '2000〜2499'],
      ['👑 マスター', '2500〜'],
    ]
  },
  {
    title: 'よくある質問',
    qa: [
      ['正解なのに不正解になった', '答えはひらがなに変換して判定します。別解が設定されていない表記は不正解になる場合があります。問題の誤りだと思ったら報告してください。'],
      ['マッチングされない', '同時間帯のプレイヤーが少ないと時間がかかります。待機が長くなると自動で範囲が広がります。'],
      ['問題セットが使えない', '問題セットはホストのみ設定可能で、1問以上必要です。'],
      ['切断されたら', '再接続を試みます。ブラウザを再読み込みすると直前のルームに戻れる場合があります。'],
    ]
  },
]

export default function HelpPage() {
  return (
    <div className='page' style={{ display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="ヘルプ" back />
      <div className='inner' style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 22, letterSpacing: 1 }}>
            <span style={{ color: 'var(--accent)' }}>Quiz</span><span style={{ color: 'var(--text)' }}>Spark</span>
          </span>
          <span style={{ fontSize: 20, marginLeft: 6 }}>⚡</span>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>ユーザーズガイド</p>
        </div>

        {SECTIONS.map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 900, fontSize: 15, marginBottom: 12, color: 'var(--accent)' }}>{s.title}</p>

            {s.content && (
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>{s.content}</p>
            )}

            {s.items && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 13, flexShrink: 0, marginTop: 1 }}>•</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {s.table && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {s.table.map((row, j) => (
                  <div key={j} style={{ display: 'flex', gap: 0, background: j % 2 === 0 ? 'var(--surface2)' : 'var(--surface)' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', padding: '9px 12px', minWidth: 100, flexShrink: 0, borderRight: '1px solid var(--border)' }}>{row[0]}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', padding: '9px 12px', lineHeight: 1.5 }}>{row[1]}</span>
                  </div>
                ))}
              </div>
            )}

            {s.qa && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s.qa.map(([q, a], j) => (
                  <div key={j}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Q. {q}</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, paddingLeft: 12 }}>A. {a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          解決しない場合は<a href="/contact" style={{ color: 'var(--accent)' }}>お問い合わせ</a>からご連絡ください
        </p>
      </div>
    </div>
  )
}
