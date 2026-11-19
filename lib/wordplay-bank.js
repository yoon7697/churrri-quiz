import { randomInt, randomUUID } from 'node:crypto';

const questions = [
  {
    text: '바다에 뜨기도 하고, 과일 가게에서 사 먹기도 하는 한 글자 말은?',
    answer: '배', distractors: ['귤', '돛', '수박'],
    explanation: '‘배’는 물 위를 다니는 탈것이기도 하고, 달콤한 과일이기도 해요.',
  },
  {
    text: '얼굴에 두 개 있고, 겨울에는 하늘에서도 내리는 것은?',
    answer: '눈', distractors: ['귀', '코', '비'],
    explanation: '보는 데 쓰는 ‘눈’과 겨울에 내리는 ‘눈’은 뜻이 달라요.',
  },
  {
    text: '하루 중 어두운 시간이지만, 가을에 주워 까 먹을 수도 있는 것은?',
    answer: '밤', distractors: ['별', '낮', '도토리'],
    explanation: '어두운 시간도 ‘밤’, 가시가 있는 껍데기 안에서 자라는 열매도 ‘밤’이에요.',
  },
  {
    text: '입으로 하기도 하고, 등에 올라타기도 하는 한 글자 말은?',
    answer: '말', distractors: ['소', '혀', '노래'],
    explanation: '입으로 하는 ‘말’은 이야기예요. 타고 달릴 수 있는 ‘말’은 동물이에요.',
  },
  {
    text: '미안할 때도 하고, 깎아서 먹기도 하는 것은?',
    answer: '사과', distractors: ['수박', '인사', '복숭아'],
    explanation: '잘못을 인정하고 미안하다고 하는 ‘사과’와 과일 ‘사과’가 있어요.',
  },
  {
    text: '뜨거운 밥에서 모락모락 올라오기도 하고, 밥을 싸 먹을 때 쓰기도 하는 것은?',
    answer: '김', distractors: ['연기', '소금', '물'],
    explanation: '뜨거운 밥에서 올라오는 ‘김’은 수증기가 식으며 보이는 것이고, 밥을 싸는 ‘김’은 바다에서 자라는 해조류로 만들어요.',
  },
  {
    text: '길가에서 자라기도 하고, 종이를 붙이는 데 쓰기도 하는 한 글자 말은?',
    answer: '풀', distractors: ['꽃', '붓', '흙'],
    explanation: '땅에서 자라는 ‘풀’은 식물이고, 종이를 붙일 때 바르는 ‘풀’은 접착제예요.',
  },
  {
    text: '걸을 때 쓰기도 하고, 강을 건너는 길이 되기도 하는 것은?',
    answer: '다리', distractors: ['팔', '터널', '어깨'],
    explanation: '몸의 ‘다리’는 걷는 데 쓰고, 강 위에 놓인 ‘다리’는 건너가는 데 써요.',
  },
  {
    text: '도로에서 타고 가기도 하고, 찻잔에 따라 마시기도 하는 것은?',
    answer: '차', distractors: ['버스', '우유', '기차'],
    explanation: '도로를 달리는 ‘차’는 탈것이고, 잎 등을 우려 만든 ‘차’는 마시는 음료예요.',
  },
  {
    text: '물을 담는 유리 그릇을 가리키기도 하고, 몸이 아픈 상태를 가리키기도 하는 것은?',
    answer: '병', distractors: ['컵', '물', '열'],
    explanation: '물을 담는 ‘병’은 그릇이고, 몸에 생기는 ‘병’은 질환이에요.',
  },
  {
    text: '땅속을 파서 만들기도 하고, 바다에서 키워 먹기도 하는 것은?',
    answer: '굴', distractors: ['게', '우물', '조개'],
    explanation: '땅속에 파인 ‘굴’은 통로나 공간이고, 먹는 ‘굴’은 바다에 사는 조개류예요.',
  },
  {
    text: '꽃에 날아오기도 하고, 규칙을 어겼을 때 받기도 하는 것은?',
    answer: '벌', distractors: ['나비', '상', '매미'],
    explanation: '꽃에 날아오는 ‘벌’은 곤충이고, 규칙을 어겼을 때 받는 ‘벌’은 잘못에 따른 처분이에요.',
  },
  {
    text: '종이에 반듯한 선을 긋는 물건의 이름이자, “이제 잠을 ○!”의 빈칸에 들어갈 말은?',
    answer: '자', distractors: ['펜', '잠', '가'],
    explanation: '길이를 재고 선을 긋는 ‘자’가 있어요. “어서 자”의 ‘자’는 잠을 자라는 말이에요.',
  },
  {
    text: '시계에서 분보다 작은 시간 단위이고, 생일 케이크에서는 불을 붙이는 것은?',
    answer: '초', distractors: ['분', '심지', '종'],
    explanation: '1분은 60‘초’예요. 케이크에 꽂고 불을 붙이는 것도 ‘초’라고 해요.',
  },
];

export function pickWordplayQuestions(count, existingQuestions) {
  const normalize = text => text.normalize('NFKC').replace(/[\s\p{P}]/gu, '');
  const texts = new Set(existingQuestions.map(question => normalize(question.text)));
  const available = questions.filter(question => !texts.has(normalize(question.text)));

  return Array.from({length: count}, () => {
    const [question] = available.splice(randomInt(available.length), 1);
    const options = [...question.distractors];
    const correct = randomInt(options.length + 1);
    options.splice(correct, 0, question.answer);
    return {
      id: randomUUID(),
      text: question.text,
      options,
      correct,
      explanation: question.explanation,
      kind: 'nonsense',
    };
  });
}
