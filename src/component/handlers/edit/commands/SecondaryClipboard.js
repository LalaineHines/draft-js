/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 * @oncall draft_js
 */

'use strict';

import {BlockMap} from 'BlockMap';
import SelectionState from 'SelectionState';

const DraftModifier = require('DraftModifier');
const EditorState = require('EditorState');

const getContentStateFragment = require('getContentStateFragment');
const nullThrows = require('nullThrows');

let clipboard = null;

/**
 * Some systems offer a "secondary" clipboard to allow quick internal cut
 * and paste behavior. For instance, Ctrl+K (cut) and Ctrl+Y (paste).
 */
const SecondaryClipboard = {
  cut(editorState) {
    const content = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    let targetRange = null;

    if (selection.isCollapsed()) {
      const anchorKey = selection.getAnchorKey();
      const blockEnd = content.getBlockForKey(anchorKey).getLength();

      if (blockEnd === selection.getAnchorOffset()) {
        const keyAfter = content.getKeyAfter(anchorKey);
        if (keyAfter == null) {
          return editorState;
        }
        targetRange = selection.set('focusKey', keyAfter).set('focusOffset', 0);
      } else {
        targetRange = selection.set('focusOffset', blockEnd);
      }
    } else {
      targetRange = selection;
    }

    targetRange = nullThrows(targetRange);
    // TODO: This should actually append to the current state when doing
    // successive ^K commands without any other cursor movement
    clipboard = getContentStateFragment(content, targetRange);

    const afterRemoval = DraftModifier.removeRange(
      content,
      targetRange,
      'forward',
    );

    if (afterRemoval === content) {
      return editorState;
    }

    return EditorState.push(editorState, afterRemoval, 'remove-range');
  },

  paste(editorState) {
    if (!clipboard) {
      return editorState;
    }

    const newContent = DraftModifier.replaceWithFragment(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      // $FlowFixMe[incompatible-call]
      clipboard,
    );

    return EditorState.push(editorState, newContent, 'insert-fragment');
  },
};

module.exports = SecondaryClipboard;
