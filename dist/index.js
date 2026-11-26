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
//#region src/settings.ts
var v = "showChanges", y = {
	title: "History",
	fields: [{
		key: v,
		label: "Show what each step changed",
		hint: "Beside each step: how far a slider moved, or how many settings changed, such as “602 changes”. Hovering a step lists them either way.",
		type: "boolean",
		default: !0
	}]
};
function b() {
	return x(v, !0);
}
function x(e, t) {
	return h.useSyncExternalStore((t) => g.settings.onChange((n) => n === e && t()), () => g.settings.get(e, t));
}
//#endregion
//#region src/HistoryPanel.tsx
var S = "history-panel-tabs", C = "history-panel-list", w = "history-panel-step", T = "history-panel-label", E = "history-panel-detail", D = "history-panel-empty", O = [{
	value: "global",
	label: "Global",
	title: "The photo's whole history: going to a step undoes or redoes every tool"
}, {
	value: "local",
	label: "Local",
	title: "The steps one extension made: going to a step moves only that extension's settings"
}];
function k(e) {
	return `
:where(.${S}) { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.25rem 0.25rem 0; }
:where(.${C}) { list-style: none; margin: 0; padding: 0.25rem; display: flex; flex-direction: column; gap: 1px; max-height: 20rem; overflow-y: auto; }
:where(.${w}) { display: flex; width: 100%; align-items: baseline; gap: 0.5rem; border-radius: 0.25rem; padding: 0.25rem 0.5rem; background-color: transparent; font-size: 11px; text-align: left; color: ${e.textSecondary}; cursor: pointer; }
@media (hover: hover) { :where(.${w}:hover) { background-color: ${e.surface3}; color: ${e.textPrimary}; } }
:where(.${w}[aria-current="step"]) { background-color: ${e.surface3}; color: ${e.textPrimary}; box-shadow: inset 2px 0 0 ${e.accent}; }
:where(.${w}[data-state="redo"]) { opacity: 0.45; }
:where(.${T}) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${E}) { flex: none; color: ${e.textMuted}; font-variant-numeric: tabular-nums; }
:where(.${D}) { padding: 0.5rem; font-size: 11px; color: ${e.textMuted}; }
html.sl-larger-text .${w}, html.sl-larger-text .${D} { font-size: 13px !important; line-height: 1.45 !important; }
`;
}
function A() {
	let e = g.stores.useDevelopStore, t = e((e) => e.history), n = e((e) => e.editError), r = x("tab", "global"), { SegmentedControl: i } = g.ui;
	return n ? /* @__PURE__ */ h.createElement("div", { className: D }, "This photo's history couldn't be read.") : t.length === 0 ? /* @__PURE__ */ h.createElement("div", { className: D }, "No photo open") : /* @__PURE__ */ h.createElement("div", null, /* @__PURE__ */ h.createElement("div", { className: S }, /* @__PURE__ */ h.createElement(i, {
		size: "sm",
		value: r,
		onChange: (e) => g.settings.set("tab", e),
		options: O
	}), r === "local" && /* @__PURE__ */ h.createElement(M, null)), r === "local" ? /* @__PURE__ */ h.createElement(N, { history: t }) : /* @__PURE__ */ h.createElement(j, { history: t }));
}
function j({ history: e }) {
	let t = g.stores.useDevelopStore((e) => e.historyIndex), n = g.stores.useDevelopStore((e) => e.goToHistory), r = F(e, t);
	return /* @__PURE__ */ h.createElement("ol", {
		className: C,
		"aria-label": "Edit history"
	}, e.map((i, a) => /* @__PURE__ */ h.createElement(I, {
		key: a,
		ref: a === t ? r : void 0,
		history: e,
		index: a,
		label: i.label,
		state: a === t ? "current" : a > t ? "redo" : void 0,
		onClick: () => n(a)
	})));
}
function M() {
	let { Select: e } = g.ui, t = g.develop.useHistorySources(), n = g.develop.useLocalHistory(g.develop.useChosenHistorySource());
	if (!n) return null;
	let r = t.some((e) => e.id === n.source) ? t : [{
		id: n.source,
		name: n.name
	}, ...t];
	return /* @__PURE__ */ h.createElement(e, {
		ariaLabel: "Extension",
		title: "Whose steps to show: the extension edited last, until you pick another",
		value: n.source,
		onChange: (e) => g.develop.chooseHistorySource(e),
		options: r.map((e) => ({
			value: e.id,
			label: e.name
		}))
	});
}
function N({ history: e }) {
	let t = g.develop.useLocalHistory(g.develop.useChosenHistorySource()), n = g.stores.useDevelopStore((e) => e.goToLocalHistory), r = F(t, t?.cursor);
	if (!t) return /* @__PURE__ */ h.createElement("div", { className: D }, "No extension has changed this photo yet");
	let i = (e) => void n(t.source, e);
	return /* @__PURE__ */ h.createElement("ol", {
		className: C,
		"aria-label": `${t.name} history`
	}, /* @__PURE__ */ h.createElement(I, {
		ref: t.cursor === -1 ? r : void 0,
		history: e,
		index: 0,
		label: e[0].label,
		title: `${t.name} before its first step`,
		state: t.cursor === -1 ? "current" : void 0,
		onClick: () => i(-1)
	}), t.steps.map((n, a) => /* @__PURE__ */ h.createElement(I, {
		key: n.index,
		ref: a === t.cursor ? r : void 0,
		history: e,
		index: n.index,
		label: n.label,
		state: P(t, a),
		onClick: () => i(a)
	})));
}
var P = (e, t) => t === e.cursor ? "current" : t > e.cursor ? "redo" : void 0;
function F(e, t) {
	let n = h.useRef(null);
	return h.useEffect(() => {
		n.current?.scrollIntoView({ block: "nearest" });
	}, [e, t]), n;
}
function I({ ref: e, history: t, index: r, label: i, title: a, state: o, onClick: s }) {
	let c = b(), l = (e) => g.params.get(e), u = n(t, r);
	return /* @__PURE__ */ h.createElement("li", null, /* @__PURE__ */ h.createElement("button", {
		ref: e,
		className: w,
		"aria-current": o === "current" ? "step" : void 0,
		"data-state": o === "redo" ? "redo" : void 0,
		title: a ?? m(r, u, l),
		onClick: s
	}, /* @__PURE__ */ h.createElement("span", { className: T }, i), c && /* @__PURE__ */ h.createElement("span", { className: "history-panel-detail" }, p(u, l))));
}
//#endregion
//#region src/index.tsx
var L = "history", R = `${L}.panel`, z = `${L}.styles`;
function B(e) {
	_(e), e.registerStylesheet({
		id: z,
		css: k(e.ui.tokens)
	}), e.registerSettings(y), e.registerPanel({
		id: R,
		title: "History",
		component: A,
		defaultDock: {
			module: "develop",
			direction: "left",
			order: 3,
			width: 240,
			height: 220
		},
		modules: ["develop"]
	});
}
//#endregion
export { L as EXTENSION_ID, R as PANEL_ID, z as STYLESHEET_ID, B as activate };

//# sourceMappingURL=index.js.map