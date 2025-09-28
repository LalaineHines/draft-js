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

import {BlockNodeRecord} from 'BlockNodeRecord';
import CharacterMetadata from 'CharacterMetadata';
import ContentState from 'ContentState';
import {DraftDecoratorType} from 'DraftDecoratorType';

const findRangesImmutable = require('findRangesImmutable');
const getOwnObjectValues = require('getOwnObjectValues');
const Immutable = require('immutable');

const {List, Repeat, Record} = Immutable;

const returnTrue = function () {
  return true;
};

const defaultLeafRange {
  start,
  end,
} = {
  start: null,
  end: null,
};

const LeafRange = (Record(defaultLeafRange), any);

export const DecoratorRangeRawType = {
  start,
  end,
  decoratorKey,
  // $FlowFixMe[value-as-type]
  leaves,
};

const DecoratorRangeType = {
  start,
  end,
  decoratorKey,
  // $FlowFixMe[value-as-type]
  leaves,
};

const defaultDecoratorRange = {
  start: null,
  end: null,
  decoratorKey: null,
  leaves: null,
};

const DecoratorRange = (Record(defaultDecoratorRange), any);

const BlockTree = {
  /**
   * Generate a block tree for a given ContentBlock/decorator pair.
   */
  generate(
    contentState,
    block,
    decorator,
    // $FlowFixMe[value-as-type]
  ) {
    const textLength = block.getLength();
    if (!textLength) {
      return List.of(
        new DecoratorRange({
          start: 0,
          end: 0,
          decoratorKey: null,
          leaves: List.of(new LeafRange({start: 0, end: 0})),
        }),
      );
    }

    const leafSets = [];
    const decorations = decorator
      ? decorator.getDecorations(block, contentState)
      : List(Repeat(null, textLength));

    const chars = block.getCharacterList();

    findRangesImmutable(decorations, areEqual, returnTrue, (start, end) => {
      leafSets.push(
        new DecoratorRange({
          start,
          end,
          decoratorKey: decorations.get(start),
          leaves: generateLeaves(chars.slice(start, end).toList(), start),
        }),
      );
    });

    return List(leafSets);
  },

  // $FlowFixMe[value-as-type]
  fromJS({leaves, ...other}) {
    return new DecoratorRange({
      ...other,
      leaves:
        leaves != null
          ? List(
              Array.isArray(leaves) ? leaves : getOwnObjectValues(leaves),
            ).map(leaf => LeafRange(leaf))
          : null,
    });
  },
};

/**
 * Generate LeafRange records for a given character list.
 */
function generateLeaves(
  characters,
  offset,
  // $FlowFixMe[value-as-type]
) {
  const leaves = [];
  const inlineStyles = characters.map(c => c.getStyle()).toList();
  findRangesImmutable(inlineStyles, areEqual, returnTrue, (start, end) => {
    leaves.push(
      new LeafRange({
        start: start + offset,
        end: end + offset,
      }),
    );
  });
  return List(leaves);
}

function areEqual(a, b) {
  return a === b;
}

module.exports = BlockTree;
