// ObjViewer.js
 
// 全局变量
var gl;						// WebGL上下文

// 以下全局变量用于控制动画的状态和速度
var angleY = 0.0;		// 绕y轴旋转的角度
var angleX = 0.0;		// 绕x轴旋转的角度
var angleStep = 3.0;	// 角度变化步长(3度)

var matProj;	    // 投影矩阵
var matMVP;			// 模视投影矩阵
var Mat_move;
var rotationMatrix;

// shader中变量的索引
var attribIndex = new AttribIndex();  	// shader中attribute变量索引
var u_MVPMatrix;	// shader中uniform变量"u_MVPMatrix"的索引
var u_Color;		// shader中uniform变量"u_Color"的索引


//轨迹球相关
var startX, startY;
var curx, cury;
var trackingMouse = false;
var trackballMove = false;
var lastPos = [0, 0, 0];


var  angle = 0.0;
//var  axis = [0, 0, 1];
var axis;



function trackballView( x,  y )
{
	var d, a;
	var v = [];

	v[0] = x;
	v[1] = y;

	d = v[0]*v[0] + v[1]*v[1];
	if (d < 1.0)
		v[2] = Math.sqrt(1.0 - d);
	else {
		v[2] = 0.0;
		a = 1.0 /  Math.sqrt(d);
		v[0] *= a;
		v[1] *= a;
	}
	return v;

}


function mouseMotion( x,  y)
{
	var dx, dy, dz;

	var curPos = trackballView(x, y);
	if(trackingMouse) {
		dx = curPos[0] - lastPos[0];
		dy = curPos[1] - lastPos[1];
		dz = curPos[2] - lastPos[2];

		if (dx || dy || dz) {
			angle = -0.1 * Math.sqrt(dx*dx + dy*dy + dz*dz);


			axis[0] = lastPos[1]*curPos[2] - lastPos[2]*curPos[1];
			axis[1] = lastPos[2]*curPos[0] - lastPos[0]*curPos[2];
			axis[2] = lastPos[0]*curPos[1] - lastPos[1]*curPos[0];

			lastPos[0] = curPos[0];
			lastPos[1] = curPos[1];
			lastPos[2] = curPos[2];
		}
	}
	//  document.getElementById("demo").innerHTML=rotationMatrix;
	// document.getElementById("demo2").innerHTML=rotate(angle, axis);
	// document.getElementById("demo3").innerHTML=trackballMove;

	render();
}

function startMotion( x,  y)
{
	trackingMouse = true;
	startX = x;
	startY = y;
	curx = x;
	cury = y;

	lastPos = trackballView(x, y);
	trackballMove=true;

}


function stopMotion( x,  y)
{
	trackingMouse = false;
	if (startX != x || startY != y) {
	}
	else {
		angle = 0.0;
		trackballMove = false;
	}

}


// 开始读取Obj模型(异步方式)，返回OBJModel对象
var obj = loadOBJ("Res\\pika.obj");

// 页面加载完成后会调用此函数，函数名可任意(不一定为main)
window.onload = function main(){
	// 获取页面中id为webgl的canvas元素
    var canvas = document.getElementById("webgl");
	if(!canvas){ // 获取失败？
		alert("获取canvas元素失败！"); 
		return;
	}
	
	// 利用辅助程序文件中的功能获取WebGL上下文
	// 成功则后面可通过gl来调用WebGL的函数
    gl = WebGLUtils.setupWebGL(canvas);    
    if (!gl){ // 失败则弹出信息
		alert("获取WebGL上下文失败！"); 
		return;
	}        
	
	/*设置WebGL相关属性*/
    gl.clearColor(0.5, 0.5, 0.5, 1.0); // 设置背景色为灰色
	gl.enable(gl.DEPTH_TEST);	// 开启深度检测
	gl.enable(gl.CULL_FACE);	// 开启面剔除，默认剔除背面
	// 设置视口，占满整个canvas
	gl.viewport(0, 0, canvas.width, canvas.height);
	// 设置投影矩阵：透视投影，根据视口宽高比指定视域体
	matProj = perspective(35.0, 		// 垂直方向视角
		canvas.width / canvas.height, 	// 视域体宽高比
		1.0, 							// 相机到近裁剪面距离
		100.0);							// 相机到远裁剪面距离





	/*加载shader程序并为shader中attribute变量提供数据*/
	// 加载id分别为"vertex-shader"和"fragment-shader"的shader程序，
	// 并进行编译和链接，返回shader程序对象program
    var program = initShaders(gl, "vertex-shader", 
		"fragment-shader");
    gl.useProgram(program);	// 启用该shader程序对象 
	
	// 获取名称为"a_Position"的shader attribute变量的位置
    var a_Position = gl.getAttribLocation(program, "a_Position");
	if(a_Position < 0){ // getAttribLocation获取失败则返回-1
		alert("获取attribute变量a_Position失败！"); 
		return;
	}	
	
	// 初始化attribIndex
	// 注意顺序不要错，分别为顶点坐标、法向和纹理坐标的索引
	// 如果shader中没有相关变量则传-1
	attribIndex.init(a_Position, -1, -1);

	// 获取名称为"u_MVPMatrix"的shader uniform变量位置
	u_MVPMatrix = gl.getUniformLocation(program, "u_MVPMatrix");
	if(!u_MVPMatrix){
		alert("获取uniform变量u_MVPMatrix失败！")
		return;
	}
	
	// 获取名称为"u_Color"的shader uniform变量位置
	u_Color = gl.getUniformLocation(program, "u_Color");
	if(!u_Color){
		alert("获取uniform变量u_Color失败！")
		return;
	}

	Mat_move=mat4();
	rotationMatrix = mat4();
	axis=vec3(0.0,0.0,1.0);



	//追踪球
	canvas.addEventListener("mousedown", function(event){
		var x = 2*event.clientX/canvas.width-1;
		var y = 2*(canvas.height-event.clientY)/canvas.height-1;
		startMotion(x, y);
	});

	canvas.addEventListener("mouseup", function(event){
		var x = 2*event.clientX/canvas.width-1;
		var y = 2*(canvas.height-event.clientY)/canvas.height-1;
		stopMotion(x, y);
	});

	canvas.addEventListener("mousemove", function(event){

		var x = 2*event.clientX/canvas.width-1;
		var y = 2*(canvas.height-event.clientY)/canvas.height-1;
		mouseMotion(x, y);
	} );





	// 进行绘制
    render();
};

