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

import ContentState from 'ContentState';

const UnicodeBidiService = require('UnicodeBidiService');

const Immutable = require('immutable');
const nullThrows = require('nullThrows');

const {OrderedMap} = Immutable;

let bidiService;

const EditorBidiService = {
  getDirectionMap(
    content,
    prevBidiMap,
  ) {
    if (!bidiService) {
      bidiService = new UnicodeBidiService();
    } else {
      bidiService.reset();
    }

    const blockMap = content.getBlockMap();
    const nextBidi = blockMap
      .valueSeq()
      .map(block => nullThrows(bidiService).getDirection(block.getText()));
    const bidiMap = OrderedMap(blockMap.keySeq().zip(nextBidi));

    if (prevBidiMap != null && Immutable.is(prevBidiMap, bidiMap)) {
      return prevBidiMap;
    }

    return bidiMap;
  },
};

module.exports = EditorBidiService;
