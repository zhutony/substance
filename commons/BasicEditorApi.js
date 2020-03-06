import { documentHelpers } from '../model'
import { isString } from '../util'

export default class BasicEditorApi {
  constructor (archive, editorSession) {
    this.archive = archive
    this.editorSession = editorSession
  }

  extendWith (apiExtension) {
    apiExtension._register(this)
  }

  getEditorSession () {
    return this.editorSession
  }

  getDocument () {
    return this.editorSession.getDocument()
  }

  getRoot () {
    return this.getDocument().root
  }

  deleteNode (nodeId) {
    this.editorSession.transaction(tx => {
      const node = tx.get(nodeId)
      if (node) {
        if (node.isInlineNode()) {
          // Note: inline nodes are bound to a character within the text
          // in contrast to regular annotations, the text underneath an inline node
          // is owned by the inline node.
          // Deleting the node's character implicitly deletes the inline node
          tx.setSelection(node.getSelection())
          tx.deleteSelection()
        } else {
          documentHelpers.deepDeleteNode(tx, nodeId)
        }
      }
    })
  }

  removeAndDeleteNode (nodeId) {
    const node = this.editorSession.getDocument().get(nodeId, true)
    const parent = node.getParent()
    if (parent) {
      const { property: propertyName, pos } = node.getXpath()
      const property = parent.schema.getProperty(propertyName)
      this.editorSession.transaction(tx => {
        // remove the item from its parent
        if (property.isArray()) {
          documentHelpers.removeAt(tx, [parent.id, propertyName], pos)
        } else {
          tx.set([parent.id, propertyName], null)
        }
        documentHelpers.deepDeleteNode(tx, nodeId)
        tx.setSelection(null)
      })
    }
  }

  removeItem (collectionPath, itemId) {
    this.editorSession.transaction(tx => {
      documentHelpers.removeFromCollection(tx, collectionPath, itemId)
      tx.setSelection(null)
    })
  }

  updateNode (id, nodeData) {
    this.editorSession.transaction(tx => {
      const node = tx.get(id)
      node.assign(nodeData)
    })
  }

  insertAnnotation (type, nodeData) {
    this.editorSession.transaction(tx => {
      tx.annotate(Object.assign({ type }, nodeData))
    })
  }

  moveNode (nodeId, direction) {
    const doc = this.getDocument()
    const node = doc.get(nodeId)
    const parent = node.getParent()
    if (!parent) throw new Error('Node does not have parent')
    const propertyName = node.getXpath().property
    this.moveItem([parent.id, propertyName], nodeId, direction)
  }

  moveItem (collectionPath, itemId, direction) {
    const doc = this.getDocument()
    const collection = doc.get(collectionPath)
    if (!collection) throw new Error('Collection does not exist')
    const pos = collection.indexOf(itemId)
    const diff = direction === 'up' ? -1 : +1
    const insertPos = Math.min(collection.length - 1, Math.max(0, pos + diff))
    if (insertPos !== pos) {
      this.editorSession.transaction(tx => {
        documentHelpers.removeAt(tx, collectionPath, pos)
        documentHelpers.insertAt(tx, collectionPath, insertPos, itemId)
      })
    }
  }

  addNode (collectionPath, nodeData) {
    this.editorSession.transaction(tx => {
      const node = tx.create(nodeData)
      documentHelpers.append(tx, collectionPath, node.id)
      this._selectItem(tx, node)
    })
  }

  insertNode (collectionPath, pos, nodeData) {
    let newNodeId
    this.editorSession.transaction(tx => {
      const node = tx.create(nodeData)
      documentHelpers.insertAt(tx, collectionPath, pos, node.id)
      this._selectItem(tx, node)
      newNodeId = node.id
    })
    return this.editorSession.getDocument().get(newNodeId)
  }

  insertInlineNode (type, nodeData) {
    this.editorSession.transaction(tx => {
      tx.insertInlineNode(Object.assign({ type }, nodeData))
    })
  }

  selectItem (item) {
    if (isString(item)) {
      item = this.getDocument().get(item)
    }
    this._selectItem(this.editorSession, item)
  }

  selectInlineNode (inlineNode) {
    if (isString(inlineNode)) {
      inlineNode = this.getDocument().get(inlineNode)
    }
    this._selectInlineNode(this.editorSession, inlineNode)
  }

  renameAsset (assetId, newFilename) {
    const archive = this.archive
    const asset = archive.getAssetById(assetId)
    if (asset.filename !== newFilename) {
      this.archive.renameAsset(assetId, newFilename)
    }
  }

  _selectItem (tx, node) {
    tx.setSelection({
      type: 'custom',
      customType: 'node',
      nodeId: node.id,
      data: {
        nodeType: node.type
      }
    })
  }

  _selectInlineNode (tx, inlineNode) {
    tx.setSelection({
      type: 'property',
      path: inlineNode.start.path,
      startOffset: inlineNode.start.offset,
      endOffset: inlineNode.end.offset
    })
  }
}
