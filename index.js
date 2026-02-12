const SPACING = 14;
const ITERATIONS = 14;
const MOUSE = SPACING * 5;
let GRAVITY = 0.05;
let SPEED = 1;


let she_said_yes = false;

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var audio = new Audio('yay2.mp3');

const goober = new Image();
goober.src = 'goober.jpeg';

const hm = new Image();
hm.src = 'hm.jpeg';

const hm2 = new Image();
hm2.src = 'hm2.jpeg';

const alone = new Image();
alone.src = 'alone.jpeg';

const tigger = new Image();
tigger.src = 'tigger.jpeg';

const dead = new Image();
dead.src = 'dead.jpeg';

const sniffer = new Image();
sniffer.src = 'sniffer.jpeg';

const sus = new Image();
sus.src = 'sus.jpeg';


const images = [
    hm,
    hm2,
    alone,
    tigger,
    dead,
    sniffer,
    sus
];

const mouse = {
  x: 0,
  y: 0,
  px: 0,
  py: 0,
  points: [],
};

const clamp = function (val, min, max) {
  return Math.min(Math.max(val, min), max);
};

class Vector {
  constructor (x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  get length () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  add (v) {
    const p = v instanceof Vector;
    this.x += p ? v.x : v;
    this.y += p ? v.y : v;
    return this;
  }

  sub (v) {
    const p = v instanceof Vector;
    this.x -= p ? v.x : v;
    this.y -= p ? v.y : v;
    return this;
  }

  mul (v) {
    const p = v instanceof Vector;
    this.x *= p ? v.x : v;
    this.y *= p ? v.y : v;
    return this;
  }

  scale (x) {
    this.x *= x;
    this.y *= x;
    return this;
  }

  normalize () {
    const len = this.length;
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }

    return this;
  }

  distance (v) {
    const x = this.x - v.x;
    const y = this.y - v.y;
    return Math.sqrt(x * x + y * y);
  }

  static add (v1, v2) {
    const v = v2 instanceof Vector;
    return new Vector(
      v1.x + (v ? v2.x : v2),
      v1.y + (v ? v2.y : v2)
    );
  }

  static sub (v1, v2) {
    const v = v2 instanceof Vector;
    return new Vector(
      v1.x - (v ? v2.x : v2),
      v1.y - (v ? v2.y : v2)
    );
  }

  static mul (v1, v2) {
    const v = v2 instanceof Vector;
    return new Vector(
      v1.x * (v ? v2.x : v2),
      v1.y * (v ? v2.y : v2)
    );
  }

  static dot (v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  }
}

const reactor = function (a, b, p) {
  const refA = Vector.add(a.toWorld(p), a.pos);
  const refB = Vector.add(b.toWorld(Vector.mul(p, -1)), b.pos);

  const diff = Vector.sub(refB, refA);
  const mid = Vector.add(refA, Vector.mul(diff, 0.5));

  const t = clamp(b.p - a.p, -Math.PI, Math.PI);
  a.torque += t;
  b.torque -= t;

  const mfc = 0.03;
  const tfc = 0.02;
  const mf = Vector.mul(diff, mfc);
  const tf = Vector.mul(diff, tfc);
  const dm = Vector.sub(b.vat(mid), a.vat(mid));
  mf.add(Vector.mul(dm, mfc));
  tf.add(Vector.mul(dm, tfc));

  a.addForce(mf, mid);
  b.addForce(Vector.mul(mf, -1), mid);
  a.addTorque(tf, mid);
  b.addTorque(Vector.mul(tf, -1), mid);
};

const allContraints = [];

class Point {
  constructor (pos, square) {
    this.pos = pos;
    this.velocity = new Vector();
    this.force = new Vector();

    this.p = 0;
    this.w = 0;
    this.torque = 0;
    this.square = square;
  }

  update () {
    this.velocity.add(Vector.mul(this.force, SPEED));

    this.force = new Vector(0, GRAVITY / ITERATIONS);

    this.pos.add(Vector.mul(this.velocity, SPEED));

    const qPI = Math.PI / 4;
    this.w += this.torque / ((SPACING / 2) ** 2 / 2);
    this.w = clamp(this.w * SPEED, -qPI, qPI);

    this.p += this.w;
    this.torque = 0;

    mouse.points.includes(this) &&
      this.moveTo(mouse, this.mouseDiff);
  }

  toWorld (input) {
    return new Vector(
      -input.y * Math.sin(this.p) + input.x * Math.cos(this.p),
      input.y * Math.cos(this.p) + input.x * Math.sin(this.p)
    );
  }

  vat (R) {
    const dr = Vector.sub(R, this.pos);
    const vdr = this.w * dr.length;

    dr.normalize();

    return Vector.add(
      this.velocity,
      new Vector(vdr * -dr.y, vdr * dr.x)
    );
  }

