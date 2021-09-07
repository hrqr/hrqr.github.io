/* Created by Valentin Heun on 9/4/21.
 Copyright (c) 2021 Valentin Heun
 Licensed under the MIT license: https://opensource.org/licenses/MIT
 */

HRQRPoint = function (x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
}

HRQRLine = function () {
    this.index = 0;
    this.pointA = new HRQRPoint;
    this.pointB = new HRQRPoint;
    this.distance = 0;
}

HRQR = function(){
    this.w = 0;
    this.h = 0;
    this.hs = 480;
    this.imgGrayReference = null;
    this.imgForProcess = null;
    this.M = null;
    this.contours = null;
    this.hull = null;
    this.cnt = null;
    this.convexHullData = [];
    this.ctx = null
    this.image = null;
    this.canvasString = null
    this.isRectangle = false;
    this.finalPoints = [];
    this.returnMsg = {};
    this.returnindex = 0;

    this.init = function () {
        this.imgGrayReference = new cv.Mat();
        this.imgForProcess = new cv.Mat();
        this.M = cv.Mat.ones(9, 9, cv.CV_8U);
        this.contours = new cv.MatVector();
        this.hull = new cv.MatVector();
        this.cnt = new cv.MatVector();
    }

    this.points = {};
    this.lines = {};
    this.canvas = null

    let time = 0;

    this.render = function (imageData) {
        time = Date.now();
        // console.log("----- clear")

        this.returnindex = 0;
        this.finalPoints = [];
        this.points = {};
        this.lines = {};
        this.hull = new cv.MatVector();
        this.returnMsg = {};
        this.h = imageData.height;
        this.w = imageData.width;


        this.imgForProcess = cv.matFromImageData(imageData);

        // console.log("Load Image: ", Date.now()-time);
        time = Date.now();


// You can try more different parameters
        cv.cvtColor(this.imgForProcess, this.imgForProcess, cv.COLOR_RGBA2GRAY, 0);

        this.imgGrayReference = this.imgForProcess.clone();
        // console.log(" Gray and clone: ", Date.now()-time);
        time = Date.now();

// You can try more different parameters
        cv.erode(this.imgForProcess, this.imgForProcess, this.M, {x: -1, y: -1}, 1, cv.BORDER_CONSTANT);

        // console.log(" erode : ", Date.now()-time);
        time = Date.now();

        cv.threshold(this.imgForProcess, this.imgForProcess, 127, 255, cv.THRESH_BINARY);

        // console.log("threshold: ", Date.now()-time);
        time = Date.now();

        cv.findContours(this.imgForProcess, this.contours, this.imgForProcess, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

        // console.log("countours: ", Date.now()-time);
        time = Date.now();

        // filter for certain sizes
        for (let i = 0; i < this.contours.size(); ++i) {
            this.cnt = this.contours.get(i);
            if (cv.arcLength(this.cnt, true) >= 150) {
                // You can try more different parameters
                cv.convexHull(this.cnt, this.imgForProcess, false, true);
                if (!cv.isContourConvex(this.cnt)) {
                    this.hull.push_back(this.imgForProcess);
                }
            }
        }
       // this.contours.delete()



        for (let i = 0; i < this.hull.size(); ++i) {
            this.convexHullData = this.hull.get(i).data32S;
            this.points[i] = [];
            this.lines[i] = [];
            for (let w = 0; w < this.convexHullData.length; w+=2) {
                // remove blobs that touch the corners
                if(this.convexHullData[w] === 0 || this.convexHullData[w+1] === 0) {
                    delete this.points[i];
                    delete this.lines[i];
                    break;
                }
                this.points[i].push(new HRQRPoint(this.convexHullData[w], this.convexHullData[w + 1]))
            }
        }



        // add angle and clean up
        for (let key in this.points) {
            let pointr = [];
            for (let w = 0; w < this.points[key].length; w++) {
                let a = {};
                let b = this.points[key][w];
                let c = {};

                if (w + 1 < this.points[key].length) {
                    c = this.points[key][w + 1];
                } else {
                    c = this.points[key][0];
                }

                if (w === 0) {
                    a = this.points[key][this.points[key].length - 1];
                } else {
                    a = this.points[key][w - 1];
                }

                b.angle = 180 - (this.find_angle(a, b, c) * 180 / Math.PI);

                if (this.points[key][w].angle > 15) {
                    pointr.push(this.points[key][w]);
                }
            }
            this.points[key] = pointr;


            // add distance
            for (let w = 0; w < this.points[key].length; w++) {
                let w2 = w + 1;
                if (w2 >= this.points[key].length) {
                    w2 = 0;
                }

                let newLine = new HRQRLine();
                newLine.index = w;
                newLine.pointA = this.points[key][w];
                newLine.pointB = this.points[key][w2];
                newLine.distance = this.distance(this.points[key][w2], this.points[key][w]);
                this.lines[key].push(newLine);
            }

            // Remove short lines and leave 4 corner lines
            this.lines[key].sort(function (a, b) {
                return a.distance < b.distance
            });
            this.lines[key].splice(4, this.points[key].length - 4);
            this.lines[key].sort(function (a, b) {
                return a.index > b.index
            });

            // // console.log("lines", this.lines[key]);

            // extend lines and find intersection to define real corners of squares
            this.finalPoints = [];

            for (let i = 0; i < this.lines[key].length; i++) {
                let ib = i + 1;
                if (ib >= this.lines[key].length) {
                    ib = 0;
                }

                let l = this.lines[key][i];
                let lb = this.lines[key][ib];

                // line 1
                let x1 = (l.pointB.x - l.pointA.x) * 100;
                let y2 = (l.pointB.y - l.pointA.y) * 100;

                // Line 2
                let x1b = (lb.pointB.x - lb.pointA.x) * 100;
                let y2b = (lb.pointB.y - lb.pointA.y) * 100;

                let a1 = new HRQRPoint(l.pointA.x - x1, l.pointA.y - y2);
                let a2 = new HRQRPoint(l.pointB.x + x1, l.pointB.y + y2);

                let b1 = new HRQRPoint(lb.pointA.x - x1b, lb.pointA.y - y2b);
                let b2 = new HRQRPoint(lb.pointB.x + x1b, lb.pointB.y + y2b);

                // create the corner points for the rectangle
                this.finalPoints.push(this.intersect(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y, b2.x, b2.y));

            }
            // console.log("find rectanlge: ", Date.now()-time);
            time = Date.now();
            // identify rectangle

            // make sure that this shape has exactly 4 corners
            this.isRectangle = false;
            if (this.finalPoints.length === 4) {

                // // console.log("lat ", finalPoints);
// get angles for the final shape
                let length = this.finalPoints.length;
                for (let w3 = 0; w3 < this.finalPoints.length; w3++) {
                    let a = {};
                    let b = this.finalPoints[w3];
                    let c = {};

                    if (w3 + 1 < length) {
                        c = this.finalPoints[w3 + 1];
                    } else {
                        c = this.finalPoints[0];
                    }
                    if (w3 === 0) {
                        a = this.finalPoints[length - 1];
                    } else {
                        a = this.finalPoints[w3 - 1];
                    }

                    // // console.log(a, b, c);
                    b.angle = 180 - (this.find_angle(a, b, c) * 180 / Math.PI);
                }

                let nrS = 10;
                if (this.finalPoints[0].x > nrS && this.finalPoints[0].y > nrS && this.finalPoints[0].x < (this.w - nrS) && this.finalPoints[0].y < (this.h - nrS) &&
                    this.finalPoints[1].x > nrS && this.finalPoints[1].y > nrS && this.finalPoints[1].x < (this.w - nrS) && this.finalPoints[1].y < (this.h - nrS) &&
                    this.finalPoints[2].x > nrS && this.finalPoints[2].y > nrS && this.finalPoints[2].x < (this.w - nrS) && this.finalPoints[2].y < (this.h - nrS) &&
                    this.finalPoints[3].x > nrS && this.finalPoints[3].y > nrS && this.finalPoints[3].x < (this.w - nrS) && this.finalPoints[3].y < (this.h - nrS)) {

                    let a = this.finalPoints[0].angle;
                    let b = this.finalPoints[1].angle;
                    let c = this.finalPoints[2].angle;
                    let d = this.finalPoints[3].angle;

                    let A = this.distance(this.finalPoints[0], this.finalPoints[1]);
                    let B =  this.distance(this.finalPoints[1], this.finalPoints[2]);
                    let C =  this.distance(this.finalPoints[2], this.finalPoints[3]);
                    let D =  this.distance(this.finalPoints[3], this.finalPoints[0]);

                    let vR = (a + c) / (b + d);
                    let dR = (A + C) / (B + D);

                    if (vR < 2 && vR > 0 && dR < 2 && dR > 0) {
                        this.isRectangle = true;
                    }
                }


                // draw points of potential rectangle
                if (this.isRectangle) {
                    // console.log("before decode: ", Date.now()-time);
                    time = Date.now();
                    this.decode(this.finalPoints);
                    // console.log("adter decode: ", Date.now()-time);
                    time = Date.now();

                }
            }
            // // console.log("testLines: ",this.lines)
        }
        // console.log("final decoder: ", Date.now()-time);
        time = Date.now();

        this.cnt.delete();
        this.imgGrayReference.delete();
        this.hull.delete();
        this.imgForProcess.delete();
        //  src.delete(); thresh.delete();
        return this.returnMsg;
    }

    this.decode = function (rect) {

// homography and worp into new image
        let srcPointsArray = [];
        let dstPointsArray = [];
        for (let i = 0; i < rect.length; i++) {
            if (i === 0) dstPointsArray.push(this.hs, this.hs);
            if (i === 1) dstPointsArray.push(0, this.hs);
            if (i === 2) dstPointsArray.push(0, 0);
            if (i === 3) dstPointsArray.push(this.hs, 0);
            srcPointsArray.push(rect[i].x, rect[i].y);
        }

        let srcPoints = cv.matFromArray(4, 2, cv.CV_32F, srcPointsArray);
        let dstPoints = cv.matFromArray(4, 2, cv.CV_32F, dstPointsArray);
        let homography = cv.findHomography(srcPoints, dstPoints, cv.RANSAC);

        // console.log("find homography: ", Date.now()-time);
        time = Date.now();

        if (homography) {
            cv.warpPerspective(this.imgGrayReference, this.imgGrayReference, homography, {width: this.hs, height: this.hs}, cv.INTER_NEAREST);

            // console.log("warp: ", Date.now()-time);
            time = Date.now();

            //cv.rotate(this.imgGrayReference,this.imgGrayReference, cv.ROTATE_90_CLOCKWISE);
            // bitmap image
            cv.threshold(this.imgGrayReference, this.imgGrayReference, 127, 255, cv.THRESH_BINARY);

            // console.log("rotate: ", Date.now()-time);
            time = Date.now();

          // let columnMean = new cv.Mat(this.imgHomographyResult.rows, 1, cv.CV_8UC1);
          //  let rowMean = new cv.Mat(this.imgHomographyResult.cols, 1, cv.CV_8UC1);


            this.colm = new cv.Mat();
            this.row = new cv.Mat();

            cv.reduce(this.imgGrayReference, this.row, 0, cv.REDUCE_AVG);
            cv.reduce(this.imgGrayReference, this.colm, 1, cv.REDUCE_AVG);

            // console.log("find row edges: ", Date.now()-time);
            time = Date.now();

            let colmMin = 0, colmMax = 0;
            let rowMin = 0, rowMax = 0;
            let colmHigh = 0, rowHigh = 0;
            let colmCount = 0, rowCount = 0;

            //int flipby90 = 0;
            let sensitiveEdge = 170;
            let edgeOfset = 1;

            let sensitiveCountSearch = 10;

            // define edges of the tag for colums
            // min
            for (let i = 1; i < this.hs; i++) {
                if (this.colm.data[i] < sensitiveEdge) {
                    colmMin = i + edgeOfset;
                    break;
                }
            }
            //max
            for (let i = this.hs; i > 0; i--) {
                if (this.colm.data[i] < sensitiveEdge && this.colm.data[i] > 30) {
                    colmMax = i + edgeOfset;
                    break;
                }
            }

            // define edges of the tag for rows
            // min
            for (let i = 1; i < this.hs; i++) {
                if (this.row.data[i] < sensitiveEdge) {
                    rowMin = i + edgeOfset;
                    break;
                }
            }

            //max
            for (let i = this.hs; i > 0; i--) {
                if (this.row.data[i] < sensitiveEdge && this.row.data[i] > 30) {
                    rowMax = i + edgeOfset;
                    break;
                }
            }

            // search the highest value colm
            for (let i = colmMin + 5; i < colmMax - 5; i++) {
                if (this.colm.data[i] > colmHigh)
                    colmHigh = this.colm.data[i];
            }

            // search the highest value row
            for (let i = rowMin + 5; i < rowMax - 5; i++) {
                if (this.row.data[i] > rowHigh)
                    rowHigh = this.row.data[i];
            }


            if (rowHigh > colmHigh) {
                cv.rotate(this.imgGrayReference, this.imgGrayReference, cv.ROTATE_90_CLOCKWISE);
                //  this.imgHomographyResult.rotate90(1);

                let placeholder = 0;

                [colmMin, rowMin] = [rowMin, colmMin];
                [colmMax, rowMax] = [rowMax, colmMax];
                [colmHigh, rowHigh] = [rowHigh, colmHigh];
                [colmCount, rowCount] = [rowCount, colmCount];
                [this.colm, this.row] = [this.row, this.colm];

              /*  placeholder = colmMin;
                colmMin = rowMin;
                rowMin = placeholder;

                placeholder = colmMax;
                colmMax = rowMax;
                rowMax = placeholder;

                placeholder = colmHigh;
                colmHigh = rowHigh;
                rowHigh = placeholder;

                placeholder = colmCount;
                colmCount = rowCount;
                rowCount = placeholder;

                placeholder = this.colm.data;
                this.colm.data = this.row.data;
                this.row.data = placeholder;

*/
               /* for (let i = 0; i < this.hs; i++) {
                    placeholder = this.colm.data[i];
                    this.colm.data[i] = this.row.data[i];
                    this.row.data[i] = placeholder;
                }*/
            }

            let oldValue = false;
            let newValue = false;

            // search for amount of colums
            for (let i = colmMin + 5; i < colmMax - 5; i += 3) {
                if (this.colm.data[i] > colmHigh - sensitiveCountSearch) {
                    newValue = true;
                } else {
                    newValue = false;
                }

                if (oldValue !== newValue) {
                    colmCount++;
                }

                oldValue = newValue;
            }
            colmCount = colmCount / 2;

            oldValue = false;
            newValue = false;

            // search for amount of rows
            for (let i = rowMin + 5; i < rowMax - 5; i += 3) {
                if (this.row.data[i] > rowHigh - sensitiveCountSearch) {
                    newValue = true;
                } else {
                    newValue = false;
                }

                if (oldValue !== newValue) {
                    rowCount++;
                }

                oldValue = newValue;
            }

            //done with the rows and colms
            this.row.delete()
            this.colm.delete()

            rowCount = rowCount / 2;
            let blockCount = (colmCount * 8) + 7;

            let blockSizeX = (colmMax - colmMin).toFixed(2) / (blockCount).toFixed(2);
            let blockSizeY = (rowMax - rowMin).toFixed(2) / (blockCount).toFixed(2);

            let imageData = [blockCount];

            let halfBlock = blockSizeX / 2;

            for (let i = 0; i < blockCount; i++) {

                imageData[i] = [blockCount];

                for (let k = 0; k < blockCount; k++) {

                    let X = parseInt(colmMin + ((blockSizeX * i) + (halfBlock)));
                    let Y = parseInt(rowMin + ((blockSizeY * k) + (halfBlock)));
                    if (X > this.hs) X = this.hs;
                    if (Y > this.hs) Y = this.hs;

                    if (this.imgGrayReference.ucharAt(Y, X) > 100) {
                        imageData[i][k] = true;

                    } else {
                        imageData[i][k] = false;

                    }

                }
            }

            // console.log("get first bitmask: ", Date.now()-time);
            time = Date.now();

            for (let a = 0; a < (colmCount + 1); a++) {
                for (let b = 0; b < ((colmCount + 1) * 2); b++) {

                    let bitLetter = [21];
                    let countBit = 0;

                    for (let c = 0; c < 3; c++) {
                        for (let d = 0; d < 7; d++) {

                            let x = b * 4 + c;
                            let y = a * 8 + d;

                            // ofconsole.log() << "x: " << x << " y: " << y;
                            if (imageData[x][y]) {
                                bitLetter[countBit] = false;
                                //  this.canvas.fillStyle = 'gray';
                            } else {
                                bitLetter[countBit] = true;
                                // this.canvas.fillStyle = 'black';
                            }
                            //this.canvas.fillRect (x*6, y*6, 6, 6);
                            countBit++;
                        }
                    }

                    //   ofconsole.log() << debugs;

                    // here is a letter filled

                    let resBitNumber = this.bitNumber(bitLetter);

                    if (resBitNumber === 912127) {
                        cv.rotate(this.imgGrayReference, this.imgGrayReference, cv.ROTATE_180);

                        for (let i = 0; i < blockCount; i++) {
                            for (let k = 0; k < blockCount; k++) {


                                let X = parseInt(colmMin + ((blockSizeX * i) + (halfBlock)));
                                let Y = parseInt(rowMin + ((blockSizeY * k) + (halfBlock)));
                                if (X > this.hs) X = this.hs;
                                if (Y > this.hs) Y = this.hs;

                                if (this.imgGrayReference.ucharAt(Y, X) > 100) {
                                    imageData[i][k] = true;

                                } else {
                                    imageData[i][k] = false;

                                }
                            }
                        }

                        break;
                    }

                }
            }

            let theMessage = "";

            // ofconsole.log() << "new frame";

            for (let a = 0; a < (colmCount + 1); a++) {

                for (let b = 0; b < ((colmCount + 1) * 2); b++) {

                    let bitLetter = [21];
                    let bitSpacer = [21];
                    let countBit = 0;

                    let countSpaceBit = 0;

                    for (let c = 0; c < 3; c++) {
                        for (let d = 0; d < 7; d++) {

                            let x = b * 4 + c;
                            let y = a * 8 + d;

                            // ofconsole.log() << "x: " << x << " y: " << y;
                            if (imageData[x][y]) {
                                bitLetter[countBit] = false;
                            } else {
                                bitLetter[countBit] = true;
                            }

                            bitSpacer[countBit] = false;

                            countBit++;
                        }

                    }

                    for (let e = 0; e < 7; e++) {

                        let x = b * 4 + 3;
                        let y = a * 8 + e;

                        if (b < ((colmCount + 1) * 2) - 1) {

                            if (imageData[x][y]) {
                                bitSpacer[countSpaceBit] = false;
                            } else {
                                bitSpacer[countSpaceBit] = true;
                            }
                        } else {
                            x = b * 4;
                            y = a * 8 + 7;

                            if (!imageData[x][y]) {
                                bitSpacer[countSpaceBit] = true;
                            }
                            x++;
                            if (!imageData[x][y]) {
                                bitSpacer[countSpaceBit] = true;
                            }
                            x++;
                            if (!imageData[x][y]) {
                                bitSpacer[countSpaceBit] = true;
                            }
                        }

                        countSpaceBit++;
                    }

                    let resBitNumber = this.bitNumber(bitLetter);

                    for (key in this.abc) {
                        if (resBitNumber === this.abc[key].hash) {
                            theMessage += this.abc[key].letter;
                            break;
                        }
                    }

                    let resBitSpacer = this.bitNumber(bitSpacer);

                    // ofconsole.log () <<bitSpacer;
                    //  ofconsole.log () << "sp: " << resBitSpacer;
                    if (resBitSpacer === 0) {
                        theMessage += " ";
                    }

                }
            }

            let endBlock = theMessage.lastIndexOf(" & ");

            // long checkBlock = theMessage.find_last_of("&", endBlock-1);

            if (endBlock >= 0) {

                let finalMessage = theMessage.substr(0, endBlock);
                let checkMSG = theMessage.substr(endBlock + 3, 3);

                let strcheckMSG = "";

                let testCheck = ".";

                let foundPoint = checkMSG.indexOf(testCheck);

                if (foundPoint === 0) {
                    checkMSG = checkMSG.substring(1)
                }

                let foundPoint2 = checkMSG.indexOf(testCheck);

                if (foundPoint2 === 0) {
                    checkMSG = checkMSG.substring(1)
                }

                let MSGCheckSumm = this.crc16(finalMessage);


                if (this.itob62(MSGCheckSumm) === checkMSG) {

                    theMSG = finalMessage;

                    let str2 = "http://";
                    let str3 = "https://";
                    let str4 = "coin://";

                    let found1 = finalMessage.indexOf(str2);

                    let found2 = finalMessage.indexOf(str3);

                    let found3 = finalMessage.indexOf(str4);

                    if (found3 === 0) {
                        finalMessage = "https://blockchain.info/address/" + finalMessage.substr(7);
                    }

                    if (found2 === 0) {

                    }

                    if (found1 === 0) {

                    }

                    this.returnMsg[this.returnindex] = {msg: finalMessage, points:rect};
                    this.returnindex++;

                }


            }

            //  cv.imshow("canvasOutput2", this.imgHomographyResult);
        }

       // this.imgGrayReference.delete();
    }

    this.find_angle = function (A, B, C) {
        var AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
        var BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2));
        var AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
        return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
    }

    this.distance = function (A, B) {
        var a = A.x - B.x;
        var b = A.y - B.y;

        return Math.sqrt(a * a + b * b);
    }

    this.intersect = function (x1, y1, x2, y2, x3, y3, x4, y4) {

        // Make sure lines are not length 0
        if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
            return false
        }

        const den = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

        // Make sure that lines are not parallel
        if (den === 0) {
            return false
        }

        let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den
        let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den

        // Return a object with the x and y coordinates of the intersection
        let x = x1 + ua * (x2 - x1)
        let y = y1 + ua * (y2 - y1)

        return new HRQRPoint(x, y);
    }

    this.crcTable = [0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5,
        0x60c6, 0x70e7, 0x8108, 0x9129, 0xa14a, 0xb16b,
        0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
        0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
        0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c,
        0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
        0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b,
        0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
        0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
        0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738,
        0xf7df, 0xe7fe, 0xd79d, 0xc7bc, 0x48c4, 0x58e5,
        0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
        0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969,
        0xa90a, 0xb92b, 0x5af5, 0x4ad4, 0x7ab7, 0x6a96,
        0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
        0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
        0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03,
        0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
        0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6,
        0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
        0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
        0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb,
        0xd10c, 0xc12d, 0xf14e, 0xe16f, 0x1080, 0x00a1,
        0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
        0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c,
        0xe37f, 0xf35e, 0x02b1, 0x1290, 0x22f3, 0x32d2,
        0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
        0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
        0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447,
        0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
        0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2,
        0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
        0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
        0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827,
        0x18c0, 0x08e1, 0x3882, 0x28a3, 0xcb7d, 0xdb5c,
        0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
        0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0,
        0x2ab3, 0x3a92, 0xfd2e, 0xed0f, 0xdd6c, 0xcd4d,
        0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
        0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
        0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba,
        0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
        0x2e93, 0x3eb2, 0x0ed1, 0x1ef0];

    this.crc16 = function (s) {
        var crc = 0xFFFF;
        var j, i;

        for (i = 0; i < s.length; i++) {

            var c = s.charCodeAt(i);

            //   // console.log(c);
            if (c > 255) {
                //    throw new RangeError();
            }
            j = (c ^ (crc >> 8)) & 0xFF;
            crc = this.crcTable[j] ^ (crc << 8);
        }

        return ((crc ^ 0) & 0xFFFF);

    }

    this.itob62 = function (i) {
        var u = i;
        var b32 = "";
        do {
            var d = Math.floor(u % 62);
            if (d < 10) {

                b32 = String.fromCharCode('0'.charCodeAt(0) + d) + b32;
            } else if (d < 36) {
                b32 = String.fromCharCode('a'.charCodeAt(0) + d - 10) + b32;
            } else {
                b32 = String.fromCharCode('A'.charCodeAt(0) + d - 36) + b32;
            }

            u = Math.floor(u / 62);

        } while (u > 0);

        return b32;
    }

    this.bitNumber = function (bits) {
        if (bits.length !== 21) return;

        let bitResult;

        for (let i = 0; i < 32; i++) {
            bitResult &= ~(1 << i);
        }

        for (let i = 0; i < 20; i++) {
            if (bits[i]) {
                bitResult |= 1 << i;
            } else {
                bitResult &= ~(1 << i);
            }
        }
        return bitResult;
    }

    this.abc = [
        // small letters
        {letter: 'a', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1034495},
        {letter: 'b', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1042687},
        {letter: 'c', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1], hash: 909567},
        {letter: 'd', bitmask: [1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1041531},
        {letter: 'e', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1], hash: 387327},
        {letter: 'f', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1], hash: 869119},
        {letter: 'g', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1], hash: 975103},
        {letter: 'h', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1033343},
        {letter: 'i', bitmask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1], hash: 359125},
        {letter: 'j', bitmask: [1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1040635},
        {letter: 'k', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1], hash: 903807},
        {letter: 'l', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 516223},
        {letter: 'm', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1032575},
        {letter: 'n', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1032447},
        {letter: 'o', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1008381},
        {letter: 'p', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0], hash: 1036543},
        {letter: 'q', bitmask: [1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0], hash: 1044671},
        {letter: 'r', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1], hash: 775423},
        {letter: 's', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1], hash: 911583},
        {letter: 't', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1], hash: 999679},
        {letter: 'u', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1040511},
        {letter: 'v', bitmask: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0], hash: 1044543},
        {letter: 'w', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1036415},
        {letter: 'x', bitmask: [1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1], hash: 904823},
        {letter: 'y', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1042527},
        {letter: 'z', bitmask: [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518901},
        // alternative small letters
        {letter: 'a', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1], hash: 1002237},
        //b
        {letter: 'c', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1], hash: 746237},
        //d
        {letter: 'e', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 355069},
        {letter: 'f', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0], hash: 346877},
        {letter: 'g', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1], hash: 877309},
        {letter: 'h', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1], hash: 1001725},
        {letter: 'i', bitmask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1], hash: 359125},
        {letter: 'j', bitmask: [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1008373},
        {letter: 'k', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 485629},
        {letter: 'l', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 483581},
        {letter: 'm', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1], hash: 1000701},
        {letter: 'n', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1], hash: 1000189},
        {letter: 'o', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1008381},
        {letter: 'p', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0], hash: 1004285},
        {letter: 'q', bitmask: [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0], hash: 1012413},
        {letter: 'r', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1], hash: 477949},
        {letter: 's', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1], hash: 879325},
        {letter: 't', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1], hash: 869117},
        {letter: 'u', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1007869},
        {letter: 'v', bitmask: [1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0], hash: 1011901},
        {letter: 'w', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1], hash: 1003773},
        {letter: 'x', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1], hash: 742653},
        {letter: 'y', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1009885},
        {letter: 'z', bitmask: [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 486133},
        // caps
        {letter: 'A', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 516831},
        {letter: 'B', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518879},
        {letter: 'C', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], hash: 452831},
        {letter: 'D', bitmask: [0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518494},
        {letter: 'E', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 355039},
        {letter: 'F', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1], hash: 877279},
        {letter: 'G', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 485599},
        {letter: 'H', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 516703},
        {letter: 'I', bitmask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 356053},
        {letter: 'J', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518365},
        {letter: 'K', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1], hash: 451935},
        {letter: 'L', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1], hash: 387167},
        {letter: 'M', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 516447},
        {letter: 'N', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 516319},
        {letter: 'O', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518367},
        {letter: 'P', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1], hash: 779487},
        {letter: 'Q', bitmask: [1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1], hash: 257231},
        {letter: 'R', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1], hash: 903935},
        {letter: 'S', bitmask: [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 486103},
        {letter: 'T', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 483551},
        {letter: 'U', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518239},
        {letter: 'V', bitmask: [1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1], hash: 257103},
        {letter: 'W', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 517215},
        {letter: 'X', bitmask: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1], hash: 452443},
        {letter: 'Y', bitmask: [1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518743},
        {letter: 'Z', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1], hash: 387805},
        //signs
        {letter: '1', bitmask: [1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1032445},
        {letter: '2', bitmask: [1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 518391},
        {letter: '3', bitmask: [1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1041643},
        {letter: '4', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1034335},
        {letter: '5', bitmask: [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1008375},
        {letter: '6', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1008383},
        {letter: '7', bitmask: [1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1032439},
        {letter: '8', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1041663},
        {letter: '9', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1042655},
        {letter: '0', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1040639},
        {letter: 'http://', bitmask: [1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1], hash: 713963},
        {letter: 'https://', bitmask: [1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1], hash: 712939},
        {letter: 'coin://', bitmask: [1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1], hash: 713979},
        {letter: 'spatialtoolbox://', bitmask: [1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1], hash: 510589},
        {letter: 'Ä', bitmask: [1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0], hash: 1002045},
        {letter: 'ä', bitmask: [1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1], hash: 1002109},
        {letter: 'Ö', bitmask: [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 485981},
        {letter: 'ö', bitmask: [1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1008253},
        {letter: 'Ü', bitmask: [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 485469},
        {letter: 'ü', bitmask: [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1007741},
        {letter: '±', bitmask: [0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1], hash: 297938},
        {letter: '|', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1], hash: 344191},
        {letter: '!', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1], hash: 344159},
        {letter: '?', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1], hash: 901853},
        {letter: '.', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1032319},
        {letter: ';', bitmask: [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1], hash: 999549},
        {letter: ',', bitmask: [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1], hash: 868437},
        {letter: ':', bitmask: [1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1], hash: 901239},
        {letter: '{', bitmask: [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1], hash: 162716},
        {letter: '}', bitmask: [1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0], hash: 474057},
        {letter: '/', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1007839},
        {letter: '(', bitmask: [0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1], hash: 160190},
        {letter: ')', bitmask: [1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0], hash: 1028553},
        {letter: '$', bitmask: [0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0], hash: 964014},
        {letter: '&', bitmask: [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1043191},
        {letter: '%', bitmask: [1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1], hash: 771195},
        {letter: '§', bitmask: [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1], hash: 1010399},
        {letter: '"', bitmask: [1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1], hash: 376919},
        {letter: '=', bitmask: [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1], hash: 346709},
        {letter: '-', bitmask: [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1], hash: 344661},
        {letter: '+', bitmask: [0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1], hash: 69572},
        {letter: '*', bitmask: [0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1], hash: 167882},
        {letter: '#', bitmask: [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1], hash: 509279},
        {letter: '<', bitmask: [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], hash: 1032789},
        {letter: '>', bitmask: [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1], hash: 344703},
        {letter: '°', bitmask: [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1], hash: 377559},
        {letter: '^', bitmask: [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1], hash: 360662},
        {letter: '_', bitmask: [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 352341},
        {letter: '[', bitmask: [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1], hash: 376917},
        {letter: ']', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 352511},
        {letter: '\'', bitmask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], hash: 1040597},
        {letter: '´', bitmask: [1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1], hash: 344279},
        {letter: '`', bitmask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1], hash: 377045},
        {letter: '@', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 516863},
        {letter: 'ß', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0], hash: 1037055},
        {letter: '€', bitmask: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 355071},
        {letter: '®', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 352989},
        {letter: '©', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 355037},
        {letter: '≠', bitmask: [1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1], hash: 379509},
        {letter: '¥', bitmask: [1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0], hash: 720683},
        {letter: '≤', bitmask: [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1], hash: 516693},
        {letter: '≈', bitmask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 355029},
        {letter: '~', bitmask: [1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1], hash: 354517},
        {letter: '•', bitmask: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], hash: 486109}
    ];

    this.printBits = function(){
        for(let key in this.abc){
            console.log(this.abc[key].letter, this.bitNumber(this.abc[key].bitmask))
        }
    }
};
let imgForProcess = null;
let imgForProcessdst = null;

function log (){
    // console.log(arguments);
}