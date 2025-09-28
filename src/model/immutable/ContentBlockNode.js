/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * This file is a fork of ContentBlock adding support for nesting references by
 * providing links to children, parent, prevSibling, and nextSibling.
 *
 * This is unstable and not part of the public API and should not be used by
 * production systems. This file may be update/removed without notice.
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

const ContentBlockNodeConfig = BlockNodeConfig & {
  children: List,
  parent: BlockNodeKey,
  prevSibling: BlockNodeKey,
  nextSibling: BlockNodeKey,
};

const EMPTY_SET = OrderedSet();

const defaultRecord = {
  parent: null,
  characterList: List(),
  data: Map(),
  depth: 0,
  key: '',
  text: '',
  type: 'unstyled',
  children: List(),
  prevSibling: null,
  nextSibling: null,
};

const haveEqualStyle = (
  charA,
  charB,
) => charA.getStyle() === charB.getStyle();

const haveEqualEntity = (
  charA,
  charB,
) => charA.getEntity() === charB.getEntity();

const decorateCharacterList = (
  config,
) => {
  if (!config) {
    return config;
  }

  const {characterList, text} = config;

  if (text && !characterList) {
    config.characterList = List(Repeat(CharacterMetadata.EMPTY, text.length));
  }

  return config;
};

class ContentBlockNode
  extends (Record(defaultRecord), any)
{
  constructor(props = defaultRecord) {
    /* eslint-disable-next-line constructor-super */
    super(decorateCharacterList(props));
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

  getChildKeys() {
    return this.get('children');
  }

  getParentKey() {
    return this.get('parent');
  }

  getPrevSiblingKey() {
    return this.get('prevSibling');
  }

  getNextSiblingKey() {
    return this.get('nextSibling');
  }

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

module.exports = ContentBlockNode;
