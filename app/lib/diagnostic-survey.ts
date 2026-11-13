export type SurveyItem={id:string;number:number;text:string;type:string;choices:string[];category:string;groups:string[];ideal:number[]};
export const ORIGINAL_SURVEY:SurveyItem[]=[
 {
  "id": "OMD-001",
  "number": 1,
  "text": "수학공부 전반에서 내가 뭐가 약점인지 알고 있다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "자기이해",
  "groups": [],
  "ideal": []
 },
 {
  "id": "OMD-002",
  "number": 2,
  "text": "알고 있다면 무엇이 약점인지 적으시오.",
  "type": "text",
  "choices": [],
  "category": "자기이해",
  "groups": [],
  "ideal": []
 },
 {
  "id": "OMD-003",
  "number": 3,
  "text": "수학에서 가장 잘하는 단원은 어디인가?",
  "type": "text",
  "choices": [],
  "category": "자기이해",
  "groups": [],
  "ideal": []
 },
 {
  "id": "OMD-004",
  "number": 4,
  "text": "성적이 안 오를 때, 방법보다 재능 문제라고 느낀다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-005",
  "number": 5,
  "text": "문제를 쉽고 빠르게 푸는(3초풀이) 걸 보면 신기하고 나도 저렇게 풀고싶다는 생각이 든다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-006",
  "number": 6,
  "text": "교과서보단 문제에 바로 적용되는 실전개념이나 스킬을 공부하는 것이 낫다고 생각한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-007",
  "number": 7,
  "text": "난 모르는 게 있으면 누군가에게 적극적으로 질문하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-008",
  "number": 8,
  "text": "잘못된 점을 지적 받으면 기분이 먼저 상한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-009",
  "number": 9,
  "text": "나는 승부욕이 강한 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-010",
  "number": 10,
  "text": "계획을 세워도 지키지 못하는 경우가 많다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-011",
  "number": 11,
  "text": "나는 한 번 시작한 일은 끝까지 하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-012",
  "number": 12,
  "text": "결과가 나쁘면 공부 자체를 피하고 싶어진다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-013",
  "number": 13,
  "text": "나는 대학에 진학해야할 분명한 이유와 내 미래의 꿈이 무엇인지 알고 있다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "태도",
  "groups": [
   "G1"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-014",
  "number": 14,
  "text": "문제를 보면 전체적인 전략을 짜기 보단 일단 바로 계산부터 시작한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "문제풀이 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-015",
  "number": 15,
  "text": "새로운 문제는 접근 자체가 어렵다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "문제풀이 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-016",
  "number": 16,
  "text": "문제를 노트에 정리하며 푸는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "문제풀이 방식",
  "groups": [],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-017",
  "number": 17,
  "text": "문제를 유형별로 분류해서 접근하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "문제풀이 방식",
  "groups": [],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-018",
  "number": 18,
  "text": "문제를 풀다가 막히면 ‘아, 이거 이전에 어떻게 풀었더라?’라는 생각이 먼저 든다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "문제풀이 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-019",
  "number": 19,
  "text": "개념 설명을 보면 이해는 되지만, 문제에 바로 적용되지는 않는다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "문제풀이 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-020",
  "number": 20,
  "text": "정의, 정리, 증명과 같은 것들은 실전에서 딱히 도움이 되지 않는 것 같다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "개념 공부 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-021",
  "number": 21,
  "text": "수학에서 개념노트 정리는 솔직히 필요 없다고 생각한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "개념 공부 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-022",
  "number": 22,
  "text": "개념을 다시 정리해야겠다고 느끼지만 뭘 더 어떻게 공부할지 모르겠다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "개념 공부 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-023",
  "number": 23,
  "text": "개념 공부와 4점 이상 어려운 문제 풀이 사이에 괴리가 크다고 느낀다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "개념 공부 방식",
  "groups": [],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-024",
  "number": 24,
  "text": "국어 모의고사 성적대는?",
  "type": "korean_grade",
  "choices": [
   "5등급이하",
   "3~4등급",
   "1-3 기복",
   "1-2등급",
   "고정1 이상"
  ],
  "category": "잠재력",
  "groups": [],
  "ideal": [
   3,
   4,
   5
  ]
 },
 {
  "id": "OMD-025",
  "number": 25,
  "text": "게임(전략이 있는)이나, 운동(축구,농구,댄스 등)을 잘하거나 빠르게 배우는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "잠재력",
  "groups": [],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-026",
  "number": 26,
  "text": "답지를 끝까지 보지 않고 문제를 해결하고 싶다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "잠재력",
  "groups": [],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-027",
  "number": 27,
  "text": "어릴적(초등 or 중등) 공부를 잘했던 적이 있다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "잠재력",
  "groups": [],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-028",
  "number": 28,
  "text": "남에게 설명 하는 걸 좋아하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "잠재력",
  "groups": [],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-029",
  "number": 29,
  "text": "나는 문제를 풀거나 시험을 볼 때, 실수가 많은 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-030",
  "number": 30,
  "text": "수학 뿐만 아니라, 평소 일상생활에서도 실수가 잦은 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-031",
  "number": 31,
  "text": "실수는 운의 영역이라 고칠 수 없다고 생각한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-033",
  "number": 32,
  "text": "내가 실수하는 순간이 언제인지 안다. 혹은 알려고 노력해봤다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-034",
  "number": 33,
  "text": "실수를 줄이기 위한 개인적인 방법이 있다. (역문항)",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-035",
  "number": 34,
  "text": "나는 평소에 속으로 ‘절대로 실수 안해야지’ 라는 생각을 하며 실수를 신경쓰며 문제를 푸는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-036",
  "number": 35,
  "text": "나는 한 문제를 풀고 나면 답이 궁금해서 바로 답지를 확인하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-037",
  "number": 36,
  "text": "시험 때 검토를 하면 실수 한 부분을 바로 알아내는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-038",
  "number": 37,
  "text": "시험을 보거나 시간에 쫓기면 특히 실수가 늘어난다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "실수 관리",
  "groups": [
   "P5"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-039",
  "number": 38,
  "text": "시험만 보면 매우 긴장하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-040",
  "number": 39,
  "text": "시험볼 때 긴장하진 않는다고 느끼는데 성적은 항상 평소 실력 보다 낮게 나오는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-041",
  "number": 40,
  "text": "모의고사는 잘 보는데, 수능만 망하는 것 같다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-042",
  "number": 41,
  "text": "나는 스스로 소중하다고 생각한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "G1",
   "P6"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-043",
  "number": 42,
  "text": "나는 스스로 한심하다고 생각한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "G1",
   "P6"
  ],
  "ideal": [
   3
  ]
 },
 {
  "id": "OMD-044",
  "number": 43,
  "text": "수능을 망치면 인생도 망할 것 같은 느낌이 든다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "G1",
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-045",
  "number": 44,
  "text": "시험 보다가 막히는 문제가 나오면 바로 넘어가지 않고 고민하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-046",
  "number": 45,
  "text": "시험 볼 때 앞에 안 푼 문제가 있으면 불안해서 계속 신경이 쓰인다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-047",
  "number": 46,
  "text": "시험 볼 때 맨 앞에서부터 그냥 순서대로 쭉 푸는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-048",
  "number": 47,
  "text": "시험 시간이 얼마 남지 않았을 때, 검토 보단 못 풀었던 문제에 도전하는 편이 낫다고 생각한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "시험운용",
  "groups": [
   "P6"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-049",
  "number": 48,
  "text": "공부가 잘 되는 시간대는?",
  "type": "study_time",
  "choices": [
   "밤(9시이후)",
   "저녁",
   "오후(1-3시)",
   "오전",
   "기상직후"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   4,
   5
  ]
 },
 {
  "id": "OMD-050",
  "number": 49,
  "text": "공부를 시작하기까지 준비 시간이 길다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-051",
  "number": 50,
  "text": "취침, 기상 시간이 매일 일정하다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-052",
  "number": 51,
  "text": "평소 기상시간은?",
  "type": "wake_time",
  "choices": [
   "7시30분~",
   "7시~7시30분",
   "6시30분~7시",
   "6시~6시30분",
   "6시 전"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   4,
   5
  ]
 },
 {
  "id": "OMD-053",
  "number": 52,
  "text": "잠을 7시간 이상 충분히 자는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-054",
  "number": 53,
  "text": "진짜 절실하면 잠을 줄여서라도 공부를 해야한다고 생각한다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-055",
  "number": 54,
  "text": "자기 전이나 기상 직후에 유튜브, 웹툰, 인스타 등을 보는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-056",
  "number": 55,
  "text": "식사 시간이 규칙적이다.(간식도 포함)",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   5
  ]
 },
 {
  "id": "OMD-057",
  "number": 56,
  "text": "내가 먹고 싶은 것을 다 먹어야 스트레스도 풀리고 공부가 더 잘된다고 느낀다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   1
  ]
 },
 {
  "id": "OMD-058",
  "number": 57,
  "text": "규칙적으로 산책, 조깅 같은 가벼운 유산소 운동을 하는 편이다.",
  "type": "likert",
  "choices": [
   "매우아니다",
   "아니다",
   "보통이다",
   "그렇다",
   "매우그렇다"
  ],
  "category": "생활습관",
  "groups": [
   "G2"
  ],
  "ideal": [
   5
  ]
 }
];
