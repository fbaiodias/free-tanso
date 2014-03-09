// global constants
var FFTSIZE = 32;      // number of samples for the analyser node FFT, min 32
var TICK_FREQ = 20;     // how often to run the tick function, in milliseconds
var CIRCLES = 8;        // the number of circles to draw.  This is also the amount to break the files into, so FFTSIZE/2 needs to divide by this evenly
var RADIUS_FACTOR = 40; // the radius of the circles, factored for which ring we are drawing
var MIN_RADIUS = 1;     // the minimum radius of each circle
var HUE_VARIANCE = 120;  // amount hue can vary by
var COLOR_CHANGE_THRESHOLD = 20;    // amount of change before we change color
var WAVE_EMIT_THRESHOLD = 10;   // amount of positive change before we emit a wave
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
var songsPath = "songs/"; // Create a single item to load.
var src;
var songs = ["Binarpilot_-_Goof.mp3",
            "Binarpilot_-_Bend.mp3", "Binarpilot_-_aXXo.mp3", "Binarpilot_-_Tjaere_For_Alltid.mp3"];
var soundInstance;      // the sound instance we create
var analyserNode;       // the analyser node that allows us to visualize the audio
var freqFloatData, freqByteData, timeByteData;  // arrays to retrieve data from analyserNode
var mouthRectangles = {};       // object has of circles shapes
var leftEyeCircles = {};       // object has of circles shapes
var rightEyeCircles = {};       // object has of circles shapes
var leftEyeLaser;       // object has of circles shapes
var rightEyeLaser;       // object has of circles shapes
var circleHue = 300;   // the base color hue used when drawing circles, which can change
var circleFreqChunk;    // The chunk of freqByteData array that is computed per circle
var dataAverage = [42,42,42,42];   // an array recording data for the last 4 ticks
var waveImgs = []; // array of wave images with different stroke thicknesses

var EYES_SPEED = 0.1;
    eyesAngle = 0,
    eyesMoveDirection = 0;
    irisRadius = 0,
    eyesContainer = new createjs.Container();

var leftDown = false,
    rightDown = false;

var waves = [],
    wavesContainer = new createjs.Container();   // container to store waves we draw coming off of circles

var asteroids = [],
    asteroidsLine = [],
    asteroidsContainer = new createjs.Container();   // container to store waves we draw coming off of circles

var lineSide;

var score = 0,
    scoreField,
    lives = 3,
    livesField,
    hurt = false;

var mouthAttack = false,
    mouthCharge = 0,
    mouthField;

var state = "loading";


function init() {

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
    messageField = new createjs.Text("Loading Audio \n\n Yep, this can take some time...", "36px Tahoma", "#FFFFFF");
    messageField.maxWidth = w;
    messageField.textAlign = "center";  // NOTE this puts the registration point of the textField at the center
    messageField.x = centerX;
    messageField.y = centerY;
    stage.addChild(messageField);

    scoreField = new createjs.Text("Score: ", "24px Tahoma", "#FFFFFF");
    livesField = new createjs.Text("Lives: ", "24px Tahoma", "#FFFFFF");
    mouthField = new createjs.Text("Lives: ", "24px Tahoma", "#FFFFFF");
    scoreField.maxWidth = livesField.maxWidth = mouthField.maxWidth = 300;
    scoreField.textAlign = livesField.textAlign = mouthField.textAlign = "center";
    scoreField.y = livesField.y = 50;
    mouthField.y = h - 75;
    scoreField.x = 100; 
    livesField.x = w-100;
    mouthField.x = w/2;
    
    stage.update();     //update the stage to show text

    src = getParameterByName("s") || songsPath + songs[Math.floor(Math.random() * songs.length)];

    createjs.Sound.addEventListener("fileload", createjs.proxy(handleLoad,this)); // add an event listener for when load is completed
    createjs.Sound.registerSound(src);  // register sound, which preloads by default
    console.log("Loading", src);

    createjs.Sound.play("assets/onDestroy.mp3", {interrupt:createjs.Sound.INTERRUPT_ANY, volume:0});
    createjs.Sound.play("assets/onHit.mp3", {interrupt:createjs.Sound.INTERRUPT_ANY, volume:0});
    createjs.Sound.play("assets/onStart.mp3", {interrupt:createjs.Sound.INTERRUPT_ANY, volume:0});
    createjs.Sound.play("assets/onAttack.mp3", {interrupt:createjs.Sound.INTERRUPT_ANY, volume:0});

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
        messageField.text = "Touch to start \nand then to control the laser eyes\n and destroy the polygons!";
    } else {
        messageField.text = "Click to start\n\n Use the arrow keys to rotate the laser eyes\n and destroy the polygons!!";
    }
    stage.update();     //update the stage to show text

    // wrap our sound playing in a click event so we can be played on mobile devices
    stage.addEventListener("stagemousedown", onMouseDown);
    stage.addEventListener("stagemouseup", onMouseUp);

    window.onkeydown = onKeyDown;
    window.onkeyup = onKeyUp;

    createjs.Sound.play("assets/onStart.mp3", createjs.Sound.INTERRUPT_ANY);

    document.getElementById("header").style.display = "none";

    state = "loaded"
}

