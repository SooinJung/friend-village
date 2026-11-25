import { DCLogic } from '../../dc/runtime.jsx';

// Default values of this screen's design tweaks (from the canvas data-props)
export const defaults = {"timeMode": "실시간", "weather": "일기예보", "season": "자동"};
/* pixel-art finishing pass. the scene is drawn into a tiny off-screen picture, then a second pass adds
   a 1-pixel dark outline where something stands in front of something farther away, and a 1-pixel light line
   along convex creases (roof ridges, box corners, table rims). same resolution as the game, so every line is
   exactly one game pixel. sprites, particles and see-through things keep their own look and get no lines */
function pixelPost(THREE, renderer, W, H, opt) {
  opt = Object.assign({ outline: 0.5, highlight: 0.4, rel: 0.012 }, opt || {});
  var P = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
  var rtC = new THREE.WebGLRenderTarget(W, H, P); rtC.depthTexture = new THREE.DepthTexture(W, H);
  var rtN = new THREE.WebGLRenderTarget(W, H, P); rtN.depthTexture = new THREE.DepthTexture(W, H);
  var nMat = new THREE.MeshNormalMaterial();
  var mat = new THREE.ShaderMaterial({
    uniforms: { tC: { value: rtC.texture }, tD: { value: rtC.depthTexture }, tN: { value: rtN.texture }, res: { value: new THREE.Vector2(W, H) }, near: { value: 0.1 }, far: { value: 100 }, kO: { value: opt.outline }, kH: { value: opt.highlight }, rel: { value: opt.rel } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tC; uniform sampler2D tD; uniform sampler2D tN; uniform vec2 res; uniform float near; uniform float far; uniform float kO; uniform float kH; uniform float rel;',
      'varying vec2 vUv;',
      'float lin(vec2 uv){ float z = texture2D(tD, uv).r * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }',
      'vec3 nrm(vec2 uv){ return normalize(texture2D(tN, uv).rgb * 2.0 - 1.0); }',
      'void main(){',
      '  vec4 c = texture2D(tC, vUv);',
      '  if (texture2D(tD, vUv).r >= 0.9999) { gl_FragColor = c; return; }',
      '  vec2 px = 1.0 / res; float d = lin(vUv); vec3 n = nrm(vUv);',
      '  vec2 o[4]; o[0] = vec2(px.x, 0.0); o[1] = vec2(-px.x, 0.0); o[2] = vec2(0.0, px.y); o[3] = vec2(0.0, -px.y);',
      '  float dEdge = 0.0, nEdge = 0.0;',
      '  for (int i = 0; i < 4; i++) {',
      '    float dn = lin(vUv + o[i]); float diff = dn - d;',
      '    dEdge += clamp(diff / (d * rel), 0.0, 1.0);',
      '    vec3 nn = nrm(vUv + o[i]);',
      '    float conv = smoothstep(-0.01, 0.01, dot(n - nn, vec3(1.0)));',
      '    float same = step(abs(diff), d * rel * 0.6);',
      '    nEdge += (1.0 - dot(n, nn)) * conv * same;',
      '  }',
      '  float de = floor(smoothstep(0.6, 1.2, dEdge) * 2.0) / 2.0; float ne = step(0.25, nEdge);',
      '  vec3 col = c.rgb;',
      '  if (de > 0.0) col *= 1.0 - kO * de; else col = mix(col, min(col * 1.35 + 0.04, vec3(1.0)), kH * ne / 0.32);',
      '  gl_FragColor = vec4(col, c.a);',
      '}'
    ].join('\n'),
    depthTest: false, depthWrite: false
  });
  var qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); qs.add(quad);
  var hidden = [], cc = new THREE.Color();
  function draw(scene, camera) {
    mat.uniforms.near.value = camera.near; mat.uniforms.far.value = camera.far;
    renderer.setRenderTarget(rtC); renderer.render(scene, camera);
    hidden.length = 0;
    scene.traverseVisible(function (o) { if (o === scene) return; var m = o.material; if (o.isSprite || o.isPoints || o.isLine || (o.isMesh && m && (m.transparent || m.isShaderMaterial))) hidden.push(o); });
    hidden.forEach(function (o) { o.visible = false; });
    var bg = scene.background, fog = scene.fog, ca = renderer.getClearAlpha(), su = renderer.shadowMap.autoUpdate; renderer.getClearColor(cc);
    scene.background = null; scene.fog = null; scene.overrideMaterial = nMat; renderer.shadowMap.autoUpdate = false; renderer.setClearColor(0x8080ff, 1);
    renderer.setRenderTarget(rtN); renderer.render(scene, camera);
    scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; renderer.shadowMap.autoUpdate = su; renderer.setClearColor(cc, ca);
    hidden.forEach(function (o) { o.visible = true; });
    renderer.setRenderTarget(null); renderer.render(qs, qc);
  }
  draw.dispose = function () { rtC.dispose(); rtN.dispose(); rtC.depthTexture.dispose(); rtN.depthTexture.dispose(); nMat.dispose(); mat.dispose(); quad.geometry.dispose(); };
  return draw;
}

