# Qraft 引き継ぎメモ（2026-11-06 時点）

作業の途中で、コピー（作業環境）が初期化されて消えたため、未適用の変更をここに残す。
このファイルと、`git log` を見れば、続きから再開できる。

## 1. リポジトリの現状

- ブランチ `feat/google-auth-and-lp`（push 済み。コミット d9d179a）。**main にはまだ入っていない。**
- 入っているもの
  - Googleログインのみ（`src/lib/auth-context.tsx`、`src/components/AuthScreen.tsx`、`LinkGoogleBanner.tsx`）
  - ログイン・新規登録の画面（共通の `AuthScreen`）
  - ランディング（動きつき）、ロゴ（`Logo.tsx`、`src/app/icon.svg`）
  - 作問の「＋」ポップアップ、ダッシュボードの「＋ 新規」ポップアップ、`Fab.tsx`、`Modal.tsx`
  - タブのタイトル「セット名 - Qraft」（`usePageTitle.ts`）
  - LP・ログイン画面の記述を、実際の動作に合わせる修正（適用済み）
- **マージ前に必須**: 下の「3. Firebase の準備」。先にマージすると、パスワードでしか入れない人がログインできなくなる。

## 2. 未適用の変更（リポジトリにまだ入っていない）

適用順: 2-1 → 2-2。どちらも、適用後に `npx tsc --noEmit && npm run lint && npm run build` を通すこと。

### 2-1. 文言の変更

- 「無料で始める」を削除（ヘッダーは「始める」、ヒーローと最後の案内は「今すぐ始める」）
- 見出し「一つの画面で。」を「ひとつのツールで。」に変更（実際はタブで画面が分かれているため、「ツール」のほうが正確）
- 画面に出る「無料」は、これでなくなる（残るのは、Firebase の無料枠についての README とコードのコメントだけ）

~~~bash
cat > /tmp/fix_copy.py <<'PYEOF'
import pathlib

def edit(path, steps):
    p = pathlib.Path(path); s = p.read_text(encoding="utf-8")
    for a, b, n in steps:
        assert s.count(a) == n, f"{path}: {a[:60]!r} が {s.count(a)} か所あります（想定は {n} か所）"
        s = s.replace(a, b)
    p.write_text(s, encoding="utf-8")
    print("OK", path)

edit("src/app/page.tsx", [
    ('sm:px-4">無料で始める</Link>', 'sm:px-4">始める</Link>', 1),
    ("無料で始める", "今すぐ始める", 2),
    ("<HeadLine delay={0.18}>一つの画面で。</HeadLine>", "<HeadLine delay={0.18}>ひとつのツールで。</HeadLine>", 1),
])
edit("src/components/AuthScreen.tsx", [
    ("作問から本番まで、<br />一つの画面で。", "作問から本番まで、<br />ひとつのツールで。", 1),
])
PYEOF
python3 /tmp/fix_copy.py
~~~

別案の見出し（気に入らなければ差し替え）: 「作問から本番まで、チームで迷わず。」「書いて、確かめて、本番へ。」

### 2-2. 文字数の表示と、問題カード

依頼の内容

- 問題の**文字数**を表示する。編集画面の文字数は、薄すぎて見えにくいので濃くする。各カードにも出す。
- 作問ページに、**自分の問題を全部カードで並べ**、カードを押すと編集のポップアップが開く（今は最新8件だけ）。出題順のページも、カード全体を押せるようにする。

実装の方針

- 文字数は「前後の空白を除いた、1文字ずつの数」（絵文字も1文字）。`src/lib/text.ts` の `charCount` に統一する。
- 作問ページは、`QuestionBrowser`（仮想スクロール・検索・絞り込みつき）を、自分の問題だけで使う。カードの押下→ポップアップは、`QuestionBrowser` が既に持っている。
- 出題順のカードは、本文部分を押すと開く（ドラッグの取っ手とは別）。鉛筆ボタンも残す。

検証の状況: 型チェックとビルドは通った。**画面での動作確認（カードの数・文字数・ポップアップ）は、環境が消えて最後までできていない。** 適用後に、下の確認項目を見ること。

手順1: 文字数の関数

~~~bash
cat > src/lib/text.ts <<'EOF'
// 問題文などの文字数。前後の空白を除いて、1文字ずつ（絵文字なども1文字）数える。
export const charCount = (s: string) => Array.from(s.trim()).length;
EOF
~~~

手順2: 既存3ファイルの書き換え

~~~bash
cat > /tmp/cards_patch.py <<'PYEOF'
import re, pathlib

