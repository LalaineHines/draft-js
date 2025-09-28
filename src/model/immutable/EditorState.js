/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 * @oncall draft_js
 */

'use strict';

import {BlockMap} from 'BlockMap';
import {ContentStateRawType} from 'ContentStateRawType';
import {DecoratorRangeRawType} from 'BlockTree';
import {DraftDecoratorType} from 'DraftDecoratorType';
import {DraftInlineStyle} from 'DraftInlineStyle';
import {EditorChangeType} from 'EditorChangeType';
import {EntityMap} from 'EntityMap';

const BlockTree = require('BlockTree');
const ContentState = require('ContentState');
const EditorBidiService = require('EditorBidiService');
const SelectionState = require('SelectionState');

const Immutable = require('immutable');

const {OrderedSet, Record, Stack, OrderedMap, List} = Immutable;

// When configuring an editor, the user can chose to provide or not provide
// basically all keys. `currentContent` varies, so this type doesn't include it.
// (See the types defined below.)
const BaseEditorStateConfig = {
  allowUndo: boolean,
  decorator: DraftDecoratorType,
  directionMap: OrderedMap,
  forceSelection: boolean,
  inCompositionMode: boolean,
  inlineStyleOverride: DraftInlineStyle,
  lastChangeType: EditorChangeType,
  nativelyRenderedContent: ContentState,
  redoStack: Stack,
  selection: SelectionState,
  treeMap: OrderedMap,
  undoStack: Stack,
};

const BaseEditorStateRawConfig = {
  allowUndo: boolean,
  decorator: DraftDecoratorType,
  directionMap,
  forceSelection: boolean,
  inCompositionMode: boolean,
  inlineStyleOverride: Array,
  lastChangeType: EditorChangeType,
  nativelyRenderedContent: ContentStateRawType,
  redoStack: Array,
  selection,
  treeMap: Map,
  undoStack: Array,
};

// When crating an editor, we want currentContent to be set.
const EditorStateCreationConfigType = {
  ...BaseEditorStateConfig,
  currentContent: ContentState,
};

const EditorStateCreationConfigRawType = {
  ...BaseEditorStateRawConfig,
  currentContent: ContentStateRawType,
};

// When using EditorState.set(...), currentContent is optional
const EditorStateChangeConfigType = {
  ...BaseEditorStateConfig,
  currentContent: ContentState,
};

const EditorStateRecordType = {
  allowUndo: boolean,
  currentContent: ContentState,
  decorator: DraftDecoratorType,
  directionMap: OrderedMap,
  forceSelection: boolean,
  inCompositionMode: boolean,
  inlineStyleOverride: DraftInlineStyle,
  lastChangeType: EditorChangeType,
  nativelyRenderedContent: ContentState,
  redoStack: Stack,
  selection: SelectionState,
  treeMap: OrderedMap,
  undoStack: Stack,
};

const defaultRecord = {
  allowUndo: true,
  currentContent: null,
  decorator: null,
  directionMap: null,
  forceSelection: false,
  inCompositionMode: false,
  inlineStyleOverride: null,
  lastChangeType: null,
  nativelyRenderedContent: null,
  redoStack: Stack(),
  selection: null,
  treeMap: null,
  undoStack: Stack(),
};

const EditorStateRecord = (Record(defaultRecord), any);

class EditorState {
  // $FlowFixMe[value-as-type]
  _immutable;

  static createEmpty(decorator) {
    return this.createWithText('', decorator);
  }

  static createWithText(
    text,
    decorator,
  ) {
    return EditorState.createWithContent(
      ContentState.createFromText(text),
      decorator,
    );
  }

  static createWithContent(
    contentState,
    decorator,
  ) {
    if (contentState.getBlockMap().count() === 0) {
      return EditorState.createEmpty(decorator);
    }
    const firstKey = contentState.getBlockMap().first().getKey();
    return EditorState.create({
      currentContent: contentState,
      undoStack: Stack(),
      redoStack: Stack(),
      decorator: decorator || null,
      selection: SelectionState.createEmpty(firstKey),
    });
  }

