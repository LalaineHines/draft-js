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
import {BlockNodeConfig} from 'BlockNode';
import CharacterMetadata from 'CharacterMetadata';
import {DraftBlockType} from 'DraftBlockType';
import {EntityRange} from 'EntityRange';
import {InlineStyleRange} from 'InlineStyleRange';
import {RawDraftContentBlock} from 'RawDraftContentBlock';
import {RawDraftContentState} from 'RawDraftContentState';

const ContentBlock = require('ContentBlock');
const ContentBlockNode = require('ContentBlockNode');
const ContentState = require('ContentState');
const DraftTreeAdapter = require('DraftTreeAdapter');
const DraftTreeInvariants = require('DraftTreeInvariants');
const SelectionState = require('SelectionState');

const createCharacterList = require('createCharacterList');
const decodeEntityRanges = require('decodeEntityRanges');
const decodeInlineStyleRanges = require('decodeInlineStyleRanges');
const generateRandomKey = require('generateRandomKey');
const gkx = require('gkx');
const Immutable = require('immutable');
const invariant = require('invariant');

const experimentalTreeDataSupport = gkx('draft_tree_data_support');

const {List, Map, OrderedMap} = Immutable;

const EntityKeyMap = {[key: number]: number};

const decodeBlockNodeConfig = (
  block,
  entityKeyMap,
) => {
  const {key, type, data, text, depth} = block;

  const blockNodeConfig = {
    text,
    depth: depth || 0,
    type: type || 'unstyled',
    key: key || generateRandomKey(),
    data: Map(data),
    characterList: decodeCharacterList(block, entityKeyMap),
  };

  return blockNodeConfig;
};

const decodeCharacterList = (
  block,
  entityKeyMap,
) => {
  const {
    text,
    entityRanges: rawEntityRanges,
    inlineStyleRanges: rawInlineStyleRanges,
  } = block;

  const entityRanges = rawEntityRanges || [];
  const inlineStyleRanges = rawInlineStyleRanges || [];

  // Translate entity range keys to the DraftEntity map.
  return createCharacterList(
    decodeInlineStyleRanges(text, inlineStyleRanges),
    decodeEntityRanges(
      text,
      entityRanges
        .filter(range => entityKeyMap.hasOwnProperty(range.key))
        .map(range => ({...range, key: entityKeyMap[range.key]})),
    ),
  );
};

const addKeyIfMissing = (block) => {
  return {
    ...block,
    key: block.key || generateRandomKey(),
  };
};

/**
 * Node stack is responsible to ensure we traverse the tree only once
 * in depth order, while also providing parent refs to inner nodes to
 * construct their links.
 */
const updateNodeStack = (
  stack {
        children,
        data,
        depth,
        entityRanges,
        inlineStyleRanges,
        key,
        text,
        type,
      },
  nodes,
  parentRef,
) {
      children,
      data,
      depth,
      entityRanges,
      inlineStyleRanges,
      key,
      parentRef,
      text,
      type,
    } => {
  const nodesWithParentRef = nodes.map(block => {
    return {
      ...block,
      parentRef,
    };
  });

  // since we pop nodes from the stack we need to insert them in reverse
  return stack.concat(nodesWithParentRef.reverse());
};

/**
 * This will build a tree draft content state by creating the node
 * reference links into a single tree walk. Each node has a link
 * reference to "parent", "children", "nextSibling" and "prevSibling"
 * blockMap will be created using depth ordering.
 */
