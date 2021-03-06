import { _isDefined, isNil, last } from '../util'
import Selection from './Selection'
import PropertySelection from './PropertySelection'
import ContainerSelection from './ContainerSelection'
import NodeSelection from './NodeSelection'
import CustomSelection from './CustomSelection'
import getContainerRoot from './_getContainerRoot'
import getContainerPosition from './_getContainerPosition'
import compareCoordinates from './_compareCoordinates'
import Coordinate from './Coordinate'

export function fromJSON (json) {
  if (!json) return Selection.nullSelection
  var type = json.type
  switch (type) {
    case 'property':
      return PropertySelection.fromJSON(json)
    case 'container':
      return ContainerSelection.fromJSON(json)
    case 'node':
      return NodeSelection.fromJSON(json)
    case 'custom':
      return CustomSelection.fromJSON(json)
    default:
      // console.error('Selection.fromJSON(): unsupported selection data', json)
      return Selection.nullSelection
  }
}

/**
 * Helper to check if a coordinate is the first position of a node.
 * Attention: this works only for Text and List nodes
 */
export function isFirst (doc, containerPath, coor) {
  if (coor.isNodeCoordinate()) {
    return coor.offset === 0
  }
  const node = getContainerRoot(doc, containerPath, coor.path[0])
  if (node.isText()) {
    return coor.offset === 0
  }
  if (node.isList()) {
    const itemId = coor.path[0]
    return (node.items[0] === itemId && coor.offset === 0)
  }
  return false
}

/**
 * Helper to check if a coordinate is the last position of a node.
 * Attention: this works only for Text and List nodes
 */
export function isLast (doc, containerPath, coor) {
  if (coor.isNodeCoordinate()) {
    return coor.offset > 0
  }
  const node = getContainerRoot(doc, containerPath, coor.path[0])
  if (node.isText()) {
    return coor.offset >= node.getLength()
  }
  if (node.isList()) {
    const itemId = coor.path[0]
    const item = doc.get(itemId)
    return (last(node.items) === itemId && coor.offset === item.getLength())
  }
  return false
}

export function isEntirelySelected (doc, node, start, end) {
  const { isEntirelySelected } = _getRangeInfo(doc, node, start, end)
  return isEntirelySelected
}

function _getRangeInfo (doc, node, start, end) {
  let isFirst = true
  let isLast = true
  if (node.isText() || node.isListItem()) {
    if (start && start.offset !== 0) isFirst = false
    if (end && end.offset < node.getLength()) isLast = false
  }
  const isEntirelySelected = isFirst && isLast
  return { isFirst, isLast, isEntirelySelected }
}

export function setCursor (tx, node, containerPath, mode) {
  if (node.isText()) {
    let offset = 0
    if (mode === 'after') {
      const text = node.getText()
      offset = text.length
    }
    tx.setSelection({
      type: 'property',
      path: node.getPath(),
      startOffset: offset,
      containerPath
    })
  } else if (node.isList()) {
    let item, offset
    if (mode === 'after') {
      item = node.getLastItem()
      offset = item.getLength()
    } else {
      item = node.getFirstItem()
      offset = 0
    }
    tx.setSelection({
      type: 'property',
      path: item.getPath(),
      startOffset: offset,
      containerPath
    })
  } else {
    tx.setSelection({
      type: 'node',
      containerPath,
      nodeId: node.id
      // NOTE: ATM we mostly use 'full' NodeSelections
      // Still, they are supported internally
      // mode: mode
    })
  }
}

export function selectNode (tx, nodeId, containerPath) {
  tx.setSelection(createNodeSelection({ doc: tx, nodeId, containerPath }))
}

export function createSelection (doc, data) {
  let sel
  if (isNil(data)) return Selection.nullSelection
  switch (data.type) {
    case 'property': {
      if (isNil(data.endOffset)) {
        data.endOffset = data.startOffset
      }
      if (!_isDefined(data.reverse)) {
        if (data.startOffset > data.endOffset) {
          [data.startOffset, data.endOffset] = [data.endOffset, data.startOffset]
          data.reverse = !data.reverse
        }
      }
      // integrity checks:
      const text = doc.get(data.path, 'strict')
      if (data.startOffset < 0 || data.startOffset > text.length) {
        throw new Error('Invalid startOffset: target property has length ' + text.length + ', given startOffset is ' + data.startOffset)
      }
      if (data.endOffset < 0 || data.endOffset > text.length) {
        throw new Error('Invalid startOffset: target property has length ' + text.length + ', given endOffset is ' + data.endOffset)
      }
      sel = new PropertySelection(data)
      break
    }
    case 'container': {
      const containerPath = data.containerPath
      const ids = doc.get(containerPath)
      if (!ids) throw new Error('Can not create ContainerSelection: container "' + containerPath + '" does not exist.')
      let start = _normalizeCoor(doc, { path: data.startPath, offset: data.startOffset, containerPath })
      let end = _normalizeCoor(doc, { path: data.endPath, offset: data.endOffset, containerPath })
      if (!_isDefined(data.reverse)) {
        if (compareCoordinates(doc, containerPath, start, end) > 0) {
          [start, end] = [end, start]
          data.reverse = true
        }
      }
      sel = new ContainerSelection(containerPath, start.path, start.offset, end.path, end.offset, data.reverse, data.surfaceId)
      break
    }
    case 'node': {
      sel = createNodeSelection({
        doc,
        nodeId: data.nodeId,
        mode: data.mode,
        containerPath: data.containerPath,
        reverse: data.reverse,
        surfaceId: data.surfaceId
      })
      break
    }
    case 'custom': {
      sel = CustomSelection.fromJSON(data)
      break
    }
    default:
      throw new Error('Illegal selection type', data)
  }
  if (!sel.isNull()) {
    sel.attach(doc)
  }
  return sel
}

