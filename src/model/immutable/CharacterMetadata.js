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

import {DraftInlineStyle} from 'DraftInlineStyle';

const {Map, OrderedSet, Record} = require('immutable');

// Immutable.map is typed such that the value for every key in the map
// must be the same type
const CharacterMetadataConfigValueType = DraftInlineStyle;
const CharacterMetadataConfigRawValueType = Array;

export const CharacterMetadataRawConfig = {
  style?: CharacterMetadataConfigRawValueType,
  entity?: CharacterMetadataConfigRawValueType,
};

 CharacterMetadataConfig = interface {
  style = CharacterMetadataConfigValueType,
  entity = CharacterMetadataConfigValueType,
};

const EMPTY_SET = OrderedSet<string>();

const defaultRecord = {
  style: EMPTY_SET,
  entity: null,
};

const CharacterMetadataRecord = (Record(defaultRecord));

class CharacterMetadata extends CharacterMetadataRecord {
  getStyle() {
    return this.get('style');
  }

  getEntity() {
    return this.get('entity');
  }

  hasStyle(style) {
    return this.getStyle().includes(style);
  }

  static applyStyle(
    record,
    style,
  ) {
    const withStyle = record.set('style', record.getStyle().add(style));
    return CharacterMetadata.create(withStyle);
  }

  static removeStyle(
    record,
    style,
  ) {
    const withoutStyle = record.set('style', record.getStyle().remove(style));
    return CharacterMetadata.create(withoutStyle);
  }

  static applyEntity(
    record,
    entityKey,
  ) {
    const withEntity =
      record.getEntity() === entityKey
        ? record
        : record.set('entity', entityKey);
    return CharacterMetadata.create(withEntity);
  }

  /**
   * Use this function instead of the `CharacterMetadata` constructor.
   * Since most content generally uses only a very small number of
   * style/entity permutations, we can reuse these objects as often as
   * possible.
   */
  static create(config) {
    if (!config) {
      return EMPTY;
    }

    const defaultConfig = {
      style: EMPTY_SET,
      entity: (null, string),
    };

    // Fill in unspecified properties, if necessary.
    // $FlowFixMe[incompatible-call] added when improving typing for this parameters
    const configMap = Map(defaultConfig).merge(config);

    const existing = pool.get(configMap);
    if (existing) {
      return existing;
    }

    const newCharacter = new CharacterMetadata(configMap);
    pool = pool.set(configMap, newCharacter);
    return newCharacter;
  }

  static fromJS({
    style,
    entity,
  }) {
    return new CharacterMetadata({
      style: Array.isArray(style) ? OrderedSet(style) : style,
      entity: Array.isArray(entity) ? OrderedSet(entity) : entity,
    });
  }
}

const EMPTY = new CharacterMetadata();
let pool = Map([
  // $FlowFixMe[incompatible-call] added when improving typing for this parameters
  [Map(defaultRecord), EMPTY],
]);

CharacterMetadata.EMPTY = EMPTY;

module.exports = CharacterMetadata;