// 绘制函数
function render() {
	// 检查是否一切就绪，否则请求重绘，并返回
	// 这样稍后系统又会调用render重新检查相关状态
	if(!obj.isAllReady(gl)) {
		requestAnimFrame(render); // 请求重绘
		return;	// 返回
	}
	
	// 清颜色缓存和深度缓存
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);




	if(trackballMove) {

		axis = normalize(axis);
		rotationMatrix = mult(rotationMatrix,rotate(angle, axis));

	}






	// 创建变换矩阵
	matMVP =
		mult(matProj,		 			// 投影矩阵
		mult(translate(0.0, 0.0, -20.0), 	// 沿z轴平移
		mult(rotateY(angleY),	     		// 绕y轴旋转
		mult(rotateX(angleX),
		mult(Mat_move,rotationMatrix)))));		     		// 绕x轴旋转



	// matMVP =
	// 	mult(matProj,		 			// 投影矩阵
	// 		mult(translate(0.0, 0.0, -20.0), 	// 沿z轴平移
	// 			mult(rotateY(angleY),	     		// 绕y轴旋转
	// 				rotateX(angleX))));		     		// 绕x轴旋转
	//


	// 传值给shader中的u_MVPMatrix
	gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(matMVP));
	
	// 传颜色
	gl.uniform4f(u_Color, 1.0, 1.0, 1.0, 1.0); // 白色
	
	// 绘制obj模型，没有用到材质和纹理采样器
	obj.draw(gl, attribIndex, null, 0);
	requestAnimFrame( render );
}

// 按键响应
// 用于控制视角
window.onkeydown = function(){
	switch(event.keyCode){
		case 37: // 方向键Left
			angleY -= angleStep;
			if (angleY < -180.0) {
				angleY += 360.0;
			}
			break;
		case 38: // 方向键Up
			angleX -= angleStep;
			if (angleX < -80.0) {
				angleX = -80.0;
			}
			break;
		case 39: // 方向键Right
			angleY += angleStep;
			if (angleY > 180.0) {
				angleY -= 360.0;
			}
			break;
		case 40: // 方向键Down
			angleX += angleStep;
			if (angleX > 80.0) {
				angleX = 80.0;
			}
			break;

		case 81: // Q X-
			Mat_move[3]=Mat_move[3]-1;
			break;

		case 87: // W X+
			Mat_move[3]=Mat_move[3]+1;
			break;

		case 65: // A Y-
			Mat_move[7]=Mat_move[7]-1;
			break;

		case 83: // S Y+
			Mat_move[7]=Mat_move[7]+1;
			break;

		case 90: // Z Z-
			Mat_move[11]=Mat_move[11]-1;
			break;

		case 88: // X Z+
			Mat_move[11]=Mat_move[11]+1;
			break;



		default:
			return;
	}

	// document.getElementById("demo").innerHTML=rotationMatrix;
	// document.getElementById("demo2").innerHTML=trackballMove;

	//requestAnimFrame(render); // 请求重绘
}
