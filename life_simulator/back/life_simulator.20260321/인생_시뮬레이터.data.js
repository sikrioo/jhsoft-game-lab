const SCHEMA = {
  start: {
    label:'출발 레이어', color:'#c9a84c', fixed:true,
    vars:[
      {k:'birth_env',  l:'출생환경',  tip:'전쟁/기아/국가/지역/시대 수준'},
      {k:'family_bg',  l:'가정배경',  tip:'부모 자원·교육·문화자본'},
      {k:'health_con', l:'건강체질',  tip:'기본 체력·질병 리스크·체질 상한선'},
      {k:'looks',      l:'외모',      tip:'첫인상·사회적 초기 유리/불리'},
      {k:'birth_luck', l:'출생운',    tip:'시대·국가·유전·가정의 운 복권'},
    ]
  },
  talent: {
    label:'재능 레이어', color:'#7c6af0',
    vars:[
      {k:'eng_sense',  l:'공학감각',  tip:'구조·시스템·인과·설계 직관'},
      {k:'hum_sense',  l:'인문감각',  tip:'맥락·언어·인간이해·서사 감각'},
      {k:'art_sense',  l:'예술감각',  tip:'미감·리듬·색감·정서 감각'},
      {k:'body_skill', l:'신체재능',  tip:'몸의 정밀도·리듬감·공간지각·반응'},
    ]
  },
  ability: {
    label:'인지/능력 레이어', color:'#5a9ef0',
    vars:[
      {k:'reasoning',  l:'추론력',    tip:'논리·분석·문제해결'},
      {k:'pattern',    l:'패턴인식',  tip:'반복구조·규칙 찾기'},
      {k:'modeling',   l:'모델링력',  tip:'추상화·구조화·형상화'},
      {k:'creative_c', l:'창의연결력', tip:'유추·발상·새로운 연결'},
      {k:'focus',      l:'집중력',    tip:'몰입 지속 시간·주의 유지'},
      {k:'execution',  l:'실행력',    tip:'실제 행동으로 옮기는 힘 (엔진 출력)'},
      {k:'willpower',  l:'의지력',    tip:'포기하지 않는 힘 (내면 연료)'},
      {k:'mental',     l:'정신력',    tip:'스트레스 저항·회복력'},
      {k:'stamina',    l:'체력',      tip:'장기전 수행력·신체 지속력'},
      {k:'adapt',      l:'적응력',    tip:'환경 변화 대응력·피벗 능력'},
    ]
  },
  social: {
    label:'사회/기술 레이어', color:'#4eb87a',
    vars:[
      {k:'social_sk',  l:'사회기술',  tip:'관계형성·눈치·협상·네트워킹'},
      {k:'expression', l:'표현력',    tip:'말·글·설득·전달 능력'},
      {k:'exec_tech',  l:'실행기술',  tip:'실제 만들기·생산하기'},
      {k:'ops_skill',  l:'운영기술',  tip:'돈·조직·시스템 관리'},
      {k:'fin_intel',  l:'재무지능',  tip:'자산 형성·돈 관리·투자 감각'},
      {k:'art_expr',   l:'예술표현기술', tip:'그림·음악·글·연기·디자인 표현'},
      {k:'self_aware', l:'자기인식',  tip:'자신의 재능·한계를 얼마나 정확히 아는가'},
    ]
  },
  trait: {
    label:'성향/욕구 레이어', color:'#e87ab0',
    vars:[
      {k:'morality',   l:'도덕성',    tip:'책임감·규범의식·윤리 수준'},
      {k:'aggression', l:'공격성',    tip:'밀어붙임·대립 감수·승부욕'},
      {k:'empathy',    l:'공감성',    tip:'타인 이해·배려·감정 읽기'},
      {k:'impulsive',  l:'충동성',    tip:'즉흥 행동 성향 (높을수록 충동적)'},
      {k:'self_ctrl',  l:'자기통제력', tip:'절제·장기 목표 유지'},
      {k:'risk_pref',  l:'위험선호',  tip:'모험 선택 성향'},
      {k:'achiev',     l:'성취욕',    tip:'목표 달성 욕구'},
      {k:'power_d',    l:'권력욕',    tip:'지배·영향력 욕구'},
      {k:'recognition',l:'인정욕',    tip:'남의 평가에 대한 민감도'},
      {k:'stability',  l:'안정욕',    tip:'안전·예측 가능성 선호'},
      {k:'pleasure',   l:'쾌락욕',    tip:'즐거움·자극 추구'},
      {k:'survival',   l:'생존욕',    tip:'위험 회피·현실 감각'},
      {k:'jealousy',   l:'질투심',    tip:'타인과의 비교 민감도 (적당하면 동력)'},
    ]
  },
  charm: {
    label:'매력 레이어', color:'#e05a5a',
    vars:[
      {k:'confidence', l:'자신감',    tip:'흔들림 없는 느낌·존재감'},
      {k:'trust_feel', l:'신뢰감',    tip:'믿을 수 있는 인상'},
      {k:'affinity',   l:'친화력',    tip:'편안함·호감·따뜻함'},
      {k:'style',      l:'분위기연출력', tip:'스타일·말투·태도'},
      {k:'emotion_ex', l:'감정표현력', tip:'표정·리액션·온기'},
      {k:'mystery',    l:'거리감/신비', tip:'쉽게 다가갈 수 없는 느낌'},
    ]
  },
  env: {
    label:'환경/운 레이어', color:'#3db8a8',
    vars:[
      {k:'econ_power', l:'경제력',    tip:'버틸 수 있는 자원·자본'},
      {k:'network',    l:'네트워크',  tip:'연결·추천·보호 자원'},
      {k:'edu_access', l:'교육접근성', tip:'배우고 인증받을 기회'},
      {k:'opp_access', l:'기회접근성', tip:'좋은 기회를 만날 확률'},
      {k:'era_fit',    l:'시대적합성', tip:'이 재능이 지금 시대에 통하는가'},
      {k:'mobility',   l:'사회이동성', tip:'계층 이동 가능한 구조인가'},
      {k:'fam_burden', l:'가족부담',  tip:'생계·돌봄·책임의 무게 (높을수록 부담)'},
      {k:'competition',l:'경쟁강도',  tip:'들어간 판의 난이도 (높을수록 힘듦)'},
      {k:'env_luck',   l:'환경운',    tip:'만남·우연한 기회 (매회 랜덤 보정)'},
    ]
  },
};

