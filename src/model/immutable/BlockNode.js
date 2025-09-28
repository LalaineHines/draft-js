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

import CharacterMetadata, {
  CharacterMetadataRawConfig,
} from 'CharacterMetadata';
import {DraftBlockType} from 'DraftBlockType';
import {DraftInlineStyle} from 'DraftInlineStyle';
import {List, Map} from 'immutable';

export const BlockNodeKey = string;

export const BlockNodeRawConfig = {
  characterList,
  data,
  depth,
  key,
  text,
  type,
};

export const BlockNodeConfig = {
  characterList,
  data,
  depth,
  key,
  text,
  type,
};

// https://github.com/facebook/draft-js/issues/1492
// prettier-ignore
export const BlockNode {
  findEntityRanges(
    filterFn,
    callback,
  ),

  +findStyleRanges (
    filterFn,
    callback,
  ),

  +getCharacterList,

  +getData,

  +getDepth,

  +getEntityAt,

  +getInlineStyleAt,

  +getKey,

  +getLength,

  +getText,

  +getType,
}
