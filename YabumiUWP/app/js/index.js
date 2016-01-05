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

    var AppViewBackButtonVisibility = {}
    var systemNavigationManager = {};

    // Init Window

    Yabumi.ApplicationView.setPreferredMinSize(320, 320);

    var size = localStorage.getItem('window.size');
    if (size) {
        size = size.split('x');
        Yabumi.ApplicationView.tryResizeView(size[0], size[1]);
    }

    Yabumi.ApplicationView.setTitleBarColor(0xE5, 0xE5, 0xE5, 0xFF);

    // Launch

    window.addEventListener('DOMContentLoaded', function onDOMContentLoaded() {

        WinJS.Namespace.define('Index.View', {
            title: document.getElementById('title'),
            appBarContainer: document.getElementById('appbar-container'),
            splitView: document.getElementById('splitview'),
            splitViewCommands: document.querySelectorAll('#splitview > div > .nav-commands > a'),
            fragment: document.getElementById('fragment')
        });

        WinJS.UI.processAll()
            .then(WinJS.Resources.processAll)
            .done(function () {

                // Temporary workaround: Draw keyboard focus visuals on NavBarCommands
                var splitView = document.querySelector(".splitview").winControl;
                new WinJS.UI._WinKeyboard(splitView.paneElement);

                // First fragment
                fragment();
            });

        WinJS.Application.start();
    });

    // Activated

    WinJS.Application.addEventListener('activated', function onActivated(e) {

        if (!Windows) {
            return;
        }

        var ApplicationModel = Windows.ApplicationModel;
        var Package = ApplicationModel.Package;
        var VoiceCommandDefinitionManager = ApplicationModel.VoiceCommands.VoiceCommandDefinitionManager;

        var kind = e.detail.kind;

        if (kind === ApplicationModel.Activation.ActivationKind.launch) {
            if (typeof e.detail.arguments === 'string') {
                var args = e.detail.arguments.split('/');
                if (args[0] === 'viewer') {
                    location.href = 'viewer.html?' + args[1];
                    return;
                }
            }

            setTimeout(function () {
                Package.current.installedLocation
                    .getFileAsync('vcd.xml')
                    .then(function (file) {
                        return VoiceCommandDefinitionManager.installCommandDefinitionsFromStorageFileAsync(file);
                    })
                    .done(function () {
                        console.info('Voice Command `vcd.xml` installed.');
                    });
            }, 5000);
        } else if (kind === ApplicationModel.Activation.ActivationKind.voiceCommand) {
            var commandName = e.detail.detail[0].result.rulePath[0];

            if (commandName === 'uploadFromCamera') {
                location.href = 'uploader.html?camera';
            } else if (commandName === 'uploadFromFile') {
                location.href = 'uploader.html?file';
            }
        }
    });

    // Event listeners

    window.addEventListener('hashchange', fragment);
    window.addEventListener('pointerdown', onPointerDownHandler, true);
    window.addEventListener('keydown', onKeydownHandler, true);
    window.addEventListener('resize', onResizeHandler);

    // Platform Support

    if (Windows) {
        // APIs
        AppViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility;
        systemNavigationManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();

        systemNavigationManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
        systemNavigationManager.addEventListener('backrequested', goBack);

        if (Yabumi.Util.getDeviceFamily() === 'Windows.Xbox') {
            WinJS.UI.XYFocus.keyCodeMap.up.push(WinJS.Utilities.Key.upArrow);
            WinJS.UI.XYFocus.keyCodeMap.down.push(WinJS.Utilities.Key.downArrow);
            WinJS.UI.XYFocus.keyCodeMap.left.push(WinJS.Utilities.Key.leftArrow);
            WinJS.UI.XYFocus.keyCodeMap.right.push(WinJS.Utilities.Key.rightArrow);
        }
    }

    // fragment()

    var fragmentFilename = '',
        initFragment = window.initFragment = {},
        deinitFragment = window.deinitFragment = {};

    function fragment() {

        if (location.hash === '') {
            history.replaceState(null, null, '#history/launch');
        }

        console.debug('fragment()', location.hash);

        if (location.hash === '#history/launch') {
            systemNavigationManager.appViewBackButtonVisibility = AppViewBackButtonVisibility.collapsed;
        } else {
            systemNavigationManager.appViewBackButtonVisibility = AppViewBackButtonVisibility.visible;
        }

        if (fragmentFilename !== '' && deinitFragment[fragmentFilename]) {
            deinitFragment[fragmentFilename]();
            console.debug('fragment()', 'unloaded', fragmentFilename);
        }

        fragmentFilename = location.hash.replace(/^#/, '').replace(/\/.*$/, '');

        Yabumi.ApplicationView.setTitle(_L(fragmentFilename));

        $(Index.View.appBarContainer).empty();
        $(Index.View.title).text(_L(fragmentFilename));
        $(Index.View.fragment).empty();

        WinJS.UI.Fragments.renderCopy('index.' + fragmentFilename + '.html', Index.View.fragment).done(
            function (fragment) {

                WinJS.UI.processAll().then(WinJS.Resources.processAll);

                if (initFragment[fragmentFilename]) {
                    initFragment[fragmentFilename]();
                    console.debug('fragment()', 'loaded', fragmentFilename);
                } else {
                    console.warn('fragment()', 'loaded', fragmentFilename, 'but script not found.');
                }
            },
            function (error) {

                console.error('fragment()', 'error', error);
            }
        );

        $(Index.View.splitViewCommands).each(function (i, command) {

            if ($(command).attr('href') === ('#' + fragmentFilename)) {
                $(command).addClass('selected');
            } else {
                $(command).removeClass('selected');
            }
        });
    }

    // onPointerDownHandler ()

    function onPointerDownHandler(e) {

        if (e.buttons === 8) {
            goBack();
            return;
        }
    }

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

        // BS -> Back
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.backspace) {
            activated = true;
            goBack();
        }

        // H -> History
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.h) {
            activated = true;
            location.hash = 'history';
        }

        // : -> Settings
        if (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.semicolon) {
            activated = true;
            location.hash = 'settings';
        }

        if (activated === true) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }

    // onResizeHandler()

    function onResizeHandler() {

        localStorage.setItem('window.size', [window.innerWidth, window.innerHeight].join('x'));
    }

    // goBack()

    function goBack(e) {

        if (history.length === 1 || location.hash === '#history/launch') {
            return;
        }

        history.back();

        e && (e.handled = true);
    }
})();