  static create(config) {
    const {currentContent, decorator} = config;
    const recordConfig = {
      ...config,
      treeMap: generateNewTreeMap(currentContent, decorator),
      directionMap: EditorBidiService.getDirectionMap(currentContent),
    };
    return new EditorState(new EditorStateRecord(recordConfig));
  }

  static fromJS(config) {
    return new EditorState(
      new EditorStateRecord({
        ...config,
        directionMap:
          config.directionMap != null
            ? OrderedMap(config.directionMap)
            : config.directionMap,
        inlineStyleOverride:
          config.inlineStyleOverride != null
            ? OrderedSet(config.inlineStyleOverride)
            : config.inlineStyleOverride,
        nativelyRenderedContent:
          config.nativelyRenderedContent != null
            ? ContentState.fromJS(config.nativelyRenderedContent)
            : config.nativelyRenderedContent,
        redoStack:
          config.redoStack != null
            ? Stack(config.redoStack.map(v => ContentState.fromJS(v)))
            : config.redoStack,
        selection:
          config.selection != null
            ? new SelectionState(config.selection)
            : config.selection,
        treeMap:
          config.treeMap != null
            ? OrderedMap(config.treeMap).map(v =>
                List(v).map(v => BlockTree.fromJS(v)),
              )
            : config.treeMap,
        undoStack:
          config.undoStack != null
            ? Stack(config.undoStack.map(v => ContentState.fromJS(v)))
            : config.undoStack,
        currentContent: ContentState.fromJS(config.currentContent),
      }),
    );
  }

  static set(
    editorState,
    put,
  ) {
    const map = editorState.getImmutable().withMutations(state => {
      const existingDecorator = state.get('decorator');
      let decorator = existingDecorator;
      if (put.decorator === null) {
        decorator = null;
      } else if (put.decorator) {
        decorator = put.decorator;
      }

      const newContent = put.currentContent || editorState.getCurrentContent();

      if (decorator !== existingDecorator) {
        const treeMap = state.get('treeMap');
        let newTreeMap;
        if (decorator && existingDecorator) {
          newTreeMap = regenerateTreeForNewDecorator(
            newContent,
            newContent.getBlockMap(),
            treeMap,
            decorator,
            existingDecorator,
          );
        } else {
          newTreeMap = generateNewTreeMap(newContent, decorator);
        }

        state.merge({
          decorator,
          treeMap: newTreeMap,
          nativelyRenderedContent: null,
        });
        return;
      }

      const existingContent = editorState.getCurrentContent();
      if (newContent !== existingContent) {
        state.set(
          'treeMap',
          regenerateTreeForNewBlocks(
            editorState,
            newContent.getBlockMap(),
            newContent.getEntityMap(),
            decorator,
          ),
        );
      }

      state.merge(put);
    });

    return new EditorState(map);
  }

  toJS() {
    return this.getImmutable().toJS();
  }

  getAllowUndo() {
    return this.getImmutable().get('allowUndo');
  }

  getCurrentContent() {
    return this.getImmutable().get('currentContent');
  }

  getUndoStack() {
    return this.getImmutable().get('undoStack');
  }

  getRedoStack() {
    return this.getImmutable().get('redoStack');
  }

  getSelection() {
    return this.getImmutable().get('selection');
  }

  getDecorator() {
    return this.getImmutable().get('decorator');
  }

  isInCompositionMode() {
    return this.getImmutable().get('inCompositionMode');
  }

  mustForceSelection() {
    return this.getImmutable().get('forceSelection');
  }

  getNativelyRenderedContent() {
    return this.getImmutable().get('nativelyRenderedContent');
  }

  getLastChangeType() {
    return this.getImmutable().get('lastChangeType');
  }

  /**
   * While editing, the user may apply inline style commands with a collapsed
   * cursor, intending to type text that adopts the specified style. In this
   * case, we track the specified style as an "override" that takes precedence
   * over the inline style of the text adjacent to the cursor.
   *
   * If null, there is no override in place.
   */
  getInlineStyleOverride() {
    return this.getImmutable().get('inlineStyleOverride');
  }

