import { DCLogic } from '../../dc/runtime.jsx';

// Default values of this screen's design tweaks (from the canvas data-props)
export const defaults = {};
export default class FaceDrawLogic extends DCLogic {
  constructor(props) {
    super(props);
    var doodle = ['..k.....k.k.','.k.k...k.k.k','............','.kkk...kkk..','.k.k...k.k..','.kkk...kkk..','.....k......','....kkk.....','.....kk.....','............','.....k......','....k.k.....'];
    this.state = { attrTab: 'shirt', grid: doodle.join('').split(''), ink: 'k', tool: 'pen', mirror: false, skin: '#FFF8EC', hair: '#3B2A20', hist: [], name: '나', photoNote: '', shirt: '#E07B62', pattern: 'plain', shade: '#E2BFA0', crop: null, pal: {}, n: 12, photo: false };
    var me = props && props.me;
    if (!(me && me.rows)) { try { me = JSON.parse(window.localStorage.getItem('village.me.face.v1') || 'null'); } catch (e) { me = null; } }
    if (me && me.rows) { this.state.photo = !!me.photo; this.state.n = [12, 24, 32].indexOf(me.rows.length) >= 0 ? me.rows.length : 12; this.state.grid = me.rows.join('').split(''); this.state.skin = me.skin || this.state.skin; this.state.hair = me.hair || this.state.hair; this.state.shirt = me.shirt || this.state.shirt; this.state.pattern = me.pattern || 'plain'; this.state.name = me.name || '나'; if (me.ink && me.ink.s) this.state.shade = me.ink.s; if (me.ink) Object.keys(me.ink).forEach(function (k) { if (/^[1-9]$/.test(k)) this.state.pal[k] = me.ink[k]; }, this); }
    this._drawing = false;
  }

  _presets() {
    return {
      '낙서 얼굴': ['..k.....k.k.','.k.k...k.k.k','............','.kkk...kkk..','.k.k...k.k..','.kkk...kkk..','.....k......','....kkk.....','.....kk.....','............','.....k......','....k.k.....'],
      '웃는 얼굴': ['hhhhhhhhhhhh','hhh.hhhh.hhh','............','..kk....kk..','............','...k....k...','...k....k...','.pp......pp.','............','....k..k....','.....kk.....','............'],
      '안경': ['hhhhhhhhhhhh','hhhhhhhhhhhh','hh........hh','............','.kkkk..kkkk.','.k..kkkk..k.','.kk.k..kk.k.','.kkkk..kkkk.','............','............','....kkk.....','............'],
      '졸린 얼굴': ['hhhhhhhhhhhh','hhhhh..hhhhh','h..........h','............','..kkk..kkk..','............','.pp......pp.','............','.....rr.....','............','bb..........','b...........']
    };
  }

  _remember() {
    var h = this.state.hist.slice(-19); h.push(this.state.grid.slice());
    this.setState({ hist: h });
  }

  _cell(e) {
    var el = e.currentTarget;
    if (!el || !el.getBoundingClientRect) return -1;
    var r = el.getBoundingClientRect();
    var n = this.state.n, cx = Math.floor(((e.clientX - r.left) / r.width) * n), cy = Math.floor(((e.clientY - r.top) / r.height) * n);
    if (cx < 0 || cy < 0 || cx > n - 1 || cy > n - 1) return -1;
    return cy * n + cx;
  }

  _paint(i) {
    if (i < 0) return;
    var st = this.state, v = st.tool === 'erase' ? '.' : st.ink, g = st.grid.slice(), changed = false;
    var n = st.n, cx = i % n, cy = (i / n) | 0, cells = [[cx, cy]];
    if (st.tool === 'big') cells = [[cx, cy], [cx + 1, cy], [cx, cy + 1], [cx + 1, cy + 1]];
    if (st.mirror) cells = cells.concat(cells.map(function (c) { return [n - 1 - c[0], c[1]]; }));
    cells.forEach(function (c) {
      if (c[0] < 0 || c[0] > n - 1 || c[1] < 0 || c[1] > n - 1) return;
      var k = c[1] * n + c[0]; if (g[k] !== v) { g[k] = v; changed = true; }
    });
    if (changed) this.setState({ grid: g });
  }

