import type { ListeningExpression } from "@/lib/types";

export const lv028Expressions: ListeningExpression[] = [
  {
    expression: "思考錯誤",
    expressionReading: "しこうさくご",
    meaning: "시행착오 (여러 가지 시도와 실패를 반복하며 방법을 찾아가는 과정)",
    example:
      "全部キーボードでVSコードをいじれないかなっていう思考錯誤した時期があって、無理だってなったんですよ",
    exampleReading:
      "ぜんぶキーボードでVSコードをいじれないかなっていうしこうさくごしたじきがあって、むりだってなったんですよ",
    exampleTranslation:
      "전부 키보드만으로 VS Code를 조작할 수 없을까 하고 시행착오하던 시기가 있었는데, 안 되겠다 싶었어요",
    startTime: 975.5,
    vocabulary: [
      { word: "思考錯誤", reading: "しこうさくご", meaning: "시행착오" },
      { word: "いじる", reading: "いじる", meaning: "조작하다, 만지다" },
    ],
  },
  {
    expression: "沼る",
    expressionReading: "ぬまる",
    meaning: "빠져들다, 헤어나올 수 없게 되다 (어떤 것에 깊이 빠져 시간을 잊는 상태)",
    example:
      "1回設定ファイル開けると沼って1時間くらい帰ってこない",
    exampleReading:
      "いっかいせっていファイルあけるとぬまっていちじかんくらいかえってこない",
    exampleTranslation:
      "한 번 설정 파일을 열면 빠져들어서 1시간 정도 돌아오지 못해요",
    startTime: 255.5,
    vocabulary: [
      { word: "沼る", reading: "ぬまる", meaning: "빠지다, 몰입하다" },
      { word: "設定", reading: "せってい", meaning: "설정" },
    ],
  },
  {
    expression: "生産性が上がる",
    expressionReading: "せいさんせいがあがる",
    meaning: "생산성이 오르다 (작업 효율과 결과물이 향상되다)",
    example:
      "実際に生産性は本当に上がりました。VSコード重かったのもそうだし",
    exampleReading:
      "じっさいにせいさんせいはほんとうにあがりました。VSコードおもかったのもそうだし",
    exampleTranslation:
      "실제로 생산성이 정말 올라갔어요. VS Code가 무거웠던 것도 그렇고",
    startTime: 970.5,
    vocabulary: [
      { word: "生産性", reading: "せいさんせい", meaning: "생산성" },
      { word: "上がる", reading: "あがる", meaning: "오르다, 향상되다" },
    ],
  },
  {
    expression: "切り出す",
    expressionReading: "きりだす",
    meaning: "분리해내다, 떼어내다 (큰 것에서 일부를 추출하여 독립시키다)",
    example:
      "設定がでかくなってきたらそれを切り出してプラグインにするっていう、ただそれだけなんですよ",
    exampleReading:
      "せっていがでかくなってきたらそれをきりだしてプラグインにするっていう、ただそれだけなんですよ",
    exampleTranslation:
      "설정이 커지면 그걸 분리해서 플러그인으로 만든다는 거예요, 그것뿐이에요",
    startTime: 1010.5,
    vocabulary: [
      { word: "切り出す", reading: "きりだす", meaning: "분리해내다" },
      {
        word: "呼び出す",
        reading: "よびだす",
        meaning: "호출하다, 불러내다",
      },
    ],
  },
  {
    expression: "積み重なる",
    expressionReading: "つみかさなる",
    meaning: "쌓이다, 누적되다 (작은 것들이 차곡차곡 모여 큰 효과를 내다)",
    example:
      "こういう細かいのが積み重なると明らかにVSコードとか使うよりも早くなるんですよね",
    exampleReading:
      "こういうこまかいのがつみかさなるとあきらかにVSコードとかつかうよりもはやくなるんですよね",
    exampleTranslation:
      "이런 사소한 것들이 쌓이면 확실히 VS Code 같은 걸 쓰는 것보다 빨라지거든요",
    startTime: 1193.5,
    vocabulary: [
      { word: "積み重なる", reading: "つみかさなる", meaning: "쌓이다, 누적되다" },
      { word: "明らかに", reading: "あきらかに", meaning: "확실히, 명백히" },
    ],
  },
  {
    expression: "思考の速度で編集する",
    expressionReading: "しこうのそくどでへんしゅうする",
    meaning:
      "생각하는 속도로 편집하다 (머릿속에서 떠오르는 대로 즉시 코드를 수정하다)",
    example:
      "ビム実践入門っていう有名な本があるんですけど、そこに書かれてるのは思考の速度で編集するっていうのがかっこいい",
    exampleReading:
      "ビムじっせんにゅうもんっていうゆうめいなほんがあるんですけど、そこにかかれてるのはしこうのそくどでへんしゅうするっていうのがかっこいい",
    exampleTranslation:
      "Vim 실전입문이라는 유명한 책이 있는데, 거기에 쓰여 있는 건 '생각의 속도로 편집한다'는 것이 멋져요",
    startTime: 1966.5,
    vocabulary: [
      { word: "思考", reading: "しこう", meaning: "사고, 생각" },
      { word: "速度", reading: "そくど", meaning: "속도" },
      { word: "実践", reading: "じっせん", meaning: "실천, 실전" },
    ],
  },
  {
    expression: "選定基準",
    expressionReading: "せんていきじゅん",
    meaning: "선정 기준 (무언가를 고를 때 적용하는 판단 기준)",
    example:
      "りょうぴぴさんの開発におけるソフトウェアの選定基準っていうのは、ネオビムから始まってそれとの相性で使うか使わないかみたいな",
    exampleReading:
      "りょうぴぴさんのかいはつにおけるソフトウェアのせんていきじゅんっていうのは、ネオビムからはじまってそれとのあいしょうでつかうかつかわないかみたいな",
    exampleTranslation:
      "료피피 씨의 개발에서 소프트웨어 선정 기준이라는 것은 Neovim부터 시작해서 그것과의 궁합으로 쓸지 말지를 결정한다는 거네요",
    startTime: 1778.5,
    vocabulary: [
      { word: "選定", reading: "せんてい", meaning: "선정" },
      { word: "基準", reading: "きじゅん", meaning: "기준" },
      { word: "相性", reading: "あいしょう", meaning: "궁합, 호환성" },
    ],
  },
];
