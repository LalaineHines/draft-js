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

const {OrderedSet} = require('immutable');

module.exports = {
  BOLD: (OrderedSet.of('BOLD'), OrderedSet),
  BOLD_ITALIC: (OrderedSet.of('BOLD', 'ITALIC'), OrderedSet),
  BOLD_ITALIC_UNDERLINE: (OrderedSet.of(
    'BOLD',
    'ITALIC',
    'UNDERLINE',
  ), OrderedSet),
  BOLD_UNDERLINE: (OrderedSet.of('BOLD', 'UNDERLINE'), OrderedSet),
  CODE: (OrderedSet.of('CODE'), OrderedSet),
  ITALIC: (OrderedSet.of('ITALIC'), OrderedSet),
  ITALIC_UNDERLINE: (OrderedSet.of('ITALIC', 'UNDERLINE'), OrderedSet),
  NONE: (OrderedSet(), OrderedSet),
  STRIKETHROUGH: (OrderedSet.of('STRIKETHROUGH'), OrderedSet),
  UNDERLINE: (OrderedSet.of('UNDERLINE'), OrderedSet),
};
