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
    "use strict";

    WinJS.Application.onactivated = async function (e) {

        if (e.detail.kind !== Windows.ApplicationModel.Activation.ActivationKind.protocol) {
            location.href = "/app/index.html";
            return;
        }

        const rawUri = e.detail.uri.rawUri;
        const parts = rawUri.split("/");
        const target = parts[2];

        console.log("URI:", rawUri);
        console.log("parts:", parts);
        console.log("target:", target);

        if (target === "viewer" && parts[3]) {
            location.href = "/app/viewer.html?" + parts[3];
            return;
        }

        if (target === "uploaded" && parts[6]) {
            const [filename, pin] = parts[6].split("#pin=");
            const [id, ext] = filename.split(".");

            console.log("filename:", filename);
            console.log("id:", id);
            console.log("pin:", pin);

            // get info
            const image = await new Promise((resolve, reject) => {

                const xhr = new XMLHttpRequest();
                xhr.open("GET", `${Yabumi.API.getRoot()}images/${id}.json`);
                xhr.addEventListener("load", () => {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject();
                    }
                });
                xhr.send();
            });
            
            // add to local history
            let images = JSON.parse(localStorage.getItem("images"));
            images.unshift(image);
            localStorage.setItem("images", JSON.stringify(images));
            localStorage.setItem("images.updated", Date.now().toString(10));
            localStorage.setItem(id, pin);

            // add to remote history
            if (Yabumi.API.getHistoryId()) {
                await new Promise((resolve, reject) => {

                    const historyId = Yabumi.API.getHistoryId();

                    const xhr = new XMLHttpRequest();
                    xhr.addEventListener("load", () => resolve());
                    xhr.open("PUT", `${Yabumi.API.getRoot()}histories/${historyId}/images/${id}.json`);
                    xhr.send(JSON.stringify({
                        pin: pin
                    }));
                });
            }

            // set expiration
            if (Yabumi.Util.getRoamingSetting("config.defaultExpiration")) {
                await new Promise((resolve, reject) => {

                    let expiresAt = Date.now();
                    const offset = parseInt(Yabumi.Util.getRoamingSetting("config.defaultExpiration"), 10);
                    if (offset === 0) {
                        expiresAt = null;
                    } else {
                        expiresAt += offset;
                    }

                    var xhr = new XMLHttpRequest();
                    xhr.addEventListener("load", () => {
                        if (xhr.status >= 400 && xhr.status < 600) {
                            reject();
                        } else {
                            resolve();
                        }
                    });
                    xhr.open("PUT", `${Yabumi.API.getRoot()}images/${id}.json`);
                    xhr.send(JSON.stringify({ pin: pin, expiresAt: expiresAt }));
                });
            }

            // go
            if (Yabumi.Util.getLocalSetting("config.openSystemBrowserAfterUpload")) {
                const appRoot = Yabumi.API.getRoot().replace("/api/", "/");
                const editUrl = `${appRoot}${parts[6]}`;
                await Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(editUrl));
                window.close();
                return;
            } else {
                location.href = `/app/viewer.html?${id}`;
                return;
            }
        }
    };

    WinJS.Application.start();

}());