  static setInlineStyleOverride(
    editorState,
    inlineStyleOverride,
  ) {
    return EditorState.set(editorState, {inlineStyleOverride});
  }

  /**
   * Get the appropriate inline style for the editor state. If an
   * override is in place, use it. Otherwise, the current style is
   * based on the location of the selection state.
   */
  getCurrentInlineStyle() {
    const override = this.getInlineStyleOverride();
    if (override != null) {
      return override;
    }

    const content = this.getCurrentContent();
    const selection = this.getSelection();

    if (selection.isCollapsed()) {
      return getInlineStyleForCollapsedSelection(content, selection);
    }

    return getInlineStyleForNonCollapsedSelection(content, selection);
  }

  getBlockTree(blockKey) {
    return this.getImmutable().getIn(['treeMap', blockKey]);
  }

  isSelectionAtStartOfContent() {
    const firstKey = this.getCurrentContent().getBlockMap().first().getKey();
    return this.getSelection().hasEdgeWithin(firstKey, 0, 0);
  }

  isSelectionAtEndOfContent() {
    const content = this.getCurrentContent();
    const blockMap = content.getBlockMap();
    const last = blockMap.last();
    const end = last.getLength();
    return this.getSelection().hasEdgeWithin(last.getKey(), end, end);
  }

  getDirectionMap() {
    return this.getImmutable().get('directionMap');
  }

  /**
   * Incorporate native DOM selection changes into the EditorState. This
   * method can be used when we simply want to accept whatever the DOM
   * has given us to represent selection, and we do not need to re-render
   * the editor.
   *
   * To forcibly move the DOM selection, see `EditorState.forceSelection`.
   */
  static acceptSelection(
    editorState,
    selection,
  ) {
    return updateSelection(editorState, selection, false);
  }

  /**
   * At times, we need to force the DOM selection to be where we
   * need it to be. This can occur when the anchor or focus nodes
   * are non-text nodes, for instance. In this case, we want to trigger
   * a re-render of the editor, which in turn forces selection into
   * the correct place in the DOM. The `forceSelection` method
   * accomplishes this.
   *
   * This method should be used in cases where you need to explicitly
   * move the DOM selection from one place to another without a change
   * in ContentState.
   */
  static forceSelection(
    editorState,
    selection,
  ) {
    if (!selection.getHasFocus()) {
      selection = selection.set('hasFocus', true);
    }
    return updateSelection(editorState, selection, true);
  }

  /**
   * Move selection to the end of the editor without forcing focus.
   */
  static moveSelectionToEnd(editorState) {
    const content = editorState.getCurrentContent();
    const lastBlock = content.getLastBlock();
    const lastKey = lastBlock.getKey();
    const length = lastBlock.getLength();

    return EditorState.acceptSelection(
      editorState,
      new SelectionState({
        anchorKey: lastKey,
        anchorOffset: length,
        focusKey: lastKey,
        focusOffset: length,
        isBackward: false,
      }),
    );
  }

  /**
   * Force focus to the end of the editor. This is useful in scenarios
   * where we want to programmatically focus the input and it makes sense
   * to allow the user to continue working seamlessly.
   */
  static moveFocusToEnd(editorState) {
    const afterSelectionMove = EditorState.moveSelectionToEnd(editorState);
    return EditorState.forceSelection(
      afterSelectionMove,
      afterSelectionMove.getSelection(),
    );
  }