export default class VillageLogic extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { sel: 'jimin', waved: null, poked: null, ghost: false, tags: null, glFailed: false, myStatus: 'home', picker: false, now: Date.now(), tl: 6, mapOpen: false, toast: null, tapped: false, hudOn: false, villageName: '동네친구들 마을', setOpen: false, kakao: null, meName: null, myInside: false, door: null, scene: 'village', boardTab: 'notice', wGuesses: [], wDraft: '', wDone: null, phoneOpen: false, boardOpen: false, noteDraft: '', notices: null, draft: '', says: {}, myMood: null };
    this._canvas = null;
    this.setCanvas = (el) => { if (el) { this._canvas = el; if (this._mounted) this._boot(0); } };
    this.setMapCanvas = (el) => { if (el && this._world) { try { this._world.drawMap(el); } catch (e) {} } };
  }

  _toast(text) {
    var until = Date.now() + 2600;
    this.setState({ toast: { text: text, until: until } });
    clearTimeout(this._toastT); this._toastT = setTimeout(() => { if (!this._dead) this.setState({ toast: null }); }, 2700);
  }
  /* one soft cloud outline sized to its box: a few big lobes with gentle notches, drawn at half resolution so the edge steps like DS pixels */
  _cloud(w, h, seed) {
    var key = w + 'x' + h + ':' + seed; this._clouds = this._clouds || {}; if (this._clouds[key]) return this._clouds[key];
    var W = Math.round(w / 2), H = Math.round(h / 2), a = 3.5, s = (seed || 1) * 7919 % 2147483647 || 1;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    var x0 = a, x1 = W - a, y0 = a, y1 = H - a, rc = Math.min((y1 - y0) / 2, (x1 - x0) / 2, 26), pts = [];
    function piece(fn, len, amp, single) {
      if (len <= 0.5) return;
      var n = single ? 1 : Math.max(1, Math.round(len / (32 + rnd() * 12))), parts = [], tot = 0;
      for (var i = 0; i < n; i++) { var v = 0.75 + rnd() * 0.5; parts.push(v); tot += v; }
      var acc = 0;
      parts.forEach(function (pv) {
        var ll = pv / tot * len, steps = Math.max(5, Math.round(ll * 1.5));
        for (var k = 0; k < steps; k++) { var u = k / steps, p = fn(acc + ll * u), o = amp * Math.sin(Math.PI * u); pts.push([p[0] + p[2] * o, p[1] + p[3] * o]); }
        acc += ll;
      });
    }
    function corner(cx, cy, a0) { return function (t) { var an = a0 + t / rc; return [cx + Math.cos(an) * rc, cy + Math.sin(an) * rc, Math.cos(an), Math.sin(an)]; }; }
    var qa = Math.PI * rc / 2;
    piece(function (t) { return [x0 + rc + t, y0, 0, -1]; }, x1 - x0 - 2 * rc, a);
    piece(corner(x1 - rc, y0 + rc, -Math.PI / 2), qa, a * 0.7, true);
    piece(function (t) { return [x1, y0 + rc + t, 1, 0]; }, y1 - y0 - 2 * rc, a * 0.8);
    piece(corner(x1 - rc, y1 - rc, 0), qa, a * 0.7, true);
    piece(function (t) { return [x1 - rc - t, y1, 0, 1]; }, x1 - x0 - 2 * rc, a * 0.85);
    piece(corner(x0 + rc, y1 - rc, Math.PI / 2), qa, a * 0.7, true);
    piece(function (t) { return [x0, y1 - rc - t, -1, 0]; }, y1 - y0 - 2 * rc, a * 0.8);
    piece(corner(x0 + rc, y0 + rc, Math.PI), qa, a * 0.7, true);
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + 'Z';
    var out = { w: W * 2, h: H * 2, vb: '0 0 ' + W + ' ' + H, d: d };
    this._clouds[key] = out; return out;
  }

  _puzzles() { return {"여행": {"관광": 82.4, "휴가": 76.1, "여행지": 74.9, "해외여행": 73.5, "투어": 63.8, "출장": 61.2, "휴양지": 60.3, "나들이": 59.4, "배낭": 58.3, "관광지": 57.9, "숙소": 56.0, "패키지": 55.6, "비행기": 54.7, "공항": 53.9, "소풍": 52.8, "호텔": 52.2, "여권": 51.7, "제주도": 50.9, "일정": 50.5, "리조트": 49.9, "캠핑": 48.8, "기차": 47.6, "방학": 47.1, "유럽": 46.8, "가이드": 46.2, "드라이브": 45.5, "바다": 44.9, "렌터카": 43.8, "모험": 42.7, "일본": 41.9, "짐": 41.3, "추억": 40.2, "맛집": 39.7, "도쿄": 39.4, "사진": 38.9, "주말": 37.5, "지도": 36.4, "산책": 35.1, "가족": 33.6, "친구": 30.2}, "커피": {"에스프레소": 77.5, "아메리카노": 79.3, "카페": 74.6, "커피숍": 72.4, "라떼": 71.8, "원두": 70.2, "콜드브루": 66.1, "카페인": 65.9, "바리스타": 62.7, "드립": 60.4, "음료": 58.6, "홍차": 55.8, "녹차": 52.3, "코코아": 51.4, "차": 50.1, "캡슐": 49.7, "텀블러": 48.3, "우유": 47.6, "시럽": 46.9, "주스": 45.3, "설탕": 44.2, "디저트": 43.7, "머그": 41.8, "얼음": 40.5, "컵": 39.9, "케이크": 38.6, "쿠키": 37.9, "아침": 36.4, "피로": 35.2, "잠": 30.8}, "겨울": {"한겨울": 81.7, "추위": 72.5, "여름": 70.8, "한파": 69.4, "눈": 68.2, "가을": 66.3, "봄": 64.9, "영하": 63.5, "계절": 62.1, "12월": 61.4, "눈사람": 60.9, "1월": 59.7, "크리스마스": 58.4, "패딩": 57.8, "연말": 56.1, "스키": 55.2, "목도리": 54.3, "썰매": 53.6, "얼음": 52.9, "눈꽃": 51.8, "장갑": 50.7, "난로": 49.6, "군고구마": 48.9, "붕어빵": 47.3, "코트": 46.5, "감기": 45.8, "털모자": 44.4, "입김": 43.2, "방학": 42.1, "이불": 40.6}}; }
  /* today's events in Seoul: public holidays (2026), friends' birthdays */
  _events() {
    var md = '11-06', dow = 5;
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date(this.state.now));
      var o = {}; parts.forEach(function (q) { o[q.type] = q.value; });
      md = o.month + '-' + o.day; dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
    } catch (e) {}
    var HOL = { '01-01': '신정', '02-16': '설날 연휴', '02-17': '설날', '02-18': '설날 연휴', '03-01': '삼일절', '03-02': '대체공휴일', '05-01': '근로자의 날', '05-05': '어린이날', '05-24': '부처님오신날', '05-25': '대체공휴일', '06-03': '지방선거일', '06-06': '현충일', '07-17': '제헌절', '08-15': '광복절', '08-17': '대체공휴일', '09-24': '추석 연휴', '09-25': '추석', '09-26': '추석 연휴', '10-03': '개천절', '10-05': '대체공휴일', '10-09': '한글날', '12-25': '크리스마스', '12-31': '올해 마지막 날' };
    var D = this._data(), bdays = Object.keys(D.F).filter(function (id) { return D.F[id].bday === md; });
    return { md: md, dow: dow, holiday: HOL[md] || null, bdays: bdays };
  }
  /* KakaoTalk "export chat" text: room name from the first line, speakers from the message lines (PC, Android, iOS, English).
     only names and message counts are kept; the messages themselves are dropped right away */
  _parseKakao(text) {
    var lines = String(text || '').split(/\r?\n/), room = '', counts = {};
    for (var i = 0; i < lines.length && !room; i++) { var L = lines[i].replace(/^\uFEFF/, '').trim(); if (L) room = L; }
    room = room.replace(/\s*님과\s*카카오톡\s*대화.*$/, '').replace(/\s*카카오톡\s*대화.*$/, '').replace(/^Talk_.*$/, '').replace(/\s+\d+$/, '').trim();
    var RX = [/^\[([^\]]+)\] \[(?:오전|오후|AM|PM) ?\d{1,2}:\d{2}\]/, /^\d{4}년 \d{1,2}월 \d{1,2}일 (?:오전|오후) \d{1,2}:\d{2}, (.+?) : /, /^\d{4}\. ?\d{1,2}\. ?\d{1,2}\.? (?:오전|오후) \d{1,2}:\d{2}, (.+?) : /, /^[A-Za-z]+ \d{1,2}, \d{4}(?:,| at) \d{1,2}:\d{2}(?: ?[AP]M)?, (.+?) : /];
    lines.forEach(function (L) { for (var k = 0; k < RX.length; k++) { var m = L.match(RX[k]); if (m) { var nm = m[1].trim(); if (nm && nm.length <= 20) counts[nm] = (counts[nm] || 0) + 1; return; } } });
    var members = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 8).map(function (n) { return { name: n, count: counts[n] }; });
    return members.length ? { room: room, members: members } : null;
  }
  _notices() {
    if (this.state.notices) return this.state.notices;
    return [
      { id: 'jimin', text: '카페 쿠키 신메뉴 맛있음 강추', when: '오늘' },
      { id: 'haeun', text: '토요일 한강 피크닉 갈 사람~ 김밥은 내가 쌈', when: '어제' },
      { id: 'minjun', text: '시험 끝나면 다 같이 고기 먹자!!', when: '2일 전' },
      { id: 'yuna', text: '연남동 라멘집 웨이팅 없음 지금 가면 됨', when: '3일 전' }
    ];
  }
  /* Animal Crossing style iris: a dark circle closes onto a point, holds a beat, then opens again.
     the circle lives in its own node so re-renders never touch it */
  _iris(mode, cx, cy, done) {
    var host = this._irisEl, self = this; if (!host) { if (done) done(); return; }
    var el = this._irisNode;
    if (!el || el.parentNode !== host) { el = document.createElement('div'); el.style.cssText = 'position:absolute;inset:0;pointer-events:none'; host.appendChild(el); this._irisNode = el; }
    var R = 980, dur = this._reduce ? 1 : (mode === 'close' ? 520 : 600), t0 = performance.now(), col = '#1D1A26', finished = false;
    host.style.pointerEvents = 'auto'; host.style.background = 'transparent';
    cancelAnimationFrame(this._irisRaf); clearTimeout(this._irisT);
    function paint(u) {
      var e = mode === 'close' ? 1 - (1 - u) * (1 - u) : u * u;
      var r = Math.round((mode === 'close' ? (1 - e) : e) * R / 4) * 4;
      el.style.background = r <= 0 ? col : 'radial-gradient(circle at ' + cx + 'px ' + cy + 'px, transparent ' + r + 'px, ' + col + ' ' + (r + 1) + 'px)';
    }
    function finish() {
      if (finished || self._dead) return; finished = true; cancelAnimationFrame(self._irisRaf);
      paint(1);
      if (mode === 'open') { el.style.background = 'transparent'; host.style.pointerEvents = 'none'; }
      if (done) done();
    }
    function frame(now) {
      if (self._dead || finished) return;
      var u = Math.min(1, (now - t0) / dur); paint(u);
      if (u < 1) self._irisRaf = requestAnimationFrame(frame); else finish();
    }
    paint(0);
    this._irisRaf = requestAnimationFrame(frame);
    this._irisT = setTimeout(finish, dur + 300);
  }

  _walking() { this.setState({ picker: false, sel: 'me', tapped: true }); }
  /* village chat: what I say floats over my head; friends standing close by hear it and answer */
  _sayVillage(who, text, ms) {
    var says = Object.assign({}, this.state.says), until = Date.now() + (ms || 8000);
    says[who] = { text: text, until: until };
    var patch = { says: says, now: Date.now() };
    if (who === 'me') patch.myMood = text;
    this.setState(patch);
    var self = this;
    this._sayT = this._sayT || {};
    clearTimeout(this._sayT[who]);
    this._sayT[who] = setTimeout(function () { if (self._dead) return; var s2 = Object.assign({}, self.state.says); if (s2[who] && s2[who].until <= Date.now() + 50) delete s2[who]; self.setState({ says: s2, now: Date.now() }); }, (ms || 8000) + 60);
  }
  _nearbyReply(text) {
    if (!this._world) return;
    var self = this, pos = this._world.positions(), me = pos.me; if (!me || me.hidden) return;
    text = text || '';
    /* what kind of thing did I say? friends answer the kind first, in their own voice, otherwise just chat */
    var kind = /안녕|하이|ㅎㅇ|왔어|좋은 ?아침|굿모닝/.test(text) ? 'hi' : /배고|밥|먹|점심|저녁|야식|커피|아아/.test(text) ? 'food'
      : /피곤|힘들|졸려|지쳤|하기 ?싫|ㅠ|ㅜ/.test(text) ? 'tired' : /\?|뭐해|어디/.test(text) ? 'ask' : /ㅋㅋ|ㅎㅎ|웃기/.test(text) ? 'lol' : 'any';
    var R = {
      seoyeon: { hi: ['오 왔어?', '안녕~ 반가워'], food: ['나도 배고파', '같이 먹으러 갈까?'], tired: ['오늘 고생했어', '좀 쉬어 진짜로'], ask: ['나 지금 산책 중!', '음… 나도 몰라 ㅋㅋ'], lol: ['ㅋㅋㅋㅋ 뭐야', '웃기다 진짜'], any: ['나도 들었어 ㅋㅋ', '오 좋다', '그치그치', '헐 진짜?'] },
      jimin: { hi: ['어 왔어? 나 마감 중', '하이~'], food: ['아아 마시고 싶다', '마감 끝나면 맛있는 거 먹을 거야'], tired: ['나도… 우리 힘내자', '같이 버티자 ㅠ'], ask: ['나 카페에서 일하는 중!', '지금 파일 정리 중'], lol: ['ㅋㅋㅋ 인정', 'ㅋㅋㅋㅋ 미쳤다'], any: ['ㅋㅋㅋ 인정', '나 여기 있어!', '오 그거 좋다', '맞아맞아'] },
      minjun: { hi: ['반가워!', '오 안녕'], food: ['나 편의점 갈 건데 뭐 사다 줄까', '학식 말고 다른 거 먹고 싶다'], tired: ['시험 끝나면 다 같이 놀자', '나도 과제 때문에 죽겠음'], ask: ['과제 하는 중 ㅠ', '도서관 가는 길'], lol: ['ㅋㅋㅋㅋ', 'ㅋㅋ 뭐야 그게'], any: ['ㅇㅈ', '반가워!', '오 ㄹㅇ?', '그거 좋네'] },
      haeun: { hi: ['안녕안녕!', '왔구나~'], food: ['러닝하고 먹으면 더 맛있어!', '나 떡볶이 땡겨'], tired: ['스트레칭 한 번 해 봐!', '오늘은 푹 자자'], ask: ['방금 러닝 끝!', '나 공원이야~'], lol: ['ㅋㅋㅋㅋㅋ', '아 웃겨 ㅋㅋ'], any: ['같이 놀자!', '헐 나도', '좋아좋아!', '오 대박'] },
      yuna: { hi: ['오 하이', '반가워~'], food: ['배고프다…', '뭐 먹을지 골라 줘'], tired: ['토닥토닥', '오늘은 일찍 자'], ask: ['집에서 뒹굴뒹굴 중', '음… 비밀'], lol: ['ㅋㅋㅋㅋ', 'ㅋㅋ 귀여워'], any: ['ㅋㅋㅋㅋ', '오 진짜?', '좋네', '그러게'] },
      taeo: { hi: ['오 왔어?', '굿모닝!'], food: ['점심 뭐 먹을지 투표하자', '나 김밥 먹는 중'], tired: ['퇴근까지 조금만 버티자', '나도 메일 지옥…'], ask: ['버스 기다리는 중', '회사 가는 길!'], lol: ['ㅋㅋ 굿', 'ㅋㅋㅋ 뭐임'], any: ['버스 오면 갈게', 'ㅋㅋ 굿', '오 괜찮다', 'ㅇㅈㅇㅈ'] }
    };
    this._lastRep = this._lastRep || {};
    var near = Object.keys(R).filter(function (id) { var q = pos[id]; return q && !q.hidden && Math.hypot(q.x - me.x, q.z - me.z) < 3.4; }).slice(0, 2);
    near.forEach(function (id, i) {
      var opts = (R[id][kind] || []).concat(kind === 'any' ? [] : R[id].any.slice(0, 1)).filter(function (t) { return t !== self._lastRep[id]; });
      var line = opts[Math.floor(Math.random() * opts.length)]; self._lastRep[id] = line;
      setTimeout(function () { if (!self._dead) self._sayVillage(id, line, 6000); }, 1300 + i * 1100);
    });
    return near.length;
  }
  _walkingTo(id) { this.setState({ picker: false, tapped: true }); this._goingTo = id; }
  _arrived(zone) {
    var D = this._data(), s = D.S[zone];
    this.setState({ myStatus: zone });
  }

  _data() {
    if (this._d) return this._d;
    var F = {
      me: { name: '나', skin: '#F6D7B8', hair: '#3B2A20', style: 'short', shirt: '#E07B62', house: [-2.4, -9.7], roof: '#E07B62',
        rows: ['hhhhhhhhhhhh','hhh.hhhh.hhh','............','..kk....kk..','............','...k....k...','...k....k...','.pp......pp.','............','....k..k....','.....kk.....','............'] },
      seoyeon: { name: '서연', bday: '09-09', skin: '#FBE3CC', hair: '#1E1A1A', style: 'long', shirt: '#9FC4E8', house: [-5.2, -11.7], roof: '#6E9ED6',
        rows: ['hhhhhhhhhhhh','hhhhh..hhhhh','hhh......hhh','hh........hh','h..kk..kk..h','h..k....k..h','h.k.k..k.k.h','hpp......pph','h..........h','h...k.k.k..h','h....k.k...h','hh........hh'] },
      jimin: { name: '지민', bday: '03-14', skin: '#F3D0AE', hair: '#C9772E', style: 'short', shirt: '#4A6FA5', house: [-6.2, -1.9], roof: '#F2C14E',
        rows: ['hhhhhhhhhhhh','h.hh.hh.hh.h','............','.k........k.','..kk....kk..','..kk....kk..','..kk....kk..','..........b.','..........b.','....kkkk....','............','............'] },
      minjun: { name: '민준', bday: '07-02', skin: '#F3D0AE', hair: '#2B2B2B', style: 'short', shirt: '#4A6FA5', pattern: 'stripe', house: [0.1, -6.1], roof: '#C98BB9',
        rows: ['hhhhhhhhhhhh','hhhhhhhhhhhh','hh........hh','............','.kkkk..kkkk.','.k..kkkk..k.','.kk.k..kk.k.','.kkkk..kkkk.','............','............','....kkk.....','............'] },
      haeun: { name: '하은', bday: '11-06', skin: '#F6D7B8', hair: '#2A2A2A', style: 'short', shirt: '#F2C14E', pattern: 'dots', house: [-6.3, -5.7], roof: '#7FB069',
        rows: ['hhhhhhhhhhhh','hhhhhh......','hhh.........','..kk....kk..','............','...k....k...','...k....k...','.pp......pp.','....kkkk....','....krrk....','.....kk.....','............'] },
      yuna: { name: '유나', bday: '12-24', skin: '#FBE3CC', hair: '#7A4FA8', style: 'long', shirt: '#F28C82', pattern: 'check', house: [6.4, -12.8], roof: '#9B7BD1',
        rows: ['hhhhhhhhhhhh','hhhh....hhhh','hh........hh','h..kk..kk..h','h..........h','h..k.......h','h..k...kkk.h','hpp......pph','h..........h','h...kkkk...h','h.....rr...h','hh........hh'] },
      taeo: { name: '태오', bday: '05-30', skin: '#FFF8EC', hair: '#FFF8EC', style: 'none', shirt: '#7FB069', house: [6.3, -3.4], roof: '#E0784E',
        rows: ['..k.....k.k.','.k.k...k.k.k','............','.kkk...kkk..','.k.k...k.k..','.kkk...kkk..','.....k......','....kkk.....','.....kk.....','............','.....k......','....k.k.....'] },
      doyun: { name: '도윤', bday: '01-20', skin: '#E9C29C', hair: '#4A4A55', style: 'short', shirt: '#3E4A5E', house: [-1.4, -12.2], roof: '#8A90A0',
        rows: ['hhhhhhhhhhhh','hhhhhhhhhhhh','h..........h','..kkk..kkk..','............','..kk....kk..','............','..k.k..k.k..','............','............','.....kk.....','....k..k....'] }
    };
    var TINT = {
      me: ['#F6C7DA', '#F8D9E2', '#F3CBD7'], seoyeon: ['#BFDDF5', '#D6EAF8', '#C8E1F4'], jimin: ['#F8C9A0', '#F7D3B0', '#F3C79F'],
      minjun: ['#CDE8B0', '#DDEFC8', '#D1E8B7'], haeun: ['#F7E2A0', '#F8E8B4', '#F4DF9E'], yuna: ['#DCCCF4', '#E9DDF8', '#DFD0F4'],
      taeo: ['#F9C9B6', '#F9DCCB', '#F5CFBA'], doyun: ['#DCDAE6', '#E4E2EC', '#D9D6E4']
    };
    Object.keys(TINT).forEach(function (k) { F[k].tint = TINT[k][0]; F[k].stripe = [TINT[k][1], TINT[k][2]]; });
    var S = {
      home: { label: '집', where: '내 집', place: '집에 있어요', past: '집에 있었어요', chipBg: '#F7D6C7' },
      commute: { label: '출근 중', where: '정류장', place: '출근하는 중이에요', past: '출근하던 중이었어요', chipBg: '#F7E3A6' },
      work: { label: '회사', where: '마을 회사', place: '마을 회사에서 일하는 중', past: '회사에 있었어요', chipBg: '#D9E3F2' },
      cafe: { label: '카페', where: '카페', place: '카페에 있어요', past: '카페에 있었어요', chipBg: '#E9D3A6' },
      food: { label: '밥', where: '식당', place: '밥 먹는 중이에요', past: '밥 먹고 있었어요', chipBg: '#F6C9C0' },
      play: { label: '놀기', where: '광장', place: '광장에서 놀고 있어요', past: '광장에서 놀고 있었어요', chipBg: '#CDEBC2' },
      walk: { label: '산책', where: '마을 어딘가', place: '마을을 산책하고 있어요', past: '산책하고 있었어요', chipBg: '#E3F0D6' }
    };
    var people = [
      { id: 'me', status: 'home', ago: 0, mood: '퇴근하고 뒹굴뒹굴', area: '자양동' },
      { id: 'seoyeon', status: 'home', ago: 540, mood: '드라마 정주행 중', area: '망원동' },
      { id: 'jimin', status: 'cafe', slot: 0, ago: 40, mood: '마감 전 아아 수혈 중', area: '성수동' },
      { id: 'minjun', status: 'cafe', slot: 1, ago: 120, mood: '시험 D-3, 카페에서 공부', area: '신촌' },
      { id: 'haeun', status: 'play', slot: 0, ago: 20, mood: '한강 러닝 끝! 놀 사람?', area: '잠실' },
      { id: 'yuna', status: 'food', slot: 0, ago: 200, mood: '라멘 곱빼기 클리어', area: '연남동' },
      { id: 'taeo', status: 'commute', slot: 0, ago: 5, mood: '버스 놓침… 다음 거 5분 뒤', area: '강남' },
      { id: 'doyun', status: 'work', ago: 180, mood: '오늘도 야근 확정', area: '판교' }
    ];
    var t0 = Date.now(); people.forEach(function (p) { p.at = t0 - p.ago * 60000; });
    var SLOTS = {
      cafe: [[2.9, -9.85], [4.3, -9.85], [3.6, -9.3]],
      food: [[5.0, -5.75], [6.0, -5.75], [5.5, -5.15]],
      play: [[-0.15, -0.35], [2.05, -0.35], [0.45, 0.1], [1.5, 0.1]],
      commute: [[4.1, 0.3], [4.9, 0.35], [3.75, 0.5]]
    };
    /* my face as last drawn on this device (village, or the separate face screen) */
    try { var sv = JSON.parse(window.localStorage.getItem('village.me.face.v1') || 'null'); if (sv && sv.rows && [12, 24, 32].indexOf(sv.rows.length) >= 0) { ['rows', 'skin', 'hair', 'shirt', 'pattern', 'name', 'ink'].forEach(function (k) { if (sv[k] != null) F.me[k] = sv[k]; }); F.me.photo = !!sv.photo; } } catch (e) {}
    this._d = { F: F, S: S, people: people, SLOTS: SLOTS };
    try { var raw = window.localStorage.getItem('village.room.v1'); if (raw) this._applyRoom(JSON.parse(raw)); } catch (e) {}
    return this._d;
  }

  /* first days, no tutorial and no guide character: one small sparkle at a time on the next thing worth finding.
     order: tap a friend -> open the phone -> "어디로 가기" -> the bulletin board. each disappears once it has been used */
  _cues() {
    if (!this._cueS) { var c = null; try { c = JSON.parse(window.localStorage.getItem('village.cues.v1') || 'null'); } catch (e) {} this._cueS = c || { first: Date.now() }; this._saveCues(); }
    return this._cueS;
  }
  _saveCues() { try { window.localStorage.setItem('village.cues.v1', JSON.stringify(this._cueS)); } catch (e) {} }
  _cueDone(k) { var c = this._cues(); if (c[k]) return; c[k] = Date.now(); this._saveCues(); this.setState({ now: Date.now() }); }
  _cueNow() {
    var c = this._cues(); if (Date.now() - c.first > 3 * 86400000) return '';
    var order = ['friend', 'phone', 'go', 'board']; for (var i = 0; i < order.length; i++) if (!c[order[i]]) return order[i];
    return '';
  }

  /* a manual status gets old: past its limit an outing is shown faded at that place (we no longer know if they are still there)
     and an old "home" means they dozed off. the time label is always computed from when it was set */
  _fresh(p, now) {
    var LIMIT = { home: 480, work: 720, cafe: 180, food: 120, play: 180, commute: 90, walk: 120 };
    var min = Math.max(0, Math.floor(((now || Date.now()) - (p.at || Date.now())) / 60000)), old = p.id !== 'me' && min > (LIMIT[p.status] || 180);
    function dur(m) { return m < 1 ? '방금' : m < 60 ? m + '분' : Math.floor(m / 60) + '시간'; }
    var sleepy = old && p.status === 'home', faded = old && p.status !== 'home' && p.status !== 'work';
    var since = p.id === 'me' ? '방금' : min < 1 ? '방금' : sleepy ? dur(min) + '째 그대로 · 졸고 있어요' : faded ? dur(min) + ' 전' : dur(min) + '째';
    return { min: min, sleepy: sleepy, faded: faded, since: since };
  }

  /* the village plan is drawn once per chat room: the room and its members seed the lottery,
     so the same room always gets the same village and nothing in the app can redraw it */
  _applyRoom(rec) {
    var D = this._data(), slots = ['jimin', 'minjun', 'haeun', 'yuna', 'taeo', 'seoyeon', 'doyun'];
    slots.forEach(function (id, i) { if (rec.others[i]) { if (D.F[id]) D.F[id].name = rec.others[i]; } else delete D.F[id]; });
    D.F.me.name = '나';
    D.people = D.people.filter(function (p) { return !!D.F[p.id]; });
    D.L = null;
    this._seedKey = (rec.room || '') + '|' + [rec.me].concat(rec.others).sort().join(',');
    this._roomInfo = (rec.room || '카톡방') + ' · ' + (rec.others.length + 1) + '명';
  }

  _rebuild() {
    if (this._raf) cancelAnimationFrame(this._raf); this._raf = null;
    var w = this._world; this._world = null; this._liveTags = null;
    if (w && w.renderer.domElement && w.renderer.domElement.isConnected) this._canvas = w.renderer.domElement;
    if (w) { try {
      if (w.scene) w.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); });
      if (w.renderer.__post) w.renderer.__post.dispose(); w.renderer.dispose();
    } catch (e) {} }
    this._started = false;
    this._boot(0);
  }

  _village() {
    var D = this._data(); if (D.L) return D.L;
    var ids = Object.keys(D.F);
    var key = this._seedKey || ('동네친구들|' + ids.map(function (id) { return D.F[id].name; }).sort().join(','));
    var h = 2166136261; for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    var st = h >>> 0;
    function rnd() { st = (st + 0x6D2B79F5) >>> 0; var t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    /* big lots can hold any building; bd = where the notice board stands next to a town hall; F has no room for a terrace */
    var BIG = { A: { x: 3.6, z: -11.2, bd: [2.1, 0.5] }, B: { x: 5.5, z: -7.0 }, C: { x: -6.5, z: 1.0 }, D: { x: 3.9, z: -14.4, bd: [2.1, 0.5] },
      F: { x: -6.3, z: -6.0, bd: [2.0, -0.3], noShop: true }, T: { x: 6.3, z: -3.4, bd: [-2.0, 0.2] } };
    var free = ['A', 'B', 'C', 'D', 'F', 'T'];
    function take(ok) { var c = free.filter(ok); var k = c[Math.floor(rnd() * c.length)]; free.splice(free.indexOf(k), 1); return k; }
    var hk = take(function (k) { return !!BIG[k].bd; }), ok = take(function () { return true; });
    var ck = take(function (k) { return !BIG[k].noShop; }), dk = take(function (k) { return !BIG[k].noShop; });
    var lots = free.map(function (k) { return [BIG[k].x, BIG[k].z]; }).concat([[-2.4, -9.7], [-5.2, -11.7], [-1.4, -12.2], [-6.2, -1.9], [0.1, -6.1], [6.4, -12.8]]);
    for (var n = lots.length - 1; n > 0; n--) { var m = Math.floor(rnd() * (n + 1)), tmp = lots[n]; lots[n] = lots[m]; lots[m] = tmp; }
    ids.forEach(function (id, q) { D.F[id].house = lots[q]; });
    var hall = BIG[hk], cafe = BIG[ck], diner = BIG[dk];
    D.SLOTS.cafe = [[cafe.x - 0.7, cafe.z + 1.35], [cafe.x + 0.7, cafe.z + 1.35], [cafe.x, cafe.z + 1.9]];
    D.SLOTS.food = [[diner.x - 0.5, diner.z + 1.25], [diner.x + 0.5, diner.z + 1.25], [diner.x, diner.z + 1.85]];
    D.L = { cafe: cafe, diner: diner, office: BIG[ok], hall: hall, board: { x: hall.x + hall.bd[0], z: hall.z + hall.bd[1] },
      empty: lots.slice(ids.length),
      paths: [[2.6, 4.6, -10.6, -9.0], [4.5, 6.5, -6.4, -4.9], [-6.0, -1.7, -5.35, -4.85], [3.4, 6.9, -2.55, -1.95]] };
    return D.L;
  }

  _seoul() {
    var hh = 12, mm = 0, dl = '11월 6일 (금)';
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(this.state.now));
      hh = parseInt(p.slice(0, 2), 10) % 24; mm = parseInt(p.slice(3, 5), 10);
      dl = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(this.state.now));
    } catch (e) {}
    return { h: hh + mm / 60, hh: hh, mm: mm, dateLabel: dl };
  }
  _hour(live) {
    var m = this.props.timeMode ?? '실시간';
    if (m === '아침') return 7.0;
    if (m === '낮') return 12.5;
    if (m === '노을') return 18.0;
    if (m === '밤') return 22.5;
    if (m === '타임랩스') return live != null ? live : this.state.tl;
    return this._canon(this._seoul().h);
  }

  /* real sunrise / sunset for Seoul today (NOAA approximation, within a minute or two),
     so the sky's dawn and dusk land on the real times in every season, not on fixed clock hours */
  _sunTimes() {
    var now = new Date(Date.now() + 9 * 3600 * 1000), y = now.getUTCFullYear();
    var N = Math.floor((Date.UTC(y, now.getUTCMonth(), now.getUTCDate()) - Date.UTC(y, 0, 1)) / 86400000) + 1;
    if (this._sunN === N && this._sunT) return this._sunT;
    var g = 2 * Math.PI / 365 * (N - 1), lat = 37.5665 * Math.PI / 180, lon = 126.978;
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var d = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var ha = Math.acos(Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat) * Math.cos(d)) - Math.tan(lat) * Math.tan(d)) * 180 / Math.PI;
    this._sunN = N; this._sunT = { sr: (720 - 4 * (lon + ha) - eq + 540) / 60, ss: (720 - 4 * (lon - ha) - eq + 540) / 60 };
    return this._sunT;
  }
  /* the sky is drawn on a reference day (dawn 6.4, dusk 17.9); real time is mapped onto it piece by piece */
  _canon(h) {
    var st = this._sunTimes(), P = [[0, 0], [st.sr - 1.6, 4.8], [st.sr, 6.4], [st.sr + 2.2, 8.6], [st.ss - 1.7, 16.2], [st.ss + 0.25, 17.9], [st.ss + 1.6, 19.4], [24, 24]];
    for (var i = 0; i < P.length - 1; i++) if (h <= P[i + 1][0]) { var a = P[i], b = P[i + 1]; return a[1] + (b[1] - a[1]) * (h - a[0]) / ((b[0] - a[0]) || 1); }
    return h;
  }
  _season() {
    var m = this.props.season ?? '자동';
    var map = { '봄': 'spring', '여름': 'summer', '가을': 'autumn', '겨울': 'winter' };
    if (map[m]) return map[m];
    var mo = 11;
    try { mo = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(new Date()), 10); } catch (e) {}
    return mo >= 3 && mo <= 5 ? 'spring' : mo >= 6 && mo <= 8 ? 'summer' : mo >= 9 && mo <= 11 ? 'autumn' : 'winter';
  }
  _weather() {
    var w = this.props.weather ?? '일기예보';
    var FORECAST = { kind: 'clear', wind: 1, clouds: 5, label: '맑음 9° · 바람 강함' };
    if (w !== '랜덤') return FORECAST;
    var day = this._seoul().dateLabel || '', hsum = 0;
    for (var i = 0; i < day.length; i++) hsum = (hsum * 31 + day.charCodeAt(i)) % 9973;
    var winter = this._season() === 'winter';
    var POOL = [FORECAST, { kind: 'clear', wind: 0.15, clouds: 4, label: '맑음 · 바람 잔잔' }, { kind: 'clear', wind: 0.5, clouds: 7, label: '맑음 · 산들바람' }, { kind: 'cloudy', wind: 0.3, clouds: 12, label: '흐림' }, { kind: 'rain', wind: 0.4, clouds: 14, label: '비' }];
    if (winter) POOL.push({ kind: 'snow', wind: 0.2, clouds: 12, label: '눈' });
    return POOL[hsum % POOL.length];
  }

  _applyFace(face) {
    if (!face || !face.rows) return;
    var f = this._data().F.me; f.rows = face.rows; f.skin = face.skin; f.hair = face.hair; f.shirt = face.shirt; f.pattern = face.pattern; f.name = face.name || '나'; f.ink = face.ink; f.photo = !!face.photo;
    try { window.localStorage.setItem('village.me.face.v1', JSON.stringify(face)); } catch (e) {}
    if (this._world) this._world.restyleMe(f);
    this.setState({ now: Date.now() });
  }
  componentDidMount() {
    var self0 = this;
    /* a face finished on the separate face screen shows up here right away */
    this._onStore = function (e) { if (e.key !== 'village.me.face.v1' || !e.newValue) return; try { self0._applyFace(JSON.parse(e.newValue)); } catch (x) {} };
    try { window.addEventListener('storage', this._onStore); } catch (e) {} this._lastActive = performance.now(); try { var vn = window.localStorage.getItem('village.name.v1'); if (vn) this.setState({ villageName: vn }); } catch (e) {} if (this._irisEl) this._irisEl.style.background = '#1D1A26'; this._mounted = true; try { this._reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {} var self0 = this; setTimeout(function () { var m = self0._world ? self0._world.meScreen() : { x: 195, y: 392 }; self0._iris('open', m.x, m.y); }, 450); this._boot(0); this._clock = setInterval(() => this.setState({ now: Date.now() }), 20000); }
  componentWillUnmount() { try { window.removeEventListener('storage', this._onStore); } catch (e) {} this._dead = true; clearInterval(this._clock); clearTimeout(this._toastT); if (this._sayT) for (var k in this._sayT) clearTimeout(this._sayT[k]); if (this._raf) cancelAnimationFrame(this._raf); if (this._world && this._world.renderer) this._world.renderer.dispose(); }
  componentDidUpdate() { if (this._world) this._applyGhost(); }

  _boot(n) {
    if (this._started || this._dead) return;
    if (!this._canvas) { try { var list = document.querySelectorAll('canvas[data-village]'); if (list.length) this._canvas = list[list.length - 1]; } catch (e) {} }
    if (!this._canvas || !window.THREE) { if (n < 40) setTimeout(() => this._boot(n + 1), 100); else this.setState({ glFailed: true }); return; }
    this._started = true;
    try { this._build(); } catch (e) { this.setState({ glFailed: true }); }
  }

  _build() {
    var THREE = window.THREE, self = this, R = 30, D = this._data(), L = this._village();
    var renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: false });
    renderer.resetState(); renderer.setPixelRatio(1); renderer.setSize(195, 422, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap;
    var post = renderer.__post = pixelPost(THREE, renderer, 195, 422, { highlight: 0.32 });
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(41, 195 / 422, 0.1, 160);
    /* Animal Crossing camera: the view angle never changes, the island rolls under it as I walk.
       the camera, the sky dome and the clouds sit on a rig that turns around the log's axis */
    var CY0 = 12, CZ0 = 10.4;
    var rig = new THREE.Group(), rigIn = new THREE.Group(); rig.position.set(0, -R, 0); rigIn.position.set(0, R, 0); rig.add(rigIn); scene.add(rig);
    rigIn.add(camera); camera.position.set(0, CY0, CZ0); camera.lookAt(0, 0.4, -1.9);
    var camX = 0, camZ = 0, camInit = false;
    function aimRig(x, z) { rig.position.x = x; rig.rotation.x = z / R; }

    function bend(g) {
      var p = g.attributes.position;
      for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = z / R, r = R + y; p.setXYZ(i, x, r * Math.cos(th) - R, r * Math.sin(th)); }
      p.needsUpdate = true; g.computeVertexNormals(); return g;
    }
    function place(o, x, y, z) { var th = z / R, r = R + y; o.position.set(x, r * Math.cos(th) - R, r * Math.sin(th)); o.rotation.x = th; return o; }
    function put(o, x, y, z) { place(o, x, y, z); scene.add(o); return o; }
    function mat(hex, extra) { var o = { color: new THREE.Color(hex), flatShading: true }; if (extra) for (var k in extra) o[k] = extra[k]; return new THREE.MeshLambertMaterial(o); }
    function bx(w, h, d, m, x, y, z) { var me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); return me; }
    function cyl(rt, rb, h, seg, m, x, y, z) { var me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); return me; }
    function shade(o) { o.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
    function canvasTex(w, h) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
      return { c: c, ctx: c.getContext('2d'), t: t };
    }
    function hsh(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
    function vnoise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hsh(xi, yi), b = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function hex3(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

    /* ---------- terrain shape: rivers widen into estuaries where they meet the sea ---------- */
    /* the river is a soft curve (rounded bends) whose banks wobble a little, like a hand-drawn island */
    var RIV = (function () {
      var pts = [], rad = 1.3;
      function line(x0, z0, x1, z1, n) { for (var i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); }
      function arc(cx, cz, a0, a1, n) { for (var i = 1; i < n; i++) { var a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * rad, cz + Math.sin(a) * rad]); } }
      line(1.6, -19.5, 1.6, -3.9 - rad, 6);
      arc(1.6 - rad, -3.9 - rad, 0, Math.PI / 2, 8);
      line(1.6 - rad, -3.9, -3.6 + rad, -3.9, 4);
      arc(-3.6 + rad, -3.9 + rad, -Math.PI / 2, -Math.PI, 8);
      line(-3.6, -3.9 + rad, -3.6, 5.5, 6);
      return pts;
    })();
    function riverDist(x, z) {
      var best = 1e9;
      for (var i = 0; i < RIV.length - 1; i++) {
        var ax = RIV[i][0], az = RIV[i][1], bx2 = RIV[i + 1][0], bz = RIV[i + 1][1], dx = bx2 - ax, dz = bz - az;
        var t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-9)));
        var ex = x - ax - dx * t, ez = z - az - dz * t, d = ex * ex + ez * ez;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    }
    function inRiver(x, z) {
      var flare = (x < 0 && z > 1.9) ? (z - 1.9) * 0.95 : (z < -15.6 ? (-15.6 - z) * 0.95 : 0);
      var wob = (vnoise(x * 1.9 + 3, z * 1.9) - 0.5) * 0.32 + (vnoise(x * 4.3, z * 4.3 + 7) - 0.5) * 0.1;
      return riverDist(x, z) <= 0.6 + flare + wob;
    }
    /* the island is a rounded shape with a gently wavy coast instead of a box */
    function islandSd(x, z) {
      var r = 2.6, qx = Math.abs(x + 0.05) - (8.45 - r), qz = Math.abs(z + 6.95) - (10.55 - r);
      var sd = Math.sqrt(Math.max(qx, 0) * Math.max(qx, 0) + Math.max(qz, 0) * Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
      return sd + (vnoise(x * 0.8 + 11, z * 0.8) - 0.5) * 0.9 + (vnoise(x * 2.2, z * 2.2 + 5) - 0.5) * 0.28;
    }
    function isSea(x, z) { return islandSd(x, z) > 0; }
    function inPathRaw(x, z) {
      return (x >= -1.7 && x <= -0.7 && z >= -5.4 && z <= 1.1) || (z >= 1.1 && z <= 2.1 && x >= -7.8 && x <= 7.7) ||
             (x >= 2.6 && x <= 3.4 && z >= -9.5 && z <= 2.7) || (z >= -9.5 && z <= -8.5 && x >= -0.5 && x <= 2.6) ||
             (z >= -1.4 && z <= -0.8 && ((x >= -0.7 && x <= -0.3) || (x >= 2.2 && x <= 2.6))) || (x >= 0.6 && x <= 1.3 && z >= 0.1 && z <= 1.1) ||
             (x >= 3.4 && x <= 5.4 && z >= -1.0 && z <= 0.8) || L.paths.some(function (p) { return x >= p[0] && x <= p[1] && z >= p[2] && z <= p[3]; });
    }
    function inPath(x, z) { return inPathRaw(x + (vnoise(x * 3.1, z * 3.1) - 0.5) * 0.2, z + (vnoise(z * 3.3 + 9, x * 3.3) - 0.5) * 0.2); }
    function isBeach(x, z) { return islandSd(x, z) > -0.8 + (vnoise(x * 1.7 + 4, z * 1.7) - 0.5) * 0.3; }

    /* ---------- signed-distance field for the water shader (8 texels / unit) ---------- */
    var SW = 160, SH = 208, SN = SW * SH;
    var wat = new Uint8Array(SN), riv = new Uint8Array(SN);
    for (var r0 = 0; r0 < SH; r0++) for (var c0 = 0; c0 < SW; c0++) {
      var x0 = -10 + (c0 + 0.5) / 8, z0 = 6 - (r0 + 0.5) / 8, k0 = r0 * SW + c0;
      var sea0 = isSea(x0, z0), rv0 = !sea0 && inRiver(x0, z0);
      wat[k0] = (sea0 || rv0) ? 1 : 0; riv[k0] = rv0 ? 1 : 0;
    }
    function chamfer(W, H, isSrc) {
      var N = W * H, d = new Float32Array(N), x, y, i, v;
      for (i = 0; i < N; i++) d[i] = isSrc(i) ? 0 : 1e9;
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) { i = y * W + x; v = d[i];
        if (x > 0) v = Math.min(v, d[i - 1] + 1);
        if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.41); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.41); }
        d[i] = v; }
      for (y = H - 1; y >= 0; y--) for (x = W - 1; x >= 0; x--) { i = y * W + x; v = d[i];
        if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
        if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.41); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.41); }
        d[i] = v; }
      return d;
    }
    var dIn = chamfer(SW, SH, function (i) { return !wat[i]; });
    var dOut = chamfer(SW, SH, function (i) { return !!wat[i]; });
    var dRiv = chamfer(SW, SH, function (i) { return !!riv[i]; });
    var dSeaO = chamfer(SW, SH, function (i) { return wat[i] && !riv[i]; });
    var sdData = new Uint8Array(SN * 4), sdArr = new Float32Array(SN);
    for (var q = 0; q < SN; q++) {
      var sd = wat[q] ? (dIn[q] - 0.5) / 8 : -(dOut[q] - 0.5) / 8;
      sdArr[q] = sd;
      var rw = wat[q] ? (riv[q] ? Math.min(1, (dSeaO[q] / 8) / 1.8) : 0) : (dSeaO[q] / (dSeaO[q] + dRiv[q] + 0.001));
      sdData[q * 4] = Math.round(Math.max(0, Math.min(1, (sd + 2) / 8)) * 255);
      sdData[q * 4 + 1] = Math.round(rw * 255);
      sdData[q * 4 + 2] = 0; sdData[q * 4 + 3] = 255;
    }
    var sdfTex = new THREE.DataTexture(sdData, SW, SH, THREE.RGBAFormat);
    sdfTex.magFilter = THREE.LinearFilter; sdfTex.minFilter = THREE.LinearFilter; sdfTex.needsUpdate = true;
    function sdAt(x, z) { var c = Math.max(0, Math.min(SW - 1, Math.floor((x + 10) * 8))), r = Math.max(0, Math.min(SH - 1, Math.floor((6 - z) * 8))); return sdArr[r * SW + c]; }

    /* ---------- ground: 8 texels per unit, painted like an Animal Crossing lawn ---------- */
    var GC = {
      g1: hex3('#97C85A'), g2: hex3('#A4D165'), tuft: hex3('#7DB04A'), clover: hex3('#F6F1DE'), leaf: hex3('#E39B3A'), leaf2: hex3('#D46A3A'),
      p1: hex3('#D9BA86'), p2: hex3('#CBA974'), p3: hex3('#E6CC9C'), peb: hex3('#B69564'),
      s1: hex3('#F3E5BA'), s2: hex3('#ECDBA8'), s3: hex3('#DCC793'),
      bed1: hex3('#EBDDAA'), bed2: hex3('#D7C998'), bed3: hex3('#BDB088'),
      br1: hex3('#E4DCCB'), br2: hex3('#DDD4C1'), mortar: hex3('#CEC3AD'), rim: hex3('#B3A68C'), rim2: hex3('#C9BDA4')
    };
    /* seasonal ground palette: Seoul's month picks it unless a season is chosen in Tweaks */
    var SEASON_PAL = {
      spring: { g1: '#9CD067', g2: '#AEDB74', tuft: '#80B851', clover: '#FFFFFF', leaf: '#F7C6D9', leaf2: '#F4A9C8', lr: 0.016 },
      summer: { g1: '#7CC24F', g2: '#8FD05C', tuft: '#63A63E', clover: '#FFFFFF', leaf: '#F2D04A', leaf2: '#6CB848', lr: 0.006 },
      autumn: { g1: '#A9C45A', g2: '#B7CF67', tuft: '#8DA747', clover: '#F6F1DE', leaf: '#E39B3A', leaf2: '#C9503A', lr: 0.032 },
      winter: { g1: '#EEF3F6', g2: '#E2EAEF', tuft: '#C8D5DC', clover: '#FFFFFF', leaf: '#AFC09A', leaf2: '#D3DFE5', lr: 0.024 }
    };
    function setSeasonPalette(s) { var sp = SEASON_PAL[s]; ['g1', 'g2', 'tuft', 'clover', 'leaf', 'leaf2'].forEach(function (k) { GC[k] = hex3(sp[k]); }); GC.lr = sp.lr; }
    var curSeason = self._season(); setSeasonPalette(curSeason);
    function grassAt(wx, wz, gx, gy) {
      var n = vnoise(wx * 0.7, wz * 0.7) + (((gx + gy) & 1) ? 0.04 : -0.04);
      var col = n > 0.56 ? GC.g2 : GC.g1;
      var bxk = gx >> 2, byk = gy >> 2, h = hsh(bxk + 11, byk + 7);
      if (h > 0.42) {
        var ox = Math.floor(h * 13) % 2, oy = Math.floor(h * 29) % 2, lx = gx & 3, ly = gy & 3;
        if ((ly === oy && (lx === ox || lx === ox + 2)) || (ly === oy + 1 && lx === ox + 1)) col = GC.tuft;
      }
      var s = hsh(gx * 1.3, gy * 0.7);
      if (s > 0.994) col = GC.clover; else if (s > 0.994 - GC.lr * 0.6) col = GC.leaf; else if (s > 0.994 - GC.lr) col = GC.leaf2;
      return col;
    }
    function pathAt(wx, wz, gx, gy) {
      var n = vnoise(wx * 4, wz * 4), col = n > 0.64 ? GC.p3 : n < 0.3 ? GC.p2 : GC.p1;
      if (hsh(gx + 5, gy + 3) > 0.965) col = GC.peb;
      return col;
    }
    var GW = 320, GH = 416, ground = canvasTex(GW, GH), gImg = ground.ctx.createImageData(GW, GH), gd = gImg.data;
    function paintGround() {
    for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) {
      var wx = -10 + (gx + 0.5) / 16, wz = -20 + (gy + 0.5) / 16, gi = (gy * GW + gx) * 4, col;
      var pd = Math.sqrt((wx - 0.95) * (wx - 0.95) + (wz + 1.1) * (wz + 1.1));
      if (isSea(wx, wz) || inRiver(wx, wz)) { var sdv = sdAt(wx, wz); col = sdv < 0.6 ? GC.bed1 : sdv < 2 ? GC.bed2 : GC.bed3; }
      else if (isBeach(wx, wz)) { var ns = vnoise(wx * 5, wz * 5); col = ns > 0.66 ? GC.s2 : GC.s1; if (hsh(gx + 2, gy + 9) > 0.975) col = GC.s3; }
      else if (pd <= 1.32) {
        if (pd > 1.2) col = pd > 1.27 ? GC.rim : GC.rim2;
        else {
          var ring = Math.floor(pd / 0.4), an = (Math.atan2(wz + 1.1, wx - 0.95) + Math.PI) / (Math.PI * 2);
          var segs = Math.max(6, Math.round(2 * Math.PI * (ring + 0.5) * 0.4 / 0.55)), sg = an * segs + ring * 0.5;
          var fr = pd / 0.4 - ring, fa = sg - Math.floor(sg);
          col = (fr < 0.24 || fa < 0.08) ? GC.mortar : (((ring + Math.floor(sg)) & 1) ? GC.br1 : GC.br2);
        }
      }
      else if (inPath(wx, wz)) col = pathAt(wx, wz, gx, gy);
      else col = grassAt(wx, wz, gx, gy);
      gd[gi] = col[0]; gd[gi + 1] = col[1]; gd[gi + 2] = col[2]; gd[gi + 3] = 255;
    }
    ground.ctx.putImageData(gImg, 0, 0); ground.t.needsUpdate = true;
    }
    paintGround();
    var gGeo = new THREE.PlaneGeometry(20, 26, 20, 52); gGeo.rotateX(-Math.PI / 2); gGeo.translate(0, 0, -7); bend(gGeo);
    var groundMesh = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ map: ground.t })); groundMesh.receiveShadow = true; scene.add(groundMesh);

    /* ---------- water: sea + rivers in one shader, blended smoothly at the mouths ---------- */
    var waterU = {
      uSdf: { value: sdfTex }, uTime: { value: 0 }, uLight: { value: new THREE.Vector3(1, 1, 1) },
      uC1: { value: new THREE.Vector3(0.55, 0.91, 0.86) }, uC2: { value: new THREE.Vector3(0.25, 0.78, 0.85) }, uC3: { value: new THREE.Vector3(0.15, 0.6, 0.8) }, uC4: { value: new THREE.Vector3(0.12, 0.47, 0.72) },
      uFog: { value: new THREE.Vector3(0.85, 0.94, 0.98) }, uFogNear: { value: 26 }, uFogFar: { value: 46 }, uRain: { value: 0 }, uWind: { value: 0 }
    };
    var waterMat = new THREE.ShaderMaterial({
      uniforms: waterU, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; varying float vFog;\nvoid main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFog = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: [
        'uniform sampler2D uSdf; uniform float uTime; uniform vec3 uLight; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform float uRain; uniform float uWind;',
        'uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;',
        'varying vec2 vUv; varying float vFog;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'vec2 wave(float ph){ float f = ph < 0.7 ? mix(2.6, -0.3, smoothstep(0.0, 0.7, ph)) : mix(-0.3, 0.05, smoothstep(0.7, 1.0, ph)); float a = smoothstep(0.0, 0.14, ph) * (1.0 - smoothstep(0.8, 1.0, ph)); return vec2(f, a); }',
        'void main(){',
        '  vec4 s = texture2D(uSdf, vUv);',
        '  float sd = s.r * 8.0 - 2.0; float rw = smoothstep(0.05, 0.95, s.g);',
        '  vec2 w = vec2(-10.0 + vUv.x * 20.0, 6.0 - vUv.y * 26.0);',
        '  float sp = 1.0 + uWind * 0.7;',
        '  float wob = sin(w.x * 2.3 + uTime * 0.9 * sp) * 0.06 + sin(w.y * 1.9 - uTime * 0.7 * sp + w.x * 0.7) * 0.05;',
        '  vec3 shallow = uC1; vec3 mid = uC2; vec3 deep = uC3; vec3 deeper = uC4; vec3 foam = vec3(1.0);',
        /* sea */
        '  vec3 sc = vec3(0.0); float sa = 0.0;',
        '  float po = 0.16 * sin(w.x * 0.33 + w.y * 0.21) + 0.09 * sin(w.y * 0.47 - w.x * 0.19);',
        '  float ph1 = fract(uTime / 4.2 + po); vec2 W1 = wave(ph1); vec2 W2 = wave(fract(ph1 + 0.5));',
        '  float d = sd + wob;',
        '  if (sd < 0.0) {',
        '    float wet = 0.0, edge = 0.0;',
        '    if (W1.x < 0.0 && d > W1.x) { wet = max(wet, W1.y); if (d - W1.x < 0.07) edge = max(edge, W1.y); }',
        '    if (W2.x < 0.0 && d > W2.x) { wet = max(wet, W2.y); if (d - W2.x < 0.07) edge = max(edge, W2.y); }',
        '    if (wet > 0.05) { sc = mix(shallow, foam, 0.35); sa = 0.55 * wet; if (edge > 0.05) { sc = foam; sa = 0.95 * edge; } }',
        '    else if (sd > -0.34) { sc = vec3(0.42, 0.33, 0.20); sa = 0.2; }',
        '  } else {',
        '    sc = mix(shallow, mid, smoothstep(0.0, 0.9, sd)); sc = mix(sc, deep, smoothstep(0.9, 3.0, sd)); sc = mix(sc, deeper, smoothstep(3.0, 6.0, sd));',
        '    float ed = min(min(vUv.x, 1.0 - vUv.x) * 20.0, min(vUv.y, 1.0 - vUv.y) * 26.0); sc = mix(mix(deep, deeper, 0.75), sc, smoothstep(0.0, 2.2, ed));',
        '    sa = mix(0.6, 1.0, smoothstep(0.0, 0.9, sd));',
        '    float swell = fract(sd * 0.45 - uTime * 0.22 * sp + wob * 0.6);',
        '    if (sd > 1.2 && swell < 0.05) sc = mix(sc, foam, 0.28);',
        '    if (W1.x > 0.0) { float g = d - W1.x; if (abs(g) < 0.06) sc = mix(sc, foam, W1.y); else if (g > 0.06 && g < 0.4) sc = mix(sc, foam, 0.35 * (1.0 - g / 0.4) * W1.y); }',
        '    if (W2.x > 0.0) { float g2 = d - W2.x; if (abs(g2) < 0.06) sc = mix(sc, foam, W2.y); else if (g2 > 0.06 && g2 < 0.4) sc = mix(sc, foam, 0.35 * (1.0 - g2 / 0.4) * W2.y); }',
        '    if (sd < 0.06 + wob * 0.4) { sc = foam; sa = 0.95; }',
        '    float h = hash(floor(w * 5.0) + floor(uTime * 1.5));',
        '    if (sd > 0.7 && h > 0.988) sc = mix(sc, foam, 0.85);',
        '    float gl = sin(w.x * 4.0 + uTime * 1.2) * sin(w.y * 5.0 - uTime * 0.9);',
        '    if (sd > 1.0 && gl > 0.9) sc = mix(sc, foam, 0.22);',
        '  }',
        /* river */
        '  vec3 rc = vec3(0.0); float ra = 0.0;',
        '  if (sd >= 0.0) {',
        '    rc = mix(mix(shallow, foam, 0.06), mix(mid, shallow, 0.3), smoothstep(0.0, 0.45, sd));',
        '    float soft = sin(w.x * 1.3 + uTime * 0.25) * sin(w.y * 1.1 - uTime * 0.2);',
        '    rc = mix(rc, mix(shallow, foam, 0.25), 0.12 * max(soft, 0.0));',
        /* small curved ripples that drift slowly, one per cell, like little ~ marks */
        '    vec2 rp = w * 2.4 + vec2(uTime * 0.06, -uTime * 0.09);',
        '    vec2 rc0 = floor(rp); float rh = hash(rc0);',
        '    vec2 rq = fract(rp) - vec2(0.3 + 0.4 * fract(rh * 7.0), 0.35 + 0.3 * fract(rh * 13.0));',
        '    float arc = abs(length(rq - vec2(0.0, 0.16)) - 0.17);',
        '    float life = 0.5 + 0.5 * sin(uTime * 0.7 + rh * 40.0);',
        '    if (sd > 0.12 && rh > 0.45 && arc < 0.035 && rq.y < 0.06 && abs(rq.x) < 0.15) rc = mix(rc, foam, 0.42 * life);',
        /* the bank: a bright line of foam right at the edge, a softer band behind it, so the river reads like the sea's shore */
        '    if (sd < 0.03 + wob * 0.12) rc = mix(rc, foam, 0.8); else if (sd < 0.075 + wob * 0.2) rc = mix(rc, foam, 0.36);',
        /* a few glints that blink on and off as the water moves */
        '    float gh = hash(floor(w * 5.0) + floor(uTime * 0.7) * 17.0);',
        '    if (sd > 0.18 && gh > 0.988) rc = mix(rc, foam, 0.75);',
        '    ra = 0.9;',
        '  }',
        '  vec3 col = mix(sc, rc, rw); float a = mix(sa, ra, rw);',
        '  if (a < 0.02) discard;',
        '  if (uRain > 0.0 && sd > 0.1) {',
        '    vec2 rl = fract(w * 2.5) - 0.5; float rh = hash(floor(w * 2.5)); float rr = fract(uTime * 0.9 + rh);',
        '    if (abs(length(rl) - rr * 0.45) < 0.03 && rh > 0.4) col = mix(col, foam, 0.5 * (1.0 - rr) * uRain);',
        '    col *= 1.0 - 0.15 * uRain;',
        '  }',
        '  col *= uLight;',
        '  vec2 fc = mod(floor(gl_FragCoord.xy), 2.0);',
        '  float bay = (fc.x * 2.0 + fc.y * 3.0 - 4.0 * fc.x * fc.y) / 4.0 - 0.375;',
        '  col = floor(col * 14.0 + bay + 0.5) / 14.0;',
        '  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vFog));',
        '  gl_FragColor = vec4(col, a);',
        '}'
      ].join('\n')
    });
    var wGeo = new THREE.PlaneGeometry(20, 26, 20, 52); wGeo.rotateX(-Math.PI / 2); wGeo.translate(0, 0.03, -7); bend(wGeo);
    var waterMesh = new THREE.Mesh(wGeo, waterMat); waterMesh.renderOrder = 1; scene.add(waterMesh);
    var oGeo = new THREE.PlaneGeometry(80, 90, 40, 90); oGeo.rotateX(-Math.PI / 2); oGeo.translate(0, -0.05, -7); bend(oGeo);
    var openSea = new THREE.Mesh(oGeo, new THREE.ShaderMaterial({
      uniforms: waterU,
      vertexShader: 'varying vec2 vUv; varying float vFog;\nvoid main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFog = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: [
        'uniform float uTime; uniform vec3 uLight; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar; uniform vec3 uC3; uniform vec3 uC4; uniform float uWind;',
        'varying vec2 vUv; varying float vFog;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'void main(){',
        '  vec2 w = vec2(-40.0 + vUv.x * 80.0, 38.0 - vUv.y * 90.0);',
        '  float sp = 1.0 + uWind * 0.7;',
        '  vec3 col = mix(uC3, uC4, 0.75); vec3 foam = vec3(1.0);',
        '  float gl = sin(w.x * 4.0 + uTime * 1.2) * sin(w.y * 5.0 - uTime * 0.9);',
        '  if (gl > 0.9) col = mix(col, foam, 0.22);',
        '  float h = hash(floor(w * 5.0) + floor(uTime * 1.5 * sp));',
        '  if (h > 0.988) col = mix(col, foam, 0.85);',
        '  col *= uLight;',
        '  vec2 fc = mod(floor(gl_FragCoord.xy), 2.0);',
        '  float bay = (fc.x * 2.0 + fc.y * 3.0 - 4.0 * fc.x * fc.y) / 4.0 - 0.375;',
        '  col = floor(col * 14.0 + bay + 0.5) / 14.0;',
        '  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vFog));',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    }));
    openSea.renderOrder = 0; scene.add(openSea);

    /* ---------- cliff tier: grassy top, layered earth face ---------- */
    var TW = 122, TH = 96, top = canvasTex(TW, TH), tImg = top.ctx.createImageData(TW, TH), td = tImg.data;
    function paintTier() {
    for (var ty = 0; ty < TH; ty++) for (var tx = 0; tx < TW; tx++) {
      var ux = -7 + (tx + 0.5) / 16, uz = -13 + (ty + 0.5) / 16, ti = (ty * TW + tx) * 4, c3;
      var onWalk = (uz >= -8.5 + (vnoise(ux * 3, 2) - 0.5) * 0.15 && uz <= -7.9) || (ux >= -1.75 && ux <= -0.65 && uz > -7.9);
      c3 = onWalk ? pathAt(ux, uz, tx + 400, ty) : grassAt(ux, uz, tx + 400, ty + 200);
      td[ti] = c3[0]; td[ti + 1] = c3[1]; td[ti + 2] = c3[2]; td[ti + 3] = 255;
    }
    top.ctx.putImageData(tImg, 0, 0); top.t.needsUpdate = true;
    }
    paintTier();
    var cliff = canvasTex(16, 8), CL = ['#9BCB5C', '#A7845C', '#A7845C', '#9C7B54', '#8F6F4A', '#A7845C', '#8C6C47', '#6F5236'];
    for (var cy2 = 0; cy2 < 8; cy2++) for (var cx2 = 0; cx2 < 16; cx2++) {
      var cc2 = CL[cy2];
      if (cy2 === 1 && (cx2 % 3) !== 1) cc2 = '#8DBE52';
      if ((cx2 === 5 || cx2 === 12) && cy2 >= 2 && cy2 <= 6) cc2 = '#806040';
      cliff.ctx.fillStyle = cc2; cliff.ctx.fillRect(cx2, cy2, 1, 1);
    }
    cliff.t.wrapS = THREE.RepeatWrapping; cliff.t.repeat.set(6, 1); cliff.t.needsUpdate = true;
    var cliffM = new THREE.MeshLambertMaterial({ map: cliff.t }), topM = new THREE.MeshLambertMaterial({ map: top.t });
    var tierGeo = new THREE.BoxGeometry(7.6, 1, 6, 15, 1, 24); tierGeo.translate(-3.2, 0.5, -10); bend(tierGeo);
    var tier = new THREE.Mesh(tierGeo, [cliffM, cliffM, topM, cliffM, cliffM, cliffM]); tier.castShadow = true; tier.receiveShadow = true; scene.add(tier);
    var rampGeo = new THREE.BoxGeometry(1, 0.12, 1.9, 1, 1, 4); rampGeo.rotateX(0.558); rampGeo.translate(-1.2, 0.5, -6.2); bend(rampGeo);
    var ramp = new THREE.Mesh(rampGeo, mat('#D9BA86')); ramp.receiveShadow = true; scene.add(ramp);

    /* ---------- materials & builders ---------- */
    var winM = new THREE.MeshLambertMaterial({ color: 0x9FD0EE, emissive: 0x000000, flatShading: true });
    var lampM = new THREE.MeshLambertMaterial({ color: 0xFFF2C4, emissive: 0x000000, flatShading: true });
    var paperM = new THREE.MeshLambertMaterial({ color: 0xF7F1DE, emissive: 0x000000, flatShading: true });
    var wallM = mat('#FFF3DC'), doorM = mat('#8A5A3B'), darkM = mat('#4A3426'), whiteM = mat('#FFFFFF'), blackM = mat('#2A1E16');
    var woodM = mat('#B9834F'), woodM2 = mat('#9C6B3C'), trunkM = mat('#8A5A3B');
    var lamps = [], swayers = [];
    var WALLS = ['#FFF6E4', '#FDE3DA', '#E6F2D8', '#DDEBF8', '#FFF0C4', '#F1E2F6'];
    var houseN = 0;
    function darker(hex, k) { return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString(); }
    /* a pitched roof made of two thick slabs that hang well past the walls, with gable ends and shingle lines */
    function roofOn(g, w, d, wallTop, pitch, over, hex, gableM, thick) {
      var rm = mat(hex), dm = mat(darker(hex, 0.8)), half = d / 2 + over, tp = Math.tan(pitch);
      var ridge = wallTop + (d / 2) * tp, slabL = half / Math.cos(pitch);
      [-1, 1].forEach(function (sd) {
        var sl = new THREE.Group(); sl.position.set(0, ridge - (half / 2) * tp, sd * half / 2); sl.rotation.x = sd * pitch;
        sl.add(bx(w + over * 2, thick, slabL, rm, 0, thick / 2, 0));
        for (var k = 1; k <= 2; k++) sl.add(bx(w + over * 2 + 0.01, 0.025, 0.035, dm, 0, thick + 0.005, -slabL / 2 + slabL * k / 3));
        sl.add(bx(w + over * 2 + 0.02, thick + 0.02, 0.05, mat('#FFFFFF'), 0, thick / 2, sd * (slabL / 2 - 0.02)));
        g.add(sl);
      });
      var rc = cyl(0.07, 0.07, w + over * 2 + 0.04, 6, dm, 0, ridge + thick * 0.9, 0); rc.rotation.z = Math.PI / 2; g.add(rc);
      var sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, (d / 2) * tp); sh.lineTo(-d / 2, 0);
      [-1, 1].forEach(function (sd) {
        var tri = new THREE.Mesh(new THREE.ShapeGeometry(sh), gableM); tri.material.side = THREE.DoubleSide;
        tri.rotation.y = sd * Math.PI / 2; tri.position.set(sd * w / 2, wallTop, 0); g.add(tri);
      });
      return ridge;
    }
    function windowAt(g, x, y, z, shutterHex, glassW) {
      var fr = mat('#FFFFFF'), sm = mat(shutterHex), gw = glassW || 0.24;
      g.add(bx(gw + 0.06, gw + 0.06, 0.04, fr, x, y, z));
      g.add(bx(gw, gw, 0.05, winM, x, y, z + 0.005));
      g.add(bx(0.02, gw, 0.06, fr, x, y, z + 0.01)); g.add(bx(gw, 0.02, 0.06, fr, x, y, z + 0.01));
      g.add(bx(0.08, gw + 0.04, 0.03, sm, x - gw / 2 - 0.08, y, z)); g.add(bx(0.08, gw + 0.04, 0.03, sm, x + gw / 2 + 0.08, y, z));
      g.add(bx(gw + 0.14, 0.06, 0.12, mat('#A9774A'), x, y - gw / 2 - 0.07, z + 0.04));
      ['#F59BB5', '#FFFFFF', '#F7C84A', '#F59BB5'].forEach(function (c, i) { g.add(bx(0.055, 0.06, 0.055, mat(c), x - gw / 2 + 0.03 + i * (gw - 0.06) / 3, y - gw / 2 - 0.01, z + 0.06)); });
    }
    /* house: chunky pastel walls, a big overhanging roof, arched door with a little canopy and lantern, shuttered windows, mailbox */
    function cottage(roofHex, wallHex) {
      var g = new THREE.Group(), wall = mat(wallHex);
      var W = 1.3, Dp = 1.05, H = 0.9, front = Dp / 2;
      g.add(bx(W + 0.08, 0.1, Dp + 0.08, mat('#CBBFA8'), 0, 0.05, 0));
      g.add(bx(W, H, Dp, wall, 0, 0.1 + H / 2, 0));
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (c) { g.add(bx(0.07, H, 0.07, mat(darker(wallHex, 0.86)), c[0] * (W / 2 - 0.02), 0.1 + H / 2, c[1] * (Dp / 2 - 0.02))); });
      var ridge = roofOn(g, W, Dp, 0.1 + H, 0.5, 0.16, roofHex, mat(wallHex), 0.12);
      /* round attic window in the gable */
      var aw = cyl(0.09, 0.09, 0.05, 10, mat('#FFFFFF'), W / 2 + 0.01, 0.1 + H + 0.2, 0); aw.rotation.z = Math.PI / 2; g.add(aw);
      /* chimney */
      g.add(bx(0.17, 0.4, 0.17, mat('#C58F6A'), 0.38, ridge - 0.02, -0.24)); g.add(bx(0.22, 0.05, 0.22, mat('#8C6A52'), 0.38, ridge + 0.2, -0.24));
      /* door: wooden, arched, white frame, little canopy and a lantern */
      var doorM = mat('#A0663A'), dk = mat(darker('#A0663A', 0.8));
      g.add(bx(0.4, 0.48, 0.04, mat('#FFFFFF'), 0, 0.1 + 0.24, front + 0.005));
      g.add(bx(0.32, 0.42, 0.05, doorM, 0, 0.1 + 0.21, front + 0.02));
      var ar = cyl(0.16, 0.16, 0.05, 12, doorM, 0, 0.1 + 0.42, front + 0.02); ar.rotation.x = Math.PI / 2; g.add(ar);
      var arf = cyl(0.2, 0.2, 0.04, 12, mat('#FFFFFF'), 0, 0.1 + 0.42, front + 0.004); arf.rotation.x = Math.PI / 2; g.add(arf);
      g.add(bx(0.02, 0.36, 0.06, dk, 0, 0.1 + 0.2, front + 0.03));
      var kn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), mat('#F2C14E')); kn.position.set(0.1, 0.1 + 0.22, front + 0.06); g.add(kn);
      var cn = bx(0.5, 0.05, 0.22, mat(roofHex), 0, 0.1 + 0.68, front + 0.1); cn.rotation.x = 0.35; g.add(cn);
      g.add(bx(0.07, 0.11, 0.07, lampM, 0.27, 0.1 + 0.5, front + 0.05)); g.add(bx(0.09, 0.02, 0.09, darkM, 0.27, 0.1 + 0.565, front + 0.05));
      g.add(bx(0.5, 0.04, 0.26, mat('#D8CDB8'), 0, 0.02, front + 0.16));
      windowAt(g, -0.42, 0.1 + 0.46, front + 0.01, roofHex);
      windowAt(g, 0.42, 0.1 + 0.46, front + 0.01, roofHex);
      /* mailbox on a post */
      g.add(cyl(0.025, 0.025, 0.32, 5, mat('#8A5A3B'), -0.78, 0.16, front + 0.32));
      var mb = cyl(0.07, 0.07, 0.2, 8, mat(darker(roofHex, 0.85)), -0.78, 0.38, front + 0.32); mb.rotation.x = Math.PI / 2; g.add(mb);
      g.add(bx(0.14, 0.08, 0.2, mat(darker(roofHex, 0.85)), -0.78, 0.34, front + 0.32));
      g.add(bx(0.02, 0.1, 0.05, mat('#E84F3D'), -0.7, 0.43, front + 0.36));
      g.chimTop = ridge + 0.25; g.chimX = 0.38; g.chimZ = -0.24; g.scale.setScalar(1.22); return shade(g);
    }
    /* ---- every resident gets a house with its own shape, like villager homes in the game (same lot size, different build) ---- */
    function pixTex(w, h, draw, rx, ry) { var t = canvasTex(w, h); draw(t.ctx); t.t.wrapS = t.t.wrapT = THREE.RepeatWrapping; t.t.repeat.set(rx || 1, ry || 1); t.t.needsUpdate = true; return t.t; }
    function brickMat(hex, rx, ry) {
      var dk = darker(hex, 0.82), mo = '#E9DCC8';
      return new THREE.MeshLambertMaterial({ map: pixTex(16, 8, function (c) {
        c.fillStyle = mo; c.fillRect(0, 0, 16, 8);
        for (var r = 0; r < 2; r++) for (var k = 0; k < 3; k++) { var x0 = (r ? 2 : -3) + k * 6; c.fillStyle = (k + r) % 2 ? hex : dk; c.fillRect(x0, r * 4, 5, 3); if (x0 < 0) c.fillRect(16 + x0, r * 4, -x0, 3); }
      }, rx, ry), flatShading: true });
    }
    function paneWin(g, x, y, z, w, h, frameHex, ry) {
      var fr = mat(frameHex || '#FFFFFF'), o = new THREE.Group(); o.position.set(x, y, z); o.rotation.y = ry || 0;
      o.add(bx(w + 0.06, h + 0.06, 0.04, fr, 0, 0, 0)); o.add(bx(w, h, 0.05, winM, 0, 0, 0.005));
      o.add(bx(0.02, h, 0.06, fr, 0, 0, 0.01)); o.add(bx(w, 0.02, 0.06, fr, 0, 0, 0.01)); g.add(o); return o;
    }
    function hipRoof(g, w, d, y, h, hex) {
      var r = new THREE.Mesh(new THREE.ConeGeometry(1, h, 4, 1), mat(hex)); r.rotation.y = Math.PI / 4;
      r.scale.set(w / Math.SQRT2, 1, d / Math.SQRT2); r.position.set(0, y + h / 2, 0); g.add(r); return y + h;
    }
    function flowerRow(g, x0, x1, z, cols) {
      g.add(bx(x1 - x0 + 0.08, 0.07, 0.16, mat('#8A6A4A'), (x0 + x1) / 2, 0.04, z));
      for (var i = 0, n = Math.round((x1 - x0) / 0.1); i <= n; i++) { var f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), mat(cols[i % cols.length])); f.position.set(x0 + i * (x1 - x0) / n, 0.12, z + (i % 2 ? 0.03 : -0.03)); g.add(f); }
    }
    /* log cabin: round logs, a low wide roof over a porch, an outside stone chimney and a woodpile */
    function cabin(roofHex) {
      var g = new THREE.Group(), W = 1.36, Dp = 1.0, H = 0.82, front = Dp / 2, b0 = 0.12, logHex = ['#C99A62', '#B9844F', '#D6AE78'][houseN % 3], logM = mat(logHex), endM = mat('#E8CBA0');
      g.add(bx(W + 0.12, b0, Dp + 0.12, mat('#9A9184'), 0, b0 / 2, 0));
      g.add(bx(W - 0.04, H, Dp - 0.04, mat(darker(logHex, 0.8)), 0, b0 + H / 2, 0));
      for (var i = 0; i < 6; i++) {
        var y = b0 + 0.07 + i * 0.135, lf = cyl(0.072, 0.072, W + 0.14, 7, logM, 0, y, front - 0.02); lf.rotation.z = Math.PI / 2; g.add(lf);
        [-1, 1].forEach(function (sd) { var ls = cyl(0.072, 0.072, Dp + 0.14, 7, logM, sd * (W / 2 - 0.02), y + 0.067, 0); ls.rotation.x = Math.PI / 2; g.add(ls);
          var e = cyl(0.06, 0.06, 0.02, 7, endM, sd * (W / 2 + 0.06), y, front - 0.02); e.rotation.z = Math.PI / 2; g.add(e); });
      }
      var ridge = roofOn(g, W + 0.06, Dp, b0 + H, 0.36, 0.36, roofHex, logM, 0.12);
      g.add(bx(W * 0.86, 0.06, 0.36, woodM2, 0, b0 + 0.03, front + 0.2));
      [-0.52, 0.52].forEach(function (x) { g.add(cyl(0.04, 0.045, H - 0.16, 6, woodM, x, b0 + (H - 0.16) / 2, front + 0.32)); });
      g.add(bx(0.36, 0.52, 0.05, mat('#8A5A3B'), 0, b0 + 0.26, front + 0.06));
      [0.12, 0.26, 0.4].forEach(function (yy) { g.add(bx(0.36, 0.02, 0.06, darkM, 0, b0 + yy, front + 0.07)); });
      paneWin(g, -0.42, b0 + 0.46, front + 0.06, 0.26, 0.24, '#8A5A3B'); paneWin(g, 0.42, b0 + 0.46, front + 0.06, 0.26, 0.24, '#8A5A3B');
      var st = mat('#A79C8C'), cx = W / 2 + 0.13, cz = -0.12;
      g.add(bx(0.3, 0.6, 0.32, st, cx, 0.3, cz)); g.add(bx(0.22, ridge + 0.1 - 0.6, 0.24, st, cx, 0.6 + (ridge + 0.1 - 0.6) / 2, cz));
      g.add(bx(0.27, 0.05, 0.29, mat('#7E7466'), cx, ridge + 0.12, cz));
      for (var r2 = 0; r2 < 2; r2++) for (var c2 = 0; c2 < 3 - r2; c2++) { var lg = cyl(0.05, 0.05, 0.3, 6, endM, -W / 2 - 0.16, 0.06 + r2 * 0.09, -0.15 + c2 * 0.11 + r2 * 0.055); lg.rotation.x = Math.PI / 2; g.add(lg); }
      g.chimTop = ridge + 0.15; g.chimX = cx; g.chimZ = cz; g.scale.setScalar(1.22); return shade(g);
    }
    /* brick townhouse: taller, a hip roof, tall white windows, front steps and a street lamp */
    function brickHouse(roofHex) {
      var g = new THREE.Group(), W = 1.2, Dp = 0.98, H = 1.12, front = Dp / 2, b0 = 0.1, bh = ['#B9573F', '#C98A5A', '#A0634E'][houseN % 3];
      g.add(bx(W + 0.08, b0, Dp + 0.08, mat('#BFB6A6'), 0, b0 / 2, 0));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, Dp), brickMat(bh, 3, 6))); g.children[g.children.length - 1].position.set(0, b0 + H / 2, 0);
      [[-1], [1]].forEach(function (c) { for (var k = 0; k < 5; k++) g.add(bx(0.1, 0.12, 0.1, mat('#F2EADB'), c[0] * (W / 2 - 0.03), b0 + 0.1 + k * 0.24, front - 0.03)); });
      g.add(bx(W + 0.1, 0.08, Dp + 0.1, mat('#F2EADB'), 0, b0 + H, 0));
      var top = hipRoof(g, W + 0.34, Dp + 0.34, b0 + H + 0.04, 0.5, roofHex);
      g.add(bx(0.34, 0.56, 0.05, mat(darker(roofHex, 0.7)), 0, b0 + 0.36, front + 0.02)); g.add(bx(0.42, 0.06, 0.08, mat('#F2EADB'), 0, b0 + 0.68, front + 0.03));
      g.add(bx(0.28, 0.1, 0.05, winM, 0, b0 + 0.6, front + 0.03));
      g.add(bx(0.5, 0.05, 0.18, mat('#D8CDB8'), 0, 0.025, front + 0.09)); g.add(bx(0.44, 0.05, 0.1, mat('#D8CDB8'), 0, 0.075, front + 0.05));
      [-0.38, 0.38].forEach(function (x) {
        paneWin(g, x, b0 + 0.42, front + 0.02, 0.2, 0.34, '#FFFFFF'); paneWin(g, x, b0 + 0.88, front + 0.02, 0.2, 0.24, '#FFFFFF');
        g.add(bx(0.28, 0.06, 0.1, mat('#6E8A4E'), x, b0 + 0.22, front + 0.06));
        ['#F59BB5', '#FFFFFF', '#F7C84A'].forEach(function (c, i) { g.add(bx(0.06, 0.06, 0.06, mat(c), x - 0.08 + i * 0.08, b0 + 0.27, front + 0.07)); });
      });
      g.add(bx(0.18, 0.5, 0.18, brickMat(bh, 1, 2), 0.32, top - 0.22, -0.2)); g.add(bx(0.22, 0.05, 0.22, mat('#6E5A50'), 0.32, top + 0.04, -0.2));
      g.add(cyl(0.025, 0.03, 0.8, 6, darkM, -0.78, 0.4, front + 0.25)); g.add(bx(0.11, 0.13, 0.11, lampM, -0.78, 0.86, front + 0.25)); g.add(bx(0.14, 0.03, 0.14, darkM, -0.78, 0.94, front + 0.25));
      g.chimTop = top + 0.08; g.chimX = 0.32; g.chimZ = -0.2; g.scale.setScalar(1.22); return shade(g);
    }
    /* modern box: flat roof with a deep overhang, wood slats, one big window and a steel flue */
    function modernHouse(roofHex, wallHex) {
      var g = new THREE.Group(), W = 1.4, Dp = 1.02, H = 0.92, front = Dp / 2, b0 = 0.08, wl = mat(['#F4F4F0', '#E4E6E8', '#EFE8DE'][houseN % 3]);
      g.add(bx(W + 0.06, b0, Dp + 0.06, mat('#9EA3A8'), 0, b0 / 2, 0));
      g.add(bx(W, H, Dp, wl, 0, b0 + H / 2, 0));
      g.add(bx(0.52, H * 0.55, Dp * 0.7, woodM, -0.6, b0 + H + H * 0.275 + 0.06, -0.12)); g.add(bx(0.6, 0.06, Dp * 0.78, mat('#ECEAE4'), -0.6, b0 + H + H * 0.55 + 0.09, -0.12)); g.add(bx(0.3, 0.2, 0.04, winM, -0.6, b0 + H + 0.32, Dp * 0.23));
      g.add(bx(W + 0.24, 0.08, Dp + 0.3, mat('#ECEAE4'), 0, b0 + H + 0.04, 0.06)); g.add(bx(W + 0.25, 0.06, 0.02, mat(roofHex), 0, b0 + H + 0.04, front + 0.215)); g.add(bx(0.02, 0.06, Dp + 0.3, mat(roofHex), W / 2 + 0.125, b0 + H + 0.04, 0.06));
      for (var i = 0; i < 6; i++) g.add(bx(0.045, H - 0.12, 0.03, woodM, 0.26 + i * 0.075, b0 + (H - 0.12) / 2 + 0.04, front + 0.015));
      g.add(bx(0.52, 0.5, 0.05, mat('#2E3136'), -0.38, b0 + 0.5, front + 0.01)); g.add(bx(0.46, 0.44, 0.06, winM, -0.38, b0 + 0.5, front + 0.02)); g.add(bx(0.02, 0.44, 0.07, mat('#2E3136'), -0.38, b0 + 0.5, front + 0.025));
      g.add(bx(0.3, 0.6, 0.05, mat(darker(roofHex, 0.75)), 0, b0 + 0.3, front + 0.02)); g.add(bx(0.02, 0.22, 0.03, mat('#D8DDE2'), 0.1, b0 + 0.32, front + 0.05));
      g.add(bx(0.5, 0.03, 0.26, mat('#C9CED3'), 0, 0.015, front + 0.15));
      g.add(bx(0.4, 0.14, 0.14, mat('#5A5F66'), 0.75, 0.07, front + 0.12));
      [0.64, 0.75, 0.86].forEach(function (x, k) { g.add(cyl(0.035, 0.04, 0.14 + k % 2 * 0.06, 6, mat('#5E9E58'), x, 0.2 + k % 2 * 0.03, front + 0.12)); });
      var fx = 0.45, fz = -0.24, ft = b0 + H + 0.4;
      g.add(cyl(0.04, 0.04, 0.36, 6, mat('#B8BEC6'), fx, b0 + H + 0.22, fz)); g.add(cyl(0.07, 0.07, 0.04, 6, mat('#8E959E'), fx, ft, fz));
      g.chimTop = ft + 0.02; g.chimX = fx; g.chimZ = fz; g.scale.setScalar(1.22); return shade(g);
    }
    /* zen house: low and wide, a deep tiled hip roof with upturned ridge ends, shoji door, veranda and a stone lantern */
    function zenHouse(roofHex) {
      var g = new THREE.Group(), W = 1.42, Dp = 1.0, H = 0.72, front = Dp / 2, b0 = 0.16, tile = mat(darker(roofHex, 0.55)), tm = mat('#5A3E2B'), pl = mat('#F4EEDF');
      g.add(bx(W + 0.14, b0, Dp + 0.14, mat('#A9A396'), 0, b0 / 2, 0));
      g.add(bx(W, H, Dp, pl, 0, b0 + H / 2, 0));
      [-W / 2, -W / 4, W / 4, W / 2].forEach(function (x) { g.add(bx(0.06, H, 0.06, tm, x, b0 + H / 2, front)); });
      g.add(bx(W + 0.04, 0.07, 0.07, tm, 0, b0 + H - 0.04, front)); g.add(bx(W + 0.04, 0.05, 0.07, tm, 0, b0 + 0.1, front));
      g.add(bx(0.62, 0.52, 0.04, mat('#FFFDF6'), 0, b0 + 0.36, front + 0.02));
      for (var i = 1; i < 4; i++) g.add(bx(0.015, 0.52, 0.05, tm, -0.31 + i * 0.155, b0 + 0.36, front + 0.03));
      for (var j = 1; j < 4; j++) g.add(bx(0.62, 0.015, 0.05, tm, 0, b0 + 0.1 + j * 0.13, front + 0.03));
      g.add(bx(0.015, 0.52, 0.06, tm, 0, b0 + 0.36, front + 0.035));
      [-0.52, 0.52].forEach(function (x) { var rw = cyl(0.13, 0.13, 0.04, 12, tm, x, b0 + 0.42, front + 0.02); rw.rotation.x = Math.PI / 2; g.add(rw); var rg = cyl(0.11, 0.11, 0.05, 12, winM, x, b0 + 0.42, front + 0.025); rg.rotation.x = Math.PI / 2; g.add(rg); g.add(bx(0.22, 0.012, 0.06, tm, x, b0 + 0.42, front + 0.04)); g.add(bx(0.012, 0.22, 0.06, tm, x, b0 + 0.42, front + 0.04)); });
      g.add(bx(W + 0.16, 0.05, 0.3, mat('#B08455'), 0, b0 - 0.02, front + 0.16));
      var top = hipRoof(g, W + 0.62, Dp + 0.6, b0 + H, 0.34, darker(roofHex, 0.55));
      g.add(bx(W * 0.5, 0.14, 0.2, tile, 0, top - 0.04, 0));
      var rc = cyl(0.05, 0.05, W * 0.56, 6, mat('#3A3F46'), 0, top + 0.05, 0); rc.rotation.z = Math.PI / 2; g.add(rc);
      [-1, 1].forEach(function (sd) { var tip = bx(0.08, 0.16, 0.08, mat('#3A3F46'), sd * W * 0.29, top + 0.1, 0); tip.rotation.z = -sd * 0.5; g.add(tip); });
      var sx = -W / 2 - 0.2, sz = front + 0.28, stn = mat('#B9B3A6');
      g.add(bx(0.16, 0.05, 0.16, stn, sx, 0.025, sz)); g.add(cyl(0.035, 0.045, 0.22, 6, stn, sx, 0.16, sz)); g.add(bx(0.15, 0.12, 0.15, stn, sx, 0.33, sz)); g.add(bx(0.09, 0.07, 0.16, lampM, sx, 0.33, sz));
      var cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 4), stn); cap.rotation.y = Math.PI / 4; cap.position.set(sx, 0.44, sz); g.add(cap);
      g.add(bx(0.1, 0.12, 0.1, mat('#6F675C'), 0.34, top - 0.1, -0.22));
      g.chimTop = top - 0.02; g.chimX = 0.34; g.chimZ = -0.22; g.scale.setScalar(1.22); return shade(g);
    }
    /* storybook tower: round walls, a tall pointed roof, a round door and porthole windows */
    function towerHouse(roofHex, wallHex) {
      var g = new THREE.Group(), R0 = 0.56, H = 1.0, b0 = 0.1, wl = mat(wallHex), front = R0;
      g.add(cyl(R0 + 0.07, R0 + 0.09, b0, 14, mat('#BFB6A6'), 0, b0 / 2, 0));
      g.add(cyl(R0, R0, H, 14, wl, 0, b0 + H / 2, 0));
      g.add(cyl(R0 + 0.02, R0 + 0.02, 0.06, 14, mat(darker(wallHex, 0.86)), 0, b0 + H * 0.55, 0));
      var rf = new THREE.Mesh(new THREE.ConeGeometry(R0 + 0.22, 0.95, 14), mat(roofHex)); rf.position.set(0, b0 + H + 0.475, 0); g.add(rf);
      var rim = cyl(R0 + 0.23, R0 + 0.23, 0.05, 14, mat(darker(roofHex, 0.8)), 0, b0 + H + 0.02, 0); g.add(rim);
      var fin = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), mat('#F2C14E')); fin.position.set(0, b0 + H + 1.0, 0); g.add(fin);
      g.add(bx(0.34, 0.4, 0.08, mat('#A0663A'), 0, b0 + 0.2, front - 0.01));
      var ar = cyl(0.17, 0.17, 0.08, 12, mat('#A0663A'), 0, b0 + 0.4, front - 0.01); ar.rotation.x = Math.PI / 2; g.add(ar);
      var af = cyl(0.21, 0.21, 0.05, 12, mat('#FFFFFF'), 0, b0 + 0.4, front - 0.03); af.rotation.x = Math.PI / 2; g.add(af);
      var kn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), mat('#F2C14E')); kn.position.set(0.1, b0 + 0.24, front + 0.04); g.add(kn);
      [-0.75, 0.75].forEach(function (a) {
        var o = new THREE.Group(); o.position.set(Math.sin(a) * R0, b0 + 0.66, Math.cos(a) * R0); o.rotation.y = a;
        var fr = cyl(0.11, 0.11, 0.04, 12, mat('#FFFFFF'), 0, 0, 0); fr.rotation.x = Math.PI / 2; o.add(fr);
        var gl = cyl(0.085, 0.085, 0.05, 12, winM, 0, 0, 0.005); gl.rotation.x = Math.PI / 2; o.add(gl); g.add(o);
      });
      var dw = new THREE.Group(); dw.position.set(0, b0 + H + 0.24, R0 - 0.02);
      dw.add(bx(0.24, 0.22, 0.2, wl, 0, 0, -0.05)); var dr = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 4), mat(roofHex)); dr.rotation.y = Math.PI / 4; dr.position.set(0, 0.2, -0.05); dw.add(dr);
      dw.add(bx(0.13, 0.12, 0.04, winM, 0, 0, 0.06)); g.add(dw);
      var cx = 0.26, cz = -0.24, ct = b0 + H + 0.62;
      g.add(bx(0.15, 0.5, 0.15, mat('#C58F6A'), cx, ct - 0.25, cz)); g.add(bx(0.19, 0.05, 0.19, mat('#8C6A52'), cx, ct, cz));
      flowerRow(g, -0.62, -0.26, front + 0.12, ['#F59BB5', '#FFFFFF', '#F7C84A']); flowerRow(g, 0.26, 0.62, front + 0.12, ['#9FC4E8', '#FFFFFF', '#F59BB5']);
      g.chimTop = ct + 0.02; g.chimX = cx; g.chimZ = cz; g.scale.setScalar(1.22); return shade(g);
    }
    /* hanok: raised stone base, brown posts on white walls, lattice paper doors, a maru deck, a grey giwa roof
       with upturned corners and a white-edged ridge, a low side chimney and onggi jars (jangdokdae) */
    function hanokHouse(roofHex) {
      var g = new THREE.Group(), W = 1.36, Dp = 0.96, H = 0.66, b0 = 0.2, front = Dp / 2, post = mat('#7A5034'), wl = mat('#F4EFE4'), paper = paperM, lat = mat('#8A5A3B');
      var tile = mat('#4F5866'), tileD = mat('#3E4552'), ridgeW = mat('#EDE9E0'), stone = mat('#C9C1B2');
      g.add(bx(W + 0.26, b0, Dp + 0.26, stone, 0, b0 / 2, 0)); g.add(bx(W + 0.3, 0.03, Dp + 0.3, mat('#B5AD9E'), 0, b0 + 0.005, 0));
      g.add(bx(0.5, 0.1, 0.16, stone, 0, 0.05, front + 0.21));
      g.add(bx(W, H, Dp, wl, 0, b0 + H / 2, 0));
      [-W / 2, -W / 6, W / 6, W / 2].forEach(function (x) { g.add(bx(0.07, H + 0.04, 0.07, post, x, b0 + H / 2, front + 0.02)); });
      g.add(bx(W + 0.06, 0.07, 0.08, post, 0, b0 + H - 0.03, front + 0.02)); g.add(bx(W + 0.06, 0.05, 0.08, post, 0, b0 + 0.12, front + 0.02));
      function lattice(x, y, w, h) {
        g.add(bx(w, h, 0.03, paper, x, y, front + 0.03));
        for (var i = 1; i < 4; i++) g.add(bx(0.012, h, 0.04, lat, x - w / 2 + i * w / 4, y, front + 0.04));
        for (var j = 1; j < 5; j++) g.add(bx(w, 0.012, 0.04, lat, x, y - h / 2 + j * h / 5, front + 0.04));
        g.add(bx(w + 0.03, 0.02, 0.05, lat, x, y + h / 2, front + 0.04)); g.add(bx(w + 0.03, 0.02, 0.05, lat, x, y - h / 2, front + 0.04));
      }
      lattice(-0.1, b0 + 0.34, 0.18, 0.4); lattice(0.1, b0 + 0.34, 0.18, 0.4);
      lattice(-0.45, b0 + 0.4, 0.26, 0.24); lattice(0.45, b0 + 0.4, 0.26, 0.24);
      g.add(bx(W + 0.04, 0.05, 0.3, mat('#C89B6A'), 0, b0 + 0.06, front + 0.17));
      for (var k = 0; k < 7; k++) g.add(bx(0.012, 0.052, 0.3, mat('#B08455'), -W / 2 + 0.1 + k * 0.19, b0 + 0.062, front + 0.17));
      /* giwa roof */
      var top = hipRoof(g, W + 0.74, Dp + 0.72, b0 + H, 0.36, '#4F5866');
      for (var r = 0; r < 9; r++) { var rl = bx(0.03, 0.03, 0.5, tileD, -0.88 + r * 0.22, b0 + H + 0.17, front + 0.12); rl.rotation.x = 0.62; g.add(rl); }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
        var tip = bx(0.08, 0.06, 0.32, tile, c[0] * (W / 2 + 0.36), b0 + H + 0.04, c[1] * (Dp / 2 + 0.34)); tip.rotation.y = c[0] * c[1] * Math.PI / 4; tip.rotation.x = -c[1] * 0.45; g.add(tip);
      });
      g.add(bx(W * 0.62, 0.12, 0.2, tileD, 0, top - 0.04, 0)); g.add(bx(W * 0.64, 0.03, 0.22, ridgeW, 0, top - 0.1, 0));
      [-1, 1].forEach(function (sd) { var ch = bx(0.08, 0.2, 0.12, tileD, sd * W * 0.31, top + 0.06, 0); ch.rotation.z = -sd * 0.35; g.add(ch); });
      var gab = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 3), mat('#F4EFE4')); gab.rotation.set(0, 0, 0); gab.position.set(0, top - 0.02, Dp * 0.18); gab.scale.set(1.6, 1, 0.4); g.add(gab);
      /* low chimney beside the house */
      var cx = W / 2 + 0.28, cz = -0.2;
      g.add(bx(0.18, 0.66, 0.18, mat('#B9A894'), cx, 0.33, cz)); g.add(bx(0.26, 0.05, 0.26, tile, cx, 0.68, cz)); g.add(bx(0.14, 0.06, 0.14, tileD, cx, 0.73, cz));
      /* jangdokdae: onggi jars on a little stone stand */
      g.add(bx(0.5, 0.06, 0.32, stone, -W / 2 - 0.22, 0.03, front + 0.08));
      [[-0.88, 0.0, 0.11], [-0.68, 0.12, 0.08], [-1.02, 0.18, 0.07]].forEach(function (j) {
        var jar = new THREE.Mesh(new THREE.SphereGeometry(j[2], 8, 6), mat('#6B4026')); jar.scale.set(1, 1.15, 1); jar.position.set(j[0], 0.06 + j[2], front + j[1] - 0.02); g.add(jar);
        g.add(cyl(j[2] * 0.75, j[2] * 0.75, 0.03, 8, mat('#5A3420'), j[0], 0.06 + j[2] * 2.1, front + j[1] - 0.02));
      });
      g.chimTop = 0.76; g.chimX = cx; g.chimZ = cz; g.scale.setScalar(1.22); return shade(g);
    }
    var HOUSE_KINDS = { hanok: hanokHouse, cottage: cottage, cabin: cabin, brick: brickHouse, modern: modernHouse, zen: zenHouse, tower: towerHouse };
    function house(roofHex, kind) {
      var wallHex = WALLS[houseN % WALLS.length], g = (HOUSE_KINDS[kind] || cottage)(roofHex, wallHex); houseN++; return g;
    }
    /* tiny pixel icons for shop signs */
    function iconTex(rows, pal) {
      var t = canvasTex(rows[0].length, rows.length);
      rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r.charAt(x); t.ctx.fillStyle = pal[ch] || pal['.']; t.ctx.fillRect(x, y, 1, 1); } });
      t.t.needsUpdate = true; return t.t;
    }
    function roundSign(tex, rimHex, r) {
      var g = new THREE.Group();
      var rim = cyl(r + 0.05, r + 0.05, 0.06, 16, mat(rimHex)); rim.rotation.x = Math.PI / 2; g.add(rim);
      var face = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshLambertMaterial({ map: tex })); face.position.z = 0.032; g.add(face);
      return g;
    }
    var CUP = ['............', '............', '...w..w.....', '....w..w....', '............', '..bbbbbbb...', '..bwwwwwbbb.', '..bwwwwwb.b.', '..bwwwwwbbb.', '...bwwwb....', '..ccccccc...', '............'];
    var BOWL = ['............', '....s..s....', '.....s..s...', '....s..s....', '............', '.rrrrrrrrrr.', '.rwwwwwwwwr.', '..rwwwwwwr..', '...rrrrrr...', '....rrrr....', '............', '............'];
    var BAG = ['............', '....kkkk....', '....k..k....', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbbbyybbbb.', '.kkkkyykkkk.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '............', '............'];
    var BUS = ['............', '..bbbbbbbb..', '.bwwbwwbwwb.', '.bwwbwwbwwb.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bybbbbbbyb.', '.bbbbbbbbbb.', '..kk....kk..', '..kk....kk..', '............', '............'];
    /* awning with a scalloped edge in alternating stripes */
    function awning(g, w, y, z, c1, c2, n) {
      var a1 = mat(c1), a2 = mat(c2), sw = w / n;
      for (var i = 0; i < n; i++) {
        var st = bx(sw, 0.05, 0.42, i % 2 ? a2 : a1, -w / 2 + sw * (i + 0.5), y, z); st.rotation.x = 0.45; g.add(st);
        var sc = cyl(sw / 2, sw / 2, 0.05, 8, i % 2 ? a2 : a1, -w / 2 + sw * (i + 0.5), y - 0.1, z + 0.2); sc.rotation.x = Math.PI / 2; sc.scale.set(1, 1, 1); g.add(sc);
      }
    }
    function plantPot(g, x, z, leafHex) {
      g.add(cyl(0.1, 0.08, 0.16, 8, mat('#C9774A'), x, 0.08, z));
      var l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), mat(leafHex || '#5BAA48')); l.position.set(x, 0.27, z); g.add(l);
    }
    function aFrame(g, x, z, rot, boardHex) {
      var f = new THREE.Group(), wd = mat('#8F6238'), bd = mat(boardHex || '#2F3A33');
      [-1, 1].forEach(function (sd) { var p2 = new THREE.Group(); p2.rotation.x = sd * 0.25; p2.add(bx(0.3, 0.4, 0.03, wd, 0, 0.2, 0)); p2.add(bx(0.24, 0.3, 0.035, bd, 0, 0.21, sd * 0.002)); f.add(p2); });
      f.position.set(x, 0, z); f.rotation.y = rot || 0; g.add(f);
    }
    /* ---- 3d roof signs: from the village camera you look down into them, so the inside (latte art, noodles) is the picture ---- */
    var steamers = [];
    function steam(g, x, y, z, n) {
      for (var i = 0; i < (n || 3); i++) { var m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6, depthWrite: false })); m.position.set(x, y, z); g.add(m); steamers.push({ m: m, x: x, y: y, z: z, ph: i / (n || 3) }); }
    }
    function discTex(draw) { var t = canvasTex(16, 16); draw(t.ctx); t.t.needsUpdate = true; return t.t; }
    function px(c, col, pts) { c.fillStyle = col; pts.forEach(function (q) { c.fillRect(q[0], q[1], q[2] || 1, q[3] || 1); }); }
    function cupSign(bandHex) {
      var g = new THREE.Group(), w = mat('#FFFFFF'), sh = mat('#EEE6DA');
      g.add(cyl(0.3, 0.27, 0.04, 14, sh, 0, 0.02, 0)); g.add(cyl(0.28, 0.28, 0.01, 14, w, 0, 0.045, 0));
      g.add(cyl(0.2, 0.15, 0.27, 14, w, 0, 0.18, 0));
      g.add(cyl(0.203, 0.19, 0.07, 14, mat(bandHex), 0, 0.17, 0));
      var hd = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 6, 12, Math.PI * 1.25), w); hd.position.set(0.21, 0.18, 0); hd.rotation.z = -Math.PI * 0.62; g.add(hd);
      var lt = new THREE.Mesh(new THREE.CircleGeometry(0.185, 16), new THREE.MeshLambertMaterial({ map: discTex(function (c) {
        px(c, '#B07A4E', [[0, 0, 16, 16]]); px(c, '#7A4A2C', [[2, 2, 12, 12], [1, 4, 14, 8], [4, 1, 8, 14]]);
        px(c, '#F3E2C8', [[4, 5, 3, 2], [9, 5, 3, 2], [4, 6, 8, 2], [5, 8, 6, 1], [6, 9, 4, 1], [7, 10, 2, 1]]);
        px(c, '#D9B58A', [[3, 6, 1, 1], [12, 6, 1, 1], [7, 11, 2, 1]]);
      }) })); lt.rotation.x = -Math.PI / 2; lt.position.y = 0.318; g.add(lt);
      steam(g, 0, 0.38, 0, 3);
      return g;
    }
    function ramenSign() {
      var g = new THREE.Group(), red = mat('#E05A4F'), w = mat('#FFFFFF');
      g.add(cyl(0.1, 0.12, 0.05, 12, red, 0, 0.025, 0));
      g.add(cyl(0.28, 0.13, 0.19, 14, red, 0, 0.14, 0));
      g.add(cyl(0.285, 0.27, 0.035, 14, w, 0, 0.225, 0));
      for (var k = 0; k < 7; k++) { var a = k / 7 * Math.PI * 2, d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 0), w); d.position.set(Math.cos(a) * 0.205, 0.13, Math.sin(a) * 0.205); g.add(d); }
      var soup = new THREE.Mesh(new THREE.CircleGeometry(0.255, 16), new THREE.MeshLambertMaterial({ map: discTex(function (c) {
        px(c, '#E3A956', [[0, 0, 16, 16]]);
        px(c, '#F7DE8E', [[2, 6, 3, 1], [5, 7, 3, 1], [8, 6, 3, 1], [11, 7, 3, 1], [2, 9, 3, 1], [5, 10, 3, 1], [8, 9, 3, 1], [11, 10, 3, 1], [3, 12, 3, 1], [7, 12, 3, 1]]);
        px(c, '#264030', [[4, 1, 5, 4]]);
        px(c, '#FFF8E8', [[10, 2, 4, 4]]); px(c, '#F2A93B', [[11, 3, 2, 2]]);
        px(c, '#FFFFFF', [[2, 10, 3, 3]]); px(c, '#F49AA8', [[3, 11, 1, 1], [2, 10, 1, 1]]);
        px(c, '#6DBB4E', [[12, 11, 1, 1], [10, 13, 1, 1], [13, 9, 1, 1], [7, 4, 1, 1], [9, 13, 1, 1]]);
      }) })); soup.rotation.x = -Math.PI / 2; soup.position.y = 0.246; g.add(soup);
      [[-0.03, 0.5], [0.05, 0.38]].forEach(function (c0) { var st = bx(0.022, 0.022, 0.62, mat('#D9B27A'), c0[0] + 0.04, 0.26, 0.02); st.rotation.y = c0[1]; st.rotation.x = -0.12; g.add(st); });
      steam(g, -0.05, 0.31, 0, 3);
      return g;
    }
    /* cafe: a cosy corner cafe. cream plaster over green wood panelling, two big arched windows that glow at night,
       a striped awning hung with bulbs, a name board, terrace tables with little umbrellas, flower boxes and potted olive trees */
    var CAFE_TXT = ['........................', '.ccc..ccc..cccc.cccc....', 'c....c...c.c....c.......', 'c....ccccc.ccc..ccc.....', 'c....c...c.c....c.......', '.ccc.c...c.c....cccc....', '........................'];
    function cafe() {
      var g = new THREE.Group(), W = 2.0, Dp = 1.2, H = 1.0, front = Dp / 2, b0 = 0.12, G1 = '#3E7A5A', G2 = '#2F6248', cream = mat('#FFF4E0'), grn = mat(G1), trim = mat('#FFFFFF');
      g.add(bx(W + 0.12, b0, Dp + 0.12, mat('#C9BBA2'), 0, b0 / 2, 0));
      g.add(bx(W, H, Dp, cream, 0, b0 + H / 2, 0));
      g.add(bx(W + 0.02, 0.34, Dp + 0.02, grn, 0, b0 + 0.17, 0));
      for (var i = 0; i < 13; i++) g.add(bx(0.02, 0.3, 0.02, mat(G2), -W / 2 + 0.08 + i * 0.154, b0 + 0.17, front + 0.015));
      g.add(bx(W + 0.04, 0.04, Dp + 0.04, trim, 0, b0 + 0.35, 0));
      [-1, 1].forEach(function (sd) { g.add(bx(0.08, H, 0.08, grn, sd * (W / 2 - 0.02), b0 + H / 2, front - 0.02)); });
      g.add(bx(W + 0.12, 0.1, Dp + 0.12, grn, 0, b0 + H + 0.03, 0));
      var wt = b0 + H + 0.06, ridge = roofOn(g, W, Dp, wt, 0.52, 0.2, '#8A5A44', cream, 0.12), tp = Math.tan(0.52);
      /* two dormers on the front slope: they read from above and glow at night */
      [-0.55, 0.55].forEach(function (x) {
        var dz = 0.28, dy = wt + (front - dz) * tp, d = new THREE.Group(); d.position.set(x, dy, dz);
        d.add(bx(0.3, 0.26, 0.34, cream, 0, 0.1, 0)); d.add(bx(0.2, 0.16, 0.04, winM, 0, 0.1, 0.17)); d.add(bx(0.24, 0.03, 0.05, trim, 0, 0.01, 0.18));
        var dr = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.2, 4), mat('#8A5A44')); dr.rotation.y = Math.PI / 4; dr.scale.set(1, 1, 1.3); dr.position.set(0, 0.33, 0); d.add(dr);
        g.add(d);
      });
      g.add(bx(0.2, 0.42, 0.2, mat('#C58F6A'), -0.72, ridge - 0.02, -0.28)); g.add(bx(0.25, 0.05, 0.25, mat('#8C6A52'), -0.72, ridge + 0.21, -0.28));
      /* a big steaming coffee cup sits on the ridge, tipped a little toward you so the latte art shows */
      g.add(bx(0.5, 0.06, 0.36, mat('#8F6238'), 0, ridge + 0.1, 0)); g.add(bx(0.08, 0.14, 0.08, mat('#8F6238'), 0, ridge + 0.02, 0));
      var cs = cupSign(G1); cs.position.set(0, ridge + 0.13, 0.04); cs.rotation.x = 0.5; cs.scale.setScalar(1.3); g.add(cs);
      /* arched shop windows */
      [-0.6, 0.6].forEach(function (x) {
        g.add(bx(0.56, 0.5, 0.05, grn, x, b0 + 0.6, front + 0.01));
        var ar = cyl(0.28, 0.28, 0.05, 14, grn, x, b0 + 0.85, front + 0.01); ar.rotation.x = Math.PI / 2; g.add(ar);
        g.add(bx(0.48, 0.46, 0.06, winM, x, b0 + 0.6, front + 0.02));
        var ag = cyl(0.24, 0.24, 0.06, 14, winM, x, b0 + 0.84, front + 0.02); ag.rotation.x = Math.PI / 2; g.add(ag);
        g.add(bx(0.02, 0.7, 0.07, grn, x, b0 + 0.7, front + 0.03)); g.add(bx(0.48, 0.02, 0.07, grn, x, b0 + 0.7, front + 0.03));
        g.add(bx(0.6, 0.05, 0.12, trim, x, b0 + 0.36, front + 0.06));
        g.add(bx(0.54, 0.1, 0.14, mat('#8F6238'), x, b0 + 0.27, front + 0.1));
        ['#F59BB5', '#FFFFFF', '#F7C84A', '#E86A5A', '#FFFFFF', '#F59BB5'].forEach(function (c, k) { var f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), mat(c)); f.position.set(x - 0.22 + k * 0.088, b0 + 0.35, front + 0.12); g.add(f); });
        g.add(bx(0.5, 0.04, 0.1, mat('#5BAA48'), x, b0 + 0.32, front + 0.11));
      });
      /* glass door with a green frame and a brass handle */
      g.add(bx(0.4, 0.66, 0.05, grn, 0, b0 + 0.33, front + 0.015));
      g.add(bx(0.3, 0.46, 0.06, winM, 0, b0 + 0.38, front + 0.025));
      g.add(bx(0.03, 0.12, 0.07, mat('#F2C14E'), 0.11, b0 + 0.33, front + 0.04));
      g.add(bx(0.5, 0.04, 0.24, mat('#D8CDB8'), 0, 0.02, front + 0.14));
      /* name board above the awning */
      var nb = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.28), new THREE.MeshLambertMaterial({ map: iconTex(CAFE_TXT, { '.': G2, c: '#FFF4E0' }) }));
      nb.position.set(0.05, b0 + H - 0.04, front + 0.035); g.add(nb); g.add(bx(1.04, 0.34, 0.03, mat('#8F6238'), 0.05, b0 + H - 0.04, front + 0.015));
      /* striped awning with a string of warm bulbs along its edge */
      (function () { var n = 9, sw = (W - 0.1) / n; for (var i = 0; i < n; i++) { var c0 = mat(i % 2 ? '#FFF6E4' : G1), st = bx(sw, 0.05, 0.3, c0, -(W - 0.1) / 2 + sw * (i + 0.5), b0 + 0.8, front + 0.14); st.rotation.x = 0.5; g.add(st);
        var sc = cyl(sw / 2, sw / 2, 0.05, 8, c0, -(W - 0.1) / 2 + sw * (i + 0.5), b0 + 0.72, front + 0.28); sc.rotation.x = Math.PI / 2; g.add(sc); } })();
      /* warm light spilling over the terrace after dark */
      var tl = new THREE.PointLight(0xFFC864, 0, 3.2); tl.position.set(0, b0 + 0.62, front + 0.55); g.add(tl); lamps.push(tl);
      for (var k = 0; k < 9; k++) { var bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), lampM); bl.position.set(-0.86 + k * 0.215, b0 + 0.62 - (k % 2) * 0.02, front + 0.34); g.add(bl); }
      /* little olive trees in pots by the door */
      [-0.3, 0.3].forEach(function (x) {
        g.add(cyl(0.08, 0.065, 0.14, 8, mat('#E6E0D2'), x, 0.07, front + 0.3));
        g.add(cyl(0.015, 0.015, 0.24, 5, trunkM, x, 0.26, front + 0.3));
        var cr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), mat('#7E9E5A')); cr.position.set(x, 0.42, front + 0.3); g.add(cr);
      });
      /* terrace: two round tables with striped umbrellas and chairs */
      [-0.78, 0.78].forEach(function (x, ti) {
        var z = front + 0.66, t = new THREE.Group(); t.position.set(x, 0, z);
        t.add(cyl(0.16, 0.16, 0.03, 10, trim, 0, 0.3, 0)); t.add(cyl(0.02, 0.02, 0.3, 5, darkM, 0, 0.15, 0)); t.add(cyl(0.08, 0.08, 0.02, 8, darkM, 0, 0.01, 0));
        t.add(cyl(0.012, 0.012, 0.5, 4, mat('#E6E0D2'), 0, 0.55, 0));
        for (var u = 0; u < 8; u++) { var seg = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.14, 8, 1, true, u * Math.PI / 4, Math.PI / 4), mat(u % 2 ? '#FFF6E4' : (ti ? '#E86A5A' : G1))); seg.material.side = THREE.DoubleSide; seg.position.y = 0.82; t.add(seg); }
        [-1, 1].forEach(function (sd) { var ch = new THREE.Group(); ch.position.set(sd * 0.26, 0, 0.02); ch.rotation.y = sd * 0.3;
          ch.add(bx(0.14, 0.03, 0.14, mat('#8F6238'), 0, 0.2, 0)); ch.add(bx(0.14, 0.16, 0.025, mat('#8F6238'), 0, 0.3, -sd * 0 - 0.06)); ch.add(bx(0.02, 0.2, 0.02, darkM, -0.05, 0.1, 0.05)); ch.add(bx(0.02, 0.2, 0.02, darkM, 0.05, 0.1, 0.05)); t.add(ch); });
        var cup = cyl(0.025, 0.02, 0.04, 6, trim, 0.05, 0.335, 0.03); t.add(cup);
        g.add(t);
      });
      aFrame(g, 1.22, front + 0.25, -0.3, '#2F3A33');
      g.scale.setScalar(1.2); return shade(g);
    }
    /* restaurant: cream stucco with a brick base, red roof, red-and-white awning, bowl sign and a paper lantern */
    function diner() {
      var g = new THREE.Group(), W = 1.9, Dp = 1.2, H = 0.92, front = Dp / 2, wallC = mat('#FFF1DC');
      g.add(bx(W + 0.06, 0.26, Dp + 0.06, mat('#C2664E'), 0, 0.13, 0));
      for (var i = 0; i < 9; i++) g.add(bx(0.02, 0.24, 0.02, mat('#A9533F'), -W / 2 + 0.1 + i * 0.21, 0.13, front + 0.035));
      g.add(bx(W, H - 0.2, Dp, wallC, 0, 0.26 + (H - 0.2) / 2, 0));
      var ridge = roofOn(g, W, Dp, 0.26 + H - 0.2, 0.5, 0.2, '#E05A4F', wallC, 0.12);
      g.add(bx(0.34, 0.5, 0.05, mat('#8F4A33'), -0.42, 0.26 + 0.2, front + 0.02));
      g.add(bx(0.12, 0.16, 0.06, winM, -0.42, 0.26 + 0.32, front + 0.03));
      windowAt(g, 0.36, 0.26 + 0.34, front + 0.01, '#E05A4F', 0.4);
      awning(g, W - 0.1, 0.26 + 0.66, front + 0.17, '#E05A4F', '#FFFFFF', 8);
      var lt = cyl(0.1, 0.1, 0.22, 8, mat('#E84F3D', { emissive: new THREE.Color(0x401008) }), -0.78, 0.26 + 0.52, front + 0.12); g.add(lt);
      g.add(cyl(0.11, 0.11, 0.03, 8, darkM, -0.78, 0.26 + 0.64, front + 0.12)); g.add(cyl(0.11, 0.11, 0.03, 8, darkM, -0.78, 0.26 + 0.4, front + 0.12));
      /* a ramen bowl with chopsticks on the ridge: noodles, a half egg, naruto and spring onion show from above */
      g.add(bx(0.56, 0.06, 0.38, mat('#8F4A33'), 0, ridge + 0.1, 0)); g.add(bx(0.08, 0.14, 0.08, mat('#8F4A33'), 0, ridge + 0.02, 0));
      var rs = ramenSign(); rs.position.set(0, ridge + 0.13, 0.04); rs.rotation.x = 0.5; rs.scale.setScalar(1.3); g.add(rs);
      aFrame(g, 0.88, front + 0.42, -0.3, '#2F3A33');
      plantPot(g, -0.1, front + 0.3, '#5BAA48');
      g.scale.setScalar(1.2); return shade(g);
    }
    /* bus stop: a little wooden shelter with a blue roof, bench, timetable and a round bus sign */
    function busStop() {
      var g = new THREE.Group(), post = mat('#8F6238');
      [[-0.62, -0.42], [0.62, -0.42], [-0.62, 0.12], [0.62, 0.12]].forEach(function (c) { g.add(cyl(0.045, 0.05, 0.92, 6, post, c[0], 0.46, c[1])); });
      g.add(bx(1.3, 0.5, 0.05, mat('#E3BE86'), 0, 0.55, -0.44));
      var r1 = bx(1.5, 0.08, 0.5, mat('#5A8BD0'), 0, 1.02, -0.27); r1.rotation.x = -0.32; g.add(r1);
      var r2 = bx(1.5, 0.08, 0.36, mat('#5A8BD0'), 0, 1.02, 0.12); r2.rotation.x = 0.32; g.add(r2);
      g.add(bx(1.54, 0.05, 0.05, mat('#FFFFFF'), 0, 0.98, 0.3));
      g.add(bx(1.0, 0.07, 0.28, woodM, 0, 0.3, -0.26)); g.add(bx(0.05, 0.28, 0.24, darkM, -0.42, 0.14, -0.26)); g.add(bx(0.05, 0.28, 0.24, darkM, 0.42, 0.14, -0.26));
      g.add(bx(0.32, 0.24, 0.03, mat('#FFFFFF'), 0.32, 0.62, -0.41));
      [0, 1, 2].forEach(function (k) { g.add(bx(0.22, 0.02, 0.035, mat('#9AA6B8'), 0.32, 0.68 - k * 0.06, -0.405)); });
      g.add(cyl(0.03, 0.03, 1.2, 5, darkM, 0.95, 0.6, 0.15));
      var sg = roundSign(iconTex(BUS, { '.': '#FFFFFF', b: '#4A78B5', w: '#CFE8F5', y: '#F7C84A', k: '#2A1E16' }), '#4A78B5', 0.2);
      sg.position.set(0.95, 1.25, 0.18); g.add(sg);
      g.scale.setScalar(1.1); return shade(g);
    }
    /* shared office: everyone who is at work shows up here, as if we all worked in the same place */
    function officeB() {
      var g = new THREE.Group(), W = 2.1, Dp = 1.25, H = 1.35, front = Dp / 2, wallM = mat('#E3ECF6'), trim = mat('#FFFFFF');
      g.add(bx(W + 0.08, 0.12, Dp + 0.08, mat('#B8B3AA'), 0, 0.06, 0));
      g.add(bx(W, H, Dp, wallM, 0, 0.12 + H / 2, 0));
      g.add(bx(W + 0.16, 0.12, Dp + 0.16, mat('#6E8FB8'), 0, 0.12 + H + 0.06, 0));
      g.add(bx(W + 0.2, 0.06, Dp + 0.2, trim, 0, 0.12 + H, 0));
      g.add(bx(W, 0.04, 0.04, trim, 0, 0.12 + H * 0.52, front + 0.02));
      [-0.72, -0.24, 0.24, 0.72].forEach(function (x) { g.add(bx(0.32, 0.3, 0.05, winM, x, 0.12 + H * 0.78, front + 0.02)); g.add(bx(0.36, 0.04, 0.07, trim, x, 0.12 + H * 0.78 - 0.17, front + 0.03)); });
      [-0.72, 0.72].forEach(function (x) { g.add(bx(0.32, 0.3, 0.05, winM, x, 0.12 + H * 0.3, front + 0.02)); g.add(bx(0.36, 0.04, 0.07, trim, x, 0.12 + H * 0.3 - 0.17, front + 0.03)); });
      g.add(bx(0.62, 0.6, 0.04, mat('#5F7DA6'), 0, 0.12 + 0.3, front + 0.01));
      g.add(bx(0.26, 0.52, 0.05, winM, -0.14, 0.12 + 0.28, front + 0.02)); g.add(bx(0.26, 0.52, 0.05, winM, 0.14, 0.12 + 0.28, front + 0.02));
      var aw = bx(0.8, 0.05, 0.3, mat('#6E8FB8'), 0, 0.12 + 0.68, front + 0.14); aw.rotation.x = 0.3; g.add(aw);
      var sg = roundSign(iconTex(BAG, { '.': '#FFFFFF', b: '#6E8FB8', k: '#3F5F8A', y: '#F7C84A' }), '#3F5F8A', 0.26);
      sg.position.set(0, 0.12 + H + 0.42, front - 0.1); g.add(sg); g.add(bx(0.06, 0.24, 0.06, mat('#3F5F8A'), 0, 0.12 + H + 0.18, front - 0.12));
      plantPot(g, -0.45, front + 0.28); plantPot(g, 0.45, front + 0.28, '#7CC25C');
      g.scale.setScalar(1.1); return shade(g);
    }
    /* town hall: stone walls, a teal gable with a clock, double doors, flag */
    function townHall() {
      var g = new THREE.Group(), W = 2.4, Dp = 1.4, H = 1.0, front = Dp / 2, stone = mat('#EFE3CC'), trim = mat('#FFFFFF');
      g.add(bx(W + 0.14, 0.14, Dp + 0.14, mat('#BFB29C'), 0, 0.07, 0));
      g.add(bx(W, H, Dp, stone, 0, 0.14 + H / 2, 0));
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (c) { g.add(bx(0.12, H, 0.12, mat('#D9CBB0'), c[0] * (W / 2), 0.14 + H / 2, c[1] * (Dp / 2))); });
      var ridge = roofOn(g, W, Dp, 0.14 + H, 0.45, 0.2, '#4FA3A0', stone, 0.13);
      /* front gable porch with a clock */
      var porch = new THREE.Group(); porch.position.set(0, 0, front + 0.22); g.add(porch);
      porch.add(bx(0.9, H + 0.1, 0.4, stone, 0, 0.14 + (H + 0.1) / 2, 0));
      var pr = new THREE.Group(); pr.position.set(0, 0, 0); porch.add(pr);
      roofOn(pr, 0.4, 0.9, 0.14 + H + 0.1, 0.9, 0.08, '#4FA3A0', stone, 0.1);
      pr.rotation.y = Math.PI / 2; pr.scale.set(1, 1, 1);
      var ck = cyl(0.17, 0.17, 0.05, 14, trim, 0, 0.14 + H + 0.32, 0.22); ck.rotation.x = Math.PI / 2; porch.add(ck);
      porch.add(bx(0.02, 0.12, 0.06, darkM, 0, 0.14 + H + 0.36, 0.25)); porch.add(bx(0.09, 0.02, 0.06, darkM, 0.04, 0.14 + H + 0.32, 0.25));
      porch.add(bx(0.5, 0.62, 0.04, mat('#8F6238'), 0, 0.14 + 0.31, 0.2));
      porch.add(bx(0.02, 0.56, 0.06, darkM, 0, 0.14 + 0.29, 0.22));
      [-0.06, 0.06].forEach(function (x) { var kn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), mat('#F2C14E')); kn.position.set(x, 0.14 + 0.3, 0.24); porch.add(kn); });
      porch.add(bx(1.0, 0.08, 0.3, mat('#D8CDB8'), 0, 0.04, 0.32));
      windowAt(g, -0.82, 0.14 + 0.55, front + 0.01, '#4FA3A0', 0.3);
      windowAt(g, 0.82, 0.14 + 0.55, front + 0.01, '#4FA3A0', 0.3);
      /* flagpole with a leaf flag */
      /* flagpole stands on the hall's own front yard (it used to stick out past the side of the lot) */
      var fx0 = -W / 2 + 0.12, fz0 = front + 0.62;
      g.add(bx(0.16, 0.06, 0.16, mat('#BFB29C'), fx0, 0.03, fz0));
      g.add(cyl(0.025, 0.03, 1.9, 6, mat('#D9D9D9'), fx0, 0.95, fz0));
      var fl = new THREE.Group(); fl.position.set(fx0, 1.72, fz0); g.add(fl); g.flag = fl;
      fl.add(bx(0.42, 0.28, 0.02, mat('#7CC25C'), 0.22, 0, 0));
      fl.add(bx(0.12, 0.14, 0.03, mat('#FFFFFF'), 0.22, 0, 0.01));
      g.scale.setScalar(1.05); return shade(g);
    }
    /* notice board: two posts, a little roof, cork board with paper notes pinned on it */
    function noticeBoard() {
      var g = new THREE.Group(), wd = mat('#8F6238');
      g.add(cyl(0.05, 0.06, 1.2, 6, wd, -0.48, 0.6, 0)); g.add(cyl(0.05, 0.06, 1.2, 6, wd, 0.48, 0.6, 0));
      g.add(bx(0.96, 0.62, 0.06, mat('#A9774A'), 0, 0.78, 0.02));
      g.add(bx(0.86, 0.52, 0.07, mat('#D9A86C'), 0, 0.78, 0.03));
      [['#FFFFFF', -0.24, 0.88, 0.1], ['#FFE9A0', 0.02, 0.84, -0.08], ['#F9CFE0', 0.26, 0.9, 0.06], ['#CFE8F5', -0.12, 0.64, -0.05], ['#FFFFFF', 0.2, 0.64, 0.1]].forEach(function (n) {
        var nt = bx(0.2, 0.18, 0.02, mat(n[0]), n[1], n[2], 0.075); nt.rotation.z = n[3]; g.add(nt);
        var pn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02, 0), mat('#E84F3D')); pn.position.set(n[1], n[2] + 0.07, 0.09); g.add(pn);
      });
      var r1 = bx(1.16, 0.06, 0.34, mat('#4FA3A0'), 0, 1.2, -0.06); r1.rotation.x = -0.4; g.add(r1);
      var r2 = bx(1.16, 0.06, 0.34, mat('#4FA3A0'), 0, 1.2, 0.18); r2.rotation.x = 0.4; g.add(r2);
      g.scale.setScalar(1.05); return shade(g);
    }
    /* wooden arch bridge: curved plank deck, side beams, round-capped posts and sagging rope rails */
    /* yA / yB: deck height at the two ends. a level bridge arches over the water; a ramp bridge climbs from a bank up to the hill */
    function bridge(alongZ, yA, yB) {
      var outer = new THREE.Group(), g = new THREE.Group(), len = 2.1, wid = 1.0, n = 11, ramp = yA != null, rise = ramp ? 0.06 : 0.2;
      var pA = mat('#CC9A60'), pB = mat('#BB8852'), beamM = mat('#8F6238'), postM = mat('#7A5230'), capM = mat('#E3B573'), ropeM = mat('#EADBB0');
      var a0 = ramp ? yA : 0.1, a1 = ramp ? yB : 0.1;
      function deckY(x) { return a0 + (a1 - a0) * (x / len + 0.5) + Math.sin(Math.PI * (x / len + 0.5)) * rise; }
      function slope(x) { return Math.atan((a1 - a0) / len + Math.cos(Math.PI * (x / len + 0.5)) * rise * Math.PI / len); }
      if (ramp) [-0.75, -0.25, 0.25].forEach(function (lx) { [-1, 1].forEach(function (s) { var hh = deckY(lx) - 0.05; if (hh > 0.12) g.add(cyl(0.045, 0.055, hh + 0.1, 6, postM, lx, hh / 2 - 0.05, s * (wid / 2 - 0.08))); }); g.add(bx(0.06, 0.06, wid - 0.1, beamM, lx, deckY(lx) * 0.45, 0)); });
      for (var i = 0; i < n; i++) {
        var x = -len / 2 + (i + 0.5) * len / n;
        var p = bx(len / n - 0.035, 0.07, wid, i % 2 ? pA : pB, x, deckY(x), 0); p.rotation.z = slope(x); g.add(p);
        [-1, 1].forEach(function (s) { var b = bx(len / n + 0.01, 0.1, 0.07, beamM, x, deckY(x) - 0.06, s * (wid / 2 + 0.02)); b.rotation.z = slope(x); g.add(b); });
      }
      var postsX = [-len / 2 + 0.06, 0, len / 2 - 0.06];
      [-1, 1].forEach(function (s) {
        postsX.forEach(function (px) {
          var h = 0.42, base = deckY(px) - 0.08;
          g.add(cyl(0.05, 0.06, h, 6, postM, px, base + h / 2, s * (wid / 2 + 0.02)));
          var cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), capM); cap.position.set(px, base + h + 0.03, s * (wid / 2 + 0.02)); g.add(cap);
        });
        for (var k = 0; k < postsX.length - 1; k++) {
          var x0 = postsX[k], x1 = postsX[k + 1], seg = 6;
          for (var j = 0; j < seg; j++) {
            var ta = j / seg, tb = (j + 1) / seg;
            var xa = x0 + (x1 - x0) * ta, xb = x0 + (x1 - x0) * tb;
            var ya = deckY(xa) + 0.26 - Math.sin(Math.PI * ta) * 0.07, yb = deckY(xb) + 0.26 - Math.sin(Math.PI * tb) * 0.07;
            var sl = Math.hypot(xb - xa, yb - ya), r = bx(sl + 0.01, 0.03, 0.03, ropeM, (xa + xb) / 2, (ya + yb) / 2, s * (wid / 2 + 0.02));
            r.rotation.z = Math.atan2(yb - ya, xb - xa); g.add(r);
          }
        }
      });
      outer.add(g); if (alongZ) g.rotation.y = Math.PI / 2;
      return shade(outer);
    }
    function dock() {
      var g = new THREE.Group();
      for (var i = 0; i < 5; i++) g.add(bx(0.9, 0.08, 0.3, i % 2 ? woodM2 : woodM, 0, 0.12, -0.64 + i * 0.32));
      [[-0.42, -0.75], [0.42, -0.75], [-0.42, 0.75], [0.42, 0.75]].forEach(function (p) { g.add(cyl(0.05, 0.05, 0.5, 5, woodM2, p[0], 0.02, p[1])); });
      return shade(g);
    }
    var LEAVES_S = {
      spring: [['#F7BFD6', '#FBD8E6'], ['#F4A9C8', '#F9CADD'], ['#6CB34E', '#8BCB63'], ['#F7BFD6', '#FFE3EE']],
      summer: [['#3F8F3A', '#5BAA48'], ['#4A9A3E', '#66B552'], ['#357F33', '#4F9E42'], ['#5BAA48', '#77C25C']],
      autumn: [['#E8A23A', '#F2C14E'], ['#D9653B', '#E8A23A'], ['#C9503A', '#E07A45'], ['#F2C14E', '#F7DC7A']],
      winter: [['#DCE6EC', '#F4F8FA'], ['#C9D6DD', '#EEF3F6'], ['#8FA79A', '#E8EFF2'], ['#DCE6EC', '#FFFFFF']]
    };
    var treeMats = [];
    function tree(seed, kind, big) {
      var g = new THREE.Group(), lc = LEAVES_S[curSeason][kind % 4], s = big ? 1.6 : 1;
      g.add(cyl(0.09 * s, 0.13 * s, 0.5 * s, 5, trunkM, 0, 0.25 * s, 0));
      var a = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52 * s, 0), mat(lc[0])); a.position.y = 0.82 * s; a.rotation.set(seed, seed * 2, 0); g.add(a);
      var b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38 * s, 0), mat(lc[1])); b.position.set(0.05, 1.18 * s, 0.05); b.rotation.y = seed; g.add(b);
      treeMats.push({ a: a.material, b: b.material, kind: kind });
      g.phase = seed * 3.1; swayers.push(g); return shade(g);
    }
    function palm() {
      var g = new THREE.Group();
      for (var i = 0; i < 5; i++) g.add(cyl(0.08, 0.1, 0.3, 5, mat(i % 2 ? '#A97B4F' : '#8A5A3B'), i * 0.05, 0.15 + i * 0.28, 0));
      var lm = mat('#3E8E4A');
      for (var j = 0; j < 5; j++) { var l = bx(0.9, 0.04, 0.22, lm, 0, 0, 0), an = (j / 5) * Math.PI * 2; l.position.set(0.25 + Math.cos(an) * 0.38, 1.5, Math.sin(an) * 0.38); l.rotation.set(0, -an, -0.35); g.add(l); }
      g.phase = 1.7; swayers.push(g); return shade(g);
    }
    function flower(hex) { var g = new THREE.Group(), m = mat(hex); [[-0.1, 0], [0.1, 0.05], [0, -0.1]].forEach(function (p) { g.add(bx(0.12, 0.14, 0.12, m, p[0], 0.07, p[1])); }); return shade(g); }
    function bench() { var g = new THREE.Group(); g.add(bx(0.9, 0.06, 0.3, woodM, 0, 0.3, 0)); g.add(bx(0.9, 0.22, 0.05, woodM, 0, 0.45, -0.14)); g.add(bx(0.06, 0.3, 0.26, darkM, -0.38, 0.15, 0)); g.add(bx(0.06, 0.3, 0.26, darkM, 0.38, 0.15, 0)); return shade(g); }
    function lamp() {
      var g = new THREE.Group();
      g.add(cyl(0.04, 0.05, 0.9, 5, darkM, 0, 0.45, 0)); g.add(bx(0.18, 0.2, 0.18, lampM, 0, 0.98, 0));
      var pl = new THREE.PointLight(0xFFC864, 0, 4.5); pl.position.y = 0.98; g.add(pl); lamps.push(pl);
      return shade(g);
    }
    function isTier(x, z) { return x >= -7 && x <= 0.6 && z >= -13 && z <= -7; }
    var KIND_ORDER = ['hanok', 'cabin', 'brick', 'zen', 'tower', 'modern', 'cottage'];
    var HOUSES = {}; Object.keys(D.F).forEach(function (id, hi) { var f = D.F[id], hy = isTier(f.house[0], f.house[1]) ? 1 : 0, kind = f.kind || (id === 'me' ? 'cottage' : KIND_ORDER[(hi - 1) % KIND_ORDER.length]); HOUSES[id] = { g: put(house(f.roof, kind), f.house[0], hy, f.house[1]), x: f.house[0], y: hy, z: f.house[1], kind: kind }; });
    put(cafe(), L.cafe.x, 0, L.cafe.z);
    put(diner(), L.diner.x, 0, L.diner.z);
    var stop = put(busStop(), 4.5, 0, -0.6);
    var office = put(officeB(), L.office.x, 0, L.office.z);
    var hall = put(townHall(), L.hall.x, 0, L.hall.z);
    var nboard = put(noticeBoard(), L.board.x, 0, L.board.z);
    /* everything the lottery put down keeps a clear yard; trees, flowers and lamps that would stand in it are left out */
    var YARD = [[L.cafe.x, L.cafe.z, 1.3, 0.86, 1.7], [L.diner.x, L.diner.z, 1.2, 0.84, 1.6], [L.office.x, L.office.z, 1.22, 0.78, 1.2], [L.hall.x, L.hall.z, 1.38, 0.82, 1.3], [L.board.x, L.board.z, 0.6, 0.15, 0.6]];
    Object.keys(D.F).forEach(function (id) { var hh = D.F[id].house; YARD.push([hh[0], hh[1], 0.86, 0.72, 1.4]); });
    function inYard(x, z) { return YARD.some(function (y) { return Math.abs(x - y[0]) < y[2] + 0.45 && z > y[1] - y[3] - 0.45 && z < y[1] + y[3] + y[4]; }); }
    put(bridge(true), -1.2, 0, -3.9); put(bridge(false, 1.02, 0.08), 1.6, 0, -9); put(bridge(false), -3.6, 0, 1.6);
    put(dock(), 3, 0, 3.75);
    function fountain() {
      var g = new THREE.Group(), stoneM = mat('#C9BFAE'), stoneM2 = mat('#DDD5C6'), fw = mat('#8EBFE0', { emissive: new THREE.Color(0x06162A) });
      g.add(cyl(0.88, 0.96, 0.34, 14, stoneM, 0, 0.17, 0));
      g.add(cyl(0.92, 0.92, 0.06, 14, stoneM2, 0, 0.36, 0));
      g.add(cyl(0.76, 0.76, 0.04, 14, fw, 0, 0.34, 0));
      g.add(cyl(0.12, 0.16, 0.7, 8, stoneM2, 0, 0.6, 0));
      g.add(cyl(0.36, 0.2, 0.12, 10, stoneM2, 0, 0.95, 0));
      g.add(cyl(0.3, 0.3, 0.03, 10, fw, 0, 1.0, 0));
      g.spray = [];
      for (var i = 0; i < 6; i++) { var dr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), mat('#F2F8FF')); dr.position.set(0, 1.05, 0); g.add(dr); g.spray.push(dr); }
      return shade(g);
    }
    var fnt = put(fountain(), 0.95, 0, -1.1);
    put(bench(), 0.95, 0, -2.65);
    var TREES = [[-6.7, 1, -7.6, 1], [-6.4, 1, -12.9, 2], [-3.4, 1, -12.6, 0], [-3.7, 1, -8.3, 3], [-0.2, 0, -15, 3], [6.2, 0, -10, 1],
     [7.0, 0, -14.6, 2], [-7.2, 0, -6.9, 0], [-2.35, 0, -0.4, 3], [7.0, 0, -6.0, 2], [-7.0, 0, -0.3, 0], [6.9, 0, -1.6, 1], [-4.9, 0, -3.0, 2]].filter(function (t) { return !inYard(t[0], t[2]); });
    /* lots nobody lives on grow a little grove instead */
    L.empty.forEach(function (e, i) { var ty = isTier(e[0], e[1]) ? 1 : 0; TREES.push([e[0] - 0.45, ty, e[1] - 0.2, i % 4], [e[0] + 0.55, ty, e[1] + 0.3, (i + 2) % 4]); });
    TREES.forEach(function (t, i) { put(tree(i * 0.7, t[3], false), t[0], t[1], t[2]); });
    put(palm(), -7.4, 0, 2.2);
    [[-3.3, 1, -8.6, '#F59BB5'], [-5.1, 1, -8.6, '#FFFFFF'], [0.0, 1, -8.6, '#F7C84A'], [-4.6, 0, -5.4, '#F59BB5'], [2.3, 0, 0.6, '#FFFFFF'],
     [-0.4, 0, -2.0, '#F7C84A'], [6.0, 0, -1.6, '#F59BB5'], [-6.2, 0, -3.4, '#FFFFFF'], [4.4, 0, -3.3, '#F59BB5'], [-4.5, 0, -0.7, '#F7C84A']].filter(function (f) { return !inYard(f[0], f[2]); }).forEach(function (f) { put(flower(f[3]), f[0], f[1], f[2]); });
    L.empty.forEach(function (e) { var ty = isTier(e[0], e[1]) ? 1 : 0; put(flower('#F59BB5'), e[0] + 0.1, ty, e[1] + 0.9); put(flower('#FFFFFF'), e[0] - 0.7, ty, e[1] + 0.7); });
    [[-0.4, 0, 0.9], [3.75, 0, -5.0], [-1.9, 1, -7.6]].forEach(function (p) { if (!inYard(p[0], p[2])) put(lamp(), p[0], p[1], p[2]); });
    var tapRing = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.24, 12), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    tapRing.rotation.order = 'XYZ'; scene.add(tapRing); var tapT = -1;

    /* ---------- villagers ---------- */
    var INK = { k: '#2A1E16', p: '#F49AA8', r: '#D9534F', b: '#7EC8F0', w: '#FFFFFF' };
    /* faces are 12x12 or 24x24; the head texture scales with them so a fine face keeps every pixel */
    function wrapPhoto(f, d, TW, TH, E, R0, rgb, INK) {
      /* the photo is laid on the front like before (so the face keeps its size), but its rim does not stop at the edge:
         the outer ring of the photo is stretched on round the sides, over the crown and down the back, so the picture
         wraps the whole head. backdrop cells ("x") beyond the front leave the plain head colour underneath */
      var N = f.rows.length, cE = Math.cos(E), sE = Math.sin(E), R = 0.47, CY = 0.52, K0 = 1.96;
      var core = function (t) { return (Math.sin(t) + t) / 2 / K0; }, THB = Math.PI * 0.92, TH0 = 0, hi = Math.PI / 2;
      /* the front keeps a gentle bulge: a little tighter toward the edge, as a picture on a ball would be */
      for (var it = 0; it < 30; it++) { var mid = (TH0 + hi) / 2; if (core(mid) < R0) TH0 = mid; else hi = mid; }
      for (var py = 0; py < TH; py++) {
        var phi = Math.PI / 2 - (py + 0.5) / TH * Math.PI, cp = Math.cos(phi), sp = Math.sin(phi);
        for (var px = 0; px < TW; px++) {
          var lam = ((px + 0.5) / TW - 0.25) * Math.PI * 2, X = cp * Math.sin(lam), Zf = cp * Math.cos(lam);
          var Zc = Zf * cE + sp * sE, Y = sp * cE - Zf * sE, th = Math.acos(Math.max(-1, Math.min(1, Zc)));
          if (th > THB) continue;
          var rr = Math.sqrt(X * X + Y * Y), ux = rr > 1e-6 ? X / rr : 0, uy = rr > 1e-6 ? Y / rr : 0;
          var r = th <= TH0 ? core(th) : R0 + (th - TH0) / (THB - TH0) * (R - R0);
          var u = 0.5 + r * ux, v = CY - r * uy; if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
          var ch = f.rows[(v * N) | 0].charAt((u * N) | 0); if (ch === 'x') continue;
          var hex = ch === '.' ? f.skin : ch === 'h' ? f.hair : ((f.ink && f.ink[ch]) || INK[ch] || f.skin), q = rgb(hex), k = (py * TW + px) * 4;
          d[k] = q[0]; d[k + 1] = q[1]; d[k + 2] = q[2]; d[k + 3] = 255;
        }
      }
    }
    function faceTex(f) {
      var N = f.rows.length, S = 8, t = canvasTex(48 * S, 24 * S), x = t.ctx;
      x.save(); x.scale(S, S);
      x.fillStyle = f.skin; x.fillRect(0, 0, 48, 24);
      /* a photo face carries its own hair; the rest of the head (crown, back, sides) takes the photo's hair colour */
      if (f.photo) { x.fillStyle = f.hair; x.fillRect(0, 0, 48, 16.5); }
      else if (f.style !== 'none') {
        /* the face window is columns 6-17; everything else around the head is hair, down to the ears (short) or the shoulders (long) */
        var back = f.style === 'long' ? 21 : 13, side = f.style === 'long' ? 19 : 10;
        x.fillStyle = f.hair; x.fillRect(0, 0, 48, 4);
        x.fillRect(18, 0, 30, back); x.fillRect(0, 0, 6, back);
        x.fillRect(5, 4, 1, side); x.fillRect(18, 4, 1, side);
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(19, back - 1, 29, 1); x.fillRect(0, back - 1, 5, 1);
      }
      x.restore();
      /* the face is laid on the round head like a sticker, not stretched like a map: every texel of the front of the sphere
         asks "where would I appear seen from the camera (a little above)?" and takes that face cell. this keeps rows even,
         instead of tall cells round the middle of the head and squashed ones near the top */
      var K = 8, TW = 48 * K, TH = 24 * K, E = 0.38, cE = Math.cos(E), sE = Math.sin(E);
      var PH = !!f.photo, top = PH ? 0.98 : Math.sin(Math.PI / 3 - E), half = PH ? 0.98 : 0.66, bot = PH ? -0.92 : top - half * 2, thr = PH ? 0.0 : 0.12;
      /* a drawn face is a sticker on the front; a photo face wraps the whole front half of the head (hair included) */
      var img = x.getImageData(0, 0, TW, TH), d = img.data, col = {};
      function rgb(hex) { if (col[hex]) return col[hex]; var c = document.createElement('canvas').getContext('2d'); c.fillStyle = hex; var v = c.fillStyle; var o = [parseInt(v.substr(1, 2), 16), parseInt(v.substr(3, 2), 16), parseInt(v.substr(5, 2), 16)]; col[hex] = o; return o; }
      if (PH) wrapPhoto(f, d, TW, TH, E, 0.42, rgb, INK); else
      for (var py = 0; py < TH * 0.86; py++) {
        var phi = Math.PI / 2 - (py + 0.5) / TH * Math.PI, cp = Math.cos(phi), sp = Math.sin(phi);
        for (var px = 0; px < TW / 2; px++) {
          var lam = ((px + 0.5) / TW - 0.25) * Math.PI * 2, X = cp * Math.sin(lam), Zf = cp * Math.cos(lam);
          if (Zf * cE + sp * sE < thr) continue;
          var Y = sp * cE - Zf * sE, fx = (X + half) / (half * 2) * N, fy = (top - Y) / (top - bot) * N;
          if (fx < 0 || fy < 0 || fx >= N || fy >= N) continue;
          var ch = f.rows[fy | 0].charAt(fx | 0); if (ch === '.' && !PH) continue; if (ch === 'x') continue; var hex = ch === '.' ? f.skin : ch === 'h' ? f.hair : ((f.ink && f.ink[ch]) || INK[ch] || f.skin), q = rgb(hex), k = (py * TW + px) * 4;
          d[k] = q[0]; d[k + 1] = q[1]; d[k + 2] = q[2]; d[k + 3] = 255;
        }
      }
      x.putImageData(img, 0, 0);
      t.t.needsUpdate = true; return t.t;
    }
    function clothMat(hex, pat) {
      if (!pat || pat === 'plain') return mat(hex);
      var t = canvasTex(8, 8), x = t.ctx; x.fillStyle = hex; x.fillRect(0, 0, 8, 8); x.fillStyle = '#FFFFFF';
      if (pat === 'stripe') { x.fillRect(0, 3, 8, 2); x.fillRect(0, 7, 8, 1); }
      if (pat === 'dots') { x.fillRect(1, 1, 1, 1); x.fillRect(5, 1, 1, 1); x.fillRect(3, 5, 1, 1); x.fillRect(7, 5, 1, 1); }
      if (pat === 'check') { x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(0, 0, 4, 4); x.fillRect(4, 4, 4, 4); }
      t.t.wrapS = t.t.wrapT = THREE.RepeatWrapping; t.t.repeat.set(3, 2); t.t.needsUpdate = true;
      return new THREE.MeshLambertMaterial({ map: t.t, flatShading: true });
    }
    /* a soft round shadow right under the feet, so people sit on the ground instead of hovering (every object in
       Animal Crossing grounds itself this way). two stepped rings, no smooth gradient, to stay pixel-like */
    var blobTex = null;
    function footShadow(r) {
      if (!blobTex) { var c = document.createElement('canvas'); c.width = c.height = 16; var x = c.getContext('2d');
        x.fillStyle = 'rgba(40,24,10,0.22)'; x.beginPath(); x.arc(8, 8, 7.5, 0, Math.PI * 2); x.fill();
        x.fillStyle = 'rgba(40,24,10,0.2)'; x.beginPath(); x.arc(8, 8, 5, 0, Math.PI * 2); x.fill();
        blobTex = new THREE.CanvasTexture(c); blobTex.magFilter = blobTex.minFilter = THREE.NearestFilter; }
      var m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.renderOrder = 1; return m;
    }
    function person(f) {
      var g = new THREE.Group(), body = new THREE.Group(), sh = clothMat(f.shirt, f.pattern), skin = mat(f.skin), shoe = mat('#5A3E2B');
      g.add(body);
      body.add(cyl(0.2, 0.27, 0.36, 8, sh, 0, 0.38, 0));
      g.legs = [-1, 1].map(function (s) {
        var hip = new THREE.Group(); hip.position.set(s * 0.1, 0.22, 0);
        hip.add(bx(0.11, 0.17, 0.12, darkM, 0, -0.085, 0)); hip.add(bx(0.12, 0.06, 0.18, shoe, 0, -0.19, 0.03));
        body.add(hip); return hip;
      });
      g.arms = [-1, 1].map(function (s) {
        var sj = new THREE.Group(); sj.position.set(s * 0.22, 0.52, 0);
        sj.add(cyl(0.05, 0.05, 0.26, 5, sh, 0, -0.13, 0));
        var hn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), skin); hn.position.set(0, -0.28, 0); sj.add(hn);
        sj.rotation.z = s * 0.28; sj.baseZ = s * 0.28; body.add(sj); return sj;
      });
      var neck = new THREE.Group(); neck.position.y = 0.56; body.add(neck);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshLambertMaterial({ map: faceTex(f) })); head.position.y = 0.33; neck.add(head);
      g.body = body; g.neck = neck;
      g.scale.setScalar(1.0); shade(g); g.add(footShadow(0.34)); return g;
    }
    function ghostFig() {
      var g = new THREE.Group(), gm = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true, transparent: true, opacity: 0.8 });
      var h = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), gm); h.position.y = 0.8; g.add(h);
      var sk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.6, 10), gm); sk.position.y = 0.35; g.add(sk);
      g.add(bx(0.08, 0.13, 0.04, blackM, -0.14, 0.85, 0.39)); g.add(bx(0.08, 0.13, 0.04, blackM, 0.14, 0.85, 0.39));
      g.add(bx(0.1, 0.05, 0.03, mat('#F4A6B8'), -0.25, 0.72, 0.34)); g.add(bx(0.1, 0.05, 0.03, mat('#F4A6B8'), 0.25, 0.72, 0.34));
      g.scale.setScalar(1.25); return g;
    }
    /* walkable grid, 0.5 units per cell; cliffs only connect through the ramp */
    var GX0 = -9, GZ0 = -17.5, GS = 0.5, GWc = 36, GHc = 43;
    function onBridge(x, z) { return (Math.abs(x + 1.2) <= 0.5 && Math.abs(z + 3.9) <= 1.1) || (Math.abs(x - 1.6) <= 1.1 && Math.abs(z + 9) <= 0.5) || (Math.abs(x + 3.6) <= 1.1 && Math.abs(z - 1.6) <= 0.5); }
    function onHallBridge(x, z) { return Math.abs(x - 1.6) <= 1.1 && Math.abs(z + 9) <= 0.5; }
    function hallDeck(x) { return Math.max(0.08, Math.min(1, 1.02 + (0.08 - 1.02) * ((x - 1.6) / 2.1 + 0.5))); }
    function onDock(x, z) { return Math.abs(x - 3) <= 0.45 && z >= 2.6 && z <= 4.5; }
    function isRamp(x, z) { return Math.abs(x + 1.2) <= 0.5 && z >= -7.6 && z <= -5.2; }
    var OBST = [];
    Object.keys(D.F).forEach(function (id) { var hh = D.F[id].house; OBST.push({ r: 0, x: hh[0], z: hh[1], hw: 0.86, hd: 0.72 }, { r: 0.13, x: hh[0] - 0.95, z: hh[1] + 1.03 }); });
    OBST.push({ r: 0, x: L.cafe.x, z: L.cafe.z, hw: 1.3, hd: 0.86 }, { r: 0, x: L.diner.x, z: L.diner.z, hw: 1.2, hd: 0.84 }, { r: 0, x: 4.5, z: -0.85, hw: 0.82, hd: 0.34 }, { r: 0.2, x: L.cafe.x + 1.38, z: L.cafe.z + 1.0 }, { r: 0.2, x: L.diner.x + 1.06, z: L.diner.z + 1.14 },
      { r: 1.05, x: 0.95, z: -1.1 }, { r: 0, x: 0.95, z: -2.65, hw: 0.5, hd: 0.2 }, { r: 0.4, x: -7.4, z: 2.2 }, { r: 0, x: L.office.x, z: L.office.z, hw: 1.22, hd: 0.78 }, { r: 0, x: L.hall.x, z: L.hall.z, hw: 1.38, hd: 0.82 }, { r: 0, x: L.hall.x, z: L.hall.z + 0.95, hw: 0.52, hd: 0.3 }, { r: 0.16, x: L.hall.x - 1.48, z: L.hall.z + 0.8 }, { r: 0, x: L.board.x, z: L.board.z, hw: 0.6, hd: 0.15 });
    TREES.forEach(function (t) { OBST.push({ r: 0.36, x: t[0], z: t[2] }); });
    function blocked(x, z) {
      for (var i = 0; i < OBST.length; i++) { var o = OBST[i];
        if (o.r) { if ((x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) < o.r * o.r) return true; }
        else if (Math.abs(x - o.x) < o.hw && Math.abs(z - o.z) < o.hd) return true; }
      return false;
    }
    function walkable(x, z) {
      if (onDock(x, z)) return true;
      if (isSea(x, z) || z > 3.2) return false;
      if (inRiver(x, z) && !onBridge(x, z)) return false;
      return !blocked(x, z);
    }
    function level(x, z) { return isRamp(x, z) || onHallBridge(x, z) ? 1 : isTier(x, z) ? 2 : 0; }
    function heightAt(x, z) {
      if (onHallBridge(x, z)) return hallDeck(x);
      if (isRamp(x, z) && z > -7.0) return Math.max(0, Math.min(1, (-5.4 - z) / 1.6));
      if (isTier(x, z)) return 1;
      if (onDock(x, z)) return 0.12;
      if (onBridge(x, z) && inRiver(x, z)) return 0.26;
      return 0;
    }
    var gWalk = new Uint8Array(GWc * GHc), gLvl = new Uint8Array(GWc * GHc), gH = new Float32Array(GWc * GHc);
    function cx(i) { return GX0 + (i + 0.5) * GS; } function cz(j) { return GZ0 + (j + 0.5) * GS; }
    for (var gj = 0; gj < GHc; gj++) for (var gi2 = 0; gi2 < GWc; gi2++) { var k2 = gj * GWc + gi2; gWalk[k2] = walkable(cx(gi2), cz(gj)) ? 1 : 0; gLvl[k2] = level(cx(gi2), cz(gj)); gH[k2] = heightAt(cx(gi2), cz(gj)); }
    function canStep(a, b) { var la = gLvl[a], lb = gLvl[b]; return (la === lb || la === 1 || lb === 1) && Math.abs(gH[a] - gH[b]) <= 0.34; }
    function cellOf(x, z) { return [Math.max(0, Math.min(GWc - 1, Math.floor((x - GX0) / GS))), Math.max(0, Math.min(GHc - 1, Math.floor((z - GZ0) / GS)))]; }
    function nearestWalk(i, j) {
      if (gWalk[j * GWc + i]) return [i, j];
      for (var rr = 1; rr < 6; rr++) for (var dj = -rr; dj <= rr; dj++) for (var di = -rr; di <= rr; di++) {
        var ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= GWc || nj >= GHc) continue;
        if (gWalk[nj * GWc + ni]) return [ni, nj];
      }
      return null;
    }
    function astar(sx, sz, tx, tz) {
      var s0 = cellOf(sx, sz), t0 = cellOf(tx, tz);
      s0 = nearestWalk(s0[0], s0[1]); t0 = nearestWalk(t0[0], t0[1]); if (!s0 || !t0) return null;
      var N = GWc * GHc, start = s0[1] * GWc + s0[0], goal = t0[1] * GWc + t0[0];
      var g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), open = [start];
      g[start] = 0;
      function hh(k) { var dx = Math.abs(k % GWc - t0[0]), dz = Math.abs(((k / GWc) | 0) - t0[1]); return Math.max(dx, dz) + 0.41 * Math.min(dx, dz); }
      while (open.length) {
        var bi = 0; for (var q = 1; q < open.length; q++) if (g[open[q]] + hh(open[q]) < g[open[bi]] + hh(open[bi])) bi = q;
        var cur = open[bi]; open.splice(bi, 1);
        if (cur === goal) break;
        if (closed[cur]) continue; closed[cur] = 1;
        var ci = cur % GWc, cj = (cur / GWc) | 0;
        for (var dz2 = -1; dz2 <= 1; dz2++) for (var dx2 = -1; dx2 <= 1; dx2++) {
          if (!dx2 && !dz2) continue;
          var ni = ci + dx2, nj = cj + dz2; if (ni < 0 || nj < 0 || ni >= GWc || nj >= GHc) continue;
          var nk = nj * GWc + ni; if (!gWalk[nk] || closed[nk] || !canStep(cur, nk)) continue;
          if (dx2 && dz2 && (!gWalk[cj * GWc + ni] || !gWalk[nj * GWc + ci])) continue;
          var ng = g[cur] + (dx2 && dz2 ? 1.414 : 1);
          if (ng < g[nk]) { g[nk] = ng; from[nk] = cur; open.push(nk); }
        }
      }
      if (from[goal] < 0 && goal !== start) return null;
      var cells = []; for (var k3 = goal; k3 >= 0; k3 = from[k3]) { cells.push(k3); if (k3 === start) break; }
      cells.reverse();
      return cells.map(function (k4) { var x = cx(k4 % GWc), z = cz((k4 / GWc) | 0); return [x, heightAt(x, z), z]; });
    }
    function clearLine(a, b) {
      var d = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.ceil(d / 0.2)), ha = heightAt(a[0], a[2]);
      for (var i = 0; i <= n; i++) {
        var x = a[0] + (b[0] - a[0]) * i / n, z = a[2] + (b[2] - a[2]) * i / n;
        if (!walkable(x, z) || Math.abs(heightAt(x, z) - ha) > 0.02) return false;
      }
      return true;
    }
    function planPath(from, to) {
      var cells = astar(from[0], from[2], to[0], to[2]);
      if (!cells) return null;
      var raw = [from].concat(cells.slice(1)).concat([[to[0], heightAt(to[0], to[2]), to[2]]]);
      var out = [raw[0]], k = 0;
      while (k < raw.length - 1) {
        var far = k + 1;
        for (var j = raw.length - 1; j > k + 1; j--) if (clearLine(raw[k], raw[j])) { far = j; break; }
        out.push(raw[far]); k = far;
      }
      return out;
    }
    function targetFor(id, status, slot) {
      var f = D.F[id];
      if (status === 'home') { var hx = f.house[0], hz = f.house[1] + 1.05; return [hx, heightAt(hx, hz), hz]; }
      if (status === 'work') return [L.office.x, 0, L.office.z + 1.05];
      var sl = (D.SLOTS[status] || D.SLOTS.play)[slot] || [0, 0];
      return [sl[0], heightAt(sl[0], sl[1]), sl[1]];
    }
    function zoneAt(x, z) {
      if (Math.abs(x - L.cafe.x) <= 1.2 && z >= L.cafe.z + 0.5 && z <= L.cafe.z + 2.4) return 'cafe';
      if (Math.abs(x - L.diner.x) <= 1.2 && z >= L.diner.z + 0.5 && z <= L.diner.z + 2.4) return 'food';
      if ((x - 0.95) * (x - 0.95) + (z + 1.1) * (z + 1.1) < 3.6) return 'play';
      if (x >= 3.4 && x <= 5.6 && z >= -1.1 && z <= 0.9) return 'commute';
      if (Math.hypot(x - L.office.x, z - (L.office.z + 1.05)) < 0.8) return 'work';
      var mh = D.F.me.house; if (Math.hypot(x - mh[0], z - (mh[1] + 1.05)) < 1.2) return 'home';
      return 'walk';
    }
    function seglen(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 0.001; }
    var MY_SLOT = { cafe: 2, food: 2, play: 2, commute: 1 };
    var V = [];
    /* a stale outing: the figure stays where the status put them but turns see-through, like an old memory of them */
    function setFaded(v, on) {
      if (v.faded === on) return; v.faded = on;
      v.inner.traverse(function (o) {
        if (!o.material) return;
        if (!o.userData.ownMat) { o.material = Array.isArray(o.material) ? o.material.map(function (m) { return m.clone(); }) : o.material.clone(); o.userData.ownMat = true; }
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.transparent = on; m.opacity = on ? 0.38 : 1; m.depthWrite = !on; m.needsUpdate = true; });
      });
    }
    D.people.forEach(function (p, i) {
      var fr0 = self._fresh(p), f = D.F[p.id], v = { id: p.id, status: p.status, slot: p.slot || 0, stale: fr0.sleepy, faded: false, phase: i * 0.9, top: 1.3 };
      v.outer = new THREE.Group(); v.inner = person(f); v.outer.add(v.inner);
      if (p.id === 'me') { v.ghost = ghostFig(); v.ghost.visible = false; v.outer.add(v.ghost); }
      v.cur = targetFor(p.id, p.status, v.slot); put(v.outer, v.cur[0], v.cur[1], v.cur[2]);
      v.yaw = Math.atan2(-v.cur[0], 12 - v.cur[2]); v.curYaw = v.yaw; v.stride = 0; v.swing = 0;
      if (p.status === 'work') v.outer.visible = false;
      if (v.stale) { v.outer.visible = false; v.inside = true; }
      V.push(v);
      if (fr0.faded) setFaded(v, true);
    });
    var meV = V[0];
    var EV0 = self._events();
    function balloons(x, y, z) {
      var g = new THREE.Group();
      ['#F49AA8', '#FFD36B', '#9FC4E8'].forEach(function (c, i) {
        var bl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(c)); bl.scale.set(1, 1.15, 1); bl.position.set((i - 1) * 0.22, 1.55 + (i % 2) * 0.18, 0); g.add(bl);
        g.add(bx(0.01, 1.4, 0.01, mat('#FFFFFF'), (i - 1) * 0.11, 0.8, 0));
      });
      g.phase = 0.4; swayers.push(g); put(shade(g), x, y, z); return g;
    }
    V.forEach(function (v) {
      if (EV0.bdays.indexOf(v.id) < 0) return;
      var hat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 8), mat('#F49AA8')); hat.position.set(0.05, 0.92, 0); hat.rotation.z = -0.25; v.inner.neck.add(hat);
      var pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), mat('#FFD36B')); pom.position.set(0.1, 1.09, 0); pom.rotation.z = -0.25; v.inner.neck.add(pom);
      var hh = D.F[v.id].house; balloons(hh[0] + 0.9, isTier(hh[0], hh[1]) ? 1 : 0, hh[1] + 0.8);
    });
    /* confetti for a birthday cheer */
    var confetti = (function () {
      var n = 60, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ps = [];
      var C = [[0.96, 0.6, 0.66], [1, 0.83, 0.42], [0.62, 0.77, 0.91], [0.5, 0.76, 0.36], [1, 1, 1]];
      for (var i = 0; i < n; i++) { var c = C[i % 5]; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; ps.push({ life: 0 }); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }));
      pts.frustumCulled = false; scene.add(pts);
      return { pts: pts, ps: ps, pos: pos, burst: function (x, y, z) { var th = z / R, r0 = R + y, wy = r0 * Math.cos(th) - R, wz = r0 * Math.sin(th); ps.forEach(function (p, i) { var a = Math.random() * Math.PI * 2, u = Math.random(); p.x = x; p.y = wy; p.z = wz; p.vx = Math.cos(a) * (0.8 + u * 1.6); p.vz = Math.sin(a) * (0.8 + u * 1.6); p.vy = 2.2 + Math.random() * 1.6; p.life = 1.8 + Math.random() * 0.6; }); } };
    })();
    meV.inside = false;
    var myHouse = D.F.me.house;
    var DOORS = [
      { id: 'cafe', x: L.cafe.x, z: L.cafe.z + 0.9, y: 1.9, label: '카페 들어가기', scene: 'cafe', status: 'cafe' },
      { id: 'office', x: L.office.x, z: L.office.z + 0.75, y: 2.0, label: '회사 들어가기', scene: 'office', status: 'work' },
      { id: 'home', x: myHouse[0], z: myHouse[1] + 0.72, y: heightAt(myHouse[0], myHouse[1] + 0.72) + 1.7, label: '집에 들어가기', status: 'home' }
    ];
    var nearDoor = null;
    function doorNear() {
      if (!meV.outer.visible || meV.inside) return null;
      for (var i = 0; i < DOORS.length; i++) { var d = DOORS[i]; if (Math.hypot(meV.cur[0] - d.x, meV.cur[2] - d.z) < 1.15) return d; }
      return null;
    }
    var stillFrames = 0;
    function movePins(lt) {
      var root = self._canvas && self._canvas.parentElement; if (!root) return;
      var els = root.querySelectorAll('[data-pin]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i], id = el.getAttribute('data-pin'), q = lt[id]; if (!q) continue;
        if (id === 'board' || id === 'nb' || id === 'door') { el.style.left = q.x + 'px'; el.style.top = q.y + 'px'; continue; }
        el.style.left = (q.x - 22) + 'px'; el.style.top = (q.head - 4) + 'px'; el.style.height = Math.max(30, q.feet - q.head + 8) + 'px';
      }
    }
    function anyWalk() { for (var i = 0; i < V.length; i++) if (V[i].walk) return true; return false; }

    /* ---------- fireworks: sky bursts on holiday, birthday and Saturday nights (and a heart now and then) ---------- */
    var FW = (function () {
      var n = 560, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ps = [];
      for (var i = 0; i < n; i++) ps.push({ life: 0, max: 1 });
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
      pts.frustumCulled = false; pts.renderOrder = 2; rigIn.add(pts);
      return { pts: pts, ps: ps, pos: pos, col: col, next: 1, shells: [] };
    })();
    var FW_COL = [[1, 0.55, 0.7], [1, 0.85, 0.35], [0.45, 0.85, 1], [0.7, 1, 0.55], [1, 1, 1], [1, 0.6, 0.3]];
    function fireworksOn() {
      var ev = self._events(), h = self._hour(), wx = self._weather();
      return (h >= 19 || h < 1) && wx.kind !== 'rain' && wx.kind !== 'snow' && (!!ev.holiday || ev.bdays.length > 0 || ev.dow === 6);
    }
    function launch() {
      var dist = 30 + Math.random() * 6, ang = 0.4 + Math.random() * 0.09, bx0 = (Math.random() - 0.5) * 14, by = CY0 - dist * Math.tan(ang), bz = CZ0 - dist, c = FW_COL[Math.floor(Math.random() * FW_COL.length)], heart = Math.random() < 0.25;
      FW.shells.push({ x: bx0, y: by - 5, z: bz, ty: by, c: c, heart: heart, t: 0 });
    }
    function burst(sh) {
      var made = 0, cnt = 90;
      for (var i = 0; i < FW.ps.length && made < cnt; i++) {
        var p = FW.ps[i]; if (p.life > 0) continue;
        var a = (made / cnt) * Math.PI * 2, vx, vy;
        if (sh.heart) { var tt = a; vx = 16 * Math.pow(Math.sin(tt), 3) / 16 * 5.4; vy = (13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt)) / 16 * 5.4; }
        else { var sp = 4.4 + Math.random() * 1.8; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
        p.x = sh.x; p.y = sh.y; p.z = sh.z; p.vx = vx; p.vy = vy; p.vz = (Math.random() - 0.5) * 0.6; p.life = p.max = 1.6 + Math.random() * 0.5; p.c = sh.c; made++;
      }
      FW.flash = 0.35;
    }
    function tickFireworks(t, dt) {
      var on = !reduce && fireworksOn();
      if (on) { FW.next -= dt; if (FW.next <= 0) { launch(); FW.next = 0.9 + Math.random() * 1.2; } }
      FW.shells = FW.shells.filter(function (sh) { sh.t += dt; sh.y += (sh.ty - sh.y) * Math.min(1, dt * 3.2); if (sh.ty - sh.y < 0.25) { burst(sh); return false; } return true; });
      var pos = FW.pos, col = FW.col, k = 0;
      FW.shells.forEach(function (sh) { if (k < FW.ps.length) { pos[k * 3] = sh.x; pos[k * 3 + 1] = sh.y; pos[k * 3 + 2] = sh.z; col[k * 3] = 1; col[k * 3 + 1] = 0.9; col[k * 3 + 2] = 0.7; k++; } });
      FW.ps.forEach(function (p) {
        if (p.life <= 0) return;
        p.life -= dt; p.vy -= dt * 1.6; p.vx *= 1 - dt * 0.9; p.vy *= 1 - dt * 0.6;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (k >= FW.ps.length) return;
        var f = Math.max(0, p.life / p.max), tw = f < 0.35 ? (Math.sin(t * 40 + p.x * 9) > 0 ? 1 : 0.2) : 1;
        pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; col[k * 3] = p.c[0] * f * tw; col[k * 3 + 1] = p.c[1] * f * tw; col[k * 3 + 2] = p.c[2] * f * tw; k++;
      });
      for (var z = k; z < FW.ps.length; z++) { pos[z * 3 + 1] = -999; }
      FW.pts.geometry.attributes.position.needsUpdate = true; FW.pts.geometry.attributes.color.needsUpdate = true;
      /* confetti */
      var cp = confetti.pos, any = false;
      confetti.ps.forEach(function (p, i) {
        if (p.life <= 0) { cp[i * 3 + 1] = -999; return; }
        any = true; p.life -= dt; p.vy -= dt * 4.5; p.vx *= 1 - dt * 1.5; p.vz *= 1 - dt * 1.5;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; cp[i * 3] = p.x + Math.sin(t * 9 + i) * 0.05; cp[i * 3 + 1] = p.y; cp[i * 3 + 2] = p.z;
      });
      if (any || confetti.was) confetti.pts.geometry.attributes.position.needsUpdate = true; confetti.was = any;
    }

    /* ---------- little birds: hop and peck, flutter away when I get close, land somewhere else later ---------- */
    var BIRD_SPOTS = [[2.3, -0.2], [-0.5, -2.7], [3.0, -3.2], [-2.7, -5.6], [5.2, -2.4], [-4.4, -0.9], [2.0, -7.8], [-5.0, -9.0]];
    function birdMesh(body, belly) {
      var g = new THREE.Group(), bm = mat(body), wm = mat(new THREE.Color(body).multiplyScalar(0.85).getStyle());
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bm); b.scale.set(1, 0.9, 1.25); b.position.y = 0.12; g.add(b);
      var bl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), mat(belly)); bl.position.set(0, 0.1, 0.05); g.add(bl);
      var hd = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), bm); hd.position.set(0, 0.22, 0.08); g.add(hd);
      var bk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), mat('#F2A93B')); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.21, 0.17); g.add(bk);
      g.add(bx(0.02, 0.025, 0.02, blackM, -0.04, 0.24, 0.14)); g.add(bx(0.02, 0.025, 0.02, blackM, 0.04, 0.24, 0.14));
      var tl = bx(0.08, 0.02, 0.09, wm, 0, 0.14, -0.14); tl.rotation.x = -0.4; g.add(tl);
      g.wings = [-1, 1].map(function (sd) { var pv = new THREE.Group(); pv.position.set(sd * 0.08, 0.15, 0); var wg = bx(0.12, 0.02, 0.12, wm, sd * 0.06, 0, 0); pv.add(wg); g.add(pv); return pv; });
      g.head = hd; g.scale.setScalar(1.2);
      return shade(g);
    }
    var birds = [['#F7D65A', '#FFF3C2'], ['#9FD3F2', '#FFFFFF'], ['#E8A27A', '#FFF0DC']].map(function (c, i) {
      var sp = BIRD_SPOTS[i * 2], g = birdMesh(c[0], c[1]); scene.add(g);
      return { g: g, x: sp[0], z: sp[1], y: 0, yaw: i * 2, st: 'ground', t: 0, next: 0.5 + i * 0.7, hop: 0, vx: 0, vz: 0, vy: 0, i: i };
    });
    function tickBirds(t, dt) {
      birds.forEach(function (b) {
        var g = b.g, me = meV.cur, dme = Math.hypot(b.x - me[0], b.z - me[2]);
        b.t += dt;
        if (b.st === 'ground') {
          if (b.t > b.next) { b.t = 0; b.next = 0.6 + hsh(b.i, t) * 1.6; b.hop = 1; b.yaw += (hsh(b.i + 4, t) - 0.5) * 2.2; }
          if (b.hop > 0) {
            b.hop = Math.max(0, b.hop - dt * 4);
            var nx = b.x + Math.sin(b.yaw) * dt * 0.6, nz = b.z + Math.cos(b.yaw) * dt * 0.6;
            if (walkable(nx, nz)) { b.x = nx; b.z = nz; } else b.yaw += Math.PI;
          }
          b.y = heightAt(b.x, b.z) + Math.sin(b.hop * Math.PI) * 0.12;
          g.head.rotation.x = b.hop === 0 && (t * 1.7 + b.i) % 2 < 0.35 ? 0.6 : 0;
          g.wings.forEach(function (w, k) { w.rotation.z = 0; });
          if (dme < 1.7 && meV.outer.visible) {
            var ax = b.x - me[0], az = b.z - me[2], al = Math.hypot(ax, az) || 1;
            b.vx = ax / al * 2.4; b.vz = az / al * 2.4 - 0.8; b.vy = 1.8; b.st = 'fly'; b.t = 0; b.yaw = Math.atan2(b.vx, b.vz);
          }
        } else if (b.st === 'fly') {
          b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt; b.vy += dt * 1.2;
          g.wings[0].rotation.z = Math.sin(t * 38) * 0.9; g.wings[1].rotation.z = -Math.sin(t * 38) * 0.9;
          if (b.t > 3) { b.st = 'away'; b.t = 0; b.next = 6 + hsh(b.i, t) * 6; g.visible = false; }
        } else if (b.st === 'away') {
          if (b.t > b.next) {
            var far = BIRD_SPOTS.filter(function (q) { return Math.hypot(q[0] - me[0], q[1] - me[2]) > 4; });
            var q = far[Math.floor(hsh(b.i + 9, t) * far.length)] || BIRD_SPOTS[0];
            b.tx = q[0]; b.tz = q[1]; b.x = q[0] - 2.5; b.z = q[1] + 1.5; b.y = heightAt(q[0], q[1]) + 3.2; b.st = 'land'; b.t = 0; g.visible = true;
            b.yaw = Math.atan2(b.tx - b.x, b.tz - b.z);
          }
        } else if (b.st === 'land') {
          var k = Math.min(1, dt * 1.6);
          b.x += (b.tx - b.x) * k; b.z += (b.tz - b.z) * k; var gy = heightAt(b.tx, b.tz); b.y += (gy - b.y) * k;
          g.wings[0].rotation.z = Math.sin(t * 30) * 0.8; g.wings[1].rotation.z = -Math.sin(t * 30) * 0.8;
          if (Math.abs(b.y - gy) < 0.03) { b.st = 'ground'; b.t = 0; b.y = gy; }
        }
        place(g, b.x, b.y, b.z); g.rotation.y = b.yaw;
      });
    }

    /* ---------- weather particles ---------- */
    function swarm(n, geo, color, opacity) {
      var m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity }), n);
      m.frustumCulled = false; m.visible = false; scene.add(m);
      var ps = []; for (var i = 0; i < n; i++) ps.push({ x: (hsh(i, 1) - 0.5) * 18, y: hsh(i, 2) * 10, z: -15 + hsh(i, 3) * 20, s: 0.6 + hsh(i, 4) * 0.8 });
      return { mesh: m, ps: ps };
    }
    var rain = swarm(280, new THREE.BoxGeometry(0.025, 0.42, 0.025), 0xCFE8F5, 0.65);
    var snow = swarm(220, new THREE.BoxGeometry(0.08, 0.08, 0.08), 0xFFFFFF, 0.95);
    var leaves = swarm(36, new THREE.BoxGeometry(0.11, 0.03, 0.08), 0xE8A23A, 0.95);
    var dummy = new THREE.Object3D();
    function groundY(z) { return R * Math.cos(z / R) - R; }

    /* ---------- 3D sky: dome shader + oval clouds drifting north ---------- */
    var skyU = {
      uTop: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Vector3() }, uGlowDir: { value: new THREE.Vector3(0, -0.5, -1) },
      uGlowAmt: { value: 0 }, uDisc: { value: 0 }, uDiscCol: { value: new THREE.Vector3(1, 0.95, 0.8) }, uMoonDir: { value: new THREE.Vector3(0, -0.45, -1) }, uMoon: { value: 0 },
      uStars: { value: 0 }, uTime: { value: 0 }, uMeteor: { value: new THREE.Vector4(0, 0, 0, 0) }
    };
    var skyMat = new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir;\nvoid main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uGlow; uniform vec3 uGlowDir; uniform float uGlowAmt; uniform float uDisc; uniform vec3 uDiscCol;',
        'uniform vec3 uMoonDir; uniform float uMoon; uniform float uStars; uniform float uTime; uniform vec4 uMeteor;',
        'varying vec3 vDir;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'void main(){',
        '  vec3 d = normalize(vDir);',
        '  float t = smoothstep(-0.56, -0.37, d.y);',
        '  vec3 col = mix(uHor, uTop, t);',
        '  float g = max(dot(d, normalize(uGlowDir)), 0.0);',
        '  col += uGlow * (pow(g, 7.0) * 0.5 + pow(g, 60.0) * 0.6) * uGlowAmt;',
        '  if (uDisc > 0.0 && g > 0.99955) col = mix(col, uDiscCol, uDisc);',
        '  float m = max(dot(d, normalize(uMoonDir)), 0.0);',
        '  if (uMoon > 0.0) { col += vec3(0.45, 0.5, 0.7) * pow(m, 40.0) * 0.35 * uMoon; if (m > 0.99972) col = mix(col, vec3(1.0, 0.95, 0.72), uMoon); }',
        '  if (uStars > 0.0) {',
        '    vec2 sc = vec2(atan(d.x, -d.z) * 70.0, d.y * 260.0); vec2 cell = floor(sc); float h = hash(cell); vec2 f = fract(sc) - 0.5;',
        '    if (h > 0.972 && length(f) < 0.22) { float tw = 0.55 + 0.45 * sin(uTime * 3.0 + h * 60.0); col = mix(col, vec3(1.0, 0.97, 0.85), uStars * tw); }',
        '  }',
        '  if (uMeteor.w > 0.0) {',
        /* a wishing star: a glowing four-point head, a soft tapered tail and little twinkles left behind on its path */
        '    vec2 p = vec2(atan(d.x, -d.z), d.y); vec2 tv = vec2(-0.40, -0.02); vec2 head = uMeteor.xy + tv * uMeteor.z;',
        '    vec2 ba = -normalize(tv) * 0.085; vec2 pa = p - head; float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); float dd = length(pa - ba * hh);',
        '    float wid = mix(0.0042, 0.0008, hh); float tail = (1.0 - smoothstep(wid * 0.5, wid, dd)) * pow(1.0 - hh, 1.6);',
        '    col = mix(col, mix(vec3(1.0, 0.97, 0.82), vec3(0.75, 0.85, 1.0), hh), uMeteor.w * tail * 0.9);',
        '    float r = length(pa); col += vec3(1.0, 0.92, 0.65) * uMeteor.w * exp(-r * r / 0.00006) * 0.55;',
        '    float cross1 = (1.0 - smoothstep(0.0012, 0.0024, abs(pa.y))) * (1.0 - smoothstep(0.004, 0.013, abs(pa.x)));',
        '    float cross2 = (1.0 - smoothstep(0.0012, 0.0024, abs(pa.x))) * (1.0 - smoothstep(0.004, 0.013, abs(pa.y)));',
        '    col = mix(col, vec3(1.0, 0.99, 0.9), uMeteor.w * clamp(max(cross1, cross2) + (1.0 - smoothstep(0.0025, 0.0045, r)), 0.0, 1.0));',
        '    for (int k = 0; k < 6; k++) {',
        '      float fk = float(k); float tk = uMeteor.z - 0.07 - fk * 0.075; if (tk < 0.0) continue;',
        '      float hk = fract(sin(fk * 12.9898 + floor(uMeteor.x * 997.0)) * 43758.5453);',
        '      vec2 sp = uMeteor.xy + tv * tk + vec2(0.0, (hk - 0.5) * 0.008); float age = uMeteor.z - tk;',
        '      float tw = (0.6 + 0.4 * sin(uTime * 14.0 + hk * 40.0)) * (1.0 - smoothstep(0.1, 0.45, age));',
        '      float sd = length(p - sp); col = mix(col, vec3(1.0, 0.95, 0.72), uMeteor.w * tw * (1.0 - smoothstep(0.0016, 0.0032, sd)));',
        '    }',
        '  }',
        '  vec2 fc = mod(floor(gl_FragCoord.xy), 2.0);',
        '  float bay = (fc.x * 2.0 + fc.y * 3.0 - 4.0 * fc.x * fc.y) / 4.0 - 0.375;',
        '  col = floor(col * 16.0 + bay + 0.5) / 16.0;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    var dome = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), skyMat);
    dome.position.set(0, CY0, CZ0); dome.renderOrder = -1; dome.frustumCulled = false; rigIn.add(dome);
    function dirAt(az, e) { var c = Math.sqrt(1 - e * e); return new THREE.Vector3(Math.sin(az) * c, e, -Math.cos(az) * c); }
    var cloudMats = [], clouds = [];
    for (var ci = 0; ci < 16; ci++) {
      var cm = new THREE.MeshLambertMaterial({ color: 0xF2F2EE, flatShading: true, transparent: true, opacity: 0, fog: false });
      var cg = new THREE.Group(), parts = 2 + (ci % 2);
      for (var pi = 0; pi < parts; pi++) {
        var puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), cm);
        puff.scale.set(2.6 - pi * 0.5, 0.75 - pi * 0.1, 1.3 - pi * 0.2); puff.position.set(pi * 1.7 - 1.2, pi * 0.25, pi * 0.3);
        cg.add(puff);
      }
      rigIn.add(cg);
      clouds.push({ g: cg, m: cm, a: 0.42 + hsh(ci, 8) * 0.12, z: -26 - hsh(ci, 9) * 38, x: (hsh(ci, 10) - 0.5) * 40, sp: 0.5 + hsh(ci, 11) * 0.5, idx: ci });
      cloudMats.push(cm);
    }
    function placeCloud(c) {
      var dist = CZ0 - c.z, y = CY0 - dist * Math.tan(c.a);
      c.g.position.set(c.x, y, c.z);
      var s = 1 + dist / 60; c.g.scale.setScalar(s);
    }
    clouds.forEach(placeCloud);

    /* ---------- lights ---------- */
    scene.fog = new THREE.Fog(0xD8F1FA, 26, 46);
    var sunBase = 0.62, dayLight = 1;
    var hemi = new THREE.HemisphereLight(0xFFFFFF, 0x8A7A5A, 0.62); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xFFF4DE, 0.62); sun.target.position.set(0, 0, -4); scene.add(sun); scene.add(sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
    var sc = sun.shadow.camera; sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 70; sun.shadow.bias = -0.003;

    /* time-of-day keyframes (colors 0..255) */
    var NIGHT = { top: [16, 24, 52], hor: [46, 60, 104], hemi: [143, 166, 224], hi: 0.3, gnd: [42, 42, 64], sun: [159, 180, 255], si: 0.22, wl: [0.42, 0.48, 0.74], lamp: 1, cloud: [74, 82, 114], glow: [110, 130, 190], ga: 0.25, stars: 1 };
    var DAWN = { top: [138, 178, 226], hor: [255, 206, 178], hemi: [255, 233, 218], hi: 0.55, gnd: [138, 122, 90], sun: [255, 210, 160], si: 0.55, wl: [0.96, 0.9, 0.88], lamp: 0.15, cloud: [255, 228, 214], glow: [255, 186, 140], ga: 1.0, stars: 0 };
    var DAY = { top: [96, 178, 238], hor: [206, 236, 250], hemi: [255, 255, 255], hi: 0.62, gnd: [138, 122, 90], sun: [255, 246, 228], si: 0.64, wl: [1, 1, 1], lamp: 0, cloud: [244, 244, 238], glow: [255, 250, 230], ga: 0.25, stars: 0 };
    var DUSK = { top: [92, 86, 170], hor: [255, 146, 92], hemi: [255, 196, 160], hi: 0.5, gnd: [110, 80, 70], sun: [255, 150, 86], si: 0.58, wl: [1.05, 0.78, 0.62], lamp: 0.7, cloud: [255, 196, 168], glow: [255, 128, 70], ga: 1.4, stars: 0 };
    var KF = [[0, NIGHT], [4.8, NIGHT], [6.4, DAWN], [8.6, DAY], [16.2, DAY], [17.9, DUSK], [19.4, NIGHT], [24, NIGHT]];
    function lerp(a, b, t) { if (typeof a === 'number') return a + (b - a) * t; return a.map(function (v, i) { return v + (b[i] - v) * t; }); }
    function sstep(t) { return t * t * (3 - 2 * t); }
    function envAt(h, wx) {
      var i = 0; while (i < KF.length - 2 && KF[i + 1][0] <= h) i++;
      var A = KF[i], B = KF[i + 1], t = sstep(Math.max(0, Math.min(1, (h - A[0]) / (B[0] - A[0] || 1)))), e = {};
      Object.keys(A[1]).forEach(function (k) { e[k] = lerp(A[1][k], B[1][k], t); });
      var gray = { cloudy: [168, 176, 188], rain: [118, 128, 144], snow: [206, 212, 222] }[wx.kind];
      if (gray) {
        var amt = wx.kind === 'rain' ? 0.78 : 0.62, dim = 0.35 + 0.65 * (1 - e.stars), g2 = gray.map(function (v) { return v * dim; });
        e.top = lerp(e.top, g2, amt); e.hor = lerp(e.hor, g2, amt * 0.9);
        e.cloud = wx.kind === 'rain' ? lerp([142, 152, 166], [70, 76, 96], e.stars) : lerp(e.cloud, g2.map(function (v) { return Math.min(255, v * 1.15); }), 0.6);
        e.hi *= wx.kind === 'rain' ? 0.72 : 0.86; e.si *= wx.kind === 'rain' ? 0.25 : 0.45; e.ga *= 0.25;
        e.wl = e.wl.map(function (v) { return v * (wx.kind === 'rain' ? 0.82 : 0.92); });
        e.stars = 0; if (wx.kind === 'rain') e.lamp = Math.max(e.lamp, 0.45);
      }
      return e;
    }
    function v3(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }
    function applyEnv(e, wx, h) {
      var hor = v3(e.hor), top3 = v3(e.top);
      scene.fog.color.setRGB(hor[0], hor[1], hor[2]);
      waterU.uFog.value.set(hor[0], hor[1], hor[2]);
      waterU.uLight.value.set(e.wl[0], e.wl[1], e.wl[2]);
      waterU.uRain.value = wx.kind === 'rain' ? 1 : 0; waterU.uWind.value = wx.wind;
      skyU.uTop.value.set(top3[0], top3[1], top3[2]); skyU.uHor.value.set(hor[0], hor[1], hor[2]);
      var gl = v3(e.glow); skyU.uGlow.value.set(gl[0], gl[1], gl[2]); skyU.uGlowAmt.value = e.ga; skyU.uStars.value = e.stars;
      /* sun rises east (right), sets west (left); the sky band only sees it near the horizon */
      var rise = Math.max(0, Math.min(1, (h - 5.6) / 2.6)), set = Math.max(0, Math.min(1, (h - 16.6) / 2.6));
      var sunUp = h > 5.6 && h < 19.2;
      if (h < 12) skyU.uGlowDir.value.copy(dirAt(0.17, -0.55 + rise * 0.2)); else skyU.uGlowDir.value.copy(dirAt(-0.17, -0.35 - set * 0.2));
      var discShow = (h > 5.6 && h < 8.2) || (h > 16.6 && h < 19.2);
      skyU.uDisc.value = discShow && wx.kind === 'clear' ? 1 : 0;
      skyU.uDiscCol.value.set(h < 12 ? 1.0 : 1.0, h < 12 ? 0.86 : 0.7, h < 12 ? 0.62 : 0.45);
      skyU.uMoon.value = e.stars;
      skyU.uMoonDir.value.copy(dirAt(0.06 - ((h + 6) % 24) / 24 * 0.12, -0.44));
      var cc = v3(e.cloud); cloudMats.forEach(function (m) { m.color.setRGB(cc[0], cc[1], cc[2]); m.emissive.setRGB(cc[0] * 0.35, cc[1] * 0.35, cc[2] * 0.35); });
      hemi.color.setRGB(e.hemi[0] / 255, e.hemi[1] / 255, e.hemi[2] / 255); hemi.groundColor.setRGB(e.gnd[0] / 255, e.gnd[1] / 255, e.gnd[2] / 255); hemi.intensity = e.hi;
      sun.color.setRGB(e.sun[0] / 255, e.sun[1] / 255, e.sun[2] / 255); sun.intensity = e.si; sunBase = e.si; dayLight = 1 - e.stars;
      /* real sun path for shadows: east at 6h, south at noon, west at 18h; moonlight at night */
      var k = sunUp ? (h - 6) / 12 : ((h + 6) % 24) / 12, az = Math.PI * Math.max(0, Math.min(1, k));
      var el = Math.max(0.16, Math.sin(az) * (sunUp ? 1.0 : 0.7));
      var dx = Math.cos(az) * Math.cos(el), dz = Math.sin(az) * Math.cos(el), dy = Math.sin(el);
      sun.position.set(dx * 30, dy * 30, -4 + dz * 30);
      var lit = e.lamp > 0.3;
      winM.color.set(lit ? 0xFFD86B : 0x9FD0EE); winM.emissive.set(lit ? 0xFFB833 : 0x000000); winM.emissiveIntensity = Math.min(1, e.lamp);
      lampM.emissive.set(lit ? 0xFFD27A : 0x000000);
      paperM.emissive.set(lit ? 0xE8A848 : 0x000000); paperM.emissiveIntensity = Math.min(1, e.lamp) * 0.8;
      lamps.forEach(function (l) { l.intensity = e.lamp * 1.2; });
      rain.mesh.visible = !reduce && wx.kind === 'rain'; snow.mesh.visible = !reduce && wx.kind === 'snow'; leaves.mesh.visible = !reduce && (wx.wind >= 0.5 || curSeason === 'autumn' || curSeason === 'spring');
    }

    function proj(obj, y) { obj.updateMatrixWorld(true); var qv = new THREE.Vector3(0, y, 0).applyMatrix4(obj.matrixWorld).project(camera); return { x: Math.round((qv.x + 1) * 195), y: Math.round((1 - qv.y) * 422) }; }
    function projectAll() {
      var tags = {};
      V.forEach(function (v) { var f = proj(v.outer, 0), hd = proj(v.outer, v.top); tags[v.id] = { x: f.x, feet: f.y, head: hd.y }; });
      office.updateMatrixWorld(true);
      var bq = new THREE.Vector3(0, 2.3, 0).applyMatrix4(office.matrixWorld).project(camera);
      tags.board = { x: Math.round((bq.x + 1) * 195), y: Math.round((1 - bq.y) * 422) - 18 };
      if (nearDoor) { var dq = new THREE.Vector3(nearDoor.x, nearDoor.y, nearDoor.z); var dth = dq.z / R, dr = R + dq.y; dq.set(dq.x, dr * Math.cos(dth) - R, dr * Math.sin(dth)).project(camera); tags.door = { x: Math.round((dq.x + 1) * 195), y: Math.round((1 - dq.y) * 422) }; }
      nboard.updateMatrixWorld(true);
      var nq = new THREE.Vector3(0, 1.45, 0).applyMatrix4(nboard.matrixWorld).project(camera);
      tags.nb = { x: Math.round((nq.x + 1) * 195), y: Math.round((1 - nq.y) * 422) - 14 };
      return tags;
    }
    function startWalk(v, to, onArrive) {
      var pts = planPath(v.cur.slice(), to);
      if (!pts || pts.length < 2) return false;
      var total = 0; for (var i = 0; i < pts.length - 1; i++) total += seglen(pts[i], pts[i + 1]);
      v.walk = { pts: pts, i: 0, s: 0, done: 0, total: total, spd: v.walk ? v.walk.spd : 0, onArrive: onArrive };
      if (v.status === 'work' || v.inside) v.outer.visible = true;
      if (v === meV && meV.inside) { meV.inside = false; self.setState({ myInside: false }); }
      return true;
    }
    var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
    var MAPC = { sea: '#4FA6D8', shallow: '#7FD0E6', river: '#6BC6E8', sand: '#F3E2A6', grass: '#8BC75B', tier: '#A9D873', edge: '#6E9E45', path: '#E2C795', plaza: '#DCD3C2', bridge: '#B9834F' };
    this._world = {
      renderer: renderer, scene: scene, me: meV,
      resetDoor: function () { nearDoor = null; },
      walkTo: function (status) {
        var slot = MY_SLOT[status] || 0;
        meV.status = status; meV.slot = slot;
        var tgt = status === 'cafe' ? [L.cafe.x, 0, L.cafe.z + 1.25] : targetFor('me', status, slot);
        startWalk(meV, tgt, function () { if (status === 'work' || status === 'cafe') self._autoEnter(status === 'work' ? 'office' : 'cafe'); });
      },
      enterDoor: function (id) {
        var d = DOORS.filter(function (q) { return q.id === id; })[0]; if (!d) return null;
        return d;
      },
      goInside: function (d) {
        meV.walk = null; meV.inside = true; meV.insideAt = [d.x, d.z - 0.6]; meV.status = d.status || meV.status; meV.outer.visible = false; nearDoor = null;
      },
      meScreen: function () { var q = (self._liveTags || {}).me; return q ? { x: q.x, y: q.head + 26 } : { x: 195, y: 422 }; },
      restyleMe: function (f) {
        var old = meV.inner, nw = person(f); nw.rotation.copy(old.rotation); nw.position.copy(old.position);
        meV.outer.remove(old); meV.outer.add(nw); meV.inner = nw;
      },
      cheer: function (id) {
        var v = V.filter(function (q) { return q.id === id; })[0]; if (!v) return;
        confetti.burst(v.cur[0], v.cur[1] + 1.6, v.cur[2]); v.walk = v.walk; v.inner.position.y = 0;
      },
      walkNear: function (id) {
        var v = V.filter(function (q) { return q.id === id; })[0]; if (!v || !v.outer.visible) return false;
        var best = null;
        [[0, 0.8], [0.8, 0.2], [-0.8, 0.2], [0, -0.8]].forEach(function (o) {
          var x = v.cur[0] + o[0], z = v.cur[2] + o[1];
          if (!best && walkable(x, z)) best = [x, z];
        });
        if (!best) { var c0 = cellOf(v.cur[0], v.cur[2] + 0.8), nw0 = nearestWalk(c0[0], c0[1]); if (!nw0) return false; best = [cx(nw0[0]), cz(nw0[1])]; }
        return startWalk(meV, [best[0], heightAt(best[0], best[1]), best[1]], function () {
          var zn = zoneAt(meV.cur[0], meV.cur[2]); meV.status = zn; meV.yaw = Math.atan2(v.cur[0] - meV.cur[0], v.cur[2] - meV.cur[2]);
          self._arrived(zn);
          setTimeout(function () { if (!self._dead) self._sayVillage(id, '어 왔어?', 5000); }, 500);
        });
      },
      tapAt: function (e) {
        self._lastActive = performance.now();
        var el = e.currentTarget; if (!el || !el.getBoundingClientRect) return;
        var rc = el.getBoundingClientRect();
        ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -(((e.clientY - rc.top) / rc.height) * 2 - 1));
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.intersectObject(nboard, true)[0]) { self.setState({ boardOpen: true }); return; }
        var hit = raycaster.intersectObjects([tier, ramp, groundMesh], false)[0];
        if (!hit) return;
        var P0 = hit.point, th = Math.atan2(P0.z, P0.y + R), fx = P0.x, fz = th * R;
        var c = cellOf(fx, fz), nw = nearestWalk(c[0], c[1]); if (!nw) return;
        if (!walkable(fx, fz)) { fx = cx(nw[0]); fz = cz(nw[1]); }
        var ok = startWalk(meV, [fx, heightAt(fx, fz), fz], function () {
          var zn = zoneAt(meV.cur[0], meV.cur[2]); meV.status = zn;
          self._arrived(zn);
        });
        if (ok) { place(tapRing, fx, heightAt(fx, fz) + 0.04, fz); tapRing.rotation.x += -Math.PI / 2; tapT = 0; self._walking(); }
      },
      fade: function (id, on) { V.forEach(function (v) { if (v.id === id) setFaded(v, on); }); },
      positions: function () {
        var o = {}; V.forEach(function (v) { o[v.id] = { x: v.cur[0], z: v.cur[2], hidden: !v.outer.visible }; }); return o;
      },
      drawMap: function (cv) {
        var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
        for (var py = 0; py < H; py++) for (var px = 0; px < W; px++) {
          var x = -9 + (px + 0.5) / 8, z = -18 + (py + 0.5) / 8, c;
          if (isSea(x, z)) c = sdAt(x, z) < 1.2 ? MAPC.shallow : MAPC.sea;
          else if (inRiver(x, z)) c = onBridge(x, z) ? MAPC.bridge : MAPC.river;
          else if (isBeach(x, z)) c = MAPC.sand;
          else if (isTier(x, z)) c = (!isTier(x + 0.15, z) || !isTier(x - 0.15, z) || !isTier(x, z + 0.15)) ? MAPC.edge : MAPC.tier;
          else if (Math.hypot(x - 0.95, z + 1.1) < 1.3) c = MAPC.plaza;
          else if (inPathRaw(x, z) || isRamp(x, z)) c = MAPC.path;
          else c = MAPC.grass;
          ctx.fillStyle = c; ctx.fillRect(px, py, 1, 1);
          if (((px % 24) === 0 || (py % 24) === 0) && !isSea(x, z)) { ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(px, py, 1, 1); }
        }
        function box(x, z, w, h, fill) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(Math.round((x + 9) * 8 - w / 2) - 1, Math.round((z + 18) * 8 - h / 2) - 1, w + 2, h + 2); ctx.fillStyle = fill; ctx.fillRect(Math.round((x + 9) * 8 - w / 2), Math.round((z + 18) * 8 - h / 2), w, h); }
        Object.keys(D.F).forEach(function (id) { var hh = D.F[id].house; box(hh[0], hh[1], 6, 5, D.F[id].roof); });
        box(L.cafe.x, L.cafe.z, 12, 8, '#3F8F6B'); box(L.office.x, L.office.z, 14, 9, '#6E8FB8'); box(L.hall.x, L.hall.z, 16, 9, '#4FA3A0'); box(L.board.x, L.board.z, 6, 2, '#A9774A'); box(L.diner.x, L.diner.z, 11, 8, '#D9534F'); box(4.5, -0.7, 9, 4, '#4A78B5'); box(3, 3.75, 5, 10, '#B9834F');
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc((0.95 + 9) * 8, (-1.1 + 18) * 8, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8EBFE0'; ctx.beginPath(); ctx.arc((0.95 + 9) * 8, (-1.1 + 18) * 8, 4, 0, Math.PI * 2); ctx.fill();
      }
    };

    var WATER_S = {
      spring: [[0.60, 0.91, 0.88], [0.30, 0.79, 0.86], [0.17, 0.61, 0.80], [0.13, 0.48, 0.72]],
      summer: [[0.55, 0.94, 0.86], [0.20, 0.81, 0.86], [0.11, 0.63, 0.83], [0.09, 0.50, 0.76]],
      autumn: [[0.52, 0.86, 0.82], [0.22, 0.71, 0.80], [0.14, 0.54, 0.74], [0.11, 0.42, 0.66]],
      winter: [[0.68, 0.85, 0.89], [0.42, 0.69, 0.80], [0.27, 0.53, 0.70], [0.20, 0.42, 0.62]]
    };
    function applySeason(s) {
      setSeasonPalette(s); paintGround(); paintTier();
      treeMats.forEach(function (m) { var lc = LEAVES_S[s][m.kind % 4]; m.a.color.set(lc[0]); m.b.color.set(lc[1]); });
      var wc = WATER_S[s];
      waterU.uC1.value.set(wc[0][0], wc[0][1], wc[0][2]); waterU.uC2.value.set(wc[1][0], wc[1][1], wc[1][2]);
      waterU.uC3.value.set(wc[2][0], wc[2][1], wc[2][2]); waterU.uC4.value.set(wc[3][0], wc[3][1], wc[3][2]);
      leaves.mesh.material.color.set(s === 'spring' ? 0xF7C6D9 : s === 'winter' ? 0xFFFFFF : s === 'summer' ? 0x6CB848 : 0xE8A23A);
    }
    applySeason(curSeason);

    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    this._applyGhost();
    var t0 = performance.now(), lastT = 0, projected = false, pf = 0, lastEnvT = -99, meteor = { next: 4, t: -1, az: 0, e: 0 }, lastTl = -1;

    /* ---------- life: things that keep moving on their own, so the island never feels frozen ---------- */
    /* 1. cloud shadows slide over the grass, and the sun dims for a moment when one passes over me */
    var CSN = 64, csC = document.createElement('canvas'); csC.width = csC.height = CSN;
    var csX = csC.getContext('2d'), csImg = csX.createImageData(CSN, CSN), csA = new Float32Array(CSN * CSN);
    var CSW = [[1, 0, 0.5, 0.3], [0, 1, 0.45, 1.9], [1, 1, 0.35, 4.1], [2, -1, 0.3, 2.2], [1, 2, 0.25, 5.0], [3, 1, 0.18, 0.7], [-2, 3, 0.15, 3.3], [4, -3, 0.1, 1.4]];
    for (var cy0 = 0; cy0 < CSN; cy0++) for (var cx0 = 0; cx0 < CSN; cx0++) {
      /* integer-frequency waves wrap around exactly, so the shadow sheet tiles without seams */
      var u0 = cx0 / CSN * 6.2832, v0 = cy0 / CSN * 6.2832, n = 0;
      CSW.forEach(function (w) { n += w[2] * Math.sin(w[0] * u0 + w[1] * v0 + w[3]); });
      var a = Math.max(0, Math.min(1, (n - 0.42) / 0.3));
      csA[cy0 * CSN + cx0] = a;
      var k = (cy0 * CSN + cx0) * 4; csImg.data[k] = csImg.data[k + 1] = csImg.data[k + 2] = 255; csImg.data[k + 3] = Math.round(a * 255);
    }
    /* make it tile: blend the edges */
    csX.putImageData(csImg, 0, 0);
    var csT = new THREE.CanvasTexture(csC); csT.wrapS = csT.wrapT = THREE.RepeatWrapping; csT.repeat.set(1.3, 1.7); csT.magFilter = THREE.LinearFilter;
    var csM = new THREE.MeshBasicMaterial({ map: csT, color: 0x1B2540, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    var csGround = new THREE.Mesh(gGeo, csM); csGround.renderOrder = 1; scene.add(csGround);
    var ttGeo = new THREE.PlaneGeometry(7.6, 6, 15, 24); ttGeo.rotateX(-Math.PI / 2); ttGeo.translate(-3.2, 1.012, -10);
    (function () { var pa = ttGeo.attributes.position, uv = ttGeo.attributes.uv; for (var i = 0; i < pa.count; i++) uv.setXY(i, (pa.getX(i) + 10) / 20, (6 - pa.getZ(i)) / 26); uv.needsUpdate = true; })();
    bend(ttGeo);
    var csTier = new THREE.Mesh(ttGeo, csM); csTier.renderOrder = 1; scene.add(csTier);
    function shadeAt(x, z) {
      var u = ((x + 10) / 20 * csT.repeat.x + csT.offset.x) % 1, v = ((6 - z) / 26 * csT.repeat.y + csT.offset.y) % 1;
      if (u < 0) u += 1; if (v < 0) v += 1;
      return csA[Math.floor((1 - v) * CSN) % CSN * CSN + Math.floor(u * CSN) % CSN];
    }
    var sunDip = 0;
    /* 2. chimney smoke from the houses of whoever is home */
    var smokeM = new THREE.MeshBasicMaterial({ color: 0xF7F5F1, transparent: true, opacity: 0.6, depthWrite: false });
    var smoke = [];
    Object.keys(HOUSES).forEach(function (id, hi) {
      var hs0 = HOUSES[id];
      for (var k2 = 0; k2 < 5; k2++) { var m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), smokeM.clone()); m.visible = false; scene.add(m); smoke.push({ m: m, id: id, h: hs0, ph: k2 / 5 + hi * 0.13 }); }
    });
    /* 3. butterflies over the flowers on fine days */
    var bfly = [];
    [['#FFFFFF', 0.95, -1.1, 1.6], ['#F7C84A', -4.4, -0.9, 1.2], ['#F59BB5', 4.5, -3.2, 1.4]].forEach(function (b, i) {
      var g = new THREE.Group(), wm = new THREE.MeshBasicMaterial({ color: new THREE.Color(b[0]), side: THREE.DoubleSide });
      var wl = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.09), wm), wr = wl.clone(); wl.position.x = -0.055; wr.position.x = 0.055;
      var pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr); g.add(pl); g.add(pr);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.08), new THREE.MeshBasicMaterial({ color: 0x3A2A20 })));
      scene.add(g); bfly.push({ g: g, pl: pl, pr: pr, cx: b[1], cz: b[2], r: b[3], ph: i * 2.1 });
    });
    /* 4. villagers do small things while they wait: look at a friend, glance around, stretch */
    V.forEach(function (v, i) { v.act = null; v.actNext = 3 + i * 1.7; });
    function nearestFriend(v) {
      var best = null, bd = 2.6;
      V.forEach(function (o) { if (o === v || !o.outer.visible) return; var d = Math.hypot(o.cur[0] - v.cur[0], o.cur[2] - v.cur[2]); if (d < bd) { bd = d; best = o; } });
      return best;
    }

    /* 5. a sleeping friend is indoors: little z's float out of the chimney instead of smoke */
    var zC = document.createElement('canvas'); zC.width = 8; zC.height = 8;
    (function () {
      var x = zC.getContext('2d'), Zr = ['111111', '....1.', '...1..', '..1...', '.1....', '111111'];
      x.clearRect(0, 0, 8, 8);
      function dot(c, ox, oy) { x.fillStyle = c; Zr.forEach(function (r, y) { for (var i = 0; i < 6; i++) if (r.charAt(i) === '1') x.fillRect(i + 1 + ox, y + 1 + oy, 1, 1); }); }
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (o) { dot('#FFFFFF', o[0], o[1]); });
      dot('#4B4F92', 0, 0);
    })();
    var zT = new THREE.CanvasTexture(zC); zT.magFilter = THREE.NearestFilter; zT.minFilter = THREE.NearestFilter;
    var zzs = [];
    V.forEach(function (v) {
      if (!v.stale || !HOUSES[v.id]) return;
      for (var k3 = 0; k3 < 3; k3++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: zT, transparent: true, depthWrite: false })); sp.visible = false; scene.add(sp); zzs.push({ s: sp, h: HOUSES[v.id], ph: k3 / 3 }); }
    });
    /* 6. walking past a house shows whose it is */
    var plateId = null, plateOn = false, plateEl = null;
    function housePlate() {
      var el = self._houseEl; if (!el) return;
      if (el !== plateEl) { plateEl = el; plateId = null; plateOn = false; }
      var best = null, bd = 2.3;
      if (meV.outer.visible) Object.keys(HOUSES).forEach(function (id) { var hq = HOUSES[id], d = Math.hypot(meV.cur[0] - hq.x, meV.cur[2] - (hq.z + 0.9)); if (d < bd) { bd = d; best = id; } });
      if (best) {
        if (best !== plateId) { plateId = best; var tx = el.querySelector('[data-htag-text]'); if (tx) tx.textContent = best === 'me' ? '우리 집' : D.F[best].name + '네 집'; }
        var hq2 = HOUSES[best], gy = hq2.y + hq2.g.chimTop * 1.22 + 0.35, th = hq2.z / R, rr = R + gy;
        var qv = new THREE.Vector3(hq2.x, rr * Math.cos(th) - R, rr * Math.sin(th)).project(camera);
        el.style.left = Math.round((qv.x + 1) * 195) + 'px'; el.style.top = Math.round((1 - qv.y) * 422) + 'px';
        if (!plateOn) { el.style.opacity = '1'; plateOn = true; }
      } else if (plateOn) { el.style.opacity = '0'; plateOn = false; }
    }
    function gustAt(t, x) { return 0.55 + 0.3 * Math.sin(t * 0.37 - x * 0.22) + 0.15 * Math.sin(t * 1.13 + x * 0.4); }
    function lifeTick(t, dt, wx, h) {
      /* clouds' shadows: only on bright days with some clouds about */
      var spotty = wx.kind === 'clear' ? Math.min(1, wx.clouds / 6) : 0;
      if (!reduce) { csT.offset.y = (csT.offset.y + dt * 0.006 * (0.6 + wx.wind * 1.2)) % 1; csT.offset.x = (csT.offset.x - dt * 0.0025 * wx.wind) % 1; }
      csM.opacity = 0.2 * spotty * dayLight;
      var here = meV.outer.visible ? shadeAt(meV.cur[0], meV.cur[2]) : 0;
      sunDip += (here * spotty * dayLight - sunDip) * Math.min(1, dt * 1.2);
      sun.intensity = sunBase * (1 - 0.45 * sunDip);
      /* smoke: cool months, mornings and evenings, and only while the owner is at home */
      var cool = curSeason === 'autumn' || curSeason === 'winter' || h < 9 || h > 17;
      smoke.forEach(function (s) {
        var own = V.filter(function (v) { return v.id === s.id; })[0];
        var home = own && !own.stale && (own.status === 'home' || (own.inside && own.status !== 'work'));
        var on = cool && home && wx.kind !== 'rain' && !reduce;
        if (!on) { s.m.visible = false; return; }
        var q = ((t * 0.16) + s.ph) % 1, hs0 = s.h, sc = 1.22;
        var x = hs0.x + hs0.g.chimX * sc + q * (0.5 + wx.wind * 0.9) + Math.sin(t * 1.3 + s.ph * 9) * 0.05, y = hs0.y + hs0.g.chimTop * sc + q * 1.3, z = hs0.z + hs0.g.chimZ * sc - q * 0.2;
        place(s.m, x, y, z); s.m.rotation.y = t * 0.3 + s.ph;
        s.m.scale.setScalar(0.7 + q * 2.0); s.m.material.opacity = 0.55 * (1 - q) * Math.min(1, q * 6); s.m.visible = true;
      });
      zzs.forEach(function (z0) {
        var q = ((t * 0.12) + z0.ph) % 1, hq = z0.h, sc = 1.22;
        place(z0.s, hq.x + hq.g.chimX * sc + q * 0.55 + Math.sin(t * 1.6 + z0.ph * 7) * 0.08, hq.y + hq.g.chimTop * sc + 0.15 + q * 1.15, hq.z + hq.g.chimZ * sc);
        var sz = 0.3 + q * 0.3; z0.s.scale.set(sz, sz, 1); z0.s.material.opacity = Math.min(1, q * 5) * (1 - q); z0.s.visible = !reduce || q < 0.5;
      });
      housePlate();
      /* butterflies flutter around their flowers by day */
      var fly = dayLight > 0.5 && wx.kind === 'clear' && curSeason !== 'winter';
      bfly.forEach(function (b) {
        b.g.visible = fly; if (!fly) return;
        var tt = reduce ? 0 : t;
        var x = b.cx + Math.sin(tt * 0.5 + b.ph) * b.r + Math.sin(tt * 1.7 + b.ph * 2) * 0.25, z = b.cz + Math.sin(tt * 0.37 + b.ph * 1.3) * b.r * 0.6 + Math.cos(tt * 1.3) * 0.2;
        var y = (isTier(x, z) ? 1 : 0) + 0.45 + Math.abs(Math.sin(tt * 2.3 + b.ph)) * 0.35;
        place(b.g, x, y, z); b.g.rotation.y = Math.atan2(Math.cos(tt * 0.5 + b.ph), -Math.sin(tt * 0.37 + b.ph * 1.3)) ;
        var flap = Math.sin(tt * 22 + b.ph) * 1.1; b.pl.rotation.z = flap; b.pr.rotation.z = -flap;
      });
      /* villagers' small habits */
      if (!reduce) V.forEach(function (v) {
        if (v === meV || v.walk || v.stale || v.faded || !v.outer.visible) { v.act = null; return; }
        if (v.act && t > v.act.until) { v.act = null; v.actNext = t + 4 + hsh(t, v.phase) * 9; }
        if (!v.act && t > v.actNext) {
          var r = hsh(v.phase * 3, t), fr = nearestFriend(v);
          if (fr && r < 0.45) v.act = { kind: 'face', to: fr, until: t + 4 + r * 8 };
          else if (r < 0.75) v.act = { kind: 'look', yaw: (hsh(t, 7) - 0.5) * 1.6, until: t + 2 + r * 2 };
          else v.act = { kind: 'stretch', start: t, until: t + 1.8 };
        }
      });
    }
    var myWorld = this._world;
    var tick = function () {
      if (self._dead || self._world !== myWorld) return;
      var t = (performance.now() - t0) / 1000, dt = Math.min(0.05, t - lastT); lastT = t;
      var wx = self._weather(), mode = self.props.timeMode ?? '실시간';
      var liveH = mode === '타임랩스' ? (6 + (t / 120) * 24) % 24 : null;
      if (liveH != null && Math.floor(t) !== lastTl) { lastTl = Math.floor(t); self.setState({ tl: liveH }); }
      var h = self._hour(liveH);
      if (mode === '타임랩스' || t - lastEnvT > 1) {
        lastEnvT = t; applyEnv(envAt(h, wx), wx, h);
        var ss = self._season(); if (ss !== curSeason) { curSeason = ss; applySeason(ss); }
      }
      skyU.uTime.value = t; waterU.uTime.value = reduce ? 0 : t;
      /* clouds drift north, fading in and out */
      clouds.forEach(function (c) {
        var active = c.idx < wx.clouds;
        if (!reduce) { c.z -= dt * c.sp * (0.6 + wx.wind * 1.2); c.x += dt * wx.wind * 0.5; }
        if (c.z < -66) { c.z = -26 - hsh(c.idx, t) * 4; c.x = (hsh(c.idx + 3, t) - 0.5) * 40; }
        var fade = Math.min(1, (-26 - c.z) / 6) * Math.min(1, (c.z + 66) / 8);
        c.m.opacity += ((active ? Math.max(0, fade) * 0.95 : 0) - c.m.opacity) * Math.min(1, dt * 2);
        c.g.visible = c.m.opacity > 0.02;
        placeCloud(c);
      });
      /* shooting stars on clear nights */
      if (skyU.uStars.value > 0.6 && wx.kind === 'clear' && !reduce) {
        if (meteor.t < 0 && t > meteor.next) { meteor.t = 0; meteor.az = 0.14 + hsh(t, 1) * 0.12; meteor.e = -0.428 - hsh(t, 2) * 0.006; }
        if (meteor.t >= 0) {
          /* slow enough to make a wish: about 2.8 s across, easing in and fading out at the end */
          meteor.t += dt / 2.8;
          var mu = Math.min(1, meteor.t), ma = Math.min(1, mu / 0.12) * (1 - Math.max(0, (mu - 0.72) / 0.28));
          skyU.uMeteor.value.set(meteor.az, meteor.e, 1 - Math.pow(1 - mu, 1.6), Math.max(0, ma));
          if (meteor.t >= 1) { meteor.t = -1; meteor.next = t + 12 + hsh(t, 3) * 22; skyU.uMeteor.value.w = 0; }
        }
      } else skyU.uMeteor.value.w = 0;
      var sway = wx.wind >= 0.5 ? 0.07 : 0.025;
      if (!reduce) swayers.forEach(function (g) { var gu = gustAt(t, g.position.x); g.rotation.z = Math.sin(t * (1.6 + wx.wind) + g.phase) * sway * (0.45 + gu) + (gu - 0.55) * sway * 0.6; if (g.parent === scene) g.rotation.x = Math.atan2(g.position.z, g.position.y + R) + Math.sin(t * 0.9 + g.phase * 1.7) * sway * 0.25 * gu; });
      lifeTick(t, dt, wx, h);
      if (!reduce && hall.flag) hall.flag.rotation.y = Math.sin(t * 3) * 0.25;
      steamers.forEach(function (st) { var q = ((t * 0.35) + st.ph) % 1; st.m.position.set(st.x + Math.sin(t * 2 + st.ph * 6) * 0.04, st.y + q * 0.42, st.z); st.m.scale.setScalar(0.6 + q * 1.3); st.m.material.opacity = reduce ? 0 : 0.6 * (1 - q) * Math.min(1, q * 5); });
      if (tapT >= 0) { tapT += dt; tapRing.material.opacity = Math.max(0, 0.9 - tapT * 0.9); tapRing.scale.setScalar(1 + tapT * 0.6); if (tapT > 1) tapT = -1; }
      if (!reduce) fnt.spray.forEach(function (dr, i) { var q = ((t * 0.9) + i / 6) % 1, a = i * 1.047; dr.position.set(Math.cos(a) * q * 0.42, 1.05 + Math.sin(q * Math.PI) * 0.32, Math.sin(a) * q * 0.42); });
      V.forEach(function (v) {
        var selected = self.state.sel === v.id, walking = !!v.walk, bob = 0, targetYaw = v.yaw;
        if (walking) {
          var w = v.walk, remain = w.total - w.done;
          var spd = reduce ? 30 : Math.min(2.1, w.spd + dt * 7, Math.sqrt(2 * 6 * Math.max(remain, 0)) + 0.35);
          w.spd = spd; var step = spd * dt; w.done += step; w.s += step; v.stride += step;
          var a = w.pts[w.i], b = w.pts[w.i + 1], len = seglen(a, b);
          while (w.s >= len && w.i < w.pts.length - 2) { w.s -= len; w.i++; a = w.pts[w.i]; b = w.pts[w.i + 1]; len = seglen(a, b); }
          var u = Math.min(1, w.s / len);
          v.cur = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
          place(v.outer, v.cur[0], v.cur[1], v.cur[2]);
          if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.01) targetYaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
          if (w.i >= w.pts.length - 2 && u >= 1) {
            v.walk = null; v.yaw = Math.atan2(-v.cur[0], 12 - v.cur[2]);
            if (w.onArrive) w.onArrive();
            self.setState({ tags: projectAll() });
          }
        }
        if (!walking && v.act && !selected) {
          if (v.act.kind === 'face' && v.act.to) targetYaw = Math.atan2(v.act.to.cur[0] - v.cur[0], v.act.to.cur[2] - v.cur[2]);
          else if (v.act.kind === 'look') targetYaw = v.yaw + v.act.yaw;
        }
        var dyw = Math.atan2(Math.sin(targetYaw - v.curYaw), Math.cos(targetYaw - v.curYaw));
        v.curYaw += dyw * Math.min(1, dt * (walking ? 12 : 5));
        var rig = v.inner;
        v.swing += ((walking && !reduce ? 1 : 0) - v.swing) * Math.min(1, dt * 9);
        var sw = v.swing, ph = v.stride * 5.6, idle = 1 - sw;
        rig.legs[0].rotation.x = Math.sin(ph) * 0.7 * sw; rig.legs[1].rotation.x = -Math.sin(ph) * 0.7 * sw;
        rig.arms[0].rotation.x = -Math.sin(ph) * 0.65 * sw; rig.arms[1].rotation.x = Math.sin(ph) * 0.65 * sw;
        rig.body.position.y = Math.abs(Math.cos(ph)) * 0.06 * sw;
        rig.body.rotation.x = 0.12 * sw;
        rig.neck.rotation.z = Math.sin(ph) * 0.06 * sw;
        if (!reduce) {
          rig.neck.rotation.y = idle * Math.sin(t * 0.45 + v.phase * 2) * 0.28 * (v.stale ? 0 : 1);
          rig.neck.rotation.x = idle * (v.stale ? 0.25 : Math.sin(t * 0.9 + v.phase) * 0.04);
          rig.arms[0].rotation.z = rig.arms[0].baseZ + idle * Math.sin(t * 1.6 + v.phase) * 0.05;
          rig.arms[1].rotation.z = rig.arms[1].baseZ - idle * Math.sin(t * 1.6 + v.phase) * 0.05;
          bob = v.stale || v.faded ? 0 : Math.sin(t * 2 + v.phase) * 0.012 * idle;
          if (v.act && v.act.kind === 'stretch') { var su = Math.sin(Math.min(1, (t - v.act.start) / 1.8) * Math.PI); rig.arms[0].rotation.z = rig.arms[0].baseZ - su * 2.4; rig.arms[1].rotation.z = rig.arms[1].baseZ + su * 2.4; rig.neck.rotation.x = -su * 0.15; bob += su * 0.03; }
          if (v.act && v.act.kind === 'face') rig.neck.rotation.y *= 0.3;
        }
        rig.position.y = bob;
        rig.rotation.y = v.curYaw;
        rig.rotation.z = v.stale ? 0.22 : 0;
        if (v.ghost) { v.ghost.position.y = bob + rig.body.position.y + (reduce ? 0 : Math.sin(t * 2.4) * 0.06); v.ghost.rotation.y = rig.rotation.y; }
      });
      if (!reduce) {
        if (rain.mesh.visible) { rain.ps.forEach(function (p, i) {
          p.y -= dt * 11 * p.s; p.x += dt * 1.2 * wx.wind;
          if (p.y < groundY(p.z)) { p.y = 9 + hsh(i, t) * 2; p.x = (hsh(i, t + 1) - 0.5) * 18; }
          dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, -0.12 * wx.wind); dummy.updateMatrix(); rain.mesh.setMatrixAt(i, dummy.matrix);
        }); rain.mesh.instanceMatrix.needsUpdate = true; }
        if (snow.mesh.visible) { snow.ps.forEach(function (p, i) {
          p.y -= dt * 1.1 * p.s; p.x += Math.sin(t * 1.3 + i) * dt * 0.4;
          if (p.y < groundY(p.z)) { p.y = 9 + hsh(i, t) * 2; p.x = (hsh(i, t + 1) - 0.5) * 18; }
          dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); snow.mesh.setMatrixAt(i, dummy.matrix);
        }); snow.mesh.instanceMatrix.needsUpdate = true; }
        if (leaves.mesh.visible) { var lw = wx.wind; leaves.ps.forEach(function (p, i) {
          /* windy days blow them across quickly; calm days they drift and flutter down slowly */
          p.x += dt * (0.3 + lw * 1.6 + p.s * (0.25 + lw * 0.75)); p.y = 0.6 + (p.s * (1.2 + lw)) + Math.sin(t * (0.7 + lw * 1.3) + i) * (0.25 + lw * 0.15);
          if (p.x > 9) { p.x = -9; p.z = -12 + hsh(i, t) * 14; }
          dummy.position.set(p.x, groundY(p.z) + p.y, p.z); dummy.rotation.set(t * (1 + lw * 2) + i, t * (0.7 + lw * 1.3), i); dummy.updateMatrix(); leaves.mesh.setMatrixAt(i, dummy.matrix);
        }); leaves.mesh.instanceMatrix.needsUpdate = true; }
      }
      /* follow me; when I'm out at work the camera rests on the plaza */
      var hiddenAt = meV.insideAt || [L.office.x, L.office.z + 0.6], fxT = meV.outer.visible ? meV.cur[0] : hiddenAt[0], fzT = meV.outer.visible ? meV.cur[2] : hiddenAt[1];
      fxT = Math.max(-4.4, Math.min(4.4, fxT)); fzT = Math.max(-14.2, Math.min(1.4, fzT));
      if (!camInit) { camX = fxT; camZ = fzT; camInit = true; }
      var kf = reduce ? 1 : Math.min(1, dt * 3.2), ox = camX, oz = camZ;
      camX += (fxT - camX) * kf; camZ += (fzT - camZ) * kf;
      aimRig(camX, camZ);
      var camMoving = Math.abs(camX - ox) + Math.abs(camZ - oz) > 0.0015;
      tickBirds(t, dt);
      if (meV.walk || camMoving) self._lastActive = performance.now();
      var idle = performance.now() - (self._lastActive || 0) > 3200;
      if (idle !== !!self.state.hudOn && pf % 6 === 0) self.setState({ hudOn: idle });
      tickFireworks(t, dt);
      if (pf % 8 === 0) { var nd = doorNear(); if ((nd && nd.id) !== (nearDoor && nearDoor.id)) { nearDoor = nd; self._liveTags = projectAll(); self.setState({ door: nd ? nd.id : null, tags: self._liveTags }); } }
      if (self.state.scene !== 'village') { self._raf = requestAnimationFrame(tick); return; }
      post(scene, camera);
      pf++;
      if (!projected) { projected = true; self.setState({ tags: projectAll() }); }
      else if (meV.walk || camMoving || anyWalk()) {
        var lt = projectAll(); self._liveTags = lt; movePins(lt); stillFrames = 0;
        if (pf % 30 === 0) self.setState({ tags: lt });
      } else if (stillFrames++ === 2) { self._liveTags = projectAll(); self.setState({ tags: self._liveTags }); }
      self._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  _goDoor(d) {
    var self = this, w = this._world; if (!w || !d || this._entering) return;
    this._entering = true;
    var m = w.meScreen();
    this._iris('close', m.x, m.y, function () {
      self._entering = false;
      if (d.scene) { setTimeout(function () { if (!self._dead) self._enterScene(d.scene, { door: null, myStatus: d.status, sel: 'me' }); }, 160); return; }
      w.goInside(d); self.setState({ door: null, myInside: true, myStatus: d.status, sel: 'me' });
      setTimeout(function () { self._iris('open', 195, 422); }, 260);
    });
  }

  /* swap in a scene (cafe, office, face) while the screen is dark, then open the circle again on top of it */
  _enterScene(name, extra) {
    var self = this, st = Object.assign({ scene: name }, extra || {});
    this.setState(st);
    setTimeout(function () { if (!self._dead) self._iris('open', 195, 422); }, 220);
  }

  _autoEnter(id) {
    var w = this._world; if (!w || this.state.scene !== 'village') return;
    var d = w.enterDoor(id); if (d) this._goDoor(d);
  }

  _applyGhost() {
    var w = this._world; if (!w || !w.me) return;
    var g = this.state.ghost, hidden = w.me.inside && !w.me.walk;
    w.me.inner.visible = !g; w.me.ghost.visible = g; w.me.outer.visible = !hidden;
  }

  renderVals() {
    var self = this, D = this._data(), ghost = this.state.ghost;
    var mode = this.props.timeMode ?? '실시간', h = this._hour(), wx = this._weather(), clk = this._seoul();
    var phase = h >= 5.5 && h < 9 ? '아침' : h >= 9 && h < 17 ? '낮' : h >= 17 && h < 19.5 ? '노을' : '밤';
    var dark = phase === '밤';
    var hh = mode === '실시간' ? clk.hh : Math.floor(h), mm = mode === '실시간' ? clk.mm : Math.floor((h % 1) * 60);
    var clock = (hh < 12 ? '오전 ' : '오후 ') + ((hh % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm;
    function sprite(rows, pal, s) {
      var out = [];
      for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) { var c = pal[rows[y].charAt(x)]; if (!c) continue; out.push(((x + 1) * s) + 'px ' + ((y + 1) * s) + 'px 0 0 ' + c); }
      return out.join(', ');
    }
    var INK = { k: '#2A1E16', p: '#F49AA8', r: '#D9534F', b: '#7EC8F0', w: '#FFFFFF' };
    var tags = this._liveTags || this.state.tags, myStatus = this.state.myStatus;
    var nbt = tags && tags.nb;
    var NOTE_BG = ['#FFFFFF', '#FFE9A0', '#F9CFE0', '#CFE8F5', '#DDF0C8'];
    var evN = this._events(), DN = this._data();
    var pinned = evN.bdays.map(function (id) { return { who: '마을 회관', text: '오늘은 ' + DN.F[id].name + ' 생일이에요! 다 같이 축하해 줘요', when: '오늘', bg: '#F9CFE0' }; });
    if (evN.holiday) pinned.push({ who: '마을 회관', text: '오늘은 ' + evN.holiday + '! 밤에 불꽃놀이가 있어요', when: '오늘', bg: '#FFE9A0' });
    var notices = pinned.concat(this._notices().filter(function (n) { return !n.id || DN.F[n.id]; })).map(function (n, i) { return { who: n.id ? DN.F[n.id].name : n.who, text: n.text, when: n.when, bg: NOTE_BG[i % NOTE_BG.length], rot: [-2, 1.5, -1, 2, -1.5, 1][i % 6] }; }).slice(0, 8);
    if (!this._mctx) { try { this._mctx = document.createElement('canvas').getContext('2d'); } catch (e) { this._mctx = null; } }
    var mctx = this._mctx;
    function textW(t) {
      if (mctx) { mctx.font = "12px 'Galmuri11', monospace"; var w = mctx.measureText(t).width; if (w > 0) return w; }
      var w2 = 0; for (var i = 0; i < t.length; i++) w2 += t.charCodeAt(i) > 0x2E80 ? 12 : 7; return w2;
    }
    var cueNow = this._cueNow(), cueFriend = cueNow === 'friend' ? (D.people.filter(function (p) { var st0 = self._fresh(p); return p.id !== 'me' && p.status !== 'work' && !st0.sleepy && !st0.faded && tags && tags[p.id]; })[0] || {}).id : null;
    if (cueFriend && !this._cueCalled && this._world) { this._cueCalled = true; setTimeout(function () { if (!self._dead && self._cueNow() === 'friend') self._sayVillage(cueFriend, '어 왔어? 여기여기!', 5000); }, 2500); }
    var friends = D.people.map(function (p) {
      var f = D.F[p.id], status = p.id === 'me' ? myStatus : p.status, sm = D.S[status];
      var selected = self.state.sel === p.id, tg = tags && tags[p.id];
      var x = tg ? tg.x : 0, head = tg ? tg.head : 0, feet = tg ? tg.feet : 0;
      var pal = { h: f.hair }; for (var k in INK) pal[k] = INK[k]; if (f.ink) for (var k2 in f.ink) pal[k2] = f.ink[k2];
      var fr = self._fresh(p), stale = fr.sleepy, since = fr.since;
      if (self._world && self._world.fade && p.id !== 'me') self._world.fade(p.id, fr.faded);
      var mood = p.id === 'me' && self.state.myMood ? self.state.myMood : p.mood, say = self.state.says[p.id], saying = !!(say && say.until > Date.now());
      return {
        id: p.id, name: f.name, status: status, mood: mood, saying: saying, quiet: !saying, sayText: saying ? say.text : '', skin: f.skin, portrait: sprite(f.rows, pal, 4),
        tint: f.tint, stripe: 'repeating-linear-gradient(135deg, ' + f.stripe[0] + ' 0 6px, ' + f.stripe[1] + ' 6px 12px)',
        place: fr.faded ? sm.past : sm.place, chip: sm.label + ' · ' + p.area, chipBg: sm.chipBg, since: since,
        onMap: p.id === 'me' ? !self.state.myInside && status !== 'work' : status !== 'work' && !stale, bx: x - 22, by: head - 4, bh: Math.max(30, feet - head + 8),
        cue: p.id === cueFriend && !selected, selected: selected, notSelected: !selected, tagText: stale ? f.name + ' Zz' : fr.faded ? f.name + ' · ' + since : (self._events().bdays.indexOf(p.id) >= 0 ? f.name + ' · 생일' : f.name), tagFg: stale || fr.faded ? '#76685A' : (selected ? '#4A2E3E' : '#5A4632'), tagBg: selected ? f.tint : '#FFFFFF',
        bubW: saying ? Math.min(180, Math.ceil(textW(say.text)) + 24) : 0, bubL: 0,
        z: selected ? 10 : 2, label: f.name + ', ' + sm.place,
        canEnter: status === 'cafe', cantEnter: status !== 'cafe',
        pick: function () { self.setState({ sel: p.id, picker: false }); if (p.id !== 'me') self._cueDone('friend'); }
      };
    });
    friends.forEach(function (f) { if (!f.saying) return; var x = f.bx + 22, absL = Math.max(6, Math.min(384 - f.bubW, x - f.bubW / 2)); f.bubL = Math.round(absL - f.bx); });
    var placedB = [];
    friends.filter(function (f) { return f.saying && f.onMap; }).sort(function (a, b) { return (self.state.says[a.id].until) - (self.state.says[b.id].until); }).forEach(function (f) {
      var tw0 = textW(f.sayText), lines = tw0 + 24 > 180 ? Math.ceil(tw0 / 156) : 1;
      var w = f.bubW, cx = f.bx + f.bubL + w / 2, h = 20 + 15 * lines + 15, lift = 0;
      for (var guard = 0; guard < 8; guard++) {
        var top = f.by - 12 - h - lift, bot = f.by - 12 - lift, hitQ = null;
        for (var i = 0; i < placedB.length; i++) { var q = placedB[i]; if (Math.abs(q.cx - cx) < (q.w + w) / 2 + 4 && top < q.bot + 3 && bot > q.top - 3) { hitQ = q; break; } }
        if (!hitQ) break; lift = (f.by - 12) - (hitQ.top - 3);
      }
      f.lift = lift; f.tailShow = lift === 0;
      placedB.push({ cx: cx, w: w, top: f.by - 12 - h - lift, bot: f.by - 12 - lift });
    });
    friends.forEach(function (f) { if (f.lift == null) { f.lift = 0; f.tailShow = true; } });
    var sel = friends.filter(function (f) { return f.selected; })[0] || friends[0];
    var mapPins = [];
    if (this.state.mapOpen && this._world) {
      var pos = this._world.positions();
      D.people.forEach(function (p) {
        var q = pos[p.id]; if (!q || q.hidden) return;
        var f = D.F[p.id];
        mapPins.push({ name: f.name, tint: p.id === 'me' ? '#FFD36B' : f.tint, x: Math.round((q.x + 9) * 16), y: Math.round((q.z + 18) * 16), z: p.id === 'me' ? 3 : 2,
          label: f.name + ' 위치', pick: function () { self.setState({ sel: p.id, mapOpen: false }); } });
      });
    }
    var isMe = sel.id === 'me';
    var evS = this._events();
    var selOut = { bday: evS.bdays.indexOf(sel.id) >= 0 && sel.id !== 'me', name: sel.name, place: sel.place, since: sel.since, mood: sel.mood, skin: sel.skin, portrait: sel.portrait, tint: sel.tint, stripe: sel.stripe, tabBg: isMe ? '#F7CFE0' : sel.tint,
      chip: sel.chip, chipBg: sel.chipBg, canEnter: sel.canEnter, cantEnter: sel.cantEnter };
    var atWork = D.people.filter(function (p) { return p.id !== 'me' && p.status === 'work'; }).map(function (p) { return D.F[p.id].name; }); if (myStatus === 'work' || (this._world && this._world.me.status === 'work')) atWork.push('나');
    var bt = tags && tags.board;
    var statusOptions = ['home', 'commute', 'work', 'cafe', 'food', 'play'].map(function (k) {
      var s = D.S[k];
      return { label: s.label, where: s.where, cls: k === myStatus ? 'btn by' : 'btn bc',
        pick: function () { self.setState({ myStatus: k, picker: false, sel: 'me' }); if (self._world) self._world.walkTo(k); } };
    });
    var onMapIds = friends.filter(function (f) { return f.onMap && f.id !== 'me'; }).map(function (f) { return f.id; });
    var choices = isMe ? [] : [
      { label: this.state.waved === sel.id ? '흔들었어요!' : '손 흔들기', isBtn: true, isLink: false, pick: function () { self.setState({ waved: sel.id }); self._sayVillage(sel.id, '안녕~!', 4000); } },
      { label: '옆으로 가기', isBtn: true, isLink: false, pick: function () { if (self._world && self._world.walkNear(sel.id)) self._walkingTo(sel.id); } }
    ];
    if (!isMe) choices.push(sel.canEnter ? { label: '카페 들어가기', isBtn: false, isLink: true, href: 'Cafe.dc.html' } : { label: this.state.poked === sel.id ? '보냈어요!' : null, isBtn: true, isLink: false, pick: function () { self.setState({ poked: sel.id }); } });
    var pokeWord = { home: '집 노크하기', commute: '응원 보내기', work: '퇴근 응원하기', food: '맛있게 먹어', play: '나도 끼워줘' }[sel.status] || '콕 찌르기';
    var SUN = ['Y..Y..Y', '.YYYYY.', '.YYYYY.', 'YYYYYYY', '.YYYYY.', '.YYYYY.', 'Y..Y..Y'];
    var MOON = ['..MMM..', '.MMM...', 'MMM....', 'MMM....', 'MMM....', '.MMM...', '..MMM..'];
    var CLOUD = ['.......', '..CCC..', '.CCCCC.', 'CCCCCCC', 'CCCCCCC', '.......', '.......'];
    var RAIN = ['..CCC..', '.CCCCC.', 'CCCCCCC', '.......', 'B..B..B', '.B..B..', 'B..B..B'];
    var SNOW = ['..CCC..', '.CCCCC.', 'CCCCCCC', '.......', 'W..W..W', '.......', '.W..W..'];
    var icon = wx.kind === 'rain' ? sprite(RAIN, { C: '#9AA6B8', B: '#4A78B5' }, 2) : wx.kind === 'snow' ? sprite(SNOW, { C: '#9AA6B8', W: '#BFD3E6' }, 2) : wx.kind === 'cloudy' ? sprite(CLOUD, { C: '#9AA6B8' }, 2) : dark ? sprite(MOON, { M: '#FFE08A' }, 2) : sprite(SUN, { Y: phase === '노을' ? '#F08A3C' : '#F5B83D' }, 2);
    var GHOST = ['...OOOOOO...', '..OWWWWWWO..', '.OWWWWWWWWO.', 'OWWKWWWWKWWO', 'OWWKWWWWKWWO', 'OWWWWWWWWWWO', 'OWCWWWWWWCWO', 'OWWWWWWWWWWO', 'OWWWWWWWWWWO', 'OWOWWOOWWOWO', 'OO.OO..OO.OO'];
    if (!isMe && choices[2] && choices[2].label === null) choices[2].label = pokeWord;
    var headerBg = dark ? '#26324A' : phase === '노을' ? '#FCE3CF' : phase === '아침' ? '#FFF1E6' : '#FFF7E3';
    return {
      headerBg: headerBg, headerFg: dark ? '#FFF3DC' : '#4A3426', headerSub: dark ? '#C9BFA8' : '#6B5140',
      skyFallback: dark ? '#26324A' : '#9ED6F2',
      clock: clock, dateLabel: clk.dateLabel + ' · ' + { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' }[this._season()], phaseLabel: mode === '타임랩스' ? phase + ' · 타임랩스' : phase, weatherLabel: wx.label, skyIcon: icon,
      setCanvas: this.setCanvas, setMapCanvas: this.setMapCanvas, glFailed: this.state.glFailed, pinsReady: !!tags && !this.state.glFailed,
      tapMap: function (e) { if (self._world && !self.state.mapOpen && !self.state.phoneOpen && !self.state.boardOpen) self._world.tapAt(e); },
      hintShow: !this.state.tapped && !this.state.glFailed,
      toast: { show: !!this.state.toast, text: this.state.toast ? this.state.toast.text : '' },
      mapOpen: this.state.mapOpen,
      openMap: function () { self.setState({ mapOpen: true }); },
      closeMap: function () { self.setState({ mapOpen: false }); },
      mapPins: mapPins,
      friends: friends, sel: selOut, isMe: isMe, notMe: !isMe, choices: choices, dlgShow: !this.state.mapOpen && !this.state.phoneOpen && !this.state.boardOpen,
      draft: this.state.draft,
      onDraft: function (e) { self._lastActive = performance.now(); self.setState({ draft: e.target.value }); },
      setInput: function (el) { if (el) self._inputEl = el; },
      setIris: function (el) { if (el) self._irisEl = el; },
      setHouseTag: function (el) { if (el) self._houseEl = el; },
      inCafe: this.state.scene === 'cafe', inFace: this.state.scene === 'face', inOffice: this.state.scene === 'office',
      leaveScene: function () {
        if (self._world) self._world.resetDoor();
        self.setState({ scene: 'village' });
        var m = self._world ? self._world.meScreen() : { x: 195, y: 422 };
        setTimeout(function () { self._iris('open', m.x, m.y); }, 120);
      },
      meFace: { rows: D.F.me.rows, skin: D.F.me.skin, hair: D.F.me.hair, shirt: D.F.me.shirt, pattern: D.F.me.pattern || 'plain', name: D.F.me.name, ink: D.F.me.ink || null, photo: !!D.F.me.photo },
      faceDone: function (face) {
        self._applyFace(face);
        self.renderVals().leaveScene();
      },
      door: (function () {
        var w = self._world, d = self.state.door && w ? w.enterDoor(self.state.door) : null, dt = tags && tags.door;
        if (!d || self.state.boardOpen || self.state.phoneOpen || self.state.mapOpen) return { show: false, x: 0, y: 0, label: '', go: function () {} };
        return { show: true, x: dt.x, y: dt.y, label: d.label, go: function () { self._goDoor(d); } };
      })(),
      say: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var raw = (self._inputEl && self._inputEl.value) || self.state.draft || '', text = raw.trim(); if (!text) return;
        if (self._inputEl) self._inputEl.value = '';
        self.setState({ draft: '', sel: 'me' }); self._sayVillage('me', text, 9000); self._nearbyReply(text);
      },
      sayKey: function (e) { if (e && e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); self.renderVals().say(); } },
      cl: { box: self._cloud(374, 132, 3), pick: self._cloud(374, 142, 7) },
      boardOpen: this.state.boardOpen,
      villageName: this.state.villageName,
      setOpen: this.state.setOpen,
      hud: (function () {
        var ev = self._events(), D2 = self._data(), on = self.state.hudOn && !self.state.mapOpen && !self.state.phoneOpen && !self.state.boardOpen && !self.state.setOpen;
        var evText = ev.bdays.length ? ev.bdays.map(function (id) { return D2.F[id].name; }).join(', ') + ' 생일' : (ev.holiday || '');
        return { date: String(clk.dateLabel).replace(/\s*\([^)]*\)\s*$/, ''), wx: String(wx.label).split(' · ')[0], op: on ? 1 : 0, dy: on ? 0 : -10, pe: on ? 'auto' : 'none', bg: dark ? 'rgba(38, 50, 74, 0.92)' : 'rgba(255, 249, 236, 0.94)', fg: dark ? '#FFF3DC' : '#4A3426', sub: dark ? '#C9BFA8' : '#6B5140', hasEvent: !!evText, event: evText, aria: self.state.villageName + ', ' + clock + ', 마을 설정 열기' };
      })(),
      openSettings: function () { self.setState({ setOpen: true, nameDraft: self.state.villageName, phoneOpen: false }); },
      closeSettings: function () { self.setState({ setOpen: false, kakao: null, kkErr: '' }); },
      nameDraft: this.state.nameDraft == null ? this.state.villageName : this.state.nameDraft,
      onNameDraft: function (e) { self.setState({ nameDraft: e.target.value }); },
      onKakao: function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () { var out = self._parseKakao(rd.result); try { e.target.value = ''; } catch (x) {} if (!out) { self.setState({ kakao: null, kkErr: '카톡 대화 내보내기 파일이 아닌 것 같아요' }); return; } self.setState({ kakao: out, kkErr: '', meName: out.members[0].name, nameDraft: out.room ? (/마을$/.test(out.room) ? out.room : out.room + ' 마을') : self.state.nameDraft }); };
        rd.onerror = function () { self.setState({ kkErr: '파일을 읽지 못했어요' }); };
        rd.readAsText(f, 'utf-8');
      },
      kk: (function () {
        var k = self.state.kakao;
        if (!k) return { has: false, members: [], title: '', err: !!self.state.kkErr, errText: self.state.kkErr || '' };
        return { has: true, err: false, errText: '', title: (k.room || '카톡방') + ' · ' + k.members.length + '명', members: k.members.map(function (m) { var on = self.state.meName === m.name; return { name: m.name, on: on, bg: on ? '#FFD36B' : '#FFFFFF', pick: function () { self.setState({ meName: m.name }); } }; }) };
      })(),
      applySettings: function () {
        var name = (self.state.nameDraft || '').trim() || self.state.villageName, k = self.state.kakao;
        if (k && !self._seedKey) {
          var others = k.members.filter(function (m) { return m.name !== self.state.meName; }).slice(0, 7);
          var rec = { room: k.room || '', me: (self.state.meName || '').slice(0, 6), others: others.map(function (m) { return m.name.slice(0, 6); }) };
          self._applyRoom(rec);
          try { window.localStorage.setItem('village.room.v1', JSON.stringify(rec)); } catch (x) {}
          self._rebuild();
        }
        try { window.localStorage.setItem('village.name.v1', name); } catch (x) {}
        self.setState({ villageName: name, setOpen: false, kakao: null, nameDraft: null, sel: 'me' });
      },
      roomMade: !!self._seedKey, roomInfo: self._roomInfo || '', roomOpen: !self._seedKey,
      officeSky: { h: h, kind: wx.kind, wind: wx.wind, clouds: wx.clouds },
      friendNames: (function () { var D4 = self._data(), o = {}; Object.keys(D4.F).forEach(function (id) { if (id !== 'me') o[id] = D4.F[id].name; }); return o; })(),
      openBoard: function () { self.setState({ boardOpen: true, phoneOpen: false, picker: false }); self._cueDone('board'); },
      closeBoard: function () { self.setState({ boardOpen: false }); },
      notices: notices,
      noticeTab: this.state.boardTab === 'notice',
      boardTabs: [['notice', '공지'], ['word', '오늘의 단어']].map(function (t) { var on = self.state.boardTab === t[0]; return { label: t[1], on: on, bg: on ? '#FFD36B' : '#FFF6E4', pick: function () { self.setState({ boardTab: t[0] }); } }; }),
      setWordInput: function (el) { if (el) self._wordEl = el; },
      wg: (function () {
        var PZ = self._puzzles(), keys = Object.keys(PZ), d0 = new Date(Date.UTC(2026, 0, 1)), today = Math.floor((self.state.now + 9 * 3600000 - d0.getTime()) / 86400000);
        var answer = keys[((today % keys.length) + keys.length) % keys.length], rel = PZ[answer];
        var ranked = Object.keys(rel).sort(function (a, b) { return rel[b] - rel[a]; });
        function hsh(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100003; return h; }
        function score(w) {
          if (w === answer) return { sim: 100, rank: '정답' };
          if (rel[w] != null) return { sim: rel[w] + (hsh(w) % 97) / 100, rank: (ranked.indexOf(w) + 1) + '위' };
          var share = 0; for (var i = 0; i < w.length; i++) if (answer.indexOf(w.charAt(i)) >= 0) share++;
          return { sim: 4 + (hsh(w + answer) % 1400) / 100 + share * 6, rank: '1000위 밖' };
        }
        var gs = self.state.wGuesses, won = gs.indexOf(answer) >= 0, gaveUp = self.state.wDone === 'gaveup';
        var rows = gs.map(function (w) { var sc = score(w); return { word: w, simN: sc.sim, sim: sc.sim.toFixed(2), rank: sc.rank, bar: Math.max(3, Math.round(sc.sim)), barBg: sc.sim >= 100 ? '#FFD36B' : sc.sim > 55 ? '#FCE3B0' : sc.sim > 35 ? '#FDF0D2' : '#F4EEE2' }; });
        var lastW = gs[gs.length - 1], last = lastW ? rows.filter(function (r) { return r.word === lastW; })[0] : null;
        var list = rows.slice().sort(function (a, b) { return b.simN - a.simN; });
        if (gaveUp && !won) list = [{ word: answer, sim: '100.00', rank: '정답', bar: 100, barBg: '#FFD36B' }].concat(ranked.slice(0, 8).map(function (w) { var sc = score(w); return { word: w, sim: sc.sim.toFixed(2), rank: sc.rank, bar: Math.round(sc.sim), barBg: '#FCE3B0' }; }));
        var DF = self._data().F, friends = [['jimin', ' · 정답! 23번 만에', '#F8C9A0'], ['minjun', ' · 최고 4위', '#CDE8B0'], ['haeun', ' · 아직 1000위 밖', '#F7E2A0']].filter(function (q) { return DF[q[0]]; }).map(function (q) { return { text: DF[q[0]].name + q[1], bg: q[2] }; });
        function submit() {
          var raw = (self._wordEl && self._wordEl.value) || self.state.wDraft || '', w = raw.trim().replace(/\s+/g, ''); if (!w) return;
          if (self._wordEl) self._wordEl.value = '';
          var next = self.state.wGuesses.indexOf(w) >= 0 ? self.state.wGuesses.filter(function (x) { return x !== w; }).concat([w]) : self.state.wGuesses.concat([w]);
          self.setState({ wGuesses: next, wDraft: '' });
        }
        return {
          show: self.state.boardTab === 'word', no: today + 1, tries: gs.length,
          playing: !won && !gaveUp, won: won || gaveUp,
          wonText: won ? '정답 「' + answer + '」! ' + (gs.indexOf(answer) + 1) + '번 만에 맞혔어요' : '오늘의 단어는 「' + answer + '」였어요',
          friends: friends, list: list, hasLast: !!last && !won && !gaveUp, last: last || { word: '', sim: '', rank: '' },
          draft: self.state.wDraft,
          onDraft: function (e) { self.setState({ wDraft: e.target.value }); },
          key: function (e) { if (e && e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); } },
          guess: submit,
          giveUp: function () { self.setState({ wDone: 'gaveup' }); }
        };
      })(),
      nb: { x: nbt ? nbt.x : 0, y: nbt ? nbt.y : 0, count: notices.length + '개' },
      noteDraft: this.state.noteDraft,
      setNoteInput: function (el) { if (el) self._noteEl = el; },
      onNoteDraft: function (e) { self.setState({ noteDraft: e.target.value }); },
      postNote: function () {
        var raw = (self._noteEl && self._noteEl.value) || self.state.noteDraft || '', text = raw.trim(); if (!text) return;
        if (self._noteEl) self._noteEl.value = '';
        self.setState({ noteDraft: '', notices: [{ id: 'me', text: text, when: '방금' }].concat(self._notices()) });
      },
      noteKey: function (e) { if (e && e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); self.renderVals().postNote(); } },
      chipAria: '지금 상태 ' + selOut.chip + ', 눌러서 어디로 갈지 고르기',
      phoneOpen: this.state.phoneOpen,
      openPhone: function () { self.setState({ phoneOpen: true, picker: false }); self._cueDone('phone'); },
      phoneCue: cueNow === 'phone', boardCue: cueNow === 'board',
      closePhone: function () { self.setState({ phoneOpen: false }); },
      stop: function (e) { if (e && e.stopPropagation) e.stopPropagation(); },
      apps: [
        { label: '얼굴 그리기', isLink: false, isBtn: true, pick: function () { self.setState({ phoneOpen: false }); self._iris('close', 195, 422, function () { setTimeout(function () { if (!self._dead) self._enterScene('face'); }, 150); }); }, bg: '#F49AA8', icon: 'M2 0h3v1h1v1h1v3H6v1H5v1H2V6H1V5H0V2h1V1h1zM2 2v1h1V2zM4 2v1h1V2zM2 4v1h3V4z' },
        { label: '어디로 가기', isLink: false, isBtn: true, bg: '#7FC6E6', icon: 'M2 0h3v1h1v3H5v1H4v2H3V5H2V4H1V1h1zM3 1v2h1V1z', cue: cueNow === 'go', pick: function () { self.setState({ phoneOpen: false, picker: true, sel: 'me' }); self._cueDone('go'); } },
        { label: '게시판', isLink: false, isBtn: true, bg: '#D9A86C', icon: 'M0 0h7v5H4v1h1v1H2V6h1V5H0zM1 1v3h5V1zM2 2h3v1H2z', pick: function () { self.setState({ phoneOpen: false, boardOpen: true }); } },
        { label: '마을 설정', isLink: false, isBtn: true, bg: '#B8A6E0', icon: 'M3 0h1v1h1V0h1v2h1v1H6v1h1v1H6v2H5V6H4v1H3V6H2v1H1V5H0V4h1V3H0V2h1V0h1v1h1zM3 3v1h1V3z', pick: function () { self.setState({ phoneOpen: false, setOpen: true, nameDraft: self.state.villageName }); } },
        { label: '섬 지도', isLink: false, isBtn: true, bg: '#8CCB6A', icon: 'M0 1h2v5H0zM3 0h1v1h1V0h2v6H5V5H4v2H3V6H2V1h1z', pick: function () { self.setState({ phoneOpen: false, mapOpen: true }); } }
      ],
      cheerLabel: this.state.cheered === sel.id ? '축하했어요!' : '생일 축하하기',
      cheer: function () {
        var id = sel.id, nm = sel.name;
        if (self._world) self._world.cheer(id);
        self.setState({ cheered: id });
        self._sayVillage('me', nm + ' 생일 축하해!!', 6000);
        setTimeout(function () { if (!self._dead) self._sayVillage(id, '헉 고마워!! 다들 최고야', 6000); }, 1400);
      },
      nextFriend: function () { var i = onMapIds.indexOf(sel.id); self.setState({ sel: onMapIds[(i + 1) % onMapIds.length] }); },
      board: { x: bt ? bt.x : 0, y: bt ? bt.y : 0, names: atWork.join(', ') },
      showPicker: isMe && this.state.picker, hidePicker: !(isMe && this.state.picker), statusOptions: statusOptions,
      pickerLabel: this.state.picker ? '닫기' : '상태 바꾸기',
      togglePicker: function () { self.setState({ picker: !self.state.picker }); },
      infoNote: isMe ? (ghost ? '흐림 켜짐 · 친구들에겐 "서울 어딘가"로만 보여요' : '상태는 3시간 지나면 자동으로 흐려져요') : (sel.since.indexOf('졸고') >= 0 ? '9시간째 상태가 그대로라 졸고 있는 걸로 보여요' : '정확한 위치 대신 상태만 공유돼요'),
      waveLabel: this.state.waved === sel.id ? '흔들었어요!' : '손 흔들기',
      wave: function () { self.setState({ waved: sel.id }); },
      pokeLabel: this.state.poked === sel.id ? '보냈어요!' : pokeWord,
      poke: function () { self.setState({ poked: sel.id }); }
    };
  }
}
