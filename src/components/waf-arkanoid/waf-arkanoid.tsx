import { Component, Prop, State, Element, Watch } from '@stencil/core';

@Component({
  tag: 'waf-arkanoid',
  styleUrl: 'waf-arkanoid.scss'
})
export class WafArkanoid {
    @Prop({ mutable: true, reflectToAttr: true }) paddlePosition:number = 0.5;
    @Prop() width:number;
    @Prop() height:number;
    @Prop() activateKeyboardControls:boolean;
    @Prop() activateMouseControls:boolean;
    @Prop() activateFaceControls:boolean;
    @State() private isPaused:boolean = true;
    @State() private isGameOver:boolean = true;
    private model:any;
    private faceDetectLimiterActive:boolean = false;
    @Element() private akElt:HTMLElement;
    private akCanvasCtx:CanvasRenderingContext2D;
    private collisionDetectionLoopCount:number = 0;
    private configURL:string = `${location.origin}/assets/arkanoid-config.json`;
    private config:any;
    private player:PlayerGame;

    render() {
        const menuRenderer = () => {
            let result = null;

            if (this.isPaused) {
                // need game menu
                result = (
                    <div class="waf-arkanoid-menu waf-arkanoid-menu--initial">
                        <header>{this.isGameOver ? 'You failed!' : 'Start game!'}<br/>Level {this.player ? this.player.status.level : '1'}<br/>Score {this.player ? this.player.status.score : '0'}, Lives {this.player ? this.player.status.lives : '3'}</header>
                        <button type="button" onClick={() => this.start()} class="button-stylish">{this.isGameOver ? 'restart game' : 'start game!'}</button>
                    </div>
                )
            }

            return result;
        }

        return [
            <canvas class="arkanoid" width={this.width} height={this.height} />,
            menuRenderer()
        ]
    }

    @Watch('paddlePosition')
    paddlePositionHandler(newValue) {
        // enforce boundaries
        let newPositionRatio = (newValue < 0) 
        ? 0
        : (newValue > 1)
        ? 1
        : newValue;

        // time for tween
        const from = this.model.paddle.x;
        const to = this.paddlePositionConverter(newPositionRatio);
        let transitionTime = Math.abs(from - to)/this.width * this.config.paddle.maxTweenDelay;

        // convert to position & apply to model
        this.model.paddle.tween = { from: from, to: to, elapsedTime: 0, totalTime: transitionTime };
    }

    async componentDidLoad() {
        // load game config json
        const configResp:Response = await fetch(this.configURL);
        const configJSON:Promise<any> = configResp.json();
        configJSON.then(config => {
            // successfully loaded game config
            this.config = config;
            this.player = new PlayerGame(this.config.game.levels, this.config.game.score, this.config.game.lives, this.gameover.bind(this));

            // init
            this.gameInitModel();

            // controls setup
            if (this.activateKeyboardControls) this.setupControls('keyboard');
            if (this.activateMouseControls) this.setupControls('mouse');
            if (this.activateFaceControls) this.setupControls('face-detect');

            // get canvas element
            this.akCanvasCtx = (this.akElt.querySelector('canvas.arkanoid') as HTMLCanvasElement).getContext('2d');
            
            // init game
            this.drawLoop();
        }).catch(() => {
            // failed to load game config
            console.warn('waf-arkanoid | config file couldn\'t be loaded or parsed');
        });
    }

    @Watch('activateKeyboardControls')
    updateKeyboardCtrlState(isActive:boolean) {
        // keyboard controls setup or destroy
        if (isActive) {
            this.setupControls('keyboard');
        } else {
            this.setupControls('keyboard', true);
        }
    }
    @Watch('activateMouseControls')
    updateMouseCtrlState(isActive:boolean) {
        // mouse controls setup or destroy
        if (isActive) {
            this.setupControls('mouse');
        } else {
            this.setupControls('mouse', true);
        }
    }
    @Watch('activateFaceControls')
    updateFaceCtrlState(isActive:boolean) {
        // mouse controls setup or destroy
        if (isActive) {
            this.setupControls('face-detect');
        } else {
            this.setupControls('face-detect', true);
        }
    }

