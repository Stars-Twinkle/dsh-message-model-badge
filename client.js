window.__ModuleLoader__.load({
	id: '@stars-twinkle/dsh-message-model-badge',
	factory(require) {
		const React = require('react');
		const { useEffect, useMemo, useState, useSyncExternalStore } = React;
		const h = React.createElement;

		const NS = 'message-model-badge';
		const PKG = NS;
		const RETRY_MS = 800;

		const EMPTY_STATE = Object.freeze({ status: 'idle', groups: [], current: null });
		const EMPTY_STORE = { getSnapshot: () => EMPTY_STATE, subscribe: () => () => {} };

		const CSS = `
.mmb_row{display:flex;justify-content:flex-end;align-items:center;gap:4px;min-width:0;padding:2px 4px 2px;font-family:inherit;font-size:11px;font-weight:400;line-height:16px;color:var(--dsw-alias-label-caption,#8b9196);white-space:nowrap;overflow:hidden;pointer-events:none;user-select:none}
.mmb_model{min-width:0;overflow:hidden;text-overflow:ellipsis}
.mmb_sep{flex:none;opacity:.65}
.mmb_effort{flex:none;font-weight:600;color:var(--dsw-alias-label-tertiary,#6f7479)}
.mmb_fallback{opacity:.55}
`;

		/** Resolve the model and reasoning level currently selected for one Session. */
		function describe(state) {
			const current = state?.current;
			if (current === null || current === undefined) return null;
			const group = (state.groups ?? []).find((item) => item.id === current.provider);
			const model = (group?.models ?? []).find((item) => item.id === current.model);
			const modelName = model?.name ?? current.model;
			if (typeof modelName !== 'string' || modelName.length === 0) return null;
			const effortId = current.reasoningEffort;
			const efforts = model?.reasoning?.efforts ?? [];
			const effort = efforts.find((item) => item.id === effortId);
			const effortName = typeof effort?.name === 'string' && effort.name.length > 0 ? effort.name : undefined;
			return { modelName, effortName };
		}

		function apply(ctx) {
			ctx.inject(['slots', 'locale', 'sessions', 'remote', 'remote.session', 'modelDirectories'], (scope) => {
				scope.effect(
					() =>
						scope.locale.register(NS, {
							zh: {
								'badge.aria': '模型 {model}，推理等级 {effort}',
								'badge.ariaPlain': '模型 {model}',
							},
							en: {
								'badge.aria': 'Model {model}, reasoning level {effort}',
								'badge.ariaPlain': 'Model {model}',
							},
						}),
					'message-model-badge: dictionaries',
				);
				const t = scope.locale.bind(NS);

				scope.effect(() => {
					for (const stale of Array.from(document.querySelectorAll(`style[data-plugin="${PKG}"]`))) stale.remove();
					const tag = document.createElement('style');
					tag.dataset.plugin = PKG;
					tag.textContent = CSS;
					document.head.appendChild(tag);
					return () => tag.remove();
				}, 'message-model-badge: styles');

				const models = scope.modelDirectories;
				const getDirectory = (sessionId) => {
					if (models === undefined || models === null) return null;
					return models.directoryFor(sessionId);
				};

				function Badge(props) {
					const sessionId = props.sessionId;
					const [retryTick, setRetryTick] = useState(0);
					const directory = useMemo(() => {
						try {
							return getDirectory(sessionId);
						} catch {
							return null;
						}
					}, [sessionId, retryTick]);

					useEffect(() => {
						if (directory !== null) return undefined;
						const timer = window.setTimeout(() => setRetryTick((value) => value + 1), RETRY_MS);
						return () => window.clearTimeout(timer);
					}, [directory]);

					useEffect(() => {
						try {
							directory?.load?.()?.catch?.(() => {});
						} catch {
							/* Catalog load can fail before the Host connection settles; the store retries on its own. */
						}
					}, [directory]);

					const store = directory?.store ?? EMPTY_STORE;
					const subscribe = useMemo(() => (listener) => store.subscribe(listener), [store]);
					const snapshot = useMemo(() => () => store.getSnapshot(), [store]);
					const state = useSyncExternalStore(subscribe, snapshot, snapshot);

					const actual = props.turn?.data?.get?.('model-badge');
					const described = actual ? describe({ current: actual, groups: state.groups }) : describe(state);
					if (described === null) return null;
					const { modelName, effortName } = described;
					const label =
						effortName === undefined
							? t('badge.ariaPlain', { model: modelName })
							: t('badge.aria', { model: modelName, effort: effortName });
					return h(
						'div',
						{ className: actual ? 'mmb_row' : 'mmb_row mmb_fallback', title: label, 'aria-label': label, role: 'note' },
						h('span', { className: 'mmb_model' }, modelName),
						effortName === undefined ? null : h('span', { className: 'mmb_sep' }, '·'),
						effortName === undefined ? null : h('span', { className: 'mmb_effort' }, effortName),
					);
				}

				scope.effect(
					() =>
						scope.slots.inject('conversation.chat.turnTail', () =>
							scope.slots.register(
								{ name: 'conversation.chat.turnTail', id: 'message-model-badge', order: 15 },
								Badge,
							),
						),
					'message-model-badge: slot',
				);
			});
		}

		return { apply };
	},
});
