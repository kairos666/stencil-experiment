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
            initialSpeed: 2,
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
            this.update(this.model, dt);

            // draw game state
            this.drawModel(this.model);
        }

        requestAnimationFrame(this.drawLoop.bind(this));
    }

    private update(model, dt) {
        // collision detection - side walls
        this.sideCollision(model, dt);
        // collision detection - bricks
        // collision detection - paddle
        // collision detection - pit (game over)
    }

    private sideCollision(model, dt) {
        model;
        dt;
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
            radius: config.ballRadius, 
            color: config.ballColor
        };
    }
}