    componentDidUnload() {
        // controls destroy
        this.setupControls('keyboard', true);
        this.setupControls('mouse', true);
        this.setupControls('face-detect', true);
    }

    private drawLoop(DHRTimeStamp?:number) {
        if (!this.isPaused) {
            // calculate elapsed time
            const dt:number = this.elapsedTime(DHRTimeStamp);
            
            // collision detection & applied acceleration
            this.model = this.update(dt);

            // draw game state
            this.drawModel(this.model);
        }

        // allow face detection input to pass 
        this.faceDetectLimiterActive = false;

        // recursively call itself at each animation frame
        requestAnimationFrame(this.drawLoop.bind(this));
    }

    private update(dt) {    
        // collision detection & reaction
        const newModel = Object.assign({}, this.model);

        // update paddlePosition
        if (newModel.paddle.tween.elapsedTime < newModel.paddle.tween.totalTime) {
            // paddle will move
            newModel.paddle = this.paddleTweener(dt, Object.assign({}, newModel.paddle));
        }

        return this.collisionHandler(dt, newModel);
    }

    private paddleTweener(dt, paddle) {
        function easeInOutQuad(t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t }
        const pTween = paddle.tween;

        // update time trackers
        pTween.elapsedTime += dt;
        if (pTween.elapsedTime > pTween.totalTime) pTween.elapsedTime = pTween.totalTime;
        pTween.remainingTime -= dt;
        if (pTween.remainingTime < 0) pTween.elapsedTime = 0;

        // find current position
        const timeRatio = pTween.elapsedTime / pTween.totalTime;
        const positionRatio = easeInOutQuad(timeRatio);
        paddle.x = pTween.from + positionRatio * (pTween.to - pTween.from);

        return paddle;
    }

    private collisionHandler(dt, model) {
        let updatedModel = Object.assign({}, model);
        let ball = Object.assign({}, updatedModel.ball);
        let pos = this.accelerate(ball.x, ball.y, ball.dx, ball.dy, ball.accel ,dt);
        let magnitude = function(x, y) {
            return Math.sqrt(x*x + y*y);
        }
        let collisionObjectsBuilder = model => {
            // get all valid bricks
            let collisionObjects = model.bricks.filter(brick => (brick.hitCount > 0));
            // add paddle
            collisionObjects.push(Object.assign({ type: 'paddle' }, model.paddle));
            // add walls
            const leftWallRect = { type: 'no-brick', x: -this.config.bricks.sideSpace, y: 0, width: this.config.bricks.sideSpace, height: this.height };
            const rightWallRect = { type: 'no-brick', x: this.width, y: 0, width: this.config.bricks.sideSpace, height: this.height };
            const topWallRect = { type: 'no-brick', x: 0, y: -this.config.bricks.sideSpace, width: this.width, height: this.config.bricks.sideSpace };
            collisionObjects.push(leftWallRect, rightWallRect, topWallRect);

            return collisionObjects;
        }
        const collisionObjects = collisionObjectsBuilder(updatedModel);
        let closest = { obstacle: null, point: null, distance: Infinity };
        let distance;

        // look for closest collision
        collisionObjects.forEach(obstacle => {
            let px = this.ballIntercept(ball, obstacle, pos.nx, pos.ny);
            if (px) {
                distance = magnitude(px.x - obstacle.x, px.y - obstacle.y);
                if (distance < closest.distance) {
                    closest = { obstacle: obstacle, point: px, distance: distance};
                }
            }
        });

        // loop count check (avoid ball being stuck in an infinte loop of collision)
        this.collisionDetectionLoopCount++;
        if (this.collisionDetectionLoopCount > this.config.game.collisionDetectionLoopMaxCount) {
            // too much loops - force end game
            this.pause();
            this.player.die();
            // erase collision point to break free of loops
            closest.point = null;
        }

        if(closest.point) {
            // react to closest collision
            pos.x = closest.point.x;
            pos.y = closest.point.y;
            switch(closest.point.d) {
                case 'left':
                case 'right':
                    pos.dx = -pos.dx;
                    break;
                
                case 'top':
                case 'bottom':
                    pos.dy = -pos.dy;
                    break;
            }

            // change slightly ball spin if hitting paddle
            if (closest.obstacle.type === 'paddle' && closest.point.d === 'top') {
                const paddleHitRatio = Math.max(Math.min((closest.point.x - closest.obstacle.x) / closest.obstacle.width, 1), 0) - 0.5;
                
                // impact ball spin
                pos.dx += paddleHitRatio * this.config.paddle.spinImpact;
                
                this.model.sounds.paddle.play();
            }

            // update hit count, color and score when hitting a brick
            if (closest.obstacle.hitCount) {
                this.model.sounds.brick.play();
                closest.obstacle.hitCount--;
                this.player.scoreUpdate();
                closest.obstacle.color = this.config.bricks.brickColor[closest.obstacle.hitCount - 1];
            }

            // collision happened - how far along did we get before intercept ?
            let udt = dt * (closest.distance / magnitude(pos.nx, pos.ny)) / 1000;

            // update ball properties
            updatedModel.ball = Object.assign(updatedModel.ball, pos);
            // update bricks (remove 'no-brick' items: paddle & walls)
            updatedModel.bricks = collisionObjects.filter(obs => (!obs.type || obs.type !== 'no-brick' || obs.type !== 'paddle' || obs.type !== 'game-over'));

            // next level if no more bricks in level
            if (updatedModel.bricks.filter(obj => (obj.type === 'brick' && obj.hitCount > 0)).length === 0) {
                this.pause();
                this.player.levelUp();
                return updatedModel;
            }

            // loop on collision detection
            return this.collisionHandler(dt - udt, model);
        } else {
            // update ball properties
            updatedModel.ball = Object.assign(updatedModel.ball, pos);

            // GAME over (when ball disappear at the bottom)
            if (updatedModel.ball.y >= this.height) {
                this.pause();
                this.player.die();
            }

            // breaking out of collision detection loop --> reset loop counter
            this.collisionDetectionLoopCount = 0;

            // no collision - ball moved normally
            return updatedModel;
        }
        
    }

