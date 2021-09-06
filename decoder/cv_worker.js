/* Created by Valentin Heun on 9/4/21.
 Copyright (c) 2021 Valentin Heun
 Licensed under the MIT license: https://opensource.org/licenses/MIT
 */

importScripts("./3rdparty/opencv.js");
importScripts("./HRQRDecoder.js");

let hrqr = new HRQR();
//let hrqr = new MEMORYTEST();

cv["onRuntimeInitialized"] = () => {
    hrqr.init();
    postMessage({"mode":"ready"});
};

onmessage = function(msg) {

    postMessage({"mode":"msg", msg: hrqr.render(msg.data[0])});
};

