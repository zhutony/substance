import forEach from '../util/forEach'
import ElementType from 'domelementtype'
import Parser from '../vendor/htmlparser2'

/*
  Parses HTML or XML

  Options:
  - format: 'html' or 'xml'
  - ownerDocument: an MemoryDOMElement instance of type 'document'
*/
export default function parseMarkup (markup, options) {
  let format = options.ownerDocument ? options.ownerDocument.format : options.format
  /* istanbul ignore next */
  if (!format) {
    throw new Error("Either 'ownerDocument' or 'format' must be set.")
  }
  let parserOptions = Object.assign({}, options, {
    xmlMode: (format === 'xml')
  })
  let handler = new DomHandler({ format, elementFactory: options.elementFactory })
  let parser = new Parser(handler, parserOptions)
  parser.end(markup)
  return handler.document
}

const RE_WHITESPACE = /\s+/g
const RE_DOCTYPE = /^DOCTYPE\s+([^\s]+)(?:\s+PUBLIC\s+["]([^"]+)["](?:\s+["]([^"]+)["])?)\s*$/

/*
  Customized implementation of [DomHandler](https://github.com/fb55/domhandler).
*/
class DomHandler {
  constructor (options = {}) {
    this.elementFactory = options.elementFactory
    if (!this.elementFactory) throw new Error("'elementFactory' is required")
    this.options = options
    this.document = null
    this._tagStack = []
  }

  // called directly after construction of Parser and at the end of Parser.reset()
  onparserinit () {
    this.document = this.elementFactory('document', { format: this.options.format })
    this._tagStack = [this.document]
  }

  onend () {
    // TODO: would be nice to generate a good error message
    if (this._tagStack.length > 1) {
      throw new Error(`Unexpected EOF. Tag was opened but not closed.`)
    }
  }

  onerror (error) {
    throw new Error(error)
  }

  onclosetag () {
    this._tagStack.pop()
  }

  _addDomElement (element) {
    let parent = this._tagStack[this._tagStack.length - 1]
    if (!parent.childNodes) parent.childNodes = []
    let siblings = parent.childNodes

    let previousSibling = siblings[siblings.length - 1]
    // set up next/previous link
    element.next = null
    if (previousSibling) {
      element.prev = previousSibling
      previousSibling.next = element
    } else {
      element.prev = null
    }
    // either push the element to the current open tag's children, or keep a reference as top-level element
    siblings.push(element)
    element.parent = parent || null
  }

  onopentag (name, attributes) {
    let element = this.document.createElement(name)
    forEach(attributes, (val, key) => {
      element.setAttribute(key, val)
    })
    this._addDomElement(element)
    this._tagStack.push(element)
  }

  ontext (text) {
    if (this.options.normalizeWhitespace) {
      text = text.replace(RE_WHITESPACE, ' ')
    }
    let lastTag
    let _top = this._tagStack[this._tagStack.length - 1]
    if (_top && _top.childNodes) lastTag = _top.childNodes[_top.childNodes.length - 1]
    if (lastTag && lastTag.type === ElementType.Text) {
      lastTag.data += text
    } else {
      let element = this.document.createTextNode(text)
      this._addDomElement(element)
    }
  }

  oncomment (data) {
    var lastTag = this._tagStack[this._tagStack.length - 1]
    if (lastTag && lastTag.type === ElementType.Comment) {
      lastTag.data += data
    } else {
      let element = this.document.createComment(data)
      this._addDomElement(element)
      this._tagStack.push(element)
    }
  }

  oncommentend () {
    this._tagStack.pop()
  }

  oncdatastart (data) {
    let element = this.document.createCDATASection(data)
    this._addDomElement(element)
    this._tagStack.push(element)
  }

  oncdataend () {
    this._tagStack.pop()
  }

  onprocessinginstruction (name, data) {
    // ATTENTION: this looks a bit hacky, but is essentially caused by the XML parser implementation
    // remove leading '?${name}' and trailing '?'
    data = data.slice(name.length, -1).trim()
    // remove leading ?
    name = name.slice(1)
    let element = this.document.createProcessingInstruction(name, data)
    this._addDomElement(element)
  }

  ondeclaration (data) {
    if (data.startsWith('DOCTYPE')) {
      let m = RE_DOCTYPE.exec(data)
      if (!m) throw new Error('Could not parse DOCTYPE element: ' + data)
      this.document.setDoctype(m[1], m[2], m[3])
    } else {
      throw new Error('Not implemented: parse declaration ' + data)
    }
  }
}
