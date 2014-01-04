// global constants
var FFTSIZE = 32;      // number of samples for the analyser node FFT, min 32
var TICK_FREQ = 20;     // how often to run the tick function, in milliseconds
var CIRCLES = 8;        // the number of circles to draw.  This is also the amount to break the files into, so FFTSIZE/2 needs to divide by this evenly
var RADIUS_FACTOR = 80; // the radius of the circles, factored for which ring we are drawing
var MIN_RADIUS = 1;     // the minimum radius of each circle
var HUE_VARIANCE = 120;  // amount hue can vary by
var COLOR_CHANGE_THRESHOLD = 20;    // amount of change before we change color
var WAVE_EMIT_THRESHOLD = 20;   // amount of positive change before we emit a wave
var WAVE_SCALE = 0.03;  // amount to scale wave per tick
var WAVE_RADIUS = 200; // the radius the wave images will be drawn with
var WAVE_THICKNESS = 0.5;
var WAVE_SPEED = 0.8;

// global variables
var stage;              // the stage we draw everything to
var h, w;               // variables to store the width and height of the canvas
var centerX, centerY;   // variables to hold the center point, so that tick is quicker
var faceCenterX, faceCenterY;   // variables to hold the center point, so that tick is quicker
var messageField;       // Message display field
var assetsPath = "assets/"; // Create a single item to load.
var src;
var songs = ["05-Binrpilot-Underground.mp3"];
//var songs = ["Bohemian.mp3","CantStopNow.mp3","Puppy.mp3",
//              "Apollo.mp3","Throttle-You-Make-Me.mp3","Helena-Beat.mp3",
//              "Scary-Monsters.mp3", "05-Binrpilot-Underground.mp3"]//,"Fight-Fire-with-Fire.mp3","New-Blood.mp3"]
var soundInstance;      // the sound instance we create
var analyserNode;       // the analyser node that allows us to visualize the audio
var freqFloatData, freqByteData, timeByteData;  // arrays to retrieve data from analyserNode
var mouthRectangles = {};       // object has of circles shapes
var leftEyeCircles = {};       // object has of circles shapes
var rightEyeCircles = {};       // object has of circles shapes
var leftEyeLaser;       // object has of circles shapes
var rightEyeLaser;       // object has of circles shapes
var circleHue = 300;   // the base color hue used when drawing circles, which can change
var waves = new createjs.Container();   // container to store waves we draw coming off of circles
var circleFreqChunk;    // The chunk of freqByteData array that is computed per circle
var dataAverage = [42,42,42,42];   // an array recording data for the last 4 ticks
var waveImgs = []; // array of wave images with different stroke thicknesses

var EYES_SPEED = 0.15;
    eyesAngle = 0,
    eyesMoveDirection = 0;
    irisRadius = 0;


function init() {
    if (window.top != window) {
        document.getElementById("header").style.display = "none";
    }

    // Web Audio only demo, so we register just the WebAudioPlugin and if that fails, display fail message
    if (!createjs.Sound.registerPlugins([createjs.WebAudioPlugin])) {
        document.getElementById("error").style.display = "block";
        return;
    }

    // create a new stage and point it at our canvas:
    var canvas = document.getElementById("testCanvas");
    updateCoordinates(canvas)
    stage = new createjs.Stage(canvas);

    window.addEventListener('resize', updateCoordinates);
    
    // a message on our stage that we use to let the user know what is going on.  Useful when preloading.
    messageField = new createjs.Text("Loading Audio \n\n Yep, this can take some time...", "bold 24px Arial", "#FFFFFF");
    messageField.maxWidth = w;
    messageField.textAlign = "center";  // NOTE this puts the registration point of the textField at the center
    messageField.x = centerX;
    messageField.y = centerY;
    stage.addChild(messageField);
    stage.update();     //update the stage to show text

    src = assetsPath + songs[Math.floor(Math.random() * songs.length)];

    createjs.Sound.addEventListener("fileload", createjs.proxy(handleLoad,this)); // add an event listener for when load is completed
    createjs.Sound.registerSound(src);  // register sound, which preloads by default
    console.log("Loading", src);

}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function updateCoordinates () {
    var canvas = document.getElementById("testCanvas");
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // set the width and height, so we only have to access this data once (quicker)
    h = canvas.height;
    w = canvas.width;
    // calculate the center point, so we only have to do this math once (quicker)
    centerX = w >> 1;
    centerY = h >> 1;

    //faceCenterX = canvas.width;
    //faceCenterY = 0;
    faceCenterX = centerX;
    faceCenterY = centerY;
}