  _fill(i) {
    if (i < 0) return;
    var st = this.state, g = st.grid.slice(), from = g[i], to = st.ink;
    if (from === to) return;
    var n = st.n, seeds = [i]; if (st.mirror) seeds.push(((i / n) | 0) * n + (n - 1 - (i % n)));
    seeds.forEach(function (s) {
      if (g[s] !== from) return;
      var stack = [s];
      while (stack.length) {
        var k = stack.pop(); if (g[k] !== from) continue;
        g[k] = to; var x = k % n, y = (k / n) | 0;
        if (x > 0) stack.push(k - 1); if (x < n - 1) stack.push(k + 1); if (y > 0) stack.push(k - n); if (y < n - 1) stack.push(k + n);
      }
    });
    this.setState({ grid: g });
  }

  /* selfie → doodle. the photo stays on this device; only the pixel result is kept */
  _photo(file) {
    var self = this;
    if (!file || !/^image\//.test(file.type || 'image/')) return;
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight, size = Math.min(w, h) * 0.7;
      self._img = img;
      self.setState({ photoNote: '', crop: { url: url, w: w, h: h, cx: w / 2, cy: h * 0.38, size: size } });
      self._cropPreview();
    };
    img.onerror = function () { URL.revokeObjectURL(url); self.setState({ photoNote: '이 사진은 읽지 못했어요' }); };
    img.src = url;
  }
  _closeCrop() { var c = this.state.crop; if (c) { try { URL.revokeObjectURL(c.url); } catch (e) {} } this._img = null; this.setState({ crop: null, cropOut: null }); }
  _cropPreview() {
    var self = this; clearTimeout(this._cropT);
    this._cropT = setTimeout(function () { var c = self.state.crop; if (!c || !self._img) return; var out = self._convert(self._img, c); if (out) self.setState({ cropOut: out }); }, 40);
  }
  /* photo -> pixels, the plain way: every one of the 24x24 cells takes the average colour of its patch of the photo,
     then the 144 colours are reduced to 9 (k-means) so it still reads as pixel art and stays editable.
     the biggest colour in the middle of the face becomes the skin, a dark colour along the top becomes the hair,
     the rest are kept as they are ("photo colours"). nothing is guessed: no eye or mouth detection */
  _convert(img, c) {
    try {
      var N = 32, P = 5, S = N * P, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      var ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
      ctx.drawImage(img, c.cx - c.size / 2, c.cy - c.size / 2, c.size, c.size, 0, 0, S, S);
      var d = ctx.getImageData(0, 0, S, S).data, cells = [];
      for (var cy = 0; cy < N; cy++) for (var cx = 0; cx < N; cx++) {
        var r = 0, g = 0, b = 0, px = [];
        for (var yy = 0; yy < P; yy++) for (var xx = 0; xx < P; xx++) { var k = ((cy * P + yy) * S + cx * P + xx) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2]; px.push([d[k], d[k + 1], d[k + 2]]); }
        var q = [r / (P * P), g / (P * P), b / (P * P)];
        /* keep thin dark details (eyes, brows, lips): if part of the patch is clearly darker, the cell leans to that part,
           the way pixel artists shrink by hand. bright-only patches stay a plain average */
        var ml = q[0] * 0.3 + q[1] * 0.59 + q[2] * 0.11, dk = px.filter(function (v) { return v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11 < ml - 28; });
        if (dk.length >= P * P * 0.08 && dk.length <= P * P * 0.7) {
          var dm = [0, 0, 0]; dk.forEach(function (v) { dm[0] += v[0]; dm[1] += v[1]; dm[2] += v[2]; }); dm = dm.map(function (v) { return v / dk.length; });
          if (ml - (dm[0] * 0.3 + dm[1] * 0.59 + dm[2] * 0.11) > 45) q = q.map(function (v, i) { return v * 0.35 + dm[i] * 0.65; });
        }
        var m = (q[0] + q[1] + q[2]) / 3;
        /* a touch more contrast and colour, the way pixel art is usually pushed */
        cells.push(q.map(function (v) { return Math.max(0, Math.min(255, m + (v - m) * 1.15 + (m - 128) * 0.08 + (v - m) * 0)); }));
      }
      function lum(q) { return q[0] * 0.3 + q[1] * 0.59 + q[2] * 0.11; }
      function dist(a, b) { var dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; }
      function toHex(q) { return '#' + q.map(function (v) { var t = Math.max(0, Math.min(255, Math.round(v))).toString(16); return t.length < 2 ? '0' + t : t; }).join(''); }
      /* k-means with K=7, started from luminance quantiles so the result is the same every time */
      /* start from the most different colours (farthest-point), so a small dark eye colour gets its own slot */
      var K = 9, sorted = cells.slice().sort(function (a, b) { return lum(a) - lum(b); }), cent = [sorted[sorted.length >> 1].slice()];
      while (cent.length < K) { var far = null, fd = -1; cells.forEach(function (q) { var md = 1e12; cent.forEach(function (c0) { md = Math.min(md, dist(q, c0)); }); if (md > fd) { fd = md; far = q; } }); if (fd < 60) break; cent.push(far.slice()); }
      var lab = new Array(cells.length);
      for (var it = 0; it < 10; it++) {
        cells.forEach(function (q, j) { var best = 0, bd = 1e12; cent.forEach(function (c0, ci) { var dd = dist(q, c0); if (dd < bd) { bd = dd; best = ci; } }); lab[j] = best; });
        var sum = cent.map(function () { return [0, 0, 0, 0]; });
        cells.forEach(function (q, j) { var s0 = sum[lab[j]]; s0[0] += q[0]; s0[1] += q[1]; s0[2] += q[2]; s0[3]++; });
        cent = cent.map(function (c0, ci) { var s0 = sum[ci]; return s0[3] ? [s0[0] / s0[3], s0[1] / s0[3], s0[2] / s0[3]] : c0; });
      }
      /* fold near-identical colours together */
      for (var a1 = 0; a1 < cent.length; a1++) for (var b1 = cent.length - 1; b1 > a1; b1--) if (dist(cent[a1], cent[b1]) < 140) { lab = lab.map(function (l) { return l === b1 ? a1 : (l > b1 ? l - 1 : l); }); cent.splice(b1, 1); }
      var count = cent.map(function () { return 0; }), mid = cent.map(function () { return 0; }), top = cent.map(function () { return 0; });
      /* the square holds the whole head: the face sits in the middle-low part, the hair along the top */
      lab.forEach(function (l, j) { var x = j % N, y = (j / N) | 0; count[l]++; if (y >= N * 0.42 && y <= N * 0.82 && x >= N * 0.3 && x <= N * 0.7) mid[l]++; if (y >= N * 0.06 && y <= N * 0.3 && x >= N * 0.25 && x <= N * 0.75) top[l]++; });
      var skinI = 0; mid.forEach(function (v, ci) { if (v > mid[skinI]) skinI = ci; });
      var inDisc = function (j, r) { var dx = (j % N) + 0.5 - N / 2, dy = ((j / N) | 0) + 0.5 - N / 2; return dx * dx + dy * dy < r * r * N * N; };
      /* the middle of a face is usually skin, but a wide-open mouth, a mask or a furry friend can fill it with something else.
         if the middle colour does not look like skin at all, take the most common skin-like colour on the head instead */
      var skinLike = function (q) { var Y = 0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2], cb = 128 - 0.1687 * q[0] - 0.3313 * q[1] + 0.5 * q[2], cr = 128 + 0.5 * q[0] - 0.4187 * q[1] - 0.0813 * q[2]; return Y > 50 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173; };
      if (!skinLike(cent[skinI])) { var onHead = cent.map(function () { return 0; }); lab.forEach(function (l, j) { if (inDisc(j, 0.47)) onHead[l]++; });
        var alt = -1; cent.forEach(function (c0, ci) { if (skinLike(c0) && onHead[ci] >= N * N * 0.05 && (alt < 0 || onHead[ci] > onHead[alt])) alt = ci; }); if (alt >= 0) skinI = alt; }
      var skinC = cent[skinI], hairI = -1, hairArea = N * N * 0.24 * 0.5;
      cent.forEach(function (c0, ci) { if (ci !== skinI && top[ci] >= hairArea * 0.2 && dist(c0, skinC) > 900 && (hairI < 0 || top[ci] > top[hairI])) hairI = ci; });
      /* the photo's background (colours in the corners joined to the edge, never the skin or hair colour) is cut away.
         those cells stay empty ("x"): on the head they turn into hair above the eyes and skin below */
      /* a colour only counts as backdrop when it lives mostly outside the head circle.
         a face that fills the whole square (fur, a close-up) shows its own colour at the edges too, and must not be cut */
      var inner = cent.map(function () { return 0; }); lab.forEach(function (l, j) { if (inDisc(j, 0.4)) inner[l]++; });
      var bgSet = {}; [0, N - 1, N * (N - 1), N * N - 1, N >> 1, N * (N >> 1), N * (N >> 1) + N - 1].forEach(function (j) { var l = lab[j]; if (l !== skinI && l !== hairI && inner[l] < count[l] * 0.25) bgSet[l] = true; });
      var lab0 = lab.slice();
      var seen = {}, st0 = []; for (var e0 = 0; e0 < N * N; e0++) { var ex = e0 % N, ey = (e0 / N) | 0; if ((ex === 0 || ex === N - 1 || ey === 0 || ey === N - 1) && bgSet[lab[e0]]) { st0.push(e0); seen[e0] = true; } }
      while (st0.length) { var j0 = st0.pop(), jx = j0 % N, jy = (j0 / N) | 0; lab[j0] = -1; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = jx + o[0], ny = jy + o[1]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) return; var j1 = ny * N + nx; if (!seen[j1] && bgSet[lab[j1]]) { seen[j1] = true; st0.push(j1); } }); }
      /* if the cut still bites into the middle of the head, it was not a backdrop after all: undo it */
      var bit = 0, disc = 0; lab.forEach(function (l, j) { if (inDisc(j, 0.36)) { disc++; if (l < 0) bit++; } });
      if (bit > disc * 0.08) lab = lab0;
      /* the soft rim where hair meets the backdrop mixes both colours (grey streaks on a dark head): peel it off, twice.
         only next to cut-away backdrop: the photo's own outer edge is not a rim and stays */
      for (var pass = 0; pass < 2; pass++) { var peel = []; lab.forEach(function (l, j) { if (l < 0 || l === skinI || l === hairI) return; var jx = j % N, jy = (j / N) | 0;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (o) { var nx = jx + o[0], ny = jy + o[1]; return nx >= 0 && ny >= 0 && nx < N && ny < N && lab[ny * N + nx] < 0; })) peel.push(j); });
        peel.forEach(function (j) { lab[j] = -1; }); }
      count = cent.map(function () { return 0; }); lab.forEach(function (l) { if (l >= 0) count[l]++; });
      var order = cent.map(function (c0, ci) { return ci; }).filter(function (ci) { return ci !== skinI && ci !== hairI && count[ci] > 0; }).sort(function (a, b) { return count[b] - count[a]; });
      var ch = { '-1': 'x' }, pal = {}; ch[skinI] = '.'; if (hairI >= 0) ch[hairI] = 'h';
      order.forEach(function (ci, n) { var key = String(n + 1); ch[ci] = key; pal[key] = toHex(cent[ci]); });
      var grid = lab.map(function (l) { return ch[l]; });
      return { n: N, photo: true, grid: grid, skin: toHex(skinC), shade: toHex(skinC.map(function (v) { return v * 0.84; })), hair: hairI >= 0 ? toHex(cent[hairI]) : toHex(skinC), pal: pal };
    } catch (e) { return null; }
  }

  renderVals() {
    var self = this, st = this.state;
    var INK = Object.assign({ k: '#2A1E16', p: '#F49AA8', r: '#D9534F', b: '#7EC8F0', w: '#FFFFFF', h: st.hair, s: st.shade }, st.pal || {});
    function shadow(grid, s, n, cut) {
      var out = []; n = n || 12;
      for (var i = 0; i < n * n; i++) {
        var ch = grid[i]; if (ch === '.' || ch == null) continue;
        var cc = ch === 'x' ? (cut ? '#EFE6CC' : ((i / n) | 0) < n * 0.62 ? st.hair : st.skin) : (INK[ch] || st.skin);
        out.push((((i % n) + 1) * s) + 'px ' + ((((i / n) | 0) + 1) * s) + 'px 0 0 ' + cc);
      }
      return out.length ? out.join(', ') : 'none';
    }
    /* pixel icons, 10×10 */
    var ICON = {
      pen: 'M7 0h2v1h1v2H9v1H8v1H7v1H6v1H5v1H4v1H2v1H0V8h1V6h1V5h1V4h1V3h1V2h1V1h1z',
      big: 'M3 1h4v1h1v1h1v4H8v1H7v1H3V8H2V7H1V3h1V2h1z',
      fill: 'M4 0h2v1h1v1h1v1h1v1h1v2H9v1H8v1H7v1H6v1H4V9H3V8H2V7H1V6H0V4h1V3h1V2h1V1h1zM9 7h1v3H8V8h1z',
      erase: 'M5 1h2v1h1v1h1v1h1v2H9v1H8v1H7v1H6v1H2V8H1V7H0V5h1V4h1V3h1V2h2zM2 6v1h1v1h2V7h1V6H5V5H4V4H3v2z',
      mirror: 'M4 0h2v10H4zM0 5h1V4h1V3h1v5H2V7H1V6H0zM7 3h1v1h1v1h1v1H9v1H8v1H7z',
      undo: 'M3 1h1v2h4v1h1v1h1v3H9v1H8v1H4V8h4V5H4v2H3V6H2V5H1V4h1V3h1z'
    };
    var NAMES = { pen: '펜', big: '굵은 펜', fill: '채우기', erase: '지우개' };
    var toolDefs = [
      { k: 'pen', label: '펜 (1칸)' }, { k: 'big', label: '굵은 펜 (2칸)' }, { k: 'fill', label: '채우기' },
      { k: 'erase', label: '지우개' }, { k: 'mirror', label: '좌우 대칭' }, { k: 'undo', label: '되돌리기' }
    ];
    var tools = toolDefs.map(function (d) {
      var on = d.k === 'mirror' ? st.mirror : (d.k === 'undo' ? false : st.tool === d.k);
      return { label: d.label, icon: ICON[d.k], on: on, pick: function () {
        if (d.k === 'mirror') self.setState({ mirror: !self.state.mirror });
        else if (d.k === 'undo') { var h = self.state.hist.slice(); if (!h.length) return; var g = h.pop(); self.setState({ grid: g, hist: h, n: g.length === 576 ? 24 : 12 }); }
        else self.setState({ tool: d.k });
      } };
    });
    var inkDefs = [
      { k: 'k', label: '먹색', bg: '#2A1E16' }, { k: 'h', label: '머리색', bg: st.hair }, { k: 'p', label: '볼터치 분홍', bg: '#F49AA8' },
      { k: 'r', label: '빨강', bg: '#D9534F' }, { k: 'b', label: '하늘색', bg: '#7EC8F0' }, { k: 'w', label: '흰색', bg: '#FFFFFF' }
    ].concat(Object.keys(st.pal || {}).sort().slice(0, 4).map(function (k, n) { return { k: k, label: '사진 색 ' + (n + 1), bg: st.pal[k] }; }));
    var inks = inkDefs.map(function (d) {
      var on = st.ink === d.k;
      return { label: d.label, bg: d.bg, on: on, ring: on ? '0 0 0 3px #FFFFFF, 0 0 0 6px #FFC93B, 0 4px 0 6px rgba(150,100,30,0.35)' : '0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(90,70,50,0.25)', pick: function () { self.setState({ ink: d.k, tool: self.state.tool === 'erase' ? 'pen' : self.state.tool }); } };
    });
    var inkName = (inkDefs.filter(function (d) { return d.k === st.ink; })[0] || {}).label || '';
    var statusLabel = (st.tool === 'erase' ? '지우개' : NAMES[st.tool] + ' · ' + inkName) + (st.mirror ? ' · 대칭' : '');
    var skins = ['#FFF8EC', '#F6D7B8', '#E9C29C', '#C99B6D'].map(function (c, i) {
      return { label: '피부 ' + (i + 1), bg: c, on: st.skin === c, pick: function () { self.setState({ skin: c }); } };
    });
    var hairs = ['#3B2A20', '#1E1A1A', '#C9772E', '#7A4FA8'].map(function (c, i) {
      return { label: '머리 ' + (i + 1), bg: c, on: st.hair === c, pick: function () { self.setState({ hair: c }); } };
    });
    var SHIRTS = [['#E07B62', '코랄'], ['#F2C14E', '노랑'], ['#7CC25C', '연두'], ['#4A6FA5', '파랑'], ['#9FC4E8', '하늘'], ['#C9A7E8', '보라'], ['#F49AA8', '분홍'], ['#FFFFFF', '흰색'], ['#3F3A40', '검정']];
    var PATS = [['plain', '무지'], ['stripe', '줄무늬'], ['dots', '물방울'], ['check', '체크']];
    function cloth(c, pat) {
      if (pat === 'stripe') return 'repeating-linear-gradient(180deg, ' + c + ' 0 5px, #FFFFFF 5px 8px)';
      if (pat === 'dots') return 'radial-gradient(circle, #FFFFFF 22%, transparent 26%) 0 0 / 9px 9px, ' + c;
      if (pat === 'check') return 'repeating-conic-gradient(rgba(255,255,255,0.45) 0 25%, transparent 0 50%) 0 0 / 10px 10px, ' + c;
      return c;
    }
    var P = this._presets();
    var presets = Object.keys(P).map(function (name) {
      var grid = P[name].join('').split('');
      return { label: name, aria: '밑그림 ' + name + ' 불러오기', skin: st.skin, shadow: shadow(grid, 3),
        pick: function () { self._remember(); self.setState({ grid: grid.slice(), n: 12, photo: false }); } };
    });
    return {
      skin: st.skin, mirror: st.mirror, statusLabel: statusLabel,
      bigShadow: shadow(st.grid, 240 / st.n, st.n, true), midShadow: shadow(st.grid, 60 / st.n, st.n), cellPx: 240 / st.n, midPx: 60 / st.n, midSz: 60 / st.n + (st.n >= 24 ? 0.6 : 0),
      gridAria: '얼굴 그림판, ' + st.n + '칸 × ' + st.n + '칸', resLabel: st.n === 32 ? '32칸 · 사진' : st.n === 24 ? '24칸 · 섬세하게' : '12칸 · 큼직하게', resAria: st.n === 32 ? '24칸으로 바꾸기' : st.n === 24 ? '12칸으로 바꾸기' : '24칸으로 더 섬세하게 바꾸기',
      /* 12 -> 24 doubles every cell; 24 -> 12 keeps the most common colour of each 2x2 block */
      toggleRes: function () {
        var g = self.state.grid, n = self.state.n, out = [];
        self._remember();
        if (n === 32) { for (var y3 = 0; y3 < 24; y3++) for (var x3 = 0; x3 < 24; x3++) out.push(g[(((y3 + 0.5) * 32 / 24) | 0) * 32 + (((x3 + 0.5) * 32 / 24) | 0)]); self.setState({ grid: out, n: 24 }); }
        else if (n === 12) { for (var y = 0; y < 24; y++) for (var x = 0; x < 24; x++) out.push(g[((y / 2) | 0) * 12 + ((x / 2) | 0)]); self.setState({ grid: out, n: 24 }); }
        else { for (var y2 = 0; y2 < 12; y2++) for (var x2 = 0; x2 < 12; x2++) { var c = {}, best = '.', bc = 0; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (o) { var v = g[(y2 * 2 + o[1]) * 24 + x2 * 2 + o[0]]; c[v] = (c[v] || 0) + 1; if (c[v] > bc || (c[v] === bc && v !== '.')) { bc = c[v]; best = v; } }); out.push(best); } self.setState({ grid: out, n: 12 }); }
      },
      shirtCss: cloth(st.shirt, st.pattern),
      bodyAria: '옷 미리보기: ' + (SHIRTS.filter(function (c) { return c[0] === st.shirt; })[0] || ['', ''])[1] + ' ' + (PATS.filter(function (q) { return q[0] === st.pattern; })[0] || ['', ''])[1],
      shirts: SHIRTS.map(function (c) { return { label: c[1] + ' 옷', bg: c[0], on: st.shirt === c[0], pick: function () { self.setState({ shirt: c[0] }); } }; }),
      patterns: PATS.map(function (q) { return { label: q[1], bg: cloth(st.shirt, q[0]), on: st.pattern === q[0], pick: function () { self.setState({ pattern: q[0] }); } }; }),
      onPhoto: function (e) { var f = e.target.files && e.target.files[0]; self._photo(f); try { e.target.value = ''; } catch (x) {} },
      crop: (function () {
        var c = st.crop; if (!c) return { open: false };
        var sc = 200 / c.size, out = st.cropOut;
        var pINK = Object.assign({ k: '#2A1E16', p: '#F49AA8', r: '#D9534F', b: '#7EC8F0', w: '#FFFFFF', h: out ? out.hair : st.hair, s: out ? out.shade : st.shade }, out ? out.pal : {});
        var prev = 'none';
        if (out) { var on = out.n || 12, ps = 96 / on, arr = []; for (var i = 0; i < on * on; i++) { var ch = out.grid[i]; if (ch === '.') continue; var pc = ch === 'x' ? '#EFE6CC' : pINK[ch]; arr.push((((i % on) + 1) * ps) + 'px ' + ((((i / on) | 0) + 1) * ps) + 'px 0 0 ' + pc); } prev = arr.length ? arr.join(', ') : 'none'; }
        function clampC(cc) { var hs = cc.size / 2; cc.cx = Math.max(hs * 0.3, Math.min(cc.w - hs * 0.3, cc.cx)); cc.cy = Math.max(hs * 0.3, Math.min(cc.h - hs * 0.3, cc.cy)); return cc; }
        return {
          open: true, url: c.url, w: Math.round(c.w * sc), h: Math.round(c.h * sc),
          left: Math.round(100 - c.cx * sc), top: Math.round(100 - c.cy * sc),
          skin: out ? out.skin : st.skin, preview: prev, ps: out ? 96 / (out.n || 12) : 8,
          zoom: Math.round((1 - (c.size / Math.min(c.w, c.h) - 0.25) / 0.75) * 75 + 25),
          onZoom: function (e) { var z = +e.target.value, cc = Object.assign({}, self.state.crop); cc.size = Math.min(cc.w, cc.h) * (0.25 + (1 - (z - 25) / 75) * 0.75); self.setState({ crop: clampC(cc) }); self._cropPreview(); },
          down: function (e) { self._drag = { x: e.clientX, y: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} },
          move: function (e) { if (!self._drag) return; var cc = Object.assign({}, self.state.crop), k = cc.size / 200; cc.cx -= (e.clientX - self._drag.x) * k; cc.cy -= (e.clientY - self._drag.y) * k; self._drag = { x: e.clientX, y: e.clientY }; self.setState({ crop: clampC(cc) }); self._cropPreview(); },
          up: function () { self._drag = null; },
          cancel: function () { self._closeCrop(); },
          apply: function () { var o = self.state.cropOut; if (!o) return; self._remember(); self.setState({ grid: o.grid.slice(), n: o.n || 12, photo: !!o.photo, skin: o.skin, shade: o.shade, hair: o.hair, pal: o.pal || {} }); self._closeCrop(); }
        };
      })(),
      goBack: function (e) { if (self.props.onBack) { if (e && e.preventDefault) e.preventDefault(); self.props.onBack(); } },
      done: function (e) {
        var g = self.state.grid, n = self.state.n, rows = []; for (var r = 0; r < n; r++) rows.push(g.slice(r * n, r * n + n).join(''));
        var ink = { s: self.state.shade }, pal = self.state.pal || {}; Object.keys(pal).forEach(function (k) { if (g.indexOf(k) >= 0) ink[k] = pal[k]; });
        var face = { photo: !!self.state.photo, rows: rows, skin: self.state.skin, hair: self.state.hair, shirt: self.state.shirt, pattern: self.state.pattern, name: (self.state.name || '').trim() || '나', ink: ink };
        try { window.localStorage.setItem('village.me.face.v1', JSON.stringify(face)); } catch (x) {}
        if (!self.props.onDone) return; if (e && e.preventDefault) e.preventDefault();
        self.props.onDone(face);
      },
      photoNote: { show: !!st.photoNote, text: st.photoNote || '' },
      name: st.name, nameShown: (st.name || '').trim() || '이름 없음',
      onName: function (e) { self.setState({ name: e.target.value }); },
      tools: tools, inks: inks, presets: presets,
      attrTabs: [['skin', '피부'], ['shirt', '옷'], ['pattern', '무늬'], ['hair', '머리']].map(function (t) { var on = st.attrTab === t[0]; return { label: t[1], on: on, bg: on ? '#FFD36B' : '#FFFDF5', fg: on ? '#5A3E10' : '#6B5140', ring: on ? '#D69E2E' : '#E8D7B0', pick: function () { self.setState({ attrTab: t[0] }); } }; }),
      attrLabel: { skin: '피부색', shirt: '옷 색', pattern: '옷 무늬', hair: '머리색' }[st.attrTab],
      swatches: (function (arr) { return arr.map(function (o) { o.ring = o.on ? '0 0 0 2px #FFFFFF, 0 0 0 5px #FFC93B' : '0 0 0 2px #FFFFFF, 0 2px 0 2px rgba(90,70,50,0.25)'; return o; }); })(st.attrTab === 'skin' ? skins : st.attrTab === 'hair' ? hairs : st.attrTab === 'pattern'
        ? PATS.map(function (q) { return { label: q[1], bg: cloth(st.shirt, q[0]), on: st.pattern === q[0], pick: function () { self.setState({ pattern: q[0] }); } }; })
        : SHIRTS.map(function (c) { return { label: c[1] + ' 옷', bg: c[0], on: st.shirt === c[0], pick: function () { self.setState({ shirt: c[0] }); } }; })),
      clearAll: function () { self._remember(); var g = [], n = self.state.n; for (var i = 0; i < n * n; i++) g.push('.'); self.setState({ grid: g, photo: false }); },
      down: function (e) {
        var i = self._cell(e); if (i < 0) return;
        self._remember();
        if (self.state.tool === 'fill') { self._fill(i); return; }
        self._drawing = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {}
        self._paint(i);
      },
      move: function (e) { if (self._drawing) self._paint(self._cell(e)); },
      up: function () { self._drawing = false; }
    };
  }
}
