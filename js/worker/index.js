'use strict'

/* global self, importScripts, Prism */

importScripts('prism.js')

self.addEventListener('message', function (e) {
  const { type, data } = e.data

  if (type === 'highlight') {
    self.postMessage({
      type: 'highlight',
      data: Prism.highlight(data, Prism.languages.markup)
    })
  }
})
