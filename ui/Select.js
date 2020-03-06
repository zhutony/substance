import { $$, Component } from '../dom'

export default class Select extends Component {
  render () {
    const { options, placeholder, value: selectedValue, disabled } = this.props
    const el = $$('select', { class: 'sc-select' })
    if (disabled) {
      el.setAttribute('disabled', true)
    }
    if (placeholder) {
      el.append(
        $$('option', { disabled: true, selected: true }, placeholder)
      )
    }

    el.append(
      options.map(option => {
        if (typeof option === 'object') {
          const { value, label } = option
          return $$('option', { value, selected: value === selectedValue }, label)
        } else {
          return $$('option', { option, selected: option === selectedValue }, option)
        }
      })
    )

    return el
  }
}
