class Player {
  constructor({x, y, score, id, color}) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
    this.color = color;
    this.width = 20;
    this.height = 20;
  }

  draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.fillText(this.id.substring(0, 4), this.x, this.y - 5); // Display part of ID
        ctx.fillText(`Score: ${this.score}`, this.x, this.y + this.height + 15);
  }

  movePlayer(dir, speed) {
    switch (dir) {
      case 'up':
        this.y -= speed;
        break;
      case 'down':
        this.y += speed;
        break;
      case 'left':
        this.x -= speed;
        break;
      case 'right':
        this.x += speed;
        break;
    }
  }

  collision(item) {

  }

  calculateRank(arr) {

  }
}

export default Player;
