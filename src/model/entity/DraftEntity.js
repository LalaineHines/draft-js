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

import {DraftEntityMutability} from 'DraftEntityMutability';
import {DraftEntityType} from 'DraftEntityType';

const DraftEntityInstance = require('DraftEntityInstance');

const Immutable = require('immutable');
const invariant = require('invariant');
const uuid = require('uuid');

const {OrderedMap} = Immutable;

let instances = OrderedMap();
let instanceKey = uuid();

export const DraftEntityMapObject = {
  __loadWithEntities: (
    entities,
  ),
  __getAll: () => OrderedMap,
  __getLastCreatedEntityKey: () => string,
  __create: (
    type,
    mutability,
    data,
  ) => string,
  __add: (instance) => string,
  __get: (key) => DraftEntityInstance,
  __mergeData: (
    key,
    toMerge,
  ) => DraftEntityInstance,
  __replaceData: (
    key,
    newData,
  ) => DraftEntityInstance,

  // Temporary public API for gk'd deprecation
  get: (key) => DraftEntityInstance,
  set: (key, value) => DraftEntityMapObject,
  last: () => DraftEntityInstance,
};

/**
 * A "document entity" is an object containing metadata associated with a
 * piece of text in a ContentBlock.
 *
 * For example, a `link` entity might include a `uri` property. When a
 * ContentBlock is rendered in the browser, text that refers to that link
 * entity may be rendered as an anchor, with the `uri` as the href value.
 *
 * In a ContentBlock, every position in the text may correspond to zero
 * or one entities. This correspondence is tracked using a key string,
 * generated via DraftEntity.create() and used to obtain entity metadata
 * via DraftEntity.get().
 */
const DraftEntity = {
  /**
   * Get all the entities in the content state.
   */
  __getAll() {
    return instances;
  },

  /**
   * Load the entity map with the given set of entities.
   */
  __loadWithEntities(entities) {
    instances = entities;
    instanceKey = uuid();
  },

  // ***********************************WARNING******************************
  // --- the above public API will be deprecated in the next version of Draft!
  // The methods below this line are private - don't call them directly.

  /**
   * Get the random key string from whatever entity was last created.
   * We need this to support the new API, as part of transitioning to put Entity
   * storage in contentState.
   */
  __getLastCreatedEntityKey() {
    return instanceKey;
  },

  /**
   * Create a DraftEntityInstance and store it for later retrieval.
   *
   * A random key string will be generated and returned. This key may
   * be used to track the entity's usage in a ContentBlock, and for
   * retrieving data about the entity at render time.
   */
  __create(
    type,
    mutability,
    data,
  ) {
    return DraftEntity.__add(
      new DraftEntityInstance({type, mutability, data: data || {}}),
    );
  },

  /**
   * Add an existing DraftEntityInstance to the DraftEntity map. This is
   * useful when restoring instances from the server.
   */
  __add(instance) {
    instanceKey = uuid();
    instances = instances.set(instanceKey, instance);
    return instanceKey;
  },

  /**
   * Retrieve the entity corresponding to the supplied key string.
   */
  __get(key) {
    const instance = instances.get(key);
    invariant(!!instance, 'Unknown DraftEntity key: %s.', key);
    return instance;
  },

  get(key) {
    return DraftEntity.__get(key);
  },

  set(key, newInstance) {
    instances = instances.set(key, newInstance);
    return DraftEntity;
  },

  last() {
    return instances.last();
  },

  /**
   * Entity instances are immutable. If you need to update the data for an
   * instance, this method will merge your data updates and return a new
   * instance.
   */
  __mergeData(
    key,
    toMerge,
  ) {
    const instance = DraftEntity.__get(key);
    const newData = {...instance.getData(), ...toMerge};
    const newInstance = instance.set('data', newData);
    instances = instances.set(key, newInstance);
    return newInstance;
  },

  /**
   * Completely replace the data for a given instance.
   */
  __replaceData(
    key,
    newData,
  ) {
    const instance = DraftEntity.__get(key);
    const newInstance = instance.set('data', newData);
    instances = instances.set(key, newInstance);
    return newInstance;
  },
};

module.exports = DraftEntity;