function handleLoad(evt) {
    // get the context.  NOTE to connect to existing nodes we need to work in the same context.
    var context = createjs.WebAudioPlugin.context;

    // create an analyser node
    analyserNode = context.createAnalyser();
    analyserNode.fftSize = FFTSIZE;  //The size of the FFT used for frequency-domain analysis. This must be a power of two
    analyserNode.smoothingTimeConstant = 0.85;  //A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame
    analyserNode.connect(context.destination);  // connect to the context.destination, which outputs the audio

    // attach visualizer node to our existing dynamicsCompressorNode, which was connected to context.destination
    var dynamicsNode = createjs.WebAudioPlugin.dynamicsCompressorNode;
    dynamicsNode.disconnect();  // disconnect from destination
    dynamicsNode.connect(analyserNode);

    // set up the arrays that we use to retrieve the analyserNode data
    freqFloatData = new Float32Array(analyserNode.frequencyBinCount);
    freqByteData = new Uint8Array(analyserNode.frequencyBinCount);
    timeByteData = new Uint8Array(analyserNode.frequencyBinCount);

    // calculate the number of array elements that represent each circle
    circleFreqChunk = analyserNode.frequencyBinCount / CIRCLES;

    // enable touch interactions if supported on the current device, and display appropriate message
    if (createjs.Touch.enable(stage)) {
        messageField.text = "Touch to start \nand then to control the eyes";
    } else {
        messageField.text = "Click to start\n\n Use the arrow keys to rotate the eyes!";
    }
    stage.update();     //update the stage to show text

    // wrap our sound playing in a click event so we can be played on mobile devices
    stage.addEventListener("stagemousedown", onMouseDown);
    stage.addEventListener("stagemouseup", onMouseUp);

    window.onkeydown = onKeyDown;
    window.onkeyup = onKeyUp;
}

function onKeyDown(evt) {
    if(!soundInstance) { 
        startPlayback();
        return;
    }

    if(evt.keyCode == 39 || evt.keyCode == 65){
        eyesMoveDirection = -1;
    } else if(evt.keyCode == 37 || evt.keyCode == 68){
        if(eyesAngle == 0) { eyesAngle = 3.14; }
        eyesMoveDirection = +1;
    } else if(evt.keyCode == 32){
        stopSound();
        if(waves.children.length > 0) {
            setTimeout(startSound,500); 
        } else {
            startSound();
        }
    } else if(evt.keyCode == 27){
        stopSound();
    }
}

function onKeyUp(evt){
    eyesMoveDirection = 0;
}

function onMouseDown(evt){
    if(!soundInstance) { 
        startPlayback();
        return;
    }

    if(evt.stageX > centerX){
        eyesMoveDirection = -1;
    } else {
        if(eyesAngle == 0) { eyesAngle = 3.14; }
        eyesMoveDirection = +1;
    }
}

function onMouseUp(evt){
    eyesMoveDirection = 0;
}

// this will start our playback in response to a user click, allowing this demo to work on mobile devices
function startPlayback() {
    if(soundInstance) {return;} // if this is defined, we've already started playing.  This is very unlikely to happen.
    
    // we're starting, so we can remove the message
    stage.removeChild(messageField);

    // start playing the sound we just loaded, looping indefinitely
    soundInstance = createjs.Sound.play(src);

    stage.addEventListener("dblclick", stopSound);

    // add waves container to stage
    stage.addChild(waves);

    // create circles so they are persistent
    for(var i=0; i<CIRCLES; i++) {
        var circle = rightEyeCircles[i] = new createjs.Shape();
        // set the composite operation so we can blend our image colors
        circle.compositeOperation = "lighter";
        stage.addChild(circle);
    }
    for(var i=0; i<CIRCLES; i++) {
        var circle = leftEyeCircles[i] = new createjs.Shape();
        // set the composite operation so we can blend our image colors
        circle.compositeOperation = "lighter";
        stage.addChild(circle);
    }

    for(var i=0; i<CIRCLES; i++) {
        var rectangle = mouthRectangles[i] = new createjs.Shape();
        rectangle.compositeOperation = "lighter";
        stage.addChild(rectangle);
    }
        
    var laser = leftEyeLaser = new createjs.Shape();
    laser.compositeOperation = "lighter";
    stage.addChild(leftEyeLaser);
    laser = rightEyeLaser = new createjs.Shape();
    laser.compositeOperation = "lighter";
    stage.addChild(rightEyeLaser);

    // start the tick and point it at the window so we can do some work before updating the stage:
    createjs.Ticker.addEventListener("tick", tick);
    createjs.Ticker.setInterval(TICK_FREQ);
}

