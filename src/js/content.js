'use strict';

(() => {
  var WRAPPER = 'imageundercursor-wrapper';
  var ARROW_SIZE = 11, ARROW_Y_OFF = 2, BOX_MARGIN = 10;

  var mousePos = {};
  var imgs = [];
  var w, warrow, wbody;

  function encodeOptimizedSVGDataUri(svgString) {
    // credits: https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
    var uriPayload =
      encodeURIComponent(svgString.replace(/[\n\r\t]+/g, ''))
      .replace(/%20/g, ' ')
      .replace(/%3D/g, '=')
      .replace(/%3A/g, ':')
      .replace(/%2F/g, '/')
      .replace(/%22/g, "'");
    return 'data:image/svg+xml,' + uriPayload;
  }

  function findImages(x, y) {
    return document.elementsFromPoint(x, y).map(el => {
      var tag = el.tagName.toUpperCase();
      if (tag === 'IMG')
        return {
          s: el.src,
          w: el.width,
          h: el.height,
        };
      if (tag === 'SVG') {
        var ns = el.getAttribute('xmlns');
        if (!(ns && ns.length)) {
          el = el.cloneNode(true);
          el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        return {
          s: encodeOptimizedSVGDataUri(el.outerHTML),
          t: 'svg',
          name: 'image.svg',
        };
      }
      if (tag === 'CANVAS')
        return {
          s: el.toDataURL('png'),
          w: el.width,
          h: el.height,
        }
      if (tag === 'VIDEO')
        return {
          s: el.src,
          t: 'video',
        }
      var bg = window.getComputedStyle(el).backgroundImage;
      if (String.prototype.indexOf.call(bg, 'url(') !== -1)
        return {
          s: bg.replace(/^url\(['"]?([^'"]+)['"]?\)/, '$1')
        };
    }).filter(el => !!el);
  }

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 2)
      return;
    mousePos = {
      x: e.pageX,
      y: e.pageY,
    };
    imgs = findImages(e.clientX, e.clientY);
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request !== 'show')
      return;
    var x = mousePos.x, y = mousePos.y;
    if (!imgs.length) {
      // display "nope" icon
      var nope = document.createElement('div');
      nope.className = WRAPPER + '-nope';
      nope.addEventListener('webkitAnimationEnd', (e) => {
        nope.remove();
      });
      document.body.appendChild(nope);
      nope.style.left = x - nope.clientWidth / 2 + 'px';
      nope.style.top = y - nope.clientHeight / 2 + 'px';
      nope.className += " fade";
      return;
    }
    wbody.innerHTML = ''; // empty wbody
    // build wbody items
    for (var img of imgs) {
      var li = document.createElement('li');
      wbody.appendChild(li);
      var pic = document.createElement('div');
      pic.className = 'img';
      if (img.t === 'video') {
        var vid = document.createElement('video');
        vid.src = img.s;
        vid.muted = true;
        vid.autoplay = true;
        vid.controls = false;
        vid.className = 'video';
        pic.appendChild(vid);
      } else {
        pic.style.backgroundImage = 'url("' + img.s + '")';
      }
      var a = document.createElement('a');
      a.className = 'link';
      a.href = img.s;
      a.textContent = img.s.substring(0, 128);
      var pica = document.createElement('a');
      pica.href = img.s;
      pica.appendChild(pic);
      li.appendChild(pica);
      li.appendChild(a);
      var info = document.createElement('span');
      info.className = 'info';
      if (img.t === 'video')
        info.textContent = chrome.i18n.getMessage('video');
      else if (img.t === 'svg')
        info.textContent = chrome.i18n.getMessage('svg');
      else if (img.w !== undefined && img.h !== undefined)
        info.textContent = '' + img.w + '×' + img.h;
      else
        info.textContent = chrome.i18n.getMessage('bg_image');
      li.appendChild(info);
      var buttons = document.createElement('div');
      buttons.className = 'btns';
      li.appendChild(buttons);
      /* copy button */
      var copyBut = document.createElement('button');
      copyBut.className = 'btn copy';
      copyBut.type = 'button';
      copyBut.textContent = chrome.i18n.getMessage('copy_link');
      copyBut.dataset.url = img.s;
      copyBut.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.runtime.sendMessage({copy: this.dataset.url});
        this.classList.add('flash');
        setTimeout(() => { this.classList.remove('flash'); }, 1010);
      });
      buttons.appendChild(copyBut);
      /* download button */
      var urlParts = img.s.split('/');
      var name = img.name ? img.name : urlParts[urlParts.length - 1];
      var dlBut = document.createElement('a');
      dlBut.className = 'btn dl';
      dlBut.download = name;
      dlBut.href = img.s;
      dlBut.textContent = chrome.i18n.getMessage('save_as');
      buttons.appendChild(dlBut);
    }
    w.style.display = 'block'; // display before computations so geometry is computed
    var l = Math.min(window.innerWidth - w.clientWidth - BOX_MARGIN * 2, Math.max(BOX_MARGIN, x - w.clientWidth / 2));
    warrow.style.left = Math.min(window.innerWidth - BOX_MARGIN, Math.max(BOX_MARGIN, x - l - ARROW_SIZE / 2)) + 'px';
    w.style.left = l + 'px';
    w.style.top = y + ARROW_SIZE + ARROW_Y_OFF + 'px';
  });

  // build the popover
  w = document.createElement('div');
  w.className = WRAPPER;
  w.style.display = 'none';
  // don't hide popover on self-click
  w.addEventListener('click', e => e.stopPropagation());

  warrow = document.createElement('div');
  warrow.className = 'arrow';
  w.appendChild(warrow);

  wbody = document.createElement('ul');
  wbody.className = 'body';
  w.appendChild(wbody);

  document.body.appendChild(w);

  document.body.addEventListener('click', e => {
    // hide popover on page click
    w.style.display = 'none';
  });

})();
