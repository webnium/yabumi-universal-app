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

    if (!window.Windows) {
        window.Windows = void 0;
    }

    if (Windows) {
        var NetworkInformation = Windows.Networking.Connectivity.NetworkInformation;
        var Notifications = Windows.UI.Notifications;
        var localSettings = Windows.Storage.ApplicationData.current.localSettings;
        var roamingSettings = Windows.Storage.ApplicationData.current.roamingSettings;
        var applicationView = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
    }
    
    window._L = function (string) {
        return WinJS.Resources.getString(string).value;
    };

    WinJS.Namespace.define('Yabumi.Placeholder', {
        eventHandler: WinJS.UI.eventHandler(function () { }),
        emptyFunction: function () { }
    });

    WinJS.Namespace.define('Yabumi.ApplicationView', {
        setTitle: function (title) {

            if (applicationView) {
                applicationView.title = title;
            } else {
                document.title = title;
            }
        },
        setPreferredMinSize: function (width, height) {

            if (applicationView) {
                applicationView.setPreferredMinSize({
                    width: width,// minimum: 192
                    height: height// minimum: 48
                });
            }
        },
        tryResizeView: function (width, height) {

            if (applicationView) {
                applicationView.tryResizeView({
                    width: width,
                    height: height
                });
            }
        },
        setTitleBarColor: function (r, g, b, a) {

            if (!applicationView) {
                return;
            }

            var titleBarBackgroundColor = {
                r: r,
                g: g,
                b: b,
                a: a
            };

            var titleBarForegroundColor = Windows.UI.Colors.black;

            if ((r + g + b) < (150 * 3)) {
                titleBarForegroundColor = {
                    r: 255,
                    g: 255,
                    b: 255,
                    a: 255
                };
            }

            applicationView.titleBar.backgroundColor = titleBarBackgroundColor;
            applicationView.titleBar.foregroundColor = titleBarForegroundColor;
            applicationView.titleBar.buttonBackgroundColor = titleBarBackgroundColor;
            applicationView.titleBar.buttonForegroundColor = titleBarForegroundColor;
            applicationView.titleBar.buttonHoverBackgroundColor = Windows.UI.Colors.lightGray;
            applicationView.titleBar.buttonHoverForegroundColor = Windows.UI.Colors.black;
            applicationView.titleBar.buttonPressedBackgroundColor = Windows.UI.Colors.silver;
            applicationView.titleBar.buttonPressedForegroundColor = Windows.UI.Colors.black;
        }
    });

    WinJS.Namespace.define('Yabumi.API', {
        getRoot: function () {

            return 'https://' + (Yabumi.Util.getRoamingSetting('config.apiRoot') || 'yabumi.cc/api/');
        },
        getHistoryId: function () {
            
            return Yabumi.Util.getRoamingSetting('config.historyId') || null;
        },
        setHistoryId: function (id) {

            Yabumi.Util.setRoamingSetting('config.historyId', id);
        },
        clearHistoryId: function () {

            Yabumi.Util.setRoamingSetting('config.historyId', null);
        }
    });

    WinJS.Namespace.define('Yabumi.Networking', {
        isOnline: function () {

            if (NetworkInformation) {
                return NetworkInformation.getInternetConnectionProfile() !== null;
            } else {
                return true;
            }
        },
        isOffline: function () {

            if (NetworkInformation) {
                return NetworkInformation.getInternetConnectionProfile() === null;
            } else {
                return false;
            }
        },
        isMetered: function () {

            if (NetworkInformation) {
                var connectionCost = NetworkInformation.getInternetConnectionProfile().getConnectionCost();
                return (connectionCost.roaming || connectionCost.approachingDataLimit || connectionCost.overDataLimit);
            } else {
                return false;
            }
        }
    });

    WinJS.Namespace.define('Yabumi.UI', {
        offlineView: function (reloadCallback) {

            var container = $('<div/>', {
                'class': 'offline-view'
            });

            //todo

            return container;
        },
        notify: function (option) {

            option = option || {};

            option.title = option.title || '';
            option.text = option.text || '';
            option.launch = option.launch || 'default';
            option.muted = option.muted || false;

            var template;
            if (option.title) {
                template = Notifications.ToastTemplateType.toastText02;
            } else {
                template = Notifications.ToastTemplateType.toastText01;
            }

            var toastXml = Notifications.ToastNotificationManager.getTemplateContent(template);
            var toastTextElements = toastXml.getElementsByTagName('text');

            if (option.title) {
                toastTextElements[0].appendChild(toastXml.createTextNode(option.title));
                toastTextElements[1].appendChild(toastXml.createTextNode(option.text));
            } else {
                toastTextElements[0].appendChild(toastXml.createTextNode(option.text));
            }

            var toastNode = toastXml.selectSingleNode('/toast');
            toastNode.setAttribute('duration', 'short');
            toastNode.setAttribute('launch', option.launch);

            if (option.muted) {
                var audio = toastXml.createElement('audio');
                audio.setAttribute('silent', 'true');
                toastNode.appendChild(audio);
            }

            var toast = new Notifications.ToastNotification(toastXml);
            var toastNotifier = Notifications.ToastNotificationManager.createToastNotifier();
            toastNotifier.show(toast);

            if (option.muted) {
                setTimeout(function () {
                    toastNotifier.hide(toast);
                }, 2000);
            }
        },
        showLoadingMask: function () {

            var loadingMask = document.getElementById('loading-mask');
            if (!loadingMask) {
                loadingMask = document.createElement('div');
                loadingMask.id = 'loading-mask';
                document.body.appendChild(loadingMask);

                $('<progress/>', {
                    'class': 'win-ring'
                }).appendTo(loadingMask);
            } else {
                $(loadingMask).show();
            }
        },
        hideLoadingMask: function () {

            $('#loading-mask').hide();
        },
        showMessageDialog: function (option) {

            option = option || {};

            option.title = option.title || '';
            option.text = option.text || '';
            option.onClose = option.onClose || Yabumi.Placeholder.emptyFunction;

            new Windows.UI.Popups.MessageDialog(option.text, option.title)
                .showAsync()
                .done(option.onClose);
        },
        showConfirmDialog: function (option) {

            option = option || {};

            option.text = option.text || '';
            option.yesButtonLabel = option.yesButtonLabel || _L('yes');
            option.cancelButtonLabel = option.cancelButtonLabel || _L('cancel');
            option.onYes = option.onYes || Yabumi.Placeholder.emptyFunction;
            option.onCancel = option.onCancel || Yabumi.Placeholder.emptyFunction;
            option.onClose = option.onClose || Yabumi.Placeholder.emptyFunction;

            var dialog = new Windows.UI.Popups.MessageDialog(option.text);

            dialog.commands.append(new Windows.UI.Popups.UICommand(option.yesButtonLabel, function () {

                option.onClose();
                setTimeout(option.onYes, 0);
            }));
            dialog.commands.append(new Windows.UI.Popups.UICommand(option.cancelButtonLabel, function () {

                option.onClose();
                setTimeout(option.onCancel, 0);
            }));

            dialog.defaultCommandIndex = 0;
            dialog.cancelCommandIndex = 1;

            dialog.showAsync();
        },
        showShareUI: function () {

            if (Windows) {
                Windows.ApplicationModel.DataTransfer.DataTransferManager.showShareUI();
            }
        }
    });

    WinJS.Namespace.define('Yabumi.Util', {
        getDeviceFamily: function () {

            if (Windows) {
                return Windows.System.Profile.AnalyticsInfo.versionInfo.deviceFamily;
            } else {
                return 'Browser';
            }
        },
        getVersionString: function () {

            if (Windows) {
                var version = Windows.ApplicationModel.Package.current.id.version;
                return version.major + '.' + version.minor + '.' + version.build + '.' + version.revision;
            } else {
                return '2';
            }
        },
        getLongProductName: function () {

            if (Windows) {
                return 'Yabumi for Universal Windows Platform';
            } else {
                return 'Yabumi for Web';
            }
        },
        getImages: function (isIdStringOnly) {

            var images = [];

            var i, j, l, k, v;

            for (i = 0, l = localStorage.length; i < l; i++) {
                // id
                k = localStorage.key(i);

                if (/^[0-9a-f]{24}$/.test(k) === false) {
                    continue;
                }

                // pin
                v = localStorage.getItem(k);

                if (/^[a-f0-9\-]{36}$/.test(v) === false) {
                    continue;
                }

                if (isIdStringOnly) {
                    images.push(k);
                } else {
                    images.push({
                        id: k,
                        pin: v
                    });
                }
            }

            return images;
        },
        getRoamingSetting(key) {

            if (roamingSettings) {
                return roamingSettings.values[key];
            } else {
                return JSON.parse(localStorage.getItem('roamingSetting.' + key));
            }
        },
        setRoamingSetting(key, val) {

            if (roamingSettings) {
                roamingSettings.values[key] = val;
            } else {
                if (val === null) {
                    localStorage.removeItem('roamingSetting.' + key);
                } else {
                    localStorage.setItem('roamingSetting.' + key, JSON.stringify(val));
                }
            }
        },
        getLocalSetting(key) {

            if (localSettings) {
                return localSettings.values[key];
            } else {
                return JSON.parse(localStorage.getItem('localSetting.' + key));
            }
        },
        setLocalSetting(key, val) {

            if (localSettings) {
                localSettings.values[key] = val;
            } else {
                if (val === null) {
                    localStorage.removeItem('localSetting.' + key);
                } else {
                    localStorage.setItem('localSetting.' + key, JSON.stringify(val));
                }
            }
        }
    });

    //
})();