function stopSound() {
    stage.removeEventListener("dblclick", stopSound);
    
    //createjs.Ticker.removeEventListener("tick", tick);
    createjs.Sound.stop();

    eyesAngle = 0;
    eyesMoveDirection = 0;

    stage.addEventListener("dblclick", startSound);
}

function startSound() {
    stage.removeEventListener("dblclick", startSound);

    //createjs.Ticker.addEventListener("tick", tick);
    soundInstance = createjs.Sound.play(src);

    stage.addEventListener("dblclick", stopSound);
}

function getEyeCircleGraphics(eye, i, color, lastRadius) {
    var cx = faceCenterX + eye * 150;
    var cy = faceCenterY - 100;

    if(i < CIRCLES - 1 && eyesAngle != 0) {
        cx += (irisRadius-lastRadius)*Math.cos(eyesAngle);
        cy += (irisRadius-lastRadius)*Math.sin(eyesAngle);
    }

    return new createjs.Graphics().beginFill(color).drawCircle(cx,cy, lastRadius).endFill();
}

function getLaserGraphics(eye, lastRadius) {
    if(eyesAngle != 0) {
        var cx = faceCenterX + eye * 150;
        var cy = faceCenterY - 100;

        var laserLenght = (irisRadius*irisRadius)/30,
            laserDistortion = 0.1*(irisRadius/50);
        
        var sx = cx+(irisRadius)*Math.cos(eyesAngle),
            sy = cy+(irisRadius)*Math.sin(eyesAngle),
            px = cx+laserLenght*Math.cos(eyesAngle+laserDistortion),
            py = cy+laserLenght*Math.sin(eyesAngle+laserDistortion),
            mx = cx+1.2*laserLenght*Math.cos(eyesAngle),
            my = cy+1.2*laserLenght*Math.sin(eyesAngle),
            fx = cx+laserLenght*Math.cos(eyesAngle-laserDistortion),
            fy = cy+laserLenght*Math.sin(eyesAngle-laserDistortion);

        var color = createjs.Graphics.getRGB(200, 200, 200, 200);
            
        var graphics = new createjs.Graphics();
        graphics.beginFill(color);
        graphics.moveTo(sx,sy);
        graphics.lineTo(fx,fy);
        //graphics.lineTo(mx,my);
        //graphics.lineTo(px,py);
        graphics.arcTo(mx,my,px,py,Math.sqrt((px-fx)*(px-fx)+(py-fy)*(py-fy))/2)
        graphics.lineTo(sx,sy);
        graphics.endFill();

        return graphics;
    }
}

