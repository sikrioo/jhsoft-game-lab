window.Helpers = {
  clamp: (v,a,b)=>Math.max(a,Math.min(b,v)),
  lerp:  (a,b,t)=>a+(b-a)*t,
  rand:  (a,b)=>a+Math.random()*(b-a),
  randi: (a,b)=>Math.floor(a + Math.random()*(b-a+1)),
  dist2: (ax,ay,bx,by)=>{ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }
};
