/*
   Copyright 2015 Webnium. All Rights Reserved.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
(function () {
    'use strict';

    WinJS.Namespace.define('Viewer', {
        Stat: {
            currentLoadingCount: 0,
            clockOffsetTime: 0,
            zoom: 1,
            panX: 0,
            panY: 0,
            swipeX: 0,
            panning: false,
            zooming: false,
            zoomed: false,
            compressed: false,
            pointer: {}
        },
        Data: {
            imageInfo: {
                id: location.search.replace('?', ''),
                pin: null
            },
            imageFile: null
        },
        View: {
            title: $('<h1/>', { id: 'title' }),
            image: $('<img/>', { id: 'image', 'class': 'hide' })[0],
            infoContainer: $('<div/>', { id: 'info-container' }),
            bitrate: $('<span/>', { id: 'bitrate' }),
            expirationRibbon: $('<span/>', { id: 'expiration-ribbon' }).hide()
        },
        Timer: {
            displayingControls: null
        }
    });

    // Init Window

    Yabumi.ApplicationView.setPreferredMinSize(320, 320);

    var size = localStorage.getItem('window.size');
    if (size) {
        size = size.split('x');
        Yabumi.ApplicationView.tryResizeView(size[0], size[1]);
    }

    Yabumi.ApplicationView.setTitleBarColor(0xFF, 0xFF, 0xFF, 0xFF);

    // jquery-timeago

    jQuery.timeago.settings.allowFuture = true;
    jQuery.timeago.settings.strings = {
        prefixAgo: _L('timeago-prefixAgo') !== 'timeago-prefixAgo' ? _L('timeago-prefixAgo') : '',
        prefixFromNow: _L('timeago-prefixFromNow') !== 'timeago-prefixFromNow' ? _L('timeago-prefixFromNow') : '',
        suffixAgo: _L('timeago-suffixAgo') !== 'timeago-suffixAgo' ? _L('timeago-suffixAgo') : '',
        suffixFromNow: _L('timeago-suffixFromNow') !== 'timeago-suffixFromNow' ? _L('timeago-suffixFromNow') : '',
        seconds: _L('timeago-seconds'),
        minute: _L('timeago-minute'),
        minutes: _L('timeago-minutes'),
        hour: _L('timeago-hour'),
        hours: _L('timeago-hours'),
        day: _L('timeago-day'),
        days: _L('timeago-days'),
        month: _L('timeago-month'),
        months: _L('timeago-months'),
        year: _L('timeago-year'),
        years: _L('timeago-years'),
        wordSeparator: _L('timeago-wordSeparator') !== 'timeago-wordSeparator' ? _L('timeago-wordSeparator') : '',
        numbers: []
    };

    // Regular Events

    window.addEventListener('keydown', onKeydownHandler, true);
    window.addEventListener('wheel', onWheelHandler, true);
    window.addEventListener('pointerdown', onPointerDownHandler, true);
    window.addEventListener('pointermove', onPointerMoveHandler, true);
    window.addEventListener('pointerup', onPointerUpHandler, true);
    window.addEventListener('resize', onResizeHandler);

    // Platform Support

    if (Windows) {
        var systemNavigationManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
        systemNavigationManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
        systemNavigationManager.addEventListener('backrequested', goBack);

        var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.addEventListener('datarequested', shareHandler);

        if (Yabumi.Util.getDeviceFamily() === 'Windows.Xbox') {
            WinJS.UI.XYFocus.keyCodeMap.up.push(WinJS.Utilities.Key.upArrow);
            WinJS.UI.XYFocus.keyCodeMap.down.push(WinJS.Utilities.Key.downArrow);
            WinJS.UI.XYFocus.keyCodeMap.left.push(WinJS.Utilities.Key.leftArrow);
            WinJS.UI.XYFocus.keyCodeMap.right.push(WinJS.Utilities.Key.rightArrow);
        }
    }

    // Launch

    getInfo(getFile);// Early Loading

    window.addEventListener('DOMContentLoaded', function _init() {

        Viewer.View.progress = document.getElementById('progress');
        Viewer.View.appBarContainer = document.getElementById('appbar-container');
        Viewer.View.imageContainer = document.getElementById('image-container');
        Viewer.View.controls = document.getElementById('controls');
        Viewer.View.navs = document.getElementById('navs');

        initAppBar();
        initControls();
        initNavs();

        $(document.body)
            .append(Viewer.View.title)
            .append(Viewer.View.infoContainer)
            .append(Viewer.View.expirationRibbon);

        Viewer.View.imageContainer.appendChild(Viewer.View.image);

        Viewer.View.imageContainer.addEventListener('dblclick', onDblClickHandler, true);

        showControls();
    });

    // onKeydownHandler()

    function onKeydownHandler(e) {

        var active = document.activeElement && document.activeElement.tagName;

        if (active !== 'BODY' && active !== 'DIV' && active !== 'BUTTON') { return; }
        if (window.getSelection().toString() !== '') { return; }

        var activated = false;

        // CTRL + Q -> Quit
        if (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.q) {
            activated = true;
            window.close();
        }

        // CTRL + R -> Reload (for Debug)
        if (
            (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.r) ||
            (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.F5)
        ) {
            activated = true;
            location.reload();
        }

        // CTRL + SHIFT + C -> Copy Image (Bitmap)
        if (e.ctrlKey && e.shiftKey && e.keyCode === WinJS.Utilities.Key.c) {
            activated = true;
            copyImageBitmap();
        }

        // CTRL + C -> Copy URL
        if (e.ctrlKey && !e.shiftKey && e.keyCode === WinJS.Utilities.Key.c) {
            activated = true;
            copyURL();
        }

        // CTRL + S -> Save
        if (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.s) {
            activated = true;
            saveFile();
        }

        // CTRL + 0 -> Fit in Window
        if (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.num0) {
            activated = true;
            zoomImage(0);
        }

        // CTRL + 1 -> Actual Size
        if (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.num1) {
            activated = true;
            zoomImage(1);
        }

        // CTRL + - -> Zoom Out
        if (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.dash) {
            activated = true;
            zoomImage(-4);
        }

        // CTRL + + -> Zoom In
        if (e.ctrlKey && (e.keyCode === WinJS.Utilities.Key.add || e.keyCode === WinJS.Utilities.Key.equal)) {
            activated = true;
            zoomImage(-5);
        }

        // BS, ESC, ALT + LEFT -> Back
        if (
            (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.backspace) ||
            (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.escape) ||
            (!e.ctrlKey && e.altKey && e.keyCode === WinJS.Utilities.Key.leftArrow)
        ) {
            activated = true;
            goBack();
        }

        // H -> History
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.h) {
            activated = true;
            window.location.href = '/index.html#history';
        }

        // : -> Settings
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.semicolon) {
            activated = true;
            window.location.href = '/index.html#settings';
        }

        // LEFT -> Prev
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.leftArrow) {
            activated = true;
            goPrev();
        }

        // RIGHT -> Next
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.rightArrow) {
            activated = true;
            goNext();
        }

        // DELETE -> Delete
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.deleteKey) {
            activated = true;
            showDeleteImageDialog();
        }

        // I -> Information
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.i) {
            activated = true;
            Viewer.View.infoContainer.toggleClass('show');
        }

        // E -> Expiration
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.e) {
            activated = true;
            showExpirationFlyout();
        }

        // B -> Open In Browser
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.b) {
            activated = true;
            openInBrowser();
        }

        showControls();

        if (activated === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }

    // onResizeHandler()

    function onResizeHandler() {

        localStorage.setItem('window.size', [window.innerWidth, window.innerHeight].join('x'));

        panImage();
    }

    // onWheelHandler()

    function onWheelHandler(e) {

        if (e.target !== Viewer.View.imageContainer) {
            return;
        }

        if (e.ctrlKey) {
            if (e.deltaY > 0) {
                zoomImage(
                    -4,
                    e.offsetX - Viewer.View.imageContainer.clientWidth / 2,
                    e.offsetY - Viewer.View.imageContainer.clientHeight / 2
                );
            } else {
                zoomImage(
                    -5,
                    e.offsetX - Viewer.View.imageContainer.clientWidth / 2,
                    e.offsetY - Viewer.View.imageContainer.clientHeight / 2
                );
            }
        } else {
            if (e.deltaY > 0) {
                goNext();
            } else {
                goPrev();
            }
        }
    }

    // onPointerDownHandler()

    function onPointerDownHandler(e) {

        if (e.buttons === 8) {
            goBack();
            return;
        }

        if (e.target === Viewer.View.imageContainer) {
            if (e.pointerType === 'touch') {
                Viewer.Stat.pointer[e.pointerId.toString(10)] = {
                    x: e.offsetX,
                    y: e.offsetY,
                    movementX: e.movementX
                };

                Viewer.Stat.panning = true;

                if (Object.keys(Viewer.Stat.pointer).length === 2) {
                    Viewer.Stat.zooming = true;
                    Viewer.Stat.panning = false;
                } else if (Object.keys(Viewer.Stat.pointer).length >= 3) {
                    Viewer.Stat.zooming = false;
                    Viewer.Stat.panning = false;
                }

                $(Viewer.View.imageContainer).addClass('swiping');
            } else {
                Viewer.Stat.panning = true;
            }

            if (e.buttons === 1) {
                $(Viewer.View.controls).addClass('mute');
                $(Viewer.View.navs).addClass('mute');
                $(Viewer.View.expirationRibbon).addClass('mute');
            }
        }
    }

    // onPointerMoveHandler()

    function onPointerMoveHandler(e) {
        var currentPointerId = e.pointerId.toString(10);
        if (Viewer.Stat.panning === true) {
            if (Viewer.Stat.zoomed === true) {
                panImage(
                    Viewer.Stat.panX + (e.movementX / devicePixelRatio),
                    Viewer.Stat.panY + (e.movementY / devicePixelRatio)
                );
            } else {
                if (e.pointerType === 'touch') {
                    Viewer.Stat.swipeX += e.movementX / devicePixelRatio;

                    if (Viewer.Stat.swipeX > 20 && !Viewer.View.prevButton.is(':visible')) {
                        Viewer.Stat.swipeX = 20;
                    }
                    if (Viewer.Stat.swipeX < -20 && !Viewer.View.nextButton.is(':visible')) {
                        Viewer.Stat.swipeX = -20;
                    }

                    Viewer.View.imageContainer.style.marginLeft = Viewer.Stat.swipeX + 'px';

                    if (Math.abs(Viewer.Stat.swipeX) > (Viewer.View.imageContainer.clientWidth / 2)) {
                        $(Viewer.View.image).addClass('mute');
                    } else {
                        $(Viewer.View.image).removeClass('mute');
                    }
                }
            }
        } else if (Viewer.Stat.zooming === true) {
            if (e.pointerType === 'touch') {
                var pointerIds = Object.keys(Viewer.Stat.pointer);

                var otherPointerId = pointerIds.filter(function (pointerId) {
                    return pointerId !== currentPointerId;
                })[0];

                if (!otherPointerId) {
                    return;
                }

                var otherPointerX = Viewer.Stat.pointer[otherPointerId].x;
                var otherPointerY = Viewer.Stat.pointer[otherPointerId].y;
                var ratio = Math.sqrt(
                        (Math.pow(otherPointerX - e.offsetX, 2) + Math.pow(otherPointerY - e.offsetY, 2))
                        / (Math.pow(otherPointerX - Viewer.Stat.pointer[currentPointerId].x, 2)
                           + Math.pow(otherPointerY - Viewer.Stat.pointer[currentPointerId].y, 2))
                    );

                zoomImage(
                    Viewer.Stat.zoom * ratio,
                    otherPointerX - Viewer.View.imageContainer.clientWidth / 2,
                    otherPointerY - Viewer.View.imageContainer.clientHeight / 2
                );
            }
        }

        if (e.pointerType === 'touch') {
            Viewer.Stat.pointer[currentPointerId] = {
                x: e.offsetX,
                y: e.offsetY,
                movementX: e.movementX
            };
        }

        showControls();
    }

    // onPointerUpHandler()

    function onPointerUpHandler(e) {

        if (e.pointerType === 'touch') {
            if (
                // Swipe
                (Math.abs(Viewer.Stat.swipeX) > (Viewer.View.imageContainer.clientWidth / 2)) ||
                // Flick (testing)
                (Math.abs(Viewer.Stat.pointer[e.pointerId.toString(10)].movementX / devicePixelRatio) > 20)
            ) {
                if (Viewer.Stat.swipeX > 0 && Viewer.View.prevButton.is(':visible')) {
                    $(Viewer.View.imageContainer).addClass('hide');
                    Viewer.View.imageContainer.style.marginLeft = '100%';
                    setTimeout(goPrev, 200);
                } else if (Viewer.Stat.swipeX < 0 && Viewer.View.nextButton.is(':visible')) {
                    $(Viewer.View.imageContainer).addClass('hide');
                    Viewer.View.imageContainer.style.marginLeft = '-100%';
                    setTimeout(goNext, 200);
                } else {
                    Viewer.View.imageContainer.style.marginLeft = '0';
                }
            } else {
                Viewer.View.imageContainer.style.marginLeft = '0';
                $(Viewer.View.image).removeClass('mute');
            }

            $(Viewer.View.imageContainer).removeClass('swiping');

            Viewer.Stat.swipeX = 0;

            delete Viewer.Stat.pointer[e.pointerId.toString(10)];
        }

        if (Viewer.Stat.panning === true) {
            Viewer.Stat.panning = false;
        } else if (Viewer.Stat.zooming === true) {
            if (Object.keys(Viewer.Stat.pointer).length <= 1) {
                Viewer.Stat.zooming = false;
            }
        }

        $(Viewer.View.controls).removeClass('mute');
        $(Viewer.View.navs).removeClass('mute');
        $(Viewer.View.expirationRibbon).removeClass('mute');
    }

    // onDblClickHandler()

    function onDblClickHandler(e) {

        zoomImage(
            -3,
            e.offsetX - Viewer.View.imageContainer.clientWidth / 2,
            e.offsetY - Viewer.View.imageContainer.clientHeight / 2
        );
    }

    // initAppBar()

    function initAppBar() {

        var appBar = $('<div/>').appendTo(Viewer.View.appBarContainer);

        new WinJS.UI.AppBar(
            appBar[0],
            {
                data: new WinJS.Binding.List([
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'showresults',
                            label: _L('information'),
                            tooltip: _L('shortcut-information'),
                            onclick: function () {
                                Viewer.View.infoContainer.toggleClass('show');
                            }
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'share',
                            label: _L('share'),
                            tooltip: _L('shortcut-share'),
                            onclick: Yabumi.UI.showShareUI
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'link',
                            label: _L('copy url'),
                            tooltip: _L('shortcut-copy-url'),
                            onclick: copyURL
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'save',
                            label: _L('save'),
                            tooltip: _L('shortcut-save'),
                            onclick: saveFile
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'clock',
                            label: _L('expiration'),
                            tooltip: _L('shortcut-expiration'),
                            extraClass: 'expiration',
                            id: 'appbar-expiration-command-button',
                            onclick: showExpirationFlyout
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'delete',
                            label: _L('delete'),
                            tooltip: _L('shortcut-delete'),
                            extraClass: 'delete',
                            onclick: showDeleteImageDialog
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'secondary',
                            type: 'button',
                            icon: 'copy',
                            label: _L('copy image'),
                            tooltip: _L('shortcut-copy-image'),
                            onclick: copyImageBitmap
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'secondary',
                            type: 'button',
                            icon: 'go',
                            label: _L('open in browser'),
                            tooltip: _L('shortcut-open-in-browser'),
                            onclick: openInBrowser
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'secondary',
                            type: 'button',
                            icon: 'openwith',
                            label: _L('open with'),
                            tooltip: _L('open with'),
                            onclick: openWith
                        }
                    )
                ]),
                placement: 'top'
            }
        );
    }

    // initControls()

    function initControls() {

        Viewer.View.collapseButton = $('<button/>', {
            'class': 'collapse',
            html: '&#xE73F;'
        })
            .on('click', function () {
                zoomImage(-3);
            })
            .hide()
            .appendTo(Viewer.View.controls);

        Viewer.View.expandButton = $('<button/>', {
            'class': 'expand',
            html: '&#xE740;'
        })
            .on('click', function () {
                zoomImage(-3);
            })
            .hide()
            .appendTo(Viewer.View.controls);

        Viewer.View.zoomOutButton = $('<button/>', {
            'class': 'zoom-out',
            title: _L('shortcut-zoom-out'),
            html: '&#xE738;'
        })
            .on('click', function () {
                zoomImage(-4);
            })
            .appendTo(Viewer.View.controls);

        Viewer.View.zoomInButton = $('<button/>', {
            'class': 'zoom-in',
            title: _L('shortcut-zoom-in'),
            html: '&#xE710;'
        })
            .on('click', function () {
                zoomImage(-5);
            })
            .appendTo(Viewer.View.controls);
    }

    // initNavs()

    function initNavs() {

        Viewer.View.prevButton = $('<button/>', {
            'class': 'prev',
            title: _L('shortcut-prev'),
            html: '&#xE76B;'
        })
            .on('click', goPrev)
            .appendTo(Viewer.View.navs);

        Viewer.View.nextButton = $('<button/>', {
            'class': 'next',
            title: _L('shortcut-next'),
            html: '&#xE76C;'
        })
            .on('click', goNext)
            .appendTo(Viewer.View.navs);
    }

    // showControls()

    function showControls() {

        $(Viewer.View.controls).removeClass('hide');
        $(Viewer.View.navs).removeClass('hide');

        clearTimeout(Viewer.Timer.displayingControls);
        Viewer.Timer.displayingControls = setTimeout(function () {

            $(Viewer.View.controls).addClass('hide');
            $(Viewer.View.navs).addClass('hide');
        }, 3000);
    }

    // goBack()

    function goBack(e) {

        location.href = '/index.html';

        e && (e.handled = true);
    }

    // goPrev()

    function goPrev() {

        if (Viewer.Stat.currentLoadingCount !== 0) {
            return;
        }

        var i, l,
            images = Yabumi.Util.getImages(true);

        for (i = 0, l = images.length; i < l; i++) {
            if (images[i] === Viewer.Data.imageInfo.id) {
                if (images[i + 1]) {
                    // todo: speed up
                    window.location.href = '/viewer.html?' + images[i + 1];
                }
            }
        }
    }

    // goNext()

    function goNext() {

        if (Viewer.Stat.currentLoadingCount !== 0) {
            return;
        }

        var i, l,
            images = Yabumi.Util.getImages(true);

        for (i = 0, l = images.length; i < l; i++) {
            if (images[i] === Viewer.Data.imageInfo.id) {
                if (images[i - 1]) {
                    // todo: speed up
                    window.location.href = '/viewer.html?' + images[i - 1];
                }
            }
        }
    }

    // getInfo()

    function getInfo(done) {

        if (Yabumi.Networking.isOffline() === true) {
            $(Viewer.View.imageContainer).empty();
            Viewer.View.imageContainer.appendChild(Yabumi.UI.offlineView());
            return;
        }

        ++Viewer.Stat.currentLoadingCount;

        var xhr = new XMLHttpRequest();

        xhr.addEventListener('readystatechange', function () {

            if (this.readyState === 2) {
                if (this.getResponseHeader('Date')) {
                    Viewer.Stat.clockOffsetTime = Date.now() - new Date(this.getResponseHeader('Date')).getTime();
                }
            }
        });

        xhr.addEventListener('load', function () {

            --Viewer.Stat.currentLoadingCount;

            if (this.status >= 400 && this.status < 600) {
                Yabumi.UI.showMessageDialog({
                    title: _L('error'),
                    text: this.statusText + ' (' + this.status + ')',
                    onClose: goBack
                })

                return;
            } else {
                var info = JSON.parse(this.responseText);

                Viewer.Data.imageInfo = {
                    id: Viewer.Data.imageInfo.id,
                    pin: localStorage.getItem(Viewer.Data.imageInfo.id)
                };

                var k;
                for (k in info) {
                    Viewer.Data.imageInfo[k] = info[k];
                }
            }

            createInfo();

            done && done();
        });

        xhr.open('GET', Yabumi.API.getRoot() + 'images/' + Viewer.Data.imageInfo.id + '.json');
        xhr.send();
    }

    // getFile()

    function getFile(done) {

        if (Yabumi.Networking.isOffline() === true) {
            $(Viewer.View.imageContainer).empty();
            Viewer.View.imageContainer.appendChild(Yabumi.UI.offlineView());
            return;
        }

        ++Viewer.Stat.currentLoadingCount;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', getImageURL());
        xhr.responseType = 'blob';
        //xhr.responseType = (Viewer.Data.imageInfo.type === 'image/x-photoshop') ? 'arraybuffer' : 'blob';

        if (Viewer.View.progress) {
            $(Viewer.View.progress)
                .removeAttr('value')
                .removeAttr('max')
                .removeClass('hide');
        }

        var requestedTime = Date.now();

        xhr.addEventListener('readystatechange', function () {

            if (this.readyState === 2) {
                requestedTime = Date.now();

                if (this.status >= 400 && this.status < 600) {
                    Yabumi.UI.showMessageDialog({
                        title: _L('error'),
                        text: this.statusText + ' (' + this.status + ')',
                        onClose: goBack
                    })
                }
            }
        });

        xhr.addEventListener('progress', function (e) {

            if (e.lengthComputable) {
                $(Viewer.View.progress)
                    .attr('value', e.loaded)
                    .attr('max', e.total);
            }
        });

        xhr.addEventListener('load', function () {

            --Viewer.Stat.currentLoadingCount;

            if (this.status !== 200) {
                return;
            }

            $(Viewer.View.progress)
                .attr('value', 100)
                .attr('max', 100)
                .addClass('hide');

            var time = Date.now() - requestedTime;
            var mbps = 0;
            var size = this.response.size || this.response.byteLength;
            if (time > 10) {
                mbps = Math.round((size * 8) / (time / 1000) / 1024 / 1024 * 10) / 10;
                if (mbps < 1000) {
                    Viewer.View.bitrate.text(mbps + 'Mbps');
                } else {
                    Viewer.View.bitrate.text(_L('cached'));
                }
            } else {
                Viewer.View.bitrate.text(_L('cached'));
            }

            Viewer.Data.imageFile = this.response;

            drawImage();

            done && done();
        });

        xhr.send();
    }

    // getImageURL()

    function getImageURL() {

        var url = Yabumi.API.getRoot() + 'images/' + Viewer.Data.imageInfo.id + '.'

        var specialImageTypes = [
            'image/x-photoshop',
            'application/pdf',
            'image/svg+xml',
            'image/gif'
        ];

        var isCompressed = (
            (specialImageTypes.indexOf(Viewer.Data.imageInfo.type) === -1) &&
            (Yabumi.Networking.isMetered() === true) &&
            (Viewer.Data.imageInfo.size >= 1024 * 256)
        );

        Viewer.Stat.compressed = isCompressed;

        if (isCompressed) {
            return url + 'jpg?v=' + Viewer.Data.imageInfo.__v + '&convert=low';
        } else {
            return url + Viewer.Data.imageInfo.extension + '?v=' + Viewer.Data.imageInfo.__v;
        }
    }

    // createInfo()

    function createInfo() {

        var info = Viewer.Data.imageInfo;

        // title
        Yabumi.ApplicationView.setTitle(info.name || info.id);

        // created at
        Viewer.View.title.text(new Date(info.createdAt).toLocaleString());

        // expiration
        if (info.expiresAt) {
            Viewer.View.expirationRibbon
                .text(
                    _L('expiration') + ': ' +
                    new Date(info.expiresAt).toLocaleString() + ' - ' +
                    $.timeago(new Date(info.expiresAt))
                )
                .show();
        } else {
            Viewer.View.expirationRibbon.hide();
        }

        var size = Math.round(Viewer.Data.imageInfo.size / 1024),
            sizeSuffix = 'KB';
        if (size >= 1024) {
            size = Math.round(size / 1024);
            sizeSuffix = 'MB';
        }

        // info
        Viewer.View.infoContainer
            .empty()
            .append(
                $('<dl/>')
                    .append($('<dt/>', { text: _L('title') }))
                    .append($('<dd/>', { text: Viewer.Data.imageInfo.name || '-' }))
                    .append($('<dt/>', { text: _L('created at') }))
                    .append($('<dd/>', { text: new Date(Viewer.Data.imageInfo.createdAt).toLocaleString() }))
                    .append($('<dt/>', { text: _L('expiry date') }))
                    .append($('<dd/>', { text: Viewer.Data.imageInfo.expiresAt ? new Date(Viewer.Data.imageInfo.expiresAt).toLocaleString() : _L('never expires') }))
                    .append($('<dt/>', { text: _L('type') }))
                    .append($('<dd/>', { text: Viewer.Data.imageInfo.type }))
                    .append($('<dt/>', { text: _L('dimensions') }))
                    .append($('<dd/>', { text: Viewer.Data.imageInfo.width + '×' + Viewer.Data.imageInfo.height }))
                    .append($('<dt/>', { text: _L('size') }))
                    .append($('<dd/>', { text: size + sizeSuffix }).append(Viewer.View.bitrate))
                    .append($('<dt/>', { text: _L('via') }))
                    .append($('<dd/>', { text: Viewer.Data.imageInfo.by.app }))
            );

        // navigation
        setTimeout(function () {

            var images = Yabumi.Util.getImages(true);

            if (images[0] === Viewer.Data.imageInfo.id) {
                Viewer.View.prevButton.show();
                Viewer.View.nextButton.hide();
            } else if (images[images.length - 1] === Viewer.Data.imageInfo.id) {
                Viewer.View.prevButton.hide();
                Viewer.View.nextButton.show();
            } else {
                Viewer.View.prevButton.show();
                Viewer.View.nextButton.show();
            }
        }, 250);
    }

    // drawImage()

    function drawImage() {

        Viewer.View.image.style.width = '';
        Viewer.View.image.style.height = '';

        switch (Viewer.Data.imageInfo.type) {
            case 'application/pdf':
                drawPDF();
                break;
            case 'image/x-photoshop':
                drawPSD();
                break;
            default:
                Viewer.View.image.src = URL.createObjectURL(Viewer.Data.imageFile, { oneTimeOnly: true });
                $(Viewer.View.image).one('load', imageOnLoadHandler);
        }
    }

    // drawPDF()

    function drawPDF(password) {

        // Preview
        var input = Viewer.Data.imageFile.slice(0, -1, Viewer.Data.imageFile.type).msDetachStream();
        Windows.Data.Pdf.PdfDocument.loadFromStreamAsync(input)
            .done(
                function (pdfDocument) {

                    var memStream = new Windows.Storage.Streams.InMemoryRandomAccessStream();

                    var pdfPage = pdfDocument.getPage(0);
                    pdfPage.renderToStreamAsync(memStream)
                        .done(function () {
                            
                            var blob = MSApp.createBlobFromRandomAccessStream('image/bmp', memStream);
                            Viewer.View.image.src = URL.createObjectURL(blob, { oneTimeOnly: true });
                            $(Viewer.View.image).one('load', imageOnLoadHandler);

                            input.close();
                        });
                },
                function (error) {

                    input.close();
                    console.warn(error);
                }
            );

        // File Icon
        $('<button/>', { 'class': 'file-icon pdf', title: _L('open with') })
            .on('click', openWith)
            .appendTo(document.body);
    }

    // drawPSD()

    function drawPSD() {

        // Load PSD.js
        if (typeof PSD === 'undefined') {
            $.getScript('libraries/psd.js/psd.js', function () {
                drawPSD();
            });
            return;
        }

        // Preview
        var reader = new FileReader();
        reader.onload = function () {

            var psd = new PSD(new Uint8Array(this.result));
            psd.parse();

            var tree = psd.tree();

            var width = Viewer.Data.imageInfo.width = tree.width;
            var height = Viewer.Data.imageInfo.height = tree.height;

            psd.image.toPng().then(function (img) {

                Viewer.View.image.src = img.src;
                $(Viewer.View.image).one('load', imageOnLoadHandler);
            });
        };
        reader.readAsArrayBuffer(Viewer.Data.imageFile);

        // File Icon
        $('<button/>', { 'class': 'file-icon psd', title: _L('open with') })
            .on('click', openWith)
            .appendTo(document.body);
    }

    // imageOnLoadHandler()

    function imageOnLoadHandler() {

        if (!Viewer.Data.imageInfo.width || !Viewer.Data.imageInfo.height) {
            Viewer.Data.imageInfo.width = Viewer.View.image.scrollWidth;
            Viewer.Data.imageInfo.height = Viewer.View.image.scrollHeight;
        }

        Viewer.View.image.style.width = Viewer.Data.imageInfo.width + 'px';
        Viewer.View.image.style.height = Viewer.Data.imageInfo.height + 'px';

        panImage(0, 0);
        zoomImage(-1);

        $(Viewer.View.image).removeClass('hide');

        setTimeout(createInfo, 250);
    }

    // zoomImage()

    function zoomImage(ratio, targetX, targetY) {

        var vw = Viewer.View.imageContainer.clientWidth,
            vh = Viewer.View.imageContainer.clientHeight,
            iw = Viewer.Data.imageInfo.width,
            ih = Viewer.Data.imageInfo.height,
            dx = targetX || 0,
            dy = targetY || 0,
            oldRatio = Viewer.Stat.zoom,
            minRatio = Math.min(
                (vw < iw) ? vw / iw : 1,
                (vh < ih) ? vh / ih : 1
            ),
            maxRatio = Math.min(
                (vw > iw) ? vw / iw : 1,
                (vh > ih) ? vh / ih : 1
            ) * 5;

        if (ratio === 0) {
            // fit to window
            ratio = Math.min(vw / iw, vh / ih);
        } else if (ratio === -1) {
            // fit to window if larger
            ratio = minRatio;
        } else if (ratio === -2) {
            // fit to window if smaller
            ratio = Math.min(
                (vw > iw) ? vw / iw : 1,
                (vh > ih) ? vh / ih : 1
            );
        } else if (ratio === -3) {
            // toggle stretch
            if (Viewer.Stat.zoom === 1) {
                zoomImage(0, targetX, targetY);
            } else {
                zoomImage(1, targetX, targetY);
            }
            return;
        } else if (ratio === -4) {
            // zoom out
            ratio = Viewer.Stat.zoom * 0.8;
        } else if (ratio === -5) {
            // zoom in
            ratio = Viewer.Stat.zoom * 1.2;
        }

        ratio = Math.max(Math.min(ratio, maxRatio), minRatio);

        Viewer.View.image.style.width = (Viewer.Data.imageInfo.width * ratio) + 'px';
        Viewer.View.image.style.height = (Viewer.Data.imageInfo.height * ratio) + 'px';

        Viewer.Stat.zoom = ratio;

        if (ratio === minRatio) {
            Viewer.Stat.zoomed = false;
            Viewer.View.zoomOutButton.attr('disabled', true);
        } else {
            Viewer.Stat.zoomed = true;
            Viewer.View.zoomOutButton.attr('disabled', false);
        }

        if (ratio === maxRatio) {
            Viewer.View.zoomInButton.attr('disabled', true);
        } else {
            Viewer.View.zoomInButton.attr('disabled', false);
        }

        if (ratio === 1) {
            if (minRatio < 1) {
                Viewer.View.collapseButton.show();
                Viewer.View.expandButton.hide();
            } else {
                Viewer.View.collapseButton.hide();
                Viewer.View.expandButton.show();
            }
        } else {
            if (minRatio < 1) {
                Viewer.View.collapseButton.hide();
                Viewer.View.expandButton.show();
            } else {
                Viewer.View.collapseButton.show();
                Viewer.View.expandButton.hide();
            }
        }

        if (minRatio < 1) {
            Viewer.View.collapseButton.attr('title', _L('shortcut-fit-in-window'));
            Viewer.View.expandButton.attr('title', _L('shortcut-actual-size'));
        } else {
            Viewer.View.collapseButton.attr('title', _L('shortcut-actual-size'));
            Viewer.View.expandButton.attr('title', _L('shortcut-fit-in-window'));
        }                                             

        Viewer.Stat.panX = (Viewer.Stat.panX - dx) / oldRatio * ratio + dx;
        Viewer.Stat.panY = (Viewer.Stat.panY - dy) / oldRatio * ratio + dy;

        panImage();
    }

    function panImage(x, y) {

        var vw = Viewer.View.imageContainer.clientWidth,
            vh = Viewer.View.imageContainer.clientHeight,
            iw = Viewer.Data.imageInfo.width * Viewer.Stat.zoom,
            ih = Viewer.Data.imageInfo.height * Viewer.Stat.zoom,
            ix = ((vw - iw) / 2),
            iy = ((vh - ih) / 2);

        if (typeof x === 'undefined') {
            x = Viewer.Stat.panX;
        }

        if (typeof y === 'undefined') {
            y = Viewer.Stat.panY;
        }

        if (vw > iw) {
            x = 0;
        }

        if (vh > ih) {
            y = 0;
        }

        var nix = ix + x,
            niy = iy + y;

        // when on larger than view area.
        if (vw <= iw) {
            if (nix > 0) {
                nix = 0;
                x = -ix;
            } else if (nix < vw - iw) {
                nix = vw - iw;
                x = ix;
            }
        }

        if (vh <= ih) {
            if (niy > 0) {
                niy = 0;
                y = -iy;
            } else if (niy <= vh - ih) {
                niy = vh - ih;
                y = iy;
            }
        }

        Viewer.View.image.style.left = nix + 'px';
        Viewer.View.image.style.top = niy + 'px';

        Viewer.Stat.panX = x;
        Viewer.Stat.panY = y;
    }

    // openInBrowser()

    function openInBrowser() {

        if (!Viewer.Data.imageInfo.url) {
            return;
        }

        Windows.System.Launcher.launchUriAsync(
            new Windows.Foundation.Uri(Viewer.Data.imageInfo.url + '#pin=' + Viewer.Data.imageInfo.pin)
        );
    }

    // copyURL()

    function copyURL() {

        if (!Viewer.Data.imageInfo.url) {
            return;
        }

        var dataPackage = new Windows.ApplicationModel.DataTransfer.DataPackage();
        dataPackage.setText(Viewer.Data.imageInfo.url);
        dataPackage.setWebLink(new Windows.Foundation.Uri(Viewer.Data.imageInfo.url));
        Windows.ApplicationModel.DataTransfer.Clipboard.setContent(dataPackage);

        Yabumi.UI.notify({
            muted: true,
            title: Viewer.Data.imageInfo.name || Viewer.Data.imageInfo.id,
            text: _L('notify-url-to-clipboard'),
            launch: 'viewer/' + Viewer.Data.imageInfo.id
        });
    }

    // copyImageBitmap()

    function copyImageBitmap() {

        if (!Viewer.Data.imageInfo.url) {
            return;
        }

        var dataPackage = new Windows.ApplicationModel.DataTransfer.DataPackage();

        var blob;
        if (/^image\/[^x]/.test(Viewer.Data.imageInfo.type) === true) {
            blob = Viewer.Data.imageFile.slice(0, -1, Viewer.Data.imageFile.type);
        } else {
            var canvas = document.createElement('canvas');
            canvas.width = Viewer.Data.imageInfo.width;
            canvas.height = Viewer.Data.imageInfo.height;

            var context = canvas.getContext('2d');
            context.drawImage(Viewer.View.image, 0, 0);

            blob = canvas.msToBlob();
        }

        dataPackage.setBitmap(
            Windows.Storage.Streams.RandomAccessStreamReference.createFromStream(
                blob.msDetachStream()
            )
        );

        Windows.ApplicationModel.DataTransfer.Clipboard.setContent(dataPackage);

        Yabumi.UI.notify({
            muted: true,
            title: Viewer.Data.imageInfo.name || Viewer.Data.imageInfo.id,
            text: _L('notify-image-to-clipboard'),
            launch: 'viewer/' + Viewer.Data.imageInfo.id
        });
    }

    // openWith()

    function openWith() {

        if (!Viewer.Data.imageInfo.extension || !Viewer.Data.imageFile) {
            return;
        }

        var temporaryFolder = Windows.Storage.ApplicationData.current.temporaryFolder;

        var filename = Viewer.Data.imageInfo.id + '.' + Viewer.Data.imageInfo.extension;

        temporaryFolder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting)
            .then(function (file) {
                return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
            })
            .done(function (output) {
                // Get the IInputStream stream from the blob object
                var input = Viewer.Data.imageFile.slice(0, -1, Viewer.Data.imageFile.type).msDetachStream();

                // Copy the stream from the blob to the File stream 
                Windows.Storage.Streams.RandomAccessStream.copyAsync(input, output)
                    .then(function () {
                        return output.flushAsync();
                    })
                    .then(function () {
                        input.close();
                        output.close();
                        return temporaryFolder.getFileAsync(filename);
                    })
                    .done(function (file) {
                        var options = new Windows.System.LauncherOptions();
                        options.displayApplicationPicker = true;
                        return Windows.System.Launcher.launchFileAsync(file, options);
                    });
            });
        //<--temporaryFolder.createFileAsync()
    }

    // saveFile()

    function saveFile() {

        if (!Viewer.Data.imageInfo.extension || !Viewer.Data.imageFile) {
            return;
        }

        var filename = Viewer.Data.imageInfo.name || Viewer.Data.imageInfo.id;
        if (/\.[^.]{3,4}$/.test(filename) === true) {
            filename = filename.match(/^(.+)\.[^.]+$/)[1];
        }

        var savePicker = new Windows.Storage.Pickers.FileSavePicker();
        savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
        savePicker.fileTypeChoices.insert(Viewer.Data.imageInfo.type, ['.' + Viewer.Data.imageInfo.extension]);
        savePicker.suggestedFileName = filename;

        savePicker.pickSaveFileAsync()
            .then(
                function (file) {
                    if (file === null) {
                        return WinJS.Promise.wrapError(new Error('`file` is null'));
                    } else {
                        return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
                    }
                }
            )
            .done(
                function (output) {
                    // Get the IInputStream stream from the blob object
                    var input = Viewer.Data.imageFile.slice(0, -1, Viewer.Data.imageFile.type).msDetachStream();

                    // Copy the stream from the blob to the File stream 
                    Windows.Storage.Streams.RandomAccessStream.copyAsync(input, output)
                        .then(function () {
                            return output.flushAsync();
                        })
                        .done(function () {
                            input.close();
                            output.close();
                        });
                },
                function (e) {
                    console.warn(e.message);
                }
            );
        //<--savePicker.pickSaveFileAsync()
    }

    // showExpirationFlyout()

    function showExpirationFlyout() {

        if (Viewer.Stat.currentLoadingCount !== 0) {
            return;
        }

        if (Viewer.View.expirationFlyout) {
            Viewer.View.expirationFlyout.dispose();
            $(Viewer.View.expirationFlyout.element).remove();
            Viewer.View.expirationFlyout = null;
            return;
        }

        Viewer.View.expirationFlyout = new WinJS.UI.Flyout($('<div/>').appendTo(document.body)[0]);
        Viewer.View.expirationFlyout.addEventListener('afterhide', function () {

            Viewer.View.expirationFlyout.dispose();
            $(Viewer.View.expirationFlyout.element).remove();
            Viewer.View.expirationFlyout = null;
        });

        $('<h3/>', {
            text: _L('current settings') + ': ' +
                  (
                      Viewer.Data.imageInfo.expiresAt
                      ? new Date(Viewer.Data.imageInfo.expiresAt).toLocaleString()
                      : _L('never expires')
                  )
        }).appendTo(Viewer.View.expirationFlyout.element);

        var currentDate = new Date(Date.now() + 1000 * 60 * 60 * 24);

        var datePicker = new WinJS.UI.DatePicker($('<div/>').appendTo(Viewer.View.expirationFlyout.element)[0]);
        datePicker.minYear = new Date().getFullYear();
        datePicker.maxYear = new Date().getFullYear() + 1;
        datePicker.yearPattern = "{year.full}";
        datePicker.monthPattern = "{month.abbreviated}";
        datePicker.datePattern = "{day.integer(1)}";
        datePicker.current = currentDate;
        datePicker.element.style.marginRight = '20px';

        var timePicker = new WinJS.UI.TimePicker($('<div/>').appendTo(Viewer.View.expirationFlyout.element)[0]);
        timePicker.minuteIncrement = 5;
        timePicker.clock = '24HourClock';
        timePicker.current = currentDate;

        var setButton = $('<button/>', {
            'class': 'win-button',
            text: _L('set')
        }).appendTo(Viewer.View.expirationFlyout.element);
        setButton.on('click', function () {

            updateExpire(
                new Date(
                    (datePicker.current.getMonth() + 1) + '/' +
                    datePicker.current.getDate() + '/' +
                    datePicker.current.getFullYear() + ' ' +
                    timePicker.current.getHours() + ':' +
                    timePicker.current.getMinutes()
                )
            );

            Viewer.View.expirationFlyout.hide();
        });

        $('<br/>').appendTo(Viewer.View.expirationFlyout.element);

        var neverButton = $('<button/>', {
            'class': 'win-button',
            text: _L('clear the expiration')
        }).appendTo(Viewer.View.expirationFlyout.element);
        neverButton.on('click', function () {

            updateExpire(null);

            Viewer.View.expirationFlyout.hide();
        });

        Viewer.View.expirationFlyout.show(document.getElementById('appbar-expiration-command-button'), 'bottom');
    }

    // updateExpire()

    function updateExpire(time) {

        if (Viewer.Stat.currentLoadingCount !== 0) {
            return;
        }

        ++Viewer.Stat.currentLoadingCount;
        Yabumi.UI.showLoadingMask();

        var expiresAt = null;

        if (time !== null) {
            // offset
            if (typeof time === 'number') {
                expiresAt = Date.now() - Viewer.Stat.clockOffsetTime + time;
            } else if (time instanceof Date === true) {
                expiresAt = time.getTime();
            }
        }

        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', function () {

            --Viewer.Stat.currentLoadingCount;
            Yabumi.UI.hideLoadingMask();

            if (xhr.status >= 400 && xhr.status < 600) {
                Yabumi.UI.showMessageDialog({
                    title: _L('failed to update'),
                    text: this.statusText + ' (' + this.status + ')'
                });

                return;
            }

            localStorage.setItem('images.updated', '0');
            getInfo();

            Yabumi.UI.notify({
                muted: true,
                title: Viewer.Data.imageInfo.name || Viewer.Data.imageInfo.id,
                text: _L('notify-expiration-has-updated'),
                launch: 'viewer/' + Viewer.Data.imageInfo.id
            });
        });
        xhr.open('PUT', Yabumi.API.getRoot() + 'images/' + Viewer.Data.imageInfo.id + '.json');
        xhr.send(JSON.stringify({ pin: Viewer.Data.imageInfo.pin, expiresAt: expiresAt }));
    }

    // showDeleteImageDialog()

    function showDeleteImageDialog() {

        if (Viewer.Stat.currentLoadingCount !== 0) {
            return;
        }

        ++Viewer.Stat.currentLoadingCount;

        Yabumi.UI.showConfirmDialog({
            text: _L('note-delete-image'),
            yesButtonLabel: _L('yes, delete'),
            onClose: function () {
                --Viewer.Stat.currentLoadingCount;
            },
            onYes: deleteImage
        });
    }

    // deleteImage()

    function deleteImage() {

        if (Viewer.Stat.currentLoadingCount !== 0) {
            return;
        }

        $(Viewer.View.image).addClass('deleting');

        ++Viewer.Stat.currentLoadingCount;
        Yabumi.UI.showLoadingMask();

        var xhr = new XMLHttpRequest();

        xhr.addEventListener('load', function () {

            --Viewer.Stat.currentLoadingCount;
            Yabumi.UI.hideLoadingMask();

            if (this.status >= 400 && this.status < 600) {
                Yabumi.UI.showMessageDialog({
                    title: _L('error'),
                    text: this.statusText + ' (' + this.status + ')'
                });

                $(Viewer.View.image).removeClass('deleting');

                return;
            }

            localStorage.removeItem(Viewer.Data.imageInfo.id);
            localStorage.setItem('images.updated', '0');

            Yabumi.UI.showMessageDialog({
                text: _L('deleted successfully'),
                onClose: goBack
            });
        });

        xhr.open('DELETE', Yabumi.API.getRoot() + 'images/' + Viewer.Data.imageInfo.id + '.json');
        xhr.send('pin=' + Viewer.Data.imageInfo.pin);
    }

    // onShareHandler()

    function shareHandler(e) {

        if (!Viewer.Data.imageInfo.extension || !Viewer.Data.imageFile) {
            return;
        }

        var title = Viewer.Data.imageInfo.name || Viewer.Data.imageInfo.id;
        if (/\.[^.]{3,4}$/.test(title) === true) {
            title = title.match(/^(.+)\.[^.]+$/)[1];
        }

        var request = e.request;

        request.data.properties.title = title;
        request.data.properties.description = _L('share a url of this image');
        request.data.setWebLink(new Windows.Foundation.Uri(Viewer.Data.imageInfo.url));
    }

})();