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

import {BlockNodeRecord} from 'BlockNodeRecord';
import {DraftInlineStyle} from 'DraftInlineStyle';
import {InlineStyleRange} from 'InlineStyleRange';
import {List} from 'immutable';

const UnicodeUtils = require('UnicodeUtils');

const findRangesImmutable = require('findRangesImmutable');

const areEqual = (a, b) => a === b;
const isTruthy = (a) => !!a;
const EMPTY_ARRAY = [];

/**
 * Helper function for getting encoded styles for each inline style. Convert
 * to UTF-8 character counts for storage.
 */
function getEncodedInlineForType(
  block,
  styleList,
  styleToEncode,
) {
  const ranges = [];

  // Obtain an array with ranges for only the specified style.
  const filteredInline = styleList
    .map(style => style.has(styleToEncode))
    .toList();

  findRangesImmutable(
    filteredInline,
    areEqual,
    // We only want to keep ranges with nonzero style values.
    isTruthy,
    (start, end) => {
      const text = block.getText();
      ranges.push({
        offset: UnicodeUtils.strlen(text.slice(0, start)),
        length: UnicodeUtils.strlen(text.slice(start, end)),
        style: styleToEncode,
      });
    },
  );

  return ranges;
}

/*
 * Retrieve the encoded arrays of inline styles, with each individual style
 * treated separately.
 */
function encodeInlineStyleRanges(
  block,
) {
  const styleList = block
    .getCharacterList()
    .map(c => c.getStyle())
    .toList();
  const ranges = styleList
    .flatten()
    .toSet()
    .map(style => getEncodedInlineForType(block, styleList, style));

  // $FlowFixMe[method-unbinding] added when improving typing for this parameters
  return Array.prototype.concat.apply(EMPTY_ARRAY, ranges.toJS());
}

module.exports = encodeInlineStyleRanges;
