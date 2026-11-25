import { DCLogic } from '../../dc/runtime.jsx';

// Default values of this screen's design tweaks (from the canvas data-props)
export const defaults = {};
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

export default class CafeLogic extends DCLogic {
  constructor(props) {
    super(props);
    var now = Date.now();
    this.state = {
      msgs: [
        { id: 1, who: 'jimin', text: '마감 2시간 남음… 살려줘', at: now - 2500 },
        { id: 2, who: 'minjun', text: 'ㅋㅋㅋ 힘내 아아 사줄게', at: now - 1200 },
        { id: 3, who: 'haeun', text: '나 방금 왔어!', at: now - 400 }
      ],
      typing: {}, recent: {}, now: now, peek: null, dlg: null, draft: '', tags: null, glFailed: false, treated: false, toast: null
    };
    this._canvas = null;
    this._timers = [];
    this._id = 4;
    this.setCanvas = (el) => { if (el) { this._canvas = el; if (this._mounted) this._boot(0); } };
  }

  _people() {
    var out = this._people0(), nm = this.props && this.props.names;
    if (nm) {
      for (var k in nm) if (out[k] && nm[k]) out[k].name = nm[k];
      /* only people who are actually in this chat room come in */
      Object.keys(out).forEach(function (id) { if (id !== 'me' && id !== 'barista' && !nm[id]) delete out[id]; });
    }
    return out;
  }
  _people0() {
    var meP = (this.props && this.props.me) || null;
    return {
      me: meP && meP.rows ? { name: meP.name || '나', skin: meP.skin, hair: meP.hair, style: 'short', shirt: meP.shirt, rows: meP.rows, ink: meP.ink, photo: !!meP.photo } : { name: '나', skin: '#F6D7B8', hair: '#3B2A20', style: 'short', shirt: '#E07B62',
        rows: ['hhhhhhhhhhhh','hhh.hhhh.hhh','............','..kk....kk..','............','...k....k...','...k....k...','.pp......pp.','............','....k..k....','.....kk.....','............'] },
      jimin: { name: '지민', skin: '#F3D0AE', hair: '#C9772E', style: 'short', shirt: '#4A6FA5',
        rows: ['hhhhhhhhhhhh','h.hh.hh.hh.h','............','.k........k.','..kk....kk..','..kk....kk..','..kk....kk..','..........b.','..........b.','....kkkk....','............','............'] },
      minjun: { name: '민준', skin: '#F3D0AE', hair: '#2B2B2B', style: 'short', shirt: '#E9E2D0',
        rows: ['hhhhhhhhhhhh','hhhhhhhhhhhh','hh........hh','............','.kkkk..kkkk.','.k..kkkk..k.','.kk.k..kk.k.','.kkkk..kkkk.','............','............','....kkk.....','............'] },
      haeun: { name: '하은', skin: '#F6D7B8', hair: '#2A2A2A', style: 'short', shirt: '#F2C14E',
        rows: ['hhhhhhhhhhhh','hhhhhh......','hhh.........','..kk....kk..','............','...k....k...','...k....k...','.pp......pp.','....kkkk....','....krrk....','.....kk.....','............'] },
      barista: { name: '사장님', skin: '#F3D0AE', hair: '#6B4A33', style: 'short', shirt: '#3F6B4F',
        rows: ['hhhhhhhhhhhh','h..........h','............','..kk....kk..','............','...k....k...','............','.pp......pp.','...kkkkkk...','..kk....kk..','.....kk.....','............'] }
    };
  }

