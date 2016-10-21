'use strict'

/* global redom, Worker, requestAnimationFrame, Prism, FastClick */

const { el, mount } = redom

const TAB_KEY = 9
const ENTER_KEY = 13

let historyTimeout
const history = []
const future = []

const worker = new Worker('js/worker.js')

let previewTimeout

class Editor {
  constructor (parent) {
    this.el = el('.editor',
      this.input = el('textarea', {
        autocapitalize: false,
        autocomplete: false,
        autofocus: true,
        spellcheck: false,
        value: [
          '<!DOCTYPE html>',
          '<html>',
          '\t<head>',
          '\t\t<meta charset="utf-8">',
          '\t\t<title></title>',
          '\t\t<style>',
          '\t\t\t',
          '\t\t</style>',
          '\t</head>',
          '\t<body>',
          '\t\t',
          '\t</body>',
          '</html>'
        ].join('\n')
      }),
      this.output = el('.output'),
      this.preview = el('iframe.preview', { style: { background: '#fff', border: 0, display: 'none' } }),
      this.previewButton = el('.preview-button',
        this.previewButtonIcon = el('i.fi-eye')
      )
    )
    this.input.selectionStart = this.input.selectionEnd = 118
    this.render()
    history.push(this.input.value)

    this.previewButton.onclick = e => this.togglePreview()

    this.input.oncopy = (e) => {
      let text = ''
      const value = this.input.value.slice(this.input.selectionStart, this.input.selectionEnd)

      for (let i = 0; i < value.length; i++) {
        // Convert tabs (back) to spaces.
        if (value[i] === '\t') {
          text += ' '
          text += ' '
        } else {
          text += value[i]
        }
      }

      // Force clipboard content:
      e.clipboardData.setData('text/plain', text)
      e.preventDefault()

      console.log(text)
    }

    this.input.addEventListener('input', e => {
      if (!this._validatedInput) {
        console.log('prevented')
        e.preventDefault()
        this.input.value = this._value
      } else {
        historyTimeout && clearTimeout(historyTimeout)
        historyTimeout = setTimeout(() => {
          if (history[history.length - 1] !== this.input.value) {
            history.push(this.input.value)
          }
        }, 100)
        this.render()
      }
      this._validatedInput = false
    })

    this.input.onmouseup = e => {
      this.render()
    }

    this.input.onkeydown = (e) => {
      const which = e.which

      this._validatedInput = true

      if (which === TAB_KEY) {
        e.preventDefault()

        // TODO: multiline tab

        const value = this.input.value
        const selectionStart = this.input.selectionStart

        this.input.value = value.slice(0, selectionStart) + '\t' + value.slice(selectionStart)
        this.input.selectionStart = this.input.selectionEnd = selectionStart + 1
      } else if (which === ENTER_KEY) {
        e.preventDefault()

        const value = this.input.value
        const selectionStart = this.input.selectionStart
        const selectionEnd = this.input.selectionEnd
        let count = 0

        for (let i = selectionStart - 1; i >= 0; i--) {
          if (value[i] === '\n') {
            break
          } else if (value[i] === '\t') {
            count++
          } else if (value[i] === ' ' && value[i + 1] === ' ') {
            count++
          } else {
            count = 0
          }
        }

        this.input.value = value.slice(0, selectionStart) + '\n' + times(count, '\t') + value.slice(selectionEnd)
        this.input.selectionStart = this.input.selectionEnd = selectionStart + count + 1
      }
      this.render()
    }
    this.input.onkeyup = e => {
      this._value = this.input.value
      requestAnimationFrame(() => this.render())
    }

    window.addEventListener('keydown', e => {
      switch (e.which) {
        case 83:
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()

            this.togglePreview()
          }
          break
        case 90:
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()

            if (e.shiftKey) {
              this.redo()
            } else {
              if (history.length) {
                this.undo()
              }
            }
          }
          break
        case 88:
        case 89:
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (history.length) {
              console.log('undo')
              this.undo()
            }
          }
          break
      }
    })

    function times (num, ...str) {
      const result = []

      for (let i = 0; i < num; i++) {
        Array.prototype.push.apply(result, str)
      }

      return result.join('')
    }
  }
  undo () {
    if (!history.length) {
      return
    }
    const prevValue = history.pop()
    future.push(prevValue)

    if (history.length && (this.input.value === prevValue)) {
      this.undo()
    } else {
      this.input.value = prevValue
    }

    if (history.length === 0) {
      history.push(prevValue)
    }
    this.render()
  }
  redo () {
    if (!future.length) {
      return
    }
    const nextValue = future.pop()
    history.push(nextValue)

    if (future.length && (this.input.value === nextValue)) {
      this.redo()
    } else {
      this.input.value = nextValue
    }
    this.render()
  }
  render () {
    const html = this.input.value
    worker.postMessage({
      type: 'highlight',
      data: html
    })
  }
  togglePreview () {
    if (this.preview.style.display === '') {
      this.preview.style.display = 'none'
      this.previewButton.classList.remove('black')
      this.previewButtonIcon.classList.add('fi-eye')
      this.previewButtonIcon.classList.remove('fi-page-edit')
      this.input.focus()
    } else {
      const html = editor.input.value

      this.preview.src = ''
      this.preview.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)

      this.preview.style.display = ''
      this.previewButtonIcon.classList.remove('fi-eye')
      this.previewButtonIcon.classList.add('fi-page-edit')
      this.previewButton.classList.add('black')
    }
  }
}

const editor = new Editor()

worker.addEventListener('message', function (e) {
  const { type, data } = e.data

  if (type === 'highlight') {
    requestAnimationFrame(() => {
      editor.output.innerHTML = data
      editor.input.style.height = editor.output.clientHeight + 'px'
      editor.input.scrollTop = 0
    })
  }
})

mount(document.body, editor)
document.addEventListener('DOMContentLoaded', function () {
  FastClick.attach(document.body)
}, false)
