/* Created by Valentin Heun on 7/13/15.

 Copyright (c) 2015 Valentin Heun

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

 */


var globalCanvas = {};
var globalStates = {
    database: letterDatabase,
    svg: document.getElementById('svg'),
    lineCounter: 0,
    rowCounter: 0,
    searchDepth: 1,
    line: 2,
    width: 8,
    height: 8,
    pixelsPerLetter: 7,
    left: 20,
    top: 20,
    htmlText: "",
    text: "",
    textTrim: "",
    color: "000000",
    rows: 0,
    colums: 0,
    countingLine: 0,
    kubik: true
};

// helper funktions

window.onload = function () {
    prepareCanvas();
    window.addEventListener('resize', function () {
        prepareCanvas();
    });



    var tnumber = crc32("101101110");

    console.log("tom "+tnumber);
  //  console.log ("pet "+itob32(tnumber));
    console.log("test "+tnumber.toString(32));

    for(var letter in globalStates.database){

        var bitNumber = 0;


        for(var i = 0; i< 64; i++){
            var mask = 1 << i; // gets the 6th bit
            bitNumber &= ~mask;
        }

for(var i = 0; i< globalStates.database[letter].big.shape.length; i++){

   var bitValue =  globalStates.database[letter].big.shape[i];

    var mask = 1 << i; // gets the 6th bit

    if(bitValue === 1){
        bitNumber |= mask;
    }
    else
    {
        bitNumber &= ~mask;
    }

}

        console.log(letter);

        console.log("this is the number: "+bitNumber);

        console.log("in bits: "+bitNumber.toString(2));

        console.log(globalStates.database[letter].big.shape);

    }


};


function randomLetter() {
    var string = "abcdefghijklmnopqrstuvwxyz";
    return string[Math.floor(Math.random() * 26)]

}

function finalizeCanvas() {
    globalStates.htmlText = globalStates.htmlText + '</svg>';
    document.getElementById('svgDiv').innerHTML = globalStates.htmlText;
}

// start canvas

function prepareCanvas() {
    globalStates.text = document.getElementById('textContent').value;

 //   var checkString = crc32(globalStates.text);
   // console.log((Math.round(crc16(globalStates.text))).toString(32));

   // console.log(makeThree(itob62(crc16(globalStates.text))));


   //if (checkString < 0) checkString = checkString * -1;
  //  var textCheck = checkString.toString(32);

    console.log(crc16(globalStates.text));

    var textCheck = makeThree(itob62(crc16(globalStates.text)));

    if(globalStates.text ===""){
        textCheck ="0";
    }

    console.log(textCheck);

  //  console.log(crc16(globalStates.text));

// generate text with crc32 checksum
    globalStates.text = globalStates.text + " & " + textCheck;

    // reading the length of the document
    //  globalStates.textTrimLength = globalStates.text.replace(/\s/g, '').length;

    globalStates.textTrimLength = 0;
    for (var i = 0; i < globalStates.text.length; i++)
        if (globalStates.text[i] in globalStates.database) {
            globalStates.textTrimLength++;
        }

    globalStates.rowCounter = 0;
    globalStates.lineCounter = 0;
    globalStates.line = 0;



    globalStates.colums = globalStates.textTrimLength;


    var countTwo = 1;
    globalStates.colums = Math.ceil(Math.sqrt(globalStates.colums * 2));

    if (globalStates.colums % 2) {
        globalStates.colums = globalStates.colums + 1;
        countTwo = 1;
    }


    var amountOfLetters = globalStates.colums * (globalStates.colums / 2);

    while (globalStates.textTrimLength < amountOfLetters) {
        globalStates.text = globalStates.text + randomLetter();

        globalStates.textTrimLength = 0;
        for (var i = 0; i < globalStates.text.length; i++)
            if (globalStates.text[i] in globalStates.database) {
                globalStates.textTrimLength++;
            }
    }

    var colSize = (globalStates.colums * globalStates.width*4)+(globalStates.width*4);
    var rowSize = ((globalStates.colums) * globalStates.width*4)+(globalStates.width*4);

    globalStates.htmlText = '<svg class="SVG" id="svg" width = "' + colSize + 'px" height = "' + rowSize + 'px" >\n';

    writeLetters();
    finalizeCanvas();
}