// this will start our playback in response to a user click, allowing this demo to work on mobile devices
function startPlayback() {
    if(soundInstance) {return;} // if this is defined, we've already started playing.  This is very unlikely to happen.
    
    restartGame();

    // start playing the sound we just loaded, looping indefinitely
    soundInstance = createjs.Sound.play(src);

    stage.addEventListener("dblclick", stopSound);

    // add containers to stage
    stage.addChild(wavesContainer);
    stage.addChild(asteroidsContainer);
    stage.addChild(eyesContainer);

    // create circles so they are persistent
    for(var i=0; i<CIRCLES; i++) {
        var circle = rightEyeCircles[i] = new createjs.Shape();
        // set the composite operation so we can blend our image colors
        circle.compositeOperation = "lighter";
        eyesContainer.addChild(circle);
    }
    for(var i=0; i<CIRCLES; i++) {
        var circle = leftEyeCircles[i] = new createjs.Shape();
        // set the composite operation so we can blend our image colors
        circle.compositeOperation = "lighter";
        eyesContainer.addChild(circle);
    }

    for(var i=0; i<CIRCLES; i++) {
        var rectangle = mouthRectangles[i] = new createjs.Shape();
        rectangle.compositeOperation = "lighter";
        eyesContainer.addChild(rectangle);
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

    if(i < CIRCLES - 1 && eyesAngle != 0 /*&& !hurt*/) {
        cx += (irisRadius-lastRadius)*Math.cos(eyesAngle);
        cy += (irisRadius-lastRadius)*Math.sin(eyesAngle);
    }


    var radius = (hurt) ? 10 : lastRadius;
    return new createjs.Graphics().beginFill(color).drawCircle(cx,cy, radius).endFill();
}

function getLaserGraphics(eye, lastRadius) {
    if(eyesAngle != 0) {
        var cx = faceCenterX + eye * 150;
        var cy = faceCenterY - 100;

        var laserLenght = w,
            laserDistortion = 0.05*(irisRadius/50);

        if(eyesMoveDirection == 0){
            laserDistortion = 0
        }
        
        var sx = cx+(irisRadius)*Math.cos(eyesAngle),
            sy = cy+(irisRadius)*Math.sin(eyesAngle),
            px = cx+laserLenght*Math.cos(eyesAngle),//+eyesMoveDirection*laserDistortion),
            py = cy+laserLenght*Math.sin(eyesAngle),//+eyesMoveDirection*laserDistortion),
            mx = cx+laserLenght*Math.cos(eyesAngle),
            my = cy+laserLenght*Math.sin(eyesAngle),
            fx = cx+laserLenght*Math.cos(eyesAngle),//+2*eyesMoveDirection*laserDistortion),
            fy = cy+laserLenght*Math.sin(eyesAngle);//+2*eyesMoveDirection*laserDistortion);

        var color = createjs.Graphics.getRGB(255, 75, 75, 200);
            
        var graphics = new createjs.Graphics();
        graphics.beginStroke(color);
        graphics.setStrokeStyle(2)
        graphics.moveTo(sx,sy);
        graphics.lineTo(fx,fy);
        graphics.setStrokeStyle(8)
        graphics.moveTo(sx,sy);
        graphics.lineTo(mx,my);
        graphics.setStrokeStyle(12)
        graphics.moveTo(sx,sy);
        graphics.lineTo(px,py);
        graphics.endStroke();

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
        
        var radius = (hurt) ? 10 : lastRadius;
        radius = (mouthAttack) ? radius * 7 : radius;
        var rectWidth = radius*1.5;
        var rectHeigth = radius*1.75;
        var rectRadius = rectWidth*100;
        var rectY = faceCenterY+100;
        rectY = (mouthAttack) ? rectY - radius : rectY;

        var g = new createjs.Graphics().beginFill(color).drawRoundRectComplex(faceCenterX-rectWidth/2,rectY, rectWidth,rectHeigth,rectRadius,rectRadius,0,0).endFill();
        mouthRectangles[i].graphics = g;
    }

    if(state === "game") {
        leftEyeLaser.graphics = getLaserGraphics(1,lastRadius);
        rightEyeLaser.graphics = getLaserGraphics(-1,lastRadius);
    }
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

    var shouldFilter = false;

    // -------------------------------------
    // ---------------WAVES-----------------
    // -------------------------------------
    if(dataDiff > WAVE_EMIT_THRESHOLD){ // emit a wave for large enough changes
        waves.push(new Wave({ circleHue: circleHue, dataDiff: dataDiff, lastRadius: lastRadius }));
    }

    var maxR = Math.sqrt(w*w+h*h)/2; // the maximum radius for the waves.
    shouldFilter = false
    for(var i = 0; i<waves.length; i++){
        waves[i].update(i, maxR);

        if(waves[i].destroyed) {
            shouldFilter = true;
        }
    }
    
    if(shouldFilter) {
        waves = waves.filter(function (element) {
            return !element.destroyed;
        });
    }

    // -------------------------------------
    // -------------ASTEROIDS---------------
    // -------------------------------------
    if(state === "game") {
    
        if(dataDiff > 10) {
            asteroids.push(new Asteroid(getNextAsteroid()));
        }
        
        shouldFilter = false
        for(var i = 0; i<asteroids.length; i++){
            asteroids[i].update(i);

            if(eyesAngle != 0 && (isPointInTriangle(-1, lastRadius, asteroids[i]) || isPointInTriangle(1, lastRadius, asteroids[i]))) {
                asteroids[i].hit = true;
                score += 1;
            }

            if(asteroids[i].destroyed) {
                shouldFilter = true;
            }
        }
        
        if(shouldFilter) {
            asteroids = asteroids.filter(function (element) {
                return !element.destroyed;
            });
        }

        if(lives < 1) {
            endGame();
        }
    }

    if(soundInstance.playState == "playFinished"){
        endGame();
    }

    eyesAngle += EYES_SPEED * eyesMoveDirection;

    scoreField.text = "Score: " + score;
    livesField.text = "Lives: " + lives;
    if(mouthCharge < 100) {
        mouthField.text = "Charging " + mouthCharge + "%";
    } else {
        if (createjs.Touch.enable(stage)) {
            mouthField.text = "Tap here to fire!!";
        } else {
            mouthField.text = "Press up or down to fire!!";
        }
    }
    
    mouthCharge++;

    // draw the updates to stage
    stage.update();
}

function endGame() {
    for(var i = 0; i<asteroids.length; i++){
        asteroidsContainer.removeChild(asteroids[i].shape);
    }
    asteroids = [];

    state = "end";

    stage.addChild(messageField);
    
    stage.removeChild(eyesContainer);
    stage.removeChild(leftEyeLaser);
    stage.removeChild(rightEyeLaser);


    messageField.text = "Your score was " + score + ".\n\nClick to restart!";
}

function restartGame() {
    if(!soundInstance || soundInstance.playState != "playFinished") {
        lineSide = getRandomInt(0,1);
        lives = 6;
        score = 0;
        state = "game";
        eyesAngle = 0;

        stage.addChild(livesField);
        stage.addChild(scoreField);
        stage.addChild(mouthField);

        stage.addChild(eyesContainer);
        stage.addChild(leftEyeLaser);
        stage.addChild(rightEyeLaser);

        // we're starting, so we can remove the message
        stage.removeChild(messageField);
    } else {
        location.reload(false);
    }
}

function getNextAsteroid() {
    if (asteroidsLine.length > 0) {
        return asteroidsLine.pop();
    } else {
        // Shall we change side?
        if(getRandomInt(0,3) == 0) {
            lineSide = (lineSide == 0) ? 1 : 0;
        }


        var lineHeight = getRandomInt(0,h);
        var lineCenter = getRandomInt(0,h);
        var lineElementsNumber = getRandomInt(3,8);
        var lineColor = createjs.Graphics.getHSL((lineElementsNumber-3)*50, 100, 50);

        for(var i=0; i<lineElementsNumber; i++){
            asteroidsLine.push({
                x: lineSide*w,
                y: (lineCenter-lineHeight/2)+i*(lineHeight/lineElementsNumber),
                sides: lineElementsNumber,
                color: lineColor
            });
        }

        return asteroidsLine.pop();
    }
}

function sign(p1x,p1y,p2x,p2y,p3x,p3y)
{
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
}

function isPointInTriangle(eye, lastRadius, asteroid)
{
    var ptx = asteroid.getX(),
        pty = asteroid.getY();

    var b1, b2, b3;
    var cx = faceCenterX + eye * 150;
    var cy = faceCenterY - 100;

    var laserLenght = w/2,
        laserDistortion = 0.1*(irisRadius/25);

    var v1x = cx+(irisRadius)*Math.cos(eyesAngle),
        v1y = cy+(irisRadius)*Math.sin(eyesAngle),
        v2x = cx+laserLenght*Math.cos(eyesAngle+laserDistortion),
        v2y = cy+laserLenght*Math.sin(eyesAngle+laserDistortion),
        v3x = cx+laserLenght*Math.cos(eyesAngle-laserDistortion),
        v3y = cy+laserLenght*Math.sin(eyesAngle-laserDistortion);

    b1 = sign(ptx,pty, v1x,v1y, v2x,v2y) < 0.0;
    b2 = sign(ptx,pty, v2x,v2y, v3x,v3y) < 0.0;
    b3 = sign(ptx,pty, v3x,v3y, v1x,v1y) < 0.0;

  return ((b1 == b2) && (b2 == b3));
}