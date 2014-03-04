var wentUpAfterEnd = false;

function onKeyDown(evt) {
    if(!soundInstance) { 
        startPlayback();
        state = "game";
        return;
    }

    if(state === "end" && wentUpAfterEnd) {
        restartGame();
        wentUpAfterEnd = false;
    }

    if(evt.keyCode == 39 || evt.keyCode == 65){
        eyesMoveDirection = -1;
        rightDown = true;
    } else if(evt.keyCode == 37 || evt.keyCode == 68){
        if(eyesAngle == 0) { eyesAngle = 3.14; }
        eyesMoveDirection = +1;
        leftDown = true;
    } else if(evt.keyCode == 32){
        //stopSound();
        //if(wavesContainer.children.length > 0) {
        //    setTimeout(startSound,500); 
        //} else {
        //    startSound();
        //}
        if(!mouthAttack && !hurt) {
            createjs.Sound.play("assets/onAttack.mp3", {interrupt: createjs.Sound.INTERRUPT_ANY, volume: 20});

            mouthAttack = true;
            setTimeout(function() {
                mouthAttack = false;
            }, 500);
        }
    } else if(evt.keyCode == 27){
        location.reload(false);
    }
}

function onKeyUp(evt){
    eyesMoveDirection = 0;

    if(state === "end"){
        wentUpAfterEnd = true;
    }

    // Right key
    if(evt.keyCode == 39 || evt.keyCode == 65){
        rightDown = false;

        if(leftDown) {
            eyesMoveDirection = +1;
        }
    }
    // Left key
    else if(evt.keyCode == 37 || evt.keyCode == 68){
        leftDown = false;

        if(rightDown) {
            eyesMoveDirection = -1;
        }
    }
}

function onMouseDown(evt){
    if(!soundInstance) { 
        startPlayback();
        state = "game";
        return;
    }

    if(state == "end") {
        restartGame();
    }

    if(evt.stageX > 2*w/3) {
        eyesMoveDirection = -1;
        rightDown = true;
    } else if(evt.stageX < w/3) {
        if(eyesAngle == 0) { eyesAngle = 3.14; }
        eyesMoveDirection = +1;
        leftDown = true;
    } else {
        if(!mouthAttack && !hurt) {
            createjs.Sound.play("assets/onAttack.mp3", {interrupt: createjs.Sound.INTERRUPT_ANY, volume: 20});

            mouthAttack = true;
            setTimeout(function() {
                mouthAttack = false;
            }, 500);
        }
    }
}

function onMouseUp(evt){
    eyesMoveDirection = 0;

    if(evt.stageX > centerX){
        rightDown = false;

        if(leftDown) {
            eyesMoveDirection = +1;
        }
    } else {
        leftDown = false;

        if(rightDown) {
            eyesMoveDirection = -1;
        }
    }
}