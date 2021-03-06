import { EditingInterface, documentHelpers } from 'substance'

export const H1_TEXT = 'h1:abcdefg'

export function _h1 (doc, body) {
  doc.create({
    type: 'heading',
    id: 'h1',
    content: H1_TEXT,
    level: 1
  })
  body.append('h1')
}

export const H2_TEXT = 'h2:lmnopqrs'

export function _h2 (doc, body) {
  doc.create({
    type: 'heading',
    id: 'h2',
    content: H2_TEXT,
    level: 2
  })
  body.append('h2')
}

export const P1_TEXT = 'p1:abcdef'

export function _p1 (doc, body) {
  doc.create({
    type: 'paragraph',
    id: 'p1',
    content: P1_TEXT
  })
  body.append('p1')
}

export const P2_TEXT = 'p2:ghijk'

export function _p2 (doc, body) {
  doc.create({
    type: 'paragraph',
    id: 'p2',
    content: P2_TEXT
  })
  body.append('p2')
}

export function _empty (doc, body) {
  doc.create({
    type: 'paragraph',
    id: 'empty',
    content: ''
  })
  body.append('empty')
}

export function _s1 (doc) {
  doc.create({
    type: 'strong',
    id: 's1',
    start: {
      path: ['p1', 'content'],
      offset: 3
    },
    end: {
      offset: 5
    }
  })
}

export function _il1 (doc) {
  let tx = new EditingInterface(doc)
  tx.setSelection({
    type: 'property',
    path: ['p1', 'content'],
    startOffset: 3,
    containerPath: ['body', 'nodes']
  })
  tx.insertInlineNode({
    type: 'test-inline-node',
    id: 'il1',
    content: 'X'
  })
}

export const LI1_TEXT = 'l1-1:abcdef'
export const LI2_TEXT = 'l1-2:0123456'
export const LI3_TEXT = 'l1-3:ghij'

// list with two items
export function _l1 (doc, body) {
  doc.create({
    type: 'list',
    id: 'l1'
  })
  body.append('l1')
}

export function _l11 (doc) {
  const l1 = doc.get('l1')
  let item = doc.create({
    type: 'list-item',
    id: 'l1-1',
    content: LI1_TEXT
  })
  l1.appendItem(item)
}

export function _l12 (doc) {
  const l1 = doc.get('l1')
  let item = doc.create({
    type: 'list-item',
    id: 'l1-2',
    content: LI2_TEXT
  })
  l1.appendItem(item)
}

export function _l13 (doc) {
  const l1 = doc.get('l1')
  let item = doc.create({
    type: 'list-item',
    id: 'l1-3',
    content: LI3_TEXT
  })
  l1.appendItem(item)
}

export function _l1Empty (doc) {
  const l1 = doc.get('l1')
  let item = doc.create({
    type: 'list-item',
    id: 'l1-empty',
    content: ''
  })
  l1.appendItem(item)
}

export function _li1plus (doc) {
  doc.set(['l1-1', 'level'], 2)
}

export function _li2plus (doc) {
  doc.set(['l1-2', 'level'], 2)
}

export const LI21_TEXT = 'l2-1:abcdef'
export const LI22_TEXT = 'l2-2:0123456'

export function _l2 (doc, body) {
  doc.create({
    type: 'list',
    id: 'l2'
  })
  body.append('l2')
}

export function _l21 (doc) {
  const l2 = doc.get('l2')
  let item = doc.create({
    type: 'list-item',
    id: 'l2-1',
    content: LI21_TEXT
  })
  l2.appendItem(item)
}

export function _l22 (doc) {
  const l2 = doc.get('l2')
  let item = doc.create({
    type: 'list-item',
    id: 'l2-2',
    content: LI22_TEXT
  })
  l2.appendItem(item)
}

export function _l1Single (doc, body) {
  doc.create({
    type: 'list-item',
    id: 'l1-1',
    content: LI1_TEXT
  })
  doc.create({
    type: 'list',
    id: 'l1',
    items: ['l1-1']
  })
  body.append('l1')
}

export function _block1 (doc, body) {
  doc.create({
    type: 'test-block',
    id: 'block1'
  })
  body.append('block1')
}

export function _block2 (doc, body) {
  doc.create({
    type: 'test-block',
    id: 'block2'
  })
  body.append('block2')
}

export const IN1_TITLE = 'TITLE'
export const IN1_BODY_P1 = 'BODY'
export const IN1_CAPTION = 'CAPTION'
export function _in1 (doc, body) {
  documentHelpers.createNodeFromJson(doc, {
    type: 'structured-node',
    id: 'in1',
    title: IN1_TITLE,
    body: [{ type: 'paragraph', id: 'in1-body-p1', content: IN1_BODY_P1 }],
    caption: IN1_CAPTION
  })
  body.append('in1')
}

export const T_CONTENT = [['A1', 'B1'], ['A2', 'B2']]

export function _t1 (doc, body) {
  doc.create({type: 'table-cell', id: 't1_a1', content: T_CONTENT[0][0]})
  doc.create({type: 'table-cell', id: 't1_b1', content: T_CONTENT[0][1]})
  doc.create({type: 'table-cell', id: 't1_a2', content: T_CONTENT[1][0]})
  doc.create({type: 'table-cell', id: 't1_b2', content: T_CONTENT[1][1]})
  body.append(doc.create({
    type: 'table', id: 't1', cells: [['t1_a1', 't1_b1'], ['t1_a2', 't1_b2']]
  }))
}

export function _t1Sparse (doc, body) {
  _t1(doc, body)
  doc.set(['t1', 'cells'], [['t1_a1', null], [null, 't1_b2']])
}
