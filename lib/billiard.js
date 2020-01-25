'use strict';
// Global variables
let scene, renderer, camera, controls;
let clock;
let balls, ballBoundary;
let useShadowsHighQ = true,
    frictionLoss = true;
const lossFactor = 0.25;
const cushionReflectionLoss = true;
const checkCollisions = true;
const ballCollisionLoss = true;
const minSpeed = 1.0e-3;

// APP OBJECT
const billiardApp = {
    rendererColor: 'white',
    delta: 0.001,
    segments: 32,
    wireframe: false,
    shadows: true,
    floor: {
        width: 6,
        depth: 6,
        color: 'grey',
    },
    light: {
        ambient: {
            color: '#505050',
        },
        spot: {
            color: 'white',
        },
        lamp: {
            radius: 0.25,
            color: 'yellow'
        }
    },
    table: {
        height: 0.75,
        slate: {
            width: 1.27,
            length: 2.54,
            height: 0.0254,
            color: 'darkgreen'
        },
        cushion: {
            height: 0.05,
            side: 0.14,
            color: 'darkgreen'
        },
        legs: {
            height: 0.6746, // tableHeight - cushionHeight - slateHeight: 0.75 - 0.05 - 0.0254
            side: 0.1,
            color: '#654321'
        }
    },
    ball: {
        count: 8,
        radius: 0.028575,
        initialVelocity: {
            min: 0.1,
            max: 0.5
        }
    }
};

// Creates scene objects(scene, camera, renderer).
scene = new THREE.Scene();
renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(billiardApp.rendererColor);
document.body.appendChild(renderer.domElement);
camera = new THREE.PerspectiveCamera(75, 5, 0.001, 50);
camera.position.set(1.5, 1.5, 1.5);

//  TEXTURE LOADER
const txtLoader = new THREE.TextureLoader();

controls = new THREE.TrackballControls(camera, renderer.domElement);

// Create objects
// Floor
const floorGeo = new THREE.PlaneBufferGeometry(billiardApp.floor.width, billiardApp.floor.depth);
const floorMat = new THREE.MeshPhongMaterial({
    wireframe: billiardApp.wireframe,
    color: billiardApp.floor.color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
});
const floorMesh = new THREE.Mesh(floorGeo, floorMat);

floorMesh.rotation.x = Math.PI / 2;
scene.add(floorMesh);

// TABLE
const table = new THREE.Group();

// TABLE LEGS
const legGeo = new THREE.BoxBufferGeometry(billiardApp.table.legs.side, billiardApp.table.legs.height, billiardApp.table.legs.side);
const legMat = new THREE.MeshPhongMaterial({
    wireframe: billiardApp.wireframe,
    color: billiardApp.table.legs.color,
    side: THREE.DoubleSide
});

const leg1Mesh = new THREE.Mesh(legGeo, legMat);
const leg2Mesh = new THREE.Mesh(legGeo, legMat);
const leg3Mesh = new THREE.Mesh(legGeo, legMat);
const leg4Mesh = new THREE.Mesh(legGeo, legMat);


leg1Mesh.position.set(
    billiardApp.table.slate.width / 2 - billiardApp.table.legs.side / 2,
    billiardApp.table.legs.height / 2,
    billiardApp.table.slate.length / 2 - billiardApp.table.legs.side / 2);

leg2Mesh.position.set(
    -billiardApp.table.slate.width / 2 + billiardApp.table.legs.side / 2,
    billiardApp.table.legs.height / 2,
    billiardApp.table.slate.length / 2 - billiardApp.table.legs.side / 2);

leg3Mesh.position.set(
    billiardApp.table.slate.width / 2 - billiardApp.table.legs.side / 2,
    billiardApp.table.legs.height / 2,
    -billiardApp.table.slate.length / 2 + billiardApp.table.legs.side / 2);

leg4Mesh.position.set(
    -billiardApp.table.slate.width / 2 + billiardApp.table.legs.side / 2,
    billiardApp.table.legs.height / 2,
    -billiardApp.table.slate.length / 2 + billiardApp.table.legs.side / 2);

