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

import {BlockDataMergeBehavior} from 'insertFragmentIntoContentState';
import {BlockMap} from 'BlockMap';
import ContentState from 'ContentState';
import {DraftBlockType} from 'DraftBlockType';
import {DraftInlineStyle} from 'DraftInlineStyle';
import {DraftRemovalDirection} from 'DraftRemovalDirection';
import {Map} from 'immutable';
import SelectionState from 'SelectionState';

const CharacterMetadata = require('CharacterMetadata');
const ContentStateInlineStyle = require('ContentStateInlineStyle');

const applyEntityToContentState = require('applyEntityToContentState');
const getCharacterRemovalRange = require('getCharacterRemovalRange');
const getContentStateFragment = require('getContentStateFragment');
const Immutable = require('immutable');
const insertFragmentIntoContentState = require('insertFragmentIntoContentState');
const insertTextIntoContentState = require('insertTextIntoContentState');
const invariant = require('invariant');
const modifyBlockForContentState = require('modifyBlockForContentState');
const removeEntitiesAtEdges = require('removeEntitiesAtEdges');
const removeRangeFromContentState = require('removeRangeFromContentState');
const splitBlockInContentState = require('splitBlockInContentState');

const {OrderedSet} = Immutable;

/**
 * `DraftModifier` provides a set of convenience methods that apply
 * modifications to a `ContentState` object based on a target `SelectionState`.
 *
 * Any change to a `ContentState` should be decomposable into a series of
 * transaction functions that apply the required changes and return output
 * `ContentState` objects.
 *
 * These functions encapsulate some of the most common transaction sequences.
 */
const DraftModifier = {
  replaceText(
    contentState,
    rangeToReplace,
    text,
    inlineStyle,
    entityKey,
  ) {
    const withoutEntities = removeEntitiesAtEdges(contentState, rangeToReplace);
    const withoutText = removeRangeFromContentState(
      withoutEntities,
      rangeToReplace,
    );

    const character = CharacterMetadata.create({
      style: inlineStyle || OrderedSet(),
      entity: entityKey || null,
    });

    return insertTextIntoContentState(
      withoutText,
      withoutText.getSelectionAfter(),
      text,
      character,
    );
  },

  insertText(
    contentState,
    targetRange,
    text,
    inlineStyle,
    entityKey,
  ) {
    invariant(
      targetRange.isCollapsed(),
      'Target range must be collapsed for `insertText`.',
    );
    return DraftModifier.replaceText(
      contentState,
      targetRange,
      text,
      inlineStyle,
      entityKey,
    );
  },

  moveText(
    contentState,
    removalRange,
    targetRange,
  ) {
    const movedFragment = getContentStateFragment(contentState, removalRange);

    const afterRemoval = DraftModifier.removeRange(
      contentState,
      removalRange,
      'backward',
    );

    return DraftModifier.replaceWithFragment(
      afterRemoval,
      targetRange,
      movedFragment,
    );
  },

  replaceWithFragment(
    contentState,
    targetRange,
    fragment,
    mergeBlockData = 'REPLACE_WITH_NEW_DATA',
  ) {
    const withoutEntities = removeEntitiesAtEdges(contentState, targetRange);
    const withoutText = removeRangeFromContentState(
      withoutEntities,
      targetRange,
    );

    return insertFragmentIntoContentState(
      withoutText,
      withoutText.getSelectionAfter(),
      fragment,
      mergeBlockData,
    );
  },

  removeRange(
    contentState,
    rangeToRemove,
    removalDirection,
  ) {
    let startKey, endKey, startBlock, endBlock;
    if (rangeToRemove.getIsBackward()) {
      rangeToRemove = rangeToRemove.merge({
        anchorKey: rangeToRemove.getFocusKey(),
        anchorOffset: rangeToRemove.getFocusOffset(),
        focusKey: rangeToRemove.getAnchorKey(),
        focusOffset: rangeToRemove.getAnchorOffset(),
        isBackward: false,
      });
    }
    startKey = rangeToRemove.getAnchorKey();
    endKey = rangeToRemove.getFocusKey();
    startBlock = contentState.getBlockForKey(startKey);
    endBlock = contentState.getBlockForKey(endKey);
    const startOffset = rangeToRemove.getStartOffset();
    const endOffset = rangeToRemove.getEndOffset();

    const startEntityKey = startBlock.getEntityAt(startOffset);
    const endEntityKey = endBlock.getEntityAt(endOffset - 1);

    // Check whether the selection state overlaps with a single entity.
    // If so, try to remove the appropriate substring of the entity text.
    if (startKey === endKey) {
      if (startEntityKey && startEntityKey === endEntityKey) {
        const adjustedRemovalRange = getCharacterRemovalRange(
          contentState.getEntityMap(),
          startBlock,
          endBlock,
          rangeToRemove,
          removalDirection,
        );
        return removeRangeFromContentState(contentState, adjustedRemovalRange);
      }
    }

    const withoutEntities = removeEntitiesAtEdges(contentState, rangeToRemove);
    return removeRangeFromContentState(withoutEntities, rangeToRemove);
  },

  splitBlock(
    contentState,
    selectionState,
  ) {
    const withoutEntities = removeEntitiesAtEdges(contentState, selectionState);
    const withoutText = removeRangeFromContentState(
      withoutEntities,
      selectionState,
    );

    return splitBlockInContentState(
      withoutText,
      withoutText.getSelectionAfter(),
    );
  },

  applyInlineStyle(
    contentState,
    selectionState,
    inlineStyle,
  ) {
    return ContentStateInlineStyle.add(
      contentState,
      selectionState,
      inlineStyle,
    );
  },

  removeInlineStyle(
    ContentState,
    selectionState,
    inlineStyle,
  ) {
    return ContentStateInlineStyle.remove(
      contentState,
      selectionState,
      inlineStyle,
    );
  },

  setBlockType(
    contentState,
    selectionState,
    blockType,
  ) {
    return modifyBlockForContentState(contentState, selectionState, block =>
      block.merge({type: blockType, depth: 0}),
    );
  },

  setBlockData(
    contentState,
    selectionState,
    blockData,
  ) {
    return modifyBlockForContentState(contentState, selectionState, block =>
      block.merge({data: blockData}),
    );
  },

  mergeBlockData(
    contentState,
    selectionState,
    blockData,
  ) {
    return modifyBlockForContentState(contentState, selectionState, block =>
      block.merge({data: block.getData().merge(blockData)}),
    );
  },

  applyEntity(
    contentState,
    selectionState,
    entityKey,
  ) {
    const withoutEntities = removeEntitiesAtEdges(contentState, selectionState);
    return applyEntityToContentState(
      withoutEntities,
      selectionState,
      entityKey,
    );
  },
};

module.exports = DraftModifier;
