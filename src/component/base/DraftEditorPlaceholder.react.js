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

import {DraftTextAlignment} from 'DraftTextAlignment';
import EditorState from 'EditorState';

const cx = require('cx');
const React = require('react');
const shallowEqual = require('shallowEqual');

/**
@typedef {Object} Props
  * @property {string} [ariaHidden]
  * @property {string} accessibilityID
  * @property {string} [className]
  * @property {EditorState} editorState
  * @property {string} text
  * @property {DraftTextAlignment} textAlignment
  * // Additional properties can be added as needed
*/

/**
 * This component is responsible for rendering placeholder text for the
 * `DraftEditor` component.
 *
 * Override placeholder style via CSS.
 */
class DraftEditorPlaceholder extends React.Component {
  shouldComponentUpdate(nextProps) {
    const {editorState, ...otherProps} = this.props;
    const {editorState: nextEditorState, ...nextOtherProps} = nextProps;
    return (
      editorState.getSelection().getHasFocus() !==
        nextEditorState.getSelection().getHasFocus() ||
      !shallowEqual(otherProps, nextOtherProps)
    );
  }

  render() {
    const innerClassName =
      // We can't use joinClasses since the fbjs flow definition is wrong. Using
      // cx to concatenate is rising issues with haste internally.
      // eslint-disable-next-line fb-www/cx-concat
      cx('public/DraftEditorPlaceholder/inner') +
      (this.props.className != null ? ` ${this.props.className}` : '');

    return (
      <div
        aria-hidden={this.props.ariaHidden}
        className={cx({
          'public/DraftEditorPlaceholder/root': true,
          'public/DraftEditorPlaceholder/hasFocus': this.props.editorState
            .getSelection()
            .getHasFocus(),
        })}>
        <div
          className={innerClassName}
          id={this.props.accessibilityID}
          style={{
            whiteSpace: 'pre-wrap',
          }}>
          {this.props.text}
        </div>
      </div>
    );
  }
}

module.exports = DraftEditorPlaceholder;