table.add(leg1Mesh);
table.add(leg2Mesh);
table.add(leg3Mesh);
table.add(leg4Mesh);


// SLATE
const slateGeo = new THREE.BoxBufferGeometry(billiardApp.table.slate.width, billiardApp.table.slate.height, billiardApp.table.slate.length, 3, 3);
const slateMat = new THREE.MeshPhongMaterial({
    wireframe: billiardApp.wireframe,
    shininess: 10,
    color: billiardApp.table.slate.color,
    side: THREE.DoubleSide
});
const slateMesh = new THREE.Mesh(slateGeo, slateMat);
slateMesh.position.y = billiardApp.table.legs.height + billiardApp.table.slate.height / 2;
table.add(slateMesh);

// CUSHIONS 
const cushionGeo = cushionGeoFactory();

const cushionMat = new THREE.MeshPhongMaterial({
    wireframe: billiardApp.wireframe,
    shininess: 1,
    color: billiardApp.table.cushion.color,
    side: THREE.DoubleSide
});
const cushionMesh = new THREE.Mesh(cushionGeo, cushionMat);

cushionMesh.rotation.x = -Math.PI / 2;
cushionMesh.position.set(
    -billiardApp.table.slate.width / 2 - billiardApp.table.cushion.side,
    slateMesh.position.y - billiardApp.table.slate.height / 2,
    billiardApp.table.slate.length / 2 + billiardApp.table.cushion.side);

table.add(cushionMesh);


//BALL BOUNDARIES
ballBoundary = {
    min: new THREE.Vector3(
        -billiardApp.table.slate.width / 2 + billiardApp.ball.radius,
        slateMesh.position.y + billiardApp.table.slate.height / 2 + billiardApp.ball.radius,
        -billiardApp.table.slate.length / 2 + billiardApp.ball.radius
    ),
    max: new THREE.Vector3(
        billiardApp.table.slate.width / 2 - billiardApp.ball.radius,
        slateMesh.position.y + billiardApp.table.slate.height / 2 + billiardApp.ball.radius,
        billiardApp.table.slate.length / 2 - billiardApp.ball.radius
    )
};

const ballGeo = new THREE.SphereBufferGeometry(billiardApp.ball.radius, billiardApp.segments, billiardApp.segments);
balls = [];
for (let i = 0; i < billiardApp.ball.count; i++) {
    // Apply textures to ball material
    const txtFilename = '../PoolBallSkins/Ball' + (i + 8) + '.jpg'; // 8 = texture offset in naming
    const ballTxt = txtLoader.load(txtFilename);
    const ballMat = new THREE.MeshPhongMaterial({
        wireframe: billiardApp.wireframe,
        map: ballTxt
    });

    // Create ball
    const ball = new THREE.Mesh(ballGeo, ballMat);

    // Prevent ball.matrix to be overwritten
    ball.matrixAutoUpdate = false;

    // Position on table slate
    ball.userData.position = new THREE.Vector3();
    ball.userData.position.y = ballBoundary.min.y;

    // Give random position until not overlapping
    let overlap;
    do {
        // Give random initial position
        ball.userData.position.x = getRandomFloat(ballBoundary.min.x, ballBoundary.max.x);
        ball.userData.position.z = getRandomFloat(ballBoundary.min.z, ballBoundary.max.z);

        overlap = false;
        for (let j = 0; j < i; j++) {
            if (ballsOverlap(ball, balls[j])) {
                overlap = true;
                break;
            }
        }
    } while (overlap);

    ball.matrix.setPosition(ball.userData.position);

    // Initialize ball parameters
    ball.userData.velocity = new THREE.Vector3();
    ball.userData.velocity.x = getRandomFloat(billiardApp.ball.initialVelocity.min, billiardApp.ball.initialVelocity.max) * getRandomSign();
    ball.userData.velocity.y = 0;
    ball.userData.velocity.z = getRandomFloat(billiardApp.ball.initialVelocity.min, billiardApp.ball.initialVelocity.max) * getRandomSign();
    updateRotationAxis(ball);
    updateOmega(ball);

    balls[i] = ball;
    table.add(ball);
}

