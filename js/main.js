// const bigG = 5;//gravitational constant (sort of)
const randomSort = (a, b) => Math.floor(Math.random() * 3) - 1,
    randRange = (s, l) => (Math.random() * l - s) + s,
    avgArr = a => a.reduce((b, c) => b + c) / a.length;
class Particle {
    constructor(x, y, dx, dy, m, isSun) {
        this.id = Math.floor(Math.random() * 999999999999).toString(32);
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.m = Math.max(1, m);
        this.mergeTo = null;
        this.isSun = !!isSun;
    }
    calcGrav(p, g) {
        // console.log(p instanceof Particle)
        if (!p instanceof Particle) {
            throw new Error('Provided target is not a particle!');
        }
        if (!g || isNaN(Number(g))) {
            throw new Error('Provided gravitational constant is non-numerical or is zero!')
        }
        //here we should calculate acceleration of THIS particle to B based on above info
        const r = this.calcDist(this.x, this.y, p.x, p.y);
        return (g * p.m) / Math.pow(Math.max(r, 0.01), 2);
    }
    calcAngPerc(xi, yi, xf, yf) {
        const rawAng = Math.atan(Math.abs(yf - yi) / Math.abs(xf - xi));
        return {
            x: xf > xi ? Math.cos(rawAng) : Math.cos(rawAng) * -1,
            y: yf > yi ? Math.sin(rawAng) : Math.sin(rawAng) * -1,
        }
    }
    calcDist(xi, yi, xf, yf) {
        return Math.sqrt(Math.pow(Math.abs(xf - xi), 2) + Math.pow(Math.abs(yf - yi), 2));
    }
    roche(p) {
        //calculate the roche limit for the two objects. if the smaller of the two is inside the roche limit, it gets merged into the larger one (collision)
        let r, Mr, Mc = 0;
        //first, determine which is smaller. We do roche limit on the 'satellite' (smaller) object
        if (p.m > this.m) {
            //roche limit on THIS particle
            r = this.m / 2;
            Mr = this.m;
            Mc = p.m;
        } else {
            //roche limit on OTHER particle
            r = p.m / 2;
            Mr = p.m;
            Mc = this.m;
        }
        return r * Math.pow((2 * Mc / Mr), (1 / 3));
    }
    sumGravs(pl, g) {
        const self = this;
        // self.mergeTo = self.mergeTo || null;
        pl.forEach(p => {
            if (p.id == self.id) {
                //no self-gravity!
                return false;
            }
            const Ag = self.calcGrav(p, g),//total gravitational "amount", ignoring direction
                angPerc = self.calcAngPerc(self.x, self.y, p.x, p.y);//angle (radians?),
            if (self.roche(p) > self.calcDist(self.x, self.y, p.x, p.y)) {
                //within roche limit, so merge
                if (self.m > p.m) {
                    p.mergeTo = self.id;
                } else {
                    self.mergeTo = p.id;
                }
                return false;
            }
            self.dx += Ag * angPerc.x;
            self.dy += Ag * angPerc.y;
        });
    }
    move(m) {
        //boundary stuffs
        if (this.isSun) {
            return false;//sun doesnt move
        }
        let outsideRange = null;
        //horizontal borders
        if (this.x + this.dx - this.m < 0) {
            //too left
            this.dx = Math.abs(this.dx);
            this.x = 0;
        } else if (this.x + this.dx + this.m > m.w) {
            //too right
            outsideRange = { x: this.x, y: this.y, newX: null, newY: null }
            this.dx = Math.abs(this.dx) * -1;
            this.x = m.w - (this.m);
            // this.x = 50;
            outsideRange.newX = this.x
        }
        if (this.y + this.dy - this.m < 0) {
            //too up
            this.dy = Math.abs(this.dy);
            this.y = 0;
        } else if (this.y + this.dy + this.m > m.h) {
            //too down
            outsideRange = { x: this.x, y: this.y, newX: null, newY: null }
            this.dy = Math.abs(this.dy) * -1;
            this.y = m.h - (this.m);
            // this.y = 50;
            outsideRange.newY = this.y
        }
        if (outsideRange) {
            // console.log('particle',this.id,'with data',this,'outside range (below or right)',outsideRange)
        }
        this.x += this.dx;
        this.y += this.dy;
    }
}
const allAvg = {
    dx: [],
    dy: []
}
class Galaxy {
    constructor(g, n, lm, mm, c, sn,gFric) {
        this.canv = document.querySelector(c);
        this.ctx = this.canv.getContext("2d");
        this.drawVectors = false;
        this.gens = 0;
        this.dims = {
            w: document.body.clientWidth,
            h: document.body.clientHeight
        };
        this.lm = lm;
        this.canv.style.width = this.dims.w + 'px';
        this.canv.style.height = this.dims.h + 'px';
        this.canv.width = this.dims.w;
        this.canv.height = this.dims.h;
        this.gFric = gFric
        this.mm = mm;
        this.infoBox = document.querySelector('#info-box');
        //gravitational constant G, number of particles N, max mass MM, canvas selector C
        this.bigG = g;
        this.objs = new Array(n).fill(1).map(q => new Particle(Math.floor(Math.random() * this.dims.w), Math.floor(Math.random() * this.dims.h), Math.floor(Math.random() * 3) - 1, Math.floor(Math.random() * 3) - 1, randRange(this.lm, this.mm)));
        this.sun = this.initSun(sn);
        console.log('OBJS', this.objs, this.dims, this.objs.filter(a => a.isSun), 'max mass', this.mm)
        const self = this;
        this.canv.addEventListener('mousemove', function () {
            self.info.call(self, event, self.objs)
        });
    }
    info(e, p, o) {
        // console.log('mousemoof event e', e,'p', p)
        const x = e.offsetX,
            y = e.offsetY,
            nearestObj = this.objs.filter(q => {
                return q.calcDist(x, y, q.x, q.y) < q.m;
            }).sort((a, b) => a.calcDist(x, y, a.x, a.y) - b.calcDist(x, y, b.x, b.y))
        // console.log('particles',objsFiltered)
        if (nearestObj && nearestObj.length && nearestObj[0]) {
            console.log('Nearest object is', nearestObj[0].id)
            this.infoBox.style.display = 'block';
            this.infoBox.style.left = x + 3 + 'px';
            this.infoBox.style.top = y + 3 + 'px';
            this.infoBox.innerHTML = `Object ID: ${nearestObj[0].id}<br>Mass:${~~(nearestObj[0].m)}`
        } else {
            console.log('no nearest object!')
            this.infoBox.style.display = 'none';
        }
    }
    initSun(s) {
        const self = this;
        if (isNaN(s) || !s) {
            return false;
        } else {
            const sun = new Particle(self.dims.w / 2, self.dims.h / 2, 1, 1, s, true);
            console.log('CREATING SUN with mass', s, 'IS', sun)
            self.objs.push(sun)
        }
    }
    frame() {
        const self = this;
        self.render();
        self.objs.sort(randomSort).forEach(q => {
            q.deleteMe = false;
            if (q.mergeTo) {
                const mergeInto = self.objs.find(a => a.id == q.mergeTo);
                // console.log('MERGING',q,'INTO',mergeInto,'ROCHE LIMIT',q.roche(mergeInto))
                if (!!mergeInto) {
                    const pax = q.m * Math.abs(q.dx),
                        pay = q.m * Math.abs(q.dy),
                        pbx = mergeInto.m * Math.abs(mergeInto.dx),
                        pby = mergeInto.m * Math.abs(mergeInto.dy);
                    // m1v1 + m2v2  = (m1+m2)/v3
                    //v3(m1v1+m2v2) = (m1+m2)
                    //v3  = m1+m2/(pa+pb)
                    mergeInto.m += 0.9 * q.m;
                    mergeInto.dx = 0.5 * (q.m + mergeInto.m) / (pax + pbx);
                    mergeInto.dy = 0.5 * (q.m + mergeInto.m) / (pay + pby);
                }
                q.deleteMe = true;
            }
            return q;
        })
        self.objs = self.objs.filter(q => !q.deleteMe)
        self.objs.forEach(pi => {
            if (pi.isSun) {
                return false;
            }
            pi.sumGravs(self.objs, self.bigG);
            //some basic (non-realistic) gravitational friction, and capping velocities at 20px/frame
            pi.dx = 0.99 * Math.min(pi.dx, 20);
            pi.dy = 0.99 * Math.min(pi.dy, 20);
            pi.move(self.dims);
        });
        self.gens++;
        // console.log('masses', self.objs.map(q => q.m))
        // const avgDX = avgArr(self.objs.map(q => q.dx)),
        //     avgDY = avgArr(self.objs.map(q => q.dy));
        // allAvg.dx.push(avgDX);
        // allAvg.dy.push(avgDY);
        // console.log('Generation:', self.gens, 'Average DX', avgDX, 'Average DY', avgDY, 'TOTAL average', avgArr(allAvg.dx), avgArr(allAvg.dy))
        window.requestAnimationFrame(
            function () {
                setTimeout(function () {
                    self.frame();
                }, 1000 / 60)
            }
        )
    }
    render() {
        // console.log('PARTICLES AT',this.objs)
        const self = this;
        self.ctx.fillStyle = 'rgba(0,0,0,.2)';
        // console.log(self.ctx.fillStyle)
        self.ctx.fillRect(0, 0, self.dims.w, self.dims.h);
        this.objs.forEach(p => {
            const mPerc = Math.min(1, p.m / self.mm),
                col = `hsl(${Math.ceil(240 * (mPerc))},100%,${Math.ceil(90 * mPerc)}%)`;
            // console.log('PERCENT MAX',mPerc,p.m)
            const grad = self.ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, (p.m));
            // grad.addColorStop(0,'red');
            grad.addColorStop(0.5, col),
                grad.addColorStop(1, 'transparent')
            // console.log('GRAD',grad)
            self.ctx.fillStyle = grad;
            self.ctx.strokeStyle = 'rgba(0,0,0,0)';
            self.ctx.beginPath()
            self.ctx.arc(p.x, p.y, Math.ceil(p.m * p.m * 0.1 / 2), 0, 2 * Math.PI);
            // self.ctx.stroke();
            self.ctx.fill();
            self.ctx.closePath();
            if (p.isSun) {
                // console.log('SUN COL',mPerc,col,sx,sy,p.x,p.y)
                self.ctx.fillStyle = '#fff';
                self.ctx.fillText('SUN!', p.x, p.y)
            }
            if (self.drawVectors) {

                self.ctx.beginPath();
                self.ctx.moveTo(p.x, p.y);
                self.ctx.lineTo(p.x - p.dx, p.y - p.dy);
                self.ctx.stroke();
                self.ctx.closePath();
            }
        })
        // self.ctx.filter = 'blur(1px)';
    }
}
const defVals = confirm('Use default values?');
let g, num, minMass, maxMass,sunMass = null;
if (defVals) {
    g = 10;
    num = 100;
    minMass = 1;
    sunMass = 20;
    maxMass = 3
    gFric = 1;
} else {
    g = Number(prompt('Enter Gravitational Constant. We recommend around 5-15.'));
    num = Number(prompt('Enter number of particles. 5-100 is probly a safe bet!'));
    minMass = Number(prompt('Enter minimum mass. We recommend around 2-15.'));
    maxMass = Number(prompt('Enter maximum mass. We recommend around 10-30.'));
    sunMass = Number(prompt('Enter central "sun" mass, or zero for no sun. The sun is locked in position, but MAY "move" if it colides with a larger body!'));
    gFric = Number(prompt('How much (percent) should each particle lose in speed due to gravitational friction per turn? Enter 0 for no friction.'))
}
alert(`Creating system with the following numbers:\n
Gravitational Constant: ${g}\n
Number of objects: ${num}\n
Minimum object creation mass (not including Sun): ${minMass}\n
Maximum object creation mass (not including Sun): ${maxMass}\n
Sun: ${sunMass?sunMass:'No sun'}\n
Gravitational Friction: ${100-gFric}% of speed preserved`)
const u = new Galaxy(g, num, Math.min(maxMass, minMass), Math.max(maxMass, minMass), '#universe', sunMass,gFric)
u.frame();//start the animation cycle