// ══════════════════════════════════════════════════════
// 2. DECADE CONFIG
// ══════════════════════════════════════════════════════
const DECADES = {
  '1960':{note:'산업화 세대. 새마을운동·경제개발 수혜. 사회성+체력 높으면 폭발적 보상. 배경 열세를 실행력으로 돌파 가능.',
    bonus:{social_sk:15,stamina:10,execution:10,risk_pref:5,family_bg:-8,competition:-10},wp:-5,
    ev:[{l:'새마을운동',t:'p'},{l:'경제개발5개년',t:'p'},{l:'오일쇼크',t:'n'},{l:'유신독재',t:'n'},{l:'베트남파병',t:'u'}]},
  '1970':{note:'중화학공업화. 386세대. 민주화운동. 2차 오일쇼크·정치혼란. 사회 의식 높음.',
    bonus:{social_sk:10,stamina:8,execution:8,reasoning:3,morality:5},wp:-8,
    ev:[{l:'2차오일쇼크',t:'n'},{l:'10.26사태',t:'n'},{l:'5.18광주',t:'n'},{l:'중화학호황',t:'p'},{l:'민주화운동',t:'u'}]},
  '1980':{note:'IMF 직격 세대. 안정 직종 선호. 위험 감수 패널티. 인터넷 태동. 디지털 전환 초기.',
    bonus:{reasoning:5,morality:5,adapt:8,risk_pref:-12,creative_c:5},wp:-14,
    ev:[{l:'IMF외환위기',t:'n'},{l:'닷컴버블',t:'n'},{l:'문민정부',t:'p'},{l:'인터넷보급',t:'p'},{l:'3저호황',t:'p'}]},
  '1990':{note:'밀레니얼. 금융위기+부동산 폭등 직격. 스마트폰 혁명. 취업 전쟁 1세대.',
    bonus:{reasoning:5,creative_c:8,expression:5,adapt:5,risk_pref:-8,family_bg:-5},wp:-16,
    ev:[{l:'2008금융위기',t:'n'},{l:'부동산폭등',t:'n'},{l:'스마트폰혁명',t:'p'},{l:'한류태동',t:'p'},{l:'청년실업',t:'n'}]},
  '2000':{note:'Z세대. 코로나 직격. AI혁명 세대. 창의·콘텐츠 보상. 취업시장 역대 최악.',
    bonus:{reasoning:5,creative_c:12,expression:8,execution:5,stamina:-5,social_sk:-3},wp:-20,
    ev:[{l:'코로나19',t:'n'},{l:'유튜브·SNS',t:'p'},{l:'AI혁명',t:'p'},{l:'주택불가능',t:'n'},{l:'학벌인플레',t:'n'}]},
  '2010':{note:'알파세대. AI 네이티브. 기후위기+지정학불안. 완전히 다른 규칙의 세상에서 성장.',
    bonus:{creative_c:15,expression:5,adapt:10,reasoning:3,stamina:-8,social_sk:-8},wp:-24,
    ev:[{l:'AI대체위기',t:'n'},{l:'기후위기',t:'n'},{l:'우크라이나전쟁',t:'n'},{l:'AI창작도구',t:'p'},{l:'글로벌분업붕괴',t:'n'}]},
  '2020':{note:'미래세대. 예측 불가능. AI·기후·지정학이 삶의 조건 자체를 재정의하는 시대.',
    bonus:{creative_c:18,adapt:15,reasoning:5,stamina:-10,social_sk:-10,risk_pref:-5},wp:-30,
    ev:[{l:'AI전면대체',t:'n'},{l:'기후재난',t:'n'},{l:'중동·대만긴장',t:'n'},{l:'바이오혁명',t:'p'},{l:'완전불확실성',t:'u'}]},
};

