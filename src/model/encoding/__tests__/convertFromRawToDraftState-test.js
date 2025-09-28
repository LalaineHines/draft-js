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

import {EntityRange} from 'EntityRange';
import {InlineStyleRange} from 'InlineStyleRange';
import {RawDraftContentBlock} from 'RawDraftContentBlock';
import {RawDraftContentState} from 'RawDraftContentState';

const convertFromRawToDraftState = require('convertFromRawToDraftState');
const mockUUID = require('mockUUID');

jest.mock('generateRandomKey');

const toggleExperimentalTreeDataSupport = (enabled) => {
  jest.doMock('gkx', () => name => {
    return name === 'draft_tree_data_support' ? enabled : false;
  });
};

const assertDraftState = (rawState) => {
  expect(
    convertFromRawToDraftState(rawState).getBlockMap().toJS(),
  ).toMatchSnapshot();
};

beforeEach(() => {
  jest.resetModules();
  jest.mock('uuid', () => mockUUID);
});

test('must map falsely block types to default value of unstyled', () => {
  const rawState = {
    blocks: [
      {
        key: 'A',
        text: 'AAAA',
        depth: 0,
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'B',
        text: 'BBBB',
        type: null,
        depth: 0,
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'C',
        text: 'CCCC',
        type: undefined,
        depth: 0,
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
    ],
    entityMap: {},
  };

  // $FlowFixMe looks like the whole point of the test is to verify something prevented by flow? Let it be for now.
  assertDraftState(rawState);
});

test('must be able to convert from styled blocks and entities mapped raw state', () => {
  const rawState = {
    blocks: [
      {
        data: {},
        depth: 0,
        entityRanges: (Array),
        inlineStyleRanges: (Array),
        key: 'a',
        text: 'Alpha',
        type: 'unstyled',
      },
      {
        data: {},
        depth: 0,
        entityRanges: [
          {
            key: 0,
            length: 5,
            offset: 0,
          },
        ],
        inlineStyleRanges: [
          {
            length: 5,
            offset: 0,
            style: 'BOLD',
          },
        ],
        key: 'b',
        text: 'Bravo',
        type: 'unordered-list-item',
      },
      {
        data: {},
        depth: 0,
        entityRanges: (Array),
        inlineStyleRanges: [
          {
            length: 7,
            offset: 0,
            style: 'ITALIC',
          },
        ],
        key: 'c',
        text: 'Charlie',
        type: 'blockquote',
      },
    ],
    entityMap: {
      '0': {
        data: {},
        mutability: 'IMMUTABLE',
        type: 'IMAGE',
      },
    },
  };

  assertDraftState(rawState);
});

test('must convert from raw tree draft to raw content state when experimentalTreeDataSupport is disabled', () => {
  const rawState = {
    blocks: [
      {
        key: 'A',
        text: '',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
        type: 'unstyled',
        depth: 0,
        children: [
          {
            key: 'B',
            text: '',
            entityRanges: (Array),
            inlineStyleRanges: (Array),
            type: 'unstyled',
            depth: 0,
            children: [
              {
                key: 'C',
                text: 'left block',
                entityRanges: (Array),
                inlineStyleRanges: (Array),
                type: 'unstyled',
                depth: 0,
                children: (Array),
              },
              {
                key: 'D',
                text: 'right block',
                entityRanges: (Array),
                inlineStyleRanges: (Array),
                type: 'unstyled',
                depth: 0,
                children: (Array),
              },
            ],
          },
          {
            key: 'E',
            type: 'header-one',
            text: 'This is a tree based document!',
            entityRanges: (Array),
            inlineStyleRanges: (Array),
            depth: 0,
            children: (Array),
          },
        ],
      },
    ],
    entityMap: {},
  };

  assertDraftState(rawState);
});

test('convert from raw tree draft content state', () => {
  toggleExperimentalTreeDataSupport(true);
  const rawState = {
    blocks: [
      {
        key: 'A',
        text: '',
        entityRanges: (Array),
        depth: 0,
        inlineStyleRanges: (Array),
        type: 'unstyled',
        children: [
          {
            key: 'B',
            text: '',
            entityRanges: (Array),
            depth: 0,
            inlineStyleRanges: (Array),
            type: 'unstyled',
            children: [
              {
                key: 'C',
                text: 'left block',
                entityRanges: (Array),
                depth: 0,
                inlineStyleRanges: (Array),
                type: 'unstyled',
                children: (Array),
              },
              {
                key: 'D',
                text: 'right block',
                entityRanges: (Array),
                depth: 0,
                inlineStyleRanges: (Array),
                type: 'unstyled',
                children: (Array),
              },
            ],
          },
          {
            key: 'E',
            type: 'header-one',
            text: 'This is a tree based document!',
            entityRanges: (Array),
            depth: 0,
            inlineStyleRanges: (Array),
            children: (Array),
          },
        ],
      },
    ],
    entityMap: {},
  };

  assertDraftState(rawState);
});

test('must be able to convert from raw state to tree state when experimentalTreeDataSupport is enabled', () => {
  toggleExperimentalTreeDataSupport(true);
  const rawState = {
    blocks: [
      {
        key: 'A',
        text: 'AAAA',
        entityRanges: (Array),
        type: 'unstyled',
        inlineStyleRanges: (Array),
        depth: 0,
      },
      {
        key: 'B',
        text: 'BBBB',
        entityRanges: (Array),
        type: 'unstyled',
        inlineStyleRanges: (Array),
        depth: 0,
      },
      {
        key: 'C',
        text: 'CCCC',
        entityRanges: (Array),
        type: 'unstyled',
        inlineStyleRanges: (Array),
        depth: 0,
      },
    ],
    entityMap: {},
  };

  assertDraftState(rawState);
});

test('must be able to convert content blocks that have list with depth from raw state to tree state when experimentalTreeDataSupport is enabled', () => {
  toggleExperimentalTreeDataSupport(true);
  const rawState = {
    blocks: [
      {
        key: 'A',
        type: 'ordered-list-item',
        depth: 0,
        text: '',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'B',
        type: 'ordered-list-item',
        depth: 1,
        text: '',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'C',
        type: 'ordered-list-item',
        depth: 2,
        text: 'deeply nested list',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
    ],
    entityMap: {},
  };

  assertDraftState(rawState);
});

test('ignore empty children array', () => {
  const rawState = {
    blocks: [
      {
        key: 'A',
        type: 'ordered-list-item',
        depth: 0,
        text: 'A',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'B',
        type: 'ordered-list-item',
        depth: 0,
        text: 'B',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'C',
        type: 'ordered-list-item',
        depth: 0,
        text: 'C',
        children: (Array),
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
    ],
    entityMap: {},
  };

  assertDraftState(rawState);
});

test('ignore empty children array for tree conversion 1', () => {
  const rawState = {
    blocks: [
      {
        key: 'A',
        type: 'ordered-list-item',
        depth: 0,
        text: 'A',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'B',
        type: 'ordered-list-item',
        depth: 0,
        text: 'B',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'C',
        type: 'ordered-list-item',
        depth: 0,
        text: 'C',
        children: (Array),
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
    ],
    entityMap: {},
  };
  assertDraftState(rawState);
});

test('ignore empty children array for tree conversion 2', () => {
  toggleExperimentalTreeDataSupport(true);
  const rawState = {
    blocks: [
      {
        key: 'A',
        type: 'ordered-list-item',
        depth: 0,
        text: 'A',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'B',
        type: 'ordered-list-item',
        depth: 0,
        text: 'B',
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
      {
        key: 'C',
        type: 'ordered-list-item',
        depth: 0,
        text: 'C',
        children: (Array),
        entityRanges: (Array),
        inlineStyleRanges: (Array),
      },
    ],
    entityMap: {},
  };
  assertDraftState(rawState);
});
