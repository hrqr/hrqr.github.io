/* Created by Valentin Heun on 7/13/15.
 Copyright (c) 2015 Valentin Heun
 Licensed under the MIT license: https://opensource.org/licenses/MIT
 */
var globalStates = {
    database: letterDatabase,
    lineCounter: 0,
    rowCounter: 0,
    searchDepth: 7,
    line: 2,
    width: 8,
    height: 8,
    pixelsPerLetter: 7,
    left: 20,
    top: 20,
    htmlText: "",
    text: "",
    textTrim: "",
    color: "#000000",
    rows: 0,
    colums: 0,
    countingLine: 0,
    kubik: false,
    background: "#FFFFFF"
};

function getSize(minus) {
    return (((globalStates.colums - 1) * 4) + 3) * globalStates.width - minus;

}

function randomLetter() {
    var string = "abcdefghijklmnopqrstuvwxyz";
    return string[Math.floor(Math.random() * 26)]

}

function finalizeCanvas(idToChange) {
    globalStates.htmlText = globalStates.htmlText + '</svg>';
    document.getElementById(idToChange).innerHTML = globalStates.htmlText;
}

// start canvas

function drawHRQR(idToChange, messageContent, size, color, dotColor, outline, background) {

    if (size === undefined) {
        size = 8;
    }
    globalStates.width = globalStates.height = size;

    if (color === undefined) {
        color = "#000000";
    }
    globalStates.color = color;

    if (dotColor === undefined) {
        dotColor = color;
    }
    globalStates.dotColor = dotColor;

    if (outline === undefined) {
        outline = 20;
    }
    globalStates.left = globalStates.top = outline;

    if (background === undefined) {
        background = "#FFFFFF";
    }
    globalStates.background = background;

    globalStates.text = messageContent;

    var textCheck = makeThree(itob62(crc16(globalStates.text)));

    if (globalStates.text === "") {
        textCheck = "0";
    }

// generate text with crc32 checksum
    globalStates.text = globalStates.text + " & " + textCheck;

    // reading the length of the document

    globalStates.textTrimLength = 0;

    for (var i = 0; i < globalStates.text.length; i++) {

        for (var r = globalStates.searchDepth; r >= 0; r--) {
            var letterTemp = "";
            for (var k = r; k >= 0; k--) {
                letterTemp = globalStates.text[k + i] + letterTemp;
            }

            if (letterTemp in globalStates.database) {
                i = i + r;

                globalStates.textTrimLength++;

                if (globalStates.database[letterTemp]["big"]["width"] === 7) {
                    console.log("ching");
                    globalStates.textTrimLength++;
                }

                break;
            }
        }
    }

    globalStates.rowCounter = 0;
    globalStates.lineCounter = 0;
    globalStates.line = 0;

    // here it needs to have the right size
    globalStates.colums = globalStates.textTrimLength;

    // var countTwo = 1;
    globalStates.colums = Math.ceil(Math.sqrt(globalStates.colums * 2));

    if (globalStates.colums % 2) {
        globalStates.colums = globalStates.colums + 1;
        //countTwo = 1;
    }

    var amountOfLetters = globalStates.colums * (globalStates.colums / 2);

    while (globalStates.textTrimLength < amountOfLetters) {
        globalStates.text = globalStates.text + randomLetter();

        globalStates.textTrimLength++;

    }

    var rowColSize = ((globalStates.colums * globalStates.width * 4)) + (2 * globalStates.left) - globalStates.width;


    globalStates.htmlText = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width = "' + rowColSize + 'px" height = "' + rowColSize + 'px"  style="background: ' + globalStates.background + '">\n';

    writeLetters();
    finalizeCanvas(idToChange);
}

