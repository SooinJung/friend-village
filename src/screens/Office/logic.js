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

export default class OfficeLogic extends DCLogic {
  constructor(props) {
    super(props);
    var now = Date.now();
    this.state = {
      msgs: [
        { id: 1, who: 'doyun', text: '오늘도 야근 각…', at: now - 2500 },
        { id: 2, who: 'taeo', text: '출근 완료! 버스 겨우 탐', at: now - 1200 },
        { id: 3, who: 'seoyeon', text: '좋은 아침~', at: now - 400 }
      ],
      typing: {}, recent: {}, now: now, peek: null, dlg: null, draft: '', tags: null, glFailed: false, treated: false, toast: null, focusUntil: 0
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
    var me = (this.props && this.props.me) || null;
    return {
      me: me && me.rows ? { name: me.name || '나', skin: me.skin, hair: me.hair, style: 'short', shirt: me.shirt, rows: me.rows, ink: me.ink, photo: !!me.photo }
        : { name: '나', skin: '#F6D7B8', hair: '#3B2A20', style: 'short', shirt: '#E07B62',
        rows: ['hhhhhhhhhhhh','hhh.hhhh.hhh','............','..kk....kk..','............','...k....k...','...k....k...','.pp......pp.','............','....k..k....','.....kk.....','............'] },
      doyun: { name: '도윤', skin: '#E9C29C', hair: '#4A4A55', style: 'short', shirt: '#3E4A5E',
        rows: ['hhhhhhhhhhhh','hhhhhhhhhhhh','h..........h','..kkk..kkk..','............','..kk....kk..','............','..k.k..k.k..','............','............','.....kk.....','....k..k....'] },
      taeo: { name: '태오', skin: '#FFF8EC', hair: '#FFF8EC', style: 'none', shirt: '#7FB069',
        rows: ['..k.....k.k.','.k.k...k.k.k','............','.kkk...kkk..','.k.k...k.k..','.kkk...kkk..','.....k......','....kkk.....','.....kk.....','............','.....k......','....k.k.....'] },
      seoyeon: { name: '서연', skin: '#FBE3CC', hair: '#1E1A1A', style: 'long', shirt: '#9FC4E8',
        rows: ['hhhhhhhhhhhh','hhhhh..hhhhh','hhh......hhh','hh........hh','h..kk..kk..h','h..k....k..h','h.k.k..k.k.h','hpp......pph','h..........h','h...k.k.k..h','h....k.k...h','hh........hh'] }
    };
  }

  componentDidMount() {
    this._mounted = true;
    this._boot(0);
    var want = false; this._musicPreset = { bpm: 60, vol: 0.16, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]], bass: [45, 41, 36, 43], scale: [69, 72, 74, 76, 79, 81], density: 0.18 };
    try { var mp = window.localStorage.getItem('office.music'); if (mp === 'on' && this.props.onLeave) want = true; } catch (e) {}
    if (this._musicAuto === false) want = false;
    if (want) { this._musicStart(); this.setState({ music: true }); }
    try { this._reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { this._reduce = false; }
    if (this._irisEl) this._irisEl.style.background = '#1D1A26';
    var selfI = this; setTimeout(function () { var m = selfI.state.tags && selfI.state.tags.me; selfI._iris('open', m ? m.x : 195, m ? m.y + 80 : 420); }, 450);
    /* each friend chats on their own clock, so messages overlap like a real group chat */
    /* lines: each friend's own voice + lines for the time of day (+ rain). drawn from a shuffled bag so nothing repeats until all are used */
    var POOL = {
      doyun: {
        base: ['보고서 왜 안 끝나지', '커피 수혈 필요', '태오 버스 또 놓쳤어?', '퇴근하고 싶다…', 'ㅋㅋㅋㅋ 인정', '엑셀 함수 하나에 30분 씀', '회의가 회의를 낳는다', '내 모니터 왜 이렇게 기울었지', '오늘 할 일 리스트 너무 길다', '서연 그 시안 나도 보여줘', '키보드 소리 너무 크나?', '아 그 파일 어디 저장했더라', '메신저 알림 잠깐 끈다'],
        morning: ['오늘 점심 김치찌개?', '출근길 지하철 지옥이었어', '아침 회의 몇 시지'],
        day: ['점심 먹고 너무 졸려', '오후 미팅 하나 남음', '당 떨어진다'],
        evening: ['야근 각인가…', '저녁 시켜 먹을 사람', '해 지는 거 보니까 퇴근하고 싶다'],
        night: ['이 시간까지 있는 사람 손', '내일 출근 생각하니 아득', '불 끄고 갈게요~'],
        rain: ['비 오는데 우산 놓고 옴', '창밖 비 소리 좋다']
      },
      taeo: {
        base: ['메일 50통 실화냐', '점심 뭐 먹을지 투표하자', '도윤 형 그 엑셀 나 줘봐', '오늘 회의 몇 시예요?', '탕비실 과자 채워졌대', '오 그거 좋다', '프린터 또 종이 걸림', '이번 주 금요일 회식?', '모니터 하나 더 있으면 좋겠다', '서연 누나 집중 타이머 같이 켜요', '이거 퇴근 전에 끝낼 수 있을까', 'ㅇㅈ', '의자 높이 맞추는 데 10분 씀'],
        morning: ['굿모닝! 버스 겨우 탐', '아침 샌드위치 사 옴', '오늘 왜 이렇게 피곤하지'],
        day: ['점심 뭐 먹었어요?', '오후 세 시 간식 타임', '외근 다녀왔습니다'],
        evening: ['저녁 뭐 먹지', '오늘 칼퇴 가능?', '퇴근 버스 몇 분이지'],
        night: ['야식 시킬 사람', '막차 놓치면 안 되는데', '오늘 진짜 길었다'],
        rain: ['비 와서 버스 막히겠다', '신발 다 젖음']
      },
      seoyeon: {
        base: ['디자인 시안 거의 다 됐어', '집중 타이머 같이 켤 사람?', '오늘 칼퇴 목표!', '서연 퀘스트: 메일 정리', 'ㅋㅋㅋ', '폰트 고르는 데 한 시간', '피드백 반영 3차…', '화분 물 줬어요', '다들 스트레칭 한 번 해요', '레퍼런스 찾다가 딴 길로 샘', '이 색 조합 어때?', '헤드폰 쓰면 집중 모드', '도윤 오빠 그 파일 링크 줘요'],
        morning: ['좋은 아침~', '오늘 아침 하늘 예쁘다', '모닝 커피 내릴 사람'],
        day: ['창밖 날씨 좋다', '점심 산책 갈 사람', '오후엔 왜 이렇게 졸리지'],
        evening: ['노을 진다 창밖 봐요', '오늘 할 거 거의 끝!', '저녁 약속 있어서 먼저 갈게요'],
        night: ['밤 사무실 조용해서 좋다', '조명 하나만 남기고 끌게요', '내일 봐요~'],
        rain: ['비 오는 날 사무실 분위기 좋다', '우산 남는 거 있어요?']
      }
    };
    var GAP = { doyun: [5, 11], taeo: [6, 12], seoyeon: [7, 14] };
    var self = this;
    var PP = this._people();
    Object.keys(POOL).filter(function (w) { return !!PP[w]; }).forEach(function (who, k) {
      var idx = k;
      var cycle = function (delay) {
        self._timers.push(setTimeout(function () {
          if (self._dead) return;
          if (self.state.focusUntil > Date.now()) { cycle(4000 + Math.random() * 4000); return; }
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
    return {
      start: { lines: ['오, 오늘도 출근했네요.', '무슨 일 있어요?'], choices: [['커피머신이 이상해요', 'cof'], ['택배 온 거 있어요?', 'box'], ['그냥 인사하러요', 'bye']] },
      cof: { lines: ['또요? 허허, 한번 툭 쳐 봐요.', '…봐요, 잘 되죠? 오래된 친구라 그래요.'] },
      box: { lines: ['어디 보자… 하나 있네요!', '탕비실 선반에 올려 뒀어요.'], choices: [['고맙습니다!', 'bye'], ['뭐 시켰더라…', 'bye']] },
      bye: { lines: ['허허, 오늘도 무리하지 말아요.', '창가 화분 물은 내가 줬어요.'] }
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
    if (!this._canvas) { try { var l = document.querySelectorAll('canvas[data-office]'); if (l.length) this._canvas = l[l.length - 1]; } catch (e) {} }
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
    scene.background = new THREE.Color(0x3A4250);
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
    /* ---------- open-plan office: carpet tiles, a full window wall, a cubicle pod with partitions and desktop monitors ---------- */
    function hs(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
    var floorT = canvasTex(96, 72, function (x) {
      for (var y = 0; y < 72; y++) for (var px = 0; px < 96; px++) {
        var tx = Math.floor(px / 12), ty = Math.floor(y / 12), lx = px % 12, ly = y % 12, alt = ((tx + ty) & 1);
        var c = alt ? '#7E8A99' : '#86929F';
        if (hs(px * 0.9, y * 1.7) > 0.84) c = alt ? '#768291' : '#7E8A98';
        if (alt ? (ly % 3 === 0) : (lx % 3 === 0)) c = alt ? '#788494' : '#808C9A';
        if (lx === 0 || ly === 0) c = '#6F7B8A';
        x.fillStyle = c; x.fillRect(px, y, 1, 1);
      }
    });
    floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(1, 2); floorT.needsUpdate = true;
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 12), new THREE.MeshLambertMaterial({ map: floorT }));
    floor.position.z = 3; floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; add(floor);
    var wallM = mat('#EDEEEA'), trimM = mat('#5E6672'), darkM = mat('#3C4048'), whiteM = mat('#FFFFFF'), metalM = mat('#B8C0CA');
    [-1, 1].forEach(function (s0) {
      var w = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), wallM); w.position.set(s0 * 4, 1.5, 3); w.rotation.y = -s0 * Math.PI / 2; w.receiveShadow = true; add(w);
      var su = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), mat('#DADDE2')); su.position.set(s0 * 4, 4.5, 1.5); su.rotation.y = -s0 * Math.PI / 2; add(su);
    });
    /* window wall: low sill, glass to the ceiling, slim mullions, two concrete columns */
    add(bx(8, 0.55, 0.12, wallM, 0, 0.275, -3.0)); add(bx(8, 0.05, 0.22, mat('#C9CED6'), 0, 0.57, -2.92));
    var upper = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.6), mat('#F1F2F0')); upper.position.set(0, 5.2, -3); add(upper);
    add(bx(8, 0.16, 0.1, trimM, 0, 4.42, -2.97)); add(bx(8, 0.07, 0.08, trimM, 0, 2.95, -2.96));
    [-3.33, -2.67, -1.33, -0.67, 0.67, 1.33, 2.67, 3.33].forEach(function (mx) { add(bx(0.05, 3.85, 0.06, trimM, mx, 2.48, -2.96)); });
    add(bx(8, 0.04, 0.06, trimM, 0, 2.2, -2.96));
    [-2, 0, 2].forEach(function (cx0) { add(shade(bx(0.36, 4.5, 0.24, mat('#E2E3E0'), cx0, 2.25, -2.9))); });
    /* the city outside: sky and skyline repaint with Seoul time and the weather */
    var VW = 96, VH = 46, viewT = canvasTex(VW, VH, function () {}), cityT = canvasTex(VW, VH, function () {});
    var vctx = viewT.image.getContext('2d'), cctx = cityT.image.getContext('2d');
    /* puffy pixel clouds on a strip that wraps around, so they can drift past forever */
    var cloudT = canvasTex(160, VH, function (x) {
      x.clearRect(0, 0, 160, VH);
      [[12, 9, 9], [52, 15, 7], [88, 7, 11], [126, 13, 8], [146, 22, 5], [34, 24, 5]].forEach(function (c, ci) {
        var cx0 = c[0], cy0 = c[1], r0 = c[2];
        var blobs = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.95, 0.2, 0.75], [-0.4, -0.35, 0.65], [0.45, -0.4, 0.6], [1.6, 0.4, 0.45], [-1.6, 0.45, 0.45]];
        for (var yy = -r0 * 2; yy <= r0 * 2; yy++) for (var xx = -r0 * 3; xx <= r0 * 3; xx++) {
          var inside = blobs.some(function (b) { var dx = xx - b[0] * r0, dy = yy - b[1] * r0, rr = b[2] * r0; return dx * dx + dy * dy <= rr * rr; });
          if (!inside || yy > r0 * 0.55) continue;
          var px = ((cx0 + xx) % 160 + 160) % 160, py = cy0 + yy; if (py < 0 || py >= VH) continue;
          x.fillStyle = yy > r0 * 0.25 ? 'rgba(214,224,238,1)' : 'rgba(255,255,255,1)'; x.fillRect(px, py, 1, 1);
        }
      });
    });
    cloudT.wrapS = THREE.RepeatWrapping;
    var towers = []; for (var bi = 0; bi < 22; bi++) towers.push([Math.floor(hs(bi, 3) * VW), 3 + Math.floor(hs(bi, 7) * 6), 8 + Math.floor(hs(bi, 11) * 22), Math.floor(hs(bi, 13) * 3)]);
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function rgb(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
    function skyCols(h, kind) {
      var K = [[0, [16, 22, 44], [34, 42, 76]], [5, [16, 22, 44], [34, 42, 76]], [6.6, [96, 118, 176], [246, 184, 150]], [8.6, [104, 170, 232], [186, 224, 246]], [16.2, [104, 170, 232], [186, 224, 246]], [17.9, [86, 84, 150], [250, 146, 96]], [19.4, [16, 22, 44], [34, 42, 76]], [24, [16, 22, 44], [34, 42, 76]]];
      var i = 0; while (i < K.length - 2 && K[i + 1][0] <= h) i++;
      var A = K[i], B = K[i + 1], t = Math.max(0, Math.min(1, (h - A[0]) / (B[0] - A[0])));
      var top = mix(A[1], B[1], t), hor = mix(A[2], B[2], t);
      var g = { cloudy: [170, 178, 190], rain: [120, 130, 146], snow: [210, 216, 226] }[kind];
      if (g) { var night = 1 - dayAmt(h), gg = g.map(function (v) { return v * (0.3 + 0.7 * (1 - night)); }); top = mix(top, gg, 0.7); hor = mix(hor, gg, 0.65); }
      return { top: top, hor: hor };
    }
    function dayAmt(h) { var a = Math.max(0, Math.min(1, (h - 5.4) / 2.4)), b = 1 - Math.max(0, Math.min(1, (h - 17.2) / 2.0)); return a * a * (3 - 2 * a) * b; }
    var lastView = '';
    function paintView(h, kind) {
      var key0 = kind + ':' + Math.round(h * 20); if (key0 === lastView) return; lastView = key0;
      var c = skyCols(h, kind), day = dayAmt(h);
      for (var y = 0; y < VH; y++) { vctx.fillStyle = rgb(mix(c.top, c.hor, y / (VH - 1))); vctx.fillRect(0, y, VW, 1); }
      viewT.needsUpdate = true;
      /* clouds take the light of the hour: white by day, peach at sunset, slate at night */
      var cc = mix(mix([255, 255, 255], [255, 196, 170], Math.max(0, 1 - Math.abs(h - 17.9) / 1.3)), [70, 80, 110], 1 - day);
      if (kind !== 'clear') cc = mix(cc, [150, 158, 172], 0.5);
      cloudCol = cc; cctx.clearRect(0, 0, VW, VH);
      var far = mix([150, 170, 196], [40, 48, 74], 1 - day), near = mix([196, 204, 216], [52, 60, 86], 1 - day);
      towers.forEach(function (tw, i) {
        var hh = tw[2], x0 = tw[0], y0 = VH - hh; cctx.fillStyle = rgb(i % 3 ? near : far); vctx.fillRect(x0, y0, tw[1], hh);
        for (var wy = y0 + 2; wy < VH - 1; wy += 2) for (var wx = x0 + 1; wx < x0 + tw[1] - 1; wx += 2) {
          var on = hs(wx * 3 + i, wy * 5) < (day < 0.5 ? 0.45 : 0.12);
          cctx.fillStyle = on ? (day < 0.5 ? 'rgba(255,214,120,0.95)' : 'rgba(255,255,255,0.55)') : 'rgba(0,0,0,0.12)'; cctx.fillRect(wx, wy, 1, 1);
        }
      });
      cctx.fillStyle = rgb(mix([126, 168, 98], [30, 40, 50], 1 - day)); cctx.fillRect(0, VH - 2, VW, 2);
      cityT.needsUpdate = true;
    }
    var cloudCol = [255, 255, 255];
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.85), new THREE.MeshBasicMaterial({ map: viewT })); glass.position.set(0, 2.48, -2.99); add(glass);
    /* two cloud layers for depth: the far one small and slow, the near one bigger and quicker */
    var cloudLayers = [[1.7, 0.004, -2.989, 0.75, 0.55], [1.0, 0.009, -2.988, 0.95, 0.0]].map(function (L0) {
      var t2 = cloudT.clone(); t2.needsUpdate = true; t2.wrapS = THREE.RepeatWrapping; t2.repeat.set(L0[0] * 0.6, 1); t2.offset.set(L0[4], L0[0] > 1 ? 0.18 : 0);
      var m2 = new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: L0[3], depthWrite: false });
      var me2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.85), m2); me2.position.set(0, 2.48, L0[2]); add(me2);
      return { t: t2, m: m2, sp: L0[1], op: L0[3] };
    });
    var city = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.85), new THREE.MeshBasicMaterial({ map: cityT, transparent: true, depthWrite: false })); city.position.set(0, 2.48, -2.987); add(city);
    /* rain on the glass */
    var rainT = canvasTex(32, 32, function (x) { x.clearRect(0, 0, 32, 32); for (var i = 0; i < 26; i++) { var rx = Math.floor(hs(i, 1) * 32), ry = Math.floor(hs(i, 2) * 32), rl = 2 + Math.floor(hs(i, 3) * 4); x.fillStyle = 'rgba(220,235,255,0.55)'; x.fillRect(rx, ry, 1, rl); } });
    rainT.wrapS = rainT.wrapT = THREE.RepeatWrapping; rainT.repeat.set(5, 2.4);
    var rainM = new THREE.MeshBasicMaterial({ map: rainT, transparent: true, opacity: 0, depthWrite: false });
    var rainP = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.85), rainM); rainP.position.set(0, 2.48, -2.975); add(rainP);
    /* company sign on the bulkhead */
    var logoT = canvasTex(12, 12, function (x) {
      var R = ['............', '....kkkk....', '....k..k....', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbbbyybbbb.', '.kkkkyykkkk.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '............', '............'];
      var C = { '.': '#FFFFFF', b: '#6E8FB8', k: '#3F5F8A', y: '#F7C84A' };
      R.forEach(function (r, y) { for (var i = 0; i < 12; i++) { x.fillStyle = C[r.charAt(i)]; x.fillRect(i, y, 1, 1); } });
    });
    var sign = new THREE.Group(); sign.position.set(-2, 3.7, -2.76); add(sign);
    var sr = cyl(0.36, 0.36, 0.05, 18, mat('#3F5F8A'), 0, 0, 0); sr.rotation.x = Math.PI / 2; sign.add(sr);
    var sf = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshBasicMaterial({ map: logoT })); sf.position.z = 0.03; sign.add(sf);
    /* wall clock on the middle column, real Seoul time */
    var clock = new THREE.Group(); clock.position.set(0, 2.45, -2.76); add(clock);
    var face = cyl(0.17, 0.17, 0.04, 16, whiteM, 0, 0, 0); face.rotation.x = Math.PI / 2; clock.add(face);
    clock.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 4, 16), darkM));
    var hourH = new THREE.Group(), minH = new THREE.Group(); clock.add(hourH); clock.add(minH);
    hourH.add(bx(0.025, 0.09, 0.02, darkM, 0, 0.045, 0.03)); minH.add(bx(0.018, 0.13, 0.02, darkM, 0, 0.065, 0.04));

    /* pantry in the left corner, printer and cabinets on the right */
    var woodL = mat('#D9B98C');
    var pantry = new THREE.Group(); pantry.position.set(-3.25, 0, -2.3); add(shade(pantry));
    pantry.add(bx(1.3, 0.9, 0.6, mat('#C9D3DD'), 0, 0.45, 0)); pantry.add(bx(1.4, 0.06, 0.7, woodL, 0, 0.93, 0));
    pantry.add(bx(0.32, 0.42, 0.3, darkM, -0.3, 1.17, -0.05)); pantry.add(bx(0.12, 0.05, 0.1, metalM, -0.3, 1.06, 0.12));
    pantry.add(bx(0.05, 0.05, 0.02, mat('#FF5A4E', { emissive: new THREE.Color(0x401010) }), -0.23, 1.3, 0.11));
    pantry.add(cyl(0.1, 0.1, 0.2, 8, mat('#FFD36B'), 0.25, 1.06, 0));
    var cooler = new THREE.Group(); cooler.position.set(-2.35, 0, -2.5); add(shade(cooler));
    cooler.add(bx(0.36, 0.95, 0.36, whiteM, 0, 0.475, 0)); cooler.add(cyl(0.14, 0.14, 0.34, 10, new THREE.MeshLambertMaterial({ color: 0x9FD3F2, transparent: true, opacity: 0.8 }), 0, 1.12, 0));
    var printer = new THREE.Group(); printer.position.set(3.2, 0, -2.35); add(shade(printer));
    printer.add(bx(1.0, 0.75, 0.6, mat('#D8DCE2'), 0, 0.375, 0)); printer.add(bx(0.9, 0.26, 0.55, mat('#ECEEF1'), 0, 0.88, 0));
    printer.add(bx(0.5, 0.03, 0.3, whiteM, -0.05, 1.03, 0.08)); printer.add(bx(0.18, 0.08, 0.02, mat('#3A4A5A', { emissive: new THREE.Color(0x1A3A5A) }), 0.3, 0.9, 0.28));
    printer.add(bx(0.06, 0.02, 0.02, mat('#7FD06A', { emissive: new THREE.Color(0x205A10) }), 0.38, 0.95, 0.29));
    var cab = new THREE.Group(); cab.position.set(2.35, 0, -2.55); add(shade(cab));
    cab.add(bx(0.55, 0.9, 0.5, mat('#9AA4B0'), 0, 0.45, 0)); [0.25, 0.6].forEach(function (cy) { cab.add(bx(0.18, 0.03, 0.02, metalM, 0, cy, 0.26)); });
    cab.add(cyl(0.12, 0.09, 0.2, 8, mat('#E8DCC4'), 0, 1.0, 0)); var cl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), mat('#4F9A3E')); cl.position.set(0, 1.2, 0); cab.add(cl);

    /* ---------- the cubicle pod ---------- */
    var panelM = mat('#8E9BAA'), panelM2 = mat('#97A3B1'), trim = mat('#D3D9E0'), deskM = mat('#E9E3D6'), legM = mat('#9AA2AC');
    var PH = 1.05;
    function panel(x0, z0, x1, z1) {
      var len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.Group();
      g.add(bx(len, PH - 0.04, 0.06, (Math.round(x0 * 7 + z0 * 3) & 1) ? panelM : panelM2, 0, (PH - 0.04) / 2, 0)); g.add(bx(len + 0.02, 0.04, 0.08, trim, 0, PH - 0.02, 0));
      g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = -Math.atan2(z1 - z0, x1 - x0); add(shade(g)); return g;
    }
    /* desks run front to back: one long partition down the middle, and one on each outer side,
       so from above the pod reads as tall vertical walls */
    function tallPanel(x, z0, z1, h, frost) {
      var g = new THREE.Group(), len = z1 - z0;
      g.add(bx(0.09, h - 0.05, len, panelM, 0, (h - 0.05) / 2, 0)); g.add(bx(0.13, 0.05, len + 0.04, trim, 0, h - 0.025, 0));
      if (frost) { g.add(bx(0.03, 0.32, len - 0.1, new THREE.MeshLambertMaterial({ color: 0xDDEFF7, transparent: true, opacity: 0.55 }), 0, h + 0.16, 0)); g.add(bx(0.06, 0.03, len, trim, 0, h + 0.33, 0)); }
      g.position.set(x, 0, (z0 + z1) / 2); add(shade(g)); return g;
    }
    /* screens: a tiny canvas per monitor that keeps changing like real work */
    var screens = [];
    function screenTex(kind) {
      var t = canvasTex(32, 20, function () {}), x = t.image.getContext('2d'), st0 = { t: t, x: x, kind: kind, k: Math.floor(Math.random() * 40) };
      st0.draw = function () {
        var k = st0.k++, X = st0.x;
        if (kind === 'code') { X.fillStyle = '#1F2633'; X.fillRect(0, 0, 32, 20); for (var i = 0; i < 9; i++) { var ln = (i + k) % 13, w = 4 + Math.floor(hs(ln, 2) * 20); X.fillStyle = ['#7FD0F0', '#F7C84A', '#E78AC3', '#9ED07A', '#C8D0DC'][ln % 5]; X.fillRect(2 + (ln % 3) * 2, 1 + i * 2, w, 1); } if (k % 2) { X.fillStyle = '#FFFFFF'; X.fillRect(20, 17, 1, 2); } }
        else if (kind === 'sheet') { X.fillStyle = '#FFFFFF'; X.fillRect(0, 0, 32, 20); X.fillStyle = '#2F7D4F'; X.fillRect(0, 0, 32, 2); X.fillStyle = '#DDE3EA'; for (var gy = 4; gy < 20; gy += 2) X.fillRect(0, gy, 32, 1); for (var gx = 6; gx < 32; gx += 6) X.fillRect(gx, 2, 1, 18); X.fillStyle = '#9ED07A'; X.fillRect(7, 4 + (k % 7) * 2, 5, 1); X.fillStyle = '#6E8FB8'; for (var b = 0; b < 4; b++) X.fillRect(20 + b * 2, 16 - ((k + b) % 5) * 2, 1, 4 + ((k + b) % 5) * 2); }
        else if (kind === 'design') { X.fillStyle = '#E9EBEF'; X.fillRect(0, 0, 32, 20); X.fillStyle = '#3A3F4A'; X.fillRect(0, 0, 5, 20); X.fillStyle = '#FFFFFF'; X.fillRect(8, 3, 19, 14); X.fillStyle = ['#F49AA8', '#9FC4E8', '#F7C84A'][k % 3]; X.fillRect(10 + (k % 4), 5, 6, 5); X.fillStyle = '#7FB069'; X.fillRect(18, 11 - (k % 3), 6, 4); }
        else { X.fillStyle = '#2F4F7F'; X.fillRect(0, 0, 32, 20); X.fillStyle = '#4F77B0'; X.fillRect(0, 12, 32, 8); X.fillStyle = '#FFFFFF'; var bx0 = 4 + (k * 2) % 22, by0 = 3 + (k * 3) % 12; X.fillRect(bx0, by0, 4, 3); X.fillStyle = '#F7C84A'; X.fillRect(bx0 + 1, by0 + 1, 2, 1); }
        t.needsUpdate = true;
      };
      st0.draw(); screens.push(st0); return st0;
    }
    var monLights = [];
    function monitor(x, z, yaw, kind, lit) {
      var g = new THREE.Group(); g.position.set(x, 0.79, z); g.rotation.y = yaw; add(g);
      g.add(bx(0.22, 0.02, 0.16, darkM, 0, 0.01, 0)); g.add(bx(0.04, 0.3, 0.04, darkM, 0, 0.16, -0.03));
      g.add(shade(bx(0.66, 0.4, 0.04, mat('#2A2D33'), 0, 0.42, -0.02)));
      var st0 = screenTex(kind), scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), new THREE.MeshBasicMaterial({ map: st0.t })); scr.position.set(0, 0.42, 0.002); g.add(scr);
      if (lit) { var pl = new THREE.PointLight(kind === 'code' ? 0x9CC8FF : 0xDDEBFF, 0.2, 1.8); pl.position.set(0, 0.45, 0.35); g.add(pl); monLights.push({ pl: pl, st: st0, ph: Math.random() * 6 }); }
      return g;
    }
    function keyboard(x, z, yaw) {
      var g = new THREE.Group(); g.add(bx(0.44, 0.02, 0.14, mat('#3C4048'), 0, 0, 0)); g.add(bx(0.07, 0.02, 0.1, mat('#3C4048'), 0.34, 0, 0));
      g.position.set(x, 0.8, z); g.rotation.y = yaw; add(g);
    }
    function bench(xc) {
      var g = new THREE.Group(); g.add(bx(0.95, 0.05, 4.1, deskM, 0, 0.765, 0));
      [[-0.42, -1.98], [0.42, -1.98], [-0.42, 1.98], [0.42, 1.98], [-0.42, 0], [0.42, 0]].forEach(function (l) { g.add(bx(0.05, 0.74, 0.05, legM, l[0], 0.37, l[1])); });
      g.position.set(xc, 0, 1.1); add(shade(g)); return g;
    }
    var mySeat = null;
    function chair(x, z, yaw) {
      var g = new THREE.Group();
      g.add(bx(0.5, 0.08, 0.48, mat('#3E4552'), 0, 0.46, 0)); g.add(bx(0.48, 0.5, 0.07, mat('#2F3540'), 0, 0.78, -0.24));
      g.add(cyl(0.035, 0.035, 0.36, 5, metalM, 0, 0.24, 0));
      for (var a = 0; a < 5; a++) { var leg = bx(0.3, 0.03, 0.05, darkM, 0, 0.05, 0); leg.rotation.y = a * Math.PI * 2 / 5; leg.position.set(Math.cos(a * 1.2566) * 0.14, 0.05, -Math.sin(a * 1.2566) * 0.14); g.add(leg); }
      g.position.set(x, 0, z); g.rotation.y = yaw || 0; return add(shade(g));
    }
    var potMs = [mat('#E8DCC4'), mat('#F2F2EE'), mat('#C9775E'), mat('#9AA4B0')], leafMs = [mat('#4F9A3E'), mat('#6CB34E'), mat('#3F8A3A'), mat('#7FC25C')];
    /* ---------- desk pods: four seats each. a bigger chat room gets another pod beside it, never a longer one ---------- */
    var cupsA = [], treatCup = null;
    var nm0 = self.props && self.props.names, members = nm0 ? Object.keys(nm0).length + 1 : 4;
    var PODS = Math.max(1, Math.min(2, Math.ceil(members / 4))), PSC = PODS > 1 ? 0.8 : 1, PZ = 0.6;
    var PX = PODS > 1 ? [-2.0, 2.0] : [0];
    function buildPod(px, first, seatSpec) {
      var podG = new THREE.Group(), keep = add;
      add = function (o) { podG.add(o); return o; };
      try {
      tallPanel(0, -1.05, 3.25, 1.1, true);
      tallPanel(-2.35, -1.05, 3.25, 1.05, false); tallPanel(2.35, -1.05, 3.25, 1.05, false);
      /* sticky notes, a calendar and a photo pinned on the inner faces of the side partitions */
      [['#FFE9A0', -2.3, 0.84, -0.2], ['#F9CFE0', -2.3, 0.7, -0.05], ['#DDF0C8', -2.3, 0.82, 1.3], ['#CFE8F5', 2.3, 0.86, -0.15], ['#FFE9A0', 2.3, 0.72, 1.2], ['#F9CFE0', 2.3, 0.84, 1.35]].forEach(function (n) { add(bx(0.01, 0.11, 0.12, mat(n[0]), n[1], n[2], n[3])); });
      add(bx(0.012, 0.36, 0.3, whiteM, -2.29, 0.66, 2.4)); add(bx(0.014, 0.07, 0.3, mat('#D9534F'), -2.285, 0.81, 2.4));
      add(bx(0.012, 0.16, 0.22, mat('#D9B98C'), 2.29, 0.86, 2.55));
      bench(-0.6); bench(0.6);
      /* four seats along the middle partition: people sit on the outside and turn a little toward us */
      var SEATS = seatSpec;
      SEATS.forEach(function (q) {
        var side = q[0] < 0 ? -1 : 1, mx = side * 0.32, mz = q[1] - 0.12;
        monitor(mx, mz, Math.atan2(q[0] - mx, q[1] + 0.25 - mz), q[2], q[3]);
        keyboard(side * 0.82, q[1] + 0.05, side < 0 ? -Math.PI / 2 : Math.PI / 2);
        var chObj = chair(q[0], q[1], q[4]);
        if (first && q[0] === 1.5 && q[1] === 2.3) mySeat = { chair: chObj, q: q };
      });
      /* desk things */
      if (first) cupsA = [[-0.88, -0.05], [0.88, -0.05], [-0.88, 2.75]].map(function (c) { return add(shade(cyl(0.06, 0.05, 0.11, 6, whiteM, c[0], 0.85, c[1]))); });
      if (first) treatCup = add(shade(cyl(0.07, 0.06, 0.13, 6, mat('#FFD36B'), -0.9, 0.86, -0.75))); if (treatCup) treatCup.visible = false;
      [[-0.7, -0.85], [0.7, 1.2], [-0.7, 2.95]].forEach(function (p0) { add(cyl(0.07, 0.055, 0.1, 6, mat('#C9775E'), p0[0], 0.84, p0[1])); var lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), mat('#5BAA48')); lf.position.set(p0[0], 0.95, p0[1]); add(lf); });
      add(shade(bx(0.22, 0.08, 0.3, whiteM, 0.75, 0.83, 0.5))); add(shade(bx(0.2, 0.05, 0.28, mat('#CFE8F5'), 0.75, 0.89, 0.5)));
      [[0.85, 2.6], [-0.85, 1.2]].forEach(function (p0) { add(cyl(0.06, 0.05, 0.08, 6, potMs[1], p0[0], 0.83, p0[1])); var sc0 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), leafMs[3]); sc0.position.set(p0[0], 0.92, p0[1]); add(sc0); });

      } finally { add = keep; }
      podG.position.set(px, 0, PZ); podG.scale.set(PSC, 1, PSC); scene.add(podG);
    }
    var EMPTY_L = 1.3, EMPTY_R = -1.3;
    var SPECS = PODS > 1 ? [
      [[-1.5, -0.5, 'code', true, 0.95], [1.5, -0.5, 'saver', false, EMPTY_R], [-1.5, 2.3, 'saver', false, EMPTY_L], [1.5, 2.3, 'saver', false, -1.35]],
      [[-1.5, -0.5, 'saver', false, EMPTY_L], [1.5, -0.5, 'sheet', true, -0.95], [-1.5, 2.3, 'design', true, 0.95], [1.5, 2.3, 'saver', false, EMPTY_R]]
    ] : [[[-1.5, -0.5, 'code', true, 0.95], [1.5, -0.5, 'sheet', true, -0.95], [-1.5, 2.3, 'design', true, 0.95], [1.5, 2.3, 'saver', false, -1.35]]];
    PX.forEach(function (px, i) { buildPod(px, i === 0, SPECS[i]); });
    /* where people sit, in room coordinates, for the people code further down */
    var PXL = PX[PX.length - 1];
    var officeSeats = PODS > 1 ? {
      /* two pods: spread people over both so nobody is squeezed */
      doyun: [PX[0] - 1.5 * PSC, -0.5 * PSC + PZ, 0.95], taeo: [PXL + 1.5 * PSC, -0.5 * PSC + PZ, -0.95],
      seoyeon: [PXL - 1.5 * PSC, 2.3 * PSC + PZ, 0.95], me: [PX[0] + 1.5 * PSC + 0.25, 3.6 * PSC + PZ, 0]
    } : {
      doyun: [PX[0] - 1.5 * PSC, -0.5 * PSC + PZ, 0.95], taeo: [PX[0] + 1.5 * PSC, -0.5 * PSC + PZ, -0.95],
      seoyeon: [PX[0] - 1.5 * PSC, 2.3 * PSC + PZ, 0.95], me: [PX[0] + 2.1 * PSC, 3.6 * PSC + PZ, 0]
    };
    if (PODS > 1) { camera.position.set(0, 8.6 * 1.2, 11.5 * 1.16); camera.lookAt(0, 1.0, 0.1); }
    var plants = [];
    function plant(x, z, kind, s0) {
      var g = new THREE.Group(), s = s0 || 1, pm = potMs[kind % 4];
      g.add(cyl(0.2 * s, 0.15 * s, 0.34 * s, 8, pm, 0, 0.17 * s, 0)); g.add(cyl(0.21 * s, 0.21 * s, 0.04 * s, 8, pm, 0, 0.35 * s, 0));
      if (kind === 1) {
        /* tall snake plant: upright blades */
        for (var bl = 0; bl < 7; bl++) { var an = bl * 0.9, lb = bx(0.07 * s, (0.6 + hs(bl, 3) * 0.4) * s, 0.02 * s, leafMs[bl % 2 ? 2 : 0], Math.cos(an) * 0.08 * s, 0.6 * s, Math.sin(an) * 0.08 * s); lb.rotation.set(Math.sin(an) * 0.15, an, Math.cos(an) * 0.15); g.add(lb); }
      } else if (kind === 2) {
        /* monstera-ish: big leaves on stems fanning out */
        for (var lf = 0; lf < 6; lf++) { var a2 = lf * 1.05, st = new THREE.Group(); st.position.y = 0.35 * s; st.rotation.y = a2; st.rotation.z = 0.5 + hs(lf, 5) * 0.3; g.add(st);
          st.add(cyl(0.012 * s, 0.012 * s, 0.5 * s, 4, leafMs[2], 0, 0.25 * s, 0)); var lv = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 * s, 0), leafMs[lf % 2]); lv.scale.set(1.2, 0.35, 0.9); lv.position.y = 0.52 * s; st.add(lv); g.leaves = (g.leaves || []).concat([st]); }
      } else {
        var a = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * s, 0), leafMs[0]); a.position.y = 0.62 * s; g.add(a);
        var b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 * s, 0), leafMs[1]); b.position.set(0.12 * s, 0.88 * s, 0.05 * s); g.add(b);
        var c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 * s, 0), leafMs[3]); c.position.set(-0.14 * s, 0.8 * s, -0.06 * s); g.add(c);
      }
      g.position.set(x, 0, z); g.ph = x * 1.3 + z; plants.push(g); return add(shade(g));
    }
    plant(3.6, 0.4, 2, 1.15); plant(-3.4, 4.3, 0, 1.1); plant(3.5, 4.9, 1, 1.2);
    plant(-1.0, -2.5, 1, 1.25); plant(1.0, -2.5, 2, 1.05); plant(-3.65, 0.9, 2, 1.0); if (PODS === 1) plant(0, 3.75 + PZ, 0, 0.9); plant(-1.9, 4.6, 2, 1.2);
    /* small desk succulents */
    /* a low storage unit and a rolling pedestal by the aisle */
    var store = new THREE.Group(); store.position.set(-3.55, 0, 2.1); add(shade(store)); store.add(bx(0.6, 0.7, 1.6, mat('#D8DCE2'), 0, 0.35, 0)); [-0.4, 0.4].forEach(function (sz) { store.add(bx(0.02, 0.05, 0.3, metalM, 0.31, 0.5, sz)); }); store.add(bx(0.4, 0.3, 0.3, mat('#F2C14E'), 0, 0.85, -0.4)); store.add(bx(0.32, 0.06, 0.24, whiteM, 0, 0.73, 0.35));
    /* LED ceiling panels */
    var lampM = new THREE.MeshLambertMaterial({ color: 0xF6F8FF, emissive: 0xEEF3FF, emissiveIntensity: 0.6 });
    var ceil = [];
    [-2, 0, 2].forEach(function (lx) {
      add(bx(1.1, 0.05, 0.5, lampM, lx, 2.98, 0.9));
      var pl = new THREE.PointLight(0xF4F6FF, 0.35, 6.5); pl.position.set(lx, 2.6, 0.9); add(pl); ceil.push(pl);
    });
    var steams = [];
    cupsA.concat([treatCup]).forEach(function (c, i) {
      for (var k = 0; k < 2; k++) { var s0 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.7 })); add(s0); steams.push({ m: s0, base: c, ph: i * 0.37 + k * 0.5 }); }
    });

    /* ---------- daylight through the window wall ----------
       the sun's colour and height follow the (village) clock, clouds drift past and dim it for a while,
       the bright patches on the carpet stretch and slide as the sun moves, dust hangs in the beams,
       the ceiling panels matter more as it gets dark, and the monitors glow on faces */
    var patchT = canvasTex(16, 16, function (x) { for (var y = 0; y < 16; y++) for (var i = 0; i < 16; i++) { var e = Math.min(i, 15 - i, y, 15 - y); x.fillStyle = 'rgba(255,255,255,' + Math.min(1, e / 3.5).toFixed(2) + ')'; x.fillRect(i, y, 1, 1); } });
    patchT.magFilter = THREE.LinearFilter; patchT.minFilter = THREE.LinearFilter;
    var BAYS = [[-3.8, -2.2], [-1.8, -0.2], [0.2, 1.8], [2.2, 3.8]], patches = [];
    BAYS.forEach(function (b) {
      var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); geo.setIndex([0, 2, 1, 0, 3, 2]);
      var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: patchT, color: 0xFFE6B8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.renderOrder = 2; add(m); patches.push({ m: m, b: b });
    });
    var beamN = 50, beamPos = new Float32Array(beamN * 3), beamSeed = [];
    for (var bi2 = 0; bi2 < beamN; bi2++) beamSeed.push([-3.6 + Math.random() * 7.2, 0.4 + Math.random() * 2.2, -2.7 + Math.random() * 2.6, Math.random() * 6.28]);
    var motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(beamPos, 3)), new THREE.PointsMaterial({ color: 0xFFF2D0, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    add(motes);
    function skyNow() {
      var sp = self.props && self.props.sky;
      if (sp && typeof sp.h === 'number') return sp;
      var h = 12; try { var pt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); h = parseInt(pt.slice(0, 2), 10) + parseInt(pt.slice(3, 5), 10) / 60; } catch (e) {}
      return { h: h, kind: 'clear' };
    }
    var nextScreen = 0;
    roomFx.push(function (t, dt) {
      var sk = skyNow(), h = sk.h, kind = sk.kind || 'clear', day = dayAmt(h);
      paintView(h, kind);
      var wind = typeof sk.wind === 'number' ? sk.wind : 0.5, many = kind === 'clear' ? Math.min(1, (sk.clouds || 5) / 7) : 1;
      cloudLayers.forEach(function (L1, li) {
        if (!self._reduce) L1.t.offset.x = (L1.t.offset.x + dt * L1.sp * (0.5 + wind)) % 1;
        L1.m.color.setRGB(cloudCol[0] / 255, cloudCol[1] / 255, cloudCol[2] / 255);
        L1.m.opacity = L1.op * (li === 0 ? 1 : many) * (kind === 'rain' ? 1 : 0.95);
      });
      /* clouds: a slow drift that now and then covers the sun for ten-odd seconds */
      var drift = Math.sin(t * 0.11) * 0.5 + Math.sin(t * 0.047 + 1.3) * 0.35 + Math.sin(t * 0.23 + 2.1) * 0.15;
      var cover = Math.max(0, Math.min(1, (drift - 0.25) / 0.35));
      var cloudF = kind === 'clear' ? 1 - 0.55 * cover : kind === 'cloudy' ? 0.32 + 0.12 * (1 - cover) : kind === 'snow' ? 0.4 : 0.16;
      if (self._reduce) cloudF = kind === 'clear' ? 1 : cloudF;
      var sun = day * cloudF;
      var gold = Math.max(0, 1 - Math.abs(h - 12.3) / 5.6); gold = 1 - gold * gold; /* low sun = warm */
      var sc = mix([255, 246, 228], [255, 170, 104], gold);
      key.color.setRGB(sc[0] / 255, sc[1] / 255, sc[2] / 255); key.intensity = 0.1 + 0.7 * sun;
      var morning = h < 12.3, az = Math.max(-1, Math.min(1, (h - 12.3) / 6));
      key.position.set(-az * 7, 3 + 5 * (1 - Math.abs(az)), -9); key.target.position.set(0, 0, 1.5);
      if (hemi) { var hc = mix([150, 158, 178], [236, 240, 250], day); hemi.color.setRGB(hc[0] / 255, hc[1] / 255, hc[2] / 255); hemi.intensity = 0.55 + 0.3 * day * (0.6 + 0.4 * cloudF); }
      /* people switch the panels on brighter when it gets dark outside */
      ceil.forEach(function (pl) { pl.intensity = 0.5 + 0.4 * (1 - day * (0.5 + 0.5 * cloudF)); });
      lampM.emissiveIntensity = 0.45 + 0.4 * (1 - day);
      /* window light on the carpet: longer when the sun is low, sliding with the hour */
      var len = 1.3 + 2.4 * Math.abs(az), skew = -az * 1.6;
      patches.forEach(function (p) {
        var a = p.m.geometry.attributes.position, z0 = -2.95, z1 = z0 + len;
        a.setXYZ(0, p.b[0], 0.015, z0); a.setXYZ(1, p.b[1], 0.015, z0); a.setXYZ(2, p.b[1] + skew, 0.015, z1); a.setXYZ(3, p.b[0] + skew, 0.015, z1); a.needsUpdate = true;
        p.m.material.opacity = 0.5 * sun; p.m.material.color.setRGB(sc[0] / 255, sc[1] / 255 * 0.98, sc[2] / 255 * 0.9);
      });
      var mp = motes.geometry.attributes.position;
      beamSeed.forEach(function (d, i) { var u = self._reduce ? 0 : t; mp.setXYZ(i, d[0] + Math.sin(u * 0.2 + d[3]) * 0.3, 0.4 + ((d[1] + u * 0.03) % 2.2), d[2] + Math.cos(u * 0.17 + d[3]) * 0.2); });
      mp.needsUpdate = true; motes.material.opacity = 0.7 * sun;
      /* rain streaks run down the glass */
      rainM.opacity = kind === 'rain' ? 0.75 : 0; if (kind === 'rain' && !self._reduce) rainT.offset.y = (rainT.offset.y + dt * 1.6) % 1;
      /* screens update a little at a time; the glow on faces breathes with what is on them */
      if (t > nextScreen) { nextScreen = t + 0.6 + Math.random() * 0.9; var sc0 = screens[Math.floor(Math.random() * screens.length)]; if (!self._reduce) sc0.draw(); }
      if (!self._reduce) plants.forEach(function (g) { if (g.leaves) g.leaves.forEach(function (st, i) { st.rotation.x = Math.sin(t * 0.8 + g.ph + i) * 0.04; }); else g.rotation.z = Math.sin(t * 0.6 + g.ph) * 0.012; });
      monLights.forEach(function (m) { m.pl.intensity = (0.16 + 0.14 * (1 - day)) * (1 + Math.sin(t * 2.3 + m.ph) * 0.08); });
      var nowD = new Date(), hh = 0, mm = 0;
      try { var pt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(nowD); hh = parseInt(pt.slice(0, 2), 10) % 12; mm = parseInt(pt.slice(3, 5), 10); } catch (e) {}
      minH.rotation.z = -mm / 60 * Math.PI * 2; hourH.rotation.z = -(hh + mm / 60) / 12 * Math.PI * 2;
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
      { id: 'doyun', x: -1.5, y: 0.5, z: -0.5, sit: true, face: 0.95 },
      { id: 'taeo', x: 1.5, y: 0.5, z: -0.5, sit: true, face: -0.95 },
      { id: 'seoyeon', x: -1.5, y: 0.5, z: 2.3, sit: true, face: 0.95 },
      { id: 'me', x: 2.15, y: 0, z: 3.6, sit: false }
    ];
    cast = cast.filter(function (c) { return !!P[c.id]; });
    cast.forEach(function (c) { var q = officeSeats[c.id]; if (q) { c.x = q[0]; c.z = q[1]; if (c.sit) c.face = q[2]; } });
    cast.forEach(function (c, i) {
      c.obj = person(P[c.id], c.sit, c.apron);
      c.obj.position.set(c.x, c.y, c.z);
      c.yaw = c.sit ? (c.face || 0) : Math.atan2(-c.x * 0.4, 6.6 - c.z);
      c.obj.rotation.y = c.yaw; c.phase = i * 1.1; c.talk = 0;
      add(c.obj);
    });

    /* me: standing by the entrance. a focus session sends me to the free desk (front right): I walk to the spot in
       front of the chair, turn my back to it as the chair swings round, and hop up and back onto the seat.
       when it ends I hop down forward, the chair swings back, and I walk home and face the room again */
    var meC = cast.filter(function (q) { return q.id === 'me'; })[0];
    var SIT_YAW = -0.95;
    function seatXZ() { return [PX[0] + mySeat.q[0] * PSC, mySeat.q[1] * PSC + PZ]; }
    function frontXZ() { var sp = seatXZ(), d = 0.36 * PSC; return [sp[0] + Math.sin(SIT_YAW) * d, sp[1] + Math.cos(SIT_YAW) * d]; }
    function homeYaw() { var h = officeSeats.me; return Math.atan2(-h[0] * 0.4, 6.6 - h[1]); }
    function meBody(sit, x, y, z, yaw) {
      var c = meC; scene.remove(c.obj); c.sit = sit; c.x = x; c.y = y; c.z = z;
      c.obj = person(P.me, sit, false); c.obj.position.set(x, y, z); c.yaw = yaw; c.obj.rotation.y = yaw; add(c.obj);
    }
    function meTag() { var tg = Object.assign({}, self.state.tags || {}); tg.me = proj(meC); self.setState({ tags: tg }); }
    function meSit(on) {
      var c = meC; if (!c || !mySeat || c.goal === !!on) return; c.goal = !!on;
      var sp = seatXZ(), fr = frontXZ(), home = officeSeats.me;
      if (self._reduce) {
        /* reduced motion: no walking or hopping, just be there */
        c.plan = null;
        if (on) { meBody(true, sp[0], 0.5, sp[1], SIT_YAW); mySeat.chair.rotation.y = SIT_YAW; }
        else { meBody(false, home[0], 0, home[1], homeYaw()); mySeat.chair.rotation.y = mySeat.q[4]; }
        meTag(); return;
      }
      if (on) c.plan = c.sit ? null : [{ walk: fr }, { turn: SIT_YAW, chairTo: SIT_YAW }, { hop: [sp[0], 0.5, sp[1]], sit: true, dur: 0.42 }];
      else c.plan = (c.sit ? [{ hop: [fr[0], 0, fr[1]], sit: false, dur: 0.36 }] : []).concat([{ walk: [home[0], home[1]], chairTo: mySeat.q[4] }, { turn: homeYaw() }]);
    }
    function limbsRest(o) { if (o.legs) { o.legs[0].position.z = 0.02; o.legs[1].position.z = 0.02; } o.arms[0].rotation.x = 0; o.arms[1].rotation.x = 0; }
    function spin(o, want, rate) { var da = Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y)); o.rotation.y += da * Math.min(1, rate); return Math.abs(da); }
    /* one frame of the current step (walk / turn / hop). it places me fully, so the idle code is skipped */
    function meStep(c, dt, t) {
      var s = c.plan[0], o = c.obj, y = c.y, armL = 0.35, armR = 0.35;
      if (s.chairTo != null) spin(mySeat.chair, s.chairTo, dt * 7);
      if (s.walk) {
        var p = s.walk, dx = p[0] - o.position.x, dz = p[1] - o.position.z, dl = Math.sqrt(dx * dx + dz * dz), step = 1.05 * dt, sw = Math.sin(t * 11);
        if (dl > 0.02) spin(o, Math.atan2(dx, dz), dt * 12);
        if (dl <= step) { o.position.x = p[0]; o.position.z = p[1]; s.done = true; }
        else { o.position.x += dx / dl * step; o.position.z += dz / dl * step; }
        if (o.legs) { o.legs[0].position.z = 0.02 + sw * 0.07; o.legs[1].position.z = 0.02 - sw * 0.07; }
        o.arms[0].rotation.x = sw * 0.6; o.arms[1].rotation.x = -sw * 0.6; armL = 0.3 + Math.max(0, sw) * 0.25; armR = 0.3 + Math.max(0, -sw) * 0.25;
        y += Math.abs(sw) * 0.045;
        if (s.done) limbsRest(o);
      } else if (s.turn != null) {
        /* a few small steps on the spot while turning round */
        var sw2 = Math.sin(t * 14);
        if (o.legs) { o.legs[0].position.z = 0.02 + sw2 * 0.03; o.legs[1].position.z = 0.02 - sw2 * 0.03; }
        if (spin(o, s.turn, dt * 7) < 0.03) { o.rotation.y = s.turn; s.done = true; limbsRest(o); }
        y += Math.abs(sw2) * 0.015;
      } else if (s.hop) {
        if (!s.from) { s.from = [o.position.x, c.y, o.position.z]; s.t = 0; s.yaw = o.rotation.y; }
        s.t += dt; var k = Math.min(1, s.t / s.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var hx = s.from[0] + (s.hop[0] - s.from[0]) * e, hz = s.from[2] + (s.hop[2] - s.from[2]) * e;
        y = s.from[1] + (s.hop[1] - s.from[1]) * e + Math.sin(k * Math.PI) * 0.2;
        /* a little crouch before the jump, arms up in the air, and the body changes pose at the top where it is hard to see */
        if (k < 0.18) y -= Math.sin(k / 0.18 * Math.PI) * 0.05;
        armL = armR = 0.35 + Math.sin(k * Math.PI) * 0.9;
        if (!s.swapped && k >= 0.5) { s.swapped = true; meBody(s.sit, hx, y, hz, s.yaw); o = c.obj; }
        o.position.x = hx; o.position.z = hz;
        if (k >= 1) { s.done = true; c.y = s.hop[1]; y = c.y; }
      }
      c.x = o.position.x; c.z = o.position.z; c.yaw = o.rotation.y;
      o.position.y = y; o.arms[0].rotation.z = -armL; o.arms[1].rotation.z = armR;
      if (s.done) { c.plan.shift(); if (!c.plan.length) c.plan = null; meTag(); }
      else if ((c.tagT || 0) < t - 0.08) { c.tagT = t; meTag(); }
    }

    /* ---------- light ---------- */
    var hemi = add(new THREE.HemisphereLight(0xF4F7FF, 0x6E7B8A, 0.62));
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
      study: function (on) { if (studyKit) studyKit.visible = on; },
      meSit: meSit
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
          if (c.sit && (self.state.focusUntil > Date.now() || self.state.typing[c.id])) { armL = 1.1 + Math.sin(t * 14 + c.phase) * 0.12; armR = 1.1 + Math.cos(t * 13 + c.phase) * 0.12; }
          if (c.id === 'me' && studyKit && self.state.study) { armL = 0.95 + Math.sin(t * 13) * 0.12; armR = 0.95 + Math.sin(t * 13 + 1.7) * 0.12; bob = 0; }
        }
        if (c.id === 'me' && studyKit) {
          /* 카공: I walk over to the free side of the table and turn to my laptop, three-quarters toward us */
          var on = !!self.state.study, tx = on ? 2.42 : c.x, tz = on ? 1.08 : c.z, ty = on ? -1.15 : c.yaw;
          var k = Math.min(1, dt * 4); c.obj.position.x += (tx - c.obj.position.x) * k; c.obj.position.z += (tz - c.obj.position.z) * k;
          c.obj.rotation.y += (ty - c.obj.rotation.y) * k;
        }
        if (c.id === 'me' && c.plan) { meStep(c, dt, t); return; }
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
    var treatId = ['doyun', 'taeo', 'seoyeon'].filter(function (id) { return !!P[id]; })[0];
    var TINT = { barista: '#D9E3F2', doyun: '#D9DCE4', taeo: '#CDE8B0', seoyeon: '#CFE3F5', me: '#F6C7DA' };
    /* one bubble per person, right above the head. a new line replaces the old one, which floats up and fades.
       if two bubbles would touch, the newer one keeps its spot and the older one rises a little or folds to "···" */
    var LIFE = 9000, FADE = 900, GONE = 1150, W = 390, TOP = 34;
    var tags = st.tags, ids = ['doyun', 'taeo', 'seoyeon', 'me'].filter(function (id) { return !!P[id]; });
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
      dlg.aria = '관리인 아저씨: ' + full + (dlg.hasChoices ? '' : ' (누르면 다음)');
      if (dlg.hasChoices) dlg.choices = dlgS.choices.map(function (c) { return { label: c[0], pick: function () { self._dlgGo(c[1]); } }; });
    }
    var last = st.msgs[st.msgs.length - 1];
    var reacts = { doyun: ['오 왔어?', 'ㅋㅋㅋ 인정', '점심 같이 가자'], taeo: ['굿모닝!', 'ㅇㅈ', '커피 마실 사람~'], seoyeon: ['나도 방금 왔어', 'ㅋㅋㅋㅋ', '오늘 화이팅'] };
    function replyTo() {
      ['doyun', 'taeo', 'seoyeon'].filter(function (w) { return !!P[w] && Math.random() < 0.55; }).slice(0, 2).forEach(function (w, i) {
        self._timers.push(setTimeout(function () {
          if (self._dead) return;
          self._setTyping(w, true);
          self._timers.push(setTimeout(function () { if (self._dead) return; self._setTyping(w, false); self._say(w, reacts[w][Math.floor(Math.random() * reacts[w].length)]); }, 1100 + Math.random() * 900));
        }, 400 + i * 700));
      });
    }
    return {
      setCanvas: this.setCanvas, glFailed: st.glFailed, pinsReady: !!tags && !st.glFailed,
      focusOn: st.focusUntil > now,
      focusLabel: st.focusUntil > now ? '같이 집중 ' + (function (ms) { var sec = Math.ceil(ms / 1000); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); })(st.focusUntil - now) : '회사 안',
      focusBtn: st.focusUntil > now ? '집중 그만' : '같이 집중 25분', focusCls: st.focusUntil > now ? 'btn by' : 'btn bc',
      toggleFocus: function () {
        if (self.state.focusUntil > Date.now()) { self.setState({ focusUntil: 0 }); if (self._world && self._world.meSit) self._world.meSit(false); return; }
        var until = Date.now() + 25 * 60 * 1000; self.setState({ focusUntil: until }); if (self._world && self._world.meSit) self._world.meSit(true);
        self._timers.push(setTimeout(function () { if (!self._dead) self._say('seoyeon', '오 나도 집중 모드 ㄱㄱ'); }, 900));
        self._timers.push(setTimeout(function () { if (self._dead || self.state.focusUntil !== until) return; self.setState({ focusUntil: 0 }); if (self._world && self._world.meSit) self._world.meSit(false); self._say('doyun', '끝! 탕비실 커피 마시러 갈 사람~'); }, 25 * 60 * 1000));
      },
      headCount: Object.keys(P).length, pins: pins, draft: st.draft, dlg: dlg,
      npc: { x: npcTag.x, y: npcTag.y, label: st.dlg ? '관리인 · 대화 중' : '관리인 · 말 걸기' },
      npcOpen: function () { if (!self.state.dlg) { self._dSeed = Math.floor(Math.random() * 1000); self._dlgGo('start'); } },
      announce: last && last.who !== 'system' ? (P[last.who] ? P[last.who].name : '') + ': ' + last.text : '',
      toast: { show: !!(st.toast && st.toast.until > now), text: st.toast ? st.toast.text : '' },
      onInput: function (e) { self.setState({ draft: e.target.value }); },
      setInput: function (el) { if (el) self._inputEl = el; },
      setIris: function (el) { if (el) self._irisEl = el; },
      setVillageLink: function (el) { if (el) self._villageLink = el; },
      musicOn: !!st.music, musicOff: !st.music, musicOp: st.music ? 1 : 0.45, musicLabel: st.music ? '음악 끄기' : '음악 켜기', warmGlow: false,
      toggleMusic: function () {
        var on = !self.state.music;
        if (on) self._musicStart(); else self._musicStop();
        try { window.localStorage.setItem('office.music', on ? 'on' : 'off'); } catch (e) {}
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
