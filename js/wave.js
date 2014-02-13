var Wave = function(details) {
    var getWaveImg = function (thickness, color) {
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

	var destroyed = false;

	var color = createjs.Graphics.getHSL(getRandomInt(0, 255), 100, 50);

    var thickness = (details.dataDiff*0.1+1)*WAVE_THICKNESS;
    thickness |= 0;

    // create the wave, and center it on screen:
    var shape = new createjs.Bitmap(getWaveImg(thickness, color));
    shape.x = faceCenterX;
    shape.y = faceCenterY;
    shape.regX = shape.regY = WAVE_RADIUS + thickness;
    
    // set the expansion speed as a factor of the value difference:
    shape.speed = (details.dataDiff*0.1+1)/WAVE_SPEED;
    
    // set the initial scale:
    shape.scaleX = shape.scaleY = details.lastRadius/WAVE_RADIUS;

    // add new wave to our waves container
    wavesContainer.addChild(shape);

	var update = function(id, maxR) {
        // animate all of our waves by scaling them up by a fixed about
		this.shape.scaleX = this.shape.scaleY = this.shape.scaleX+this.shape.speed*0.02;

        // check if it is offstage and therefore not visible, if so remove it
        if(this.shape.scaleX*WAVE_RADIUS > maxR) {
            this.destroyed = true;
            wavesContainer.removeChild(this.shape);
        }
	};

	// Define which variables and methods can be accessed
	return {
		shape: shape,
		update: update,
		destroyed: destroyed
	}
};