var Asteroid = function(details) {
	var x = details.x,
		y = details.y,
		startX = x,
		startY = y,
		angle = -90,
		sides = details.sides,
		color = details.color, 
		radius = getRandomInt(10,20),
		speed = 0.015,
		shape = new createjs.Shape(),
		destroyed = false,
		hit = false,
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
			createjs.Sound.play("assets/onDestroy.mp3", createjs.Sound.INTERRUPT_ANY);
      asteroidsContainer.removeChild(this.shape);
      if(!hurt) {
	      lives -= 1;
	      hurt = true;
	      setTimeout(function() {
	      	hurt = false;
	      }, 500);
      }
			return;
		}
		

		if(this.radius < 1){
			this.destroyed = true;
			createjs.Sound.play("assets/onHit.mp3", {interrupt: createjs.Sound.INTERRUPT_ANY, volume: 0.05});
      asteroidsContainer.removeChild(this.shape);
			return;
		}

		if(mouthAttack) {
			this.hit = true;
		}

		if(this.hit) {
			this.radius -= 2;
		} else if(distance < 250) {
			this.radius += 10;
		} else {
			this.radius += 0.1;
		}


		angle += 10;

		x = x + this.speed*odx;
		y = y + this.speed*ody;

		var graphics = new createjs.Graphics();
		graphics.beginFill(color).drawPolyStar(x, y, this.radius, this.sides, 0, angle);

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
		hit: hit,
		id: id
	}
};