def edit(path, steps):
    p = pathlib.Path(path); s = p.read_text(encoding="utf-8")
    for kind, a, b in steps:
        if kind == "str":
            assert s.count(a) == 1, f"{path}: 一致する箇所が1つではありません: {a[:70]!r}"
            s = s.replace(a, b)
        else:
            s, n = re.subn(a, b, s, count=1, flags=re.S)
            assert n == 1, f"{path}: 正規表現が一致しません: {a[:70]!r}"
    p.write_text(s, encoding="utf-8")
    print("OK", path)

# ---- 編集画面：文字数を、読める濃さで表示する ----
edit("src/components/QuestionEditor.tsx", [
    ("str", 'import { Modal } from "./Modal";', 'import { Modal } from "./Modal";\nimport { charCount } from "@/lib/text";'),
    ("str", '<p className="mb-2 text-right text-[11px] text-slate-300">{draft.body.length}文字</p>',
            '<p className="mb-2 text-right text-xs tabular-nums text-slate-500" title="前後の空白を除いた文字数">{charCount(draft.body)}文字</p>'),
])

# ---- 問題のカード：問題文の文字数を表示する ----
edit("src/components/QuestionBrowser.tsx", [
    ("str", 'import { Question } from "@/lib/types";', 'import { Question } from "@/lib/types";\nimport { charCount } from "@/lib/text";'),
    ("re", r"(            \{q\.imageMeta\.length > 0 && <span [^\n]*</span>\}\n)",
           r'\1            <span className="tabular-nums text-slate-400" title="問題文の文字数（前後の空白を除く）">{charCount(q.body)}文字</span>\n'),
])

# ---- 出題順のカード：カード全体を押すと編集のポップアップが開く。文字数も表示 ----
edit("src/app/sets/[setId]/adopted/page.tsx", [
    ("str", 'import { DEFAULT_RULES, OrderRules, Question } from "@/lib/types";', 'import { DEFAULT_RULES, OrderRules, Question } from "@/lib/types";\nimport { charCount } from "@/lib/text";'),
    ("str", '<div className="min-w-0 flex-1">',
            '<div role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onEdit())} title="クリックして編集" className="min-w-0 flex-1 cursor-pointer">'),
    ("re", r'(<p className="mt-0\.5 flex flex-wrap items-center gap-x-2 text-\[11px\] text-slate-400">\n)(\s*)',
           r'\1\2<span className="tabular-nums" title="問題文の文字数（前後の空白を除く）">{charCount(q.body)}文字</span>\n\2'),
])
PYEOF
python3 /tmp/cards_patch.py
~~~

手順3: 作問ページを置き換える（全文）

~~~bash
cat > "src/app/sets/[setId]/write/page.tsx" <<'EOF'
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { canCreateQuestion } from "@/lib/permissions";
import { ImageSlot, MAX_SOURCES } from "@/lib/types";
import { charCount } from "@/lib/text";
import { QuestionBrowser } from "@/components/QuestionBrowser";
import { ImageField, imageFilesFrom, useImageDraft } from "@/components/ImageField";
import { Modal } from "@/components/Modal";
import { Fab } from "@/components/Fab";

const input = "w-full rounded-lg border border-slate-200 bg-surface p-2.5 text-base text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const label = "mb-1 block text-xs text-slate-400";

