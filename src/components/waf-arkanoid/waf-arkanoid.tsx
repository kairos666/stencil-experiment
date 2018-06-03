import { Component, Prop, Element, Watch } from '@stencil/core';

@Component({
  tag: 'waf-arkanoid',
  styleUrl: 'waf-arkanoid.scss'
})
export class WafArkanoid {
    @Prop() paddlePosition:number = 0.5;
    @Prop() width:number;
    @Prop() height:number;
    private model:any;
    @Element() private akElt:HTMLElement;
    private akCanvasCtx:CanvasRenderingContext2D;
    static config:any = {
        bricks: {  
            brickPerRowCount: 10, 
            rowCount: 6, 
            sideSpace: 20, 
            brickHeight: 10, 
            brickGutter: 2,
            brickColor: '#0093e0'
        },
        paddle: {
            paddleWidth: 100,
            paddleHeight: 10,
            paddleColor: '#0093e0',
            bottomMargin: 20,
            maxTweenDelay: 1000,
            spinImpact: 0.2
        },
        ball: {
            initialSpeed: 0.1,
            acceleration: 0.0000015,
            ballRadius: 10,
            ballColor: '#0093e0'
        },
        game: {
            isPaused: false,
            lastFrame: null
        }
    }

    render() {
        return (<canvas class="arkanoid" width={this.width} height={this.height} />)
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
        let transitionTime = Math.abs(from - to)/this.width * WafArkanoid.config.paddle.maxTweenDelay;

        // convert to position & apply to model
        this.model.paddle.tween = { from: from, to: to, elapsedTime: 0, totalTime: transitionTime };
    }

    componentWillLoad() {
        const model = {
            bricks: null,
            paddle: null,
            ball: null,
            game: WafArkanoid.config.game
        };

        // generate model - bricks
        model.bricks = this.generateBricksModel(WafArkanoid.config.bricks, this.width);
        // generate model - paddle
        model.paddle = this.generatePaddleModel(WafArkanoid.config.paddle, this.height);
        // generate model - ball
        model.ball = this.generateBallModel(WafArkanoid.config.ball, model.paddle);
        
        this.model = model;
    }

    componentDidLoad() {
        // get canvas element
        this.akCanvasCtx = (this.akElt.querySelector('canvas.arkanoid') as HTMLCanvasElement).getContext('2d');
        
        // init game
        this.drawLoop();
    }

    private drawLoop(DHRTimeStamp?:number) {
        if (!this.model.game.isPaused) {
            // calculate elapsed time
            const dt:number = this.elapsedTime(DHRTimeStamp);
            
            // collision detection & applied acceleration
            this.model = this.update(dt);

            // draw game state
            this.drawModel(this.model);
        }

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
            const leftWallRect = { type: 'no-brick', x: -WafArkanoid.config.bricks.sideSpace, y: 0, width: WafArkanoid.config.bricks.sideSpace, height: this.height };
            const rightWallRect = { type: 'no-brick', x: this.width, y: 0, width: WafArkanoid.config.bricks.sideSpace, height: this.height };
            const topWallRect = { type: 'no-brick', x: 0, y: -WafArkanoid.config.bricks.sideSpace, width: this.width, height: WafArkanoid.config.bricks.sideSpace };
            const bottomWallRect = { type: 'no-brick', x: 0, y: this.height, width: this.width, height: WafArkanoid.config.bricks.sideSpace };
            collisionObjects.push(leftWallRect, rightWallRect, topWallRect, bottomWallRect);

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
                pos.dx += paddleHitRatio * WafArkanoid.config.paddle.spinImpact; 
            }

            // update hit count when hitting a brick
            if (closest.obstacle.hitCount) closest.obstacle.hitCount--;

            // collision happened - how far along did we get before intercept ?
            let udt = dt * (closest.distance / magnitude(pos.nx, pos.ny)) / 1000;

            // update ball properties
            updatedModel.ball = Object.assign(updatedModel.ball, pos);
            // update bricks (remove 'no-brick' items: paddle & walls)
            updatedModel.bricks = collisionObjects.filter(obs => (!obs.type || obs.type !== 'no-brick' || obs.type !== 'paddle'));

            // loop on collision detection
            return this.collisionHandler(dt - udt, model);
        } else {
            // update ball properties
            updatedModel.ball = Object.assign(updatedModel.ball, pos);

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
        const maxLeftX = WafArkanoid.config.bricks.sideSpace;
        const maxRightX = this.width - WafArkanoid.config.bricks.sideSpace - WafArkanoid.config.paddle.paddleWidth;
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

    private generateBricksModel(config, canvasWidth) {
        const brickWidth = (canvasWidth - config.sideSpace * 2 - config.brickGutter * (config.brickPerRowCount - 1)) / config.brickPerRowCount; 
        const bricksBluePrint = Array(config.rowCount).fill('fake').map((_itemRow, i) => { 
            return Array(config.brickPerRowCount).fill('fake').map((_itemColumn, j) => { 
                return { 
                    x: config.sideSpace + j * (brickWidth + config.brickGutter), 
                    y: config.sideSpace + i * (config.brickHeight + config.brickGutter), 
                    width: brickWidth, 
                    height: config.brickHeight, 
                    color: config.brickColor, 
                    hitCount: 1 
                } 
            }) 
        }); 

        return [].concat.apply([], bricksBluePrint);
    }

    private generatePaddleModel(config, canvasHeight) {
        return { 
            x: this.paddlePositionConverter(this.paddlePosition), 
            y: canvasHeight - config.bottomMargin - config.paddleHeight, 
            width: config.paddleWidth , 
            height: config.paddleHeight, 
            color: config.paddleColor,
            tween: { from: this.paddlePositionConverter(this.paddlePosition), to: this.paddlePositionConverter(this.paddlePosition), elapsedTime: 0, totalTime: 0 }
        } 
    }

    private generateBallModel(config, paddleModel) {
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
}