table.position.y = billiardApp.delta;
scene.add(table);



// AMBLIGHT
const ambientLight = new THREE.AmbientLight(billiardApp.light.ambient.color);
scene.add(ambientLight);

// SPOTLOGHT
const spotLight = new THREE.SpotLight(billiardApp.light.spot.color);
spotLight.position.set(0, 3.25, 0);
scene.add(spotLight);

// LAMP
const lampGeo = new THREE.SphereBufferGeometry(billiardApp.light.lamp.radius, billiardApp.segments, billiardApp.segments);
const lampMat = new THREE.MeshPhongMaterial({
    emissive: billiardApp.light.lamp.color
});
const lamp = new THREE.Mesh(lampGeo, lampMat);
lamp.position.copy(spotLight.position);
scene.add(lamp);


// SHADOWS
if (billiardApp.shadows) {
    renderer.shadowMap.enabled = true;
    spotLight.castShadow = true;
    spotLight.shadow.camera.near = 0.1;
    spotLight.shadow.camera.far = 5;
    spotLight.shadow.bias = -0.000001;

    // Every element of the table casts and receives shadows
    for (let child of table.children) {
        child.castShadow = true;
        child.receiveShadow = true;
    }

    floorMesh.receiveShadow = true;

    if (useShadowsHighQ) {
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
    }
}

// CLOCK
clock = new THREE.Clock();
render();



//RENDER LOOP
function render() {
    requestAnimationFrame(render);
    update();
    controls.update();
    renderer.render(scene, camera);
}

//FUNCTIONS
// UPDATES BALLS POSITIONS AND CHECK COLISIONS
function update() {
    const dt = clock.getDelta();
    for (let i = 0; i < balls.length; i++) {
        if (balls[i].userData.velocity.length() > 0) {
            moveBall(balls[i], dt);

            let velocityChange = false;
            // Velocity loss due to friction
            if (frictionLoss) {
                velocityChange = true;
                balls[i].userData.velocity.multiplyScalar(1 - lossFactor * dt);
            }

            // Check boundary collisions
            if (balls[i].userData.position.x >= ballBoundary.max.x || balls[i].userData.position.x <= ballBoundary.min.x) {
                velocityChange = true;
                balls[i].userData.velocity.x *= -1;

                if (cushionReflectionLoss) {
                    balls[i].userData.velocity.multiplyScalar(1 - lossFactor);
                }

            }

            if (balls[i].userData.position.z >= ballBoundary.max.z || balls[i].userData.position.z <= ballBoundary.min.z) {
                velocityChange = true;
                balls[i].userData.velocity.z *= -1;

                if (cushionReflectionLoss) {
                    balls[i].userData.velocity.multiplyScalar(1 - lossFactor);
                }
            }

            // Set velocity to zero if smaller than eps
            const v_abs = balls[i].userData.velocity.length();
            if (v_abs < minSpeed && v_abs > 0) {
                velocityChange = true;
                balls[i].userData.velocity.set(0, 0, 0);
            }

            if (velocityChange) {
                updateOmega(balls[i]);
                updateRotationAxis(balls[i]);
            }

            for (let j = 0; j < i; j++) {
                if (ballsCollide(balls[i], balls[j])) {
                    const p1 = balls[i].userData.position;
                    const p2 = balls[j].userData.position;
                    const u1 = balls[i].userData.velocity;
                    const u2 = balls[j].userData.velocity;

                    const d = new THREE.Vector3();
                    const v1 = new THREE.Vector3();
                    const v2 = new THREE.Vector3();

                    d.subVectors(p2, p1);
                    console.log(d);

                    //EQUATIONS FROM THE ASSIGMENT NOTES
                    // temp = d * (u1-u2)/|d|^2 * d
                    const temp = d.clone().multiplyScalar(u1.clone().sub(u2).dot(d) / Math.pow(d.length(), 2));
                    // v1 = u1 - d * (u1-u2)/|d|^2 * d
                    v1.subVectors(u1, temp);

                    // v2 = u2 + d * (u1-u2)/|d|^2 * d
                    v2.addVectors(u2, temp);

                    if (ballCollisionLoss) {
                        v1.multiplyScalar(1 - lossFactor);
                        v2.multiplyScalar(1 - lossFactor);
                    }

                    balls[i].userData.velocity = v1;
                    balls[j].userData.velocity = v2;
                    updateOmega(balls[i]);
                    updateOmega(balls[j]);
                    updateRotationAxis(balls[i]);
                    updateRotationAxis(balls[j]);
                }
            }
        }
    }
}

