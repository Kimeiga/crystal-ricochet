var windowW = window.innerWidth; //document.width is obsolete
var windowH = window.innerHeight;

var config = {
	type: Phaser.AUTO,
	parent: 'phaser-example',
	width: windowW,
	height: windowH,
	physics: {
		default: 'arcade',
		arcade: {
			debug: false,
			gravity: {
				y: 0
			}
		}
	},
	scene: {
		preload: preload,
		create: create,
		update: update
	}
};

var game = new Phaser.Game(config);

function preload() {
	this.load.image('ship', 'assets/spaceShips_001.png');
	this.load.image('otherPlayer', 'assets/enemyBlack5.png');
	this.load.image('star', 'assets/star_gold.png');

	this.load.image('stage', 'assets/stage.svg');
	this.load.image('stage-1', 'assets/stage-1.svg');
	this.load.image('stage-2', 'assets/stage-2.svg');
	this.load.image('stage-3', 'assets/stage-3.svg');
	this.load.image('stage-4', 'assets/stage-4.svg');

	this.load.image('bullet', 'assets/bullet-red.png');
	this.load.image('bullet-blue', 'assets/bullet-blue.png');
}



function create() {

	// Define constants
    this.SHOT_DELAY = 100; // milliseconds (10 bullets/second)
    this.BULLET_SPEED = 500; // pixels/second
    this.NUMBER_OF_BULLETS = 20;

    // Create an object pool of bullets
    this.bulletPool = this.physics.add.group();
    for(var i = 0; i < this.NUMBER_OF_BULLETS; i++) {
        // Create each bullet and add it to the group.
//        var bullet = this.add.sprite(0, 0, 'bullet');
//        this.bulletPool.add(bullet);

        // Set its pivot point to the center of the bullet
//        bullet.anchor.setTo(0.5, 0.5);

        // Enable physics on the bullet
//        this.physics.enable(bullet, Phaser.Physics.ARCADE);

		this.bulletPool.create(0,0,'bullet').setOrigin(0.5, 0.5);
		
        // Set its initial state to "dead".
//        bullet.kill();
		this.bulletPool.children.iterate(function (child) {
			child.setActive(false);
		});
    }

	var stage = this.physics.add.staticGroup();

	stage.create(windowW * .2, windowH * .4, 'stage-1');
	stage.create(windowW * .4, windowH * .2, 'stage-2');
	stage.create(windowW * .6, windowH * .6, 'stage-3');
	stage.create(windowW * .8, windowH * .8, 'stage-4');

	var self = this;
	this.socket = io();
	this.otherPlayers = this.physics.add.group();
	this.socket.on('currentPlayers', function (players) {
		Object.keys(players).forEach(function (id) {
			if (players[id].playerId === self.socket.id) {
				addPlayer(self, players[id], stage);
			} else {
				addOtherPlayers(self, players[id]);
			}
		});
	});
	this.socket.on('newPlayer', function (playerInfo) {
		addOtherPlayers(self, playerInfo);
	});
	this.socket.on('disconnect', function (playerId) {
		self.otherPlayers.getChildren().forEach(function (otherPlayer) {
			if (playerId === otherPlayer.playerId) {
				otherPlayer.destroy();
			}
		});
	});
	this.socket.on('playerMoved', function (playerInfo) {
		self.otherPlayers.getChildren().forEach(function (otherPlayer) {
			if (playerInfo.playerId === otherPlayer.playerId) {
				otherPlayer.setRotation(playerInfo.rotation);
				otherPlayer.setPosition(playerInfo.x, playerInfo.y);
			}
		});
	});
	this.cursors = this.input.keyboard.createCursorKeys();

	this.blueScoreText = this.add.text(16, 16, '', {
		fontSize: '32px',
		fill: '#0000FF'
	});
	this.redScoreText = this.add.text(584, 16, '', {
		fontSize: '32px',
		fill: '#FF0000'
	});

	this.socket.on('scoreUpdate', function (scores) {
		self.blueScoreText.setText('Blue: ' + scores.blue);
		self.redScoreText.setText('Red: ' + scores.red);
	});

	this.socket.on('starLocation', function (starLocation) {
		if (self.star) self.star.destroy();
		self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
		self.physics.add.overlap(self.ship, self.star, function () {
			this.socket.emit('starCollected');
		}, null, self);
	});

}

