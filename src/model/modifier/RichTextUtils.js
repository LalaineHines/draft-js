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

import ContentState from 'ContentState';
import {DraftBlockType} from 'DraftBlockType';
import {DraftEditorCommand} from 'DraftEditorCommand';
import EditorState from 'EditorState';
import SelectionState from 'SelectionState';
import URI from 'URI';

export const DataObjectForLink = {url: string, ...};

export const RichTextUtils = {
  currentBlockContainsLink: (editorState) => boolean,
  getCurrentBlockType: (editorState) => DraftBlockType,
  getDataObjectForLinkURL: (uri) => DataObjectForLink,
  handleKeyCommand: (
    editorState,
    command,
  ) => EditorState,
  insertSoftNewline: (editorState) => EditorState,
  onBackspace: (editorState) => EditorState,
  onDelete: (editorState) => EditorState,
  onTab: (
    event,
    editorState,
  ) => EditorState,
  toggleBlockType: (
    editorState,
    blockType,
  ) => EditorState,
  toggleCode: (editorState) => EditorState,
  toggleInlineStyle: (
    editorState,
    inlineStyle,
  ) => EditorState,
  toggleLink: (
    editorState,
    targetSelection,
    entityKey,
  ) => EditorState,
  tryToRemoveBlockStyle: (editorState) => ContentState,
};
