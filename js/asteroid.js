var Asteroid = function(startX, startY) {
	var x = startX,
		y = startY,
		startX = startX,
		startY = startY,
		angle = -90,
		color = "#FFF", 
		sides = getRandomInt(3,6),
		radius = getRandomInt(5,10),
		speed = 0.005,
		shape = new createjs.Shape(),
		destroyed = false,
		id;

    shape.compositeOperation = "lighter";
    asteroidsContainer.addChild(shape);
	
	// Getters and setters
	var getX = function() {
		return x;
	};

	var getY = function() {
		return y;
	};

	var setX = function(newX) {
		x = newX;
	};

	var setY = function(newY) {
		y = newY;
	};

	var update = function(id) {
		var dx = centerX-x,
			dy = centerY-y,
			odx = centerX-startX,
			ody = centerY-startY;
		
		var distance = Math.sqrt(dx*dx+dy*dy);

		if(distance < 200){
			this.destroyed = true;
			return;
		}

		this.radius += 0.1;
		angle += 10;

		x = x + this.speed*odx;
		y = y + this.speed*ody;

		var graphics = new createjs.Graphics();
		graphics.beginFill(color).drawPolyStar(x, y, this.radius, this.sides, getRandomInt(0,1)*0.5, angle);

		this.shape.graphics = graphics;
	};

	// Define which variables and methods can be accessed
	return {
		getX: getX,
		getY: getY,
		setX: setX,
		setY: setY,
		sides: sides,
		radius: radius,
		speed: speed,
		shape: shape,
		update: update,
		destroyed: destroyed,
		id: id
	}
};