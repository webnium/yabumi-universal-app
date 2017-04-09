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

    var Page = {
        View: {},
        Stat: {
            currentLoadingCount: 0,
            saveTraffic: false
        },
        Data: {
            images: [],
            history: {}
        },
        Timer: {}
    };

    initFragment['history'] = function () {

        Page.View.imagesContainer = document.getElementById('images-container');

        initAppBar();

        if (Yabumi.Networking.isOnline() === true) {
            syncHistory(getImages.bind(this, function () {

                if (sessionStorage.getItem('default.scrollTop')) {
                    var scrollTop = parseInt(sessionStorage.getItem('default.scrollTop'), 10);
                    Page.View.imagesContainer.style.height = (scrollTop + 800) + 'px';
                    Index.View.fragment.scrollTop = scrollTop;
                }

                viewImages();

                Page.View.imagesContainer.style.height = 'auto';
            }));
        } else {
            Yabumi.UI.offlineView(doReload).appendTo(Page.View.imagesContainer);
        }

        Index.View.fragment.addEventListener('scroll', onScrollHandler);
        window.addEventListener('resize', onResizeHandler);
        window.addEventListener('keydown', onKeydownHandler, true);

        if (Windows) {
            Windows.ApplicationModel.DataTransfer.Clipboard.addEventListener('contentchanged', checkClipboardContent);
            window.addEventListener('focus', checkClipboardContent);
            setTimeout(checkClipboardContent, 250);
        }
    };

    deinitFragment['history'] = function () {

        Index.View.fragment.removeEventListener('scroll', onScrollHandler);
        window.removeEventListener('resize', onResizeHandler);
        window.removeEventListener('keydown', onKeydownHandler, true);

        if (Windows) {
            Windows.ApplicationModel.DataTransfer.Clipboard.removeEventListener('contentchanged', checkClipboardContent);
            window.removeEventListener('focus', checkClipboardContent);
        }
    };

    async function onKeydownHandler(e) {

        var active = document.activeElement && document.activeElement.tagName;

        if (active !== 'BODY' && active !== 'DIV' && active !== 'BUTTON') { return; }
        if (window.getSelection().toString() !== '') { return; }

        var activated = false;

        // CTRL + R -> Reload
        if (
            (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.r) ||
            (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.F5)
        ) {
            activated = true;
            doReload();
        }

        // ENTER -> Select First Image
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.enter && active !== 'BUTTON') {
            activated = true;
            if (Page.Data.images[0] && Page.Data.images[0].id) {
                location.href = '/app/viewer.html?' + Page.Data.images[0].id;
            }
        }

        // F -> Upload from File
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.f) {
            activated = true;
            location.href = '/app/uploader.html?file';
        }

        // S -> Take Screenshot
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.s) {
            activated = true;
            const ApplicationModel = Windows.ApplicationModel;
            await ApplicationModel.FullTrustProcessLauncher.launchFullTrustProcessForCurrentAppAsync();
            window.close();
        }

        // C -> Upload from Camera
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.c) {
            activated = true;
            location.href = '/app/uploader.html?camera';
        }

        // CTRL + V -> Upload from Clipboard
        if (
            (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.v)
        ) {
            activated = true;
            Page.View.pasteButton.click();
        }

        if (activated === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }

    function onScrollHandler(e) {

        clearTimeout(Page.Timer.scrollToViewImage);
        Page.Timer.scrollToViewImage = setTimeout(viewImages, 10);
    }

    function onResizeHandler(e) {

        viewImages();
    }

    function checkClipboardContent() {

        if (document.hasFocus() === false) {
            return;
        }

        var dataPackageView = Windows.ApplicationModel.DataTransfer.Clipboard.getContent();

        if (dataPackageView.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.bitmap)) {

            $(Page.View.pasteButton).attr('disabled', false);
        } else if (dataPackageView.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.storageItems)) {
            dataPackageView.getStorageItemsAsync().then(function (storageItems) {

                var allowTypes = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.psd', '.bmp'];

                if (storageItems.getAt(0).fileType && allowTypes.indexOf(storageItems.getAt(0).fileType.toLowerCase()) !== -1) {
                    $(Page.View.pasteButton).attr('disabled', false);
                } else {
                    $(Page.View.pasteButton).attr('disabled', true);
                }
            });
        } else {
            $(Page.View.pasteButton).attr('disabled', true);
        }
    }

    function initAppBar() {

        const appBar = $('<div/>').appendTo(Index.View.appBarContainer);

        const appBarObject = new WinJS.UI.AppBar(
            appBar[0],
            {
                data: new WinJS.Binding.List([
                    new WinJS.UI.AppBarCommand(
                        Page.View.reloadButton = $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'sync',
                            label: _L('reload'),
                            tooltip: _L('shortcut-reload'),
                            onclick: doReload
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'add',
                            label: _L('from file'),
                            tooltip: _L('shortcut-pick-a-image'),
                            onclick: () => {
                                location.href = '/app/uploader.html?file';
                            }
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'crop',
                            label: _L('screenshot'),
                            tooltip: _L('shortcut-take-a-screenshot'),
                            onclick: async () => {
                                const ApplicationModel = Windows.ApplicationModel;
                                await ApplicationModel.FullTrustProcessLauncher.launchFullTrustProcessForCurrentAppAsync();
                                window.close();
                            }
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'camera',
                            label: _L('from camera'),
                            tooltip: _L('shortcut-take-a-picture'),
                            onclick: () => {
                                location.href = '/app/uploader.html?camera';
                            }
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        Page.View.pasteButton = $('<button/>', { disabled: true })[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'paste',
                            label: _L('from clipboard'),
                            tooltip: _L('shortcut-clipboard'),
                            onclick: () => {
                                location.href = '/app/uploader.html?clipboard';
                            }
                        }
                    )
                ]),
                placement: 'top'
            }
        );
    }

    function doReload() {

        if (Page.Stat.currentLoadingCount !== 0) {
            return;
        }

        localStorage.setItem('images.updated', '0');
        localStorage.setItem('history.updated', '0');

        syncHistory(getImages.bind(this, viewImages.bind(this)));
    }

    function loading() {

        ++Page.Stat.currentLoadingCount;

        if (Page.Stat.currentLoadingCount === 1) {
            $(Page.View.reloadButton).addClass('loading');
        }
    }

    function loaded() {

        --Page.Stat.currentLoadingCount;

        if (Page.Stat.currentLoadingCount === 0) {
            $(Page.View.reloadButton).removeClass('loading');
        }
    }

    function findImages() {
    
        let i, j, l, m, image,
            images = Yabumi.Util.getImages();

        for (i = 0, l = images.length; i < l; i++) {
            image = images[i];

            for (j = 0, m = Page.Data.images.length; j < m; j++) {
                if (Page.Data.images[j].id === image.id) {
                    image = null;
                    break;
                }
            }

            if (image === null) {
                continue;
            }

            Page.Data.images.unshift(image);
        }

        console.debug('history', 'findImages()', Page.Data.images.length);
    }

    function getImages(done) {

        findImages();

        if (Yabumi.Networking.isOffline() === true || Page.Data.images.length === 0) {
            done();
            return;
        }

        if (localStorage.getItem('images') && localStorage.getItem('images.updated')) {
            if (parseInt(localStorage.getItem('images.updated'), 10) > Date.now() - 180000) {
                Page.Data.images = JSON.parse(localStorage.getItem('images'));

                done();
                return;
            }
        }

        loading();

        console.debug('history', 'getImages()', 'request', Page.Data.images.length, 'images');

        const xhr = new XMLHttpRequest();

        xhr.addEventListener('load', function () {

            loaded();

            if (this.status === 200) {
                localStorage.setItem('images', this.responseText);
                localStorage.setItem('images.updated', Date.now().toString(10));

                let images = JSON.parse(this.responseText);

                Page.Data.images.forEach(image => {

                    let found = false;
                    for (let i = 0, l = images.length; i < l; i++) {
                        if (images[i].id === image.id) {
                            found = true;
                            break;
                        }
                    }

                    if (found === false) {
                        localStorage.removeItem(image.id);
                    }
                });//<--Page.Data.images.forEach()

                Page.Data.images = images;

                console.debug('history', 'getImages()', 'ok', Page.Data.images.length, 'images');
            } else {
                Yabumi.UI.showMessageDialog({
                    title: _L('error'),
                    text: this.statusText + ' (' + this.status + ')'
                });

                console.warn('history', 'getImages()', 'error', this.status);
            }

            done();
        });

        const ids = Page.Data.images.map(image => image.id);

        xhr.open('POST', Yabumi.API.getRoot() + 'images.json');
        xhr.send('_method=get&id=' + ids.join('%2B'));
    }

    function viewImages() {

        if (Page.Data.images.length === 0 || Page.Stat.currentLoadingCount !== 0) {
            return;
        }

        var width = Page.View.imagesContainer.clientWidth - 1,
            height = 0,
            margin = 2,
            viewScroll = Index.View.fragment.scrollTop,
            viewHeight = Index.View.fragment.clientHeight,
            lines = [],
            line = null,
            targetImages = [],
            i, l, j, m, image, size, sizeSuffix;

        // clear contents
        i = Page.View.imagesContainer.childNodes.length;
        while (i--) {
            Page.View.imagesContainer.removeChild(Page.View.imagesContainer.childNodes[i]);
        }

        for (i = 0, l = Page.Data.images.length; i < l; i++) {
            image = Page.Data.images[i];

            if (line === null || line.width === width) {
                if (line !== null) {
                    height += line.height + margin;
                }

                line = {
                    _div: document.createElement('div'),
                    images: [],
                    width: 0,
                    height: 200
                };

                lines.push(line);

                Page.View.imagesContainer.appendChild(line._div);
            }

            line.images.push(image);

            if (!image.width) {
                image.width = 210;
            }
            if (!image.height) {
                image.height = 297;
            }

            image._width = Math.round(image.width * 200 / image.height);
            image._height = line.height;

            if (image._width > width * 0.8) {
                image._width = width;
                image._height = Math.round(image.height * width / image.width);
            }

            if (image._div) {
                image._div.style.width = image._width + 'px';
                image._div.style.height = image._height + 'px';

                line._div.appendChild(image._div);
            } else {
                image._div = document.createElement('div');

                image._div.setAttribute('tabindex', '0');
                image._div.style.width = image._width + 'px';
                image._div.style.height = image._height + 'px';

                line._div.appendChild(image._div);

                image._div.addEventListener('click', createImageOnClickHander(image.id));

                size = Math.round(image.size / 1024);
                sizeSuffix = 'KB';
                if (size >= 1024) {
                    size = Math.round(size / 1024);
                    sizeSuffix = 'MB';
                }

                image._div.title = (image.name || image.id) + ' (' + image.type + ', ' + size + sizeSuffix + ')';

                if (image.expiresAt) {
                    $('<div/>', {
                        'class': 'expires',
                        text: _L('expiration') + ': ' + new Date(image.expiresAt).toLocaleString()
                    }).appendTo(image._div);
                }
            }

            // get thumbnail if display range
            if (!image.acquiredThumbnail && (height > viewScroll - 400) && (height < viewScroll + viewHeight)) {
                targetImages.push(image);
            }

            line.width += image._width;
            line.height = image._height;

            if (line.width > (width - ((line.images.length - 1) * margin)) * 0.8) {
                line.height = Math.floor(line.height * (width - ((line.images.length - 1) * margin)) / line.width);
                line.width = 0;

                for (j = 0, m = line.images.length; j < m; j++) {
                    line.images[j]._width = Math.floor(line.images[j]._width * line.height / line.images[j]._height);
                    line.images[j]._height = line.height;

                    if (j === m - 1) {
                        line.images[j]._width = (width - ((line.images.length - 1) * margin)) - line.width;
                        line.width = width;
                    } else {
                        line.width += line.images[j]._width;
                    }

                    line.images[j]._div.style.width = line.images[j]._width + 'px';
                    line.images[j]._div.style.height = line.height + 'px';
                }
            }

            if (height > viewScroll + viewHeight + 1280) {
                break;
            }
        }//<--for Page.Data.images

        // update scroll state
        clearTimeout(Page.Timer.updateScrollTop);
        Page.Timer.updateScrollTop = setTimeout(function () {

            Page.Stat.saveTraffic = Yabumi.Networking.isMetered();

            targetImages.forEach(function (image, i) {

                image.acquiredThumbnail = true;
                setTimeout(getThumbnail, 15 * i, image);
            });

            sessionStorage.setItem('default.scrollTop', viewScroll.toString(10));
        }, 300);

        //console.debug('history', 'viewImages()', width, height, viewScroll, viewHeight);
    }

    function createImageOnClickHander(imageId) {

        return function (e) {
            location.href = '/app/viewer.html?' + imageId;
        };
    }

    function getThumbnail(image) {

        if (image.extension === 'pdf') {
            $('<img/>', {
                src: '/images/thumbnail-pdf.svg',
                'class': 'visible pdf'
            }).appendTo(image._div);
        } else if (image.extension === 'psd') {
            $('<img/>', {
                src: '/images/thumbnail-psd.svg',
                'class': 'visible psd'
            }).appendTo(image._div);
        } else {
            var url = Yabumi.API.getRoot() + 'images/' + image.id + '.';

            if (Page.Stat.saveTraffic === true) {
                if (image.extension === 'gif' && image.size > 1024 * 256) {
                    url += 'jpg?v=' + image.__v + '&convert=low';
                } else if (image.extension !== 'gif' && image.size > 1024 * 128) {
                    url += 'jpg?v=' + image.__v + '&convert=low';
                } else {
                    url += image.extension + '?v=' + image.__v;
                }
            } else {
                if (image.extension === 'gif' && image.size > 1024 * 1024) {
                    url += 'jpg?v=' + image.__v + '&convert=medium';
                } else if (image.extension !== 'gif' && (image.width + image.height > 2000 || image.size > 1024 * 400)) {
                    url += 'jpg?v=' + image.__v + '&convert=medium';
                } else {
                    url += image.extension + '?v=' + image.__v;
                }
            }

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'blob';

            var progress = document.createElement('progress');
            progress.max = image.size;
            image._div.appendChild(progress);

            xhr.addEventListener('progress', function (e) {

                progress.value = e.loaded;
            });

            xhr.addEventListener('load', function () {

                if (this.status >= 400 && this.status < 600) {
                    console.warn(this.status + ' ' + this.statusText + ': ' + url);
                } else {
                    image._div.removeChild(progress);

                    var img = document.createElement('img');
                    img.src = URL.createObjectURL(this.response, { oneTimeOnly: true });
                    img.onload = function () {
                        setImmediate(function () {
                            this.className = 'visible';
                        }.bind(this), 0);
                    };
                    image._div.appendChild(img);
                }
            });

            xhr.send();
        }
    }

    function syncHistory(done) {

        if (Yabumi.Networking.isOffline() === true || Yabumi.API.getHistoryId() === null) {
            done();
            return;
        }

        var isReachedRateLimit = (
            localStorage.getItem('history.updated') &&
            parseInt(localStorage.getItem('history.updated'), 10) > Date.now() - 180000
        );
        if (isReachedRateLimit) {
            done();
            return;
        }


        loading();

        console.debug('history', 'syncHistory()', 'id', Yabumi.API.getHistoryId());

        var xhr = new XMLHttpRequest();

        xhr.open('GET', Yabumi.API.getRoot() + 'histories/' + Yabumi.API.getHistoryId() + '.json');

        xhr.addEventListener('load', function () {

            loaded();

            if (this.status === 200) {
                localStorage.setItem('history.updated', Date.now().toString(10));

                Page.Data.history = JSON.parse(this.responseText);

                findImages();

                var i, j, l, m, found, outdated = false;

                // mine
                for (i = 0, l = Page.Data.images.length; i < l; i++) {
                    found = false;
                    for (j = 0, m = Page.Data.history.images.length; j < m; j++) {
                        if (Page.Data.images[i].id === Page.Data.history.images[j].id) {
                            found = true;
                            break;
                        }
                    }
                    if (found === false) {
                        outdated = true;

                        Page.Data.history.images.push({
                            id: Page.Data.images[i].id,
                            pin: Page.Data.images[i].pin
                        });
                    }
                }

                // theirs
                for (i = 0, l = Page.Data.history.images.length; i < l; i++) {
                    found = false;
                    for (j = 0, m = Page.Data.images.length; j < m; j++) {
                        if (Page.Data.history.images[i].id === Page.Data.images[j].id) {
                            found = true;
                            break;
                        }
                    }
                    if (found === false) {
                        localStorage.setItem(Page.Data.history.images[i].id, Page.Data.history.images[i].pin);
                    }
                }

                done();

                if (outdated === true) {
                    saveHistory();
                }
            } else if (this.status === 404) {
                Yabumi.API.clearHistoryId();

                done();
            }
        });

        xhr.send();
    }

    function saveHistory() {

        var xhr = new XMLHttpRequest();
        xhr.open('PUT', Yabumi.API.getRoot() + 'histories/' + Yabumi.API.getHistoryId() + '.json');
        xhr.send(JSON.stringify(Page.Data.history));
    }

})();