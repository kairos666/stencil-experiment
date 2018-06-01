import { Component, State, Prop, Element } from '@stencil/core';

@Component({
  tag: 'waf-arkanoid',
  styleUrl: 'waf-arkanoid.scss'
})
export class WafArkanoid {
    @Prop() paddlePosition:number = 0.5;
    @Prop() width:number;
    @Prop() height:number;
    @State() model:any;
    @Element() private akElt:HTMLElement;
    private akCanvasCtx:CanvasRenderingContext2D;
    static config:any = {
        bricks: {  
            brickPerRowCount: 10, 
            rowCount: 6, 
            sideSpace: 20, 
            brickHeight: 10, 
            brickGutter: 5,
            brickColor: '#0093e0'
        },
        paddle: {
            paddleWidth: 100,
            paddleHeight: 10,
            paddleColor: '#0093e0',
            bottomMargin: 20
        },
        ball: {
            initialSpeed: 0.1,
            acceleration: 0.00001,
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
            
            // collision detection --> movement prediction
            this.model = this.update(this.model, dt);

            // draw game state
            this.drawModel(this.model);
        }

        requestAnimationFrame(this.drawLoop.bind(this));
    }

    private update(model, dt) {
        // future position
        let pos = this.accelerate(model.ball.x, model.ball.y, model.ball.dx, model.ball.dy, model.ball.accel ,dt);
        let pt;
        // collision detection - side walls
        pos = this.sideCollision(pos, model, this.width, this.height);
        // collision detection - bricks
        pt = this.bricksCollision();
        // collision detection - paddle
        pt = this.paddleCollision(pos, model);

        // collision occured - react
        if(pt) {
            switch(pt.d) {
                case 'left':
                case 'right':
                    pos.x = pt.x;
                    pos.dx = -pos.dx;
                    break;
                case 'top':
                case 'bottom':
                    pos.y = pt.y;
                    pos.dy = -pos.dy;
                    break;
            }
        }

        // merge pos into model
        model.ball = Object.assign(model.ball, pos);
        
        return model;
    }

    private sideCollision(initialPos, model, width, height) {
        const pos = Object.assign({}, initialPos);
        const radius = model.ball.radius;
        const bottomThreshold = height;
        const topThreshold = WafArkanoid.config.bricks.sideSpace + radius;
        const leftThreshold = WafArkanoid.config.bricks.sideSpace + radius;
        const rightThreshold = width - WafArkanoid.config.bricks.sideSpace - radius;

        // top 
        if ((pos.dy < 0) && (pos.y < topThreshold)) {
            pos.dy = -pos.dy; 
            pos.y = topThreshold;
        }
        // bottom (game over) 
        if ((pos.dy > 0) && (pos.y > bottomThreshold)) {
            pos.dy = -pos.dy;
            pos.y = bottomThreshold;
        }
        // left 
        if ((pos.dx < 0) && (pos.x < leftThreshold)) {
            pos.dx = -pos.dx; 
            pos.x = leftThreshold;
        }
        // right 
        if ((pos.dx) > 0 && (pos.x > rightThreshold)) {
            pos.dx = -pos.dx; 
            pos.x = rightThreshold;
        }

        return pos;
    }

    private bricksCollision() {}

    private paddleCollision(pos, model) {
        return this.ballIntercept(model.ball, model.paddle, pos.nx, pos.ny);
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
            color: config.paddleColor
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