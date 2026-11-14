//#region src/diff.ts
function e(e, t) {
	let { masks: n = [], ...a } = e.params, { masks: o = [], ...s } = t.params;
	return [
		...r("param", a, s),
		...i(n, o),
		...r("bag", e.paramBag ?? {}, t.paramBag ?? {})
	];
}
var t = /* @__PURE__ */ new WeakMap();
function n(n, r) {
	if (r <= 0) return [];
	let i = n[r - 1], a = n[r], o = t.get(a);
	if (o?.prev === i) return o.changes;
	let s = e(i, a);
	return t.set(a, {
		prev: i,
		changes: s
	}), s;
}
function r(e, t, n) {
	return [.../* @__PURE__ */ new Set([...Object.keys(n), ...Object.keys(t)])].filter((e) => !a(t[e], n[e])).map((r) => ({
		kind: e,
		key: r,
		before: t[r],
		after: n[r]
	}));
}
function i(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = new Set(t.map((e) => e.id)), i = [];
	for (let e of t) {
		let t = n.get(e.id);
		t ? a(t, e) || i.push({
			kind: "mask",
			id: e.id,
			name: e.name,
			change: "edited"
		}) : i.push({
			kind: "mask",
			id: e.id,
			name: e.name,
			change: "added"
		});
	}
	for (let t of e) r.has(t.id) || i.push({
		kind: "mask",
		id: t.id,
		name: t.name,
		change: "removed"
	});
	return i;
}
function a(e, t) {
	if (e === t || Number.isNaN(e) && Number.isNaN(t)) return !0;
	if (typeof e != "object" || typeof t != "object" || e === null || t === null || Array.isArray(e) !== Array.isArray(t)) return !1;
	let n = Object.entries(e), r = new Map(Object.entries(t));
	return n.length === r.size && n.every(([e, t]) => r.has(e) && a(t, r.get(e)));
}
//#endregion
//#region src/format.ts
var o = 12, s = /* @__PURE__ */ new Set([
	"hsl",
	"nr",
	"wb",
	"ev",
	"lut",
	"rgb",
	"ca"
]);
function c(e) {
	let t = e.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[\s_-]+/).filter(Boolean).map((e) => s.has(e.toLowerCase()) ? e.toUpperCase() : e.toLowerCase()).map((e) => e.replace(/^colo(?=r)/, "colou")).join(" ");
	return t.charAt(0).toUpperCase() + t.slice(1);
}
function l(e, t) {
	if (e.kind === "param") return c(e.key);
	let n = t(e.key);
	if (!n) return c(e.key.slice(e.key.lastIndexOf(".") + 1));
	let r = n.label ?? c(n.localKey);
	return r.startsWith(n.stageName) ? r : `${n.stageName} › ${r}`;
}
function u(e, t) {
	if (e.kind === "param") return [e.before, e.after];
	let n = t(e.key)?.default;
	return [e.before ?? n, e.after ?? n];
}
function d(e) {
	return e == null ? "—" : typeof e == "number" ? String(Math.round(e * 100) / 100) : typeof e == "boolean" ? e ? "On" : "Off" : typeof e == "string" && e.length <= 24 ? e : null;
}
function f(e, t) {
	if (e.kind === "mask") return `${e.name ? `Mask “${e.name}”` : "Mask"} ${e.change}`;
	let n = l(e, t), [r, i] = u(e, t).map(d);
	return r === null || i === null ? `${n} edited` : `${n}: ${r} → ${i}`;
}
function p(e, t) {
	if (e.length > 1) return `${e.length} changes`;
	let [n] = e;
	if (!n || n.kind === "mask") return "";
	let [r, i] = u(n, t);
	if (typeof i != "number") return "";
	if (typeof r != "number") return d(i) ?? "";
	let a = Math.round((i - r) * 100) / 100;
	return a > 0 ? `+${a}` : String(a);
}
function m(e, t, n) {
	if (e === 0) return "The photo as opened";
	if (t.length === 0) return "No settings changed";
	let r = t.slice(0, o).map((e) => f(e, n));
	return t.length > o && r.push(`and ${t.length - o} more`), r.join("\n");
}
//#endregion
//#region src/rt.ts
var h, g;
function _(e) {
	g = e, h = e.react;
}
//#endregion
//#region src/HistoryPanel.tsx
var v = "history-panel-list", y = "history-panel-step", b = "history-panel-label", x = "history-panel-detail", S = "history-panel-empty";
function C(e) {
	return `
:where(.${v}) { list-style: none; margin: 0; padding: 0.25rem; display: flex; flex-direction: column; gap: 1px; }
:where(.${y}) { display: flex; width: 100%; align-items: baseline; gap: 0.5rem; border-radius: 0.25rem; padding: 0.25rem 0.5rem; background-color: transparent; font-size: 11px; text-align: left; color: ${e.textSecondary}; cursor: pointer; }
@media (hover: hover) { :where(.${y}:hover) { background-color: ${e.surface3}; color: ${e.textPrimary}; } }
:where(.${y}[aria-current="step"]) { background-color: ${e.surface3}; color: ${e.textPrimary}; box-shadow: inset 2px 0 0 ${e.accent}; }
:where(.${y}[data-state="redo"]) { opacity: 0.45; }
:where(.${b}) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${x}) { flex: none; color: ${e.textMuted}; font-variant-numeric: tabular-nums; }
:where(.${S}) { padding: 0.5rem; font-size: 11px; color: ${e.textMuted}; }
html.sl-larger-text .${y}, html.sl-larger-text .${S} { font-size: 13px !important; line-height: 1.45 !important; }
`;
}
function w() {
	let e = g.stores.useDevelopStore, t = e((e) => e.history), r = e((e) => e.historyIndex), i = e((e) => e.editError), a = e((e) => e.goToHistory), o = h.useRef(null);
	if (h.useEffect(() => {
		o.current?.scrollIntoView({ block: "nearest" });
	}, [t, r]), i) return /* @__PURE__ */ h.createElement("div", { className: S }, "This photo's history couldn't be read.");
	if (t.length === 0) return /* @__PURE__ */ h.createElement("div", { className: S }, "No photo open");
	let s = (e) => g.params.get(e);
	return /* @__PURE__ */ h.createElement("ol", {
		className: v,
		"aria-label": "Edit history"
	}, t.map((e, i) => {
		let c = n(t, i);
		return /* @__PURE__ */ h.createElement("li", { key: i }, /* @__PURE__ */ h.createElement("button", {
			ref: i === r ? o : void 0,
			className: y,
			"aria-current": i === r ? "step" : void 0,
			"data-state": i > r ? "redo" : void 0,
			title: m(i, c, s),
			onClick: () => a(i)
		}, /* @__PURE__ */ h.createElement("span", { className: b }, e.label), /* @__PURE__ */ h.createElement("span", { className: x }, p(c, s))));
	}));
}
//#endregion
//#region src/index.tsx
var T = "history", E = `${T}.panel`, D = `${T}.styles`;
function O(e) {
	_(e), e.registerStylesheet({
		id: D,
		css: C(e.ui.tokens)
	}), e.registerPanel({
		id: E,
		title: "History",
		component: w,
		defaultDock: {
			module: "develop",
			direction: "left",
			order: 3,
			width: 240,
			height: 220
		}
	});
}
//#endregion
export { T as EXTENSION_ID, E as PANEL_ID, D as STYLESHEET_ID, O as activate };

//# sourceMappingURL=index.js.map