'use strict';

window.STATION_DATA = [
  // 기본 연료 정거장 — 가장 자주 들르는 이동 유지 거점
  { id:'fuel-station-01', stationType:'Fuel Station', name:'연료 정거장 A', nameEn:'FUEL A', x:9200, y:5600, radius:42, color:'#2c2410', dot:'#ffd45a', supply:'fuel', supplyRadius:260, scoreVisit:120 },
  { id:'fuel-station-02', stationType:'Fuel Station', name:'연료 정거장 B', nameEn:'FUEL B', x:7200, y:6900, radius:40, color:'#2c2410', dot:'#ffd45a', supply:'fuel', supplyRadius:260, scoreVisit:120 },
  { id:'fuel-station-03', stationType:'Fuel Station', name:'연료 정거장 C', nameEn:'FUEL C', x:4600, y:7600, radius:40, color:'#2c2410', dot:'#ffd45a', supply:'fuel', supplyRadius:260, scoreVisit:120 },
  { id:'fuel-station-04', stationType:'Fuel Station', name:'연료 정거장 D', nameEn:'FUEL D', x:7600, y:3500, radius:40, color:'#2c2410', dot:'#ffd45a', supply:'fuel', supplyRadius:260, scoreVisit:120 },

  // 산소 정거장 — 생존 유지용 핵심 목적지
  { id:'oxygen-station-01', stationType:'Oxygen Station', name:'산소 정거장 A', nameEn:'O2 A', x:10100, y:6500, radius:44, color:'#102a35', dot:'#54d8ff', supply:'o2', supplyRadius:280, scoreVisit:160 },
  { id:'oxygen-station-02', stationType:'Oxygen Station', name:'산소 정거장 B', nameEn:'O2 B', x:5600, y:9100, radius:44, color:'#102a35', dot:'#54d8ff', supply:'o2', supplyRadius:280, scoreVisit:160 },
  { id:'oxygen-station-03', stationType:'Oxygen Station', name:'산소 정거장 C', nameEn:'O2 C', x:4200, y:5000, radius:44, color:'#102a35', dot:'#54d8ff', supply:'o2', supplyRadius:280, scoreVisit:160 },
  { id:'oxygen-station-04', stationType:'Oxygen Station', name:'산소 정거장 D', nameEn:'O2 D', x:8500, y:1900, radius:44, color:'#102a35', dot:'#54d8ff', supply:'o2', supplyRadius:280, scoreVisit:160 },

  // 복합 정거장 — 루트 재설계용 안정 구간
  { id:'supply-hub-01', stationType:'Supply Hub', name:'복합 보급 허브 A', nameEn:'HUB A', x:9000, y:7050, radius:56, color:'#103528', dot:'#44dd88', supply:'both', supplyRadius:340, scoreVisit:260 },
  { id:'supply-hub-02', stationType:'Supply Hub', name:'복합 보급 허브 B', nameEn:'HUB B', x:3600, y:6800, radius:56, color:'#103528', dot:'#44dd88', supply:'both', supplyRadius:340, scoreVisit:260 },
  { id:'supply-hub-03', stationType:'Supply Hub', name:'복합 보급 허브 C', nameEn:'HUB C', x:6700, y:2500, radius:56, color:'#103528', dot:'#44dd88', supply:'both', supplyRadius:340, scoreVisit:260 },

  // 고급 정거장 — 위험/원거리 보상 거점
  { id:'advanced-station-01', stationType:'Advanced Station', name:'고급 정거장 A', nameEn:'ADV A', x:2850, y:4850, radius:62, color:'#351028', dot:'#ff77aa', supply:'both', supplyRadius:420, scoreVisit:520 },
  { id:'advanced-station-02', stationType:'Advanced Station', name:'고급 정거장 B', nameEn:'ADV B', x:9100, y:850, radius:62, color:'#351028', dot:'#ff77aa', supply:'both', supplyRadius:420, scoreVisit:520 },
];
