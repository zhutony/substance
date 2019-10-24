import { Component, $$, DefaultDOMElement } from '../dom'
import { getRelativeMouseBounds, isEqual, isFunction } from '../util'
import renderMenu from './renderMenu'

export default class Popover extends Component {
  getInitialState () {
    return { content: null, requester: null, desiredPos: null }
  }

  render () {
    const { content, requester } = this.state
    const el = $$('div', { class: 'sc-popover sm-hidden' })
    if (requester) {
      // Note: content can either be given as menu spec or as a render function
      if (isFunction(content)) {
        const renderContent = content
        el.append(
          renderContent()
        )
      // default: content is given as menu spec
      } else {
        el.append(
          renderMenu(requester, content)
        )
      }
    }
    return el
  }

  /**
   * Request to render a popover, given either a menu specification or a render function,
   * at the given position.
   *
   * To receive actions, the requesting component has to be provided.
   *
   * @param {object} params
   * @param {Function|object} params.content - a render function or a menu specification (see renderMenu)
   * @param {object} params.desiredPos
   * @param {number} params.desiredPos.x - the desired x screen coordinate
   * @param {number} params.desiredPos.y - the desired y screen coordinate
   * @param {Component} [params.requester] - the component that is requesting the content; this is used to dispatch actions
   */
  acquire (params) {
    const { content, desiredPos, requester } = params
    if (!content) throw new Error("'content' is required")
    if (!desiredPos) throw new Error("'desiredPos' is required")

    // NOTE: this implements a toggle behavior. I.e. if the same requester
    // requests the popover for the same position, then we hide the popover
    const state = this.state
    if (state.requester === requester && isEqual(desiredPos, state.desiredPos)) {
      this._hide()
      return
    }

    // Note: this prevents a potentially triggered hide, if a new popover request has come in
    this._hideIfNoNewRequest = false

    // We started with this implementation
    // HACK adding a delay so that other things, e.g. selection related can be done first
    setTimeout(() => {
      this._showContent(content, requester, desiredPos)
    }, 0)
  }

  release (requester) {
    if (this.state.requester === requester) {
      this._hide()
    }
  }

  _showContent (content, requester, desiredPos) {
    this.setState({ content, requester, desiredPos })
    const el = this.getElement()
    const containerEl = this.props.getContainer()
    // TODO: we could do some positioning here to stay within the container bounds
    // TODO: getRelativeMouseBounds() is not the right name for us here
    // but the logic is what we need
    const bounds = getRelativeMouseBounds({ clientX: desiredPos.x, clientY: desiredPos.y }, containerEl.getNativeElement())
    const menuWidth = el.htmlProp('offsetWidth')
    // By default, context menu are aligned left bottom to the mouse coordinate clicked
    let leftPos = bounds.left - menuWidth / 2
    // Must not exceed left bound
    leftPos = Math.max(leftPos, 0)
    // Must not exceed right bound
    const maxLeftPos = bounds.left + bounds.right - menuWidth
    leftPos = Math.min(leftPos, maxLeftPos)
    el.css({
      top: bounds.top,
      left: leftPos
    })
    el.removeClass('sm-hidden')
    // NOTE: this is a tricky mechanism trying to detect any mousedowns outside of the context menu
    // used to close the context menu.
    // If clicked inside the popover it will not close automatically, only if clicked somewhere else
    // or if one of the rendered popover content sends an action.
    this._closeOnClick = true
    el.on('mousedown', this._onMousedownInside, this, { once: true, capture: true })
    // making sure that there is only one active listener
    if (!this._hasGlobalMousedownListener) {
      DefaultDOMElement.getBrowserWindow().on('click', this._onMousedownOutside, this, { once: true, capture: true })
      this._hasGlobalMousedownListener = true
    }
  }

  // overriding the default send() mechanism to be able to dispatch actions to the current requester
  _doesHandleAction () {
    return Boolean(this.state.requester)
  }

  _handleAction (action, args) {
    // console.log('FORWARDING action to requester', action, args)
    this.state.requester.send(action, ...args)
    // TODO: think if this is really what we want, i.e. hiding the menu whenever an action is emitted
    this._hide()
  }

  _onMousedownInside () {
    this._closeOnClick = false
  }

  _onMousedownOutside () {
    this._hasGlobalMousedownListener = false
    // NOTE: this timeout is necessary so that an actual click can be handled
    // e.g. requesting to show the popover at a different location, or
    // with different content
    // In that case we do not want to hide
    if (this._closeOnClick) {
      this._hideIfNoNewRequest = true
      // HACK waiting two ticks because the request itself
      setTimeout(() => {
        if (this._hideIfNoNewRequest) {
          this._hide()
        }
      }, 0)
    }
  }

  _hide () {
    // console.log('Hiding')
    this.setState(this.getInitialState())
  }
}