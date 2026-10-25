/**
 * Host half of the message model badge bundle.
 *
 * It keeps one session projection that records, for every turn, the exact
 * `provider / model / reasoningEffort` that turn's requests asked for. The
 * Client reads it through the projection face, so the badge never depends on
 * the composer's current selection and never touches Chat node assembly.
 *
 * The projection registry calls `stateSchema.parse` and `viewSchema.parse`
 * before serving a value; these pass-through schemas satisfy that contract
 * without importing the host schema package.
 */

/** Minimal schema contract used by the projection registry. */
const passthrough = { parse: (value) => value };

/** Fold durable session events into a per-turn model table. */
function fold(state, event) {
	if (event.type === 'turn/start') {
		const turn = event.data?.turn;
		if (typeof turn !== 'number') return state;
		if (state.currentTurn === turn) return state;
		/* Unchanged request headers are not logged, so a new turn inherits the last
		 * confirmed configuration; its own request/header (if any) overrides this.
		 * Without the inheritance, every unchanged turn reads as "unknown". */
		if (state.last === undefined || state.byTurn[turn] !== undefined) {
			return { ...state, currentTurn: turn };
		}
		return { ...state, currentTurn: turn, byTurn: { ...state.byTurn, [turn]: state.last } };
	}
	if (event.type === 'request/header') {
		const config = event.data?.header?.config;
		if (config === null || config === undefined || typeof config.model !== 'string') return state;
		const turn = state.currentTurn;
		if (turn === undefined) return state;
		const next = {
			provider: config.provider,
			model: config.model,
			reasoningEffort: config.reasoningEffort,
		};
		const previous = state.byTurn[turn];
		const recorded =
			previous !== undefined &&
			previous.provider === next.provider &&
			previous.model === next.model &&
			previous.reasoningEffort === next.reasoningEffort;
		const remembered =
			state.last !== undefined &&
			state.last.provider === next.provider &&
			state.last.model === next.model &&
			state.last.reasoningEffort === next.reasoningEffort;
		if (recorded && remembered) return state;
		return { ...state, byTurn: { ...state.byTurn, [turn]: next }, last: next };
	}
	return state;
}

export const inject = ['sessionProjections'];

export function apply(ctx) {
	const definition = {
		key: 'message-model-badge',
		stateVersion: 1,
		stateSchema: passthrough,
		init: () => ({ currentTurn: undefined, byTurn: {}, last: undefined }),
		apply: fold,
		wire: {
			viewSchema: passthrough,
			view: (state) => ({ byTurn: state.byTurn }),
		},
	};
	ctx.effect(() => ctx.sessionProjections.register(definition), 'message-model-badge: projection');
}
