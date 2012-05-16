
GameEngine = (function () {

	//Small Helper method for generating random integers
	function randomInt(from, to) {
		return Math.round((Math.random() * (to - from)) + from);
	};
	var Assets = (function () {
		var assets = {}
		return {
			get:function (assetName) {
				if (assets[assetName] == undefined) {
					assets[assetName] = new Image();
					assets[assetName].src = assetName + ".png";
				}
				return assets[assetName];
			},
			isDone: function(){
				for(var i in assets){
					if(!assets[i].complete){	
						return false;
					}
				}
				return true;
			},
			loadBulk: function (assetBaseName, assetRangeStart, assetRangeEnd){
				for(var i = assetRangeStart; i < assetRangeEnd; i++){
					Assets.get(assetBaseName + "_" + i);
				}
			}
		}
	})();

	var drawRotatedImage = (function () {
		var TO_RADIANS = Math.PI / 180;
		return function (image, x, y, angle) {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(angle * TO_RADIANS);
			ctx.drawImage(image, 0 - image.width/2, 0 - image.height/2);
			ctx.restore();
		};
	})();

	function getOffset(el) {
		var _x = 0;
		var _y = 0;
		while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
			_x += el.offsetLeft - el.scrollLeft;
			_y += el.offsetTop - el.scrollTop;
			el = el.offsetParent;
		}
		return {
			top: _y,
			left: _x
		};
	}
	//Simple object equater used for colors. Don't use for anything serious	
	function objEquals(o1, o2){
		for(var o in o1){
			if(o1[o] != o2[o]){return false;}
		}
		return true;
	}
	function loadFile (sURL, timeout, fCallback /*, argumentToPass1, argumentToPass2, etc. */) {
		var oReq = new XMLHttpRequest();
		oReq.ontimeout = function() {
			console.log("The request timed out.");
		}
		oReq.onreadystatechange = function() {
			if (oReq.readyState === 4) { 
				if (oReq.status === 200) {
					console.log(oReq);
					fCallback(oReq.response);
				} else {
					console.log("Error", oReq.statusText);
				}
			}
		};
		oReq.open("GET", sURL, true);
		oReq.timeout = timeout;
		oReq.send(null);
	}


	//Global Declarations
	var canvas = document.getElementById("canvas");
	var ctx = canvas.getContext("2d");
	var c_width = canvas.width;
	var c_height = canvas.height;
	var c_offTop = getOffset(canvas).top;
	var c_offLeft = getOffset(canvas).left;


	var collisions = (function(){

		function getColor(r, g, b, a) {
			return {
				r: r,
				g: g,
				b: b,
				a: a
			};
		};

		function createArrayForObject(funct, argLength) {
			return function () {
				var r = [];
				if (Object.prototype.toString.call(arguments[0]) === '[object Array]') {
					for (var i = 0; i < arguments[0].length; i += argLength) {
						r.push(funct.apply(this, arguments[0].slice(i, i + argLength)));
					}
				} else {
					var argList = Array.prototype.slice.call(arguments, 0);
					for (var i = 0; i < arguments.length; i += argLength) {
						r.push(funct.apply(this, argList.slice(i, i + argLength)));
					}

				}
				return r;
			}
		}

		function getCollisionBox(x, y, width, height) {
			return {
				x: x,
				y: y,
				width: width,
				height: height
			};
		};
		//Get point.
		function gp(x, y) {
			return {
				x: x,
				y: y
			};
		}

		function generateCollisionBox(pointsList) {
			var b = 0,
				t = c_height,
				r = 0,
				l = c_width;
			for (var e in pointsList) {
				e = pointsList[e];
				e.y > b ? b = e.y : false;
				e.x > r ? r = e.x : false;
				e.y < t ? t = e.y : false;
				e.x < l ? l = e.x : false;
			}
			return {
				x: l,
				y: t,
				width: r - l,
				height: b - t
			};
		}

		function trimList(pointsList, collisionBox) {
			for (var e in pointsList) {
				pointsList[e].x -= collisionBox.x;
				pointsList[e].y -= collisionBox.y;
			}
			return pointsList;
		}
		return {
		checkCollision : function(collisionBox, collisionMap, colllsiionColors){
			//collisionBox is the area of the canvas that requires the collision check
			var imageData = ctx.getImageData(collisionBox.x - collisionBox.width/2, collisionBox.y - collisionBox.height/2, collisionBox.width, collisionBox.height);
			//CollisionMap provides per-pixel collisions. It expects the x,ys of the pixels it should check 
			for (var point in collisionMap) {
				point = collisionMap[point];
				var Y = point.y * collisionBox.width * 4;
				Y += point.x * 4;
				var ic = {
					r: imageData.data[Y],
					g: imageData.data[Y + 1],
					b: imageData.data[Y + 2],
					a: imageData.data[Y + 3]
				};
				for (var e in collisionColors) {
					e = collisionColors[e];
					if (e.r == ic.r && e.g == ic.g & e.b == ic.b && e.a == ic.a) {
						return ic;
					}
				}
			}
			return false;


			},
			getColor: createArrayForObject(getColor, 4),
			getCollisionBox: getCollisionBox,
			getPointList: createArrayForObject(gp, 2),
			generateCollisionBox: generateCollisionBox,
			trimList: trimList,
		
		}
	})();

	var player = (function(){
		var p = {x:300, y:400, angle:0};	
		var speed = 5;
		var keymap = {
			37: function(){ p.x-= speed },
			38: function(){ p.y-= speed },
			39: function(){ p.x+= speed },
			40: function(){ p.y+= speed },
		};
		var keydown = { 37: false, 38:false, 39:false, 40:false };	
		function updateMovement(){
			for(var v in keydown){
				if(keydown[v]){	
					keymap[v]();
				}
			}
		};
		return {
			handleKeyEvent: function(action){	//for simplicity, true = keydown false = keyup
				return function(event){
					if(event.keyCode in keymap){
						keydown[event.keyCode] = action;
					}
				}
			},
			rotate: function(angle){
				p.angle += angle;
			},
			move: function(x,y){
				p.x+=x;
				p.y+=y;
			},
			checkCollisions :function (){
				//var collisionDetect = collisions.checkCollision(collisons.getCollisionBox(
			},

			render: function (){
				updateMovement();
				drawRotatedImage(Assets.get("ship"), p.x, p.y, p.angle);
			}
		}
		
		
		
	})();

	function update(){
		ctx.fillStyle = "rgb(0,36,73)";
		ctx.fillRect(0, 0, c_width, c_height);
	
		player.checkCollisions();
		player.render();
	}
	

	setInterval("GameEngine.update()", 16);
	return {update:update, keys:player.handleKeyEvent};

})();
	document.addEventListener("keydown", GameEngine.keys(true));
	document.addEventListener("keyup", GameEngine.keys(false));
