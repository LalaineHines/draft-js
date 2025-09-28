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

const Immutable = require('immutable');

const {Record} = Immutable;

const defaultRecord = {
  anchorKey,
  anchorOffset,
  focusKey,
  focusOffset,
  isBackward,
  hasFocus,
  ...
} = {
  anchorKey: '',
  anchorOffset: 0,
  focusKey: '',
  focusOffset: 0,
  isBackward: false,
  hasFocus: false,
};

/* $FlowFixMe[unclear-type] This comment suppresses an error found when
 * automatically adding a type annotation with the codemod Komodo/Annotate_
 * exports. To see the error delete this comment and run Flow. */
const SelectionStateRecord = (Record(defaultRecord), any);

class SelectionState extends SelectionStateRecord {
  serialize() {
    return (
      'Anchor: ' +
      this.getAnchorKey() +
      ':' +
      this.getAnchorOffset() +
      ', ' +
      'Focus: ' +
      this.getFocusKey() +
      ':' +
      this.getFocusOffset() +
      ', ' +
      'Is Backward: ' +
      String(this.getIsBackward()) +
      ', ' +
      'Has Focus: ' +
      String(this.getHasFocus())
    );
  }

  getAnchorKey() {
    return this.get('anchorKey');
  }

  getAnchorOffset() {
    return this.get('anchorOffset');
  }

  getFocusKey() {
    return this.get('focusKey');
  }

  getFocusOffset() {
    return this.get('focusOffset');
  }

  getIsBackward() {
    return this.get('isBackward');
  }

  getHasFocus() {
    return this.get('hasFocus');
  }

  /**
   * Return whether the specified range overlaps with an edge of the
   * SelectionState.
   */
  hasEdgeWithin(blockKey, start, end) {
    const anchorKey = this.getAnchorKey();
    const focusKey = this.getFocusKey();

    if (anchorKey === focusKey && anchorKey === blockKey) {
      const selectionStart = this.getStartOffset();
      const selectionEnd = this.getEndOffset();
      return (
        (start <= selectionStart && selectionStart <= end) || // selectionStart is between start and end, or
        (start <= selectionEnd && selectionEnd <= end) // selectionEnd is between start and end
      );
    }

    if (blockKey !== anchorKey && blockKey !== focusKey) {
      return false;
    }

    const offsetToCheck =
      blockKey === anchorKey ? this.getAnchorOffset() : this.getFocusOffset();

    return start <= offsetToCheck && end >= offsetToCheck;
  }

  isCollapsed() {
    return (
      this.getAnchorKey() === this.getFocusKey() &&
      this.getAnchorOffset() === this.getFocusOffset()
    );
  }

  getStartKey() {
    return this.getIsBackward() ? this.getFocusKey() : this.getAnchorKey();
  }

  getStartOffset() {
    return this.getIsBackward()
      ? this.getFocusOffset()
      : this.getAnchorOffset();
  }

  getEndKey() {
    return this.getIsBackward() ? this.getAnchorKey() : this.getFocusKey();
  }

  getEndOffset() {
    return this.getIsBackward()
      ? this.getAnchorOffset()
      : this.getFocusOffset();
  }

  static createEmpty(key) {
    return new SelectionState({
      anchorKey: key,
      anchorOffset: 0,
      focusKey: key,
      focusOffset: 0,
      isBackward: false,
      hasFocus: false,
    });
  }
}

module.exports = SelectionState;