// ══════════════════════════════════════════════════════
// 3. PRESETS
// ══════════════════════════════════════════════════════
const PRESETS = {
  '📌 60년대 영업 성공인':{birth_env:35,family_bg:10,health_con:65,looks:55,birth_luck:45,eng_sense:40,hum_sense:58,art_sense:40,body_skill:50,reasoning:55,pattern:50,modeling:45,creative_c:60,focus:70,execution:82,willpower:87,mental:85,stamina:68,adapt:75,social_sk:92,expression:87,exec_tech:60,ops_skill:55,fin_intel:50,art_expr:35,self_aware:65,morality:55,aggression:60,empathy:55,impulsive:40,self_ctrl:75,risk_pref:70,achiev:85,power_d:55,recognition:60,stability:45,pleasure:50,survival:70,jealousy:45,confidence:78,trust_feel:72,affinity:85,style:65,emotion_ex:70,mystery:40,econ_power:20,network:45,edu_access:30,opp_access:55,era_fit:80,mobility:65,fam_burden:60,competition:40,env_luck:70},
  '보통 인간':{birth_env:50,family_bg:50,health_con:50,looks:50,birth_luck:50,eng_sense:50,hum_sense:50,art_sense:50,body_skill:50,reasoning:50,pattern:50,modeling:50,creative_c:50,focus:50,execution:50,willpower:50,mental:50,stamina:50,adapt:50,social_sk:50,expression:50,exec_tech:50,ops_skill:50,fin_intel:50,art_expr:50,self_aware:50,morality:50,aggression:50,empathy:50,impulsive:50,self_ctrl:50,risk_pref:50,achiev:50,power_d:50,recognition:50,stability:50,pleasure:50,survival:50,jealousy:50,confidence:50,trust_feel:50,affinity:50,style:50,emotion_ex:50,mystery:50,econ_power:50,network:50,edu_access:50,opp_access:50,era_fit:50,mobility:50,fam_burden:50,competition:50,env_luck:50},
  '외모 98 저스탯':{birth_env:50,family_bg:40,health_con:55,looks:98,birth_luck:60,eng_sense:25,hum_sense:35,art_sense:45,body_skill:55,reasoning:30,pattern:28,modeling:25,creative_c:30,focus:30,execution:30,willpower:25,mental:30,stamina:55,adapt:45,social_sk:70,expression:55,exec_tech:25,ops_skill:25,fin_intel:20,art_expr:35,self_aware:25,morality:20,aggression:55,empathy:25,impulsive:80,self_ctrl:20,risk_pref:65,achiev:40,power_d:65,recognition:85,stability:30,pleasure:80,survival:50,jealousy:70,confidence:75,trust_feel:40,affinity:60,style:80,emotion_ex:65,mystery:50,econ_power:35,network:35,edu_access:40,opp_access:50,era_fit:55,mobility:45,fam_burden:40,competition:50,env_luck:55},
  '천재형':{birth_env:50,family_bg:45,health_con:45,looks:45,birth_luck:52,eng_sense:92,hum_sense:72,art_sense:68,body_skill:35,reasoning:95,pattern:92,modeling:95,creative_c:90,focus:88,execution:55,willpower:80,mental:72,stamina:38,adapt:62,social_sk:35,expression:62,exec_tech:60,ops_skill:40,fin_intel:45,art_expr:65,self_aware:60,morality:52,aggression:45,empathy:40,impulsive:55,self_ctrl:70,risk_pref:55,achiev:85,power_d:45,recognition:50,stability:40,pleasure:50,survival:40,jealousy:55,confidence:65,trust_feel:55,affinity:35,style:40,emotion_ex:40,mystery:70,econ_power:40,network:35,edu_access:55,opp_access:45,era_fit:72,mobility:55,fam_burden:30,competition:60,env_luck:55},
  '예술가형':{birth_env:48,family_bg:40,health_con:52,looks:65,birth_luck:50,eng_sense:30,hum_sense:78,art_sense:96,body_skill:52,reasoning:65,pattern:60,modeling:65,creative_c:90,focus:80,execution:50,willpower:72,mental:60,stamina:52,adapt:65,social_sk:65,expression:82,exec_tech:48,ops_skill:38,fin_intel:30,art_expr:95,self_aware:65,morality:60,aggression:40,empathy:70,impulsive:65,self_ctrl:50,risk_pref:62,achiev:75,power_d:35,recognition:70,stability:35,pleasure:70,survival:45,jealousy:60,confidence:60,trust_feel:55,affinity:65,style:80,emotion_ex:80,mystery:70,econ_power:35,network:40,edu_access:48,opp_access:42,era_fit:62,mobility:50,fam_burden:35,competition:58,env_luck:52},
  '공학자형':{birth_env:55,family_bg:55,health_con:55,looks:45,birth_luck:55,eng_sense:92,hum_sense:45,art_sense:38,body_skill:45,reasoning:87,pattern:90,modeling:88,creative_c:70,focus:85,execution:82,willpower:75,mental:72,stamina:52,adapt:65,social_sk:50,expression:55,exec_tech:85,ops_skill:60,fin_intel:60,art_expr:35,self_aware:70,morality:65,aggression:50,empathy:45,impulsive:35,self_ctrl:78,risk_pref:50,achiev:80,power_d:45,recognition:45,stability:65,pleasure:45,survival:60,jealousy:40,confidence:62,trust_feel:68,affinity:48,style:42,emotion_ex:42,mystery:55,econ_power:55,network:45,edu_access:65,opp_access:55,era_fit:80,mobility:60,fam_burden:40,competition:65,env_luck:55},
  '운동선수형':{birth_env:55,family_bg:50,health_con:90,looks:68,birth_luck:60,eng_sense:40,hum_sense:40,art_sense:35,body_skill:95,reasoning:50,pattern:62,modeling:45,creative_c:40,focus:82,execution:82,willpower:92,mental:87,stamina:96,adapt:65,social_sk:60,expression:48,exec_tech:78,ops_skill:42,fin_intel:42,art_expr:35,self_aware:65,morality:62,aggression:78,empathy:50,impulsive:55,self_ctrl:75,risk_pref:58,achiev:90,power_d:60,recognition:70,stability:50,pleasure:60,survival:65,jealousy:65,confidence:80,trust_feel:62,affinity:62,style:62,emotion_ex:60,mystery:45,econ_power:50,network:55,edu_access:45,opp_access:55,era_fit:65,mobility:58,fam_burden:45,competition:72,env_luck:60},
  '리더형':{birth_env:62,family_bg:65,health_con:68,looks:65,birth_luck:65,eng_sense:55,hum_sense:82,art_sense:55,body_skill:60,reasoning:80,pattern:72,modeling:78,creative_c:68,focus:78,execution:88,willpower:87,mental:87,stamina:68,adapt:82,social_sk:92,expression:92,exec_tech:72,ops_skill:82,fin_intel:70,art_expr:55,self_aware:80,morality:75,aggression:72,empathy:72,impulsive:38,self_ctrl:82,risk_pref:65,achiev:88,power_d:82,recognition:68,stability:55,pleasure:50,survival:65,jealousy:45,confidence:88,trust_feel:82,affinity:80,style:78,emotion_ex:72,mystery:60,econ_power:62,network:78,edu_access:68,opp_access:72,era_fit:72,mobility:68,fam_burden:45,competition:65,env_luck:65},
  '범죄자형':{birth_env:25,family_bg:22,health_con:68,looks:60,birth_luck:30,eng_sense:45,hum_sense:58,art_sense:35,body_skill:72,reasoning:55,pattern:60,modeling:48,creative_c:50,focus:55,execution:72,willpower:58,mental:42,stamina:72,adapt:75,social_sk:78,expression:68,exec_tech:68,ops_skill:50,fin_intel:45,art_expr:35,self_aware:35,morality:10,aggression:88,empathy:18,impulsive:82,self_ctrl:22,risk_pref:88,achiev:72,power_d:80,recognition:55,stability:25,pleasure:82,survival:72,jealousy:72,confidence:75,trust_feel:35,affinity:65,style:58,emotion_ex:55,mystery:62,econ_power:22,network:38,edu_access:28,opp_access:38,era_fit:45,mobility:42,fam_burden:65,competition:55,env_luck:35},
  '투자자형':{birth_env:55,family_bg:58,health_con:55,looks:50,birth_luck:58,eng_sense:72,hum_sense:58,art_sense:35,body_skill:45,reasoning:87,pattern:88,modeling:82,creative_c:62,focus:82,execution:72,willpower:75,mental:82,stamina:52,adapt:87,social_sk:58,expression:58,exec_tech:55,ops_skill:78,fin_intel:92,art_expr:32,self_aware:78,morality:52,aggression:62,empathy:45,impulsive:42,self_ctrl:80,risk_pref:88,achiev:85,power_d:65,recognition:52,stability:45,pleasure:52,survival:68,jealousy:48,confidence:72,trust_feel:65,affinity:52,style:55,emotion_ex:48,mystery:65,econ_power:62,network:55,edu_access:62,opp_access:68,era_fit:72,mobility:62,fam_burden:35,competition:68,env_luck:60},
  '기능직형':{birth_env:42,family_bg:35,health_con:80,looks:50,birth_luck:45,eng_sense:68,hum_sense:42,art_sense:48,body_skill:80,reasoning:50,pattern:62,modeling:52,creative_c:42,focus:72,execution:87,willpower:82,mental:72,stamina:85,adapt:65,social_sk:55,expression:42,exec_tech:88,ops_skill:50,fin_intel:42,art_expr:45,self_aware:60,morality:68,aggression:55,empathy:55,impulsive:45,self_ctrl:72,risk_pref:42,achiev:72,power_d:40,recognition:45,stability:72,pleasure:55,survival:72,jealousy:42,confidence:62,trust_feel:70,affinity:60,style:45,emotion_ex:55,mystery:42,econ_power:38,network:38,edu_access:40,opp_access:42,era_fit:52,mobility:50,fam_burden:55,competition:45,env_luck:48},
  '🎲 랜덤':null,
};

