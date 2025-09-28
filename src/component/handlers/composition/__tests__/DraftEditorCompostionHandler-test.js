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

import DraftEditor from 'DraftEditor.react';

const ContentBlock = require('ContentBlock');
const ContentState = require('ContentState');
const EditorState = require('EditorState');
const SelectionState = require('SelectionState');

const convertFromHTMLToContentBlocks = require('convertFromHTMLToContentBlocks');
const editOnCompositionStart = require('editOnCompositionStart');
const {Map} = require('immutable');

// DraftEditorComposition uses timers to detect duplicate `compositionend`
// events.
jest.useFakeTimers();

jest.mock('DOMObserver', () => {
  function DOMObserver() {}
  // $FlowFixMe[prop-missing]
  DOMObserver.prototype.start = jest.fn();
  // $FlowFixMe[prop-missing]
  DOMObserver.prototype.stopAndFlushMutations = jest
    .fn()
    .mockReturnValue(Map({}));
  return DOMObserver;
});
jest.mock('getContentEditableContainer');
jest.mock('getDraftEditorSelection', () => {
  return jest.fn().mockReturnValue({
    selectionState: SelectionState.createEmpty('anchor-key'),
  });
});

// The DraftEditorCompositionHandler contains some global state
// (internally used to make the code simpler given that only one
// composition can be happening at a given time), so to avoid
// false-positive failures stemming from test cases putting
// the module in a bad state we forcibly reload it each test.
let compositionHandler = null;
// Initialization of mock editor component that will be used for all tests
let editor = {
  _latestEditorState: EditorState,
  _onCompositionStart: (editor),
  _onKeyDown: JestMockFn,
  exitCurrentMode: JestMockFn,
  restoreEditorDOM: JestMockFn,
  setMode: JestMockFn,
  update: JestMockFn,
};

function getEditorState(
  blocks = (
    $TEMPORARY$object,
    $TEMPORARY$object,
    )
) {
  const contentBlocks = Object.keys(blocks).map(blockKey => {
    return new ContentBlock({
      key: blockKey,
      text: blocks[String(blockKey)],
    });
  });
  return EditorState.createWithContent(
    ContentState.createFromBlockArray(contentBlocks),
  );
}

function getEditorStateFromHTML(html) {
  const blocksFromHTML = convertFromHTMLToContentBlocks(html);
  const state =
    blocksFromHTML != null
      ? ContentState.createFromBlockArray(
          blocksFromHTML.contentBlocks || [],
          blocksFromHTML.entityMap,
        )
      : ContentState.createFromText('');
  return EditorState.createWithContent(state);
}

function editorTextContent() {
  return editor._latestEditorState.getCurrentContent().getPlainText();
}

function withGlobalGetSelectionAs(
  getSelectionValue,
  callback,
) {
  const oldGetSelection = global.getSelection;
  try {
    global.getSelection = () => getSelectionValue;
    callback();
  } finally {
    global.getSelection = oldGetSelection;
  }
}

beforeEach(() => {
  jest.resetModules();
  compositionHandler = require('DraftEditorCompositionHandler');
  editor = {
    _latestEditorState: EditorState.createEmpty(),
    _onCompositionStart: compositionHandler.onCompositionStart,
    _onKeyDown: jest.fn(),
    setMode: jest.fn(),
    restoreEditorDOM: jest.fn(),
    exitCurrentMode: jest.fn(),
    update: jest.fn(state => (editor._latestEditorState = state)),
  };
});

test('isInCompositionMode is properly updated on composition events', () => {
  // `inCompositionMode` is updated inside editOnCompositionStart,
  // which is why we can't just call compositionHandler.onCompositionStart.
  // $FlowExpectedError[incompatible-call]
  editOnCompositionStart(editor, {});
  expect(editor.setMode).toHaveBeenLastCalledWith('composite');
  expect(editor._latestEditorState.isInCompositionMode()).toBe(true);
  // $FlowExpectedError[incompatible-use]
  // $FlowExpectedError[incompatible-call]
  compositionHandler.onCompositionEnd(editor);
  jest.runAllTimers();
  expect(editor._latestEditorState.isInCompositionMode()).toBe(false);
  expect(editor.exitCurrentMode).toHaveBeenCalled();
});

test('Can handle a single mutation', () => {
  withGlobalGetSelectionAs({}, () => {
    editor._latestEditorState = getEditorState({blockKey0: ''});
    const mutations = Map({'blockKey0-0-0': '\u79c1'});
    // $FlowFixMe[method-unbinding] added when improving typing for this parameters
    require('DOMObserver').prototype.stopAndFlushMutations.mockReturnValue(
      mutations,
    );
    // $FlowExpectedError[incompatible-use]
    // $FlowExpectedError[incompatible-call]
    compositionHandler.onCompositionStart(editor);
    // $FlowExpectedError[incompatible-use]
    // $FlowExpectedError[incompatible-call]
    compositionHandler.onCompositionEnd(editor);
    jest.runAllTimers();

    expect(editorTextContent()).toBe('\u79c1');
  });
});

test('Can handle mutations in multiple blocks', () => {
  withGlobalGetSelectionAs({}, () => {
    editor._latestEditorState = getEditorState({
      blockKey0: 'react',
      blockKey1: 'draft',
    });
    const mutations = Map({
      'blockKey0-0-0': 'react.js',
      'blockKey1-0-0': 'draft.js',
    });
    // $FlowFixMe[method-unbinding] added when improving typing for this parameters
    require('DOMObserver').prototype.stopAndFlushMutations.mockReturnValue(
      mutations,
    );
    // $FlowExpectedError[incompatible-use]
    // $FlowExpectedError[incompatible-call]
    compositionHandler.onCompositionStart(editor);
    // $FlowExpectedError[incompatible-use]
    // $FlowExpectedError[incompatible-call]
    compositionHandler.onCompositionEnd(editor);
    jest.runAllTimers();

    expect(editorTextContent()).toBe('react.js\ndraft.js');
  });
});

test('Can handle mutations in the same block in multiple leaf nodes', () => {
  withGlobalGetSelectionAs({}, () => {
    const editorState = (editor._latestEditorState = getEditorStateFromHTML(
      '<div>react <b>draft</b> graphql</div>',
    ));
    const blockKey = editorState
      .getCurrentContent()
      .getBlockMap()
      .first()
      .getKey();
    const mutations = Map({
      [`${blockKey}-0-0`]: 'react-a ',
      [`${blockKey}-0-1`]: 'draft-bb',
      [`${blockKey}-0-2`]: ' graph-ql-ccc',
    });
    // $FlowFixMe[method-unbinding] added when improving typing for this parameters
    require('DOMObserver').prototype.stopAndFlushMutations.mockReturnValue(
      mutations,
    );
    // $FlowExpectedError[incompatible-use]
    // $FlowExpectedError[incompatible-call]
    compositionHandler.onCompositionStart(editor);
    // $FlowExpectedError[incompatible-use]
    // $FlowExpectedError[incompatible-call]
    compositionHandler.onCompositionEnd(editor);
    jest.runAllTimers();

    expect(editorTextContent()).toBe('react-a draft-bb graph-ql-ccc');
  });
});