// write each letter
function writeLetters() {
    var letter = "";
    var textLength = globalStates.text.length;
    globalStates.countingLine = 0;
    for (var i = 0; i < globalStates.text.length; i++) {

        letter = globalStates.text[i];

        for (var r = globalStates.searchDepth; r >= 0; r--) {
            var letterTemp = "";
            for (var k = r; k >= 0; k--) {
                letterTemp = globalStates.text[k + i] + letterTemp;
            }

            if (letterTemp in globalStates.database) {
                letter = letterTemp;
                i = i + r;
                textLength = textLength - (r - 1);
                break;
            }
        }

        if (globalStates.countingLine >= globalStates.colums) {
            globalStates.line++;
            globalStates.rowCounter = 0;
            globalStates.countingLine = 0;
        }

        if (letter === "\n" && globalStates.kubik === false) {
            globalStates.line++;
            globalStates.rowCounter = 0;
            globalStates.countingLine = 0;
        }

        var size = letterSize(i);
        renderLetters(letter, size);

        if (letter !== " " && globalStates.text[i + 1] !== " " && i + 1 < globalStates.text.length) {
            if (letter != undefined && globalStates.text[i + 1] != undefined) {

                if (globalStates.countingLine >= globalStates.colums - 1) {
                    // console.log("y");
                    if (i + globalStates.colums <= globalStates.text.length) {
                        if (letterSize(i + 1) === "small") {

                            // renderConnector(letter, globalStates.text[i + globalStates.colums], size, true, true);

                            renderConnector(letter, letter, size, true, true);

                        } else {
                            // renderConnector(letter, globalStates.text[i + globalStates.colums], size, false, true);

                            renderConnector(letter, letter, size, false, true);
                        }
                    }
                } else {
                    //console.log("x");
                    if (letterSize(i + 1) === "small") {
                        renderConnector(letter, globalStates.text[i + 1], size, true, false);
                    } else {
                        renderConnector(letter, globalStates.text[i + 1], size, false, false);
                    }
                }
            }
        }
        // add fillings for the last letters
        if (letter in globalStates.database) {
            if (letter !== " ") {

                var countsize = 0;
                var sideB, sideA;

                if ("small" in letterDatabase[letter]) {
                    sideB = globalStates.database[letter][size].right;
                    sideA = globalStates.database[letter][size].left;

                    countsize = globalStates.database[letter][size].width / 3;
                }
                else {
                    sideB = globalStates.database[letter]["big"].right;
                    sideA = globalStates.database[letter]["big"].left;
                    countsize = globalStates.database[letter]["big"].width / 3;
                }
                globalStates.countingLine = globalStates.countingLine + countsize;
            }
            for (var w = 0; w < sideA.length; w++) {
                if (sideA[w] === 0) {
                    renderDot(4, w);
                }

                if (sideB[w] === 0) {
                    renderDot(2, w);
                }
            }
        }
    }
}


function letterSize(i) {
    var size = "big";
    // this is all nessesary to figure out if letter should be small
    if (i - 1 >= 0 && i + 2 <= globalStates.text.length
        && (globalStates.text[i] in globalStates.database)
        && (globalStates.text[i - 1] in globalStates.database)
        && (globalStates.text[i + 1] in globalStates.database)) {
        if (globalStates.text[i].length == 1
            && (globalStates.database[globalStates.text[i - 1]].big.right[0] == 1
            || globalStates.database[globalStates.text[i - 1]].big.right[0] == 0)
            && (globalStates.database[globalStates.text[i + 1]].big.left[0] == 1
            || globalStates.database[globalStates.text[i + 1]].big.left[0] == 0)
            && ("small" in globalStates.database[globalStates.text[i]])
        ) {
            size = "small";
        }
    }
    return size;
}

function renderConnector(letterA, letterB, size, nextSize, possition) {

    if (letterA in globalStates.database && letterB in globalStates.database) {
        var grade = [];
        var gradeA = [];
        var gradeB = [];

        if (possition === true) {
            if (size in globalStates.database[letterA]) {
                gradeA = globalStates.database[letterA][size].bottom;
            } else {
                gradeA = globalStates.database[letterA]["big"].bottom;
            }

            if (size in globalStates.database[letterB]) {
                gradeB = globalStates.database[letterB][size].top;
            } else {
                gradeB = globalStates.database[letterB]["big"].top;
            }
        }
        else {

            if (size in globalStates.database[letterA]) {
                gradeA = globalStates.database[letterA][size].right;
            } else {
                gradeA = globalStates.database[letterA]["big"].right;
            }

            if (size in globalStates.database[letterB]) {
                gradeB = globalStates.database[letterB][size].left;
            } else {
                gradeB = globalStates.database[letterB]["big"].left;
            }
        }

        var finalPossition = 0;
        //  var pokeIn = false;

        for (var w = 0; w < gradeA.length; w++) {
            var lA = gradeA[w];
            var lB = gradeB[w];

            if (lA == 0) lA = 0;
            if (lB == 0) lB = 0;
            grade[w] = lA + lB;
        }

        var size2 = 200;
        for (var i = 0; i < grade.length; i++) {
            if (grade[i] <= size2) {
                size2 = grade[i];
                finalPossition = i;
                if ((gradeA[i] === 0 && gradeB[i] != 9) || (gradeA[i] === 0 && gradeB[i] === 0)) break;
            }
        }

        if (nextSize === true) finalPossition = 0;


        if (possition === true) {
            renderDot(1, finalPossition, true);
        }
        else {
            renderDot(1, finalPossition, false);
        }
    }
}