  addForce (F) {
    this.force.add(F);
  }

  addTorque (F, R) {
    const arm = Vector.sub(R, this.pos);
    const torque = F.y * arm.x - F.x * arm.y;
    this.torque += torque;
  }

  moveTo (v, offset) {
    const targetX = v.x + offset.x;
    const targetY = v.y + offset.y;
    const strength = 0.001;
    this.velocity.x += (targetX - this.pos.x) * strength * SPEED;
    this.velocity.y += (targetY - this.pos.y) * strength * SPEED;
    this.velocity.mul(0.99);
  }
}

class Square {
  constructor (width, height, spacing, i) {
    this.width = width;
    this.height = height;
    this.spacing = spacing;
    this.i = i;

    const yOff = canvas.height;
    const xOff = 10 + Math.random() * (canvas.width - 10 - width * SPACING);

    const w = -0.5 + Math.random();

    this.points = Array(width * height).fill(0).map((_, i) => {
      const x = i % width;
      const y = ~~(i / width);

      const p = new Point(
        new Vector(
          xOff + x * spacing,
          canvas.height - yOff + y * spacing,
        ),
        this,
      );

      p.w = w;
        
      return p;
    });

    this.points.forEach((point, i) => {
      const x = i % width;
      const y = ~~(i / width);

      if (x > 0) {
        allContraints.push([
          this.points[i - 1],
          point,
          new Vector(SPACING / 2, 0)
        ]);
      }

      if (y > 0) {
        allContraints.push([
          this.points[i - width],
          point,
          new Vector(0, SPACING / 2)
        ]);
      }
    });

    this.drawPoints = [];

    for (let i = 0; i < width; i++) {
      this.drawPoints.push(this.points[i].pos);
    }

    for (let i = 0; i < height; i++) {
      this.drawPoints.push(this.points[(width - 1) + width * i].pos);
    }

    for (let i = width - 1; i > -1; i--) {
      this.drawPoints.push(this.points[(height - 1) * width + i].pos);
    }

    for (let i = height - 1; i > -1; i--) {
      this.drawPoints.push(this.points[(width ) * i].pos);
    }

    this.init = true;
  }

  draw (ctx) {
    const { drawPoints, hue } = this;
    //console.log(this.height);

    ctx.lineWidth = 2;
    ctx.fillStyle = `hsla(325, 100%, 80%, 1)`;
    ctx.strokeStyle = `hsla(325, 100%, 80%, 1)`;

    ctx.beginPath();
    ctx.moveTo(drawPoints[0].x, drawPoints[0].y);

    drawPoints.forEach((point, i) =>{
      i && ctx.lineTo(point.x, point.y);
    });

    ctx.lineTo(drawPoints[0].x, drawPoints[0].y);
    ctx.stroke();
    ctx.fill();
    

    //console.log(angle);
    const angle = (this.points[0].p + 
        this.points[this.width * this.height -1].p) / 2;

    ctx.save();
    const w = this.width * this.spacing / 2;
    const h = this.height * this.spacing / 2;

    const xcos = drawPoints[0].x + Math.cos(angle) * w - Math.sin(angle) * h;
    const ycos = drawPoints[0].y + Math.cos(angle) * h + Math.sin(angle) * w;
    
    ctx.translate(xcos, ycos);
    ctx.rotate(angle);
    
    ctx.drawImage(images[this.i], w * 1.2 * -3/5, h * 1.2 * -3/5, 
        w * 6/5, h * 6/5);
    
    ctx.strokeStyle = "black";
    ctx.strokeRect(w * 1.2 * -3/5, h * 1.2 * -3/5, w * 6/5, h * 6/5);
    ctx.restore();

  }
}

/*
const squares = Array(4).fill(0).map((_, i) => {
  const size = 8 + i * 2;
  return new Square(
    size,
    size,
    SPACING,
    Math.floor(Math.random() * images.length),
  );
});*/


var squares = [];


