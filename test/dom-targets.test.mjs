import test from 'node:test';
import assert from 'node:assert/strict';

import { dtFindChatBubbles } from '../src/core/dom-targets.js';

function makeNode({ testId = null, className = '', parent = null } = {}) {
  const node = {
    children: [],
    parentElement: parent,
    attributes: {},
    className,
    getAttribute(k) {
      return k === 'data-testid' ? testId : (this.attributes[k] ?? null);
    },
    closest(selector) {
      if (selector.includes('dt-none')) return null;
      let cur = this;
      while (cur) {
        if (
          (selector.includes('.agy-user-bubble-frame') && cur.className.includes('agy-user-bubble-frame')) ||
          (selector.includes('bg-card-border') && cur.className.includes('bg-card-border'))
        ) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    },
    contains(other) {
      if (other === this) return true;
      return this.children.some((c) => c.contains(other));
    }
  };
  if (parent) parent.children.push(node);
  return node;
}

test('dtFindChatBubbles selects tight .agy-user-bubble-frame over outer [data-testid="user-message"] row and preserves legacy turns', () => {
  const origDoc = globalThis.document;
  try {
    const outerTurn = makeNode({ testId: 'user-message' });
    const bubbleFrame = makeNode({ className: 'agy-user-bubble-frame relative p-px rounded-xl bg-card-border', parent: outerTurn });
    const innerBubble = makeNode({ testId: 'user-message-bubble', className: 'agy-user-bubble bg-card', parent: bubbleFrame });

    const legacyTurn = makeNode({ testId: 'user-message' });

    const allNodes = [outerTurn, bubbleFrame, innerBubble, legacyTurn];
    globalThis.document = {
      querySelectorAll(sel) {
        if (sel === '[data-testid="user-message-bubble"]') return [innerBubble];
        if (sel === '.agy-user-bubble-frame') return [bubbleFrame];
        if (sel === '[data-testid="user-message"]') return [outerTurn, legacyTurn];
        return allNodes.filter(() => false);
      }
    };

    const selected = dtFindChatBubbles({});
    assert.deepEqual(selected, [bubbleFrame, legacyTurn]);
    assert.equal(selected.includes(outerTurn), false, 'Must never style outer full-width user-message row when inner bubble exists');
  } finally {
    globalThis.document = origDoc;
  }
});