function renderDot(vertical, horizontal, possition) {
    var xx, yy;

    if (possition) {
        xx = globalStates.top + (globalStates.height * 7 + (globalStates.line * ((globalStates.pixelsPerLetter + 1) * globalStates.height)));
        yy = globalStates.left + (globalStates.width * (globalStates.rowCounter - horizontal - 2)); // - vertical
    }
    else {
        xx = globalStates.top + (globalStates.height * horizontal + (globalStates.line * ((globalStates.pixelsPerLetter + 1) * globalStates.height)));
        yy = globalStates.left + (globalStates.width * (globalStates.rowCounter - vertical));
    }

    globalStates.htmlText =
        globalStates.htmlText + '<rect x="' + yy + '" y="' + xx + '" width="' +
        globalStates.width + '" height="' +
        globalStates.height + '" style="fill:' +
        globalStates.dotColor + '" />\n';
}

function renderLetters(thisLetter, size) {

    if (thisLetter in globalStates.database) {
        var lineHeight = 7;
        var shapeLength = 0;
        var shape = [];
        var shapePossition = 0;
        if (size === "big" || size === "small") {
            shapeLength = letterDatabase[thisLetter].big.shape.length;
            shape = letterDatabase[thisLetter].big.shape
        }
        if (size === "small" && ("small" in letterDatabase[thisLetter])) {
            shapeLength = letterDatabase[thisLetter].small.shape.length;
            shape = letterDatabase[thisLetter].small.shape
        }

        globalStates.lineCounter = 0;

        for (var i = 0; i < shapeLength; i++) {
            if (shape[i] === 1) {
                var xx = globalStates.top + ((globalStates.height * (globalStates.lineCounter + shapePossition)) + (globalStates.line * ((globalStates.pixelsPerLetter + 1) * globalStates.height)));
                var yy = globalStates.left + (globalStates.width * globalStates.rowCounter);
                globalStates.htmlText =
                    globalStates.htmlText + '<rect x="' + yy + '" y="' + xx + '" width="' +
                    globalStates.width + '" height="' +
                    globalStates.height + '" style="fill:' +
                    globalStates.color + '" />\n'
            }
            globalStates.lineCounter++;
            if (globalStates.lineCounter >= lineHeight) {
                globalStates.lineCounter = 0;
                globalStates.rowCounter++;
            }
        }
        globalStates.htmlText = globalStates.htmlText + '\n';
        globalStates.rowCounter++
    }
}

var crcTable = [0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5,
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


function crc16(s) {
    var crc = 0xFFFF;
    var j, i;

    for (i = 0; i < s.length; i++) {

        var c = s.charCodeAt(i);

        //   console.log(c);
        if (c > 255) {
            //    throw new RangeError();
        }
        j = (c ^ (crc >> 8)) & 0xFF;
        crc = crcTable[j] ^ (crc << 8);
    }

    return ((crc ^ 0) & 0xFFFF);

}

function itob62(i) {
    var u = i;
    var b32 = "";
    do
    {
        var d = Math.floor(u % 62);
        if (d < 10) {

            b32 = String.fromCharCode('0'.charCodeAt(0) + d) + b32;
        }
        else if (d < 36) {
            b32 = String.fromCharCode('a'.charCodeAt(0) + d - 10) + b32;
        } else {
            b32 = String.fromCharCode('A'.charCodeAt(0) + d - 36) + b32;
        }


        u = Math.floor(u / 62);

    } while (u > 0);

    return b32;
}

function makeThree(i) {
    if (i.length > 3) {
        return i.substring(0, 3);
    }
    else if (i.length === 2) {
        return "." + i;
    }
    else if (i.length === 1) {
        return ".." + i;
    }
    else {
        return i;
    }
}