// 作問ページ。自分の問題を、1問ずつカードで並べる。カードを押すと、編集のポップアップが開く。
// 「＋」を押すと、新しい問題を書くポップアップが開く（画面を開いただけでは、何も始まらない）。
// 入力中の内容は、ポップアップを閉じても残る。［保存］するまでDBには何も作らない。
export default function WritePage() {
  const { user } = useAuth();
  const { set, role, tree, gi } = useSetContext();
  const store = useQuestionStore();
  const canCreate = canCreateQuestion(role);
  const draftKey = `qraft:draft:${set.id}`;

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [altAnswers, setAltAnswers] = useState("");
  const [source, setSource] = useState("");
  const [genreId, setGenreId] = useState("");
  const [subGenreId, setSubGenreId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imgs = useImageDraft([]);

  // リロードや誤操作で書きかけが消えないよう、ブラウザ内（sessionStorage）にだけ退避する
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setBody(d.body ?? ""); setAnswer(d.answer ?? ""); setExplanation(d.explanation ?? "");
        setAltAnswers(d.altAnswers ?? ""); setSource(d.source ?? ""); setGenreId(d.genreId ?? ""); setSubGenreId(d.subGenreId ?? "");
      }
    } catch { /* noop */ }
  }, [draftKey]);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ body, answer, explanation, altAnswers, source, genreId, subGenreId })); } catch { /* noop */ }
  }, [draftKey, body, answer, explanation, altAnswers, source, genreId, subGenreId]);

  const dup = store.findDuplicate(body);
  const empty = !body.trim() && !answer.trim();
  const hasDraft = !empty || !!(explanation.trim() || altAnswers.trim() || source.trim()) || imgs.total > 0;

  function pasteImg(field: ImageSlot, e: React.ClipboardEvent) {
    const fs = imageFilesFrom(e);
    if (fs.length) {
      e.preventDefault();
      imgs.addFiles(field, fs);
    }
  }

  function clearDraft() {
    setBody(""); setAnswer(""); setExplanation(""); setAltAnswers(""); setSource("");
    imgs.reset();
  }

  async function handleSave(closeAfter: boolean) {
    if (saving || imgs.busy) return;
    setError("");
    if (empty) return setError("問題文か答えのどちらかを入力してください");
    setSaving(true);
    try {
      await store.createQuestion({
        body, answer, explanation, genreId, subGenreId, // ジャンルは連続作問のため、保存後も維持する
        altAnswers: altAnswers.split(",").map((s) => s.trim()).filter(Boolean),
        sources: source.trim() ? [source.trim()] : [],
        status: "draft",
      }, imgs.added);
      clearDraft();
      setSavedCount((n) => n + 1);
      if (closeAfter) setOpen(false);
      else bodyRef.current?.focus();
    } catch (e: any) {
      console.error("問題の作成に失敗しました", e);
      setError(e?.code === "permission-denied" ? "問題を作成する権限がありません" : e?.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const mine = useMemo(() => store.live.filter((q) => q.authorUid === user?.uid), [store.live, user]);

  if (!canCreate) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-6 text-center text-sm text-slate-400">この権限では問題を作成できません。「問題」タブで内容を確認できます。</p>;
  }

  const openBtn = "flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">作問</h2>
          <p className="text-xs text-slate-400">「＋」から新しい問題を書けます。カードを押すと、編集できます。</p>
        </div>
        <button onClick={() => setOpen(true)} className={`${openBtn} hidden sm:flex`}><Plus size={16} />新しい問題</button>
      </div>

      {!open && hasDraft && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warn-strong">
          <span>書きかけの問題があります{imgs.total > 0 && `（画像 ${imgs.total} 枚）`}。</span>
          <button onClick={() => setOpen(true)} className="font-medium underline">続きを書く</button>
        </div>
      )}

      {mine.length > 0 ? (
        <QuestionBrowser base={mine} storageKey={`qraft:f:${set.id}:write`} showAuthor={false} />
      ) : (
        !hasDraft && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-surface px-6 py-12 text-center">
            <p className="mb-4 text-sm text-slate-400">まだ、あなたの問題がありません。</p>
            <button onClick={() => setOpen(true)} className={`${openBtn} mx-auto`}><Plus size={16} />最初の問題を書く</button>
          </div>
        )
      )}

      {open && (
        <Modal
          onRequestClose={() => setOpen(false)}
          label="新しい問題"
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSave(false); } }}
        >
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-accent">新しい問題</span>
              <span className="flex items-center gap-2">
                {savedCount > 0 && <span className="text-xs text-ok" role="status">今回 {savedCount} 問を保存しました</span>}
                <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </span>
            </div>
            <label className={label}>問題文</label>
            <textarea ref={bodyRef} onPaste={(e) => pasteImg("body", e)} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="問題文を入力" className={`${input} mb-1 resize-y leading-relaxed`} autoFocus />
            {dup && <p className="mb-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-warn-strong">同じ問題文が既にあります（{set.memberProfiles?.[dup.authorUid]?.displayName || dup.authorName || "作問者不明"}）</p>}
            <p className="mb-2 text-right text-xs tabular-nums text-slate-500" title="前後の空白を除いた文字数">{charCount(body)}文字</p>
            <ImageField field="body" draft={imgs} loaded={{}} />
            <label className={label}>解答</label>
            <textarea onPaste={(e) => pasteImg("answer", e)} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={1} placeholder="解答" className={`${input} mb-3 resize-y font-medium text-accent-strong`} />
            <ImageField field="answer" draft={imgs} loaded={{}} />
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>大ジャンル</label>
                <select value={genreId} onChange={(e) => { setGenreId(e.target.value); setSubGenreId(""); }} className={input}>
                  <option value="">未設定</option>
                  {tree.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>小ジャンル</label>
                <select value={subGenreId} disabled={!genreId} onChange={(e) => setSubGenreId(e.target.value)} className={input}>
                  <option value="">未設定</option>
                  {gi.subsOf(genreId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <details className="mb-3">
              <summary className="cursor-pointer text-xs text-slate-500">解説・別解・出典を追加（最大{MAX_SOURCES}件はあとで一覧から追加できます）</summary>
              <div className="mt-2 space-y-2">
                <input value={altAnswers} onChange={(e) => setAltAnswers(e.target.value)} placeholder="別解（カンマ区切り）" className={input} />
                <textarea onPaste={(e) => pasteImg("explanation", e)} value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} placeholder="解説" className={`${input} resize-y`} />
                <ImageField field="explanation" draft={imgs} loaded={{}} />
                <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="出典（URLなど）" className={input} />
              </div>
            </details>
            {imgs.error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{imgs.error}</p>}
            {error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 bg-surface px-4 py-3 sm:-mx-5 sm:-mb-5 sm:px-5">
              <button onClick={() => handleSave(false)} disabled={saving || empty} className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40">
                {saving && <Loader2 size={14} className="animate-spin" />}保存して次へ
              </button>
              <button onClick={() => handleSave(true)} disabled={saving || empty} className="min-h-[44px] rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">保存して閉じる</button>
              <span className="hidden text-[11px] text-slate-300 sm:inline">Ctrl/⌘+Enterで保存して次へ</span>
              {hasDraft && <button onClick={() => { if (confirm("入力中の内容を破棄しますか？")) clearDraft(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600">入力を破棄</button>}
            </div>
          </div>
        </Modal>
      )}

      {!open && <Fab onClick={() => setOpen(true)} label="新しい問題を書く" />}
    </div>
  );
}
EOF
~~~

適用後の確認項目（2-2）

1. 作問ページを開いても、入力欄は自動で出ない。自分の問題が**全部**カードで並ぶ（8件を超えても）。
2. 各カードに「N文字」が出る。前後に空白がある問題文は、空白を除いた数。絵文字は1文字。
3. カードを押すと編集のポップアップが開く。ポップアップ内の文字数が、カードと同じ。
4. 「＋ 新しい問題」でポップアップが開き、入力すると文字数が増える。保存するとカードが増える。
5. 出題順ページで、カードの本文部分を押すと、ポップアップが開く（ドラッグの取っ手では開かない）。鉛筆ボタンでも開く。

## 3. Firebase の準備と、Googleのみへの切り替え

このプロジェクトでは、問題セットも権限も「ユーザーID」に紐づく。Google ログインで**別のIDができると、既存メンバーのデータが見えなくなる**ので、順番を守る。

マージ・公開の**前**に、Firebase コンソールで:

1. Authentication → Sign-in method → **Google を有効**にする（公開名とサポートメールの入力が必要）。
2. Authentication → Settings → **承認済みドメイン**に、公開サイトのドメイン（Vercel のドメイン、独自ドメイン）を追加する。
3. Authentication → Settings → **ユーザーアカウントのリンク**を「同じメールアドレスを使用するアカウントをリンクする」にする（*Link accounts that use the same email*）。「プロバイダごとに別のアカウントを作る」だと、Googleでログインするたびに別IDができる。
4. **メール／パスワードは、まだ無効にしない。**（連結の手順が使う）

公開後:

1. オーナー本人が、ログインしたまま、ダッシュボードの黄色い案内から Google を連結する。
2. コンソールの Authentication → Users で、その人の行に**メールと Google の両方**が付き、行が増えていないことを確認する。
3. ほかのメンバーにも、同じことを案内する（ログアウト中の人は、Googleでログインすると「パスワードを一度だけ入力して連結」の画面が出る）。
4. 全員の連結を確認できたら、メール／パスワードを**無効**にする。

注意

- Google アカウントのメールが、これまでのメールと**違う**と、連結の案内は出ず、新しいアカウントになる。過去のデータは見えず、再招待が必要。セットの**オーナーは、必ず同じメールで連結**すること（オーナーは変更できない設計）。
- 連結の画面・案内のコードは、全員の連結が終わったら削除してよい（削除のコードは必要になったら作る）。

## 4. 未確認の事項

- 本物の Google ログイン・連結・プロフィールの自動作成（作業環境では本物の Firebase に接続できなかった）
- 長い表示名（40文字超）の切り詰めの保存
- 新しい Firestore ルール（画像・アイコン）の動作。`firestore.rules` の変更は、コンソールに公開してから試す。
- スマホの実機（画面幅を変えての確認までしか、できていない）
- 「LINE などのアプリ内ブラウザでは Google ログインができないことがある」は、Google の方針に基づく一般的な情報で、このアプリでは試していない。

## 5. 決まっていること

- LP の方向: 「道具感」（製品の画面を大きく見せ、文章は最小限）。見る人: 初めて知る人。
- ログイン方法: Google のみ（移行期間は連結の手順あり）。
- タブのタイトル: 「セット名 - Qraft」。ほかのページは「ページ名 - Qraft」。
- LP に書くことは、必ず実際の動作と一致させる（確認済みの一覧は、会話の履歴にある。主な根拠: `search.ts`、`permissions.ts`、`orderRules.ts`、印刷・入出力のページ）。

## 6. 作業上の注意

- 作業用のコピーは、途中で消えることがある。**変更は、必ず手元のリポジトリに適用して commit する。**
- 画像の保存先は Firestore（Storage は使わない。Blaze プランを避けるため）。1枚あたり最大およそ225KB、1問6枚まで。
