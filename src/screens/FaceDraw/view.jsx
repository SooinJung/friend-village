// FaceDraw screen template, converted from the canvas .dc.html by tools/dc2jsx.py.
// `v` holds this screen's props merged with the values returned by renderVals() in logic.js.
import { Fragment } from 'react';
import { asList } from '../../dc/runtime.jsx';

export default function renderFaceDraw(v) {
  return (
    <>
      <div className={"drift"} style={{ position: "relative", width: "390px", height: "844px", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Galmuri11', 'Apple SD Gothic Neo', monospace", fontSize: "12px", color: "#4A3426", backgroundColor: "#F6EBC8", backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 20px, transparent 20px 40px)" }}>
        <header style={{ height: "60px", flex: "none", boxSizing: "border-box", padding: "10px 14px", background: "#FFF7E3", borderBottom: "3px solid #7A5638", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <a href={"Village3D.dc.html"} onClick={v.goBack} className={"btn bc"} style={{ height: "44px", padding: "0 4px" }}>
            {"← 마을"}
          </a>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <h1 style={{ margin: "0", fontFamily: "'Galmuri14', monospace", fontSize: "15px", fontWeight: "400", lineHeight: "16px", letterSpacing: "0.5px" }}>
              {"내 얼굴 그리기"}
            </h1>
            <button type={"button"} className={"hit"} onClick={v.toggleRes} aria-label={v.resAria} style={{ height: "28px", border: "0", padding: "0 10px", borderRadius: "14px", background: "#FFFDF5", boxShadow: "0 0 0 2px #E8D7B0", cursor: "pointer", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#6B5140" }}>
              {v.resLabel}
            </button>
          </div>
        </header>
        <div style={{ flex: "1", minHeight: "0", boxSizing: "border-box", padding: "16px 10px 12px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className={"card"} style={{ position: "relative", padding: "16px 10px 18px" }}>
            <span className={"tabA"} style={{ position: "absolute", left: "4px", top: "-22px", background: "#FFE9A8", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "12px", padding: "5px 12px 4px" }}>
              {v.statusLabel}
            </span>
            <div role={"toolbar"} aria-label={"그리기 도구"} style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "10px" }}>
              {asList(v.tools).map((t, i1) => (
                <Fragment key={i1}>
                  <button type={"button"} className={"tool"} onClick={t?.pick} aria-label={t?.label} aria-pressed={t?.on} title={t?.label}>
                    <svg width={"20"} height={"20"} viewBox={"0 0 10 10"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
                      <path fill={"currentColor"} d={t?.icon} />
                    </svg>
                  </button>
                </Fragment>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "8px" }}>
              <div aria-label={v.gridAria} role={"img"} onPointerDown={v.down} onPointerMove={v.move} onPointerUp={v.up} onPointerCancel={v.up} onPointerLeave={v.up} style={{ position: "relative", width: "240px", height: "240px", flex: "none", marginTop: "3px", backgroundColor: v.skin, backgroundImage: "linear-gradient(rgba(74, 52, 38, 0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(74, 52, 38, 0.13) 1px, transparent 1px)", backgroundSize: `${v.cellPx ?? ''}px ${v.cellPx ?? ''}px`, borderRadius: "6px", boxShadow: "0 0 0 4px #FFFFFF, 0 0 0 6px #E2D3B2, 0 5px 0 6px rgba(122, 86, 56, 0.18)", touchAction: "none", cursor: "crosshair" }}>
                <span aria-hidden={"true"} style={{ position: "absolute", left: `-${v.cellPx ?? ''}px`, top: `-${v.cellPx ?? ''}px`, width: `${v.cellPx ?? ''}px`, height: `${v.cellPx ?? ''}px`, boxShadow: v.bigShadow, pointerEvents: "none" }} />
                {v.mirror ? (
                  <>
                  <span aria-hidden={"true"} style={{ position: "absolute", left: "119px", top: "0", bottom: "0", width: "2px", background: "repeating-linear-gradient(#5AA9D6 0 4px, transparent 4px 8px)", pointerEvents: "none" }} />
                  </>
                ) : null}
              </div>
              <div role={"radiogroup"} aria-label={"색"} style={{ display: "grid", gridTemplateColumns: "44px 44px", gap: "4px 4px", width: "92px", paddingTop: "0" }}>
                {asList(v.inks).map((c, i2) => (
                  <Fragment key={i2}>
                    <button type={"button"} className={"chip"} role={"radio"} onClick={c?.pick} aria-label={c?.label} aria-checked={c?.on} aria-pressed={c?.on}>
                      <span style={{ display: "block", width: "30px", height: "30px", borderRadius: "50%", background: c?.bg, boxShadow: c?.ring }} />
                    </button>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          <div className={"card"} style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: "none" }}>
              <div aria-label={v.bodyAria} role={"img"} style={{ position: "relative", width: "84px", height: "132px" }}>
                <span aria-hidden={"true"} style={{ position: "absolute", left: "14px", bottom: "0", width: "56px", height: "10px", borderRadius: "50%", background: "rgba(122, 86, 56, 0.18)" }} />
                <span aria-hidden={"true"} style={{ position: "absolute", left: "30px", top: "104px", width: "10px", height: "18px", background: "#4A3426" }} />
                <span aria-hidden={"true"} style={{ position: "absolute", left: "44px", top: "104px", width: "10px", height: "18px", background: "#4A3426" }} />
                <span aria-hidden={"true"} style={{ position: "absolute", left: "28px", top: "120px", width: "13px", height: "6px", background: "#5A3E2B" }} />
                <span aria-hidden={"true"} style={{ position: "absolute", left: "43px", top: "120px", width: "13px", height: "6px", background: "#5A3E2B" }} />
                <span aria-hidden={"true"} style={{ position: "absolute", left: "14px", top: "66px", width: "10px", height: "30px", borderRadius: "4px", background: v.shirtCss, transform: "rotate(10deg)" }} />
                <span aria-hidden={"true"} style={{ position: "absolute", left: "60px", top: "66px", width: "10px", height: "30px", borderRadius: "4px", background: v.shirtCss, transform: "rotate(-10deg)" }} />
                <span aria-hidden={"true"} style={{ position: "absolute", left: "22px", top: "62px", width: "40px", height: "44px", borderRadius: "10px 10px 4px 4px", background: v.shirtCss, boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.1)" }} />
                <div style={{ position: "absolute", left: "12px", top: "0", width: "60px", height: "60px", background: v.skin, overflow: "hidden", borderRadius: "12px", boxShadow: "0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(122, 86, 56, 0.18)" }}>
                  <span aria-hidden={"true"} style={{ position: "absolute", left: `-${v.midPx ?? ''}px`, top: `-${v.midPx ?? ''}px`, width: `${v.midSz ?? ''}px`, height: `${v.midSz ?? ''}px`, boxShadow: v.midShadow }} />
                </div>
              </div>
              <span className={"tabA"} style={{ background: "#F6C7DA", marginTop: "-2px" }}>
                {v.nameShown}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1", minWidth: "0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "28px", flex: "none", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#6B5140" }}>
                  {"이름"}
                </span>
                <input value={v.name} onChange={v.onName} maxLength={"6"} aria-label={"주민 이름"} style={{ flex: "1", minWidth: "0", height: "44px", boxSizing: "border-box", border: "0", borderRadius: "10px", padding: "0 10px", background: "#FFFDF5", boxShadow: "inset 0 0 0 2px #E8D7B0", fontFamily: "'Galmuri11', monospace", fontSize: "12px", color: "#4A3426", outlineColor: "#FFD36B" }} />
              </label>
              <div role={"tablist"} aria-label={"꾸밀 곳"} style={{ display: "flex", gap: "4px" }}>
                {asList(v.attrTabs).map((t, i3) => (
                  <Fragment key={i3}>
                    <button type={"button"} role={"tab"} onClick={t?.pick} aria-selected={t?.on} style={{ flex: "1", minWidth: "0", height: "44px", border: "0", padding: "0", margin: "0", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitAppearance: "none", appearance: "none" }}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "25px", boxSizing: "border-box", padding: "0", borderRadius: "9px", background: t?.bg, color: t?.fg, boxShadow: `0 0 0 2px ${t?.ring ?? ''}`, fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "1", textBox: "trim-both cap alphabetic", whiteSpace: "nowrap" }}>
                        {t?.label}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              <div role={"radiogroup"} aria-label={v.attrLabel} style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", minHeight: "88px", alignContent: "flex-start" }}>
                {asList(v.swatches).map((c, i4) => (
                  <Fragment key={i4}>
                    <button type={"button"} className={"sw"} role={"radio"} onClick={c?.pick} aria-label={c?.label} aria-checked={c?.on} aria-pressed={c?.on}>
                      <span style={{ display: "block", width: "30px", height: "30px", borderRadius: "50%", background: c?.bg, boxShadow: c?.ring }} />
                    </button>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ paddingLeft: "4px", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#6B5140" }}>
                {"밑그림 불러오기"}
              </span>
              <label className={"btn bb"} style={{ height: "44px", padding: "0 4px", gap: "6px", position: "relative" }}>
                <svg width={"14"} height={"14"} viewBox={"0 0 7 7"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
                  <path fill={"currentColor"} d={"M2 0h3v1h2v6H0V1h2zM1 2v4h5V2zM3 3h1v1h1v1H4v1H3V5H2V4h1z"} />
                </svg>
                {"\n셀카로 만들기\n"}
                <input type={"file"} accept={"image/*"} capture={"user"} onChange={v.onPhoto} aria-label={"셀카나 사진을 골라 도트 얼굴로 바꾸기"} style={{ position: "absolute", inset: "0", opacity: "0", cursor: "pointer" }} />
              </label>
            </div>
            {v.photoNote?.show ? (
              <>
              <span role={"status"} style={{ paddingLeft: "4px", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: "#B5523B" }}>
                {v.photoNote?.text}
              </span>
              </>
            ) : null}
            <div style={{ display: "flex", gap: "8px" }}>
              {asList(v.presets).map((p, i5) => (
                <Fragment key={i5}>
                  <button type={"button"} onClick={p?.pick} aria-label={p?.aria} style={{ flex: "1", minWidth: "0", height: "74px", border: "0", padding: "0", borderRadius: "12px", background: "#FFFDF5", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "7px", boxShadow: "0 0 0 2px #E8D7B0, 0 3px 0 2px #D9C49A", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#5A4632" }}>
                    <span style={{ position: "relative", width: "36px", height: "36px", background: p?.skin, borderRadius: "4px", overflow: "hidden", boxShadow: "0 0 0 1px #E2D3B2" }}>
                      <span aria-hidden={"true"} style={{ position: "absolute", left: "-3px", top: "-3px", width: "3px", height: "3px", boxShadow: p?.shadow }} />
                    </span>
                    {"\n"}{p?.label}{"\n"}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
            <button type={"button"} onClick={v.clearAll} className={"btn bc"} style={{ width: "110px", height: "48px" }}>
              {"전부 지우기"}
            </button>
            <a href={"Village3D.dc.html"} onClick={v.done} className={"btn by"} style={{ flex: "1", height: "48px" }}>
              {"이 얼굴로 입주하기"}
            </a>
          </div>
        </div>
        {v.crop?.open ? (
          <>
          <div role={"dialog"} aria-label={"사진 맞추기"} style={{ position: "absolute", inset: "0", zIndex: "50", background: "rgba(40, 30, 20, 0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className={"card"} style={{ width: "350px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              <span className={"tabA"} style={{ alignSelf: "flex-start", background: "#CFE8F5", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "12px", padding: "5px 12px 4px" }}>
                {"머리 전체를 동그라미에 맞춰요"}
              </span>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div onPointerDown={v.crop?.down} onPointerMove={v.crop?.move} onPointerUp={v.crop?.up} onPointerCancel={v.crop?.up} style={{ position: "relative", width: "200px", height: "200px", overflow: "hidden", borderRadius: "6px", touchAction: "none", cursor: "grab", background: "#2A2030", boxShadow: "0 0 0 3px #FFFFFF, 0 4px 0 3px rgba(122, 86, 56, 0.2)" }}>
                  <img src={v.crop?.url} alt={""} draggable={"false"} style={{ position: "absolute", left: `${v.crop?.left ?? ''}px`, top: `${v.crop?.top ?? ''}px`, width: `${v.crop?.w ?? ''}px`, height: `${v.crop?.h ?? ''}px`, maxWidth: "none", pointerEvents: "none", userSelect: "none" }} />
                  <span aria-hidden={"true"} style={{ position: "absolute", inset: "0", pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)", backgroundSize: "25px 25px" }} />
                  <span aria-hidden={"true"} style={{ position: "absolute", left: "3%", top: "3%", width: "94%", height: "94%", boxSizing: "border-box", border: "2px dashed rgba(255, 255, 255, 0.9)", borderRadius: "50%", pointerEvents: "none" }} />
                  <span aria-hidden={"true"} style={{ position: "absolute", left: "14%", right: "14%", top: "52%", borderTop: "2px dashed rgba(255, 255, 255, 0.9)", pointerEvents: "none" }} />
                  <span aria-hidden={"true"} style={{ position: "absolute", right: "6%", top: "calc(52% - 16px)", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#FFFFFF", textShadow: "0 1px 0 rgba(0,0,0,0.6)", pointerEvents: "none" }}>
                    {"눈"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div aria-label={"도트 미리보기"} role={"img"} style={{ position: "relative", width: "96px", height: "96px", background: v.crop?.skin, overflow: "hidden", borderRadius: "8px", boxShadow: "0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(122, 86, 56, 0.2)" }}>
                    <span aria-hidden={"true"} style={{ position: "absolute", left: `-${v.crop?.ps ?? ''}px`, top: `-${v.crop?.ps ?? ''}px`, width: `${v.crop?.ps ?? ''}px`, height: `${v.crop?.ps ?? ''}px`, boxShadow: v.crop?.preview }} />
                  </div>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#6B5140" }}>
                <span style={{ flex: "none" }}>
                  {"멀리"}
                </span>
                <input type={"range"} min={"25"} max={"100"} step={"1"} value={v.crop?.zoom} onChange={v.crop?.onZoom} aria-label={"사진 확대"} style={{ flex: "1", accentColor: "#E0A93A" }} />
                <span style={{ flex: "none" }}>
                  {"가까이"}
                </span>
              </label>
              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <button type={"button"} onClick={v.crop?.cancel} className={"btn bc"} style={{ flex: "1", height: "44px" }}>
                  {"취소"}
                </button>
                <button type={"button"} onClick={v.crop?.apply} className={"btn by"} style={{ flex: "1", height: "44px" }}>
                  {"이 얼굴로"}
                </button>
              </div>
            </div>
          </div>
          </>
        ) : null}
      </div>
    </>
  );
}
