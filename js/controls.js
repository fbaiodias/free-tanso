function onKeyDown(evt) {
    if(!soundInstance) { 
        startPlayback();
        state = "game";
        return;
    }

    if(evt.keyCode == 39 || evt.keyCode == 65){
        eyesMoveDirection = -1;
        rightDown = true;
    } else if(evt.keyCode == 37 || evt.keyCode == 68){
        if(eyesAngle == 0) { eyesAngle = 3.14; }
        eyesMoveDirection = +1;
        leftDown = true;
    } else if(evt.keyCode == 32){
        stopSound();
        if(wavesContainer.children.length > 0) {
            setTimeout(startSound,500); 
        } else {
            startSound();
        }
    } else if(evt.keyCode == 27){
        location.reload(false);
    }
}

function onKeyUp(evt){
    eyesMoveDirection = 0;

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

    if(evt.stageX > centerX){
        eyesMoveDirection = -1;
        rightDown = true;
    } else {
        if(eyesAngle == 0) { eyesAngle = 3.14; }
        eyesMoveDirection = +1;
        leftDown = true;
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