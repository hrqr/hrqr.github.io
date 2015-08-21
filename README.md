# HRQR.github.io
Human Readable Quick Response Created by Valentin Heun


If you want to embbed HRQR Codes in to your own webpage, just do the following:

Add the two scripts "HRQRLetterdatabase.js" and "HRQR.js" to your webpage 

Example:
```
 <script src="HRQRLetterdatabase.js"></script>
 <script src="HRQR.js"></script> 
```
 
Define a div tag where the tag should be drawn in to.
 
Example:
```
  <div id="svgDiv"></div>
```
  
Then call the javascript function:
```  
  drawHRQR("svgDiv","message");
```   

"svgDiv" should be the ID of your div tag.
"message" should be the message you want to encode in HRQR.
   

You can change some properties of the tag by replacing values in an object called: globalStates 
   
Example:
```
globalStates.color = "0000FF";
```

The following properties can be changed:

The Width and Height allways should be identical:
```
globalStates.width
globalStates.height
```

This defines the left and top white space between the div boarder and the tag.
```
globalStates.left
globalStates.top
```

This thefines the color of the tag.
```
globalStates.color
```