const decodeContentBlockNodes = (
  blocks,
  entityMap,
) => {
  return (
    blocks
      // ensure children have valid keys to enable sibling links
      .map(addKeyIfMissing)
      .reduce(
        (blockMap, block, index) => {
          invariant(
            Array.isArray(block.children),
            'invalid RawDraftContentBlock can not be converted to ContentBlockNode',
          );

          // ensure children have valid keys to enable sibling links
          const children = block.children.map(addKeyIfMissing);

          // root level nodes
          const contentBlockNode = new ContentBlockNode({
            ...decodeBlockNodeConfig(block, entityMap),
            prevSibling: index === 0 ? null : blocks[index - 1].key,
            nextSibling:
              index === blocks.length - 1 ? null : blocks[index + 1].key,
            children: List(children.map((child) => child.key)),
          });

          // push root node to blockMap
          blockMap = blockMap.set(contentBlockNode.getKey(), contentBlockNode);

          // this stack is used to ensure we visit all nodes respecting depth ordering
          let stack = updateNodeStack([], children, contentBlockNode);

          // start computing children nodes
          while (stack.length > 0) {
            // we pop from the stack and start processing this node
            const node = stack.pop();

            // parentRef already points to a converted ContentBlockNode
            const parentRef = node.parentRef;
            const siblings = parentRef.getChildKeys();
            const index = siblings.indexOf(node.key);
            const isValidBlock = Array.isArray(node.children);

            if (!isValidBlock) {
              invariant(
                isValidBlock,
                'invalid RawDraftContentBlock can not be converted to ContentBlockNode',
              );
              break;
            }

            // ensure children have valid keys to enable sibling links
            const children = node.children.map(addKeyIfMissing);

            const contentBlockNode = new ContentBlockNode({
              ...decodeBlockNodeConfig(node, entityMap),
              parent: parentRef.getKey(),
              children: List(children.map((child) => child.key)),
              prevSibling: index === 0 ? null : siblings.get(index - 1),
              nextSibling:
                index === siblings.size - 1 ? null : siblings.get(index + 1),
            });

            // push node to blockMap
            blockMap = blockMap.set(
              contentBlockNode.getKey(),
              contentBlockNode,
            );

            // this stack is used to ensure we visit all nodes respecting depth ordering
            stack = updateNodeStack(stack, children, contentBlockNode);
          }

          return blockMap;
        },
        OrderedMap(),
      )
  );
};

const decodeContentBlocks = (
  blocks,
  entityKeyMap,
) => {
  return OrderedMap(
    blocks.map((block) => {
      const contentBlock = new ContentBlock(
        decodeBlockNodeConfig(block, entityKeyMap),
      );
      return [contentBlock.getKey(), contentBlock];
    }),
  );
};

const decodeRawBlocks = (
  rawState,
  entityKeyMap,
) => {
  const isTreeRawBlock = rawState.blocks.find(
    block => Array.isArray(block.children) && block.children.length > 0,
  );
  const rawBlocks =
    experimentalTreeDataSupport && !isTreeRawBlock
      ? DraftTreeAdapter.fromRawStateToRawTreeState(rawState).blocks
      : rawState.blocks;

  if (!experimentalTreeDataSupport) {
    return decodeContentBlocks(
      isTreeRawBlock
        ? DraftTreeAdapter.fromRawTreeStateToRawState(rawState).blocks
        : rawBlocks,
      entityKeyMap,
    );
  }

  const blockMap = decodeContentBlockNodes(rawBlocks, entityKeyMap);
  // in dev mode, check that the tree invariants are met
  if (__DEV__) {
    invariant(
      DraftTreeInvariants.isValidTree(blockMap),
      'Should be a valid tree',
    );
  }
  return blockMap;
};

const decodeRawEntityMap = (
  contentStateArg,
  rawState,
) {entityKeyMap, contentState} => {
  const {entityMap: rawEntityMap} = rawState;
  const entityKeyMap {string} = {};
  let contentState = contentStateArg;

  Object.keys(rawEntityMap).forEach(rawEntityKey => {
    const {type, mutability, data} = rawEntityMap[rawEntityKey];
    contentState = contentState.createEntity(type, mutability, data || {});
    // get the key reference to created entity
    entityKeyMap[rawEntityKey] = contentState.getLastCreatedEntityKey();
  });

  // $FlowFixMe[incompatible-return]
  return {entityKeyMap, contentState};
};

const convertFromRawToDraftState = (
  rawState,
) => {
  invariant(Array.isArray(rawState.blocks), 'invalid RawDraftContentState');

  // decode entities
  const {contentState, entityKeyMap} = decodeRawEntityMap(
    ContentState.createFromText(''),
    rawState,
  );

  // decode blockMap
  const blockMap = decodeRawBlocks(rawState, entityKeyMap);

  // create initial selection
  const selectionState = blockMap.isEmpty()
    ? new SelectionState()
    : SelectionState.createEmpty(blockMap.first().getKey());

  return new ContentState({
    blockMap,
    entityMap: contentState.getEntityMap(),
    selectionBefore: selectionState,
    selectionAfter: selectionState,
  });
};

module.exports = convertFromRawToDraftState;
