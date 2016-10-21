(function () {
'use strict';

/* global self, importScripts, Prism */

importScripts('prism.js');

self.addEventListener('message', function (e) {
  var ref = e.data;
  var type = ref.type;
  var data = ref.data;

  if (type === 'highlight') {
    self.postMessage({
      type: 'highlight',
      data: Prism.highlight(data, Prism.languages.markup)
    });
  }
});

}());
