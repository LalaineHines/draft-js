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
import {BlockNodeRawConfig} from 'BlockNode';
import {BlockNodeRecord} from 'BlockNodeRecord';
import {ContentStateRawType} from 'ContentStateRawType';
import DraftEntityInstance from 'DraftEntityInstance';
import {DraftEntityMutability} from 'DraftEntityMutability';
import {DraftEntityType} from 'DraftEntityType';
import {EntityMap} from 'EntityMap';

const BlockMapBuilder = require('BlockMapBuilder');
const CharacterMetadata = require('CharacterMetadata');
const ContentBlock = require('ContentBlock');
const ContentBlockNode = require('ContentBlockNode');
const DraftEntity = require('DraftEntity');
const SelectionState = require('SelectionState');

const generateRandomKey = require('generateRandomKey');
const getOwnObjectValues = require('getOwnObjectValues');
const gkx = require('gkx');
const Immutable = require('immutable');
const sanitizeDraftText = require('sanitizeDraftText');

const {List, Record, Repeat, Map: ImmutableMap, OrderedMap} = Immutable;

const ContentStateRecordType = {
  entityMap: any,
  blockMap: BlockMap,
  selectionBefore: SelectionState,
  selectionAfter: SelectionState,
};

const defaultRecord = {
  entityMap: null,
  blockMap: null,
  selectionBefore: null,
  selectionAfter: null,
};

// Immutable 3 typedefs are not good, so ContentState ends up
// subclassing `any`. Define a rudimentary type for the
// supercalss here instead.
class ContentStateRecordHelper {
  ContentState;
  args;
  value;
  boolean;
  ContentState;
}

const ContentStateRecord = (Record(
  defaultRecord,
), any);

/* $FlowFixMe[signature-verification-failure] Supressing a `signature-
 * verification-failure` error here. TODO: T65949050 Clean up the branch for
 * this GK */
const ContentBlockNodeRecord = gkx('draft_tree_data_support')
  ? ContentBlockNode
  : ContentBlock;

class ContentState extends ContentStateRecord {
  getEntityMap() {
    // TODO: update this when we fully remove DraftEntity
    return DraftEntity;
  }

  getBlockMap() {
    // $FlowFixMe[prop-missing] found when removing casts of this to any
    return this.get('blockMap');
  }

  getSelectionBefore() {
    // $FlowFixMe[prop-missing] found when removing casts of this to any
    return this.get('selectionBefore');
  }

  getSelectionAfter() {
    // $FlowFixMe[prop-missing] found when removing casts of this to any
    return this.get('selectionAfter');
  }

  getBlockForKey(key) {
    const block = this.getBlockMap().get(key);
    return block;
  }

  getKeyBefore(key) {
    return this.getBlockMap()
      .reverse()
      .keySeq()
      .skipUntil(v => v === key)
      .skip(1)
      .first();
  }

  getKeyAfter(key) {
    return this.getBlockMap()
      .keySeq()
      .skipUntil(v => v === key)
      .skip(1)
      .first();
  }

  getBlockAfter(key) {
    return this.getBlockMap()
      .skipUntil((_, k) => k === key)
      .skip(1)
      .first();
  }

  getBlockBefore(key) {
    return this.getBlockMap()
      .reverse()
      .skipUntil((_, k) => k === key)
      .skip(1)
      .first();
  }

  getBlocksAsArray() {
    return this.getBlockMap().toArray();
  }

  getFirstBlock() {
    return this.getBlockMap().first();
  }

  getLastBlock() {
    return this.getBlockMap().last();
  }

  getPlainText(delimiter) {
    return this.getBlockMap()
      .map(block => {
        return block ? block.getText() : '';
      })
      .join(delimiter || '\n');
  }

  getLastCreatedEntityKey() {
    // TODO: update this when we fully remove DraftEntity
    return DraftEntity.__getLastCreatedEntityKey();
  }

  hasText() {
    const blockMap = this.getBlockMap();
    return (
      blockMap.size > 1 ||
      // make sure that there are no zero width space chars
      escape(blockMap.first().getText()).replace(/%u200B/g, '').length > 0
    );
  }