function tick(evt) {
    analyserNode.getFloatFrequencyData(freqFloatData);  // this gives us the dBs
    analyserNode.getByteFrequencyData(freqByteData);  // this gives us the frequency
    analyserNode.getByteTimeDomainData(timeByteData);  // this gives us the waveform


    var lastRadius = 0;  // we use this to store the radius of the last circle, making them relative to each other
    // run through our array from last to first, 0 will evaluate to false (quicker)
    for(var i=0; i<CIRCLES; i++) {
        var freqSum = 0;
        var timeSum = 0;
        for(var x = circleFreqChunk; x; x--) {
            var index = (CIRCLES-i)*circleFreqChunk-x;
            freqSum += freqByteData[index];
            timeSum += timeByteData[index];
        }
        freqSum = freqSum / circleFreqChunk / 255;  // gives us a percentage out of the total possible value
        timeSum = timeSum / circleFreqChunk / 255;  // gives us a percentage out of the total possible value
        // NOTE in testing it was determined that i 1 thru 4 stay 0's most of the time

        // draw circle
        lastRadius += freqSum*RADIUS_FACTOR + MIN_RADIUS;
        var color = createjs.Graphics.getHSL((i/CIRCLES*HUE_VARIANCE+circleHue)%360, 100, 50);
        leftEyeCircles[i].graphics = getEyeCircleGraphics(-1, i, color, lastRadius);
        rightEyeCircles[i].graphics = getEyeCircleGraphics(+1, i, color, lastRadius);

        color = createjs.Graphics.getHSL(360-(i/CIRCLES*HUE_VARIANCE+circleHue)%360, 100, 50);
        var rectWidth = lastRadius*1.5;
        var rectHeigth = lastRadius*1.75;
        var rectRadius = rectWidth*100;
        var rectY = faceCenterY+100;
        var g = new createjs.Graphics().beginFill(color).drawRoundRectComplex(faceCenterX-rectWidth/2,rectY, rectWidth,rectHeigth,rectRadius,rectRadius,0,0).endFill();
        mouthRectangles[i].graphics = g;
    }
    leftEyeLaser.graphics = getLaserGraphics(1,lastRadius);
    rightEyeLaser.graphics = getLaserGraphics(-1,lastRadius);

    irisRadius = lastRadius - lastRadius/5;

    // update our dataAverage, by removing the first element and pushing in the new last element
    dataAverage.shift();
    dataAverage.push(lastRadius);

    // get our average data for the last 3 ticks
    var dataSum = 0;
    for(var i = dataAverage.length-1; i; i--) {
        dataSum += dataAverage[i-1];
    }
    dataSum = dataSum / (dataAverage.length-1);

    // calculate latest change
    var dataDiff = dataAverage[dataAverage.length-1] - dataSum;

    // change color based on large enough changes
    if(dataDiff>COLOR_CHANGE_THRESHOLD || dataDiff<COLOR_CHANGE_THRESHOLD) {circleHue = circleHue + dataDiff;}


    // emit a wave for large enough changes
    if(dataDiff > WAVE_EMIT_THRESHOLD){
        var color = createjs.Graphics.getHSL(((waves.children.length-1)/CIRCLES*HUE_VARIANCE+circleHue)%360, 100, 50);
    
        var thickness = (dataDiff*0.1+1)*WAVE_THICKNESS;
        thickness |= 0;

        // create the wave, and center it on screen:
        var wave = new createjs.Bitmap(getWaveImg(thickness, color));
        wave.x = faceCenterX;
        wave.y = faceCenterY;
        wave.regX = wave.regY = WAVE_RADIUS + thickness;
        
        // set the expansion speed as a factor of the value difference:
        wave.speed = (dataDiff*0.1+1)/WAVE_SPEED;
        
        // set the initial scale:
        wave.scaleX = wave.scaleY = lastRadius/WAVE_RADIUS;

        // add new wave to our waves container
        waves.addChild(wave);
    }

    // animate all of our waves by scaling them up by a fixed about
    var maxR = Math.sqrt(w*w+h*h); // the maximum radius for the waves.
    for(var i = waves.getNumChildren()-1; i>-1; i--) {
        wave = waves.getChildAt(i);
        wave.scaleX = wave.scaleY = wave.scaleX+wave.speed*0.02;

        // check if it is offstage and therefore not visible, if so remove it
        if(wave.scaleX*WAVE_RADIUS > maxR) {
            waves.removeChildAt(i);
        }
    }

    // draw the updates to stage
    stage.update();

    eyesAngle += EYES_SPEED * eyesMoveDirection;
}

function getWaveImg(thickness, color) {
    // floor the thickness so we only have to deal with integer values:
    thickness |= 0;
    if (thickness < 1) { return null; }
    
    // if we already have an image with the right thickness, return it:
    if (waveImgs[thickness]) { return waveImgs[thickness]; }
    
    // otherwise, draw the wave into a Shape instance:
    var waveShape = new createjs.Shape();
    waveShape.graphics.setStrokeStyle(thickness).beginStroke(color).drawCircle(0,0,WAVE_RADIUS);
    
    // cache it to create a bitmap version of the shape:
    var r = WAVE_RADIUS+thickness;
    waveShape.cache(-r, -r, r*2, r*2);
    
    // save the image into our list, and return it:
    waveImgs[thickness] = waveShape.cacheCanvas
    return waveShape.cacheCanvas;
}