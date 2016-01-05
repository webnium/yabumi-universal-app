﻿/*
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

    WinJS.Application.onactivated = function (e) {

        if (e.detail.kind !== Windows.ApplicationModel.Activation.ActivationKind.protocol) {
            location.href = 'index.html';
        }

        var rawUri = e.detail.uri.rawUri;

        if (rawUri.split('/')[2] === 'viewer' && rawUri.split('/')[3]) {
            setTimeout(function () {
                location.href = 'viewer.html?' + rawUri.split('/')[3];
            }, 0);
        }
    };

    WinJS.Application.start();

}());