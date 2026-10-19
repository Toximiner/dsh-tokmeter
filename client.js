window.__ModuleLoader__.load({
  id: 'dsh-tokmeter',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CSS =
      ".dsh-tokmeter-pill{box-sizing:border-box;border-radius:var(--dsw-radius-sm);max-width:100%;color:var(--dsw-alias-label-secondary);font:inherit;font-variant-numeric:tabular-nums;white-space:nowrap;background:0 0;align-items:center;gap:6px;padding:1px 8px;display:inline-flex;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))}" +
      ".dsh-tokmeter-pill svg{flex:none;width:14px;height:14px;color:#e8b339}";

    function installStyle() {
      if (typeof document === 'undefined') return;
      const tagId = 'dsh-tokmeter/pill.css';
      if (document.querySelector('style[data-plugin-css="' + tagId + '"]') !== null) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-tokmeter';
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /** Sum the visible character volume of a live partial's blocks. */
    function blockChars(partial) {
      let chars = 0;
      const blocks = partial && partial.blocks;
      if (!Array.isArray(blocks)) return 0;
      for (const block of blocks) {
        if (block === null || typeof block !== 'object') continue;
        if (block.kind === 'text' || block.kind === 'reasoning') {
          if (typeof block.text === 'string') chars += block.text.length;
        } else if (block.kind === 'tool-call') {
          if (typeof block.argsRaw === 'string') chars += block.argsRaw.length;
        }
      }
      return chars;
    }

    const LIGHTNING = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';

    /**
     * Live decode speed pill. `useChat` (injected per session by ui-chat)
     * re-renders this component on every stream delta; the effect below
     * turns the growing stream text into a smoothed tokens/second rate
     * (characters / 4 ≈ tokens). The reading lingers ~2.5 s after the
     * stream stops, then the pill hides.
     */
    const TokmeterPill = React.memo(function TokmeterPill({ useChat }) {
      const partial = useChat ? useChat((s) => s.legacy.partial) : null;
      const [rate, setRate] = React.useState(null);
      const sample = React.useRef(null);
      const hideTimer = React.useRef(null);

      React.useEffect(() => {
        installStyle();
        return () => {
          if (hideTimer.current !== null) clearTimeout(hideTimer.current);
        };
      }, []);

      React.useEffect(() => {
        if (hideTimer.current !== null) {
          clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }
        const now = Date.now();
        const st = sample.current ?? (sample.current = { chars: 0, time: now, ema: 0 });
        if (partial === null) {
          if (now - st.time > 2500) {
            setRate(null);
            sample.current = null;
          }
          return;
        }
        const chars = blockChars(partial);
        const dt = (now - st.time) / 1000;
        if (dt >= 0.05) {
          const inst = chars > st.chars ? (chars - st.chars) / 4 / dt : 0;
          st.ema = st.ema === 0 ? inst : st.ema * 0.7 + inst * 0.3;
          setRate(st.ema);
        }
        st.chars = chars;
        st.time = now;
        hideTimer.current = setTimeout(() => {
          setRate(null);
          sample.current = null;
          hideTimer.current = null;
        }, 2500);
      }, [partial]);

      if (rate === null || rate < 0.5) return null;
      return h('span', { className: 'dsh-tokmeter-pill', title: 'Live decode speed (estimated from stream text growth)' },
        h('svg', { viewBox: '0 0 24 24', width: '14', height: '14', 'aria-hidden': 'true', fill: 'currentColor' },
          h('path', { d: LIGHTNING })),
        h('span', { children: rate.toFixed(1) + ' tok/s' }));
    });

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register({ name: 'conversation.composer.dock', id: 'tokmeter', order: 2 }, TokmeterPill)
        );
      },
    };
  },
});
