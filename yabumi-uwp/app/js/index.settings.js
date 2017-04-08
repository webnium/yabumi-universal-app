/*
   Copyright 2016 Webnium. All Rights Reserved.

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
        Stat: {},
        Data: {},
        Timer: {}
    };

    initFragment['settings'] = function () {

        Page.View.container = document.getElementById('settings-container');

        initAppBar();
        initPivot();
        initGeneralContents();
        initPrivacyPolicyContents();
        initAboutContents();
    };

    deinitFragment['settings'] = function () {

        !!Page.View.unsyncIdFlyout && Page.View.unsyncIdFlyout.dispose() && Page.View.unsyncIdFlyout.element.removeNode(true);
        !!Page.View.syncIdFlyout && Page.View.syncIdFlyout.dispose() && Page.View.syncIdFlyout.element.removeNode(true);
    };

    function initAppBar() {

        var appBar = $('<div/>').appendTo(Index.View.appBarContainer);

        var appBarObject = new WinJS.UI.AppBar(
            appBar[0],
            {
                data: new WinJS.Binding.List([
                ]),
                placement: 'top'
            }
        );
    }

    function initPivot() {

        var pivot = $('<div/>').appendTo(Page.View.container);

        var pivotObject = new WinJS.UI.Pivot(
            pivot[0],
            {
                items: new WinJS.Binding.List([
                    Page.View.generalPivotItem = new WinJS.UI.PivotItem(
                        $('<div/>')[0],
                        {
                            header: _L('general')
                        }
                    ),
                    Page.View.privacyPolicyPivotItem = new WinJS.UI.PivotItem(
                        $('<div/>')[0],
                        {
                            header: _L('privacy policy')
                        }
                    ),
                    Page.View.aboutPivotItem = new WinJS.UI.PivotItem(
                        $('<div/>')[0],
                        {
                            header: _L('about yabumi')
                        }
                    )
                ])
            }
        );
    }

    function initGeneralContents() {

        var container = $(Page.View.generalPivotItem.contentElement);
        container.empty();

        //
        // upload
        //

        var uploadSection = $('<div/>', { 'class': 'win-settings-section' }).appendTo(container);
        $('<h2/>', { text: _L('upload') }).appendTo(uploadSection);

        var copyURLToClipboardToggleSwitch = new WinJS.UI.ToggleSwitch($('<div/>').appendTo(uploadSection)[0], {
            title: _L('copy url to clipboard'),
            checked: !!Yabumi.Util.getRoamingSetting('config.copyURLToClipboard')
        });
        copyURLToClipboardToggleSwitch.addEventListener('change', function () {

            if (copyURLToClipboardToggleSwitch.checked === true) {
                Yabumi.Util.setRoamingSetting('config.copyURLToClipboard', true);
            } else {
                Yabumi.Util.setRoamingSetting('config.copyURLToClipboard', false);
            }
        });

        var openImageWithSystemBrowserAfterUploadToggleSwitch = new WinJS.UI.ToggleSwitch($('<div/>').appendTo(uploadSection)[0], {
            title: _L('open image with system browser after upload'),
            checked: !!Yabumi.Util.getLocalSetting('config.openSystemBrowserAfterUpload')
        });
        openImageWithSystemBrowserAfterUploadToggleSwitch.addEventListener('change', function () {

            if (openImageWithSystemBrowserAfterUploadToggleSwitch.checked === true) {
                Yabumi.Util.setLocalSetting('config.openSystemBrowserAfterUpload', true);
            } else {
                Yabumi.Util.setLocalSetting('config.openSystemBrowserAfterUpload', false);
            }
        });

        $('<label/>', { text: _L('default expiration') }).appendTo(uploadSection);

        var defaultExpiresSelect = $('<select/>').appendTo(uploadSection);
        defaultExpiresSelect.on('change', function () {

            Yabumi.Util.setRoamingSetting('config.defaultExpiration', defaultExpiresSelect.val());
        });
        $('<option/>', { value: '0', text: _L('never expires') }).appendTo(defaultExpiresSelect);
        $('<option/>', { value: '180000', text: '3 ' + _L('minutes') }).appendTo(defaultExpiresSelect);
        $('<option/>', { value: '1800000', text: '30 ' + _L('minutes') }).appendTo(defaultExpiresSelect);
        $('<option/>', { value: '3600000', text: '60 ' + _L('minutes') }).appendTo(defaultExpiresSelect);
        $('<option/>', { value: '86400000', text: '24 ' + _L('hours') }).appendTo(defaultExpiresSelect);
        $('<option/>', { value: '259200000', text: '3 ' + _L('days') }).appendTo(defaultExpiresSelect);
        $('<option/>', { value: '604800000', text: '7 ' + _L('days') }).appendTo(defaultExpiresSelect);
        $('<option/>', { value: '2592000000', text: '30 ' + _L('days') }).appendTo(defaultExpiresSelect);

        if (Yabumi.Util.getRoamingSetting('config.defaultExpiration')) {
            defaultExpiresSelect.val(Yabumi.Util.getRoamingSetting('config.defaultExpiration'));
        } else {
            Yabumi.Util.setRoamingSetting('config.defaultExpiration', defaultExpiresSelect.value = '86400000');
        }

        //
        // history
        //

        var historySection = $('<div/>', { 'class': 'win-settings-section' }).appendTo(container);
        $('<h2/>', { text: _L('history') }).appendTo(historySection);

        var syncToggleSwitch = new WinJS.UI.ToggleSwitch($('<div/>').appendTo(historySection)[0], {
            title: _L('history syncing'),
            checked: !!Yabumi.Util.getRoamingSetting('config.historyId')
        });
        syncToggleSwitch.addEventListener('change', function (e) {

            if (syncToggleSwitch.checked === true) {
                syncIdFlyout.show(syncToggleSwitch.element);
            } else {
                unsyncIdFlyout.show(syncToggleSwitch.element);
            }
        });

        if (Yabumi.Util.getRoamingSetting('config.historyId')) {
            $('<label/>', { text: _L('syncing key') }).appendTo(historySection);
            $('<input/>', {
                type: 'text',
                value: Yabumi.Util.getRoamingSetting('config.historyId'),
                disabled: true,
                'class': 'sync-id'
            }).appendTo(historySection);
        }

        !!Page.View.unsyncIdFlyout && Page.View.unsyncIdFlyout.dispose() && Page.View.unsyncIdFlyout.element.removeNode(true);
        var unsyncIdFlyout = Page.View.unsyncIdFlyout = new WinJS.UI.Flyout($('<div/>').appendTo(document.body)[0]);
        unsyncIdFlyout.addEventListener('afterhide', function () {

            initGeneralContents();
        });

        $('<h3/>', { text: _L('deactive history syncing') }).appendTo(unsyncIdFlyout.element);

        $('<br/>').appendTo(unsyncIdFlyout.element);

        // unsync button
        $('<button/>', {
            'class': 'win-button',
            text: _L('deactive on this client only')
        }).click(function () {

            Yabumi.Util.setRoamingSetting('config.historyId', null);

            unsyncIdFlyout.hide();
            initGeneralContents();
        }).appendTo(unsyncIdFlyout.element);

        // space
        $('<span> </span>').appendTo(unsyncIdFlyout.element);

        // purge sync button
        $('<button/>', {
            'class': 'red win-button',
            text: _L('purge syncing key')
        }).click(function () {

            // create mask
            var mask = $('<div/>', { 'class': 'mask' }).appendTo(unsyncIdFlyout.element);
            $('<progress/>', { 'class': 'win-ring' }).appendTo(mask);

            $.ajax({
                type: 'DELETE',
                url: Yabumi.API.getRoot() + 'histories/' + Yabumi.Util.getRoamingSetting('config.historyId') + '.json',
                success: function () {

                    Yabumi.Util.setRoamingSetting('config.historyId', null);

                    mask.remove();
                    unsyncIdFlyout.hide();
                    initGeneralContents();
                },
                error: function (xhr) {

                    Yabumi.UI.showMessageDialog({
                        title: _L('error'),
                        text: xhr.statusText + ' (' + xhr.status + ')'
                    });

                    mask.remove();
                }
            });
        }).appendTo(unsyncIdFlyout.element);

        !!Page.View.syncIdFlyout && Page.View.syncIdFlyout.dispose() && Page.View.syncIdFlyout.element.removeNode(true);
        var syncIdFlyout = Page.View.syncIdFlyout = new WinJS.UI.Flyout($('<div/>').appendTo(document.body)[0]);
        syncIdFlyout.addEventListener('aftershow', function () {

            syncIdInput.focus();
        });
        syncIdFlyout.addEventListener('afterhide', function () {

            initGeneralContents();
        });

        var checkSyncId = function () {

            saveSyncIdButton.attr('disabled', true);

            if (syncIdInput.val().length === 24 && /^[a-f0-9]+$/.test(syncIdInput.val())) {
                $.ajax({
                    type: 'HEAD',
                    url: Yabumi.API.getRoot() + 'histories/' + syncIdInput.val() + '.json',
                    success: function () {
                        saveSyncIdButton.attr('disabled', false);
                    }
                });
            }
        };

        $('<label/>', { text: _L('syncing key') + ': ' }).appendTo(syncIdFlyout.element);

        var syncIdInput = $('<input/>', {
            type: 'text',
            placeholder: '...',
            maxlength: '24',
            'class': 'sync-id'
        }).appendTo(syncIdFlyout.element);

        syncIdInput.on('keyup', checkSyncId);
        syncIdInput.on('pointerup', checkSyncId);

        // get a new one
        $('<button/>', {
            'class': 'win-button',
            text: _L('get a new one')
        }).click(function () {

            // create mask
            var mask = $('<div/>', { 'class': 'mask' }).appendTo(syncIdFlyout.element);
            $('<progress/>', { 'class': 'win-ring' }).appendTo(mask);

            $.ajax({
                type: 'POST',
                url: Yabumi.API.getRoot() + 'histories.json',
                success: function (history) {

                    syncIdInput.val(history.id);
                    saveSyncIdButton.attr('disabled', false);

                    setTimeout(function () {

                        saveSyncIdButton.click();

                        mask.remove();
                    }, 1000);
                },
                error: function (xhr) {

                    Yabumi.UI.showMessageDialog({
                        title: _L('error'),
                        text: xhr.statusText + ' (' + xhr.status + ')'
                    });

                    mask.remove();
                }
            });
        }).appendTo(syncIdFlyout.element);

        // space
        $('<span> </span>').appendTo(syncIdFlyout.element);

        // save
        var saveSyncIdButton = $('<button/>', {
            'class': 'win-button blue',
            disabled: true,
            text: _L('save')
        }).click(function () {

            if (saveSyncIdButton.is(':disabled') === true || syncIdInput.val().length !== 24) {
                return;
            }

            Yabumi.Util.setRoamingSetting('config.historyId', syncIdInput.val());

            syncIdFlyout.hide();
            initGeneralContents();
        }).appendTo(syncIdFlyout.element);

        //
        // advanced
        //
        /*
        var advancedSection = $('<div/>', { 'class': 'win-settings-section' }).appendTo(container);
        $('<h2/>', { text: _L('advanced') }).appendTo(advancedSection);
        $('<p/>', { text: _L('note-api-root') }).appendTo(advancedSection);

        $('<label/>', { text: 'API Root' }).appendTo(advancedSection);
        $('<small/>', { text: 'https://' }).appendTo(advancedSection);

        $('<input/>', {
            type: 'text',
            placeholder: 'yabumi.cc/api/',
            value: Yabumi.Util.getRoamingSetting('config.apiRoot')
        }).on('change', function (e) {

            e.target.value = e.target.value.trim();

            if (/^https?:\/\//.test(e.target.value)) {
                e.target.value = e.target.value.replace(/^https?:\/\//, '');
            }

            if (e.target.value !== '' && /\/$/.test(e.target.value) === false) {
                e.target.value = e.target.value + '/';
            }

            if (e.target.value) {
                Yabumi.Util.setRoamingSetting('config.apiRoot', e.target.value);
            } else {
                Yabumi.Util.setRoamingSetting('config.apiRoot', null);
            }
        }).appendTo(advancedSection);

        $('<div/>', { css: { height: '40px' } }).appendTo(container);
        */
    }

    function initPrivacyPolicyContents() {

        var container = $(Page.View.privacyPolicyPivotItem.contentElement);
        container.empty();
        container.addClass('privacy');

        $.ajax({
            type: 'GET',
            url: Yabumi.API.getRoot() + '../privacy.html',
            success: function (html) {

                if (window.toStaticHTML) {
                    html = window.toStaticHTML(html);
                }

                container[0].innerHTML = html;
            }
        });
    }

    function initAboutContents() {

        var container = $(Page.View.aboutPivotItem.contentElement);
        container.empty();

        var yabumiSection = $('<div/>', { 'class': 'win-settings-section' }).appendTo(container);

        $('<h2/>').text(Yabumi.Util.getLongProductName()).appendTo(yabumiSection);
        $('<p/>').text('Version ' + Yabumi.Util.getVersionString()).appendTo(yabumiSection);
        $('<p/>').text('Copyright © 2016 Webnium').appendTo(yabumiSection);
        $('<p/>').text('Licensed under the Apache License, Version 2.0. (except identity assets)').appendTo(yabumiSection);

        var librarySection = $('<div/>', { 'class': 'win-settings-section' }).appendTo(container);

        $('<h3/>').text('The following sets forth attribution notices for third-party software that may be contained in this application:').appendTo(librarySection);

        $('<h4/>').text('jQuery (included)').appendTo(librarySection);
        $('<p/>').text('Copyright jQuery Foundation and other contributors').appendTo(librarySection);
        $('<p/>').text('Licensed under the MIT License.').appendTo(librarySection);

        $('<h4/>').text('WinJS (included)').appendTo(librarySection);
        $('<p/>').text('Copyright (c) Microsoft Corporation').appendTo(librarySection);
        $('<p/>').text('Licensed under the MIT License.').appendTo(librarySection);

        $('<h4/>').text('PDF.js (included)').appendTo(librarySection);
        $('<p/>').text('Copyright 2012 Mozilla Foundation').appendTo(librarySection);
        $('<p/>').text('Licensed under the Apache License, Version 2.0.').appendTo(librarySection);

        $('<h4/>').text('PSD.js (included)').appendTo(librarySection);
        $('<p/>').text('Copyright (c) 2014 Ryan LeFevre').appendTo(librarySection);
        $('<p/>').text('Licensed under the MIT License.').appendTo(librarySection);
    }

})();