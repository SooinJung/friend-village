// Village screen template, converted from the canvas .dc.html by tools/dc2jsx.py.
// `v` holds this screen's props merged with the values returned by renderVals() in logic.js.
import { Fragment } from 'react';
import { asList } from '../../dc/runtime.jsx';
import Cafe from '../Cafe/index.jsx';
import FaceDraw from '../FaceDraw/index.jsx';
import Office from '../Office/index.jsx';

export default function renderVillage(v) {
  return (
    <>
      <div style={{ position: "relative", width: "390px", height: "844px", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Galmuri11', 'Apple SD Gothic Neo', monospace", fontSize: "12px", background: "#F6E7C1", color: "#4A3426" }}>
        <div style={{ position: "relative", width: "390px", height: "844px", flex: "none", overflow: "hidden", background: v.skyFallback }}>
          <canvas ref={v.setCanvas} onPointerDown={v.tapMap} data-village={"1"} width={"195"} height={"422"} role={"img"} aria-label={"친구들이 상태별 장소에 서 있는 3D 섬마을. 누른 곳으로 내 캐릭터가 걸어가요"} style={{ display: "block", width: "390px", height: "844px", imageRendering: "pixelated", cursor: "pointer", touchAction: "manipulation" }} />
          {v.glFailed ? (
            <>
            <div style={{ position: "absolute", left: "40px", right: "40px", top: "210px", padding: "14px", background: "#FFFDF5", color: "#4A3426", lineHeight: "18px", textAlign: "center", boxShadow: "0 -3px 0 0 #7A5638, 0 3px 0 0 #7A5638, -3px 0 0 0 #7A5638, 3px 0 0 0 #7A5638" }}>
              {"이 화면에서는 3D 마을을 불러오지 못했어요. 다른 브라우저에서 열어 보세요."}
            </div>
            </>
          ) : null}
          <button type={"button"} onClick={v.openSettings} aria-label={v.hud?.aria} style={{ position: "absolute", left: "50%", top: "8px", zIndex: "19", width: "214px", boxSizing: "border-box", padding: "8px 16px 7px", border: "0", borderRadius: "14px", cursor: "pointer", background: v.hud?.bg, boxShadow: "0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(60, 50, 40, 0.22)", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", opacity: v.hud?.op, transform: `translate(-50%, ${v.hud?.dy ?? ''}px)`, transition: "opacity .7s ease, transform .7s ease", pointerEvents: v.hud?.pe }}>
            <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Galmuri14', monospace", fontSize: "15px", lineHeight: "16px", color: v.hud?.fg, whiteSpace: "nowrap" }}>
              {v.villageName}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: v.hud?.sub, whiteSpace: "nowrap" }}>
              <span style={{ position: "relative", width: "14px", height: "14px", flex: "none" }} aria-hidden={"true"}>
                <span style={{ position: "absolute", left: "-2px", top: "-2px", width: "2px", height: "2px", boxShadow: v.skyIcon }} />
              </span>
              {"\n"}{v.clock}{" · "}{v.hud?.date}{" · "}{v.hud?.wx}{"\n"}
            </span>
            {v.hud?.hasEvent ? (
              <>
              <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#6E3F8C", background: "#F7CFE0", padding: "3px 8px 2px", borderRadius: "7px", whiteSpace: "nowrap" }}>
                {v.hud?.event}
              </span>
              </>
            ) : null}
          </button>
          <button type={"button"} onClick={v.openMap} className={"btn bc"} style={{ position: "absolute", left: "9px", top: "9px", height: "44px", padding: "0 4px", zIndex: "20", gap: "6px" }}>
            <svg width={"16"} height={"16"} viewBox={"0 0 8 8"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
              <path fill={"currentColor"} d={"M0 1h2v6H0zM3 0h2v6H3zM6 1h2v6H6zM2 1h1v1H2zM5 1h1v1H5zM2 6h1v1H2zM5 6h1v1H5z"} />
            </svg>
            {"\n지도\n"}
          </button>
          {v.toast?.show ? (
            <>
            <div className={"bub"} style={{ position: "absolute", left: "50%", top: "56px", transform: "translateX(-50%)", zIndex: "25", whiteSpace: "nowrap", fontSize: "12px", lineHeight: "14px" }}>
              <span className={"bubtxt"}>
                {v.toast?.text}
              </span>
            </div>
            </>
          ) : null}
          <div ref={v.setHouseTag} aria-live={"polite"} className={"htag"} style={{ position: "absolute", left: "0", top: "0", transform: "translate(-50%, -100%)", opacity: "0", pointerEvents: "none", zIndex: "3", display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap", height: "22px", padding: "0 9px", borderRadius: "6px", background: "#FFF6E4", boxShadow: "0 0 0 2px #B98A5E, 0 3px 0 2px #8F6544", fontFamily: "'Galmuri9', monospace", fontSize: "11px", lineHeight: "11px", color: "#5A3E28", transition: "opacity 0.45s ease" }}>
            <svg width={"12"} height={"12"} viewBox={"0 0 6 6"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
              <path fill={"#C9634E"} d={"M2 0h2v1h1v1h1v1H0V2h1V1h1zM1 3h4v3H1z"} />
              <path fill={"#FFF6E4"} d={"M2 4h1v2H2z"} />
            </svg>
            <span data-htag-text={"1"} />
          </div>
          {v.pinsReady ? (
            <>
            {asList(v.friends).map((f, i1) => (
              <Fragment key={i1}>
                {f?.onMap ? (
                  <>
                  <button type={"button"} data-pin={f?.id} onClick={f?.pick} aria-label={f?.label} style={{ position: "absolute", left: `${f?.bx ?? ''}px`, top: `${f?.by ?? ''}px`, width: "44px", height: `${f?.bh ?? ''}px`, padding: "0", border: "0", background: "transparent", cursor: "pointer", zIndex: f?.z }}>
                    {f?.saying ? (
                      <>
                      <span style={{ position: "absolute", bottom: `calc(100% + 12px + ${f?.lift ?? ''}px)`, left: `${f?.bubL ?? ''}px`, zIndex: "1" }}>
                        <span className={"bub"} style={{ display: "block", width: `${f?.bubW ?? ''}px`, boxSizing: "border-box", textAlign: "left", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "15px" }}>
                          <span className={"bubtxt"} style={{ overflowWrap: "anywhere" }}>
                            {f?.sayText}
                          </span>
                        </span>
                        <span className={"tabA"} style={{ position: "absolute", left: "10px", top: "-21px", background: f?.tint }}>
                          {f?.name}
                        </span>
                      </span>
                      {f?.tailShow ? (
                        <>
                        <span className={"stail"} style={{ position: "absolute", bottom: "calc(100% + 4px)", left: "13px", zIndex: "2" }} />
                        </>
                      ) : null}
                      </>
                    ) : null}
                    {f?.quiet ? (
                      <>
                      <span className={"tag"} style={{ position: "absolute", bottom: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", color: f?.tagFg, background: f?.tagBg }}>
                        {f?.tagText}
                      </span>
                      </>
                    ) : null}
                    {f?.cue ? (
                      <>
                      <svg className={"cue"} width={"14"} height={"14"} viewBox={"0 0 7 7"} shapeRendering={"crispEdges"} aria-hidden={"true"} style={{ position: "absolute", bottom: "calc(100% + 26px)", left: "15px", pointerEvents: "none", zIndex: "5" }}>
                        <path fill={"#FFC93B"} d={"M3 0h1v2h1v1h2v1H5v1H4v2H3V5H2V4H0V3h2V2h1z"} />
                      </svg>
                      </>
                    ) : null}
                  </button>
                  </>
                ) : null}
              </Fragment>
            ))}
            <div data-pin={"board"} style={{ position: "absolute", left: `${v.board?.x ?? ''}px`, top: `${v.board?.y ?? ''}px`, transform: "translateX(-50%)", whiteSpace: "nowrap", background: "#3F5F8A", color: "#FFFFFF", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", padding: "3px 8px", borderRadius: "6px", boxShadow: "0 0 0 2px #FFFFFF, 0 2px 0 2px rgba(40, 50, 80, 0.25)", zIndex: "3" }}>
              {"회사 · "}{v.board?.names}
            </div>
            {v.door?.show ? (
              <>
              <button type={"button"} className={"hit"} onClick={v.door?.go} style={{ position: "absolute", left: "50%", bottom: "166px", transform: "translateX(-50%)", zIndex: "31", whiteSpace: "nowrap", border: "0", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", height: "40px", padding: "0 16px", borderRadius: "20px", background: "#FFFFFF", color: "#3F3A40", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "12px", boxShadow: "0 0 0 2px #FFD36B, 0 4px 0 2px rgba(150, 100, 30, 0.3)" }}>
                {v.door?.label}
                <svg width={"8"} height={"10"} viewBox={"0 0 4 5"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
                  <path fill={"#E0A93A"} d={"M0 0h1v1h1v1h1v1H2v1H1v1H0z"} />
                </svg>
              </button>
              </>
            ) : null}
            <button type={"button"} className={"hit"} data-pin={"nb"} onClick={v.openBoard} style={{ position: "absolute", left: `${v.nb?.x ?? ''}px`, top: `${v.nb?.y ?? ''}px`, transform: "translate(-50%, -100%)", whiteSpace: "nowrap", border: "0", cursor: "pointer", background: "#FFF6E4", color: "#6B4A33", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", padding: "4px 8px 3px", borderRadius: "7px", boxShadow: "0 0 0 2px #A9774A, 0 3px 0 2px rgba(80, 50, 30, 0.25)", zIndex: "3" }}>
              {"게시판 · "}{v.nb?.count}
              {v.boardCue ? (
                <>
                <svg className={"cue"} width={"14"} height={"14"} viewBox={"0 0 7 7"} shapeRendering={"crispEdges"} aria-hidden={"true"} style={{ position: "absolute", right: "-12px", top: "-14px", pointerEvents: "none", zIndex: "5" }}>
                  <path fill={"#FFC93B"} d={"M3 0h1v2h1v1h2v1H5v1H4v2H3V5H2V4H0V3h2V2h1z"} />
                </svg>
                </>
              ) : null}
            </button>
            </>
          ) : null}
          {v.mapOpen ? (
            <>
            <div role={"dialog"} aria-label={"섬 지도"} style={{ position: "absolute", left: "0", top: "0", right: "0", bottom: "0", zIndex: "40", background: "rgba(30, 44, 70, 0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className={"card"} style={{ width: "330px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "-2px" }}>
                  <span className={"tabA"} style={{ background: "#CDE8B0", fontFamily: "'Galmuri14', monospace", fontSize: "15px", lineHeight: "15px", padding: "4px 12px 3px" }}>
                    {v.villageName}
                  </span>
                  <button type={"button"} onClick={v.closeMap} className={"btn bc"} style={{ height: "44px", padding: "0 4px" }}>
                    {"닫기"}
                  </button>
                </div>
                <div style={{ position: "relative", width: "288px", height: "352px", boxShadow: "0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(90, 100, 130, 0.25)" }}>
                  <canvas ref={v.setMapCanvas} width={"144"} height={"176"} aria-hidden={"true"} style={{ display: "block", width: "288px", height: "352px", imageRendering: "pixelated" }} />
                  {asList(v.mapPins).map((m, i2) => (
                    <Fragment key={i2}>
                      <button type={"button"} onClick={m?.pick} aria-label={m?.label} style={{ position: "absolute", left: `${m?.x ?? ''}px`, top: `${m?.y ?? ''}px`, transform: "translate(-50%, -50%)", padding: "0", border: "0", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", zIndex: m?.z }}>
                        <span style={{ width: "12px", height: "12px", borderRadius: "6px", background: m?.tint, boxShadow: "0 0 0 2px #FFFFFF, 0 2px 0 2px rgba(60, 60, 80, 0.3)" }} />
                        <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#3F3A40", background: "#FFFFFF", padding: "2px 4px 1px", borderRadius: "5px", whiteSpace: "nowrap" }}>
                          {m?.name}
                        </span>
                      </button>
                    </Fragment>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 10px", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: "#5E4B36" }}>
                  <span>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#3F8F6B", verticalAlign: "-1px" }} />
                    {" 카페"}
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#D9534F", verticalAlign: "-1px" }} />
                    {" 식당"}
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#8EBFE0", borderRadius: "4px", verticalAlign: "-1px" }} />
                    {" 광장"}
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#4A78B5", verticalAlign: "-1px" }} />
                    {" 정류장"}
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", background: "#E07B62", verticalAlign: "-1px" }} />
                    {" 집"}
                  </span>
                </div>
              </div>
            </div>
            </>
          ) : null}
          {v.dlgShow ? (
            <>
            <div style={{ position: "absolute", left: "8px", bottom: "12px", width: "374px", zIndex: "30" }}>
              {v.showPicker ? (
                <>
                <div role={"group"} aria-label={"어디로 갈까요"} style={{ position: "absolute", left: "0", bottom: "calc(100% + 36px)", width: `${v.cl?.pick?.w ?? ''}px`, height: `${v.cl?.pick?.h ?? ''}px` }}>
                  <svg aria-hidden={"true"} width={v.cl?.pick?.w} height={v.cl?.pick?.h} viewBox={v.cl?.pick?.vb} shapeRendering={"crispEdges"} style={{ position: "absolute", left: "0", top: "0", zIndex: "0", overflow: "visible" }}>
                    <path d={v.cl?.pick?.d} fill={"#D3CDE2"} transform={"translate(0 1)"} />
                    <path d={v.cl?.pick?.d} fill={"#FFFFFF"} />
                  </svg>
                  <div style={{ position: "relative", zIndex: "1", boxSizing: "border-box", height: "100%", padding: "20px 20px 18px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", alignContent: "center" }}>
                    {asList(v.statusOptions).map((o, i3) => (
                      <Fragment key={i3}>
                        <button type={"button"} onClick={o?.pick} className={o?.cls} style={{ height: "44px", flexDirection: "column", gap: "3px" }}>
                          {o?.label}
                          <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", opacity: "0.8" }}>
                            {o?.where}
                          </span>
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
                </>
              ) : null}
              <div style={{ position: "relative", width: `${v.cl?.box?.w ?? ''}px`, height: `${v.cl?.box?.h ?? ''}px` }}>
                <svg aria-hidden={"true"} width={v.cl?.box?.w} height={v.cl?.box?.h} viewBox={v.cl?.box?.vb} shapeRendering={"crispEdges"} style={{ position: "absolute", left: "0", top: "0", zIndex: "0", overflow: "visible" }}>
                  <path d={v.cl?.box?.d} fill={"#D3CDE2"} transform={"translate(0 1)"} />
                  <path d={v.cl?.box?.d} fill={"#FFFFFF"} />
                </svg>
                <span style={{ position: "absolute", left: "14px", top: "-16px", zIndex: "2", fontFamily: "'Galmuri14', monospace", fontSize: "15px", lineHeight: "15px", color: "#6E3F8C", background: v.sel?.tabBg, padding: "6px 30px 5px", borderRadius: "13px", boxShadow: "0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(60, 50, 80, 0.18)", whiteSpace: "nowrap" }}>
                  {v.sel?.name}
                </span>
                <div style={{ position: "relative", zIndex: "1", boxSizing: "border-box", height: "100%", padding: "26px 24px 16px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "0" }}>
                    {v.isMe ? (
                      <>
                      <button type={"button"} className={"hit"} onClick={v.togglePicker} aria-expanded={v.showPicker} aria-label={v.chipAria} style={{ flex: "none", display: "flex", alignItems: "center", gap: "4px", height: "24px", border: "0", cursor: "pointer", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#5A4632", background: v.sel?.chipBg, padding: "0 8px", borderRadius: "8px", whiteSpace: "nowrap", boxShadow: "0 2px 0 rgba(90, 70, 50, 0.18)" }}>
                        {v.sel?.chip}
                        <svg width={"8"} height={"6"} viewBox={"0 0 4 3"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
                          <path fill={"currentColor"} d={"M0 0h4v1H3v1H2v1H2V2H1V1H0z"} />
                        </svg>
                      </button>
                      </>
                    ) : null}
                    {v.notMe ? (
                      <>
                      <span style={{ flex: "none", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#5A4632", background: v.sel?.chipBg, padding: "4px 8px 3px", borderRadius: "7px", whiteSpace: "nowrap" }}>
                        {v.sel?.chip}
                      </span>
                      </>
                    ) : null}
                    <span style={{ minWidth: "0", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: "#4E4659", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {v.sel?.place}{" · "}{v.sel?.since}
                    </span>
                  </div>
                  {v.isMe ? (
                    <>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                      <input ref={v.setInput} value={v.draft} onChange={v.onDraft} onKeyDown={v.sayKey} maxLength={"40"} enterKeyHint={"send"} aria-label={"한마디 하기"} placeholder={"안녕!"} style={{ flex: "1", minWidth: "0", height: "40px", boxSizing: "border-box", border: "0", borderBottom: "2px dashed #DCD4EA", borderRadius: "0", background: "transparent", padding: "0 2px", fontFamily: "'Galmuri11', monospace", fontSize: "14px", color: "#3F3A40", outlineColor: "#FFD36B" }} />
                      <button type={"button"} onClick={v.say} className={"btn by"} style={{ height: "44px", padding: "0 4px", flex: "none" }}>
                        {"말하기"}
                      </button>
                    </div>
                    </>
                  ) : null}
                  {v.notMe ? (
                    <>
                    <p style={{ margin: "10px 0 0", padding: "0 22px 0 2px", fontSize: "14px", lineHeight: "22px", color: "#3F3A40" }}>
                      {v.sel?.mood}
                    </p>
                    {v.sel?.bday ? (
                      <>
                      <button type={"button"} onClick={v.cheer} className={"btn by"} style={{ position: "absolute", right: "56px", bottom: "12px", height: "44px", padding: "0 4px" }}>
                        {v.cheerLabel}
                      </button>
                      </>
                    ) : null}
                    </>
                  ) : null}
                </div>
                {v.notMe ? (
                  <>
                  <button type={"button"} onClick={v.nextFriend} aria-label={"다음 친구 보기"} style={{ position: "absolute", right: "18px", bottom: "13px", zIndex: "2", width: "44px", height: "44px", padding: "0", border: "0", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg className={"nxt"} aria-hidden={"true"} width={"20"} height={"20"} viewBox={"0 0 10 10"} shapeRendering={"crispEdges"}>
                      <path fill={"#7C5BD6"} d={"M0 1h10v2H9v2H8v2H7v2H6v1H4V9H3V7H2V5H1V3H0z"} />
                      <path fill={"#9FD3F2"} d={"M2 2h4v1H5v1H4v1H3V3H2z"} />
                    </svg>
                  </button>
                  </>
                ) : null}
              </div>
            </div>
            </>
          ) : null}
          <button type={"button"} onClick={v.openPhone} className={"btn bc"} aria-label={"폰 열기"} style={{ position: "absolute", right: "9px", top: "9px", height: "44px", padding: "0 4px", zIndex: "20", gap: "6px" }}>
            <svg width={"12"} height={"16"} viewBox={"0 0 6 8"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
              <path fill={"currentColor"} d={"M1 0h4v1h1v6H5v1H1V7H0V1h1zM1 1v5h4V1zM2 7h2V6H2z"} />
            </svg>
            {"\n폰\n"}
            {v.phoneCue ? (
              <>
              <svg className={"cue"} width={"14"} height={"14"} viewBox={"0 0 7 7"} shapeRendering={"crispEdges"} aria-hidden={"true"} style={{ position: "absolute", left: "-12px", top: "-12px", pointerEvents: "none", zIndex: "5" }}>
                <path fill={"#FFC93B"} d={"M3 0h1v2h1v1h2v1H5v1H4v2H3V5H2V4H0V3h2V2h1z"} />
              </svg>
              </>
            ) : null}
          </button>
          {v.boardOpen ? (
            <>
            <div role={"dialog"} aria-label={"마을 게시판"} style={{ position: "absolute", inset: "0", zIndex: "46", background: "rgba(30, 44, 70, 0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "360px", boxSizing: "border-box", padding: "12px", borderRadius: "14px", background: "#A9774A", boxShadow: "inset 0 -5px 0 #8F6238, 0 6px 0 rgba(60, 40, 20, 0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 2px 10px" }}>
                  <div role={"tablist"} aria-label={"게시판"} style={{ display: "flex", gap: "6px" }}>
                    {asList(v.boardTabs).map((bt, i4) => (
                      <Fragment key={i4}>
                        <button type={"button"} role={"tab"} aria-selected={bt?.on} onClick={bt?.pick} style={{ height: "34px", padding: "0 12px", border: "0", borderRadius: "10px", cursor: "pointer", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "12px", color: "#4A2E3E", background: bt?.bg, boxShadow: "0 0 0 2px #FFFFFF, 0 3px 0 2px rgba(80, 50, 30, 0.25)" }}>
                          {bt?.label}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                  <button type={"button"} onClick={v.closeBoard} className={"btn bc"} style={{ height: "44px", padding: "0 4px" }}>
                    {"닫기"}
                  </button>
                </div>
                {v.noticeTab ? (
                  <>
                  <div style={{ borderRadius: "8px", backgroundColor: "#D9A86C", backgroundImage: "radial-gradient(rgba(120, 70, 30, 0.25) 1px, transparent 1.4px)", backgroundSize: "7px 7px", padding: "14px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 10px", maxHeight: "420px", overflowY: "auto" }}>
                    {asList(v.notices).map((n, i5) => (
                      <Fragment key={i5}>
                        <div style={{ position: "relative", background: n?.bg, padding: "14px 10px 10px", transform: `rotate(${n?.rot ?? ''}deg)`, boxShadow: "0 3px 0 rgba(80, 50, 20, 0.25)", minHeight: "76px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span aria-hidden={"true"} style={{ position: "absolute", left: "50%", top: "4px", width: "8px", height: "8px", marginLeft: "-4px", borderRadius: "50%", background: "#E84F3D", boxShadow: "0 1px 0 rgba(0,0,0,0.3)" }} />
                          <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "16px", color: "#3F3A40", overflowWrap: "anywhere" }}>
                            {n?.text}
                          </span>
                          <span style={{ marginTop: "auto", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#8A7358" }}>
                            {n?.who}{" · "}{n?.when}
                          </span>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {v.noticeTab ? (
                    <>
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                      <input ref={v.setNoteInput} value={v.noteDraft} onChange={v.onNoteDraft} onKeyDown={v.noteKey} maxLength={"40"} aria-label={"공지 쓰기"} placeholder={"이번 주말에 같이 놀 사람!"} style={{ flex: "1", minWidth: "0", height: "40px", boxSizing: "border-box", border: "0", borderRadius: "8px", padding: "0 10px", background: "#FFF6E4", fontFamily: "'Galmuri11', monospace", fontSize: "12px", color: "#3F3A40", outlineColor: "#FFD36B" }} />
                      <button type={"button"} onClick={v.postNote} className={"btn by"} style={{ height: "44px", padding: "0 4px", flex: "none" }}>
                        {"붙이기"}
                      </button>
                    </div>
                    </>
                  ) : null}
                  </>
                ) : null}
                {v.wg?.show ? (
                  <>
                  <div style={{ borderRadius: "8px", background: "#FFF6E4", padding: "12px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "470px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                      <span style={{ fontFamily: "'Galmuri14', monospace", fontSize: "15px", lineHeight: "16px", color: "#4A3426" }}>
                        {"오늘의 단어 #"}{v.wg?.no}
                      </span>
                      <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: "#8A7358" }}>
                        {v.wg?.tries}{"번째 시도"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {asList(v.wg?.friends).map((fr, i6) => (
                        <Fragment key={i6}>
                          <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#4A2E3E", background: fr?.bg, padding: "4px 8px 3px", borderRadius: "7px" }}>
                            {fr?.text}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                    {v.wg?.won ? (
                      <>
                      <div style={{ background: "#FFE9A0", borderRadius: "8px", padding: "10px", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "16px", color: "#5A3E10" }}>
                        {v.wg?.wonText}
                      </div>
                      </>
                    ) : null}
                    {v.wg?.playing ? (
                      <>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input ref={v.setWordInput} value={v.wg?.draft} onChange={v.wg?.onDraft} onKeyDown={v.wg?.key} maxLength={"12"} aria-label={"단어 추측"} placeholder={"사과"} autoComplete={"off"} style={{ flex: "1", minWidth: "0", height: "40px", boxSizing: "border-box", border: "0", borderRadius: "8px", padding: "0 10px", background: "#FFFFFF", boxShadow: "inset 0 0 0 2px #E8D7B0", fontFamily: "'Galmuri11', monospace", fontSize: "13px", color: "#3F3A40", outlineColor: "#FFD36B" }} />
                        <button type={"button"} onClick={v.wg?.guess} className={"btn by"} style={{ height: "44px", padding: "0 4px", flex: "none" }}>
                          {"맞히기"}
                        </button>
                      </div>
                      </>
                    ) : null}
                    {v.wg?.hasLast ? (
                      <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 64px", gap: "4px 8px", alignItems: "center", padding: "8px 10px", borderRadius: "8px", background: "#FFFFFF", boxShadow: "0 0 0 2px #FFD36B", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "14px", color: "#3F3A40" }}>
                        <span>
                          {v.wg?.last?.word}
                        </span>
                        <span style={{ textAlign: "right" }}>
                          {v.wg?.last?.sim}
                        </span>
                        <span style={{ textAlign: "right", color: "#8A7358" }}>
                          {v.wg?.last?.rank}
                        </span>
                      </div>
                      </>
                    ) : null}
                    <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", minHeight: "0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 64px", gap: "8px", padding: "0 10px", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: "#8A7358" }}>
                        <span>
                          {"단어"}
                        </span>
                        <span style={{ textAlign: "right" }}>
                          {"유사도"}
                        </span>
                        <span style={{ textAlign: "right" }}>
                          {"순위"}
                        </span>
                      </div>
                      {asList(v.wg?.list).map((g, i7) => (
                        <Fragment key={i7}>
                          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 64px 64px", gap: "8px", alignItems: "center", padding: "7px 10px", borderRadius: "6px", background: "#FFFFFF", overflow: "hidden", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "14px", color: "#3F3A40" }}>
                            <span aria-hidden={"true"} style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: `${g?.bar ?? ''}%`, background: g?.barBg }} />
                            <span style={{ position: "relative" }}>
                              {g?.word}
                            </span>
                            <span style={{ position: "relative", textAlign: "right" }}>
                              {g?.sim}
                            </span>
                            <span style={{ position: "relative", textAlign: "right", color: "#8A7358" }}>
                              {g?.rank}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {v.wg?.playing ? (
                      <>
                      <button type={"button"} onClick={v.wg?.giveUp} className={"btn bc"} style={{ height: "44px", alignSelf: "flex-end", padding: "0 4px" }}>
                        {"포기하고 정답 보기"}
                      </button>
                      </>
                    ) : null}
                  </div>
                  </>
                ) : null}
              </div>
            </div>
            </>
          ) : null}
          {v.setOpen ? (
            <>
            <div role={"dialog"} aria-label={"마을 설정"} style={{ position: "absolute", inset: "0", zIndex: "47", background: "rgba(30, 44, 70, 0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className={"card"} style={{ width: "340px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={"tabA"} style={{ background: "#CDEBE9", fontFamily: "'Galmuri14', monospace", fontSize: "15px", lineHeight: "15px", padding: "5px 14px 4px" }}>
                    {"마을 설정"}
                  </span>
                  <button type={"button"} onClick={v.closeSettings} className={"btn bc"} style={{ height: "44px", padding: "0 4px" }}>
                    {"닫기"}
                  </button>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#6B5140" }}>
                  {"마을 이름\n"}
                  <input value={v.nameDraft} onChange={v.onNameDraft} maxLength={"14"} placeholder={"동네친구들 마을"} style={{ height: "40px", boxSizing: "border-box", border: "0", borderRadius: "8px", padding: "0 10px", background: "#FFFDF5", boxShadow: "inset 0 0 0 2px #E8D7B0", fontFamily: "'Galmuri11', monospace", fontSize: "13px", color: "#3F3A40", outlineColor: "#FFD36B" }} />
                </label>
                {v.roomOpen ? (
                  <>
                  <label className={"btn bb"} style={{ height: "44px", position: "relative", gap: "6px" }}>
                    {"카톡 대화로 마을 만들기"}
                    <input type={"file"} accept={".txt,text/plain"} onChange={v.onKakao} aria-label={"카카오톡 대화 내보내기 파일 고르기"} style={{ position: "absolute", inset: "0", opacity: "0", cursor: "pointer" }} />
                  </label>
                  </>
                ) : null}
                {v.roomMade ? (
                  <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "40px", padding: "0 12px", borderRadius: "10px", background: "#FFF6E4", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "12px", color: "#4A3426" }}>
                    {v.roomInfo}
                  </div>
                  </>
                ) : null}
                {v.kk?.has ? (
                  <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "#FFF6E4", borderRadius: "10px", padding: "10px" }}>
                    <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "14px", color: "#4A3426" }}>
                      {v.kk?.title}
                    </span>
                    <span style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#8A7358" }}>
                      {"이 중에 나는?"}
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {asList(v.kk?.members).map((km, i8) => (
                        <Fragment key={i8}>
                          <button type={"button"} onClick={km?.pick} aria-pressed={km?.on} style={{ height: "32px", padding: "0 10px", border: "0", borderRadius: "9px", cursor: "pointer", fontFamily: "'Galmuri11', monospace", fontSize: "12px", lineHeight: "12px", color: "#4A2E3E", background: km?.bg, boxShadow: "0 0 0 2px #FFFFFF, 0 2px 0 2px rgba(80, 50, 30, 0.2)" }}>
                            {km?.name}
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  </>
                ) : null}
                {v.kk?.err ? (
                  <>
                  <span role={"status"} style={{ fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "14px", color: "#B5523B" }}>
                    {v.kk?.errText}
                  </span>
                  </>
                ) : null}
                <button type={"button"} onClick={v.applySettings} className={"btn by"} style={{ height: "44px" }}>
                  {"적용하기"}
                </button>
              </div>
            </div>
            </>
          ) : null}
          {v.phoneOpen ? (
            <>
            <div role={"dialog"} aria-label={"폰"} style={{ position: "absolute", inset: "0", zIndex: "45", background: "rgba(30, 44, 70, 0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={v.closePhone}>
              <div onClick={v.stop} style={{ width: "252px", boxSizing: "border-box", padding: "12px", borderRadius: "40px", background: "#F2C46A", boxShadow: "inset 0 -5px 0 #D9A447, 0 6px 0 rgba(60, 40, 20, 0.25)" }}>
                <div style={{ borderRadius: "30px", background: "#FFF9EC", padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#8A7358" }}>
                    <span>
                      {v.clock}
                    </span>
                    <span>
                      {v.villageName}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px 8px" }}>
                    {asList(v.apps).map((ap, i9) => (
                      <Fragment key={i9}>
                        {ap?.isLink ? (
                          <>
                          <a href={ap?.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", textDecoration: "none", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#4A3426", whiteSpace: "nowrap" }}>
                            <span style={{ width: "56px", height: "56px", borderRadius: "18px", background: ap?.bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.1)" }}>
                              <svg width={"28"} height={"28"} viewBox={"0 0 7 7"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
                                <path fill={"#FFFFFF"} d={ap?.icon} />
                              </svg>
                            </span>
                            {ap?.label}
                          </a>
                          </>
                        ) : null}
                        {ap?.isBtn ? (
                          <>
                          <button type={"button"} onClick={ap?.pick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", border: "0", padding: "0", background: "none", cursor: "pointer", fontFamily: "'Galmuri11', monospace", fontSize: "11px", lineHeight: "12px", color: "#4A3426", whiteSpace: "nowrap" }}>
                            <span style={{ position: "relative", width: "56px", height: "56px", borderRadius: "18px", background: ap?.bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.1)" }}>
                              <svg width={"28"} height={"28"} viewBox={"0 0 7 7"} shapeRendering={"crispEdges"} aria-hidden={"true"}>
                                <path fill={"#FFFFFF"} d={ap?.icon} />
                              </svg>
                              {ap?.cue ? (
                                <>
                                <svg className={"cue"} width={"14"} height={"14"} viewBox={"0 0 7 7"} shapeRendering={"crispEdges"} aria-hidden={"true"} style={{ position: "absolute", right: "-6px", top: "-8px", pointerEvents: "none", zIndex: "5" }}>
                                  <path fill={"#FFC93B"} d={"M3 0h1v2h1v1h2v1H5v1H4v2H3V5H2V4H0V3h2V2h1z"} />
                                </svg>
                                </>
                              ) : null}
                            </span>
                            {ap?.label}
                          </button>
                          </>
                        ) : null}
                      </Fragment>
                    ))}
                  </div>
                  <button type={"button"} onClick={v.closePhone} className={"btn bc"} style={{ height: "44px", alignSelf: "center", padding: "0 6px" }}>
                    {"닫기"}
                  </button>
                </div>
              </div>
            </div>
            </>
          ) : null}
        </div>
        {v.inCafe ? (
          <>
          <div style={{ position: "absolute", inset: "0", zIndex: "150", background: "#2A2030" }}>
            <Cafe me={v.meFace} names={v.friendNames} onLeave={v.leaveScene} />
          </div>
          </>
        ) : null}
        {v.inOffice ? (
          <>
          <div style={{ position: "absolute", inset: "0", zIndex: "150", background: "#2B3F5C" }}>
            <Office me={v.meFace} names={v.friendNames} sky={v.officeSky} onLeave={v.leaveScene} />
          </div>
          </>
        ) : null}
        {v.inFace ? (
          <>
          <div style={{ position: "absolute", inset: "0", zIndex: "150", background: "#F6EBC8" }}>
            <FaceDraw me={v.meFace} onDone={v.faceDone} onBack={v.leaveScene} />
          </div>
          </>
        ) : null}
        <div ref={v.setIris} aria-hidden={"true"} style={{ position: "absolute", inset: "0", zIndex: "200", pointerEvents: "none", background: "transparent" }} />
      </div>
    </>
  );
}
