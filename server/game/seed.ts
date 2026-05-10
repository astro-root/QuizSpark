import { prisma } from '../lib/prisma'

const questions = [
  { text: '日本の首都はどこですか？',               answer: 'とうきょう', answers: ['とうきょう','tokyo'],       displayAnswer: '東京' },
  { text: '太陽系で最も大きな惑星は何ですか？',     answer: 'もくせい',   answers: ['もくせい','jupiter'],       displayAnswer: '木星' },
  { text: '日本で一番高い山は何ですか？',           answer: 'ふじさん',   answers: ['ふじさん','ふじ'],           displayAnswer: '富士山' },
  { text: '地球の自然の衛星の名前は何ですか？',     answer: 'つき',       answers: ['つき','moon'],              displayAnswer: '月' },
  { text: '人間の体で最も大きい臓器は何ですか？',   answer: 'ひふ',       answers: ['ひふ'],                     displayAnswer: '皮膚' },
  { text: '日本で最も長い川は何ですか？',           answer: 'しなのがわ', answers: ['しなのがわ','しなの'],       displayAnswer: '信濃川' },
  { text: '光が一年間に進む距離の単位は何ですか？', answer: 'こうねん',   answers: ['こうねん'],                 displayAnswer: '光年' },
  { text: 'リンゴを英語で何といいますか？',         answer: 'あっぷる',   answers: ['あっぷる','apple'],          displayAnswer: 'Apple' },
  { text: '春の次の季節は何ですか？',               answer: 'なつ',       answers: ['なつ','summer'],             displayAnswer: '夏' },
  { text: '世界で最も深い湖はどこですか？',         answer: 'ばいかるこ', answers: ['ばいかるこ','ばいかる'],     displayAnswer: 'バイカル湖' },
  { text: '日本の国鳥は何ですか？',                 answer: 'きじ',       answers: ['きじ'],                     displayAnswer: 'キジ' },
  { text: '世界で最も大きい砂漠はどこですか？',     answer: 'さはら',     answers: ['さはら','sahara'],           displayAnswer: 'サハラ砂漠' },
  { text: '水の化学式は何ですか？',                 answer: 'えいちつーおー', answers: ['えいちつーおー','h2o'],  displayAnswer: 'H₂O' },
  { text: '1年は何日ありますか？',                  answer: 'さんびゃくろくじゅうご', answers: ['さんびゃくろくじゅうご','365'], displayAnswer: '365日' },
  { text: '日本で最も大きい湖は何ですか？',         answer: 'びわこ',     answers: ['びわこ'],                   displayAnswer: '琵琶湖' },
  { text: 'ダイヤモンドの主成分は何ですか？',       answer: 'たんそ',     answers: ['たんそ','carbon'],           displayAnswer: '炭素' },
  { text: '地球から最も近い恒星は何ですか？',       answer: 'たいよう',   answers: ['たいよう','sun'],            displayAnswer: '太陽' },
  { text: '人間の骨は全部で何本ありますか？',       answer: 'にひゃくろくじゅうろく', answers: ['にひゃくろくじゅうろく','206'], displayAnswer: '206本' },
  { text: '音の速さは秒速約何メートルですか？',     answer: 'さんびゃくよんじゅう', answers: ['さんびゃくよんじゅう','340','さんびゃくさんじゅうさん'], displayAnswer: '約340m/s' },
  { text: '日本で最も長い橋は何ですか？',           answer: 'あかしかいきょうおおはし', answers: ['あかしかいきょうおおはし','あかしかいきょう'], displayAnswer: '明石海峡大橋' },
]

async function main() {
  const count = await prisma.question.count()
  if (count > 0) { console.log(`既に${count}問あります。スキップします。`); return }
  await prisma.question.createMany({ data: questions })
  console.log(`${questions.length}問を投入しました。`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