    private drawModel(model) {
        const ctx = this.akCanvasCtx;
        const paddle = model.paddle;
        const ball = model.ball;

        // clear canvas
        ctx.clearRect(0, 0, this.width, this.height);

        // draw - bricks
        model.bricks.forEach(brickData => {
            if (brickData.hitCount > 0) {
                ctx.beginPath(); 
                ctx.rect(brickData.x, brickData.y, brickData.width, brickData.height); 
                ctx.fillStyle = brickData.color; 
                ctx.fill(); 
                ctx.closePath(); 
            }
        });

        // draw - paddle
        ctx.beginPath(); 
        ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height); 
        ctx.fillStyle = paddle.color; 
        ctx.fill(); 
        ctx.closePath(); 

        // draw - ball
        ctx.beginPath(); 
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2); 
        ctx.fillStyle = ball.color; 
        ctx.fill(); 
        ctx.closePath(); 
    }

    private paddlePositionConverter(ratio) {
        // convert position ratio to x position on canvas
        const maxLeftX = this.config.bricks.sideSpace;
        const maxRightX = this.width - this.config.bricks.sideSpace - this.config.paddle.paddleWidth;
        return maxLeftX + ratio * (maxRightX - maxLeftX);
    }

    private elapsedTime(DHRTimeStamp:number) {
        let result:number = 0;
        const previousDHRTimeStamp = this.model.game.lastFrame;

        // register
        this.model.game.lastFrame = DHRTimeStamp;

        if (previousDHRTimeStamp) result = DHRTimeStamp - previousDHRTimeStamp;

        return result;
    }

    private generateBricksModel(configBrick, levelBluePrint, canvasWidth) {
        const config = Object.assign({}, configBrick);
        const brickPerRowCount = levelBluePrint[0].length;
        const brickWidth = (canvasWidth - config.sideSpace * 2 - config.brickGutter * (brickPerRowCount - 1)) / brickPerRowCount; 
        const bricksBluePrint = levelBluePrint.map((_itemRow, i) => {
            return _itemRow.map((_itemColumn, j) => {
                return {
                    x: config.sideSpace + j * (brickWidth + config.brickGutter), 
                    y: config.sideSpace + i * (config.brickHeight + config.brickGutter), 
                    width: brickWidth, 
                    height: config.brickHeight, 
                    color: config.brickColor[_itemColumn - 1], 
                    hitCount: _itemColumn,
                    type: 'brick'
                }
            });
        });

        return [].concat.apply([], bricksBluePrint).filter(brick => (brick.hitCount > 0));
    }

    private generatePaddleModel(configPaddle, canvasHeight) {
        const config = Object.assign({}, configPaddle);
        return { 
            x: this.paddlePositionConverter(this.paddlePosition), 
            y: canvasHeight - config.bottomMargin - config.paddleHeight, 
            width: config.paddleWidth , 
            height: config.paddleHeight, 
            color: config.paddleColor,
            tween: { from: this.paddlePositionConverter(this.paddlePosition), to: this.paddlePositionConverter(this.paddlePosition), elapsedTime: 0, totalTime: 0 }
        } 
    }

    private generateBallModel(configBall, paddleModel) {
        const config = Object.assign({}, configBall);
        return { 
            x: paddleModel.x + paddleModel.width / 2, 
            y: paddleModel.y - config.ballRadius, 
            dx: config.initialSpeed, 
            dy: -config.initialSpeed, 
            accel: config.acceleration,
            radius: config.ballRadius, 
            color: config.ballColor
        };
    }

    private gameInitModel() {
        const model = {
            bricks: null,
            paddle: null,
            ball: null,
            sounds: {
                brick: (this.model) ? this.model.sounds.brick : new Audio(`${location.origin}${this.config.sounds.brick}`),
                paddle: (this.model) ? this.model.sounds.paddle : new Audio(`${location.origin}${this.config.sounds.paddle}`),
                gameover: (this.model) ? this.model.sounds.gameover : new Audio(`${location.origin}${this.config.sounds.gameover}`)
            },
            game: Object.assign({}, this.config.game)
        };

        // generate model - bricks
        model.bricks = this.generateBricksModel(this.config.bricks, this.config.levels[this.player.status.level - 1], this.width);
        // generate model - paddle
        model.paddle = this.generatePaddleModel(this.config.paddle, this.height);
        // generate model - ball
        model.ball = this.generateBallModel(this.config.ball, model.paddle);
        
        this.model = model;
    }

    private setupControls(controlType:'keyboard'|'mouse'|'face-detect', destroy:boolean = false) {
        const keyboardHandler = (evt:KeyboardEvent) => {
            switch(evt.which) {
                case 37:
                    // left
                    this.paddlePosition = (this.paddlePosition - 0.05 > 0) ? this.paddlePosition - 0.05 : 0;
                break;
                case 39:
                    // right
                    this.paddlePosition = (this.paddlePosition + 0.05 < 1) ? this.paddlePosition + 0.05 : 1;
                break;
            }
        }
        const mouseHandler = (evt:MouseEvent) => {
            const posRatio = evt.pageX / document.body.offsetWidth;
            this.paddlePosition = posRatio;
        }
        const faceDetectHandler = (evt:CustomEvent) => {
            if (!this.faceDetectLimiterActive && evt.detail.length > 0) {
                const sideMargins = this.config.faceDetect.detectSideMargins; // allow to go all the way left or right
                const jitterThreshold = this.config.faceDetect.jitterThreshold; // smooth jitter from detection jumps
                const detection = Object.assign({}, evt.detail[0]); // ignoring other detected faces
                const offsettedX = Math.max(detection.x - sideMargins, 0);
                const posRatio = 1 - Math.min(offsettedX / (this.width - 2 * sideMargins), 1);
                if (Math.abs(this.paddlePosition - posRatio) > jitterThreshold) {
                    // update position and limit face detection input until next frame
                    this.faceDetectLimiterActive = true;
                    this.paddlePosition = posRatio;
                }
            }
        }

        // setup keyboard
        if (controlType === 'keyboard' && !destroy) document.addEventListener('keydown', keyboardHandler);
        // setup mouse
        if (controlType === 'mouse' && !destroy) document.body.addEventListener('mousemove', mouseHandler);
        // setup face detect
        if (controlType === 'face-detect' && !destroy) this.akElt.parentElement.addEventListener('waf.face-detector.detected', faceDetectHandler);
        // destroy keyboard controls
        if (controlType === 'keyboard' && destroy) document.removeEventListener('keydown', keyboardHandler);
        // destroy mouse controls
        if (controlType === 'mouse' && destroy) document.body.removeEventListener('mousemove', mouseHandler);
        // face detect controls
        if (controlType === 'face-detect' && destroy) this.akElt.parentElement.removeEventListener('waf.face-detector.detected', faceDetectHandler);
    }

    private accelerate(x, y, dx, dy, accel, dt) {
        let x2  = x + (dt * dx) + (accel * dt * dt * 0.5);
        let y2  = y + (dt * dy) + (accel * dt * dt * 0.5);
        let dx2 = dx + (accel * dt) * (dx > 0 ? 1 : -1);
        let dy2 = dy + (accel * dt) * (dy > 0 ? 1 : -1);
        return { nx: (x2-x), ny: (y2-y), x: x2, y: y2, dx: dx2, dy: dy2 };
    }

    private intercept(x1, y1, x2, y2, x3, y3, x4, y4, d) {
        let denom = ((y4-y3) * (x2-x1)) - ((x4-x3) * (y2-y1));
        if (denom != 0) {
            let ua = (((x4-x3) * (y1-y3)) - ((y4-y3) * (x1-x3))) / denom;
            if ((ua >= 0) && (ua <= 1)) {
                let ub = (((x2-x1) * (y1-y3)) - ((y2-y1) * (x1-x3))) / denom;
                if ((ub >= 0) && (ub <= 1)) {
                    let x = x1 + (ua * (x2-x1));
                    let y = y1 + (ua * (y2-y1));
                    return { x: x, y: y, d: d};
                }
            }
        }
        return null;
    }

    private ballIntercept(ball, rect, nx, ny) {
        const top = rect.y - ball.radius;
        const bottom = rect.y + rect.height + ball.radius;
        const left = rect.x - ball.radius;
        const right = rect.x + rect.width + ball.radius;
        let pt;
        if (nx < 0) {
          pt = this.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny, 
            right,
            top,
            right,
            bottom,
            "right");
        }
        else if (nx > 0) {
          pt = this.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
            left,
            top,
            left,
            bottom,
            "left");
        }
        if (!pt) {
          if (ny < 0) {
            pt = this.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
            left,
            bottom,
            right,
            bottom,
            "bottom");
          }
          else if (ny > 0) {
            pt = this.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
            left,
            top,
            right,
            top,
            "top");
          }
        }
        return pt;
    }

    private pause() {
        this.isPaused = true;
    }

    private gameover() {
        this.isGameOver = true;
        this.model.sounds.gameover.play();
    }

    public start() {
        this.gameInitModel();
        this.isPaused = false;
        this.isGameOver = false;
    }
}

class PlayerGame {
    private level:number;
    private score:number;
    private lives:number;
    private initialConfig;
    private cb:Function;

    constructor(level:number = 1, score:number = 0, lives:number = 3, gameoverCallback:Function) {
        this.initialConfig = {};
        this.level = this.initialConfig.level = level;
        this.score = this.initialConfig.score = score;
        this.lives = this.initialConfig.lives = lives;
        this.cb = gameoverCallback;
    }

    public levelUp() {
        this.level++;
        return this.status;
    }
    public die() {
        this.lives--;
        if (this.lives <= 0) this.cb(this.status);
        return this.status;
    }
    public scoreUpdate(amount:number = 1) {
        this.score += amount;
        return this.status;
    }
    public reset() {
        this.level = this.initialConfig.level;
        this.score = this.initialConfig.score;
        this.lives = this.initialConfig.lives;
        return this.status;
    }
    public get status() {
        return {
            level: this.level,
            score: this.score,
            lives: this.lives
        }
    }
}