  createEntity(
    type,
    data,
  ) {
    // TODO: update this when we fully remove DraftEntity
    DraftEntity.__create(type, mutability, data);
    return this;
  }

  constructor (
    key,
    toMerge,
  ) {
    // TODO: update this when we fully remove DraftEntity
    DraftEntity.__mergeData(key, toMerge);
    return this;
  }

  replaceEntityData(
    key,
    newData,
  ) {
    // TODO: update this when we fully remove DraftEntity
    /* $FlowFixMe[class-object-subtyping] added when improving typing for this
     * parameters */
    DraftEntity.__replaceData(key, newData);
    return this;
  }

  addEntity(instance) {
    // TODO: update this when we fully remove DraftEntity
    DraftEntity.__add(instance);
    return this;
  }

  getEntity(key) {
    // TODO: update this when we fully remove DraftEntity
    return DraftEntity.__get(key);
  }

  getAllEntities() {
    return DraftEntity.__getAll();
  }

  setEntityMap(
    entityMap,
  ) {
    DraftEntity.__loadWithEntities(entityMap);
    return this;
  }

  static mergeEntityMaps(
    to,
    from,
  ) {
    return to.merge(from.__getAll());
  }

  // TODO: when EntityMap is moved into content state this and `setEntityMap`
  // Will be the exact same. Merge them then.
  replaceEntityMap(entityMap) {
    return this.setEntityMap(entityMap.__getAll());
  }

  setSelectionBefore(selection) {
    // $FlowFixMe[prop-missing] found when removing casts of this to any
    return this.set('selectionBefore', selection);
  }

  setSelectionAfter(selection) {
    // $FlowFixMe[prop-missing] found when removing casts of this to any
    return this.set('selectionAfter', selection);
  }

  setBlockMap(blockMap) {
    // $FlowFixMe[prop-missing] found when removing casts of this to any
    return this.set('blockMap', blockMap);
  }

  static createFromBlockArray(
    // TODO: update flow type when we completely deprecate the old entity API
    blocks,
    entityMap,
  ) {
    // TODO: remove this when we completely deprecate the old entity API
    const theBlocks = Array.isArray(blocks) ? blocks : blocks.contentBlocks;
    const blockMap = BlockMapBuilder.createFromArray(theBlocks);
    const selectionState = blockMap.isEmpty()
      ? new SelectionState()
      : SelectionState.createEmpty(blockMap.first().getKey());
    return new ContentState({
      blockMap,
      entityMap: entityMap || DraftEntity,
      selectionBefore: selectionState,
      selectionAfter: selectionState,
    });
  }

  static createFromText(
    text,
    delimiter = /\r\n?|\n/g,
  ) {
    const strings = text.split(delimiter);
    const blocks = strings.map(block => {
      block = sanitizeDraftText(block);
      return new ContentBlockNodeRecord({
        key: generateRandomKey(),
        text: block,
        type: 'unstyled',
        characterList: List(Repeat(CharacterMetadata.EMPTY, block.length)),
      });
    });
    return ContentState.createFromBlockArray(blocks);
  }

  static fromJS(state) {
    return new ContentState({
      ...state,
      blockMap: OrderedMap(state.blockMap).map(
        // $FlowFixMe[method-unbinding]
        ContentState.createContentBlockFromJS,
      ),
      selectionBefore: new SelectionState(state.selectionBefore),
      selectionAfter: new SelectionState(state.selectionAfter),
    });
  }

  static createContentBlockFromJS(
    block,
  ) {
    const characterList = block.characterList;

    return new ContentBlockNodeRecord({
      ...block,
      data: ImmutableMap(block.data),
      characterList:
        characterList != null
          ? List(
              (Array.isArray(characterList)
                ? characterList
                : getOwnObjectValues(characterList)
              ).map(c => CharacterMetadata.fromJS(c)),
            )
          : undefined,
    });
  }
}

module.exports = ContentState;
