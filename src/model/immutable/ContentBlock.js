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

import {BlockNode, BlockNodeConfig, BlockNodeKey} from 'BlockNode';

import {DraftBlockType} from 'DraftBlockType';
import {DraftInlineStyle} from 'DraftInlineStyle';

const CharacterMetadata = require('CharacterMetadata');

const findRangesImmutable = require('findRangesImmutable');
const Immutable = require('immutable');

const {List, Map, OrderedSet, Record, Repeat} = Immutable;

const EMPTY_SET = OrderedSet();

const defaultRecord = {
  key: '',
  type: 'unstyled',
  text: '',
  characterList: List(),
  depth: 0,
  data: Map(),
};

const ContentBlockRecord = (Record(defaultRecord), any);

const decorateCharacterList = (config) => {
  if (!config) {
    return config;
  }

  const {characterList, text} = config;

  if (text && !characterList) {
    config.characterList = List(Repeat(CharacterMetadata.EMPTY, text.length));
  }

  return config;
};

class ContentBlock extends ContentBlockRecord {
  constructor(config) {
    super(decorateCharacterList(config));
  }

  // $FlowFixMe[method-unbinding]
  getKey() {
    return this.get('key');
  }

  // $FlowFixMe[method-unbinding]
  getType() {
    return this.get('type');
  }

  // $FlowFixMe[method-unbinding]
  getText() {
    return this.get('text');
  }

  // $FlowFixMe[method-unbinding]
  getCharacterList() {
    return this.get('characterList');
  }

  // $FlowFixMe[method-unbinding]
  getLength() {
    return this.getText().length;
  }

  // $FlowFixMe[method-unbinding]
  getDepth() {
    return this.get('depth');
  }

  // $FlowFixMe[method-unbinding]
  getData() {
    return this.get('data');
  }

  // $FlowFixMe[method-unbinding]
  getInlineStyleAt(offset) {
    const character = this.getCharacterList().get(offset);
    return character ? character.getStyle() : EMPTY_SET;
  }

  // $FlowFixMe[method-unbinding]
  getEntityAt(offset) {
    const character = this.getCharacterList().get(offset);
    return character ? character.getEntity() : null;
  }

  /**
   * Execute a callback for every contiguous range of styles within the block.
   */
  // $FlowFixMe[method-unbinding]
  findStyleRanges(
    filterFn,
    callback,
  ) {
    findRangesImmutable(
      this.getCharacterList(),
      haveEqualStyle,
      filterFn,
      callback,
    );
  }

  /**
   * Execute a callback for every contiguous range of entities within the block.
   */
  // $FlowFixMe[method-unbinding]
  findEntityRanges(
    filterFn,
    callback,
  ) {
    findRangesImmutable(
      this.getCharacterList(),
      haveEqualEntity,
      filterFn,
      callback,
    );
  }
}

function haveEqualStyle(
  charA,
  charB,
) {
  return charA.getStyle() === charB.getStyle();
}

function haveEqualEntity(
  charA,
  charB,
) {
  return charA.getEntity() === charB.getEntity();
}

module.exports = ContentBlock;
