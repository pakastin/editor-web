(function () {
'use strict';

/* global redom, Worker, requestAnimationFrame, Prism, FastClick */

var el = redom.el;
var mount = redom.mount;

var TAB_KEY = 9;
var ENTER_KEY = 13;

var historyTimeout;
var history = [];
var future = [];

var worker = new Worker('js/worker.js');

var Editor = function Editor (parent) {
  var this$1 = this;

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
  );
  this.input.selectionStart = this.input.selectionEnd = 118;
  this.render();
  history.push(this.input.value);

  this.previewButton.onclick = function (e) { return this$1.togglePreview(); };

  this.input.oncopy = function (e) {
    var text = '';
    var value = this$1.input.value.slice(this$1.input.selectionStart, this$1.input.selectionEnd);

    for (var i = 0; i < value.length; i++) {
      // Convert tabs (back) to spaces.
      if (value[i] === '\t') {
        text += ' ';
        text += ' ';
      } else {
        text += value[i];
      }
    }

    // Force clipboard content:
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();

    console.log(text);
  };

  this.input.addEventListener('input', function (e) {
    if (!this$1._validatedInput) {
      console.log('prevented');
      e.preventDefault();
      this$1.input.value = this$1._value;
    } else {
      historyTimeout && clearTimeout(historyTimeout);
      historyTimeout = setTimeout(function () {
        if (history[history.length - 1] !== this$1.input.value) {
          history.push(this$1.input.value);
        }
      }, 100);
      this$1.render();
    }
    this$1._validatedInput = false;
  });

  this.input.onmouseup = function (e) {
    this$1.render();
  };

  this.input.onkeydown = function (e) {
    var which = e.which;

    this$1._validatedInput = true;

    if (which === TAB_KEY) {
      e.preventDefault();

      // TODO: multiline tab

      var value = this$1.input.value;
      var selectionStart = this$1.input.selectionStart;

      this$1.input.value = value.slice(0, selectionStart) + '\t' + value.slice(selectionStart);
      this$1.input.selectionStart = this$1.input.selectionEnd = selectionStart + 1;
    } else if (which === ENTER_KEY) {
      e.preventDefault();

      var value$1 = this$1.input.value;
      var selectionStart$1 = this$1.input.selectionStart;
      var selectionEnd = this$1.input.selectionEnd;
      var count = 0;

      for (var i = selectionStart$1 - 1; i >= 0; i--) {
        if (value$1[i] === '\n') {
          break
        } else if (value$1[i] === '\t') {
          count++;
        } else if (value$1[i] === ' ' && value$1[i + 1] === ' ') {
          count++;
        } else {
          count = 0;
        }
      }

      this$1.input.value = value$1.slice(0, selectionStart$1) + '\n' + times(count, '\t') + value$1.slice(selectionEnd);
      this$1.input.selectionStart = this$1.input.selectionEnd = selectionStart$1 + count + 1;
    }
    this$1.render();
  };
  this.input.onkeyup = function (e) {
    this$1._value = this$1.input.value;
    requestAnimationFrame(function () { return this$1.render(); });
  };

  window.addEventListener('keydown', function (e) {
    switch (e.which) {
      case 83:
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();

          this$1.togglePreview();
        }
        break
      case 90:
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();

          if (e.shiftKey) {
            this$1.redo();
          } else {
            if (history.length) {
              this$1.undo();
            }
          }
        }
        break
      case 88:
      case 89:
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (history.length) {
            console.log('undo');
            this$1.undo();
          }
        }
        break
    }
  });

  function times (num) {
    var str = [], len = arguments.length - 1;
    while ( len-- > 0 ) str[ len ] = arguments[ len + 1 ];

    var result = [];

    for (var i = 0; i < num; i++) {
      Array.prototype.push.apply(result, str);
    }

    return result.join('')
  }
};
Editor.prototype.undo = function undo () {
  if (!history.length) {
    return
  }
  var prevValue = history.pop();
  future.push(prevValue);

  if (history.length && (this.input.value === prevValue)) {
    this.undo();
  } else {
    this.input.value = prevValue;
  }

  if (history.length === 0) {
    history.push(prevValue);
  }
  this.render();
};
Editor.prototype.redo = function redo () {
  if (!future.length) {
    return
  }
  var nextValue = future.pop();
  history.push(nextValue);

  if (future.length && (this.input.value === nextValue)) {
    this.redo();
  } else {
    this.input.value = nextValue;
  }
  this.render();
};
Editor.prototype.render = function render () {
  var html = this.input.value;
  worker.postMessage({
    type: 'highlight',
    data: html
  });
};
Editor.prototype.togglePreview = function togglePreview () {
  if (this.preview.style.display === '') {
    this.preview.style.display = 'none';
    this.previewButton.classList.remove('black');
    this.previewButtonIcon.classList.add('fi-eye');
    this.previewButtonIcon.classList.remove('fi-page-edit');
    this.input.focus();
  } else {
    var html = editor.input.value;

    this.preview.src = '';
    this.preview.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

    this.preview.style.display = '';
    this.previewButtonIcon.classList.remove('fi-eye');
    this.previewButtonIcon.classList.add('fi-page-edit');
    this.previewButton.classList.add('black');
  }
};

var editor = new Editor();

worker.addEventListener('message', function (e) {
  var ref = e.data;
  var type = ref.type;
  var data = ref.data;

  if (type === 'highlight') {
    requestAnimationFrame(function () {
      editor.output.innerHTML = data;
      editor.input.style.height = editor.output.clientHeight + 'px';
      editor.input.scrollTop = 0;
    });
  }
});

mount(document.body, editor);
document.addEventListener('DOMContentLoaded', function () {
  FastClick.attach(document.body);
}, false);

}());