// write each letter
function writeLetters() {
    var letter = "";
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
        renderLetters(letter, size, 0);


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

                            renderConnector(letter,letter, size, false, true);
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


                if ("small" in letterDatabase[letter]) {
                    var sideB = globalStates.database[letter][size].right;
                    var sideA = globalStates.database[letter][size].left;

                    var countsize = globalStates.database[letter][size].width / 3;
                }
                else {
                    var sideB = globalStates.database[letter]["big"].right;
                    var sideA = globalStates.database[letter]["big"].left;
                    var countsize = globalStates.database[letter]["big"].width / 3;
                }


                // console.log("hi " + countsize);

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

  //  console.log("this is it: " + globalStates.countingLine);

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
        var pokeIn = false;

        for (var i = 0; i < gradeA.length; i++) {
            var lA = gradeA[i];
            var lB = gradeB[i];

            if (lA == 0) lA = 0;
            if (lB == 0) lB = 0;
            grade[i] = lA + lB;
        }

        var size = 200;
        for (var i = 0; i < grade.length; i++) {
            if (grade[i] <= size) {
                size = grade[i];
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

    if (possition) {
        var xx = globalStates.top + (globalStates.height * 7 + (globalStates.line * ((globalStates.pixelsPerLetter + 1) * globalStates.height)));
        var yy = globalStates.left + (globalStates.width * (globalStates.rowCounter - horizontal - 2)); // - vertical
    }
    else {
        var xx = globalStates.top + (globalStates.height * horizontal + (globalStates.line * ((globalStates.pixelsPerLetter + 1) * globalStates.height)));
        var yy = globalStates.left + (globalStates.width * (globalStates.rowCounter - vertical));
    }


    globalStates.htmlText =
        globalStates.htmlText + '<rect x="' + yy + '" y="' + xx + '" width="' +
        globalStates.width + '" height="' +
        globalStates.height + '" style="fill:#' +
        globalStates.color + '" />\n';


}

function renderLetters(thisLetter, size, possition, direction) {

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
                    globalStates.height + '" style="fill:#' +
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


function crc32(str) {
    // http://kevin.vanzonneveld.net
    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // +   improved by: T0bsn
    // +    changed by: Valentin Heun (removed utf8_encode dependancy. It is not needed for this project)
    // *     example 1: crc32('Kevin van Zonneveld');
    // *     returns 1: 1249991249

    var table = "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";

    var crc = 0;
    var x = 0;
    var y = 0;

    crc = crc ^ (-1);
    for (var i = 0, iTop = str.length; i < iTop; i++) {
        y = ( crc ^ str.charCodeAt(i) ) & 0xFF;
        x = "0x" + table.substr(y * 9, 8);
        crc = ( crc >>> 8 ) ^ x;
    }

    return (new Uint32Array([crc ^ (-1)]))[0];
}


function itob32(i)
{
    var u = i ;
    var b32 ="";

    do
    {
        var d = u % 32 ;
        if( d < 10 )
        {
            b32.splice( 0, 1, '0' + d ) ;
        }
        else
        {
            b32.splice( 0, 1, 'a' + d - 10 ) ;
        }

        u /= 32 ;

    } while( u > 0 );

    return b32 ;
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
        if (c > 255) {
            throw new RangeError();
        }
        j = (c ^ (crc >> 8)) & 0xFF;
        crc = crcTable[j] ^ (crc << 8);
    }

    return ((crc ^ 0) & 0xFFFF);

}


function itob62(i)
{
    var u =  i ;
    var b32 ="";
    do
    {
        var d = Math.floor(u % 62);
        if( d < 10 )
        {

            b32 = String.fromCharCode('0'.charCodeAt(0) + d ) + b32 ;
        }
        else if (d < 36)
        {
            b32 = String.fromCharCode('a'.charCodeAt(0) + d - 10 ) + b32;
        }else{
            b32 = String.fromCharCode('A'.charCodeAt(0) + d - 36 ) + b32;
        }


        u = Math.floor(u/62);

    } while( u > 0 );

    return b32 ;
}

function makeThree(i)
{
   if(i.length > 3){
       return i.substring(0,3);
   }
else if(i.length === 2){
    return "."+i;
}
   else if(i.length === 1){
        return ".."+i;
    }
    else
   {
       return i;
   }


}