function _normalizeCoor (doc, { path, offset, containerPath }) {
  // NOTE: normalizing so that a node coordinate is used only for 'isolated nodes'
  if (path.length === 1) {
    // FIXME: originally getContainerRoot was called here
    // however in this case
    const node = getContainerRoot(doc, containerPath, path[0])
    if (node.isText()) {
      // console.warn("DEPRECATED: don't use node coordinates for TextNodes. Use selectionHelpers instead to set cursor at first or last position conveniently.")
      return new Coordinate(node.getPath(), offset === 0 ? 0 : node.getLength())
    } else if (node.isList()) {
      // console.warn("DEPRECATED: don't use node coordinates for ListNodes. Use selectionHelpers instead to set cursor at first or last position conveniently.")
      if (offset === 0) {
        const item = node.getItemAt(0)
        return new Coordinate(item.getPath(), 0)
      } else {
        const item = doc.get(last(node.items))
        return new Coordinate(item.getPath(), item.getLength())
      }
    }
  }
  return new Coordinate(path, offset)
}

export function createNodeSelection ({ doc, nodeId, containerPath, mode, reverse, surfaceId }) {
  let node = doc.get(nodeId)
  if (!node) return Selection.nullSelection
  node = getContainerRoot(doc, containerPath, nodeId)
  if (node.isText()) {
    return new PropertySelection({
      path: node.getPath(),
      startOffset: mode === 'after' ? node.getLength() : 0,
      endOffset: mode === 'before' ? 0 : node.getLength(),
      reverse,
      containerPath,
      surfaceId
    })
  } else if (node.isList() && node.getLength() > 0) {
    const first = node.getFirstItem()
    const last = node.getLastItem()
    let start = {
      path: first.getPath(),
      offset: 0
    }
    let end = {
      path: last.getPath(),
      offset: last.getLength()
    }
    if (mode === 'after') start = end
    else if (mode === 'before') end = start
    return new ContainerSelection({
      startPath: start.path,
      startOffset: start.offset,
      endPath: end.path,
      endOffset: end.offset,
      reverse,
      containerPath,
      surfaceId
    })
  } else {
    return new NodeSelection({ nodeId, mode, reverse, containerPath, surfaceId })
  }
}

export function stepIntoIsolatedNode (editorSession, comp) {
  // this succeeds if the content component provides
  // a grabFocus() implementation
  if (comp.grabFocus()) return true

  // otherwise we try to find the first surface
  const surface = comp.find('.sc-surface')
  if (surface) {
    // TODO: what about CustomSurfaces?
    if (surface._isTextPropertyEditor) {
      const doc = editorSession.getDocument()
      const path = surface.getPath()
      const text = doc.get(path, 'strict')
      editorSession.setSelection({
        type: 'property',
        path: path,
        startOffset: text.length,
        surfaceId: surface.id
      })
      return true
    } else if (surface._isContainerEditor) {
      const doc = editorSession.getDocument()
      const containerPath = surface.getContainerPath()
      const nodeIds = doc.get()
      if (nodeIds.length > 0) {
        const first = doc.get(nodeIds[0])
        setCursor(editorSession, first, containerPath, 'after')
      }
      return true
    }
  }
  return false
}

export function augmentSelection (selData, oldSel) {
  // don't do magically if a surfaceId is present
  if (selData && oldSel && !selData.surfaceId && !oldSel.isNull()) {
    selData.containerPath = selData.containerPath || oldSel.containerPath
    selData.surfaceId = selData.surfaceId || oldSel.surfaceId
  }
  return selData
}

/**
 * Get the node ids covered by this selection.
 *
 * @returns {String[]} an getNodeIds of ids
 */
export function getNodeIdsCoveredByContainerSelection (doc, sel) {
  const containerPath = sel.containerPath
  const startPos = getContainerPosition(doc, containerPath, sel.start.path[0])
  const endPos = getContainerPosition(doc, containerPath, sel.end.path[0])
  const nodeIds = doc.get(containerPath)
  return nodeIds.slice(startPos, endPos + 1)
}