  /**
   * Push the current ContentState onto the undo stack if it should be
   * considered a boundary state, and set the provided ContentState as the
   * new current content.
   */
  static push(
    editorState,
    contentState,
    changeType,
    forceSelection = true,
  ) {
    if (editorState.getCurrentContent() === contentState) {
      return editorState;
    }

    const directionMap = EditorBidiService.getDirectionMap(
      contentState,
      editorState.getDirectionMap(),
    );

    if (!editorState.getAllowUndo()) {
      return EditorState.set(editorState, {
        currentContent: contentState,
        directionMap,
        lastChangeType: changeType,
        selection: contentState.getSelectionAfter(),
        forceSelection,
        inlineStyleOverride: null,
      });
    }

    const selection = editorState.getSelection();
    const currentContent = editorState.getCurrentContent();
    let undoStack = editorState.getUndoStack();
    let newContent = contentState;

    if (
      selection !== currentContent.getSelectionAfter() ||
      mustBecomeBoundary(editorState, changeType)
    ) {
      undoStack = undoStack.push(currentContent);
      newContent = newContent.setSelectionBefore(selection);
    } else if (
      changeType === 'insert-characters' ||
      changeType === 'backspace-character' ||
      changeType === 'delete-character'
    ) {
      // Preserve the previous selection.
      newContent = newContent.setSelectionBefore(
        currentContent.getSelectionBefore(),
      );
    }

    let inlineStyleOverride = editorState.getInlineStyleOverride();

    // Don't discard inline style overrides for the following change types:
    const overrideChangeTypes = [
      'adjust-depth',
      'change-block-type',
      'split-block',
    ];

    if (overrideChangeTypes.indexOf(changeType) === -1) {
      inlineStyleOverride = null;
    }

    const editorStateChanges = {
      currentContent: newContent,
      directionMap,
      undoStack,
      redoStack: Stack(),
      lastChangeType: changeType,
      selection: contentState.getSelectionAfter(),
      forceSelection,
      inlineStyleOverride,
    };

    return EditorState.set(editorState, editorStateChanges);
  }

  /**
   * Make the top ContentState in the undo stack the new current content and
   * push the current content onto the redo stack.
   */
  static undo(editorState) {
    if (!editorState.getAllowUndo()) {
      return editorState;
    }

    const undoStack = editorState.getUndoStack();
    const newCurrentContent = undoStack.peek();
    if (!newCurrentContent) {
      return editorState;
    }

    const currentContent = editorState.getCurrentContent();
    const directionMap = EditorBidiService.getDirectionMap(
      newCurrentContent,
      editorState.getDirectionMap(),
    );

    return EditorState.set(editorState, {
      currentContent: newCurrentContent,
      directionMap,
      undoStack: undoStack.shift(),
      redoStack: editorState.getRedoStack().push(currentContent),
      forceSelection: true,
      inlineStyleOverride: null,
      lastChangeType: 'undo',
      nativelyRenderedContent: null,
      selection: currentContent.getSelectionBefore(),
    });
  }

  /**
   * Make the top ContentState in the redo stack the new current content and
   * push the current content onto the undo stack.
   */
  static redo(editorState) {
    if (!editorState.getAllowUndo()) {
      return editorState;
    }

    const redoStack = editorState.getRedoStack();
    const newCurrentContent = redoStack.peek();
    if (!newCurrentContent) {
      return editorState;
    }

    const currentContent = editorState.getCurrentContent();
    const directionMap = EditorBidiService.getDirectionMap(
      newCurrentContent,
      editorState.getDirectionMap(),
    );

    return EditorState.set(editorState, {
      currentContent: newCurrentContent,
      directionMap,
      undoStack: editorState.getUndoStack().push(currentContent),
      redoStack: redoStack.shift(),
      forceSelection: true,
      inlineStyleOverride: null,
      lastChangeType: 'redo',
      nativelyRenderedContent: null,
      selection: newCurrentContent.getSelectionAfter(),
    });
  }

  /**
   * Not for public consumption.
   */
  // $FlowFixMe[value-as-type]
  constructor(immutable) {
    this._immutable = immutable;
  }

  /**
   * Not for public consumption.
   */
  // $FlowFixMe[value-as-type]
  getImmutable() {
    return this._immutable;
  }
}

/**
 * Set the supplied SelectionState as the new current selection, and set
 * the `force` flag to trigger manual selection placement by the view.
 */
function updateSelection(
  editorState,
  selection,
  forceSelection,
) {
  return EditorState.set(editorState, {
    selection,
    forceSelection,
    nativelyRenderedContent: null,
    inlineStyleOverride: null,
  });
}

/**
 * Regenerate the entire tree map for a given ContentState and decorator.
 * Returns an OrderedMap that maps all available ContentBlock objects.
 */
