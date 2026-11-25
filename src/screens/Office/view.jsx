// Office screen template, converted from the canvas .dc.html by tools/dc2jsx.py.
// `v` holds this screen's props merged with the values returned by renderVals() in logic.js.
import { Fragment } from 'react';
import { asList } from '../../dc/runtime.jsx';

export default function renderOffice(v) {
  return (
    <>
      <div style={{ position: "relative", width: "390px", height: "844px", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Galmuri11', 'Apple SD Gothic Neo', monospace", fontSize: "12px", background: "#2B3F5C", color: "#4A3426" }}>
        <header style={{ height: "64px", flex: "none", boxSizing: "border-box", padding: "10px 14px", background: "#3F5F8A", borderBottom: "3px solid #2B3F5C", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a href={"Village3D.dc.html"} onClick={v.goVillage} className={"btn bc"} style={{ height: "44px", padding: "0 6px" }}>
              {"← 마을로"}
            </a>
            <button type={"button"} onClick={v.toggleMusic} aria-pressed={v.musicOn} aria-label={v.musicLabel} title={v.musicLabel} className={"btn bc"} style={{ width: "44px", height: "44px", position: "relative" }}>
              <svg aria-hidden={"true"} width={"18"} height={"18"} viewBox={"0 0 9 9"} shapeRendering={"crispEdges"} style={{ opacity: v.musicOp }}>
                <path d={"M3 1h5v1H3zM3 2h1v4H3zM7 2h1v4H7zM1 6h3v2H1zM5 6h3v2H5z"} fill={"#5A4632"} />
              </svg>
              {v.musicOff ? (
                <>
                <svg aria-hidden={"true"} width={"22"} height={"22"} viewBox={"0 0 11 11"} shapeRendering={"crispEdges"} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                  <path d={"M1 1h1v1H1zM2 2h1v1H2zM3 3h1v1H3zM4 4h1v1H4zM5 5h1v1H5zM6 6h1v1H6zM7 7h1v1H7zM8 8h1v1H8zM9 9h1v1H9z"} fill={"#C0533F"} />
                </svg>
                </>
              ) : null}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <h1 style={{ margin: "0", fontFamily: "'Galmuri14', monospace", fontSize: "15px", fontWeight: "400", lineHeight: "16px", letterSpacing: "0.5px", color: "#FFF3DC" }}>
              {"마을 회사"}
            </h1>
            <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: "#D6E2F2" }}>
              {v.focusLabel}{" · 나 포함 "}{v.headCount}{"명"}
            </span>
          </div>
        </header>
        <div style={{ position: "relative", width: "390px", height: "662px", flex: "none", overflow: "hidden", background: "#3A4250" }}>
          <canvas ref={v.setCanvas} data-office={"1"} width={"195"} height={"331"} role={"img"} aria-label={"파티션으로 나뉜 사무실 자리마다 모니터가 켜져 있고, 동료들이 앉아 일하고 있어요"} style={{ display: "block", width: "390px", height: "662px", imageRendering: "pixelated" }} />
          {v.warmGlow ? (
            <>
            <div aria-hidden={"true"} style={{ position: "absolute", inset: "0", pointerEvents: "none", background: "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(255, 200, 130, 0) 55%, rgba(40, 18, 6, 0.42) 100%)" }} />
            <div aria-hidden={"true"} className={"warm"} style={{ position: "absolute", inset: "0", pointerEvents: "none", mixBlendMode: "soft-light", background: "radial-gradient(circle at 22% 30%, rgba(255, 196, 110, 0.38), transparent 34%), radial-gradient(circle at 50% 28%, rgba(255, 196, 110, 0.34), transparent 32%), radial-gradient(circle at 78% 30%, rgba(255, 196, 110, 0.38), transparent 34%)" }} />
            </>
          ) : null}
          <div aria-live={"polite"} style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
            {v.announce}
          </div>
          {v.toast?.show ? (
            <>
            <div className={"bub"} style={{ position: "absolute", left: "50%", top: "44px", transform: "translateX(-50%)", zIndex: "9", whiteSpace: "nowrap", fontSize: "12px", lineHeight: "14px" }}>
              <span className={"bubtxt"}>
                {v.toast?.text}
              </span>
            </div>
            </>
          ) : null}
          {v.glFailed ? (
            <>
            <div className={"bub"} style={{ position: "absolute", left: "40px", right: "40px", top: "280px", fontSize: "12px", lineHeight: "18px", textAlign: "center" }}>
              <span className={"bubtxt"}>
                {"이 화면에서는 3D 사무실을 불러오지 못했어요."}
              </span>
            </div>
            </>
          ) : null}
          {v.pinsReady ? (
            <>
            {asList(v.pins).map((p, i1) => (
              <Fragment key={i1}>
                {p?.active ? (
                  <>
                  {p?.hasGhost ? (
                    <>
                    <div aria-hidden={"true"} className={"bub rise"} style={{ position: "absolute", left: `${p?.gl ?? ''}px`, top: `${p?.gb ?? ''}px`, width: `${p?.gw ?? ''}px`, zIndex: "5", fontSize: "12px", lineHeight: "15px", pointerEvents: "none" }}>
                      <span className={"bubtxt"} style={{ overflowWrap: "anywhere" }}>
                        {p?.ghost}
                      </span>
                    </div>
                    </>
                  ) : null}
                  <div className={"bin"} style={{ position: "absolute", left: `${p?.l ?? ''}px`, top: `${p?.b ?? ''}px`, width: `${p?.w ?? ''}px`, transform: "translateY(-100%)", transformOrigin: p?.org, zIndex: p?.z, opacity: p?.op, transition: p?.tr, animation: p?.anim, pointerEvents: "none" }}>
                    {p?.hasTail ? (
                      <>
                      <svg aria-hidden={"true"} width={"12"} height={"10"} viewBox={"0 0 12 10"} shapeRendering={"crispEdges"} style={{ position: "absolute", left: `${p?.tl ?? ''}px`, top: "calc(100% - 2px)", pointerEvents: "none", overflow: "visible", filter: "drop-shadow(0 2px 0 rgba(90,100,130,0.22))" }}>
                        <polygon points={p?.tail} fill={"#FFFFFF"} />
                      </svg>
                      </>
                    ) : null}
                    <span className={"pill"} style={{ position: "absolute", left: "8px", top: "-19px", zIndex: "2", background: p?.tint }}>
                      {p?.name}
                    </span>
                    {p?.words ? (
                      <>
                      <div className={"bub"} style={{ width: "100%", fontSize: "12px", lineHeight: "15px" }}>
                        <span className={"bubtxt"} style={{ overflowWrap: "anywhere" }}>
                          {p?.text}
                        </span>
                      </div>
                      </>
                    ) : null}
                    {p?.dots ? (
                      <>
                      <div className={"bub"} style={{ width: "100%", height: "35px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className={"d1"} />
                        <span className={"d2"} />
                        <span className={"d3"} />
                      </div>
                      </>
                    ) : null}
                  </div>
                  </>
                ) : null}
                {p?.quiet ? (
                  <>
                  <span className={"tag"} style={{ position: "absolute", left: `${p?.x ?? ''}px`, top: `${p?.y ?? ''}px`, transform: "translate(-50%, -100%)", marginTop: "-4px", zIndex: "2" }}>
                    {p?.name}
                  </span>
                  </>
                ) : null}
              </Fragment>
            ))}
            <button type={"button"} className={"hit"} onClick={v.npcOpen} aria-label={"관리인 아저씨에게 말 걸기"} style={{ position: "absolute", left: `${v.npc?.x ?? ''}px`, top: `${v.npc?.y ?? ''}px`, transform: "translate(-50%, -100%)", marginTop: "-4px", zIndex: "3", padding: "0", border: "0", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
              <span className={"pill"} style={{ background: "#D9E3F2" }}>
                {v.npc?.label}
              </span>
            </button>
            </>
          ) : null}
        </div>
        <section style={{ position: "relative", zIndex: "5", flex: "1", minHeight: "0", boxSizing: "border-box", padding: "8px 12px 12px", background: "#FFFFFF", display: "flex", flexDirection: "column", gap: "8px" }}>
          <svg aria-hidden={"true"} width={"390"} height={"24"} viewBox={"0 0 195 12"} shapeRendering={"crispEdges"} style={{ position: "absolute", left: "0", top: "-14px", overflow: "visible", pointerEvents: "none" }}>
            <path d={"M0 12L0.0 7.0L0.8 6.6L1.7 6.1L2.5 5.7L3.4 5.3L4.2 4.9L5.1 4.5L5.9 4.1L6.8 3.8L7.6 3.6L8.5 3.3L9.3 3.1L10.1 3.0L11.0 2.9L11.8 2.9L12.7 2.9L13.5 2.9L14.4 3.0L15.2 3.1L16.1 3.3L16.9 3.6L17.8 3.8L18.6 4.1L19.4 4.5L20.3 4.9L21.1 5.3L22.0 5.7L22.8 6.1L23.7 6.6L24.5 7.0L25.4 6.5L26.2 6.1L27.1 5.7L27.9 5.2L28.8 4.8L29.6 4.4L30.5 4.1L31.3 3.8L32.2 3.5L33.1 3.2L33.9 3.0L34.8 2.9L35.6 2.7L36.5 2.7L37.3 2.6L38.2 2.7L39.0 2.7L39.9 2.9L40.7 3.0L41.6 3.2L42.4 3.5L43.3 3.8L44.1 4.1L45.0 4.4L45.9 4.8L46.7 5.2L47.6 5.7L48.4 6.1L49.3 6.5L50.1 7.0L51.0 6.7L51.8 6.4L52.6 6.1L53.5 5.8L54.3 5.5L55.1 5.2L56.0 4.9L56.8 4.7L57.6 4.5L58.5 4.3L59.3 4.1L60.1 3.9L61.0 3.8L61.8 3.7L62.7 3.6L63.5 3.5L64.3 3.5L65.2 3.5L66.0 3.5L66.8 3.6L67.7 3.7L68.5 3.8L69.3 3.9L70.2 4.1L71.0 4.3L71.8 4.5L72.7 4.7L73.5 4.9L74.4 5.2L75.2 5.5L76.0 5.8L76.9 6.1L77.7 6.4L78.5 6.7L79.4 7.0L80.2 6.6L81.1 6.2L81.9 5.8L82.8 5.4L83.6 5.1L84.5 4.7L85.3 4.4L86.2 4.1L87.0 3.9L87.9 3.7L88.7 3.5L89.6 3.4L90.4 3.3L91.3 3.2L92.1 3.2L93.0 3.3L93.8 3.4L94.7 3.5L95.5 3.7L96.4 3.9L97.2 4.1L98.1 4.4L98.9 4.7L99.8 5.1L100.6 5.4L101.5 5.8L102.3 6.2L103.2 6.6L104.0 7.0L104.9 6.6L105.7 6.3L106.5 5.9L107.4 5.6L108.2 5.2L109.0 4.9L109.9 4.7L110.7 4.4L111.5 4.2L112.4 4.0L113.2 3.8L114.1 3.7L114.9 3.6L115.7 3.5L116.6 3.5L117.4 3.5L118.2 3.6L119.1 3.7L119.9 3.8L120.7 4.0L121.6 4.2L122.4 4.4L123.2 4.7L124.1 4.9L124.9 5.2L125.8 5.6L126.6 5.9L127.4 6.3L128.3 6.6L129.1 7.0L129.9 6.6L130.8 6.1L131.6 5.7L132.4 5.3L133.3 4.9L134.1 4.5L134.9 4.2L135.8 3.8L136.6 3.5L137.4 3.3L138.3 3.1L139.1 2.9L139.9 2.8L140.8 2.7L141.6 2.6L142.5 2.6L143.3 2.7L144.1 2.8L145.0 2.9L145.8 3.1L146.6 3.3L147.5 3.5L148.3 3.8L149.1 4.2L150.0 4.5L150.8 4.9L151.6 5.3L152.5 5.7L153.3 6.1L154.1 6.6L155.0 7.0L155.8 6.5L156.7 6.0L157.5 5.5L158.3 5.0L159.2 4.6L160.0 4.2L160.9 3.8L161.7 3.5L162.5 3.3L163.4 3.0L164.2 2.9L165.1 2.8L165.9 2.8L166.7 2.8L167.6 2.9L168.4 3.0L169.3 3.3L170.1 3.5L170.9 3.8L171.8 4.2L172.6 4.6L173.5 5.0L174.3 5.5L175.1 6.0L176.0 6.5L176.8 7.0L177.7 6.5L178.6 6.0L179.4 5.5L180.3 5.1L181.1 4.7L182.0 4.3L182.9 4.0L183.7 3.8L184.6 3.6L185.5 3.6L186.3 3.6L187.2 3.6L188.1 3.8L188.9 4.0L189.8 4.3L190.7 4.7L191.5 5.1L192.4 5.5L193.3 6.0L194.1 6.5L195.0 7.0L195 12Z"} fill={"#D3CDE2"} transform={"translate(0 -1)"} />
            <path d={"M0 12L0.0 7.0L0.8 6.6L1.7 6.1L2.5 5.7L3.4 5.3L4.2 4.9L5.1 4.5L5.9 4.1L6.8 3.8L7.6 3.6L8.5 3.3L9.3 3.1L10.1 3.0L11.0 2.9L11.8 2.9L12.7 2.9L13.5 2.9L14.4 3.0L15.2 3.1L16.1 3.3L16.9 3.6L17.8 3.8L18.6 4.1L19.4 4.5L20.3 4.9L21.1 5.3L22.0 5.7L22.8 6.1L23.7 6.6L24.5 7.0L25.4 6.5L26.2 6.1L27.1 5.7L27.9 5.2L28.8 4.8L29.6 4.4L30.5 4.1L31.3 3.8L32.2 3.5L33.1 3.2L33.9 3.0L34.8 2.9L35.6 2.7L36.5 2.7L37.3 2.6L38.2 2.7L39.0 2.7L39.9 2.9L40.7 3.0L41.6 3.2L42.4 3.5L43.3 3.8L44.1 4.1L45.0 4.4L45.9 4.8L46.7 5.2L47.6 5.7L48.4 6.1L49.3 6.5L50.1 7.0L51.0 6.7L51.8 6.4L52.6 6.1L53.5 5.8L54.3 5.5L55.1 5.2L56.0 4.9L56.8 4.7L57.6 4.5L58.5 4.3L59.3 4.1L60.1 3.9L61.0 3.8L61.8 3.7L62.7 3.6L63.5 3.5L64.3 3.5L65.2 3.5L66.0 3.5L66.8 3.6L67.7 3.7L68.5 3.8L69.3 3.9L70.2 4.1L71.0 4.3L71.8 4.5L72.7 4.7L73.5 4.9L74.4 5.2L75.2 5.5L76.0 5.8L76.9 6.1L77.7 6.4L78.5 6.7L79.4 7.0L80.2 6.6L81.1 6.2L81.9 5.8L82.8 5.4L83.6 5.1L84.5 4.7L85.3 4.4L86.2 4.1L87.0 3.9L87.9 3.7L88.7 3.5L89.6 3.4L90.4 3.3L91.3 3.2L92.1 3.2L93.0 3.3L93.8 3.4L94.7 3.5L95.5 3.7L96.4 3.9L97.2 4.1L98.1 4.4L98.9 4.7L99.8 5.1L100.6 5.4L101.5 5.8L102.3 6.2L103.2 6.6L104.0 7.0L104.9 6.6L105.7 6.3L106.5 5.9L107.4 5.6L108.2 5.2L109.0 4.9L109.9 4.7L110.7 4.4L111.5 4.2L112.4 4.0L113.2 3.8L114.1 3.7L114.9 3.6L115.7 3.5L116.6 3.5L117.4 3.5L118.2 3.6L119.1 3.7L119.9 3.8L120.7 4.0L121.6 4.2L122.4 4.4L123.2 4.7L124.1 4.9L124.9 5.2L125.8 5.6L126.6 5.9L127.4 6.3L128.3 6.6L129.1 7.0L129.9 6.6L130.8 6.1L131.6 5.7L132.4 5.3L133.3 4.9L134.1 4.5L134.9 4.2L135.8 3.8L136.6 3.5L137.4 3.3L138.3 3.1L139.1 2.9L139.9 2.8L140.8 2.7L141.6 2.6L142.5 2.6L143.3 2.7L144.1 2.8L145.0 2.9L145.8 3.1L146.6 3.3L147.5 3.5L148.3 3.8L149.1 4.2L150.0 4.5L150.8 4.9L151.6 5.3L152.5 5.7L153.3 6.1L154.1 6.6L155.0 7.0L155.8 6.5L156.7 6.0L157.5 5.5L158.3 5.0L159.2 4.6L160.0 4.2L160.9 3.8L161.7 3.5L162.5 3.3L163.4 3.0L164.2 2.9L165.1 2.8L165.9 2.8L166.7 2.8L167.6 2.9L168.4 3.0L169.3 3.3L170.1 3.5L170.9 3.8L171.8 4.2L172.6 4.6L173.5 5.0L174.3 5.5L175.1 6.0L176.0 6.5L176.8 7.0L177.7 6.5L178.6 6.0L179.4 5.5L180.3 5.1L181.1 4.7L182.0 4.3L182.9 4.0L183.7 3.8L184.6 3.6L185.5 3.6L186.3 3.6L187.2 3.6L188.1 3.8L188.9 4.0L189.8 4.3L190.7 4.7L191.5 5.1L192.4 5.5L193.3 6.0L194.1 6.5L195.0 7.0L195 12Z"} fill={"#FFFFFF"} />
          </svg>
          <div style={{ display: "flex", gap: "8px", margin: "0" }}>
            <label htmlFor={"office-input"} style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
              {"회사 안에서 말하기"}
            </label>
            <input id={"office-input"} ref={v.setInput} className={"field"} type={"text"} value={v.draft} onChange={v.onInput} onKeyDown={v.sendKey} enterKeyHint={"send"} maxLength={"40"} placeholder={"점심 뭐 먹어요?"} autoComplete={"off"} style={{ flex: "1", minWidth: "0", height: "44px" }} />
            <button type={"button"} onClick={v.send} className={"btn by"} style={{ width: "70px", height: "44px", flex: "none" }}>
              {"말하기"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type={"button"} onClick={v.waveAll} className={"btn bc"} style={{ flex: "1", height: "44px" }}>
              {"손 흔들기"}
            </button>
            <button type={"button"} onClick={v.toggleFocus} aria-pressed={v.focusOn} className={v.focusCls} style={{ flex: "1.2", height: "44px" }}>
              {v.focusBtn}
            </button>
          </div>
        </section>
        {v.dlg?.open ? (
          <>
          <div role={"dialog"} aria-label={"관리인 아저씨와 1:1 대화"} style={{ position: "absolute", left: "8px", bottom: "10px", width: "374px", zIndex: "30" }}>
            {v.dlg?.hasChoices ? (
              <>
              <div style={{ position: "absolute", right: "0", bottom: "calc(100% + 34px)", width: `${v.dlg?.clc?.w ?? ''}px`, height: `${v.dlg?.clc?.h ?? ''}px` }}>
                <svg aria-hidden={"true"} width={v.dlg?.clc?.w} height={v.dlg?.clc?.h} viewBox={v.dlg?.clc?.vb} shapeRendering={"crispEdges"} style={{ position: "absolute", left: "0", top: "0", zIndex: "0", overflow: "visible" }}>
                  <path d={v.dlg?.clc?.d} fill={"#D3CDE2"} transform={"translate(0 1)"} />
                  <path d={v.dlg?.clc?.d} fill={"#FFFFFF"} />
                </svg>
                <div style={{ position: "relative", zIndex: "1", boxSizing: "border-box", height: "100%", padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  {asList(v.dlg?.choices).map((c, i2) => (
                    <Fragment key={i2}>
                      <button type={"button"} onClick={c?.pick} style={{ display: "flex", alignItems: "center", gap: "6px", height: "34px", padding: "0 4px", border: "0", background: "none", textAlign: "left", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "12px", color: "#3F3A40", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <svg width={"8"} height={"10"} viewBox={"0 0 4 5"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
                          <path fill={"#C9A7E8"} d={"M0 0h1v1h1v1h1v1H2v1H1v1H0z"} />
                        </svg>
                        {c?.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              </>
            ) : null}
            <button type={"button"} onClick={v.dlg?.next} aria-label={v.dlg?.aria} style={{ position: "relative", display: "block", width: `${v.dlg?.clb?.w ?? ''}px`, height: `${v.dlg?.clb?.h ?? ''}px`, padding: "0", border: "0", background: "none", textAlign: "left", cursor: "pointer", fontFamily: "'Galmuri11', monospace" }}>
              <svg aria-hidden={"true"} width={v.dlg?.clb?.w} height={v.dlg?.clb?.h} viewBox={v.dlg?.clb?.vb} shapeRendering={"crispEdges"} style={{ position: "absolute", left: "0", top: "0", zIndex: "0", overflow: "visible" }}>
                <path d={v.dlg?.clb?.d} fill={"#D3CDE2"} transform={"translate(0 1)"} />
                <path d={v.dlg?.clb?.d} fill={"#FFFFFF"} />
              </svg>
              <span style={{ position: "absolute", left: "14px", top: "-16px", zIndex: "2", fontFamily: "'Galmuri14', monospace", fontSize: "15px", lineHeight: "15px", color: "#6E3F8C", background: "#F7CFE0", padding: "6px 30px 5px", borderRadius: "13px", boxShadow: "0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(60,50,80,0.18)" }}>
                {"관리인 아저씨"}
              </span>
              <span style={{ position: "absolute", left: "0", right: "0", top: "0", zIndex: "1", display: "block", padding: "30px 28px 0", fontSize: "14px", lineHeight: "22px", color: "#3F3A40", whiteSpace: "pre-line" }}>
                {v.dlg?.text}
              </span>
              {v.dlg?.showNext ? (
                <>
                <svg className={"nxt"} aria-hidden={"true"} width={"20"} height={"20"} viewBox={"0 0 10 10"} shapeRendering={"crispEdges"} style={{ position: "absolute", right: "18px", bottom: "14px", zIndex: "1" }}>
                  <path fill={"#7C5BD6"} d={"M0 1h10v2H9v2H8v2H7v2H6v1H4V9H3V7H2V5H1V3H0z"} />
                  <path fill={"#9FD3F2"} d={"M2 2h4v1H5v1H4v1H3V3H2z"} />
                </svg>
                </>
              ) : null}
            </button>
            <button type={"button"} onClick={v.dlg?.close} className={"tag"} style={{ position: "absolute", right: "10px", top: "-24px", zIndex: "3", border: "0", cursor: "pointer", color: "#6B5140", height: "22px" }}>
              {"대화 끝내기"}
            </button>
          </div>
          </>
        ) : null}
        <a ref={v.setVillageLink} href={"Village3D.dc.html"} tabIndex={"-1"} aria-hidden={"true"} style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          {"마을"}
        </a>
        <div ref={v.setIris} aria-hidden={"true"} style={{ position: "absolute", inset: "0", zIndex: "200", pointerEvents: "none", background: "transparent" }} />
      </div>
    </>
  );
}