// ══════════════════════════════════════════════════════
// 4. TAGS
// ══════════════════════════════════════════════════════
const TAGS = {
  mindfulness: {
    label:'명상',
    color:'#7c6af0',
    description:'충동 완화와 자기통제 강화',
    levels:[
      {value:'none', label:'없음', effects:{}},
      {value:'year1', label:'1년+', effects:{self_ctrl:5, impulsive:-3, mental:4}},
      {value:'year3', label:'3년+', effects:{self_ctrl:10, impulsive:-6, mental:8}},
    ],
  },
  exercise: {
    label:'운동',
    color:'#4eb87a',
    description:'체력과 장기 지속력 강화',
    levels:[
      {value:'none', label:'없음', effects:{}},
      {value:'year1', label:'1년+', effects:{stamina:6, mental:3}},
      {value:'year3', label:'3년+', effects:{stamina:12, mental:6, adapt:4}},
    ],
  },
  nature: {
    label:'자연활동',
    color:'#3db8a8',
    description:'정서 회복과 스트레스 완충',
    levels:[
      {value:'none', label:'없음', effects:{}},
      {value:'sometimes', label:'가끔', effects:{mental:3}},
      {value:'steady', label:'꾸준', effects:{mental:6, adapt:3}},
    ],
  },
  leadership: {
    label:'리더 경험',
    color:'#e87ab0',
    description:'자신감과 영향력 상승',
    levels:[
      {value:'none', label:'없음', effects:{}},
      {value:'some', label:'있음', effects:{confidence:5, social_sk:4}},
      {value:'many', label:'많음', effects:{confidence:10, social_sk:8, power_d:3, network:3}},
    ],
  },
  speaking: {
    label:'발표 경험',
    color:'#5a9ef0',
    description:'표현력과 긴장 저항 보정',
    levels:[
      {value:'none', label:'없음', effects:{}},
      {value:'some', label:'있음', effects:{expression:5}},
      {value:'many', label:'많음', effects:{expression:10, mental:5}},
    ],
  },
  collaboration: {
    label:'협업 핵심 역할',
    color:'#c9a84c',
    description:'협상·조율·실무 협업 강화',
    levels:[
      {value:'none', label:'없음', effects:{}},
      {value:'some', label:'있음', effects:{social_sk:3, expression:2}},
      {value:'many', label:'많음', effects:{social_sk:6, expression:4, ops_skill:3}},
    ],
  },
  routine: {
    label:'장기 루틴 유지',
    color:'#e05a5a',
    description:'집중력과 실행 지속력 강화',
    levels:[
      {value:'none', label:'없음', effects:{}},
      {value:'some', label:'있음', effects:{focus:4, execution:3}},
      {value:'strong', label:'강함', effects:{focus:8, execution:6, self_ctrl:5}},
    ],
  },
};

// ══════════════════════════════════════════════════════
// 4. STATE
// ══════════════════════════════════════════════════════