function getRandomFloat(min, max) {
    return min + Math.random() * (max - min);
}

function getRandomSign() {
    return Math.floor(Math.random() * 10) % 2 == 0;
}

function ballsCollide(ball1, ball2) {
    const v = new THREE.Vector3();
    v.subVectors(ball2.userData.velocity, ball1.userData.velocity);

    const d = new THREE.Vector3();
    d.subVectors(ball2.userData.position, ball1.userData.position);

    const dotPr = v.dot(d);

    const moveTowardsEachOther = (dotPr < 0);
    const overlap = ballsOverlap(ball1, ball2);

    return overlap && moveTowardsEachOther;
}


//BALLS OVERLAP IF DISTANCE SQUARED < (2r)^2 = 4r^2
function ballsOverlap(ball1, ball2) {
    return (getBallDistanceSquared(ball1, ball2) < (4 * Math.pow(billiardApp.ball.radius, 2)));
}

function getBallDistanceSquared(ball1, ball2) {
    const dist1 = Math.pow(ball1.userData.position.x - ball2.userData.position.x, 2);
    const dist2 = Math.pow(ball1.userData.position.z - ball2.userData.position.z, 2);
    return dist1 + dist2;
}

function updateOmega(ball) {
    ball.userData.omega = ball.userData.velocity.length() / billiardApp.ball.radius;
}

function updateRotationAxis(ball) {
    ball.userData.rotationAxis = new THREE.Vector3(0, 1, 0);
    ball.userData.rotationAxis.cross(ball.userData.velocity).normalize();
}

function moveBall(ball, dt) {
    const dR = new THREE.Matrix4();
    dR.makeRotationAxis(ball.userData.rotationAxis, ball.userData.omega * dt);
    ball.matrix.premultiply(dR);

    ball.userData.position.add(ball.userData.velocity.clone().multiplyScalar(dt));
    ball.userData.position.clamp(ballBoundary.min, ballBoundary.max);
    ball.matrix.setPosition(ball.userData.position);
}

function createSquareShape(x, y, width, length) {
    const square = new THREE.Shape();
    square.moveTo(x, y);
    square.lineTo(x + width, y);
    square.lineTo(x + width, y + length);
    square.lineTo(x, y + length);
    square.lineTo(x, y);
    return square;
}

function cushionGeoFactory() {
    let outerWidth = billiardApp.table.slate.width + 2 * billiardApp.table.cushion.side;
    let outerLength = billiardApp.table.slate.length + 2 * billiardApp.table.cushion.side;
    let cushionWidth = billiardApp.table.cushion.side - billiardApp.delta;
    let cushionHeight = billiardApp.table.slate.height + billiardApp.table.cushion.height;
    let radius = 0.1;

    let outerRect = createSquareShape(0, 0, outerWidth, outerLength);

    const innerRect = createSquareShape(cushionWidth, cushionWidth, outerWidth - 2 * cushionWidth, outerLength - 2 * cushionWidth);
    outerRect.holes.push(innerRect);

    const extrudeSettings = {
        depth: cushionHeight,
        bevelEnabled: false,
        steps: 1,
    };
    const geo = new THREE.ExtrudeBufferGeometry(outerRect, extrudeSettings);

    return geo;
}