const update = function () {
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // draw background
    ctx.fillStyle = "#bf193a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#f7b2c7";
    ctx.fillRect(canvas.width * 2/7, canvas.height * 1/12,
        canvas.width * 3/7, canvas.height * 10/12);


    ctx.fillStyle = "#fff2f5"; 
    ctx.fillRect(canvas.width * 1/3, canvas.height * 1/8,
        canvas.width * 1/3, canvas.height * 6/8);
   
    ctx.drawImage(goober, (canvas.width - 500)/2,
            (canvas.height - 500)/2, 500, 500);

    if(!she_said_yes) {
        ctx.fillStyle = "#080e1f";
        ctx.textAlign = "center"; 
        ctx.font = "40px serif";
        ctx.fillText("Will you be my Valentine?", canvas.width * 1/2, canvas.height * 2/10 + 15);




        // buttons
        ctx.font = "25px serif";
        ctx.strokeStyle = "#080e1f";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - 250, canvas.height / 2 + 270,
            200, 80, [10]);
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 + 50, canvas.height / 2 + 270, 
            200, 80, [10]);
        ctx.stroke();

        ctx.fillStyle = "#080e1f";
        ctx.fillText("Yes!", canvas.width / 2 - 150, canvas.height / 2 + 320);
        ctx.fillText("No...", canvas.width / 2 + 150, canvas.height / 2 + 320);
    } else {
        ctx.fillStyle = "#080e1f";
        ctx.textAlign = "center"; 
        ctx.font = "40px serif";
        ctx.fillText("Yippee!!", canvas.width * 1/2, canvas.height * 2/10 + 15);

        ctx.fillText("I love you Vicky ❤️❤️", canvas.width / 2, 
            canvas.height / 2 + 320);
    }
    let i = ITERATIONS;
    while (i--) {
        allContraints.forEach((con, i) => {
            reactor(...con, i);
        });

        const allPoints = [].concat(...squares.map(({ points }) => points));
        allPoints.forEach((point, i) => {
            const { square } = point;

            const damping = 0.6;
            const spacing = (square ? square.spacing : SPACING) / 2;

            if (point.pos.x < spacing) {
                point.force.add(new Vector((spacing - point.pos.x) * 1, 0));
                point.velocity.y *= damping;
            } else if (point.pos.x > canvas.width - spacing) {
                point.force.add(new Vector((point.pos.x - canvas.width + spacing) * -1, 0));
                point.velocity.y *= damping;
            }

            if (point.pos.y < spacing) {
                point.force.add(new Vector(0, (spacing - point.pos.y) * 1));
                point.velocity.x *= damping;
            } else if (point.pos.y > canvas.height - spacing) {
                point.force.add(new Vector(0, (point.pos.y - canvas.height + spacing) * -1));
                point.velocity.x *= damping;
            }

            point.update();
        });
    }

    squares.forEach((s) => {
        s.draw(ctx);
    });


    mouse.px = mouse.x;
    mouse.py = mouse.y;

    window.requestAnimationFrame(update);
};

update();


const setMouse = (e) => {
  e = e.touches ? e.touches[0] : e;
  const rect = canvas.getBoundingClientRect();
  mouse.px = mouse.x;
  mouse.py = mouse.y;
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
};

/**
canvas.onmousedown = canvas.ontouchstart = (e) => {
  setMouse(e);
  mouse.down = true;

  for (const point of allPoints) {
    if (point.pos.distance(mouse) < MOUSE && !mouse.points.includes(point)) {
      mouse.points.push(point);
      point.mouseDiff = Vector.sub(point.pos, new Vector(mouse.x, mouse.y));
      point.velocity.mul(0);
      point.force.mul(0);
    }
  }
};

canvas.onmouseup = canvas.ontouchend = () => {
  mouse.points = [];
  mouse.down = false;
};

canvas.onmousemove = canvas.ontouchmove = setMouse;
*/


canvas.onmousemove = canvas.ontouchmove = (e) => {
    setMouse(e);
    mouse.down = true;

    const allPoints = [].concat(...squares.map(({ points }) => points));
    for (const point of allPoints) {
        const dist = point.pos.distance(mouse);
        if (dist < MOUSE) {

            mouse_v = new Vector(mouse.x, mouse.y);
            const direction = Vector.sub(point.pos, mouse_v).normalize();

            const strength_q = Math.pow((1 - dist / MOUSE), 2);  
            const strength = strength_q * 8;
            point.force.add(Vector.mul(direction, strength));
        }
    }
};

var y_rect = {
    x: canvas.width / 2 - 250,
    y: canvas.height / 2 + 270,
    width: 200,
    height: 80,
};

var n_rect = {
    x: canvas.width / 2 + 50,
    y: canvas.height / 2 + 270,
    width: 200,
    height: 80,
};


function isInside(pos, rect) {
    return pos.x > rect.x && pos.x < rect.x + rect.width && pos.y < rect.y + rect.height && pos.y > rect.y
}

canvas.addEventListener('click', function(evt) {
    if (isInside(mouse, y_rect)) {
        audio.play();
        goober.src = 'goober2.jpeg';
        she_said_yes = true;
    }
    if (isInside(mouse, n_rect)) {
        var audio2 = new Audio('rizz.mp3');
        audio2.play();
        const s = 6 + Math.round(Math.random() * 12);
        squares.push(new Square(
            s,
            s,
            SPACING,
            Math.floor(Math.random() * images.length),
        ));
    }
}, false);