  componentDidMount() {
    this._mounted = true;
    this._boot(0);
    var want = this.props.onLeave ? true : false;
    try { var mp = window.localStorage.getItem('cafe.music'); if (mp === 'off') want = false; } catch (e) {}
    if (this._musicAuto === false) want = false;
    if (want) { this._musicStart(); this.setState({ music: true }); }
    try { this._reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { this._reduce = false; }
    if (this._irisEl) this._irisEl.style.background = '#1D1A26';
    var selfI = this; setTimeout(function () { var m = selfI.state.tags && selfI.state.tags.me; selfI._iris('open', m ? m.x : 195, m ? m.y + 80 : 420); }, 450);
    /* each friend chats on their own clock, so messages overlap like a real group chat */
    /* lines: each friend's own voice + lines for the time of day (+ rain). drawn from a shuffled bag so nothing repeats until all are used */
    var POOL = {
      jimin: {
        base: ['아 이거 언제 끝나냐', '사장님 아아 하나 더요', '나 30분만 더 하고 감', '민준아 그 노트북 스티커 뭐야', 'ㅋㅋㅋㅋ 진짜?', '하은 러닝 몇 키로 뛰었어?', '마감 전엔 왜 다 재밌어 보이냐', '이 창가 자리 내 지정석임', '파일명 최종_진짜최종 됐다', '집중 모드 들어간다 말 걸지 마ㅋㅋ', '배터리 12%… 콘센트 어딨지', '이 노래 뭐야 좋다', '노트북 팬 소리 미쳤어'],
        morning: ['아침부터 카페 온 나 칭찬해', '모닝 아아는 국룰이지', '어제 몇 시에 잤더라…'],
        day: ['점심 먹고 오니까 졸려', '오후 세 시는 왜 이렇게 길지', '디저트 뭐 먹지'],
        evening: ['오늘 저녁 뭐 먹을래?', '퇴근하고 카페 오는 사람 나야 나', '해 지니까 여기 조명 예쁘다'],
        night: ['밤 카페 분위기 최고', '이 시간에 커피는 좀 그런가', '오늘은 여기까지 할까'],
        rain: ['비 오니까 나가기 싫다', '우산 안 가져왔는데 큰일']
      },
      minjun: {
        base: ['시험 범위 실화냐', '다들 저녁 뭐 먹음?', '지민 ㅋㅋ 힘내', '나도 쿠키 하나', '여기 와이파이 빠름', '하은 오늘 왜 이렇게 신났어', '교수님 메일 답장 왔다…', '안경 닦았더니 세상이 밝아짐', '과제 하나 끝, 하나 남음', '이 의자 은근 편하다', '집중 25분 같이 할 사람', '단톡 알림 꺼놨다 미안ㅋㅋ', '아 맞다 출석 체크'],
        morning: ['1교시 지각할 뻔', '아침 거르고 왔다', '모닝 라떼 최고'],
        day: ['공강이라 왔어', '도서관 자리 없어서 여기 옴', '점심 학식 별로였음'],
        evening: ['팀플 회의 끝났다 살았다', '저녁은 편의점 각', '해 지니까 집중 잘 된다'],
        night: ['밤샘 각인가', '내일 아침 수업인데…', '야식 생각난다'],
        rain: ['비 와서 그런가 조용하네', '신발 다 젖었어']
      },
      haeun: {
        base: ['나 방금 왔어!', '여기 쿠키 뭐가 맛있어?', '러닝하고 왔더니 배고파', '5키로! 칭찬해줘', '다들 주말에 뭐해?', 'ㅋㅋㅋㅋㅋ', '오늘 페이스 좋았어', '새 운동화 샀다 자랑', '민준아 같이 뛰자 진짜로', '지민 아아 몇 잔째야?', '여기 음악 취향 저격', '물 한 잔만 더 주세요~', '다들 스트레칭은 했어?'],
        morning: ['아침 러닝 완료!', '해 뜨는 거 보고 왔어', '모닝 스무디 마시고 싶다'],
        day: ['점심 먹고 산책 갈 사람', '햇빛 좋아서 기분 최고', '오늘 하늘 봤어?'],
        evening: ['노을 보면서 뛰었어', '저녁 먹고 한 바퀴 더 뛸까', '오늘 하루 어땠어?'],
        night: ['밤 러닝은 조용해서 좋아', '이제 스트레칭하고 자야지', '내일 아침에 일어날 수 있겠지…'],
        rain: ['비 와서 러닝 쉬는 날', '실내 자전거라도 탈까']
      }
    };
    var GAP = { jimin: [4, 10], minjun: [5, 11], haeun: [6, 13] };
    var self = this;
    var PP = this._people();
    Object.keys(POOL).filter(function (w) { return !!PP[w]; }).forEach(function (who, k) {
      var idx = k;
      var cycle = function (delay) {
        self._timers.push(setTimeout(function () {
          if (self._dead) return;
          self._setTyping(who, true);
          self._timers.push(setTimeout(function () {
            if (self._dead) return;
            self._setTyping(who, false);
            self._say(who, self._nextLine(who, POOL[who])); idx++;
            cycle((GAP[who][0] + Math.random() * (GAP[who][1] - GAP[who][0])) * 1000);
          }, 1200 + Math.random() * 1400));
        }, delay));
      };
      cycle(1500 + k * 1700 + Math.random() * 1500);
    });
    this._clock = setInterval(function () { if (!self._dead) self.setState({ now: Date.now() }); }, 500);
  }
  /* soft cafe music, synthesized live in the browser: a slow jazzy chord loop, a round bass,
     a few pentatonic notes with an echo, and a faint record crackle. nothing is downloaded. */
  _musicStart() {
    if (this._mus || this._dead) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ctx; try { ctx = new AC(); } catch (e) { return; }
    var P = this._musicPreset || { bpm: 68, vol: 0.2, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], bass: [41, 40, 38, 36], scale: [72, 74, 76, 79, 81, 84], density: 0.3 };
    var master = ctx.createGain(); master.gain.value = 0;
    var tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400; tone.Q.value = 0.3;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -26; comp.ratio.value = 3;
    master.connect(tone); tone.connect(comp); comp.connect(ctx.destination);
    var len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    var rev = ctx.createConvolver(); rev.buffer = ir; var revG = ctx.createGain(); revG.gain.value = 0.35; rev.connect(revG); revG.connect(master);
    var echo = ctx.createDelay(1.5); echo.delayTime.value = (60 / P.bpm) * 0.75; var fb = ctx.createGain(); fb.gain.value = 0.32; var ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1700;
    echo.connect(ef); ef.connect(fb); fb.connect(echo); ef.connect(master);
    var nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), nd = nb.getChannelData(0);
    for (i = 0; i < nd.length; i++) nd[i] = (Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.8 : 0) + (Math.random() * 2 - 1) * 0.01;
    var ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; var nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2200; nf.Q.value = 0.7; var ng = ctx.createGain(); ng.gain.value = 0.18;
    ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start();
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function osc(type, m, det) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m); if (det) o.detune.value = det; return o; }
    function pad(m, t, dur, vol) {
      var g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1.1); g.gain.setValueAtTime(vol, t + dur - 0.2); g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
      [osc('triangle', m, -5), osc('sine', m, 6)].forEach(function (o) { o.connect(f); o.start(t); o.stop(t + dur + 1.5); });
      f.connect(g); g.connect(master); g.connect(rev);
    }
    function keys(m, t, vol) {
      var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.2);
      var o = osc('sine', m), o2 = osc('sine', m + 12), g2 = ctx.createGain(); g2.gain.value = 0.22;
      o.connect(g); o2.connect(g2); g2.connect(g); o.start(t); o2.start(t); o.stop(t + 2.3); o2.stop(t + 2.3);
      g.connect(master); g.connect(rev);
    }
    function bass(m, t, dur, vol) {
      var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
      var o = osc('sine', m); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function bell(m, t, vol) {
      var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.6);
      var o = osc('triangle', m); o.connect(g); o.start(t); o.stop(t + 1.7);
      g.connect(master); g.connect(rev); g.connect(echo);
    }
    var beat = 60 / P.bpm, t0 = ctx.currentTime + 0.15, step = 0, mi = 2;
    function at(s) { return t0 + Math.floor(s / 2) * beat + (s % 2 ? beat * 0.58 : 0); }
    function play(s, t) {
      var bar = Math.floor(s / 8), pos = s % 8, ci = bar % P.chords.length, cd = P.chords[ci], phrase = bar % 8;
      if (pos === 0) { cd.forEach(function (m) { pad(m, t, beat * 4, 0.035); }); bass(P.bass[ci], t, beat * 1.7, 0.16); keys(cd[1] + 12, t + 0.02, 0.05); keys(cd[3], t + 0.05, 0.04); }
      if (pos === 3) keys(cd[2] + 12, t, 0.035);
      if (pos === 4) bass(P.bass[ci] + 7, t, beat * 1.4, 0.11);
      if (pos === 7 && Math.random() < 0.5) keys(cd[1] + 12, t, 0.03);
      if (pos !== 0 && phrase < 6 && Math.random() < P.density) {
        mi = Math.max(0, Math.min(P.scale.length - 1, mi + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        bell(P.scale[mi], t, 0.05);
      }
    }
    function pump() { while (at(step) < ctx.currentTime + 0.5) { play(step, at(step)); step++; } }
    var self = this;
    this._mus = { ctx: ctx, master: master, iv: setInterval(pump, 120) };
    pump();
    function fadeIn() { var n = ctx.currentTime; master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n); master.gain.linearRampToValueAtTime(P.vol, n + 2.5); }
    var res = ctx.resume ? ctx.resume() : null;
    if (res && res.then) res.then(fadeIn, function () {}); else fadeIn();
    /* if the browser kept it asleep, the first tap anywhere wakes it */
    var wake = function () { if (!self._mus || self._mus.ctx !== ctx) return; if (ctx.state !== 'running') ctx.resume().then(fadeIn, function () {}); window.removeEventListener('pointerdown', wake, true); window.removeEventListener('keydown', wake, true); };
    window.addEventListener('pointerdown', wake, true); window.addEventListener('keydown', wake, true);
    this._mus.wake = wake;
  }
  _musicStop() {
    var m = this._mus; if (!m) return; this._mus = null;
    clearInterval(m.iv);
    try { window.removeEventListener('pointerdown', m.wake, true); window.removeEventListener('keydown', m.wake, true); } catch (e) {}
    try { var n = m.ctx.currentTime; m.master.gain.cancelScheduledValues(n); m.master.gain.setValueAtTime(m.master.gain.value, n); m.master.gain.linearRampToValueAtTime(0, n + 0.5); } catch (e) {}
    setTimeout(function () { try { m.ctx.close(); } catch (e) {} }, 650);
  }

  componentWillUnmount() {
    this._musicStop();
    this._dead = true;
    clearInterval(this._clock); clearInterval(this._typeT); cancelAnimationFrame(this._irisRaf);
    this._timers.forEach(function (t) { clearTimeout(t); });
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._world && this._world.renderer) { try { this._world.renderer.forceContextLoss(); } catch (e) {} if (this._world.renderer.__post) this._world.renderer.__post.dispose(); this._world.renderer.dispose(); }
  }

  _setTyping(who, on) {
    var t = {}; for (var k in this.state.typing) t[k] = this.state.typing[k];
    if (on) t[who] = t[who] || Date.now(); else delete t[who];
    this.setState({ typing: t });
  }
  _say(who, text) {
    var at = Date.now();
    var msgs = this.state.msgs.concat([{ id: this._id++, who: who, text: text, at: at }]).slice(-60);
    var recent = {}; for (var k in this.state.recent) recent[k] = this.state.recent[k];
    if (who !== 'system') recent[who] = { text: text, until: at + 5500 };
    var patch = { msgs: msgs, recent: recent, now: at };
    if (who === 'system') patch.toast = { text: text, until: at + 3000 };
    this.setState(patch);
    if (this._world && who !== 'system') this._world.talk(who);
  }

  /* 1:1 talk with the cafe owner: a dialogue box with a typewriter line and choices, nobody else hears it */
  /* time of day the lines follow: real clock, or the village sky when one is passed in */
  _slot() {
    var sk = this.props.sky || {}, h = typeof sk.h === 'number' ? sk.h : new Date().getHours() + new Date().getMinutes() / 60;
    return h >= 5 && h < 11 ? 'morning' : h < 17 ? 'day' : h < 21 ? 'evening' : 'night';
  }
  _nextLine(who, P) {
    this._bags = this._bags || {}; this._lastLine = this._lastLine || {};
    var slot = this._slot(), rain = (this.props.sky || {}).kind === 'rain', key = who + ':' + slot + (rain ? ':r' : ''), bag = this._bags[key];
    if (!bag || !bag.length) {
      bag = (P.base || []).concat(P[slot] || [], rain ? (P.rain || []) : []).slice();
      for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
      if (bag.length > 1 && bag[bag.length - 1] === this._lastLine[who]) { var t2 = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = t2; }
      this._bags[key] = bag;
    }
    var line = bag.pop(); this._lastLine[who] = line; return line;
  }
  _script() {
    /* 사장님: a man of few words. short sentences, long pauses ("…"), dry jokes he does not laugh at.
       stubborn about coffee, quietly soft on regulars, and he notices everyone who comes in, so he is the one who
       tells you which friend dropped by. he never gushes, never says "!" twice in a row, never sounds like a menu board */
    var seed = this._dSeed || 0, slot = this._slot(), P = this._people(), day = new Date().getDay();
    function pick(arr, salt) { return arr[(seed + (salt || 0)) % arr.length]; }
    function ga(n) { var c = n.charCodeAt(n.length - 1) - 0xAC00; return n + (c >= 0 && c < 11172 && c % 28 ? '이가' : '가'); }
    function ya(n) { var c = n.charCodeAt(n.length - 1) - 0xAC00; return n + (c >= 0 && c < 11172 && c % 28 ? '이' : ''); }
    function jong(n) { var c = n.charCodeAt(n.length - 1) - 0xAC00; return /[0-9]$/.test(n) ? /[013678]$/.test(n) : c >= 0 && c < 11172 && c % 28 > 0; }
    var friends = Object.keys(P).filter(function (id) { return id !== 'me' && id !== 'barista' && P[id] && P[id].name; }).map(function (id) { return P[id].name; });
    var fr = friends.length ? friends[(seed + day) % friends.length] : null;
    var bean = ['늦잠', '월요일', '버티기', '반환점', '거의 다 옴', '퇴근길', '늦잠 2'][day];
    var bake = ['스콘', '쿠키', '마들렌', '바나나 브레드', '휘낭시에', '스콘', '쿠키'][(new Date().getDate() + day) % 7];
    var hello = {
      morning: ['…왔네요. 일찍.', '아직 오븐 데우는 중이에요. 앉아요.', '문 연 지 3분. 첫 손님이네요.'],
      day: ['왔네요.', '(컵 닦다가) …어. 왔어요?', '그 자리 비어 있어요. 늘 앉던 데.'],
      evening: ['왔네요. 오늘 길었죠.', '이 시간엔 디카페인 권해요. 안 듣겠지만.'],
      night: ['곧 닫는데. …뭐, 앉아요.', '밤엔 조명 낮춰 놨어요. 눈 아프면 말하고.']
    }[slot];
    var talk = [
      ['원두마다 이름 붙여요. 오늘 건 「' + bean + '」.', '…맛도 딱 그 맛이에요.'],
      ['쿠키는 아침마다 구워요.', '모양 망한 건 제 아침밥. …오늘은 배불러요.'],
      ['저 화분, 손님이 두고 간 거예요.', '안 찾으러 와서 제가 키워요. 벌써 3년.'],
      ['음악은 제가 고른 거예요.', '취향 아니면 말해요. …안 바꾸겠지만.'],
      ['커피 내릴 때 말 걸면 맛이 변해요.', '…농담이에요. 반은.'],
      slot === 'night' ? ['밤에 오는 손님들은 말이 없어요.', '…그래서 좋아요.'] : ['창가는 세 시쯤 해가 제일 좋아요.', '그때 앉으면 다들 졸아요. 저도.']
    ];
    var news = fr ? pick([
      [ya(fr) + ', 아까 왔다 갔어요. 늘 먹던 거.', '창가에서 한참 있다 갔어요. …안부 전하란 말은 없었는데, 전해요.'],
      [ga(fr) + ' 요즘 자주 와요.', '올 때마다 누구 안 왔냐고 물어요. …누군지는 말 안 할게요.'],
      [ga(fr) + ' 어제 쿠키 두 개 사 갔어요.', '하나는 누구 주려고 그랬겠죠. …아마도.']
    ], 6) : ['다들 바쁜가 봐요. 요즘 조용해요.', '…그래도 자리는 그대로 둬요.'];
    return {
      start: { lines: [pick(hello), pick(['뭐 줄까요.', '늘 먹던 거?', '주문은 천천히. 커피는 안 도망가요.'], 1)], choices: [['아이스 아메리카노 주세요', 'ame'], ['오늘 추천 메뉴 있어요?', 'rec'], ['요즘 누구 왔다 갔어요?', 'news'], ['사장님은 요즘 어때요?', 'talk']] },
      ame: { lines: pick([['아아. …알아요, 매번.', '얼음 많이. 맞죠?'], ['또 아아. 겨울에도 아아.', '…존중해요. 여기요.'], ['오늘 원두로 내리면 좀 써요. 「' + bean + '」' + (jong(bean) ? '이라서.' : '라서.'), '그래도 마셔 봐요. 쓴 게 맛있는 날도 있어요.']], 2) },
      rec: { lines: ['추천은 잘 안 해요.', '…근데 오늘 ' + bake + (jong(bake) ? '은' : '는') + ' 잘 나왔어요. 진짜로.'], choices: [['그걸로 주세요', 'ame2'], ['다음에 먹을게요', 'bye']] },
      ame2: { lines: pick([['자리로 갖다 줄게요.', '…포크는 두 개 줄게요. 혹시 몰라서.'], ['잘 골랐어요.', '…말하고 보니 제가 만든 거네요.']], 3) },
      news: { lines: news, choices: [['오 그렇구나', 'bye'], ['아아 하나 주세요', 'ame']] },
      talk: { lines: pick(talk, 4), choices: [['그렇구나', 'bye'], ['아아 하나 주세요', 'ame']] },
      bye: { lines: pick([['천천히 있다 가요.', '…오래 있어도 돼요. 뭐라 안 해요.'], ['가요?', '…그래요. 내일도 그 자리 비워 둘게요.'], ['조심히 가요.', '컵은 두고 가요. 제가 치워요.']], 5) }
    };
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

  _dlgGo(node) {
    var S = this._script()[node];
    this.setState({ dlg: { node: node, i: 0, shown: this._reduce ? S.lines[0].length : 0 } });
    if (this._world) this._world.talk('barista');
    this._typeRun();
  }
  _typeRun() {
    var self = this; clearInterval(this._typeT);
    this._typeT = setInterval(function () {
      var d = self.state.dlg; if (self._dead || !d) { clearInterval(self._typeT); return; }
      var line = self._script()[d.node].lines[d.i];
      if (d.shown >= line.length) { clearInterval(self._typeT); return; }
      self.setState({ dlg: { node: d.node, i: d.i, shown: d.shown + 1 } });
    }, 45);
  }
  _dlgNext() {
    var d = this.state.dlg; if (!d) return;
    var S = this._script()[d.node], line = S.lines[d.i];
    if (d.shown < line.length) { clearInterval(this._typeT); this.setState({ dlg: { node: d.node, i: d.i, shown: line.length } }); return; }
    if (d.i < S.lines.length - 1) {
      this.setState({ dlg: { node: d.node, i: d.i + 1, shown: this._reduce ? S.lines[d.i + 1].length : 0 } });
      if (this._world) this._world.talk('barista');
      this._typeRun(); return;
    }
    if (!S.choices) { clearInterval(this._typeT); this.setState({ dlg: null }); }
  }

  _boot(n) {
    if (this._started || this._dead) return;
    if (!this._canvas) { try { var l = document.querySelectorAll('canvas[data-cafe]'); if (l.length) this._canvas = l[l.length - 1]; } catch (e) {} }
    if (!this._canvas || !window.THREE) { if (n < 40) setTimeout(() => this._boot(n + 1), 100); else this.setState({ glFailed: true }); return; }
    this._started = true;
    try { this._build(); } catch (e) { this.setState({ glFailed: true }); }
  }

  _build() {
    var THREE = window.THREE, self = this, P = this._people();
    var renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: false });
    renderer.setPixelRatio(1); renderer.setSize(195, 331, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap;
    var post = renderer.__post = pixelPost(THREE, renderer, 195, 331);
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2E2018);
    var camera = new THREE.PerspectiveCamera(46, 195 / 331, 0.1, 60);
    camera.position.set(0, 8.6, 11.5); camera.lookAt(0, 1.0, -0.6);

    function mat(hex, extra) { var o = { color: new THREE.Color(hex), flatShading: true }; if (extra) for (var k in extra) o[k] = extra[k]; return new THREE.MeshLambertMaterial(o); }
    function bx(w, h, d, m, x, y, z) { var me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); return me; }
    function cyl(rt, rb, h, seg, m, x, y, z) { var me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); return me; }
    function shade(o) { o.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
    function add(o) { scene.add(o); return o; }
    function canvasTex(w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); draw(x);
      var t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
    }

    var lampFx = [], dust = null, roomFx = [], studyKit = null;
    /* ---------- room shell ---------- */
    function hs(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
    var floorT = canvasTex(96, 72, function (x) {
      var PL = ['#B98552', '#AD7A48', '#C08D5A', '#B3804D'];
      for (var y = 0; y < 72; y++) for (var px = 0; px < 96; px++) {
        var bx0 = Math.floor(px / 8), by0 = Math.floor(y / 8), lx = px % 8, ly = y % 8, horiz = ((bx0 + by0) & 1) === 0;
        var plank = horiz ? Math.floor(ly / 4) : Math.floor(lx / 4), along = horiz ? lx : ly, across = horiz ? ly % 4 : lx % 4;
        var c = PL[Math.floor(hs(bx0 * 3 + plank, by0 * 5) * 4)];
        if (across === 0) c = '#C6935F';
        if (hs(px * 0.7, y * 1.3) > 0.95) c = '#9C6A3F';
        if (across === 3) c = '#8F5F39';
        if (along === 7) c = '#7E5434';
        x.fillStyle = c; x.fillRect(px, y, 1, 1);
      }
    });
    var rugT = canvasTex(48, 48, function (x) {
      for (var y = 0; y < 48; y++) for (var px = 0; px < 48; px++) {
        var dx = px - 23.5, dy = y - 23.5, r = Math.sqrt(dx * dx + dy * dy) / 24, an = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2), c;
        if (r > 1) continue;
        if (r > 0.9) c = '#7E3434';
        else if (r > 0.8) c = (Math.floor(an * 28) % 2) ? '#F3DDB0' : '#7E3434';
        else if (r > 0.74) c = '#7E3434';
        else if (r > 0.42) c = (Math.floor(an * 8) % 2) ? '#D98A5F' : '#CF7E54';
        else if (r > 0.36) c = '#F3DDB0';
        else c = (Math.abs(dx) + Math.abs(dy) < 5) ? '#7E3434' : '#E9B97E';
        x.fillStyle = c; x.fillRect(px, y, 1, 1);
      }
    });
    floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(1, 1.5); floorT.needsUpdate = true;
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 9), new THREE.MeshLambertMaterial({ map: floorT }));
    floor.position.z = 1.5; floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; add(floor);
    var rug = new THREE.Mesh(new THREE.CircleGeometry(1.35, 28), new THREE.MeshLambertMaterial({ map: rugT }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(-1.8, 0.012, 0.6); rug.receiveShadow = true; add(rug);
    add(new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 0.05), mat('#5A3E2B'))).position.set(0, 0.07, -2.97);
    var wallT = canvasTex(32, 12, function (x) {
      for (var px = 0; px < 32; px++) { x.fillStyle = (px % 4 < 2) ? '#F3E6C8' : '#DCE6C4'; x.fillRect(px, 0, 1, 8); }
      x.fillStyle = '#5A3E2B'; x.fillRect(0, 8, 32, 1);
      for (var q = 0; q < 32; q++) { x.fillStyle = (q % 3 === 0) ? '#6B4A33' : '#7A5638'; x.fillRect(q, 9, 1, 3); }
    });
    var back = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshLambertMaterial({ map: wallT }));
    back.position.set(0, 1.5, -3); back.receiveShadow = true; add(back);
    [-1, 1].forEach(function (s) {
      var sideT = wallT.clone(); sideT.needsUpdate = true;
      sideT.wrapS = THREE.RepeatWrapping; sideT.repeat.set(1.5, 1);
      var w = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshLambertMaterial({ map: sideT }));
      w.position.set(s * 4, 1.5, 1.5); w.rotation.y = -s * Math.PI / 2; w.receiveShadow = true; add(w);
    });
    add(bx(8, 0.12, 0.12, mat('#5A3E2B'), 0, 3.0, -2.94));
    var upper = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), mat('#E9D9B8')); upper.position.set(0, 4.5, -3); add(upper);
    [-2.6, 0, 2.6].forEach(function (wx) { add(bx(0.3, 3, 0.2, mat('#7A5638'), wx, 4.5, -2.9)); });
    [-1, 1].forEach(function (s) { var su = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), mat('#E9D9B8')); su.position.set(s * 4, 4.5, 1.5); su.rotation.y = -s * Math.PI / 2; add(su); });

    var woodD = mat('#8A5A3B'), woodL = mat('#C99A66'), darkM = mat('#4A3426'), whiteM = mat('#FFFFFF');
    var lampM = new THREE.MeshLambertMaterial({ color: 0xFFF2C4, emissive: 0xFFD27A, emissiveIntensity: 0.9 });

    /* counter + siphons + shelves + menu board */
    var counter = new THREE.Group();
    counter.add(bx(4.2, 0.95, 0.7, woodD, 0, 0.475, 0));
    counter.add(bx(4.4, 0.08, 0.84, woodL, 0, 0.99, 0));
    for (var pi = 0; pi < 6; pi++) counter.add(bx(0.04, 0.8, 0.02, mat('#6B4A33'), -1.75 + pi * 0.7, 0.45, 0.36));
    counter.position.set(-0.5, 0, -1.9); add(shade(counter));
    var glassM = new THREE.MeshLambertMaterial({ color: 0xCFEFF5, transparent: true, opacity: 0.55 });
    [-2.2, -1.75, -1.3].forEach(function (sx) {
      add(cyl(0.02, 0.02, 0.5, 4, darkM, sx + 0.12, 1.28, -1.9));
      add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat('#4A2A18'))).position.set(sx, 1.15, -1.9);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), glassM)).position.set(sx, 1.45, -1.9);
      add(cyl(0.12, 0.14, 0.04, 8, darkM, sx, 1.04, -1.9));
    });
    [0.2, 0.55, 0.9].forEach(function (cx2) { add(shade(cyl(0.07, 0.06, 0.12, 6, whiteM, cx2, 1.09, -1.75))); });
    [1.6, 2.2].forEach(function (sy) {
      add(shade(bx(2.6, 0.06, 0.3, woodL, -1.4, sy, -2.85)));
      for (var ci = 0; ci < 6; ci++) add(shade(cyl(0.07, 0.06, 0.14, 6, ci % 2 ? whiteM : mat('#E9B07A'), -2.5 + ci * 0.42, sy + 0.1, -2.82)));
    });
    var board = new THREE.Group();
    board.add(bx(1.3, 0.9, 0.06, mat('#6B4A33'), 0, 0, 0));
    board.add(bx(1.16, 0.76, 0.04, mat('#2F4A3A'), 0, 0, 0.03));
    [[-0.3, 0.22, 0.4], [-0.25, 0.08, 0.5], [-0.3, -0.06, 0.38], [-0.22, -0.2, 0.55]].forEach(function (l) { board.add(bx(l[2], 0.03, 0.01, whiteM, l[0], l[1], 0.06)); });
    board.add(bx(0.18, 0.03, 0.01, mat('#FFD36B'), 0.35, 0.22, 0.06)); board.add(bx(0.18, 0.03, 0.01, mat('#FFD36B'), 0.35, 0.08, 0.06));
    board.position.set(2.5, 1.9, -2.94); add(board);

    /* lamps */
    /* each lamp hangs from the ceiling and sways a hair; its warm pool on the floor follows it */
    var glowC = document.createElement('canvas'); glowC.width = glowC.height = 32;
    var gx = glowC.getContext('2d'), gg = gx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
    gx.fillStyle = gg; gx.fillRect(0, 0, 32, 32);
    var glowT = new THREE.CanvasTexture(glowC);
    [-2, 0, 2].forEach(function (lx, li) {
      var hang = new THREE.Group(); hang.position.set(lx, 3.4, 0.2); add(hang);
      hang.add(cyl(0.01, 0.01, 0.8, 3, darkM, 0, -0.4, 0));
      var sh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.24, 8, 1, true), mat('#3F6B4F', { side: THREE.DoubleSide })); sh.position.y = -0.88; hang.add(sh);
      var bm = lampM.clone(), bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), bm); bulb.position.y = -0.98; hang.add(bulb);
      var pl = new THREE.PointLight(0xFFC27A, 0.55, 6); pl.position.y = -1.1; hang.add(pl);
      var pool = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ map: glowT, color: 0xFFB866, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(lx, 0.02, 0.5); add(pool);
      var halo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: glowT, color: 0xFFC27A, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.position.y = -1.0; halo.position.z = 0.05; hang.add(halo);
      lampFx.push({ lx: lx, hang: hang, pl: pl, bm: bm, pool: pool, halo: halo, ph: li * 2.1 + 0.4 });
    });
    /* dust drifting slowly through the lamp light */
    var DN = 42, dPos = new Float32Array(DN * 3), dSeed = [];
    for (var di = 0; di < DN; di++) { var lxx = [-2, 0, 2][di % 3]; dSeed.push([lxx + (Math.random() - 0.5) * 1.6, 0.5 + Math.random() * 1.8, -0.3 + Math.random() * 1.4, Math.random() * 6.28]); }
    dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dPos, 3)),
      new THREE.PointsMaterial({ color: 0xFFE2A8, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    dust.seed = dSeed; add(dust);

    /* tables, stools, plants */
    function table(x, z) {
      var g = new THREE.Group();
      g.add(cyl(0.58, 0.58, 0.06, 10, woodL, 0, 0.76, 0));
      g.add(cyl(0.06, 0.08, 0.72, 6, darkM, 0, 0.38, 0));
      g.add(cyl(0.3, 0.3, 0.04, 8, darkM, 0, 0.02, 0));
      g.position.set(x, 0, z); return add(shade(g));
    }
    function stool(x, z) {
      var g = new THREE.Group();
      g.add(cyl(0.24, 0.24, 0.08, 8, mat('#3F6B4F'), 0, 0.46, 0));
      g.add(cyl(0.04, 0.05, 0.44, 5, darkM, 0, 0.22, 0));
      g.position.set(x, 0, z); return add(shade(g));
    }
    table(-1.8, 0.6); table(1.7, 1.0); table(-0.7, 3.1);
    /* my laptop for 카공, waiting on the table until I open it */
    studyKit = new THREE.Group(); studyKit.position.set(2.02, 0.8, 1.02); studyKit.rotation.y = Math.PI / 2; add(studyKit);
    studyKit.add(bx(0.4, 0.02, 0.28, mat('#C9CED6'), 0, 0, 0));
    var lid = new THREE.Group(); lid.position.set(0, 0.01, -0.14); lid.rotation.x = -0.25; studyKit.add(lid);
    lid.add(bx(0.4, 0.27, 0.02, mat('#C9CED6'), 0, 0.135, 0));
    var lsc = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.21), new THREE.MeshBasicMaterial({ color: 0xBFD8F2 })); lsc.position.set(0, 0.135, 0.012); lid.add(lsc);
    studyKit.add(cyl(0.05, 0.04, 0.09, 6, mat('#FFFFFF'), 0.24, 0.045, 0.06));
    studyKit.visible = false;
    stool(-2.55, 0.6); stool(-1.05, 0.6); stool(2.45, 1.0); stool(0.95, 1.0); stool(-1.45, 3.1); stool(0.05, 3.1);
    function plant(x, z) {
      var g = new THREE.Group();
      g.add(cyl(0.22, 0.17, 0.36, 8, mat('#C9775E'), 0, 0.18, 0));
      var a = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), mat('#4F9A3E')); a.position.y = 0.62; g.add(a);
      var b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), mat('#6CB34E')); b.position.set(0.12, 0.9, 0.05); g.add(b);
      g.position.set(x, 0, z); return add(shade(g));
    }
    plant(-3.5, -2.5); plant(3.5, -2.4); plant(3.5, 2.2); plant(-3.3, 4.6); plant(3.3, 4.8);
    add(cyl(0.7, 0.7, 0.02, 14, mat('#9C4A3A'), 0.4, 0.012, 4.6)).receiveShadow = true;

    var cupsA = [[-2.05, 0.55], [-1.55, 0.7], [1.45, 0.95]].map(function (c) { return add(shade(cyl(0.08, 0.07, 0.14, 6, whiteM, c[0], 0.86, c[1]))); });
    var treatCup = add(shade(cyl(0.08, 0.07, 0.14, 6, mat('#FFD36B'), -1.8, 0.86, 0.35))); treatCup.visible = false;
    var steams = [];
    cupsA.concat([treatCup]).forEach(function (c, i) {
      for (var k = 0; k < 2; k++) { var s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.7 })); add(s); steams.push({ m: s, base: c, ph: i * 0.37 + k * 0.5 }); }
    });


    /* ---------- upper wall: it used to be bare. two windows onto the village sky (their colour follows the time
       of day), a string of warm bulbs sagging between the beams, a little framed picture and a clock that tells the
       real time ---------- */
    var slotNow = self._slot();
    var SKY = { morning: ['#BFE3F6', '#F6E2C2'], day: ['#8FCDF0', '#CDEAF8'], evening: ['#E98E5B', '#F6CB8E'], night: ['#1F2846', '#34406A'] }[slotNow] || ['#8FCDF0', '#CDEAF8'];
    function cafeWindow(wx) {
      var g = new THREE.Group(); g.position.set(wx, 4.0, -2.96);
      g.add(bx(1.52, 1.26, 0.06, woodD, 0, 0, 0));
      var paneT = canvasTex(24, 20, function (c) {
        for (var y = 0; y < 20; y++) { c.fillStyle = y < 11 ? SKY[0] : SKY[1]; c.fillRect(0, y, 24, 1); }
        if (slotNow === 'night') { c.fillStyle = '#FFF4C8'; [[3, 3], [9, 6], [17, 2], [20, 8], [13, 4]].forEach(function (p) { c.fillRect(p[0] + (wx > 0 ? 2 : 0), p[1], 1, 1); }); c.fillRect(wx > 0 ? 18 : 5, 4, 2, 2); }
        else { c.fillStyle = 'rgba(255,255,255,0.9)'; var cx0 = wx > 0 ? 13 : 3; c.fillRect(cx0, 5, 7, 2); c.fillRect(cx0 + 2, 4, 3, 1); }
        c.fillStyle = slotNow === 'night' ? '#18203A' : '#7FB069'; c.fillRect(0, 16, 24, 4);
        c.fillStyle = slotNow === 'night' ? '#141A30' : '#5E9A50'; for (var tx = 0; tx < 24; tx += 5) c.fillRect(tx + (wx > 0 ? 2 : 0), 14, 3, 2);
      });
      var pane = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.08), new THREE.MeshBasicMaterial({ map: paneT })); pane.position.z = 0.035; g.add(pane);
      g.add(bx(0.05, 1.08, 0.03, woodD, 0, 0, 0.05)); g.add(bx(1.34, 0.05, 0.03, woodD, 0, 0, 0.05));
      g.add(bx(1.66, 0.07, 0.22, woodL, 0, -0.66, 0.09));
      g.add(bx(1.62, 0.16, 0.06, mat('#C9775E'), 0, 0.6, 0.07));
      for (var vi = 0; vi < 8; vi++) g.add(bx(0.1, 0.06, 0.05, mat(vi % 2 ? '#B5654F' : '#D98A6E'), -0.7 + vi * 0.2, 0.5, 0.08));
      [-0.5, 0.45].forEach(function (px2, pi2) {
        g.add(cyl(0.08, 0.06, 0.12, 6, mat('#C9775E'), px2, -0.56, 0.1));
        var lf = new THREE.Mesh(new THREE.IcosahedronGeometry(pi2 ? 0.11 : 0.13, 0), mat(pi2 ? '#6CB34E' : '#4F9A3E')); lf.position.set(px2, -0.42, 0.1); g.add(lf);
      });
      add(shade(g)); return g;
    }
    cafeWindow(-1.3); cafeWindow(1.3);
    /* framed picture (a tiny pixel landscape) on the left, a clock on the right */
    var pic = new THREE.Group(); pic.position.set(-3.3, 3.95, -2.95); add(pic);
    pic.add(bx(0.86, 0.68, 0.05, mat('#7A5638'), 0, 0, 0));
    pic.add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.52), new THREE.MeshLambertMaterial({ map: canvasTex(14, 10, function (c) {
      c.fillStyle = '#F6E2C2'; c.fillRect(0, 0, 14, 10); c.fillStyle = '#F2B45A'; c.fillRect(9, 2, 2, 2);
      c.fillStyle = '#8CB86B'; c.fillRect(0, 6, 14, 4); c.fillStyle = '#5E9A50'; c.fillRect(0, 5, 5, 2); c.fillRect(3, 4, 2, 1); c.fillStyle = '#6FB6D9'; c.fillRect(6, 8, 8, 1);
    }) }))).position.z = 0.03;
    var clock = new THREE.Group(); clock.position.set(3.3, 4.05, -2.94); add(clock);
    var rim = cyl(0.36, 0.36, 0.06, 16, mat('#7A5638'), 0, 0, 0); rim.rotation.x = Math.PI / 2; clock.add(rim);
    var dial = cyl(0.3, 0.3, 0.02, 16, mat('#FFF8EC'), 0, 0, 0.035); dial.rotation.x = Math.PI / 2; clock.add(dial);
    for (var hk = 0; hk < 12; hk++) { var a = hk / 12 * Math.PI * 2; clock.add(bx(0.03, hk % 3 ? 0.03 : 0.06, 0.01, darkM, Math.sin(a) * 0.24, Math.cos(a) * 0.24, 0.05)); }
    function hand(len, w) { var h = new THREE.Group(); h.position.z = 0.06; h.add(bx(w, len, 0.015, darkM, 0, len / 2 - 0.02, 0)); clock.add(h); return h; }
    var hH = hand(0.15, 0.04), hM = hand(0.23, 0.025);
    roomFx.push(function () {
      var d = new Date(), m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
      hM.rotation.z = -m / 60 * Math.PI * 2; hH.rotation.z = -h / 12 * Math.PI * 2;
    });
    /* string lights: one sagging run per bay between the beams, bulbs twinkle very gently */
    var bulbs = [], wireM = mat('#3A2A1E');
    [[-4, -2.6], [-2.6, 0], [0, 2.6], [2.6, 4]].forEach(function (bay, bi) {
      var N = 6;
      for (var k = 0; k <= N * 3; k++) {
        var u = k / (N * 3), x2 = bay[0] + (bay[1] - bay[0]) * u, y2 = 4.95 - Math.sin(u * Math.PI) * 0.32;
        if (k % 3) { add(bx(0.05, 0.04, 0.03, wireM, x2, y2, -2.9)); continue; }
        if (k === 0 || k === N * 3) continue;
        var warm = (k / 3 + bi) % 2 === 0, bm2 = new THREE.MeshBasicMaterial({ color: warm ? 0xFFD27A : 0xFFF2C4 });
        var b2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.1), bm2); b2.position.set(x2, y2 - 0.09, -2.88); add(b2);
        bulbs.push({ m: bm2, base: new THREE.Color(warm ? 0xFFD27A : 0xFFF2C4), ph: bi * 1.7 + k * 0.9 });
      }
    });
    var dimC = new THREE.Color();
    roomFx.push(function (t) {
      if (self._reduce) return;
      bulbs.forEach(function (b) { var f = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.3 + b.ph)); b.m.color.copy(b.base).multiplyScalar(f); });
    });

    /* ---------- people with hand-drawn faces ---------- */
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
      var N = f.rows.length, S = 8;
      return canvasTex(48 * S, 24 * S, function (x) {
        x.save(); x.scale(S, S);
        x.fillStyle = f.skin; x.fillRect(0, 0, 48, 24);
        var back = f.style === 'long' ? 21 : 13, side = f.style === 'long' ? 19 : 10;
        /* a photo face carries its own hair; the rest of the head takes the photo's hair colour */
        if (f.photo) { x.fillStyle = f.hair; x.fillRect(0, 0, 48, 16.5); }
        else if (f.style !== 'none') { x.fillStyle = f.hair; x.fillRect(0, 0, 48, 4); x.fillRect(18, 0, 30, back); x.fillRect(0, 0, 6, back); x.fillRect(5, 4, 1, side); x.fillRect(18, 4, 1, side); }
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
      });
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
    function person(f, sitting, apron) {
      var g = new THREE.Group(), sh = mat(f.shirt), skin = mat(f.skin);
      g.add(cyl(0.2, 0.28, 0.42, 8, sh, 0, 0.27, 0));
      if (apron) g.add(bx(0.34, 0.34, 0.04, mat('#FFF3DC'), 0, 0.25, 0.25));
      if (sitting) { g.add(bx(0.11, 0.1, 0.3, mat('#4A3426'), -0.1, 0.07, 0.15)); g.add(bx(0.11, 0.1, 0.3, mat('#4A3426'), 0.1, 0.07, 0.15)); }
      else { var lg0 = bx(0.11, 0.12, 0.14, mat('#4A3426'), -0.1, 0.06, 0.02), lg1 = bx(0.11, 0.12, 0.14, mat('#4A3426'), 0.1, 0.06, 0.02); g.add(lg0); g.add(lg1); g.legs = [lg0, lg1]; }
      g.arms = [];
      [-1, 1].forEach(function (s) {
        var arm = new THREE.Group(); arm.position.set(s * 0.24, 0.44, 0);
        var a = cyl(0.05, 0.05, 0.3, 5, sh, 0, -0.14, 0); arm.add(a);
        var hnd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), skin); hnd.position.set(0, -0.3, 0); arm.add(hnd);
        arm.rotation.z = s * 0.35; g.add(arm); g.arms.push(arm);
      });
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshLambertMaterial({ map: faceTex(f) }));
      head.position.y = 0.88; g.add(head);
      g.scale.setScalar(1.25);
      shade(g); if (!sitting) g.add(footShadow(0.32));
      return g;
    }
    var cast = [
      { id: 'barista', x: -0.6, y: 0.6, z: -2.62, sit: false, apron: true },
      { id: 'jimin', x: -2.55, y: 0.5, z: 0.6, sit: true },
      { id: 'minjun', x: -1.05, y: 0.5, z: 0.6, sit: true },
      { id: 'haeun', x: 0.95, y: 0.5, z: 1.0, sit: true },
      { id: 'me', x: 2.3, y: 0, z: 2.1, sit: false }
    ];
    cast = cast.filter(function (c) { return !!P[c.id]; });
    cast.forEach(function (c, i) {
      c.obj = person(P[c.id], c.sit, c.apron);
      c.obj.position.set(c.x, c.y, c.z);
      c.yaw = c.id === 'jimin' ? 0.9 : c.id === 'minjun' ? -0.9 : c.id === 'haeun' ? 0.9 : Math.atan2(-c.x * 0.4, 6.6 - c.z);
      c.obj.rotation.y = c.yaw; c.phase = i * 1.1; c.talk = 0;
      add(c.obj);
    });

    /* ---------- light ---------- */
    add(new THREE.HemisphereLight(0xFFF1D6, 0x5A3E2B, 0.55));
    var key = new THREE.DirectionalLight(0xFFE2B8, 0.5);
    key.position.set(3, 7, 6); key.target.position.set(0, 0, -1); add(key); add(key.target);
    key.castShadow = true; key.shadow.mapSize.set(512, 512);
    var kc = key.shadow.camera; kc.left = -6; kc.right = 6; kc.top = 6; kc.bottom = -6; kc.near = 1; kc.far = 25; key.shadow.bias = -0.003;

    function proj(c) {
      c.obj.updateMatrixWorld(true);
      var q = new THREE.Vector3(0, 1.32, 0).applyMatrix4(c.obj.matrixWorld).project(camera);
      return { x: Math.round((q.x + 1) * 195), y: Math.round((1 - q.y) * 331) };
    }
    this._world = {
      renderer: renderer,
      talk: function (who) { cast.forEach(function (c) { if (c.id === who) c.talk = 1.6; }); },
      wave: function () { cast.forEach(function (c) { c.wave = 2.0; }); },
      treat: function () { treatCup.visible = true; },
      study: function (on) { if (studyKit) studyKit.visible = on; }
    };

    var t0 = performance.now(), lastT = 0, done = false;
    var tick = function () {
      if (self._dead) return;
      var t = (performance.now() - t0) / 1000, dt = Math.min(0.05, t - lastT); lastT = t;
      cast.forEach(function (c) {
        var bob = 0, armL = 0.35, armR = 0.35;
        if (!self._reduce) {
          bob = Math.sin(t * 2 + c.phase) * 0.02;
          if (c.talk > 0) { c.talk -= dt; bob += Math.abs(Math.sin(t * 9)) * 0.08; }
          if (c.wave > 0) { c.wave -= dt; armR = 2.4 + Math.sin(t * 12) * 0.4; }
          if (c.id === 'barista') { c.obj.rotation.y = c.yaw + Math.sin(t * 0.7) * 0.4; armL = 0.35 + Math.sin(t * 3) * 0.2; }
          if (c.id === 'me' && studyKit && self.state.study) { armL = 0.95 + Math.sin(t * 13) * 0.12; armR = 0.95 + Math.sin(t * 13 + 1.7) * 0.12; bob = 0; }
        }
        if (c.id === 'me' && studyKit) {
          /* 카공: I walk over to the free side of the table and turn to my laptop, three-quarters toward us */
          var on = !!self.state.study, tx = on ? 2.42 : c.x, tz = on ? 1.08 : c.z, ty = on ? -1.15 : c.yaw;
          var k = Math.min(1, dt * 4); c.obj.position.x += (tx - c.obj.position.x) * k; c.obj.position.z += (tz - c.obj.position.z) * k;
          c.obj.rotation.y += (ty - c.obj.rotation.y) * k;
        }
        c.obj.position.y = c.y + bob;
        c.obj.arms[0].rotation.z = -armL; c.obj.arms[1].rotation.z = armR;
      });
      lampFx.forEach(function (L) {
        var n = self._reduce ? 0 : Math.sin(t * 1.1 + L.ph) * 0.5 + Math.sin(t * 2.3 + L.ph * 1.7) * 0.3 + Math.sin(t * 5.1 + L.ph * 0.6) * 0.2;
        L.pl.intensity = 0.55 + n * 0.15;
        L.bm.emissiveIntensity = 0.85 + n * 0.2;
        L.pool.material.opacity = 0.22 + n * 0.09; L.halo.material.opacity = 0.32 + n * 0.12;
        if (!self._reduce) { L.hang.rotation.z = Math.sin(t * 0.55 + L.ph) * 0.04; L.hang.rotation.x = Math.sin(t * 0.42 + L.ph * 1.3) * 0.03; }
        L.pool.position.x = L.lx + Math.sin(L.hang.rotation.z) * 3.4; L.pool.position.z = 0.5 - Math.sin(L.hang.rotation.x) * 3.4;
      });
      if (dust) {
        var dp = dust.geometry.attributes.position;
        dust.seed.forEach(function (d, i) {
          var u = self._reduce ? 0 : t;
          var yy = 0.5 + ((d[1] - 0.5 + u * 0.05) % 1.8);
          dp.setXYZ(i, d[0] + Math.sin(u * 0.3 + d[3]) * 0.25, yy, d[2] + Math.cos(u * 0.25 + d[3] * 1.3) * 0.18);
        });
        dp.needsUpdate = true;
        dust.material.opacity = 0.55 + Math.sin(t * 0.9) * 0.15;
      }
      steams.forEach(function (s) {
        if (!s.base.visible) { s.m.visible = false; return; }
        s.m.visible = true;
        var q = self._reduce ? 0.4 : ((t * 0.6 + s.ph) % 1);
        var bp = s.wp || (s.wp = s.base.getWorldPosition(new THREE.Vector3()));
        s.m.position.set(bp.x + Math.sin(q * 6 + s.ph) * 0.04, 0.95 + q * 0.5, bp.z);
        s.m.material.opacity = 0.7 * (1 - q);
      });
      roomFx.forEach(function (f) { f(t, dt); });
      post(scene, camera);
      if (!done) { done = true; var tags = {}; cast.forEach(function (c) { tags[c.id] = proj(c); }); self.setState({ tags: tags }); }
      self._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  renderVals() {
    var self = this, P = this._people(), st = this.state, now = st.now;
    var treatId = ['jimin', 'minjun', 'haeun'].filter(function (id) { return !!P[id]; })[0];
    var TINT = { barista: '#E6D9C6', jimin: '#F8C9A0', minjun: '#CDE8B0', haeun: '#F7E2A0', me: '#F6C7DA' };
    /* one bubble per person, right above the head. a new line replaces the old one, which floats up and fades.
       if two bubbles would touch, the newer one keeps its spot and the older one rises a little or folds to "···" */
    var LIFE = 9000, FADE = 900, GONE = 1150, W = 390, TOP = 34;
    var tags = st.tags, ids = ['jimin', 'minjun', 'haeun', 'me'].filter(function (id) { return !!P[id]; });
    if (!this._mctx) { try { this._mctx = document.createElement('canvas').getContext('2d'); } catch (e) { this._mctx = null; } }
    var mctx = this._mctx;
    function textW(t) {
      if (mctx) { mctx.font = "12px 'Galmuri11', monospace"; var w = mctx.measureText(t).width; if (w > 0) return w; }
      var w2 = 0; for (var i = 0; i < t.length; i++) w2 += t.charCodeAt(i) > 0x2E80 ? 12 : 7; return w2;
    }
    var npcTag = tags && tags.barista ? tags.barista : { x: 0, y: 0 };
    var bubs = ids.map(function (id) {
      var tg = tags && tags[id], x = tg ? tg.x : 0, y = tg ? tg.y : 0;
      var mine = st.msgs.filter(function (m) { return m.who === id && now - m.at < LIFE; });
      var cur = mine[mine.length - 1], prev = mine[mine.length - 2];
      var typing = !!st.typing[id];
      var text = cur ? cur.text : '', dots = !cur && typing;
      var tw = dots ? 24 : textW(text), w = dots ? 56 : Math.min(150, Math.ceil(tw) + 22), lines = dots ? 1 : Math.max(1, Math.ceil((tw + 2) / 128));
      var h = 20 + 15 * lines;
      var opts = dots ? [[w, h]] : [150, 128, 110, 92].map(function (mw) { var ln = Math.max(1, Math.ceil((tw + 2) / (mw - 22))), ww = ln > 1 ? Math.min(mw, Math.ceil(tw / ln) + 34) : Math.min(mw, Math.ceil(tw) + 22); return [ww, 20 + 15 * ln]; }).filter(function (o, i, a) { return i === 0 || o[0] !== a[i - 1][0]; });
      return { opts: opts, id: id, x: x, y: y, text: text, dots: dots, active: !!cur || typing, at: cur ? cur.at : (typing ? st.typing[id] : 0),
        fading: !!cur && LIFE - (now - cur.at) < FADE, w: w, h: h,
        ghost: (cur && prev && now - cur.at < GONE) ? prev.text : '' };
    });
    var npcR = { l: npcTag.x - 34, r: npcTag.x + 34, t: npcTag.y - 26, b: npcTag.y }, placed = [], soft = true;
    var hasNpc = !!(tags && tags.barista);
    function hit(r) { var all = soft && hasNpc ? placed.concat([npcR]) : placed; for (var i = 0; i < all.length; i++) { var q = all[i]; if (r.l < q.r + 4 && r.r > q.l - 4 && r.t < q.b + 12 && r.b > q.t - 12) return true; } return false; }
    function rectAt(k, l, lift, ww, hh) { var b0 = k.y - 14 - lift; return { l: l, r: l + (ww || k.w), t: b0 - (hh || k.h) - 19, b: b0 }; }
    /* every head in the room, so a bubble never hangs over somebody else's head */
    var heads = bubs.map(function (k) { return { id: k.id, x: k.x, y: k.y }; });
    if (hasNpc) heads.push({ id: 'barista', x: npcTag.x, y: npcTag.y });
    /* a bubble always keeps its speaker's head under it (somewhere between its ends) and points at it with a tail.
       it grows away from close neighbours: someone on the right -> it extends to the left, and the other way round */
    function cost(k, r, lift, f) {
      var c = lift * 3 + Math.abs(f - 0.5) * 18, cx = (r.l + r.r) / 2, own = Math.abs(cx - k.x);
      if (hasNpc && r.l < npcR.r + 4 && r.r > npcR.l - 4 && r.t < npcR.b + 4 && r.b > npcR.t - 4) c += 50;
      heads.forEach(function (o) {
        if (o.id === k.id) return;
        if (o.x > r.l - 6 && o.x < r.r + 6 && o.y > r.b - 4) c += 150;
        if (Math.abs(cx - o.x) < own) c += 120;
        /* never sit on top of someone's face */
        if (r.l < o.x + 22 && r.r > o.x - 22 && r.t < o.y + 45 && r.b > o.y - 6) c += 90;
      });
      return c;
    }
    var FR = [0.5, 0.35, 0.65, 0.22, 0.78, 0.12, 0.88], MAXLIFT = 150;
    /* the newest line always gets the spot right above its speaker's head.
       older bubbles make room for it: they keep their place sideways and only slide straight up.
       a bubble pushed past the top of the room quietly fades out where it is. */
    var act = bubs.filter(function (k) { return k.active; }).sort(function (a, b) { return b.at - a.at; });
    function minify(k) { k.mini = true; k.w = 44; k.h = 30; }
    var mem0 = self._bubMem || {}, wall = Date.now();
    self._gen = self._gen || {}; self._ghost = self._ghost || {};
    /* a new line (not the typing dots turning into words) starts a new bubble generation:
       the previous line is handed to a ghost that drifts up from exactly where it was */
    act.forEach(function (k) {
      var g = self._gen[k.id] || (self._gen[k.id] = { key: '', n: 0 }), key = (k.dots ? 'd' : 'm') + k.at;
      if (g.key === key) return;
      var fromDots = g.key.charAt(0) === 'd' && !k.dots, mem = mem0[k.id];
      if (!fromDots) {
        g.n++;
        if (mem && !mem.dots && !mem.squeezedAt && mem.text && mem.text !== k.text) self._ghost[k.id] = { text: mem.text, at: wall, l: mem.l, b: mem.b, w: mem.w };
      }
      k.morph = fromDots && !!mem; g.key = key;
    });
    placed = []; soft = false;
    act.forEach(function (k) {
      var mem = mem0[k.id], same = mem && mem.text === k.text && mem.dots === k.dots && Math.abs(mem.x - k.x) < 3;
      if (same && mem.squeezedAt) {
        /* once squeezed out it keeps drifting off and never comes back */
        k.squeezed = true; k.memo = mem.squeezedAt; k.w = mem.w; k.h = mem.h; k.lift = mem.lift; k.rect = rectAt(k, mem.l, mem.lift, mem.w, mem.h); return;
      }
      if (same) {
        var lift = mem.lift, r = rectAt(k, mem.l, lift, mem.w, mem.h);
        while (hit(r) && lift <= MAXLIFT) { lift += 3; r = rectAt(k, mem.l, lift, mem.w, mem.h); }
        k.w = mem.w; k.h = mem.h; k.lift = lift; k.rect = r;
        if (lift > MAXLIFT || r.t < TOP) {
          /* no room left: it fades while still rising a little, like an old chat line scrolling away */
          k.squeezed = true; k.lift = Math.max(mem.lift, Math.min(mem.lift + 26, (k.y - 14 - TOP + 8) - mem.h - 17)); k.rect = rectAt(k, mem.l, k.lift, mem.w, mem.h); k.memo = wall; return;
        }
        placed.push(r); return;
      }
      var best = null; k.fresh = true;
      k.opts.forEach(function (o, oi) {
        for (var lf = 0; lf <= 90; lf += 6) FR.forEach(function (f) {
          var L = Math.round(k.x - f * o[0]); L = Math.max(6, Math.min(W - 6 - o[0], L));
          if (k.x < L + 12 || k.x > L + o[0] - 12) return;
          var r2 = rectAt(k, L, lf, o[0], o[1]); if (r2.t < TOP || hit(r2)) return;
          var c = cost(k, r2, lf, f) + oi * 22; if (!best || c < best.c) best = { r: r2, lift: lf, c: c, w: o[0], h: o[1] };
        });
      });
      if (!best) { minify(k); var L2 = Math.max(6, Math.min(W - 50, k.x - 22)); best = { r: rectAt(k, L2, 0, 44, 30), lift: 0, w: 44, h: 30 }; }
      k.rect = best.r; k.lift = best.lift; k.w = best.w; k.h = best.h; placed.push(best.r);
    });
    this._bubMem = {};
    act.forEach(function (k) { if (k.rect && !k.mini) self._bubMem[k.id] = { text: k.text, dots: k.dots, x: k.x, l: k.rect.l, b: k.rect.b, lift: k.lift, w: k.w, h: k.h, squeezedAt: k.squeezed ? k.memo : 0 }; });
    Object.keys(self._ghost).forEach(function (id) { if (wall - self._ghost[id].at > GONE) delete self._ghost[id]; });
    var order = bubs.slice().sort(function (a, b) { return a.at - b.at; }).map(function (k) { return k.id; });
    var pins = bubs.map(function (k) {
      var r = k.rect || { l: 0, r: 0, t: 0, b: 0 };
      var cx = Math.max(r.l + 14, Math.min(r.r - 14, k.x));
      var lean = Math.max(-5, Math.min(5, (k.x - cx) * 0.5)), gh = k.active ? self._ghost[k.id] : null;
      var tail = k.active && !k.mini ? [0, 0, 12, 0, 6 + lean, 10].join(',') : '';
      return {
        id: k.id, name: P[k.id].name, x: k.x, y: k.y, tint: TINT[k.id],
        active: k.active, quiet: !k.active, full: k.active && !k.mini, mini: !!k.mini,
        text: k.mini ? '···' : k.text, dots: k.dots && !k.mini, words: !k.dots || k.mini,
        l: Math.round(r.l), b: Math.round(r.b), w: Math.round(k.w), op: (k.fading || k.squeezed) ? 0 : 1, tl: Math.round(cx - 6 - r.l),
        /* pushed bubbles glide; a brand-new one jumps to its spot while still invisible and eases in a beat later;
           typing dots that turn into words stretch into the bubble instead of popping again */
        tr: k.morph ? 'opacity .6s, top .5s cubic-bezier(.22,.8,.26,1), left .5s cubic-bezier(.22,.8,.26,1), width .5s cubic-bezier(.22,.8,.26,1)'
          : k.fresh ? 'opacity .6s' : (k.squeezed ? 'opacity 1s ease-in, top 1.05s cubic-bezier(.25,.7,.35,1)' : 'opacity .6s, top .7s cubic-bezier(.3,.65,.3,1)'),
        anim: 'bin' + (((self._gen[k.id] || {}).n || 0) % 2) + ' .5s cubic-bezier(.2,.9,.3,1.1) .16s both',
        org: Math.round(cx - r.l) + 'px 100%',
        tail: tail, hasTail: !!tail,
        ghost: gh ? gh.text : '', hasGhost: !!gh && !k.mini, gl: gh ? gh.l : 0, gb: gh ? gh.b : 0, gw: gh ? gh.w : 0,
        z: k.active ? 10 + order.indexOf(k.id) : 2
      };
    });
    var dlgS = st.dlg ? this._script()[st.dlg.node] : null;
    var dlg = { open: !!st.dlg, text: '', choices: [], hasChoices: false, showNext: false, aria: '', next: function () { self._dlgNext(); }, close: function () { clearInterval(self._typeT); self.setState({ dlg: null }); } };
    dlg.clb = this._cloud(374, 124, 4); dlg.clc = this._cloud(214, ((dlgS && dlgS.choices) ? dlgS.choices.length : 3) * 34 + 30, 6);
    if (dlgS) {
      var full = dlgS.lines[st.dlg.i], done = st.dlg.shown >= full.length, lastLine = st.dlg.i === dlgS.lines.length - 1;
      dlg.text = full.slice(0, st.dlg.shown);
      dlg.hasChoices = done && lastLine && !!dlgS.choices;
      dlg.showNext = done && !dlg.hasChoices;
      dlg.aria = '사장님: ' + full + (dlg.hasChoices ? '' : ' (누르면 다음)');
      if (dlg.hasChoices) dlg.choices = dlgS.choices.map(function (c) { return { label: c[0], pick: function () { self._dlgGo(c[1]); } }; });
    }
    var last = st.msgs[st.msgs.length - 1];
    var reacts = { jimin: ['오 왔어?', 'ㅋㅋㅋ 인정', '같이 작업하자'], minjun: ['반가워!', 'ㅇㅈ', '여기 앉아 자리 있음'], haeun: ['헐 나도 방금 왔는데', 'ㅋㅋㅋㅋ', '쿠키 같이 먹자'] };
    function replyTo() {
      ['jimin', 'minjun', 'haeun'].filter(function (w) { return !!P[w] && Math.random() < 0.55; }).slice(0, 2).forEach(function (w, i) {
        self._timers.push(setTimeout(function () {
          if (self._dead) return;
          self._setTyping(w, true);
          self._timers.push(setTimeout(function () { if (self._dead) return; self._setTyping(w, false); self._say(w, reacts[w][Math.floor(Math.random() * reacts[w].length)]); }, 1100 + Math.random() * 900));
        }, 400 + i * 700));
      });
    }
    return {
      setCanvas: this.setCanvas, glFailed: st.glFailed, pinsReady: !!tags && !st.glFailed,
      headCount: Object.keys(P).length, pins: pins, draft: st.draft, dlg: dlg,
      npc: { x: npcTag.x, y: npcTag.y, label: st.dlg ? '사장님 · 대화 중' : '사장님 · 말 걸기' },
      npcOpen: function () { if (!self.state.dlg) { self._dSeed = Math.floor(Math.random() * 1000); self._dlgGo('start'); } },
      announce: last && last.who !== 'system' ? (P[last.who] ? P[last.who].name : '') + ': ' + last.text : '',
      toast: { show: !!(st.toast && st.toast.until > now), text: st.toast ? st.toast.text : '' },
      onInput: function (e) { self.setState({ draft: e.target.value }); },
      setInput: function (el) { if (el) self._inputEl = el; },
      setIris: function (el) { if (el) self._irisEl = el; },
      setVillageLink: function (el) { if (el) self._villageLink = el; },
      musicOn: !!st.music, musicOff: !st.music, musicOp: st.music ? 1 : 0.45, musicLabel: st.music ? '음악 끄기' : '음악 켜기', warmGlow: true,
      toggleMusic: function () {
        var on = !self.state.music;
        if (on) self._musicStart(); else self._musicStop();
        try { window.localStorage.setItem('cafe.music', on ? 'on' : 'off'); } catch (e) {}
        self.setState({ music: on });
      },
      goVillage: function (e) {
        if (!self.props.onLeave) return;
        if (e && e.preventDefault) e.preventDefault();
        if (self._leaving) return; self._leaving = true;
        var m = self.state.tags && self.state.tags.me;
        self._iris('close', m ? m.x : 195, m ? m.y + 80 : 420, function () { setTimeout(function () { self._leaving = false; if (self.props.onLeave) self.props.onLeave(); }, 160); });
      },
      send: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var raw = (self._inputEl && self._inputEl.value) || self.state.draft || '', text = raw.trim(); if (!text) return;
        if (self._inputEl) self._inputEl.value = '';
        self.setState({ draft: '' }); self._say('me', text); replyTo();
      },
      sendKey: function (e) { if (e && e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); self.renderVals().send(); } },
      laugh: function () { self._say('me', 'ㅋㅋㅋㅋㅋ'); },
      studyOn: !!st.study, studyCls: st.study ? 'btn by' : 'btn bc',
      studyBtn: st.study ? '카공 중 · ' + Math.max(1, Math.round((Date.now() - st.study) / 60000)) + '분' : '카공하기',
      toggleStudy: function () {
        var on = !self.state.study;
        self.setState({ study: on ? Date.now() : 0 });
        if (self._world && self._world.study) self._world.study(on);
        if (on) {
          self._say('me', '나 여기서 카공 좀 할게');
          var ids = Object.keys(P).filter(function (id) { return id !== 'me' && id !== 'barista'; }), who = ids[Math.floor(Math.random() * ids.length)];
          if (who) self._timers.push(setTimeout(function () { if (!self._dead) self._say(who, ['오 카공 화이팅!', '나도 노트북 꺼낼까', '와이파이 비번은 영수증에 있어'][Math.floor(Math.random() * 3)]); }, 1600));
        } else self._say('me', '카공 끝! 오늘 꽤 했다');
      },
      treatLabel: st.treated ? '커피 쐈어요!' : (P[treatId] ? P[treatId].name : '친구') + '에게 커피 쏘기',
      treat: function () {
        if (self.state.treated) return;
        self.setState({ treated: true }); if (!P[treatId]) return; self._say('system', '나 → ' + P[treatId].name + '에게 커피 한 잔');
        if (self._world) self._world.treat();
        self._timers.push(setTimeout(function () { if (!self._dead) self._say(treatId, '헐 고마워 살았다…'); }, 1400));
      },
      waveAll: function () { if (self._world) self._world.wave(); self._say('system', '다 같이 손을 흔들었어요'); }
    };
  }
}
