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

    WinJS.Namespace.define('Uploader', {
        Stat: {
            imageWidth: -1,
            imageHeight: -1,
            filename: ''
        },
        Data: {
            originalFile: null,
            uploadFile: null
        },
        View: {},
        Timer: {},
        shareOperation: null
    });

    // Init Window

    Yabumi.ApplicationView.setPreferredMinSize(320, 320);
    Yabumi.ApplicationView.setTitleBarColor(0, 0, 0, 0xFF);
    Yabumi.ApplicationView.setTitle(_L('upload'));

    // Regular Events

    window.addEventListener('keydown', onKeydownHandler, true);
    window.addEventListener('pointerdown', onPointerDownHandler, true);

    // Platform Support

    if (Windows) {
        var systemNavigationManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
        systemNavigationManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
        systemNavigationManager.addEventListener('backrequested', goBack);

        if (Yabumi.Util.getDeviceFamily() === 'Windows.Xbox') {
            WinJS.UI.XYFocus.keyCodeMap.up.push(WinJS.Utilities.Key.upArrow);
            WinJS.UI.XYFocus.keyCodeMap.down.push(WinJS.Utilities.Key.downArrow);
            WinJS.UI.XYFocus.keyCodeMap.left.push(WinJS.Utilities.Key.leftArrow);
            WinJS.UI.XYFocus.keyCodeMap.right.push(WinJS.Utilities.Key.rightArrow);
        }
    }

    // Launch

    WinJS.Application.addEventListener('activated', function onActivated(e) {

        if (!Windows) {
            return;
        }

        if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.shareTarget) {
            Uploader.shareOperation = e.detail.shareOperation;
        }
    });

    WinJS.Application.addEventListener('loaded', function onLoaded() {

        setTimeout(init, 250);
    });

    WinJS.Application.start();

    function init() {

        Uploader.View.appBarContainer = document.getElementById('appbar-container');
        Uploader.View.preview = document.getElementById('preview');

        initAppBar();

        // get sources
        switch (location.search) {
            case '?camera':
                fromCamera();
                Yabumi.ApplicationView.setTitle(_L('upload from camera'));
                break;
            case '?file':
                fromFile();
                Yabumi.ApplicationView.setTitle(_L('upload from file'));
                break;
            case '?clipboard':
                fromClipboard();
                Yabumi.ApplicationView.setTitle(_L('upload from clipboard'));
                break;
            default:
                if (Uploader.shareOperation) {
                    fromShareTarget();
                }
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
            if (!$('#appbar-cancel-command-button').is(':disabled') && Uploader.shareOperation === null) {
                window.close();
            }
        }

        // CTRL + R -> Reload (for Debug)
        if (
            (e.ctrlKey && e.keyCode === WinJS.Utilities.Key.r) ||
            (!e.ctrlKey && e.keyCode === WinJS.Utilities.Key.F5)
        ) {
            activated = true;
            location.reload();
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

        // c -> Cropping
        if (e.keyCode === WinJS.Utilities.Key.c) {
            activated = true;
            $('#appbar-cropping-command-button').click();
        }

        // ENTER -> Upload
        if (e.keyCode === WinJS.Utilities.Key.enter && active !== 'BUTTON') {
            activated = true;
            $('#appbar-upload-command-button').click();
        }

        if (activated === true) {
            e.preventDefault();
        }
    }

    // onPointerDownHandler()

    function onPointerDownHandler(e) {

        if (e.buttons === 8) {
            goBack();
            return;
        }

        if (e.target === Uploader.View.preview) {
            //
        }
    }

    // initAppBar()

    function initAppBar() {

        var appBar = Uploader.View.appBar = $('<div/>').appendTo(Uploader.View.appBarContainer);

        new WinJS.UI.AppBar(
            appBar[0],
            {
                data: new WinJS.Binding.List([
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'cancel',
                            label: _L('cancel'),
                            tooltip: _L('shortcut-cancel'),
                            id: 'appbar-cancel-command-button',
                            extraClass: 'cancel',
                            onclick: goBack
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>', { disabled: true })[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'crop',
                            label: _L('cropping'),
                            tooltip: _L('shortcut-cropping'),
                            id: 'appbar-cropping-command-button',
                            onclick: croppingImage
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<hr/>')[0],
                        {
                            section: 'primary',
                            type: 'separator'
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>', { disabled: true })[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'upload',
                            label: _L('upload'),
                            tooltip: _L('shortcut-upload'),
                            id: 'appbar-upload-command-button',
                            extraClass: 'yes',
                            onclick: uploadFile
                        }
                    )
                ]),
                placement: 'top'
            }
        );
    }

    // fromCamera()

    function fromCamera() {

        var captureUI = new Windows.Media.Capture.CameraCaptureUI();
        captureUI.photoSettings.allowCropping = false;
        captureUI.photoSettings.format = Windows.Media.Capture.CameraCaptureUIPhotoFormat.jpeg;
        captureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo).then(function (file) {

            if (file) {
                Uploader.Stat.filename = file.name;
                Uploader.Data.uploadFile = Uploader.Data.originalFile = file;
                prepareUploadFile();
            } else {
                goBack();
            }
        });
    }

    // fromFile()

    function fromFile() {

        var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
        openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.thumbnail;
        openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;

        openPicker.fileTypeFilter.replaceAll(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.psd', '.bmp']);

        openPicker.pickSingleFileAsync().done(function (file) {

            if (file) {
                Uploader.Stat.filename = file.name;
                if (file.fileType.toLowerCase() === '.bmp') {
                    file.openReadAsync()
                        .then(function (readStream) {
                            return convertBitmapStreamToPngFile(readStream);
                        })
                        .done(function (file) {
                            Uploader.Data.uploadFile = Uploader.Data.originalFile = file;
                            prepareUploadFile();
                        });
                } else {
                    Uploader.Data.uploadFile = Uploader.Data.originalFile = file;
                    prepareUploadFile();
                }
            } else {
                goBack();
            }
        });
    }

    // fromClipboard()

    function fromClipboard() {

        var dataPackageView = Windows.ApplicationModel.DataTransfer.Clipboard.getContent();

        if (dataPackageView.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.bitmap)) {
            dataPackageView.getBitmapAsync()
                .then(function (streamRef) {
                    return streamRef.openReadAsync();
                })
                .then(function (bitmapStream) {
                    return convertBitmapStreamToPngFile(bitmapStream);
                })
                .done(function (file) {
                    Uploader.Stat.filename = 'clipboard.bmp';
                    Uploader.Data.uploadFile = Uploader.Data.originalFile = file;
                    prepareUploadFile();
                });
        } else if (dataPackageView.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.storageItems)) {
            dataPackageView.getStorageItemsAsync().then(function (storageItems) {

                Uploader.Stat.filename = storageItems.getAt(0).name;

                if (storageItems.getAt(0).fileType.toLowerCase() === '.bmp') {
                    storageItems.getAt(0)
                        .openReadAsync()
                        .then(function (readStream) {
                            return convertBitmapStreamToPngFile(readStream);
                        })
                        .done(function (file) {
                            Uploader.Data.uploadFile = Uploader.Data.originalFile = file;
                            prepareUploadFile();
                        });
                } else {
                    Uploader.Data.uploadFile = Uploader.Data.originalFile = storageItems.getAt(0);
                    prepareUploadFile();
                }
            });
        } else {
            goBack();
        }
    }

    // fromShareTarget()

    function fromShareTarget() {

        var StandardDataFormats = Windows.ApplicationModel.DataTransfer.StandardDataFormats;

        if (Uploader.shareOperation.data.contains(StandardDataFormats.bitmap)) {
            Uploader.shareOperation.data
                .getBitmapAsync()
                .then(function (streamRef) {
                    return streamRef.openReadAsync()
                })
                .then(function (bitmapStream) {
                    return convertBitmapStreamToPngFile(bitmapStream);
                })
                .done(function (file) {
                    Uploader.Stat.filename = 'share-target.bmp';
                    Uploader.Data.uploadFile = Uploader.Data.originalFile = file;
                    prepareUploadFile();
                });
        } else if (Uploader.shareOperation.data.contains(StandardDataFormats.storageItems)) {
            Uploader.shareOperation.data.getStorageItemsAsync().then(function (storageItems) {

                Uploader.Stat.filename = storageItems.getAt(0).name;

                if (storageItems.getAt(0).fileType.toLowerCase() === '.bmp') {
                    storageItems.getAt(0)
                        .openReadAsync()
                        .then(function (readStream) {
                            return convertBitmapStreamToPngFile(readStream);
                        })
                        .done(function (file) {
                            Uploader.Data.uploadFile = Uploader.Data.originalFile = file;
                            prepareUploadFile();
                        });
                } else {
                    Uploader.Data.uploadFile = Uploader.Data.originalFile = storageItems.getAt(0);
                    prepareUploadFile();
                }
            });
        } else {
            Uploader.shareOperation.reportError(_L('error'));
        }
    }

    // convertBitmapStreamToPngFile()

    function convertBitmapStreamToPngFile(bitmapStream) {

        return new WinJS.Promise(function (resolve, reject) {

            var blob = MSApp.createBlobFromRandomAccessStream('image/bmp', bitmapStream);
            var image = new Image();
            image.src = URL.createObjectURL(blob, { oneTimeOnly: true });

            new WinJS.Promise(function (resolve, reject) {
                image.onload = function () {
                    resolve(this);
                };
            })
                .then(function (image) {

                    var folder = Windows.Storage.ApplicationData.current.temporaryFolder;
                    return folder.createFileAsync('bitmap.png', Windows.Storage.CreationCollisionOption.replaceExisting);
                })
                .then(function (file) {
                    return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
                })
                .done(function (output) {

                    var canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;

                    var context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0);

                    var input = canvas.msToBlob().msDetachStream();

                    // Copy the stream from the blob to the File stream 
                    Windows.Storage.Streams.RandomAccessStream.copyAsync(input, output)
                        .then(function () {
                            return output.flushAsync();
                        })
                        .done(function () {

                            input.close();
                            output.close();

                            var folder = Windows.Storage.ApplicationData.current.temporaryFolder;
                            folder.getFileAsync('bitmap.png').done(resolve);
                        });
                });
        });
    }

    // prepareUploadFile()

    function prepareUploadFile() {

        $('#appbar-cancel-command-button').attr('disabled', false);
        $('#appbar-upload-command-button').attr('disabled', false);

        if (['.jpg', '.jpeg', '.png'].indexOf(Uploader.Data.uploadFile.fileType.toLowerCase()) === -1) {
            $('#appbar-cropping-command-button').attr('disabled', true);
        } else {
            $('#appbar-cropping-command-button').attr('disabled', false);
        }

        preview();
    }

    // preview()

    function preview() {

        $(Uploader.View.preview).empty();

        if (['.svg', '.jpg', '.jpeg', '.png', '.gif'].indexOf(Uploader.Data.uploadFile.fileType.toLowerCase()) === -1) {
            $('<h3/>', { text: _L('note-no-preview') }).appendTo(Uploader.View.preview);
            return;
        }

        Uploader.Data.uploadFile.openReadAsync().then(function (readStream) {

            var url = URL.createObjectURL(readStream, { oneTimeOnly: true });
            Uploader.View.preview.style.backgroundImage = 'url(' + url + ')';

            var image = new Image();
            image.src = URL.createObjectURL(readStream, { oneTimeOnly: true });
            image.onload = function () {

                if (Uploader.View.preview.clientWidth < this.width || Uploader.View.preview.clientHeight < this.height) {
                    Uploader.View.preview.style.backgroundSize = 'contain';
                } else {
                    Uploader.View.preview.style.backgroundSize = 'auto';
                }

                Uploader.Stat.imageWidth = this.width;
                Uploader.Stat.imageHeight = this.height;
            };
        });
    }

    // goBack()

    function goBack(e) {

        if ($('#appbar-cancel-command-button').is(':disabled')) {
            return;
        }

        if (Uploader.shareOperation) {
            Uploader.shareOperation.dismissUI();
        } else {
            location.href = '/app/index.html';
        }

        e && (e.handled = true);
    }

    // croppingImage()

    function croppingImage() {

        Uploader.View.appBar.hide();
        $('#appbar-cancel-command-button').attr('disabled', true);
        $('#appbar-cropping-command-button').attr('disabled', true);
        $('#appbar-upload-command-button').attr('disabled', true);
        Uploader.View.preview.style.backgroundSize = 'contain';

        var viewW = Uploader.View.preview.clientWidth,
            viewH = Uploader.View.preview.clientHeight,
            viewAR = viewW / viewH,
            imgW = 0,
            imgH = 0,
            imgAR = 1,
            ratio = 1,
            cropX = 0,
            cropY = 0,
            cropW = 0,
            cropH = 0;

        var croppingContainer = $('<div/>', { 'class': 'cropping-container' }).appendTo(Uploader.View.preview);

        var canvas = $('<canvas/>').appendTo(croppingContainer)[0];
        var context = canvas.getContext('2d');
        var img = new Image();
        img.onload = function () {

            imgW = img.width;
            imgH = img.height;
            imgAR = imgW / imgH;

            setTimeout(initCropping, 0);
        };

        Uploader.Data.originalFile.openReadAsync().then(function (readStream) {

            var url = URL.createObjectURL(readStream, { oneTimeOnly: true });
            Uploader.View.preview.style.backgroundImage = 'url(' + url + ')';

            img.src = URL.createObjectURL(readStream, { oneTimeOnly: true });
        });

        var topLeftHandle = $('<div/>', { 'class': 'cropping-handle' }).appendTo(croppingContainer)[0],
            topRightHandle = $('<div/>', { 'class': 'cropping-handle' }).appendTo(croppingContainer)[0],
            bottomRightHandle = $('<div/>', { 'class': 'cropping-handle' }).appendTo(croppingContainer)[0],
            bottomLeftHandle = $('<div/>', { 'class': 'cropping-handle' }).appendTo(croppingContainer)[0];
        
        var editing = false,
            panning = false,
            resizingTL = false,
            resizingTR = false,
            resizingBL = false,
            resizingBR = false;
        var onPointerMoveHandler,
            onPointerUpHandler,
            onKeydownHandler;

        var initCropping = function () {

            if (imgAR > viewAR) {
                ratio = viewW / imgW;
            } else {
                ratio = viewH / imgH;
            }

            // init area
            cropX = Math.round(imgW * 0.2);
            cropY = Math.round(imgH * 0.2);
            cropW = Math.round(imgW * 0.5);
            cropH = Math.round(imgH * 0.5);

            update();

            // init events

            canvas.addEventListener('pointerdown', function (e) {

                if (editing === true) {
                    return;
                }
                editing = true;
                panning = true;
                e.stopPropagation();
            }, true);

            topLeftHandle.addEventListener('pointerdown', function (e) {

                if (editing === true) {
                    return;
                }
                editing = true;
                resizingTL = true;
                e.stopPropagation();
            }, true);

            topRightHandle.addEventListener('pointerdown', function (e) {

                if (editing === true) {
                    return;
                }
                editing = true;
                resizingTR = true;
                e.stopPropagation();
            }, true);

            bottomLeftHandle.addEventListener('pointerdown', function (e) {

                if (editing === true) {
                    return;
                }
                editing = true;
                resizingBL = true;
                e.stopPropagation();
            }, true);

            bottomRightHandle.addEventListener('pointerdown', function (e) {

                if (editing === true) {
                    return;
                }
                editing = true;
                resizingBR = true;
                e.stopPropagation();
            }, true);

            onPointerUpHandler = function (e) {

                if (editing === false) {
                    return;
                }
                editing = false;
                panning = false;
                resizingTL = false;
                resizingTR = false;
                resizingBL = false;
                resizingBR = false;
                e.stopPropagation();
            };
            window.addEventListener('pointerup', onPointerUpHandler, true);

            onPointerMoveHandler = function (e) {

                if (editing === false) {
                    return;
                }
                e.stopPropagation();

                if (panning === true) {
                    cropX += e.movementX / ratio / devicePixelRatio;
                    cropY += e.movementY / ratio / devicePixelRatio;
                } else if (resizingTL === true) {
                    cropX += e.movementX / ratio / devicePixelRatio;
                    cropY += e.movementY / ratio / devicePixelRatio;
                    cropW -= e.movementX / ratio / devicePixelRatio;
                    cropH -= e.movementY / ratio / devicePixelRatio;
                } else if (resizingTR === true) {
                    cropY += e.movementY / ratio / devicePixelRatio;
                    cropW += e.movementX / ratio / devicePixelRatio;
                    cropH -= e.movementY / ratio / devicePixelRatio;
                } else if (resizingBL === true) {
                    cropX += e.movementX / ratio / devicePixelRatio;
                    cropW -= e.movementX / ratio / devicePixelRatio;
                    cropH += e.movementY / ratio / devicePixelRatio;
                } else if (resizingBR === true) {
                    cropW += e.movementX / ratio / devicePixelRatio;
                    cropH += e.movementY / ratio / devicePixelRatio;
                }

                if (cropX < 0) {
                    if (panning === false) {
                        cropW += cropX;
                    }
                    cropX = 0;
                } else if (cropX + cropW > imgW) {
                    if (panning === false) {
                        cropW += imgW - cropW - cropX;
                    }
                    cropX = imgW - cropW;
                }

                if (cropY < 0) {
                    if (panning === false) {
                        cropH += cropY;
                    }
                    cropY = 0;
                } else if (cropY + cropH > imgH) {
                    if (panning === false) {
                        cropH += imgH - cropH - cropY;
                    }
                    cropY = imgH - cropH;
                }

                if (cropW < 16) {
                    if (resizingTL || resizingBL) {
                        cropX -= 16 - cropW;
                    }
                    cropW = 16;
                } else if (cropW > imgW - cropX) {
                    cropX -= imgW - cropX - cropW;
                    cropW = imgW - cropX;
                }

                if (cropH < 16) {
                    if (resizingTL || resizingTR) {
                        cropY -= 16 - cropH;
                    }
                    cropH = 16;
                } else if (cropH > imgH - cropY) {
                    cropY -= imgH - cropY - cropH;
                    cropH = imgH - cropY;
                }

                update();
            };
            window.addEventListener('pointermove', onPointerMoveHandler, true);

            onKeydownHandler = function (e) {

                var activated = false;

                // BS, ESC -> Back
                if (
                    (e.keyCode === WinJS.Utilities.Key.backspace) ||
                    (e.keyCode === WinJS.Utilities.Key.escape)
                ) {
                    activated = true;
                    back();
                }

                // ENTER -> Crop
                if (e.keyCode === WinJS.Utilities.Key.enter) {
                    activated = true;
                    $('#appbar-cropping-ok-command-button').click();
                }

                if (activated === true) {
                    e.preventDefault();
                }
            };
            window.addEventListener('keydown', onKeydownHandler, true);
        };//<--initCropping()

        var update = function () {

            var pX = cropX * ratio;
            var pY = cropY * ratio;
            var pW = cropW * ratio;
            var pH = cropH * ratio;

            if (imgAR > viewAR) {
                pY += Math.round(viewH / 2 - (imgH * ratio) / 2);
            } else {
                pX += Math.round(viewW / 2 - (imgW * ratio) / 2);
            }

            topLeftHandle.style.left = pX + 'px';
            topLeftHandle.style.top = pY + 'px';
            topRightHandle.style.left = pX + pW + 'px';
            topRightHandle.style.top = pY + 'px';
            bottomLeftHandle.style.left = pX + 'px';
            bottomLeftHandle.style.top = pY + pH + 'px';
            bottomRightHandle.style.left = pX + pW + 'px';
            bottomRightHandle.style.top = pY + pH + 'px';

            canvas.style.left = pX + 'px';
            canvas.style.top = pY + 'px';
            canvas.width = pW;
            canvas.height = pH;
            try {
                context.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, pW, pH);
            } catch (e) {
                console.error(e);
            }
        };//<--update()

        var crop = function () {

            canvas.width = cropW;
            canvas.height = cropH;
            context.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            var filename = 'edited.png';

            var temporaryFolder = Windows.Storage.ApplicationData.current.temporaryFolder;
            temporaryFolder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting)
                .then(function (file) {
                    return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
                })
                .done(function (output) {

                    // Get the IInputStream stream from the blob object of canvas
                    var input = canvas.msToBlob().msDetachStream();

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

                            Uploader.Data.uploadFile = file;
                            back();
                        });
                });
            //<--temporaryFolder.createFileAsync()
        };

        var back = function () {

            window.removeEventListener('pointermove', onPointerMoveHandler, true);
            window.removeEventListener('pointerup', onPointerUpHandler, true);
            window.removeEventListener('keydown', onKeydownHandler, true);

            croppingContainer.remove();
            cropAppBar.remove();
            Uploader.View.appBar.show();

            prepareUploadFile();
        };

        var cropAppBar = $('<div/>').appendTo(Uploader.View.appBarContainer);
        new WinJS.UI.AppBar(
            cropAppBar[0],
            {
                placement: 'top',
                data: new WinJS.Binding.List([
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'global',
                            type: 'button',
                            icon: 'accept',
                            label: 'OK',
                            id: 'appbar-cropping-ok-command-button',
                            extraClass: 'yes',
                            onclick: crop
                        }
                    ),
                    new WinJS.UI.AppBarCommand(
                        $('<button/>')[0],
                        {
                            section: 'primary',
                            type: 'button',
                            icon: 'cancel',
                            label: _L('cancel'),
                            extraClass: 'cancel',
                            onclick: back
                        }
                    )
                ])
            }
        );
    }

    // uploadFile()
    
    function uploadFile() {

        $('#appbar-cancel-command-button').attr('disabled', true);
        $('#appbar-cropping-command-button').attr('disabled', true);
        $('#appbar-upload-command-button').attr('disabled', true);

        var progress = $('<progress/>', { 'class': 'win-ring' }).appendTo(Uploader.View.preview);

        if (Uploader.shareOperation) {
            Uploader.shareOperation.reportStarted();
        }

        var versionString = Yabumi.Util.getVersionString();

        var BackgroundTransfer = Windows.Networking.BackgroundTransfer;

        var imagesUri = new Windows.Foundation.Uri(Yabumi.API.getRoot() + 'images.txt');
        var uploader = new BackgroundTransfer.BackgroundUploader();
        uploader.setRequestHeader('user-agent', 'YabumiUWP/' + versionString + ' (YabumiUniversalApp) ' + navigator.userAgent);

        var parts = [];
        var part = new BackgroundTransfer.BackgroundTransferContentPart('imagedata', encodeURI(Uploader.Stat.filename));
        part.setFile(Uploader.Data.uploadFile);
        parts.push(part);

        // set expiration
        if (Yabumi.Util.getRoamingSetting('config.defaultExpiration')) {
            part = new BackgroundTransfer.BackgroundTransferContentPart('expiresAt');
            var offset = parseInt(Yabumi.Util.getRoamingSetting('config.defaultExpiration'), 10);
            if (offset === 0) {
                part.setText('null');
            } else {
                part.setText((new Date(Date.now() + offset)).toISOString());
            }
            parts.push(part);
        }

        // upload
        uploader.createUploadAsync(imagesUri, parts)
            .then(function (uploadOperation) {
                return uploadOperation.startAsync();
            })
            .then(
                function (uploadOperation) {

                    var responseInformation = uploadOperation.getResponseInformation();
                    var headers = responseInformation.headers;
                    var statusCode = responseInformation.statusCode;

                    if (statusCode === 200 || statusCode === 201) {
                        // success

                        var image = {
                            id: headers['X-Yabumi-Image-Id'],
                            pin: headers['X-Yabumi-Image-Pin'],
                            editUrl: headers['X-Yabumi-Image-Edit-Url']
                        };

                        // add to local history
                        localStorage.setItem(image.id, image.pin);
                        localStorage.setItem('images.updated', '0');

                        // copy to clipboard
                        if (document.hasFocus() && !Yabumi.Util.getRoamingSetting('config.disableCopyURLToClipboard')) {
                            var dataPackage = new Windows.ApplicationModel.DataTransfer.DataPackage();
                            dataPackage.setText(headers['Location']);
                            Windows.ApplicationModel.DataTransfer.Clipboard.setContent(dataPackage);
                        }

                        // go to the uploaded image
                        // add to remote history or,
                        if (Yabumi.API.getHistoryId()) {
                            return new WinJS.Promise(function (resolve, reject) {

                                var historyId = Yabumi.API.getHistoryId();

                                var xhr = new XMLHttpRequest();

                                xhr.open('PUT', Yabumi.API.getRoot() + 'histories/' + historyId + '/images/' + image.id + '.json');

                                xhr.addEventListener('load', function () {
                                    resolve(image);
                                });

                                xhr.send(JSON.stringify({
                                    pin: image.pin
                                }));
                            });
                        } else {
                            return WinJS.Promise.wrap(image);
                        }
                    } else {
                        return WinJS.Promise.wrapError(new Error(_L('failed to upload') + ' (' + statusCode + ')'));
                    }
                },
                function (e) {

                    if (Uploader.shareOperation) {
                        Uploader.shareOperation.reportError(e.message);
                    }

                    Yabumi.UI.showMessageDialog({
                        title: _L('error'),
                        text: e.message,
                        onClose: prepareUploadFile
                    });
                }
            )
            .then(
                function (image) {

                    if (Yabumi.Util.getLocalSetting('config.openSystemBrowserAfterUpload')) {
                        return Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(image.editUrl));
                    } else {
                        if (Uploader.shareOperation) {
                            if (document.hasFocus() === true) {
                                var url = 'yabumi://viewer/' + image.id;
                                return Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(url));
                            } else {
                                Yabumi.UI.notify({
                                    title: Uploader.Data.originalFile.name,
                                    text: _L('uploaded successfully'),
                                    launch: 'viewer/' + image.id
                                });

                                return WinJS.Promise.wrap();
                            }
                        } else {
                            location.href = '/app/viewer.html?' + image.id;
                            return WinJS.Promise.wrap('navigated');
                        }
                    }
                },
                function (e) {

                    if (Uploader.shareOperation) {
                        Uploader.shareOperation.reportError(e.message);
                    }

                    Yabumi.UI.showMessageDialog({
                        title: _L('error'),
                        text: e.message,
                        onClose: prepareUploadFile
                    });
                }
            )
            .done(function (action) {

                if (Uploader.shareOperation) {
                    Uploader.shareOperation.reportCompleted();
                } else {
                    if (action !== 'navigated') {
                        location.href = '/app/index.html';
                    }
                }
            },
            function (e) {
                console.error(e);
            });
    }
})();