function addPlayer(self, playerInfo, stage) {
	self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
	if (playerInfo.team === 'blue') {
		self.ship.setTint(0x0000ff);
	} else {
		self.ship.setTint(0xff0000);
	}
	self.ship.setDrag(200);
	self.ship.setAngularDrag(100);
	self.ship.setMaxVelocity(200);

	self.physics.add.collider(self.ship, stage);

}

function addOtherPlayers(self, playerInfo) {
	const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
	if (playerInfo.team === 'blue') {
		otherPlayer.setTint(0x0000ff);
	} else {
		otherPlayer.setTint(0xff0000);
	}
	otherPlayer.playerId = playerInfo.playerId;
	self.otherPlayers.add(otherPlayer);
}

var moveLeft;
var moveRight;
var moveUp;
var moveDown;

var turnLeft;
var turnRight;
var fire;

var shipSpeed = 400;
var shipTurnSpeed = 150;

function update() {
	if (this.ship) {
		var self = this;
		
		moveLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
		moveRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
		moveUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
		moveDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
		turnLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
		turnRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
		fire = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);


		if (turnLeft.isDown) {
			this.ship.setAngularVelocity(-shipTurnSpeed);
		} else if (turnRight.isDown) {
			this.ship.setAngularVelocity(shipTurnSpeed);
		} else {
			this.ship.setAngularVelocity(0);
		}


		//hakan movement


		if (moveLeft.isDown && !moveRight.isDown) {
			this.ship.body.acceleration.x = -shipSpeed;
		} else if (moveRight.isDown && !moveLeft.isDown) {
			this.ship.body.acceleration.x = shipSpeed;
		} else {
			this.ship.body.acceleration.x = 0;
		}

		if (moveUp.isDown && !moveDown.isDown) {
			this.ship.body.acceleration.y = -shipSpeed;
		} else if (moveDown.isDown && !moveUp.isDown) {
			this.ship.body.acceleration.y = shipSpeed;
		} else {
			this.ship.body.acceleration.y = 0;
		}

		//hakan shooting

		if (fire.isDown) {
			shootBullet(self);
		}


		this.physics.world.wrap(this.ship, 5);

		// emit player movement
		var x = this.ship.x;
		var y = this.ship.y;
		var r = this.ship.rotation;
		if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
			this.socket.emit('playerMovement', {
				x: this.ship.x,
				y: this.ship.y,
				rotation: this.ship.rotation
			});
		}
		// save old position data
		this.ship.oldPosition = {
			x: this.ship.x,
			y: this.ship.y,
			rotation: this.ship.rotation
		};
	}
}

function shootBullet(self) {
    // Enforce a short delay between shots by recording
    // the time that each bullet is shot and testing if
    // the amount of time since the last shot is more than
    // the required delay.
    if (this.lastBulletShotAt === undefined) this.lastBulletShotAt = 0;
    if (Phaser.Time.Clock.now - this.lastBulletShotAt < this.SHOT_DELAY) return;
    this.lastBulletShotAt = Phaser.Time.Clock.now;

    // Get a dead bullet from the pool
    var bullet = self.bulletPool.getFirstDead();

    // If there aren't any bullets available then don't shoot
    if (bullet === null || bullet === undefined) { return };

    // Revive the bullet
    // This makes the bullet "alive"
    bullet.setActive(true);

    // Bullets should kill themselves when they leave the world.
    // Phaser takes care of this for me by setting this flag
    // but you can do it yourself by killing the bullet if
    // its x,y coordinates are outside of the world.
    bullet.checkWorldBounds = true;
    bullet.outOfBoundsKill = true;

    // Set the bullet position to the ship position.
    bullet.setPosition(self.ship.x, self.ship.y);
    bullet.rotation = self.ship.rotation + Math.PI;

    // Shoot it in the right direction
    bullet.body.velocity.x = Math.cos(bullet.rotation - Math.PI * .5) * self.BULLET_SPEED;
    bullet.body.velocity.y = Math.sin(bullet.rotation - Math.PI * .5) * self.BULLET_SPEED;
};