function generateNewTreeMap(
  contentState,
  decorator,
) {
  return contentState
    .getBlockMap()
    .map(block => BlockTree.generate(contentState, block, decorator))
    .toOrderedMap();
}

/**
 * Regenerate tree map objects for all ContentBlocks that have changed
 * between the current editorState and newContent. Returns an OrderedMap
 * with only changed regenerated tree map objects.
 */
function regenerateTreeForNewBlocks(
  editorState,
  newBlockMap,
  newEntityMap,
  decorator,
) {
  const contentState = editorState
    .getCurrentContent()
    .replaceEntityMap(newEntityMap);
  const prevBlockMap = contentState.getBlockMap();
  const prevTreeMap = editorState.getImmutable().get('treeMap');
  return prevTreeMap.merge(
    newBlockMap
      .toSeq()
      .filter((block, key) => block !== prevBlockMap.get(key))
      .map(block => BlockTree.generate(contentState, block, decorator)),
  );
}

/**
 * Generate tree map objects for a new decorator object, preserving any
 * decorations that are unchanged from the previous decorator.
 *
 * Note that in order for this to perform optimally, decoration Lists for
 * decorators should be preserved when possible to allow for direct immutable
 * List comparison.
 */
function regenerateTreeForNewDecorator(
  content,
  blockMap,
  previousTreeMap,
  decorator,
  existingDecorator,
) {
  return previousTreeMap.merge(
    blockMap
      .toSeq()
      .filter(block => {
        return (
          decorator.getDecorations(block, content) !==
          existingDecorator.getDecorations(block, content)
        );
      })
      .map(block => BlockTree.generate(content, block, decorator)),
  );
}

/**
 * Return whether a change should be considered a boundary state, given
 * the previous change type. Allows us to discard potential boundary states
 * during standard typing or deletion behavior.
 */
function mustBecomeBoundary(
  editorState,
  changeType,
) {
  const lastChangeType = editorState.getLastChangeType();
  return (
    changeType !== lastChangeType ||
    (changeType !== 'insert-characters' &&
      changeType !== 'backspace-character' &&
      changeType !== 'delete-character')
  );
}

function getInlineStyleForCollapsedSelection(
  content,
  selection,
) {
  const startKey = selection.getStartKey();
  const startOffset = selection.getStartOffset();
  const startBlock = content.getBlockForKey(startKey);

  // If the cursor is not at the start of the block, look backward to
  // preserve the style of the preceding character.
  if (startOffset > 0) {
    return startBlock.getInlineStyleAt(startOffset - 1);
  }

  // The caret is at position zero in this block. If the block has any
  // text at all, use the style of the first character.
  if (startBlock.getLength()) {
    return startBlock.getInlineStyleAt(0);
  }

  // Otherwise, look upward in the document to find the closest character.
  return lookUpwardForInlineStyle(content, startKey);
}

function getInlineStyleForNonCollapsedSelection(
  content,
  selection,
) {
  const startKey = selection.getStartKey();
  const startOffset = selection.getStartOffset();
  const startBlock = content.getBlockForKey(startKey);

  // If there is a character just inside the selection, use its style.
  if (startOffset < startBlock.getLength()) {
    return startBlock.getInlineStyleAt(startOffset);
  }

  // Check if the selection at the end of a non-empty block. Use the last
  // style in the block.
  if (startOffset > 0) {
    return startBlock.getInlineStyleAt(startOffset - 1);
  }

  // Otherwise, look upward in the document to find the closest character.
  return lookUpwardForInlineStyle(content, startKey);
}

function lookUpwardForInlineStyle(
  content,
  fromKey,
) {
  const lastNonEmpty = content
    .getBlockMap()
    .reverse()
    .skipUntil((_, k) => k === fromKey)
    .skip(1)
    .skipUntil((block, _) => block.getLength())
    .first();

  if (lastNonEmpty) {
    return lastNonEmpty.getInlineStyleAt(lastNonEmpty.getLength() - 1);
  }
  return OrderedSet();
}

module.exports = EditorState;
